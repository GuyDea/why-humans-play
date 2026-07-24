import { parseMarkdown } from '@whp/script-creator-editor-core';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ARCHITECTURE_SECTIONS,
  joinArchitecture,
} from '../../src/architecture/codec.js';
import { ArchitectureService } from '../../src/architecture/service.js';
import { DocumentService } from '../../src/documents/service.js';
import { DocumentStore } from '../../src/documents/store.js';
import { buildApp } from '../../src/http/app.js';
import { UNUSED_VALIDATOR_SERVICE } from './stubs.js';

const NONCE = 'promote-nonce';
const AUTH = { 'x-sc-nonce': NONCE };

interface PromoteFixture {
  root: string;
  store: DocumentStore;
  app: ReturnType<typeof buildApp>;
  artifacts: {
    write: ReturnType<typeof vi.fn>;
    writeProduction: ReturnType<typeof vi.fn>;
    upsertPipelineRow: ReturnType<typeof vi.fn>;
    read: ReturnType<typeof vi.fn>;
  };
  documentService: DocumentService;
  submitOperation: ReturnType<typeof vi.fn>;
  approvedArchitecture: string;
  approvedNarration: string;
  validate: ReturnType<typeof vi.fn>;
}

const fixtures: PromoteFixture[] = [];

afterEach(async () => {
  for (const fixture of fixtures.splice(0)) {
    await fixture.app.close();
    fixture.store.close();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

describe('staged Promote HTTP workflow', () => {
  it('submits only authoritative approved baselines and a validated target', async () => {
    const fixture = makeFixture();
    const response = await submit(fixture, {
      target_path: 'whp-youtube/episodes/01-composition-net.md',
      creative_status: { phase: 'forged' },
      approved_architecture_md: 'forged architecture',
      approved_narration_md: 'forged narration',
      topic_brief: { topic: 'forged' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: 'promote-1' });
    expect(fixture.submitOperation).toHaveBeenCalledWith('promote', {
      topic_brief: {
        topic: 'Why constraints create play',
        factual_anchors: ['Players accept the rule.'],
        unknowns: ['Which example survives?'],
      },
      approved_lessons: ['Keep it concrete.'],
      approved_architecture_md: fixture.approvedArchitecture,
      approved_narration_md: fixture.approvedNarration,
      creative_status: {
        phase: 'creative-approved',
        readiness: 'EDITORIAL-DRAFT',
      },
      target_path: 'whp-youtube/episodes/01-composition-net.md',
    }, {});
    expect(fixture.store.getPromotionByOperation('promote-1')).toMatchObject({
      draftId: 'draft-1',
      state: 'running',
      targetPath: 'whp-youtube/episodes/01-composition-net.md',
    });
  });

  it.each([
    ['missing narration approval', { approvedNarration: false }],
    ['stale narration revision', { staleNarration: true }],
    ['missing architecture approval', { approvedArchitecture: false }],
    ['narration reconciliation', { reconciliationRequired: true }],
  ] as const)('refuses %s', async (_name, options) => {
    const fixture = makeFixture(options);
    const response = await submit(fixture, {
      target_path: 'whp-youtube/episodes/01-composition-net.md',
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error).toMatch(/^promote refused:/);
    expect(fixture.submitOperation).not.toHaveBeenCalled();
  });

  it.each([
    'whp-youtube/episodes/composition-net.md',
    'whp-youtube/episodes/01-other.md',
    '../whp-youtube/episodes/01-composition-net.md',
  ])('rejects invalid target %s before submission', async (targetPath) => {
    const fixture = makeFixture();
    const response = await submit(fixture, { target_path: targetPath });
    expect(response.statusCode).toBe(400);
    expect(fixture.submitOperation).not.toHaveBeenCalled();
  });

  it('imports the exact output as one revision and stops at validation-required', async () => {
    const production = productionMarkdown();
    const fixture = makeFixture({
      read: async () => ({
        path: 'whp-youtube/episodes/01-composition-net.md',
        content: production,
        hash: 'phase-two-hash',
      }),
    });
    await submit(fixture, {
      target_path: 'whp-youtube/episodes/01-composition-net.md',
    });

    const resultResponse = await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });
    expect(resultResponse.statusCode).toBe(200);
    expect(resultResponse.json()).toEqual({
      kind: 'raw',
      markdown: 'Promotion output written.',
    });
    expect(fixture.store.getPromotionByOperation('promote-1')).toMatchObject({
      state: 'validation-required',
      targetHash: 'phase-two-hash',
      error: null,
    });
    const imported = fixture.store.getDraft('draft-1')!;
    expect(imported.doc.metadata).toEqual(
      expect.objectContaining({
        creativeStatus: expect.objectContaining({
          phase: 'creative-approved',
        }),
      }),
    );
    expect(fixture.store.listRevisions('draft-1').at(-1)).toMatchObject({
      opId: 'promote-1',
      disposition: 'production-import',
    });
    expect(fixture.artifacts.upsertPipelineRow).not.toHaveBeenCalledWith(
      expect.objectContaining({ milestone: 'production' }),
    );

    await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });
    expect(fixture.store.listRevisions('draft-1').filter(
      ({ disposition }) => disposition === 'production-import',
    )).toHaveLength(1);
  });

  it.each([
    {
      name: 'missing output',
      read: async () => {
        throw new Error('artifact not found');
      },
      result: { kind: 'raw' as const, markdown: 'Done.' },
    },
    {
      name: 'guardrail',
      read: async () => {
        throw new Error('artifact not found');
      },
      result: {
        kind: 'raw' as const,
        markdown: 'Guardrail: promotion declined.',
      },
    },
  ])('persists failed for $name and imports no editorial text', async ({ read, result }) => {
    const fixture = makeFixture({ read, result });
    await submit(fixture, {
      target_path: 'whp-youtube/episodes/01-composition-net.md',
    });
    await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });

    expect(fixture.store.getPromotionByOperation('promote-1')).toMatchObject({
      state: 'failed',
      error: expect.any(String),
    });
    expect(fixture.store.listRevisions('draft-1')).toHaveLength(0);
    expect(JSON.stringify(fixture.store.getDraft('draft-1')!.doc))
      .not.toContain(result.markdown);
  });

  it('reruns the validator at the exact current hash before completing Promote', async () => {
    const production = productionMarkdown();
    const fixture = makeFixture({
      read: async () => ({
        path: 'whp-youtube/episodes/01-composition-net.md',
        content: production,
        hash: 'phase-two-hash',
      }),
      validationResults: [
        {
          ok: true,
          errors: [],
          path: 'whp-youtube/episodes/01-composition-net.md',
          hash: 'phase-two-hash',
        },
        {
          ok: true,
          errors: [],
          path: 'whp-youtube/episodes/01-composition-net.md',
          hash: 'phase-two-hash',
        },
      ],
    });
    await submit(fixture, {
      target_path: 'whp-youtube/episodes/01-composition-net.md',
    });
    await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });

    const displayedPass = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/validate',
      headers: AUTH,
    });
    expect(displayedPass.statusCode).toBe(200);
    expect(displayedPass.json()).toMatchObject({
      ok: true,
      hash: 'phase-two-hash',
    });
    expect(fixture.store.getPromotionByOperation('promote-1'))
      .toMatchObject({ validationHash: 'phase-two-hash' });

    const complete = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/promote/complete',
      headers: AUTH,
    });
    expect(complete.statusCode).toBe(200);
    expect(complete.json()).toMatchObject({
      state: 'complete',
      validationHash: 'phase-two-hash',
    });
    expect(fixture.validate).toHaveBeenCalledTimes(2);
    expect(fixture.artifacts.upsertPipelineRow).toHaveBeenCalledWith({
      episodeSlug: 'composition-net',
      milestone: 'production',
      ref: 'whp-youtube/episodes/01-composition-net.md',
    });
    const completedDraft = fixture.store.getDraft('draft-1')!;
    expect(readPhase(completedDraft.doc)).toBe('production');
    expect((completedDraft.doc.metadata as Record<string, unknown>).readiness)
      .toBeUndefined();
    expect(
      ((completedDraft.doc.metadata as Record<string, unknown>)
        .creativeStatus as Record<string, unknown>).readiness,
    ).toBe('EDITORIAL-DRAFT');
  });

  it('keeps Promote incomplete when server-side validation fails', async () => {
    const production = productionMarkdown();
    const fixture = makeFixture({
      read: async () => ({
        path: 'whp-youtube/episodes/01-composition-net.md',
        content: production,
        hash: 'invalid-hash',
      }),
      validationResults: [{
        ok: false,
        errors: [{ message: 'Missing field.', line: 9 }],
        path: 'whp-youtube/episodes/01-composition-net.md',
        hash: 'invalid-hash',
      }],
    });
    await submit(fixture, {
      target_path: 'whp-youtube/episodes/01-composition-net.md',
    });
    await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });

    const response = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/promote/complete',
      headers: AUTH,
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: 'promote completion refused: validator failed',
      validation: {
        ok: false,
        hash: 'invalid-hash',
      },
    });
    expect(readPhase(fixture.store.getDraft('draft-1')!.doc))
      .toBe('creative-approved');
    expect(fixture.store.getPromotionByOperation('promote-1'))
      .toMatchObject({ state: 'validation-required' });
    expect(fixture.artifacts.upsertPipelineRow).not.toHaveBeenCalledWith(
      expect.objectContaining({ milestone: 'production' }),
    );
  });

  it('imports a corrected target as a new exact revision before recording its pass', async () => {
    let output = {
      path: 'whp-youtube/episodes/01-composition-net.md',
      content: productionMarkdown(),
      hash: 'invalid-hash',
    };
    const corrected = productionMarkdown().replace(
      '# Composition net',
      '# Corrected composition net',
    );
    const fixture = makeFixture({
      read: async () => output,
      validationResults: [
        {
          ok: false,
          errors: [{ message: 'Fixture needs correction.', line: 9 }],
          path: output.path,
          hash: 'invalid-hash',
        },
        {
          ok: true,
          errors: [],
          path: output.path,
          hash: 'corrected-hash',
        },
        {
          ok: true,
          errors: [],
          path: output.path,
          hash: 'invalid-hash',
        },
      ],
    });
    await submit(fixture, {
      target_path: output.path,
    });
    await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });
    const failed = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/validate',
      headers: AUTH,
    });
    expect(failed.json()).toMatchObject({
      ok: false,
      hash: 'invalid-hash',
    });

    output = {
      ...output,
      content: corrected,
      hash: 'corrected-hash',
    };
    const rerun = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/validate',
      headers: AUTH,
    });

    expect({
      statusCode: rerun.statusCode,
      body: rerun.json(),
    }).toMatchObject({
      statusCode: 200,
      body: {
        ok: true,
        hash: 'corrected-hash',
      },
    });
    expect(new DocumentService({ store: fixture.store })
      .exportMarkdown('draft-1')).toBe(corrected);
    expect(fixture.store.listRevisions('draft-1').filter(
      ({ disposition }) => disposition === 'production-import',
    )).toHaveLength(2);
    expect(readPhase(fixture.store.getDraft('draft-1')!.doc))
      .toBe('creative-approved');

    output = {
      ...output,
      content: productionMarkdown(),
      hash: 'invalid-hash',
    };
    const restored = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/validate',
      headers: AUTH,
    });
    expect(restored.statusCode).toBe(200);
    expect(restored.json()).toMatchObject({
      ok: true,
      hash: 'invalid-hash',
    });
    expect(fixture.documentService.exportMarkdown('draft-1'))
      .toBe(productionMarkdown());
    expect(fixture.store.listRevisions('draft-1').filter(
      ({ disposition }) => disposition === 'production-import',
    )).toHaveLength(3);
  });

  it('CAS-synchronizes an accepted production edit before validating its exact new hash', async () => {
    let output = {
      path: 'whp-youtube/episodes/01-composition-net.md',
      content: productionMarkdown(),
      hash: 'phase-two-hash',
    };
    const fixture = makeFixture({
      read: async () => output,
      writeProduction: async (_path, content) => {
        output = {
          ...output,
          content,
          hash: 'edited-phase-two-hash',
        };
        return {
          conflict: false as const,
          hash: output.hash,
        };
      },
      validationResults: [{
        ok: true,
        errors: [],
        path: output.path,
        hash: 'edited-phase-two-hash',
      }],
    });
    await submit(fixture, { target_path: output.path });
    await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });

    const editedDoc = structuredClone(
      fixture.store.getDraft('draft-1')!.doc,
    );
    replaceFirstText(editedDoc, 'Accepted Phase-2 narration edit.');
    const saved = fixture.documentService.saveDraft('draft-1', {
      doc: editedDoc,
      disposition: 'autosave',
    });
    const exactEditedMarkdown =
      fixture.documentService.exportMarkdown('draft-1');
    const sync = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/production/sync',
      headers: AUTH,
      payload: {
        expectedRevisionSeq: saved.revision.seq,
      },
    });

    expect(sync.statusCode).toBe(200);
    expect(sync.json()).toMatchObject({
      state: 'validation-required',
      targetHash: 'edited-phase-two-hash',
      validationHash: null,
    });
    expect(fixture.artifacts.writeProduction).toHaveBeenCalledWith(
      output.path,
      exactEditedMarkdown,
      { expectedHash: 'phase-two-hash' },
    );
    const validation = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/validate',
      headers: AUTH,
    });
    expect(validation.statusCode).toBe(200);
    expect(validation.json()).toMatchObject({
      ok: true,
      hash: 'edited-phase-two-hash',
    });
    expect(fixture.artifacts.upsertPipelineRow).not.toHaveBeenCalledWith(
      expect.objectContaining({ milestone: 'production' }),
    );
    expect(readPhase(fixture.store.getDraft('draft-1')!.doc))
      .toBe('creative-approved');
  });

  it('resumes a durable production synchronization reservation after restart', async () => {
    let output = {
      path: 'whp-youtube/episodes/01-composition-net.md',
      content: productionMarkdown(),
      hash: 'phase-two-hash',
    };
    const fixture = makeFixture({
      read: async () => output,
      writeProduction: async (_path, content) => {
        output = {
          ...output,
          content,
          hash: 'resumed-sync-hash',
        };
        return {
          conflict: false as const,
          hash: output.hash,
        };
      },
    });
    await submit(fixture, { target_path: output.path });
    await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });
    const editedDoc = structuredClone(
      fixture.store.getDraft('draft-1')!.doc,
    );
    replaceFirstText(editedDoc, 'Edit surviving a daemon restart.');
    const saved = fixture.documentService.saveDraft('draft-1', {
      doc: editedDoc,
      disposition: 'autosave',
    });
    const promotion = fixture.store.getLatestPromotion('draft-1')!;
    fixture.store.updatePromotion({
      ...promotion,
      state: 'output-ready',
      validationHash: null,
      error: 'production synchronization in progress',
    });
    await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });
    expect(fixture.store.getLatestPromotion('draft-1')).toMatchObject({
      state: 'output-ready',
      error: 'production synchronization in progress',
    });

    const resumed = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/production/sync',
      headers: AUTH,
      payload: {
        expectedRevisionSeq: saved.revision.seq,
      },
    });
    expect(resumed.statusCode).toBe(200);
    expect(resumed.json()).toMatchObject({
      state: 'validation-required',
      targetHash: 'resumed-sync-hash',
      validationHash: null,
      error: null,
    });
    expect(output.content).toBe(
      fixture.documentService.exportMarkdown('draft-1'),
    );
  });

  it('resumes a durable completion reservation after restart', async () => {
    const output = {
      path: 'whp-youtube/episodes/01-composition-net.md',
      content: productionMarkdown(),
      hash: 'phase-two-hash',
    };
    const fixture = makeFixture({
      read: async () => output,
      validationResults: [
        {
          ok: true,
          errors: [],
          path: output.path,
          hash: output.hash,
        },
        {
          ok: true,
          errors: [],
          path: output.path,
          hash: output.hash,
        },
      ],
    });
    await submit(fixture, { target_path: output.path });
    await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });
    await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/validate',
      headers: AUTH,
    });
    fixture.documentService.reservePromotionCompletion('draft-1', {
      ok: true,
      errors: [],
      path: output.path,
      hash: output.hash,
    });
    await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });
    expect(fixture.store.getLatestPromotion('draft-1')).toMatchObject({
      state: 'output-ready',
      error: 'promotion completion in progress',
    });

    const resumed = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/promote/complete',
      headers: AUTH,
    });
    expect(resumed.statusCode).toBe(200);
    expect(resumed.json()).toMatchObject({
      state: 'complete',
      targetHash: output.hash,
      validationHash: output.hash,
      error: null,
    });
    expect(readPhase(fixture.store.getDraft('draft-1')!.doc))
      .toBe('production');
    expect(fixture.artifacts.upsertPipelineRow).toHaveBeenCalledWith({
      episodeSlug: 'composition-net',
      milestone: 'production',
      ref: output.path,
    });
  });

  it('reasserts the exact target after advancing the pipeline and rolls back on a race', async () => {
    let output = {
      path: 'whp-youtube/episodes/01-composition-net.md',
      content: productionMarkdown(),
      hash: 'phase-two-hash',
    };
    const fixture = makeFixture({
      read: async () => output,
      validationResults: [
        {
          ok: true,
          errors: [],
          path: output.path,
          hash: output.hash,
        },
        {
          ok: true,
          errors: [],
          path: output.path,
          hash: output.hash,
        },
      ],
    });
    await submit(fixture, { target_path: output.path });
    await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });
    await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/validate',
      headers: AUTH,
    });
    fixture.artifacts.upsertPipelineRow.mockImplementation(
      async (row: { milestone: string }) => {
        if (row.milestone === 'production') {
          output = {
            ...output,
            content: `${output.content}\n`,
            hash: 'raced-hash',
          };
        }
        return {
          conflict: false as const,
          hash: 'pipeline-hash',
        };
      },
    );

    const completion = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/promote/complete',
      headers: AUTH,
    });
    expect(completion.statusCode).toBe(409);
    expect(completion.json().error).toBe(
      'promote completion refused: target changed after validation',
    );
    expect(readPhase(fixture.store.getDraft('draft-1')!.doc))
      .toBe('creative-approved');
    expect(fixture.store.getLatestPromotion('draft-1')).toMatchObject({
      state: 'validation-required',
    });
    expect(fixture.artifacts.upsertPipelineRow).toHaveBeenCalledWith(
      expect.objectContaining({ milestone: 'production' }),
    );
    expect(fixture.artifacts.upsertPipelineRow).toHaveBeenCalledWith({
      episodeSlug: 'composition-net',
      milestone: 'creative-approved',
      ref: 'whp-youtube/drafts/composition-net.md',
    });
  });

  it('persists and retries a pipeline rollback conflict before allowing completion', async () => {
    let output = {
      path: 'whp-youtube/episodes/01-composition-net.md',
      content: productionMarkdown(),
      hash: 'phase-two-hash',
    };
    const fixture = makeFixture({
      read: async () => output,
      validationResults: [
        {
          ok: true,
          errors: [],
          path: output.path,
          hash: output.hash,
        },
        {
          ok: true,
          errors: [],
          path: output.path,
          hash: output.hash,
        },
      ],
    });
    await submit(fixture, { target_path: output.path });
    await fixture.app.inject({
      method: 'GET',
      url: '/api/ops/promote-1/result',
      headers: AUTH,
    });
    await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/validate',
      headers: AUTH,
    });
    fixture.artifacts.upsertPipelineRow.mockImplementation(
      async (row: { milestone: string }) => {
        if (row.milestone === 'production') {
          output = {
            ...output,
            content: `${output.content}\n`,
            hash: 'raced-hash',
          };
          return {
            conflict: false as const,
            hash: 'pipeline-hash',
          };
        }
        return {
          conflict: true as const,
          currentHash: 'external-pipeline-hash',
          parked: ['PIPELINE.md.sc-conflict'],
        };
      },
    );

    const conflicted = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/promote/complete',
      headers: AUTH,
    });
    expect(conflicted.statusCode).toBe(409);
    expect(conflicted.json()).toMatchObject({
      error:
        'promote completion refused: production pipeline rollback required',
      currentHash: 'external-pipeline-hash',
    });
    expect(fixture.store.getLatestPromotion('draft-1')).toMatchObject({
      state: 'output-ready',
      error: 'production pipeline rollback required',
    });
    expect(readPhase(fixture.store.getDraft('draft-1')!.doc))
      .toBe('creative-approved');

    fixture.artifacts.upsertPipelineRow.mockResolvedValue({
      conflict: false as const,
      hash: 'pipeline-hash',
    });
    const recovered = await fixture.app.inject({
      method: 'POST',
      url: '/api/drafts/draft-1/promote/complete',
      headers: AUTH,
    });
    expect(recovered.statusCode).toBe(409);
    expect(recovered.json()).toMatchObject({
      error:
        'promote completion refused: production pipeline rollback completed; rerun validator',
      promotion: {
        state: 'validation-required',
        error: null,
      },
    });
    expect(fixture.store.getLatestPromotion('draft-1')).toMatchObject({
      state: 'validation-required',
      error: null,
    });
    expect(readPhase(fixture.store.getDraft('draft-1')!.doc))
      .toBe('creative-approved');
  });
});

function makeFixture(options: {
  approvedNarration?: boolean;
  staleNarration?: boolean;
  approvedArchitecture?: boolean;
  reconciliationRequired?: boolean;
  read?: () => Promise<{
    path: string;
    content: string;
    hash: string;
  }>;
  result?: { kind: 'raw'; markdown: string };
  validationResults?: Array<{
    ok: boolean;
    errors: Array<{ message: string; line: number | null }>;
    path: string;
    hash: string;
  }>;
  writeProduction?: (
    path: string,
    content: string,
  ) => Promise<{
    conflict: false;
    hash: string;
  }>;
} = {}): PromoteFixture {
  const root = mkdtempSync(join(tmpdir(), 'promote-http-'));
  const store = new DocumentStore(join(root, 'state.sqlite3'));
  const sections = ARCHITECTURE_SECTIONS.map(({ key, title }) => ({
    key,
    title,
    md: `### ${title}\n\nApproved ${key}.\n`,
  }));
  const approvedArchitecture = joinArchitecture(sections);
  const approvedNarration = rapidMarkdown();
  const doc = parseMarkdown(approvedNarration).toJSON() as Record<string, unknown>;
  doc['metadata'] = {
    topic: 'Why constraints create play',
    anchors: ['Players accept the rule.'],
    unknowns: ['Which example survives?'],
    approvedLessons: ['Keep it concrete.'],
    creativeStatus: {
      phase: 'creative-approved',
      readiness: 'EDITORIAL-DRAFT',
    },
    directionApproved: true,
  };
  store.createDraft({
    id: 'draft-1',
    episodeSlug: 'composition-net',
    title: 'Composition net',
    format: 'narration',
    doc,
    architecture: {
      sections,
      approvedMd: options.approvedArchitecture === false
        ? null
        : approvedArchitecture,
      approvedAt: options.approvedArchitecture === false
        ? null
        : '2026-07-24T12:00:00.000Z',
    },
    architectureArtifactHash: 'architecture-hash',
    narrationReconciliationRequired:
      options.reconciliationRequired === true,
    approvedNarrationMd: options.approvedNarration === false
      ? null
      : approvedNarration,
    approvedNarrationAt: options.approvedNarration === false
      ? null
      : '2026-07-24T13:00:00.000Z',
    approvedNarrationRevisionSeq: options.approvedNarration === false
      ? null
      : options.staleNarration === true ? 7 : 0,
    narrationArtifactHash: options.approvedNarration === false
      ? null
      : 'narration-hash',
    updatedAt: '2026-07-24T13:00:00.000Z',
  });
  const submitOperation = vi.fn(() => 'promote-1');
  const artifacts = {
    write: vi.fn(),
    writeProduction: vi.fn(
      options.writeProduction ?? (async () => ({
        conflict: false as const,
        hash: 'synced-phase-two-hash',
      })),
    ),
    upsertPipelineRow: vi.fn(async () => ({
      conflict: false as const,
      hash: 'pipeline-hash',
    })),
    read: vi.fn(options.read ?? (async () => {
      throw new Error('artifact not found');
    })),
  };
  const architectureService = new ArchitectureService({
    store,
    operationService: {
      submit: submitOperation,
      get: () => ({ operation: 'promote' as const }),
    },
    artifactService: artifacts,
    idFactory: () => 'production-revision-1',
    now: () => '2026-07-24T14:00:00.000Z',
  });
  const documentService = new DocumentService({ store });
  const result = options.result ?? {
    kind: 'raw' as const,
    markdown: 'Promotion output written.',
  };
  const validationResults = [...(options.validationResults ?? [])];
  const validate = vi.fn(async () => validationResults.shift() ?? {
    ok: false,
    errors: [{ message: 'No validation fixture.', line: null }],
    path: 'whp-youtube/episodes/01-composition-net.md',
    hash: 'unconfigured-hash',
  });
  const app = buildApp({
    nonce: NONCE,
    operationService: {
      submit: submitOperation,
      list: () => [],
      get: () => ({
        id: 'promote-1',
        operation: 'promote',
        state: 'completed',
      } as never),
      events: () => [],
      cancel: () => {},
      result: () => result,
    },
    documentService,
    architectureService,
    artifactService: artifacts,
    validatorService: { validate },
  });
  const fixture = {
    root,
    store,
    app,
    artifacts,
    documentService,
    submitOperation,
    approvedArchitecture,
    approvedNarration,
    validate,
  };
  fixtures.push(fixture);
  return fixture;
}

function submit(
  fixture: PromoteFixture,
  inputs: Record<string, unknown>,
) {
  return fixture.app.inject({
    method: 'POST',
    url: '/api/drafts/draft-1/ops',
    headers: AUTH,
    payload: { operation: 'promote', inputs },
  });
}

function rapidMarkdown(): string {
  return '## 1. Opening\n\n> Approved complete narration.';
}

function productionMarkdown(): string {
  return [
    '# Composition net',
    '',
    '## 1. Opening',
    '',
    '> Approved complete narration.',
    '',
    '## Appendix',
    '',
    '### Script metadata',
    '',
    '- **Status:** EDITORIAL-DRAFT',
  ].join('\n');
}

function readPhase(doc: Record<string, unknown>): unknown {
  return ((doc.metadata as Record<string, unknown>)
    .creativeStatus as Record<string, unknown>).phase;
}

function replaceFirstText(
  value: unknown,
  replacement: string,
): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => replaceFirstText(item, replacement));
  }
  if (value === null || typeof value !== 'object') return false;
  const object = value as Record<string, unknown>;
  if (object['type'] === 'text' && typeof object['text'] === 'string') {
    object['text'] = replacement;
    return true;
  }
  return Object.values(object).some((item) =>
    replaceFirstText(item, replacement));
}
