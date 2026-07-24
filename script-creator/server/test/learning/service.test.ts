import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  acceptProposal,
  EditorState,
  corePlugins,
  insertInlineVariantSet,
  parseMarkdown,
  personalInputAcceptanceTransaction,
  pickActive,
  preserveDraftDocument,
  receiveProposal,
  requestProposal,
  schema,
} from '@whp/script-creator-editor-core';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ARCHITECTURE_SECTIONS,
  splitArchitecture,
  type ArchitectureSection,
} from '../../src/architecture/codec.js';
import { ArchitectureService } from '../../src/architecture/service.js';
import {
  DocumentService,
  exportDocumentMarkdown,
  importProductionMarkdown,
} from '../../src/documents/service.js';
import {
  DocumentStore,
  type DraftDocument,
} from '../../src/documents/store.js';
import { buildApp } from '../../src/http/app.js';
import {
  encodeVariantPickedDisposition,
} from '../../src/learning/decisions.js';
import {
  LearningService,
  type LearningOperationService,
} from '../../src/learning/service.js';
import { LearningStore } from '../../src/learning/store.js';
import { TopicStore } from '../../src/topics/store.js';
import { UNUSED_VALIDATOR_SERVICE } from '../http/stubs.js';

const roots: string[] = [];
const documents: DocumentStore[] = [];
const learning: LearningStore[] = [];
const topics: TopicStore[] = [];
const ACCEPTANCE_NONCE = 'episode-acceptance-proof-nonce';
const ACCEPTANCE_AUTH = { 'x-sc-nonce': ACCEPTANCE_NONCE };

function setup(options: {
  operationService?: LearningOperationService;
  idFactory?: () => string;
  resumeKeyFactory?: () => string;
  repositoryRoot?: string;
  operationEvidence?: (operationId: string) => {
    operationId: string;
    draftId: string | null;
    operation: string;
    state: string;
    envelope: unknown;
    result: unknown;
  } | null;
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'learning-service-'));
  roots.push(root);
  const dbFile = join(root, 'state.sqlite3');
  const documentStore = new DocumentStore(dbFile);
  const learningStore = new LearningStore(dbFile);
  const topicStore = new TopicStore(dbFile);
  documents.push(documentStore);
  learning.push(learningStore);
  topics.push(topicStore);
  documentStore.createDraft({
    id: 'draft-1',
    episodeSlug: 'episode-one',
    title: 'Episode One',
    format: 'narration',
    doc: {
      type: 'doc',
      attrs: { format: 'narration', preamble: 'Base' },
      content: [],
    },
    updatedAt: '2026-07-24T08:00:00.000Z',
  });
  let id = 0;
  const service = new LearningService({
    store: learningStore,
    documentStore,
    topicStore,
    idFactory: options.idFactory ?? (() => `learning-${++id}`),
    resumeKeyFactory: options.resumeKeyFactory,
    now: () => '2026-07-24T09:00:00.000Z',
    operationEvidence: options.operationEvidence ?? ((operationId) => ({
      operationId,
      draftId: 'draft-1',
      operation: 'generate-architecture',
      state: 'completed',
      envelope: { prompt: 'persisted' },
      result: {
        kind: 'schema',
        value: { proposal: 'persisted' },
        guardrail: null,
      },
    })),
    operationService: options.operationService,
    repositoryRootForDraft: options.repositoryRoot
      ? () => options.repositoryRoot!
      : undefined,
  });
  return { documentStore, learningStore, topicStore, service };
}

function addPendingArchitectureProposal(
  store: DocumentStore,
  operationId: string,
  createdAt = '2026-07-24T08:00:00.000Z',
): void {
  store.createArchitectureProposal({
    draftId: 'draft-1',
    operationId,
    state: 'pending',
    revisionId: null,
    createdAt,
    resolvedAt: null,
    reasonNote: null,
  });
}

function liveEditorVariantTransition() {
  const operationId = 'variant-operation';
  const variantId = 'set-1';
  const options = [
    { label: 'Direct', text: 'State the rule plainly.' },
    { label: 'Playful', text: 'Turn the rule into a toy.' },
  ];
  let state = EditorState.create({
    doc: schema.node('doc', {
      format: 'narration',
      preamble: '',
    }, [
      schema.node('beat', {
        beatId: 'beat-2',
        title: 'The hidden choice',
        timeTargetMs: 30_000,
      }, [
        schema.node(
          'paragraph',
          null,
          schema.text(
            'Choosing a line is a bet made with incomplete information.',
          ),
        ),
      ]),
    ]),
    plugins: corePlugins(),
  });
  expect(insertInlineVariantSet(
    state,
    (transaction) => {
      state = state.apply(transaction);
    },
    {
      variantId,
      originOperationId: operationId,
      at: 2,
      options,
    },
  )).toBe(true);
  const before = state.doc.toJSON();

  let forgedState = EditorState.create({
    doc: schema.nodeFromJSON(before),
    plugins: corePlugins(),
  });
  let variantPosition: number | null = null;
  let variantSize: number | null = null;
  forgedState.doc.descendants((node, position) => {
    if (
      node.type.name === 'inlineVariantSet'
      && node.attrs['variantId'] === variantId
    ) {
      variantPosition = position;
      variantSize = node.nodeSize;
      return false;
    }
    return true;
  });
  expect(variantPosition).not.toBeNull();
  expect(variantSize).not.toBeNull();
  forgedState = forgedState.apply(
    forgedState.tr.replaceWith(
      variantPosition!,
      variantPosition! + variantSize!,
      schema.text('Forged replacement.'),
    ),
  );

  expect(pickActive(
    state,
    (transaction) => {
      state = state.apply(transaction);
    },
    variantId,
  )).toBe(true);
  return {
    operationId,
    variantId,
    options,
    before,
    after: state.doc.toJSON(),
    forgedAfter: forgedState.doc.toJSON(),
  };
}

function generatedArchitectureMarkdown(): string {
  return [
    'A generated architecture preamble.\n\n',
    ...ARCHITECTURE_SECTIONS.map(({ key, title }) =>
      `### ${title}\n\nGenerated ${key} proposal.\n\n`),
  ].join('');
}

function fakeGeneratedArchitectureMarkdown(): string {
  const root = mkdtempSync(join(tmpdir(), 'learning-fake-architecture-'));
  roots.push(root);
  const output = join(root, 'architecture.md');
  execFileSync(process.execPath, [
    join(import.meta.dirname, '..', 'fake-codex.mjs'),
    'exec',
    '--json',
    '-o',
    output,
    '-',
  ], {
    env: { ...process.env, FAKE_CODEX_MODE: 'generate-architecture' },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  return readFileSync(output, 'utf8');
}

function fakeGeneratedEpisodeMarkdown(): string {
  const root = mkdtempSync(join(tmpdir(), 'learning-fake-episode-'));
  roots.push(root);
  const output = join(root, 'episode.md');
  execFileSync(process.execPath, [
    join(import.meta.dirname, '..', 'fake-codex.mjs'),
    'exec',
    '--json',
    '-o',
    output,
    '-',
  ], {
    env: { ...process.env, FAKE_CODEX_MODE: 'generate-episode' },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  return readFileSync(output, 'utf8');
}

function episodeAcceptanceFixture(options: {
  seedNarrationBaseline?: boolean;
} = {}) {
  const markdown = fakeGeneratedEpisodeMarkdown();
  const operationId = 'generate-episode-operation';
  const operationResult = {
    kind: 'raw' as const,
    markdown,
  };
  const operationService = {
    submit: () => operationId,
    list: () => [],
    get: () => ({
      operation: 'generate-episode' as const,
      draftId: 'draft-1',
      state: 'completed' as const,
    }),
    events: () => [],
    cancel: () => undefined,
    result: () => operationResult,
  };
  const fixture = setup({
    operationService,
    operationEvidence: (candidateOperationId) =>
      candidateOperationId === operationId
        ? {
            operationId,
            draftId: 'draft-1',
            operation: 'generate-episode',
            state: 'completed',
            envelope: { prompt: 'persisted generate episode' },
            result: operationResult,
          }
        : null,
  });
  const source: DraftDocument = {
    type: 'doc',
    attrs: {
      format: 'narration',
      preamble: 'Stored preamble that is not proposal narration.\n\n',
    },
    metadata: {
      topic: 'Why queues become games',
      anchors: ['A queue distributes access.'],
      unknowns: ['How strongly line choice changes wait time.'],
      approvedLessons: [],
      creativeStatus: { phase: 'rapid-prototype' },
      directionApproved: false,
    },
    schemaVersion: 4,
    content: [{
      type: 'beat',
      attrs: {
        beatId: 'beat_storedbefore',
        title: 'Stored opening',
        timeTargetMs: 45_000,
      },
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'Stored narration before generation.',
        }],
      }],
    }],
  };
  const stored = fixture.documentStore.getDraft('draft-1')!;
  fixture.documentStore.replaceDraftWorkflowState('draft-1', {
    doc: source,
    architecture: stored.architecture ?? {
      sections: [],
      approvedMd: null,
      approvedAt: null,
    },
    architectureArtifactHash:
      stored.architectureArtifactHash ?? null,
    narrationReconciliationRequired:
      stored.narrationReconciliationRequired === true,
    updatedAt: '2026-07-24T08:00:15.000Z',
  });
  if (options.seedNarrationBaseline !== false) {
    fixture.documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: source,
      updatedAt: '2026-07-24T08:00:30.000Z',
      revision: {
        id: 'episode-acceptance-baseline',
        opId: null,
        disposition: 'manual-save',
        createdAt: '2026-07-24T08:00:30.000Z',
      },
    });
  } else {
    fixture.documentStore.saveArchitecture('draft-1', {
      expectedRevisionSeq: 0,
      architecture: {
        sections: [{
          key: 'premise',
          title: 'Premise',
          md: 'Approved handoff architecture.\n',
        }],
        approvedMd: '### Premise\n\nApproved handoff architecture.\n',
        approvedAt: '2026-07-24T08:00:30.000Z',
      },
      updatedAt: '2026-07-24T08:00:30.000Z',
      revision: {
        idFactory: () => 'episode-handoff-architecture',
        opId: null,
        disposition: 'architecture-approved',
        createdAt: '2026-07-24T08:00:30.000Z',
      },
    });
  }
  fixture.documentStore.createNarrationProposal({
    draftId: 'draft-1',
    operationId,
    state: 'pending',
    createdAt: '2026-07-24T08:01:00.000Z',
    resolvedAt: null,
    reasonNote: null,
    successorOperationId: null,
  });
  const accepted = preserveDraftDocument(
    parseMarkdown(markdown).toJSON(),
    source,
  ) as DraftDocument;
  const documentService = new DocumentService({
    store: fixture.documentStore,
    learningService: fixture.service,
    idFactory: () => 'episode-accepted-revision',
    now: () => '2026-07-24T08:02:00.000Z',
  });
  const architectureService = new ArchitectureService({
    store: fixture.documentStore,
    operationService,
    learningService: fixture.service,
    idFactory: () => 'episode-architecture-revision',
    now: () => '2026-07-24T08:03:00.000Z',
  });
  return {
    ...fixture,
    accepted,
    architectureService,
    documentService,
    markdown,
    operationId,
    operationService,
  };
}

function buildEpisodeAcceptanceApp(
  fixture: ReturnType<typeof episodeAcceptanceFixture>,
) {
  return buildApp({
    nonce: ACCEPTANCE_NONCE,
    operationService: fixture.operationService as unknown as
      Parameters<typeof buildApp>[0]['operationService'],
    documentService: fixture.documentService,
    architectureService: fixture.architectureService,
    artifactService: {},
    validatorService: UNUSED_VALIDATOR_SERVICE,
  });
}

function fakePromotedPersonalInputFixture() {
  const promotedMarkdown = readFileSync(
    join(
      import.meta.dirname,
      '..',
      '..',
      '..',
      '..',
      '.agents',
      'skills',
      'writing-whp-youtube-scripts',
      'assets',
      'annotated-script-template.md',
    ),
    'utf8',
  );
  const personalInputMatch =
    /^#### Personal input\r?\n\r?\n([\s\S]*?)(?=\r?\n\r?\n#### )/mu
      .exec(promotedMarkdown);
  if (!personalInputMatch) {
    throw new Error('fake Promote fixture has no Personal input block');
  }
  const marker =
    /<!-- PI-\d{3}: Martin input -->/u.exec(promotedMarkdown)?.[0];
  if (!marker) {
    throw new Error('fake Promote fixture has no narration PI marker');
  }
  const personalInputBlock = personalInputMatch[0].trimEnd();
  const bodyMd = personalInputMatch[1]!.trimEnd();
  const replacement = [
    'Martin supplied the exact remembered moment.',
    '',
    'The evidence then changed how he interpreted it.',
  ].join('\n');
  const parsedSource = parseMarkdown(promotedMarkdown).toJSON() as
    DraftDocument;
  const imported = importProductionMarkdown(
    promotedMarkdown,
    parsedSource,
  );
  const state = EditorState.create({
    doc: schema.nodeFromJSON(imported.doc),
  });
  const transaction = personalInputAcceptanceTransaction(state, {
    marker,
    bodyMd,
    replacement,
  });
  if (!transaction) {
    throw new Error('production PI-acceptance transform was not applicable');
  }
  const accepted = transaction.doc.toJSON() as DraftDocument;
  const operationId = 'fake-promote-personal-input-operation';
  const operationResult = {
    kind: 'schema' as const,
    value: { replacement_markdown: replacement },
    guardrail: null,
  };
  const fixture = setup({
    operationEvidence: (candidateOperationId) =>
      candidateOperationId === operationId
        ? {
            operationId,
            draftId: 'draft-1',
            operation: 'rewrite-selection',
            state: 'completed',
            envelope: { prompt: 'persisted personal-input integration' },
            inputs: {
              selection: marker,
              requested_scope: {
                kind: 'personal-input',
                personal_input_id: 'PI-001',
              },
              personal_input_block: personalInputBlock,
            },
            result: operationResult,
          }
        : null,
  });
  fixture.documentStore.saveDraft('draft-1', {
    title: 'Why Bees Roll Balls',
    format: imported.format,
    doc: imported.doc,
    updatedAt: '2026-07-24T08:00:30.000Z',
    revision: {
      id: 'fake-promote-production-import',
      opId: 'fake-promote-operation',
      disposition: 'production-import',
      createdAt: '2026-07-24T08:00:30.000Z',
    },
  });
  fixture.documentStore.createNarrationProposal({
    draftId: 'draft-1',
    operationId,
    state: 'pending',
    createdAt: '2026-07-24T08:01:00.000Z',
    resolvedAt: null,
    reasonNote: null,
    successorOperationId: null,
  });
  const documentService = new DocumentService({
    store: fixture.documentStore,
    learningService: fixture.service,
    idFactory: () => 'fake-promote-personal-input-accepted',
    now: () => '2026-07-24T08:02:00.000Z',
  });
  return {
    ...fixture,
    accepted,
    documentService,
    marker,
    operationId,
    promotedMarkdown,
  };
}

function browserParsedArchitecture(
  markdown: string,
): ArchitectureSection[] {
  return splitArchitecture(markdown).map((section) => {
    if (!section.key.startsWith('opaque-')) return section;
    let hash = 2_166_136_261;
    for (const character of section.title) {
      hash ^= character.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 16_777_619);
    }
    return {
      ...section,
      key: `opaque-${(hash >>> 0).toString(16).padStart(8, '0')}`,
    };
  });
}

function architectureAcceptanceFixture(options: {
  markdown?: string;
  proposals?: ArchitectureSection[];
} = {}) {
  const markdown = options.markdown ?? generatedArchitectureMarkdown();
  const operationId = 'generate-architecture-operation';
  const operationResult = {
    kind: 'raw' as const,
    markdown,
  };
  const learning = setup({
    operationEvidence: (candidateOperationId) =>
      candidateOperationId === operationId
        ? {
            operationId,
            draftId: 'draft-1',
            operation: 'generate-architecture',
            state: 'completed',
            envelope: { prompt: 'persisted generate architecture' },
            result: operationResult,
          }
        : null,
  });
  addPendingArchitectureProposal(
    learning.documentStore,
    operationId,
  );
  let revision = 0;
  const architectureService = new ArchitectureService({
    store: learning.documentStore,
    operationService: {
      submit: () => operationId,
      get: () => ({
        operation: 'generate-architecture',
        draftId: 'draft-1',
      }),
      result: () => operationResult,
    },
    learningService: learning.service,
    idFactory: () => `architecture-acceptance-${++revision}`,
    now: () => '2026-07-24T08:30:00.000Z',
  });
  return {
    ...learning,
    architectureService,
    operationId,
    proposals: options.proposals ?? splitArchitecture(markdown),
  };
}

function replaceOrAppend(
  sections: readonly ArchitectureSection[],
  replacement: ArchitectureSection,
): ArchitectureSection[] {
  const index = sections.findIndex(({ key }) => key === replacement.key);
  if (index < 0) return [...sections, replacement];
  return sections.map((section, candidateIndex) =>
    candidateIndex === index ? replacement : section);
}

function narrationBlocks(
  doc: DraftDocument,
): Array<Record<string, unknown>> {
  const beat = (doc['content'] as Array<Record<string, unknown>>)[0]!;
  return beat['content'] as Array<Record<string, unknown>>;
}

function selectionAcceptanceFixture() {
  const operationId = 'structural-selection-operation';
  const selection = 'Rewrite this selected line.';
  const replacement = 'Rewritten passage.';
  const beforeNode = schema.node('doc', {
    format: 'narration',
    preamble: '',
  }, [
    schema.node('beat', {
      beatId: 'beat-structural-proof',
      title: '1. Opening',
      timeTargetMs: 30_000,
    }, [
      schema.node('paragraph', null, [
        schema.text(selection),
      ]),
      schema.node('paragraph', null, [
        schema.text('Untouched narration.'),
      ]),
      schema.node('opaqueSection', {
        md: '<!-- retained opaque payload -->',
      }),
    ]),
  ]);
  let state = EditorState.create({
    doc: beforeNode,
    plugins: corePlugins(),
  });
  let range: { from: number; to: number } | null = null;
  beforeNode.descendants((node, position) => {
    if (range === null && node.isText && node.text === selection) {
      range = { from: position, to: position + selection.length };
    }
  });
  if (!range) throw new Error('selection proof fixture range was not found');
  const selectionRange = range as { from: number; to: number };
  const dispatch = (
    transaction: Parameters<EditorState['apply']>[0],
  ) => {
    state = state.apply(transaction);
  };
  if (!requestProposal(state, dispatch, {
    id: operationId,
    ...selectionRange,
  })) {
    throw new Error('selection proof fixture request was refused');
  }
  if (!receiveProposal(state, dispatch, {
    id: operationId,
    replacement,
  })) {
    throw new Error('selection proof fixture result was refused');
  }
  if (!acceptProposal(state, dispatch, operationId)) {
    throw new Error('selection proof fixture acceptance was refused');
  }
  const before = beforeNode.toJSON() as DraftDocument;
  const accepted = state.doc.toJSON() as DraftDocument;
  const { documentStore, service } = setup({
    operationEvidence: (evidenceOperationId) => ({
      operationId: evidenceOperationId,
      draftId: 'draft-1',
      operation: 'rewrite-selection',
      state: 'completed',
      envelope: { prompt: 'persisted' },
      inputs: {
        selection,
        requested_scope: { kind: 'selection' },
      },
      result: {
        kind: 'schema',
        value: { replacement_markdown: replacement },
        guardrail: null,
      },
    }),
  });
  documentStore.saveDraft('draft-1', {
    title: 'Episode One',
    format: 'narration',
    doc: before,
    updatedAt: '2026-07-24T08:00:30.000Z',
    revision: {
      id: 'structural-selection-baseline',
      opId: null,
      disposition: 'manual-save',
      createdAt: '2026-07-24T08:00:30.000Z',
    },
  });
  documentStore.createNarrationProposal({
    draftId: 'draft-1',
    operationId,
    state: 'pending',
    createdAt: '2026-07-24T08:01:00.000Z',
    resolvedAt: null,
    reasonNote: null,
    successorOperationId: null,
  });
  const documentService = new DocumentService({
    store: documentStore,
    learningService: service,
    idFactory: () => 'structural-selection-accepted',
    now: () => '2026-07-24T08:02:00.000Z',
  });
  return {
    accepted,
    documentService,
    documentStore,
    operationId,
    service,
  };
}

afterEach(() => {
  for (const store of topics.splice(0)) store.close();
  for (const store of learning.splice(0)) store.close();
  for (const store of documents.splice(0)) store.close();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('LearningService', () => {
  it('mints episode acceptance when the first narration revision follows only handoff architecture revisions', async () => {
    const fixture = episodeAcceptanceFixture({
      seedNarrationBaseline: false,
    });
    expect(fixture.documentStore.listRevisions('draft-1')).toEqual([
      expect.objectContaining({
        id: 'episode-handoff-architecture',
        kind: 'architecture',
      }),
    ]);
    const app = buildEpisodeAcceptanceApp(fixture);
    try {
      const saved = await app.inject({
        method: 'PUT',
        url: '/api/drafts/draft-1',
        headers: ACCEPTANCE_AUTH,
        payload: {
          doc: fixture.accepted,
          opId: fixture.operationId,
          disposition: 'episode-generation-accepted',
        },
      });
      expect(saved.statusCode).toBe(200);

      const resolved = await app.inject({
        method: 'POST',
        url:
          `/api/drafts/draft-1/narration/proposals/${
            fixture.operationId
          }/resolve`,
        headers: ACCEPTANCE_AUTH,
        payload: { decision: 'accepted' },
      });

      expect(resolved.statusCode).toBe(200);
      expect(resolved.json()).toMatchObject({
        state: 'accepted',
        acceptedRevisionId: 'episode-accepted-revision',
      });
      expect(fixture.service.list('draft-1').decisions).toEqual([
        expect.objectContaining({
          kind: 'proposal-accepted',
          context: expect.objectContaining({
            source: expect.objectContaining({
              id: 'episode-accepted-revision',
            }),
          }),
        }),
      ]);

      const repeated = await app.inject({
        method: 'POST',
        url:
          `/api/drafts/draft-1/narration/proposals/${
            fixture.operationId
          }/resolve`,
        headers: ACCEPTANCE_AUTH,
        payload: { decision: 'accepted' },
      });
      expect(repeated.statusCode).toBe(200);
      expect(fixture.service.list('draft-1').decisions).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it('refuses unchanged episode acceptance when it would be the first narration revision', async () => {
    const fixture = episodeAcceptanceFixture({
      seedNarrationBaseline: false,
    });
    const current = fixture.documentStore.getDraft('draft-1')!;
    fixture.documentStore.replaceDraftWorkflowState('draft-1', {
      doc: fixture.accepted,
      architecture: current.architecture!,
      architectureArtifactHash: current.architectureArtifactHash ?? null,
      narrationReconciliationRequired:
        current.narrationReconciliationRequired === true,
      updatedAt: '2026-07-24T08:01:30.000Z',
    });
    const metadataOnlyChange = structuredClone(fixture.accepted);
    const metadata = metadataOnlyChange['metadata'] as Record<
      string,
      unknown
    >;
    metadata['topic'] = 'A metadata-only attempt to disguise a narration no-op';
    const app = buildEpisodeAcceptanceApp(fixture);
    try {
      const refused = await app.inject({
        method: 'PUT',
        url: '/api/drafts/draft-1',
        headers: ACCEPTANCE_AUTH,
        payload: {
          doc: metadataOnlyChange,
          opId: fixture.operationId,
          disposition: 'episode-generation-accepted',
        },
      });

      expect(refused.statusCode).toBe(409);
      expect(fixture.documentStore.currentRevisionSeq('draft-1')).toBe(1);
      expect(fixture.service.list('draft-1').decisions).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it('accepts and resolves the fake whole-episode result after the editor preserves draft context', async () => {
    const fixture = episodeAcceptanceFixture();
    const app = buildEpisodeAcceptanceApp(fixture);
    try {
      const saved = await app.inject({
        method: 'PUT',
        url: '/api/drafts/draft-1',
        headers: ACCEPTANCE_AUTH,
        payload: {
          doc: fixture.accepted,
          opId: fixture.operationId,
          disposition: 'episode-generation-accepted',
        },
      });

      expect(saved.statusCode).toBe(200);
      expect(saved.json()).toMatchObject({
        draft: {
          doc: {
            metadata: {
              topic: 'Why queues become games',
              creativeStatus: { phase: 'rapid-prototype' },
            },
            schemaVersion: 4,
          },
        },
        revision: {
          id: 'episode-accepted-revision',
          opId: fixture.operationId,
          disposition: 'episode-generation-accepted',
        },
      });

      const resolved = await app.inject({
        method: 'POST',
        url:
          `/api/drafts/draft-1/narration/proposals/${
            fixture.operationId
          }/resolve`,
        headers: ACCEPTANCE_AUTH,
        payload: { decision: 'accepted' },
      });

      expect(resolved.statusCode).toBe(200);
      expect(resolved.json()).toMatchObject({
        state: 'accepted',
        acceptedRevisionId: 'episode-accepted-revision',
      });
      expect(fixture.service.list('draft-1').decisions[0]).toMatchObject({
        kind: 'proposal-accepted',
        context: {
          source: { id: 'episode-accepted-revision' },
        },
      });
    } finally {
      await app.close();
    }
  });

  it('keeps all non-narration metadata server-owned during an accepted episode save', async () => {
    const fixture = episodeAcceptanceFixture();
    const before = fixture.documentStore.getDraft('draft-1')!;
    const forged = structuredClone(fixture.accepted);
    forged['attrs'] = {
      format: 'annotated',
      preamble: 'Forged operation preamble.',
    };
    forged['metadata'] = {
      topic: 'Forged topic',
      anchors: ['Forged anchor'],
      unknowns: ['Forged unknown'],
      approvedLessons: ['Forged legacy lesson'],
      creativeStatus: { phase: 'architecture' },
      directionApproved: true,
    };
    forged['schemaVersion'] = 999;
    forged['operationOnlyMetadata'] = 'must not persist';
    const app = buildEpisodeAcceptanceApp(fixture);
    try {
      const saved = await app.inject({
        method: 'PUT',
        url: '/api/drafts/draft-1',
        headers: ACCEPTANCE_AUTH,
        payload: {
          title: 'Forged operation title',
          doc: forged,
          opId: fixture.operationId,
          disposition: 'episode-generation-accepted',
        },
      });

      expect(saved.statusCode, saved.body).toBe(200);
      const stored = saved.json().draft as {
        title: string;
        format: string;
        doc: DraftDocument;
      };
      const { content: beforeContent, ...beforeMetadata } = before.doc;
      const { content: storedContent, ...storedMetadata } = stored.doc;
      expect(stored.title).toBe(before.title);
      expect(stored.format).toBe(before.format);
      expect(storedMetadata).toEqual(beforeMetadata);
      expect(storedContent).toEqual(fixture.accepted['content']);

      const resolved = await app.inject({
        method: 'POST',
        url:
          `/api/drafts/draft-1/narration/proposals/${
            fixture.operationId
          }/resolve`,
        headers: ACCEPTANCE_AUTH,
        payload: { decision: 'accepted' },
      });
      expect(resolved.statusCode, resolved.body).toBe(200);
      const decision = fixture.service.list('draft-1').decisions[0]!;
      const evidenceDoc = decision.context.revision!.doc;
      const { content: evidenceContent, ...evidenceMetadata } = evidenceDoc;
      expect(evidenceMetadata).toEqual(beforeMetadata);
      expect(evidenceContent).toEqual(fixture.accepted['content']);
    } finally {
      await app.close();
    }
  });

  it('refuses forged beat timing beside a genuine accepted episode result', async () => {
    const fixture = episodeAcceptanceFixture();
    const forged = structuredClone(fixture.accepted);
    const firstBeat = (
      forged['content'] as Array<Record<string, unknown>>
    )[0]!;
    firstBeat['attrs'] = {
      ...(firstBeat['attrs'] as Record<string, unknown>),
      timeTargetMs: 999_999,
    };
    const app = buildEpisodeAcceptanceApp(fixture);
    try {
      const refused = await app.inject({
        method: 'PUT',
        url: '/api/drafts/draft-1',
        headers: ACCEPTANCE_AUTH,
        payload: {
          doc: forged,
          opId: fixture.operationId,
          disposition: 'episode-generation-accepted',
        },
      });

      expect(refused.statusCode).toBe(409);
      expect(fixture.documentStore.currentRevisionSeq('draft-1')).toBe(1);
      expect(fixture.service.list('draft-1').decisions).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it('auto-settles the fake whole-episode acceptance after an architecture reopen', async () => {
    const fixture = episodeAcceptanceFixture();
    fixture.documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: fixture.accepted,
      updatedAt: '2026-07-24T08:02:00.000Z',
      revision: {
        id: 'episode-accepted-revision',
        opId: fixture.operationId,
        disposition: 'episode-generation-accepted',
        createdAt: '2026-07-24T08:02:00.000Z',
      },
    });
    expect(fixture.documentStore.saveArchitecture('draft-1', {
      expectedRevisionSeq: 2,
      architecture: {
        sections: [],
        approvedMd: null,
        approvedAt: null,
      },
      updatedAt: '2026-07-24T08:03:00.000Z',
      revision: {
        idFactory: () => 'architecture-reopened-revision',
        opId: null,
        disposition: 'architecture-reopened',
        createdAt: '2026-07-24T08:03:00.000Z',
      },
    })).not.toBeNull();

    expect(fixture.architectureService.prepareNarrationApproval(
      'draft-1',
      {
        expectedRevisionSeq: 3,
        expectedNarrationMd: exportDocumentMarkdown(
          fixture.documentStore.getDraft('draft-1')!.doc,
        ),
      },
    )).toEqual({ settledExportToken: expect.any(String) });
    expect(fixture.documentStore.getNarrationProposal(
      'draft-1',
      fixture.operationId,
    )).toMatchObject({
      state: 'accepted',
      acceptedRevisionId: 'episode-accepted-revision',
    });
    expect(fixture.service.list('draft-1').decisions[0]).toMatchObject({
      kind: 'proposal-accepted',
      context: {
        source: { id: 'episode-accepted-revision' },
      },
    });
  });

  it('returns a structured refusal for forged whole-episode narration without saving or settling', async () => {
    const fixture = episodeAcceptanceFixture();
    const forged = structuredClone(fixture.accepted);
    const firstBeat = (
      forged['content'] as Array<Record<string, unknown>>
    )[0]!;
    const firstParagraph = (
      firstBeat['content'] as Array<Record<string, unknown>>
    )[0]!;
    const firstText = (
      firstParagraph['content'] as Array<Record<string, unknown>>
    )[0]!;
    firstText['text'] = 'Forged narration absent from the operation result.';
    const app = buildEpisodeAcceptanceApp(fixture);
    try {
      const refused = await app.inject({
        method: 'PUT',
        url: '/api/drafts/draft-1',
        headers: ACCEPTANCE_AUTH,
        payload: {
          doc: forged,
          opId: fixture.operationId,
          disposition: 'episode-generation-accepted',
        },
      });

      expect(refused.statusCode).toBe(409);
      expect(refused.json()).toEqual({
        error:
          'narration acceptance proof refused: saved revision does not equal the operation proposal',
        code: 'acceptance-proof-refused',
        recoverable: true,
      });
      expect(fixture.documentStore.currentRevisionSeq('draft-1')).toBe(1);
      expect(fixture.documentStore.getNarrationProposal(
        'draft-1',
        fixture.operationId,
      )).toMatchObject({
        state: 'pending',
        acceptedRevisionId: null,
      });
    } finally {
      await app.close();
    }
  });

  it('accepts the fake Promote template PI transaction after production import', () => {
    const fixture = fakePromotedPersonalInputFixture();
    const originalLinkCount = fixture.promotedMarkdown
      .match(/\[F-001\]\([^)]+\)/gu)?.length ?? 0;

    const saved = fixture.documentService.saveDraft('draft-1', {
      doc: fixture.accepted,
      opId: fixture.operationId,
      disposition: 'personal-input-proposal-accepted',
    });
    const acceptedMarkdown = exportDocumentMarkdown(saved.draft.doc);

    expect(saved.revision).toMatchObject({
      id: 'fake-promote-personal-input-accepted',
      opId: fixture.operationId,
      disposition: 'personal-input-proposal-accepted',
    });
    expect(acceptedMarkdown).not.toContain(fixture.marker);
    expect(acceptedMarkdown).toContain('- **Decision:** COMPLETED');
    expect(
      acceptedMarkdown.match(/\[F-001\]\([^)]+\)/gu)?.length ?? 0,
    ).toBe(originalLinkCount);

    expect(fixture.service.captureProposalDisposition({
      draftId: 'draft-1',
      operationId: fixture.operationId,
      decision: 'accepted',
      reason: null,
      successorOperationId: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    })).toMatchObject({
      kind: 'personal-input-integrated',
      sourceId: 'fake-promote-personal-input-accepted',
    });
  });

  it('refuses extra narration content beyond the fake Promote PI transaction', () => {
    const fixture = fakePromotedPersonalInputFixture();
    const forged = structuredClone(fixture.accepted);
    const firstBeat = (
      forged['content'] as Array<Record<string, unknown>>
    )[0]!;
    const firstParagraph = (
      firstBeat['content'] as Array<Record<string, unknown>>
    )[0]!;
    const firstText = (
      firstParagraph['content'] as Array<Record<string, unknown>>
    )[0]!;
    firstText['text'] = `Forged extra narration. ${
      String(firstText['text'])
    }`;

    expect(() => fixture.documentService.saveDraft('draft-1', {
      doc: forged,
      opId: fixture.operationId,
      disposition: 'personal-input-proposal-accepted',
    })).toThrow(
      'narration acceptance proof refused: saved revision does not equal the operation proposal',
    );
    expect(fixture.documentStore.currentRevisionSeq('draft-1')).toBe(1);
    expect(fixture.documentStore.getNarrationProposal(
      'draft-1',
      fixture.operationId,
    )).toMatchObject({
      state: 'pending',
      acceptedRevisionId: null,
    });
  });

  it('accepts all 14 generated architecture proposals sequentially under one operation', () => {
    const markdown = fakeGeneratedArchitectureMarkdown();
    const browserProposals = browserParsedArchitecture(markdown);
    const {
      architectureService,
      operationId,
      proposals,
      service,
    } = architectureAcceptanceFixture({
      markdown,
      proposals: browserProposals,
    });
    expect(proposals).toHaveLength(14);
    expect(proposals.at(-1)).toMatchObject({
      title: 'Fixture-only production note',
    });
    expect(proposals.at(-1)?.key).not.toBe(
      splitArchitecture(markdown).at(-1)?.key,
    );
    let sections: ArchitectureSection[] = [];

    for (const [index, proposal] of proposals.entries()) {
      sections = replaceOrAppend(sections, proposal);
      const saved = architectureService.save('draft-1', {
        expectedRevisionSeq: index,
        sections,
        opId: operationId,
        disposition: 'architecture-proposal-accepted',
      });

      expect(saved.state.revisionSeq).toBe(index + 1);
    }

    expect(service.list('draft-1', { limit: 20 }).decisions).toHaveLength(14);
  });

  it('accepts one generated architecture proposal then Accept All in a second revision', () => {
    const {
      architectureService,
      operationId,
      proposals,
      service,
    } = architectureAcceptanceFixture();
    const first = proposals[0]!;
    architectureService.save('draft-1', {
      expectedRevisionSeq: 0,
      sections: [first],
      opId: operationId,
      disposition: 'architecture-proposal-accepted',
    });

    const saved = architectureService.save('draft-1', {
      expectedRevisionSeq: 1,
      sections: proposals,
      opId: operationId,
      disposition: 'architecture-proposals-accepted',
    });

    expect(saved.state).toMatchObject({
      revisionSeq: 2,
      sections: proposals,
    });
    expect(service.list('draft-1', { limit: 20 }).decisions).toMatchObject([
      { kind: 'proposal-accepted' },
      { kind: 'proposal-accepted' },
    ]);
  });

  it('refuses an architecture acceptance with extra non-proposal changes before persisting', () => {
    const {
      architectureService,
      documentStore,
      operationId,
      proposals,
    } = architectureAcceptanceFixture();

    expect(() => architectureService.save('draft-1', {
      expectedRevisionSeq: 0,
      sections: [
        proposals[0]!,
        {
          key: 'forged-extra',
          title: 'Forged extra',
          md: '### Forged extra\n\nNot proposed by the operation.\n',
        },
      ],
      opId: operationId,
      disposition: 'architecture-proposals-accepted',
    })).toThrow(/acceptance.+refused/iu);

    expect(documentStore.currentRevisionSeq('draft-1')).toBe(0);
    expect(documentStore.getArchitectureProposal(
      'draft-1',
      operationId,
    )).toMatchObject({ state: 'pending', revisionId: null });
  });

  it('refuses unchanged and non-proposal architecture acceptance forgeries after a real accept', () => {
    const {
      architectureService,
      documentStore,
      operationId,
      proposals,
      service,
    } = architectureAcceptanceFixture();
    const accepted = architectureService.save('draft-1', {
      expectedRevisionSeq: 0,
      sections: [proposals[0]!],
      opId: operationId,
      disposition: 'architecture-proposal-accepted',
    });

    const unchanged = documentStore.saveArchitecture('draft-1', {
      expectedRevisionSeq: 1,
      architecture: {
        sections: accepted.state.sections,
        approvedMd: null,
        approvedAt: null,
      },
      updatedAt: '2026-07-24T08:31:00.000Z',
      revision: {
        idFactory: () => 'forged-unchanged-architecture',
        opId: operationId,
        disposition: 'architecture-proposal-accepted',
        createdAt: '2026-07-24T08:31:00.000Z',
      },
    })!.revision;
    const arbitraryContent = documentStore.saveArchitecture('draft-1', {
      expectedRevisionSeq: 2,
      architecture: {
        sections: [{
          key: 'forged-section',
          title: 'Forged section',
          md: '### Forged section\n\nNot in the operation result.\n',
        }],
        approvedMd: null,
        approvedAt: null,
      },
      updatedAt: '2026-07-24T08:32:00.000Z',
      revision: {
        idFactory: () => 'forged-arbitrary-architecture',
        opId: operationId,
        disposition: 'architecture-proposal-accepted',
        createdAt: '2026-07-24T08:32:00.000Z',
      },
    })!.revision;
    const arbitraryOperation = documentStore.saveArchitecture('draft-1', {
      expectedRevisionSeq: 3,
      architecture: {
        sections: [proposals[1]!],
        approvedMd: null,
        approvedAt: null,
      },
      updatedAt: '2026-07-24T08:33:00.000Z',
      revision: {
        idFactory: () => 'forged-arbitrary-operation',
        opId: 'arbitrary-operation',
        disposition: 'architecture-proposal-accepted',
        createdAt: '2026-07-24T08:33:00.000Z',
      },
    })!.revision;

    expect(service.captureRevision(unchanged)).toBeNull();
    expect(service.captureRevision(arbitraryContent)).toBeNull();
    expect(service.captureRevision(arbitraryOperation)).toBeNull();
    expect(service.list('draft-1', { limit: 20 }).decisions).toHaveLength(1);
  });

  it('does not capture the same generated architecture section twice', () => {
    const {
      architectureService,
      documentStore,
      operationId,
      proposals,
      service,
    } = architectureAcceptanceFixture();
    const proposal = proposals[0]!;
    architectureService.save('draft-1', {
      expectedRevisionSeq: 0,
      sections: [proposal],
      opId: operationId,
      disposition: 'architecture-proposal-accepted',
    });
    documentStore.saveArchitecture('draft-1', {
      expectedRevisionSeq: 1,
      architecture: {
        sections: [{
          ...proposal,
          md: `${proposal.md}Manual intervening change.\n`,
        }],
        approvedMd: null,
        approvedAt: null,
      },
      updatedAt: '2026-07-24T08:31:00.000Z',
      revision: {
        idFactory: () => 'manual-intervening-architecture',
        opId: null,
        disposition: 'manual-save',
        createdAt: '2026-07-24T08:31:00.000Z',
      },
    });
    const repeated = documentStore.saveArchitecture('draft-1', {
      expectedRevisionSeq: 2,
      architecture: {
        sections: [proposal],
        approvedMd: null,
        approvedAt: null,
      },
      updatedAt: '2026-07-24T08:32:00.000Z',
      revision: {
        idFactory: () => 'forged-repeated-architecture-proposal',
        opId: operationId,
        disposition: 'architecture-proposal-accepted',
        createdAt: '2026-07-24T08:32:00.000Z',
      },
    })!.revision;

    expect(service.captureRevision(repeated)).toBeNull();
    expect(service.list('draft-1', { limit: 20 }).decisions).toHaveLength(1);
  });

  it('ignores forged accepted, gate, and defect-era variant dispositions until their normative proof exists', () => {
    const { documentStore, service } = setup();
    documentStore.createNarrationProposal({
      draftId: 'draft-1',
      operationId: 'selection-operation',
      state: 'pending',
      createdAt: '2026-07-24T08:01:00.000Z',
      resolvedAt: null,
      reasonNote: null,
      successorOperationId: null,
    });
    const acceptedWhilePending = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: {
        type: 'doc',
        attrs: { format: 'narration', preamble: 'Unchanged' },
        content: [],
      },
      updatedAt: '2026-07-24T08:02:00.000Z',
      revision: {
        id: 'forged-accepted',
        opId: 'selection-operation',
        disposition: 'selection-proposal-accepted',
        createdAt: '2026-07-24T08:02:00.000Z',
      },
    }).revision;
    expect(service.captureRevision(acceptedWhilePending)).toBeNull();

    const forgedGate = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: acceptedWhilePending.doc,
      updatedAt: '2026-07-24T08:03:00.000Z',
      revision: {
        id: 'forged-gate',
        opId: null,
        disposition: 'architecture-approved',
        createdAt: '2026-07-24T08:03:00.000Z',
      },
    }).revision;
    expect(service.captureRevision(forgedGate)).toBeNull();

    const defectBefore = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: {
        type: 'doc',
        attrs: { format: 'narration', preamble: '' },
        content: [{
          type: 'beat',
          attrs: { beatId: 'beat-1', title: 'Opening', timeTargetMs: 30_000 },
          content: [{
            type: 'variantSet',
            attrs: {
              variantId: 'defect-set',
              originOperationId: null,
              activeIndex: 0,
              settled: false,
            },
            content: [{
              type: 'variantOption',
              attrs: { label: 'A' },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
            }],
          }],
        }],
      },
      updatedAt: '2026-07-24T08:04:00.000Z',
      revision: {
        id: 'defect-before',
        opId: null,
        disposition: 'manual-save',
        createdAt: '2026-07-24T08:04:00.000Z',
      },
    }).revision;
    const defectPick = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: {
        type: 'doc',
        attrs: { format: 'narration', preamble: '' },
        content: [{
          type: 'beat',
          attrs: { beatId: 'beat-1', title: 'Opening', timeTargetMs: 30_000 },
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'A' }],
          }],
        }],
      },
      updatedAt: '2026-07-24T08:05:00.000Z',
      revision: {
        id: 'defect-pick',
        opId: null,
        disposition: encodeVariantPickedDisposition(
          'defect-set',
          'alternative:0',
        ),
        createdAt: '2026-07-24T08:05:00.000Z',
      },
    }).revision;
    expect(defectBefore.seq).toBeLessThan(defectPick.seq);
    expect(service.captureRevision(defectPick)).toBeNull();
    expect(service.list('draft-1')).toMatchObject({ decisions: [] });
  });

  it('captures an accepted proposal only after its matching row is settled and operation result is durable', () => {
    const before = parseMarkdown(
      '## 1. Opening\n\n> Original line.',
    ).toJSON();
    const after = structuredClone(before);
    const acceptedText = (
      (
        (
          after['content'] as Array<Record<string, unknown>>
        )[0]!['content'] as Array<Record<string, unknown>>
      )[0]!['content'] as Array<Record<string, unknown>>
    )[0]!;
    acceptedText['text'] = 'Accepted replacement.';
    const { documentStore, service } = setup({
      operationEvidence: (operationId) => ({
        operationId,
        draftId: 'draft-1',
        operation: 'rewrite-selection',
        state: 'completed',
        envelope: { prompt: 'persisted' },
        inputs: {
          selection: 'Original line.',
          requested_scope: { kind: 'selection' },
        },
        result: {
          kind: 'schema',
          value: { replacement_markdown: 'Accepted replacement.' },
          guardrail: null,
        },
      }),
    });
    documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: before,
      updatedAt: '2026-07-24T08:00:30.000Z',
      revision: {
        id: 'accepted-baseline',
        opId: null,
        disposition: 'manual-save',
        createdAt: '2026-07-24T08:00:30.000Z',
      },
    });
    documentStore.createNarrationProposal({
      draftId: 'draft-1',
      operationId: 'selection-operation',
      state: 'pending',
      createdAt: '2026-07-24T08:01:00.000Z',
      resolvedAt: null,
      reasonNote: null,
      successorOperationId: null,
    });
    const revision = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: after,
      updatedAt: '2026-07-24T08:02:00.000Z',
      revision: {
        id: 'accepted-revision',
        opId: 'selection-operation',
        disposition: 'selection-proposal-accepted',
        createdAt: '2026-07-24T08:02:00.000Z',
      },
    }).revision;
    expect(service.captureRevision(revision)).toBeNull();
    documentStore.resolveNarrationProposal(
      'draft-1',
      'selection-operation',
      'accepted',
      '2026-07-24T08:03:00.000Z',
      { acceptedRevisionId: revision.id },
    );

    expect(service.captureRevision(revision)).toMatchObject({
      kind: 'proposal-accepted',
      sourceId: 'accepted-revision',
    });

    const forgedReuse = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: {
        type: 'doc',
        attrs: { format: 'narration', preamble: 'Forged later reuse' },
        content: [],
      },
      updatedAt: '2026-07-24T08:04:00.000Z',
      revision: {
        id: 'forged-reuse',
        opId: 'selection-operation',
        disposition: 'selection-proposal-accepted',
        createdAt: '2026-07-24T08:04:00.000Z',
      },
    }).revision;
    expect(service.captureRevision(forgedReuse)).toBeNull();
  });

  it('refuses a forged accepted narration before saving or settling its proposal', () => {
    const before = parseMarkdown(
      '## 1. Opening\n\n> The original line.',
    ).toJSON();
    const forged = parseMarkdown(
      '## 1. Opening\n\n> An unrelated forged line.',
    ).toJSON();
    const { documentStore, service } = setup({
      operationEvidence: (operationId) => ({
        operationId,
        draftId: 'draft-1',
        operation: 'rewrite-selection',
        state: 'completed',
        envelope: { prompt: 'persisted' },
        inputs: {
          selection: 'The original line.',
          requested_scope: { kind: 'selection' },
        },
        result: {
          kind: 'schema',
          value: { replacement_markdown: 'The proposed line.' },
          guardrail: null,
        },
      }),
    });
    documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: before,
      updatedAt: '2026-07-24T08:00:30.000Z',
      revision: {
        id: 'baseline',
        opId: null,
        disposition: 'manual-save',
        createdAt: '2026-07-24T08:00:30.000Z',
      },
    });
    documentStore.createNarrationProposal({
      draftId: 'draft-1',
      operationId: 'rewrite-operation',
      state: 'pending',
      createdAt: '2026-07-24T08:01:00.000Z',
      resolvedAt: null,
      reasonNote: null,
      successorOperationId: null,
    });
    const documentService = new DocumentService({
      store: documentStore,
      learningService: service,
      idFactory: () => 'forged-accepted-save',
      now: () => '2026-07-24T08:02:00.000Z',
    });

    expect(() => documentService.saveDraft('draft-1', {
      doc: forged,
      opId: 'rewrite-operation',
      disposition: 'selection-proposal-accepted',
    })).toThrow(/acceptance.+refused/iu);
    expect(documentStore.currentRevisionSeq('draft-1')).toBe(1);
    expect(documentStore.getNarrationProposal(
      'draft-1',
      'rewrite-operation',
    )).toMatchObject({ state: 'pending', acceptedRevisionId: null });
  });

  it('refuses forged beat metadata beside a genuine accepted selection rewrite', () => {
    const before = parseMarkdown(
      '## 1. Opening\n\n> The original line.',
    ).toJSON();
    const proposed = parseMarkdown(
      '## 1. Opening\n\n> The proposed line.',
    ).toJSON();
    const forgedBeat = (
      proposed['content'] as Array<Record<string, unknown>>
    )[0]!;
    forgedBeat['attrs'] = {
      ...(forgedBeat['attrs'] as Record<string, unknown>),
      beatId: 'forged-beat-id',
      timeTargetMs: 999_999,
    };
    const { documentStore, service } = setup({
      operationEvidence: (operationId) => ({
        operationId,
        draftId: 'draft-1',
        operation: 'rewrite-selection',
        state: 'completed',
        envelope: { prompt: 'persisted' },
        inputs: {
          selection: 'The original line.',
          requested_scope: { kind: 'selection' },
        },
        result: {
          kind: 'schema',
          value: { replacement_markdown: 'The proposed line.' },
          guardrail: null,
        },
      }),
    });
    documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: before,
      updatedAt: '2026-07-24T08:00:30.000Z',
      revision: {
        id: 'metadata-baseline',
        opId: null,
        disposition: 'manual-save',
        createdAt: '2026-07-24T08:00:30.000Z',
      },
    });
    documentStore.createNarrationProposal({
      draftId: 'draft-1',
      operationId: 'rewrite-operation',
      state: 'pending',
      createdAt: '2026-07-24T08:01:00.000Z',
      resolvedAt: null,
      reasonNote: null,
      successorOperationId: null,
    });
    const documentService = new DocumentService({
      store: documentStore,
      learningService: service,
      idFactory: () => 'forged-beat-metadata-save',
      now: () => '2026-07-24T08:02:00.000Z',
    });

    expect(() => documentService.saveDraft('draft-1', {
      doc: proposed,
      opId: 'rewrite-operation',
      disposition: 'selection-proposal-accepted',
    })).toThrow(/acceptance.+refused/iu);
    expect(documentStore.currentRevisionSeq('draft-1')).toBe(1);
  });

  it.each([
    {
      label: 'a forged lock mark on untouched narration',
      forge(doc: DraftDocument) {
        const blocks = narrationBlocks(doc);
        const untouchedText = (
          blocks[1]!['content'] as Array<Record<string, unknown>>
        )[0]!;
        untouchedText['marks'] = [{
          type: 'lock',
          attrs: { lockId: 'forged-lock' },
        }];
      },
    },
    {
      label: 'a changed block type with the same text',
      forge(doc: DraftDocument) {
        const blocks = narrationBlocks(doc);
        const paragraph = structuredClone(blocks[1]!);
        blocks[1] = {
          type: 'variantSet',
          attrs: {
            variantId: 'forged-variant',
            originOperationId: 'forged-operation',
            activeIndex: 0,
            settled: true,
          },
          content: [{
            type: 'variantOption',
            attrs: { label: 'Forged' },
            content: [paragraph],
          }],
        };
      },
    },
    {
      label: 'a same-text opaque-node edit',
      forge(doc: DraftDocument) {
        const blocks = narrationBlocks(doc);
        blocks[2]!['attrs'] = {
          md: '<!-- forged opaque payload -->',
        };
      },
    },
  ])('refuses $label outside a genuine selection replacement', ({ forge }) => {
    const fixture = selectionAcceptanceFixture();
    const forged = structuredClone(fixture.accepted);
    forge(forged);
    const acceptedNode = schema.nodeFromJSON(fixture.accepted);
    const forgedNode = schema.nodeFromJSON(forged);
    expect(forgedNode.textBetween(
      0,
      forgedNode.content.size,
      '\n\n',
    )).toBe(acceptedNode.textBetween(
      0,
      acceptedNode.content.size,
      '\n\n',
    ));

    expect(() => fixture.documentService.saveDraft('draft-1', {
      doc: forged,
      opId: fixture.operationId,
      disposition: 'selection-proposal-accepted',
    })).toThrow(/acceptance.+refused/iu);
    expect(fixture.documentStore.currentRevisionSeq('draft-1')).toBe(1);
    expect(fixture.documentStore.getNarrationProposal(
      'draft-1',
      fixture.operationId,
    )).toMatchObject({ state: 'pending', acceptedRevisionId: null });
  });

  it('accepts and mints the genuine live editor selection transaction', () => {
    const fixture = selectionAcceptanceFixture();

    const saved = fixture.documentService.saveDraft('draft-1', {
      doc: fixture.accepted,
      opId: fixture.operationId,
      disposition: 'selection-proposal-accepted',
    });
    fixture.documentStore.resolveNarrationProposal(
      'draft-1',
      fixture.operationId,
      'accepted',
      '2026-07-24T08:03:00.000Z',
      { acceptedRevisionId: saved.revision.id },
    );

    expect(saved.revision).toMatchObject({
      opId: fixture.operationId,
      disposition: 'selection-proposal-accepted',
    });
    expect(fixture.service.captureRevision(saved.revision)).toMatchObject({
      kind: 'proposal-accepted',
      sourceId: saved.revision.id,
    });
  });

  it('rejects architecture rejection capture without a real pending proposal for that draft', () => {
    const { documentStore, service } = setup();
    expect(() => service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    })).toThrow(/pending architecture proposal/iu);

    documentStore.createArchitectureProposal({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      state: 'pending',
      revisionId: null,
      createdAt: '2026-07-24T08:01:00.000Z',
      resolvedAt: null,
      reasonNote: null,
    });
    expect(service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    })).toMatchObject({
      kind: 'proposal-rejected',
      sourceId: 'architecture-operation',
    });
  });

  it('captures the real editor-core variant insertion and pick transition idempotently', () => {
    const fixture = liveEditorVariantTransition();
    const { documentStore, service } = setup({
      operationEvidence: (operationId) =>
        operationId === fixture.operationId
          ? {
              operationId,
              draftId: 'draft-1',
              operation: 'generate-alternatives',
              state: 'completed',
              envelope: { prompt: 'persisted' },
              result: {
                kind: 'schema',
                value: {
                  status: 'complete',
                  options: fixture.options.map(({ label, text }) => ({
                    label,
                    markdown: text,
                  })),
                  guardrail_markdown: null,
                },
                guardrail: null,
              },
            }
          : null,
    });
    const excluded = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: fixture.before,
      updatedAt: '2026-07-24T08:01:00.000Z',
      revision: {
        id: 'revision-autosave',
        opId: null,
        disposition: 'autosave',
        createdAt: '2026-07-24T08:01:00.000Z',
      },
    }).revision;
    const picked = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: fixture.after,
      updatedAt: '2026-07-24T08:02:00.000Z',
      revision: {
        id: 'revision-pick',
        opId: fixture.operationId,
        disposition: encodeVariantPickedDisposition(
          fixture.variantId,
          'alternative:0',
        ),
        createdAt: '2026-07-24T08:02:00.000Z',
      },
    }).revision;

    expect(service.captureRevision(excluded)).toBeNull();
    const first = service.captureRevision(picked);
    const replay = service.captureRevision(picked);

    expect(first).toMatchObject({
      kind: 'variant-picked',
      sourceType: 'revision',
      sourceId: 'revision-pick',
    });
    expect(replay).toEqual(first);
    expect(service.list('draft-1', { limit: 10 }).decisions).toHaveLength(1);
  });

  it('rejects a forged pick that removes a real origin-bound set through a different transition', () => {
    const fixture = liveEditorVariantTransition();
    const { documentStore, service } = setup({
      operationEvidence: (operationId) =>
        operationId === fixture.operationId
          ? {
              operationId,
              draftId: 'draft-1',
              operation: 'generate-alternatives',
              state: 'completed',
              envelope: { prompt: 'persisted' },
              result: {
                kind: 'schema',
                value: {
                  status: 'complete',
                  options: fixture.options.map(({ label, text }) => ({
                    label,
                    markdown: text,
                  })),
                  guardrail_markdown: null,
                },
                guardrail: null,
              },
            }
          : null,
    });
    documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: fixture.before,
      updatedAt: '2026-07-24T08:01:00.000Z',
      revision: {
        id: 'forged-variant-before',
        opId: null,
        disposition: 'autosave',
        createdAt: '2026-07-24T08:01:00.000Z',
      },
    });
    const forgedPick = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: fixture.forgedAfter,
      updatedAt: '2026-07-24T08:02:00.000Z',
      revision: {
        id: 'forged-variant-pick',
        opId: fixture.operationId,
        disposition: encodeVariantPickedDisposition(
          fixture.variantId,
          'alternative:0',
        ),
        createdAt: '2026-07-24T08:02:00.000Z',
      },
    }).revision;

    expect(service.captureRevision(forgedPick)).toBeNull();
    expect(service.list('draft-1')).toMatchObject({ decisions: [] });
  });

  it('rejects a real pick when the origin result does not contain its options', () => {
    const fixture = liveEditorVariantTransition();
    const { documentStore, service } = setup({
      operationEvidence: (operationId) => ({
        operationId,
        draftId: 'draft-1',
        operation: 'generate-alternatives',
        state: 'completed',
        envelope: { prompt: 'persisted' },
        result: {
          kind: 'schema',
          value: {
            status: 'complete',
            options: [{
              label: 'Forged',
              markdown: 'Not the inserted options.',
            }],
            guardrail_markdown: null,
          },
          guardrail: null,
        },
      }),
    });
    documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: fixture.before,
      updatedAt: '2026-07-24T08:01:00.000Z',
      revision: {
        id: 'mismatched-options-before',
        opId: null,
        disposition: 'autosave',
        createdAt: '2026-07-24T08:01:00.000Z',
      },
    });
    const picked = documentStore.saveDraft('draft-1', {
      title: 'Episode One',
      format: 'narration',
      doc: fixture.after,
      updatedAt: '2026-07-24T08:02:00.000Z',
      revision: {
        id: 'mismatched-options-pick',
        opId: fixture.operationId,
        disposition: encodeVariantPickedDisposition(
          fixture.variantId,
          'alternative:0',
        ),
        createdAt: '2026-07-24T08:02:00.000Z',
      },
    }).revision;

    expect(service.captureRevision(picked)).toBeNull();
  });

  it('captures reject and reroll separately with exact optional notes and successor', () => {
    const { documentStore, service } = setup();
    documentStore.createNarrationProposal({
      draftId: 'draft-1',
      operationId: 'operation-reject',
      state: 'pending',
      createdAt: '2026-07-24T08:01:00.000Z',
      resolvedAt: null,
      reasonNote: null,
      successorOperationId: null,
    });
    documentStore.createNarrationProposal({
      draftId: 'draft-1',
      operationId: 'operation-reroll',
      state: 'pending',
      createdAt: '2026-07-24T08:02:00.000Z',
      resolvedAt: null,
      reasonNote: null,
      successorOperationId: null,
    });

    const rejected = service.captureProposalDisposition({
      draftId: 'draft-1',
      operationId: 'operation-reject',
      decision: 'rejected',
      reason: '  Too abstract.  ',
      successorOperationId: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    const rerolled = service.captureProposalDisposition({
      draftId: 'draft-1',
      operationId: 'operation-reroll',
      decision: 'rerolled',
      reason: null,
      successorOperationId: 'operation-child',
      resolvedAt: '2026-07-24T08:04:00.000Z',
    });

    expect(rejected).toMatchObject({
      kind: 'proposal-rejected',
      disposition: 'rejected',
      note: '  Too abstract.  ',
    });
    expect(rerolled).toMatchObject({
      kind: 'proposal-rerolled',
      disposition: 'rerolled',
      note: null,
    });
    expect(documentStore.getNarrationProposal(
      'draft-1',
      'operation-reroll',
    )).toMatchObject({
      state: 'rerolled',
      successorOperationId: 'operation-child',
    });
  });

  it('records an architecture rejection without inventing a content revision', () => {
    const { documentStore, service } = setup();
    addPendingArchitectureProposal(
      documentStore,
      'architecture-operation',
    );

    const decision = service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });

    expect(decision).toMatchObject({
      kind: 'proposal-rejected',
      sourceType: 'architecture-proposal',
      sourceId: 'architecture-operation',
    });
    expect(documentStore.listRevisions('draft-1')).toEqual([]);
  });

  it('creates a validator-fix decision from a real content-changing autosave', () => {
    const { documentStore, service } = setup();
    const documentService = new DocumentService({
      store: documentStore,
      idFactory: (() => {
        const ids = ['revision-baseline', 'revision-autosave-fix'];
        return () => ids.shift()!;
      })(),
      now: (() => {
        const timestamps = [
          '2026-07-24T08:00:30.000Z',
          '2026-07-24T08:03:00.000Z',
        ];
        return () => timestamps.shift()!;
      })(),
    });
    documentService.saveDraft('draft-1', {
      doc: parseMarkdown(
        '## 1. Opening\n\n> Before the validator fix',
      ).toJSON(),
      disposition: 'production-import',
    });
    expect(service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-a',
      ok: false,
      diagnostics: [{ code: 'bad-structure' }],
      createdAt: '2026-07-24T08:01:00.000Z',
    }).decision).toBeNull();
    expect(service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-a',
      ok: true,
      diagnostics: [],
      createdAt: '2026-07-24T08:02:00.000Z',
    }).decision).toBeNull();
    documentService.saveDraft('draft-1', {
      doc: parseMarkdown(
        '## 1. Opening\n\n> Manual fix saved by autosave',
      ).toJSON(),
      disposition: 'autosave',
    });
    const passed = service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-b',
      ok: true,
      diagnostics: [],
      createdAt: '2026-07-24T08:04:00.000Z',
    });

    expect(passed.decision).toMatchObject({
      kind: 'validator-fix-cycle-accepted',
      disposition: 'validator-fix-cycle',
    });
    expect(service.list('draft-1', { limit: 10 }).decisions[0])
      .toMatchObject({
        context: {
          revisions: [
            expect.objectContaining({
              id: 'revision-autosave-fix',
              disposition: 'autosave',
            }),
          ],
        },
      });
    expect(service.list('draft-1', { limit: 10 }).decisions).toHaveLength(1);
    expect(service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-b',
      ok: true,
      diagnostics: [],
      createdAt: '2026-07-24T08:05:00.000Z',
    }).decision).toBeNull();
    expect(service.list('draft-1', { limit: 10 }).decisions).toHaveLength(1);
  });

  it('does not mint a validator-fix cycle for a rerun without a draft edit', () => {
    const { service } = setup();
    service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-a',
      ok: false,
      diagnostics: [{ code: 'bad-structure' }],
      createdAt: '2026-07-24T08:01:00.000Z',
    });

    expect(service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-b',
      ok: true,
      diagnostics: [],
      createdAt: '2026-07-24T08:02:00.000Z',
    }).decision).toBeNull();
    expect(service.list('draft-1', { limit: 10 }).decisions).toHaveLength(0);
  });

  it('creates one validator-fix decision from Plan 6 corrected-target re-imports', () => {
    const { documentStore, service } = setup();
    const path = 'whp-youtube/episodes/episode-one.md';
    const revisionIds = [
      'initial-production-import',
      'corrected-production-import',
    ];
    const revisionTimes = [
      '2026-07-24T08:00:30.000Z',
      '2026-07-24T08:04:00.000Z',
    ];
    const documentService = new DocumentService({
      store: documentStore,
      idFactory: () => revisionIds.shift()!,
      now: () => revisionTimes.shift()!,
    });
    documentService.saveDraft('draft-1', {
      doc: parseMarkdown([
        '# Episode one',
        '',
        '## 1. Opening',
        '',
        '> The invalid production target.',
      ].join('\n')).toJSON(),
      disposition: 'production-import',
    });
    documentStore.createPromotion({
      draftId: 'draft-1',
      operationId: 'promote-operation',
      state: 'validation-required',
      targetPath: path,
      targetHash: 'hash-a',
      importRevisionId: 'initial-production-import',
      validationHash: null,
      error: null,
      createdAt: '2026-07-24T08:00:00.000Z',
      updatedAt: '2026-07-24T08:00:00.000Z',
    });
    service.recordValidatorAttempt({
      draftId: 'draft-1',
      path,
      hash: 'hash-a',
      ok: false,
      diagnostics: [{ code: 'bad-structure' }],
      createdAt: '2026-07-24T08:01:00.000Z',
    });
    const correctedMarkdown = [
      '# Corrected episode one',
      '',
      '## 1. Opening',
      '',
      '> The corrected production target.',
    ].join('\n');
    documentService.syncPromotionOutput('draft-1', {
      path,
      content: correctedMarkdown,
      hash: 'hash-b',
    });

    expect(documentStore.listRevisions('draft-1').at(-1)).toMatchObject({
      id: 'corrected-production-import',
      kind: 'narration',
      disposition: 'production-import',
    });
    expect(service.recordValidatorAttempt({
      draftId: 'draft-1',
      path,
      hash: 'hash-b',
      ok: true,
      diagnostics: [],
      createdAt: '2026-07-24T08:04:00.000Z',
    }).decision).toMatchObject({
      kind: 'validator-fix-cycle-accepted',
    });
    expect(service.list('draft-1', { limit: 10 }).decisions[0])
      .toMatchObject({
        context: {
          revisions: [
            expect.objectContaining({
              id: 'corrected-production-import',
              disposition: 'production-import',
            }),
          ],
        },
      });
    expect(service.recordValidatorAttempt({
      draftId: 'draft-1',
      path,
      hash: 'hash-b',
      ok: true,
      diagnostics: [],
      createdAt: '2026-07-24T08:05:00.000Z',
    }).decision).toBeNull();
    expect(service.list('draft-1', { limit: 10 }).decisions).toHaveLength(1);
  });

  it('does not treat a content-unchanged autosave as validator-fix acceptance', () => {
    const { documentStore, service } = setup();
    const unchangedDoc = parseMarkdown(
      '## 1. Opening\n\n> Still invalid',
    ).toJSON();
    const documentService = new DocumentService({
      store: documentStore,
      idFactory: (() => {
        const ids = ['revision-baseline', 'revision-no-op-autosave'];
        return () => ids.shift()!;
      })(),
      now: (() => {
        const timestamps = [
          '2026-07-24T08:00:30.000Z',
          '2026-07-24T08:02:00.000Z',
        ];
        return () => timestamps.shift()!;
      })(),
    });
    documentService.saveDraft('draft-1', {
      doc: unchangedDoc,
      disposition: 'production-import',
    });
    service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-a',
      ok: false,
      diagnostics: [{ code: 'bad-structure' }],
      createdAt: '2026-07-24T08:01:00.000Z',
    });
    new ArchitectureService({
      store: documentStore,
      operationService: {
        submit: () => 'unused',
        get: () => ({
          operation: 'generate-architecture',
          draftId: 'draft-1',
        }),
        result: () => ({ kind: 'pending' }),
      },
      idFactory: () => 'revision-interposed-architecture',
      now: () => '2026-07-24T08:01:30.000Z',
    }).save('draft-1', {
      expectedRevisionSeq: 1,
      sections: [{
        key: 'premise',
        title: 'Premise',
        md: 'Architecture-only change before no-op autosave.',
      }],
      opId: null,
      disposition: 'manual-save',
    });
    documentService.saveDraft('draft-1', {
      doc: unchangedDoc,
      disposition: 'autosave',
    });

    expect(service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-b',
      ok: true,
      diagnostics: [],
      createdAt: '2026-07-24T08:03:00.000Z',
    }).decision).toBeNull();
    expect(service.list('draft-1', { limit: 10 }).decisions).toHaveLength(0);
  });

  it('does not treat restore or architecture revisions as validator-fix acceptance', () => {
    const { documentStore, service } = setup();
    new DocumentService({
      store: documentStore,
      idFactory: () => 'revision-baseline',
      now: () => '2026-07-24T08:00:30.000Z',
    }).saveDraft('draft-1', {
      doc: parseMarkdown(
        '## 1. Opening\n\n> Before excluded revisions',
      ).toJSON(),
      disposition: 'production-import',
    });
    service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-a',
      ok: false,
      diagnostics: [{ code: 'bad-structure' }],
      createdAt: '2026-07-24T08:01:00.000Z',
    });
    const documentService = new DocumentService({
      store: documentStore,
      idFactory: (() => {
        let id = 0;
        return () => `excluded-narration-${++id}`;
      })(),
      now: () => '2026-07-24T08:02:10.000Z',
    });
    documentService.saveDraft('draft-1', {
      doc: parseMarkdown(
        '## 1. Opening\n\n> Restored content',
      ).toJSON(),
      disposition: 'restore-excluded-narration-1',
    });
    new ArchitectureService({
      store: documentStore,
      operationService: {
        submit: () => 'unused',
        get: () => ({
          operation: 'generate-architecture',
          draftId: 'draft-1',
        }),
        result: () => ({ kind: 'pending' }),
      },
      idFactory: () => 'excluded-architecture',
      now: () => '2026-07-24T08:02:20.000Z',
    }).save('draft-1', {
      expectedRevisionSeq: 2,
      sections: [{
        key: 'premise',
        title: 'Premise',
        md: 'Architecture-only change.',
      }],
      opId: null,
      disposition: 'manual-save',
    });

    expect(service.recordValidatorAttempt({
      draftId: 'draft-1',
      path: 'whp-youtube/episodes/episode-one.md',
      hash: 'hash-b',
      ok: true,
      diagnostics: [],
      createdAt: '2026-07-24T08:03:00.000Z',
    }).decision).toBeNull();
  });

  it('paginates stably and edits notes without interpreting their text', () => {
    const { documentStore, service } = setup();
    for (const [operationId, time] of [
      ['op-1', '2026-07-24T08:01:00.000Z'],
      ['op-2', '2026-07-24T08:02:00.000Z'],
      ['op-3', '2026-07-24T08:03:00.000Z'],
    ] as const) {
      addPendingArchitectureProposal(documentStore, operationId, time);
      service.captureArchitectureRejection({
        draftId: 'draft-1',
        operationId,
        reason: null,
        resolvedAt: time,
      });
    }

    const first = service.list('draft-1', { limit: 2 });
    const second = service.list('draft-1', {
      after: first.nextCursor!,
      limit: 2,
    });
    const annotated = service.setNote(
      'draft-1',
      first.decisions[0]!.id,
      '  verbatim \t note  ',
    );

    expect(first.decisions.map(({ context }) => context.source.id))
      .toEqual(['op-1', 'op-2']);
    expect(first.nextCursor).toBe(2);
    expect(second.decisions.map(({ context }) => context.source.id))
      .toEqual(['op-3']);
    expect(second.nextCursor).toBeNull();
    expect(annotated.note).toBe('  verbatim \t note  ');
  });

  it('freezes exact on-demand inputs and ingests a valid result only once', () => {
    const submissions: unknown[] = [];
    let result: ReturnType<LearningOperationService['result']> = {
      kind: 'pending',
    };
    const operations: LearningOperationService = {
      submit(operation, inputs) {
        expect(operation).toBe('distill');
        submissions.push(inputs);
        return 'operation-distill-1';
      },
      get: () => ({
        operation: 'distill',
        state: result.kind === 'pending' ? 'running' : 'completed',
      }),
      result: () => result,
    };
    const { documentStore, service, learningStore } = setup({
      operationService: operations,
    });
    addPendingArchitectureProposal(
      documentStore,
      'architecture-operation',
    );
    const decision = service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: 'Too abstract.',
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });

    const started = service.startDistillation('draft-1', 'on-demand');

    expect(started).toMatchObject({
      draftId: 'draft-1',
      trigger: 'on-demand',
      state: 'queued',
      operationId: 'operation-distill-1',
      resumeKey: expect.any(String),
    });
    expect(submissions).toEqual([{
      session: {
        id: started.sessionId,
        draft_id: 'draft-1',
        trigger: 'on-demand',
        decisions: [{
          ...service.list('draft-1').decisions[0],
          id: decision.id,
        }],
      },
      existing_lessons: [],
    }]);

    result = {
      kind: 'schema',
      guardrail: null,
      value: {
        status: 'complete',
        lessons: [{
          classification: 'episode-local',
          lesson_markdown: '  Keep this episode concrete.  ',
          rationale_markdown: '  Martin rejected abstraction.  ',
          evidence: [decision.id],
          proposed_target: null,
          supersedes_lesson_id: null,
        }],
        guardrail_markdown: null,
      },
    };
    const ingested = service.reconcileDistillation(started.id);
    const replay = service.reconcileDistillation(started.id);

    expect(ingested.state).toBe('ingested');
    expect(replay).toEqual(ingested);
    expect(learningStore.listLessons('draft-1')).toEqual([
      expect.objectContaining({
        classification: 'episode-local',
        state: 'proposed',
        proposedMarkdown: '  Keep this episode concrete.  ',
        reviewedMarkdown: '  Keep this episode concrete.  ',
        rationaleMarkdown: '  Martin rejected abstraction.  ',
      }),
    ]);
    expect(learningStore.listLessonEvidence(
      learningStore.listLessons('draft-1')[0]!.id,
    )).toEqual([decision.id]);
  });

  it('closes only session-end windows and returns a typed no-op for empties', () => {
    const submissions: unknown[] = [];
    const operations: LearningOperationService = {
      submit(_operation, inputs) {
        submissions.push(inputs);
        return `operation-${submissions.length}`;
      },
      get: () => ({ operation: 'distill', state: 'running' }),
      result: () => ({ kind: 'pending' }),
    };
    const { documentStore, service } = setup({
      operationService: operations,
    });

    const empty = service.startDistillation('draft-1', 'on-demand');
    expect(empty).toMatchObject({
      state: 'no-op',
      operationId: null,
      decisions: [],
    });
    expect(submissions).toEqual([]);

    addPendingArchitectureProposal(documentStore, 'first');
    service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'first',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    const onDemand = service.startDistillation('draft-1', 'on-demand');
    expect(service.listSessions('draft-1')).toEqual([
      expect.objectContaining({
        id: onDemand.sessionId,
        endCursor: null,
        closedAt: null,
      }),
    ]);
    service.reconcileDistillation(onDemand.id);

    const ended = service.startDistillation('draft-1', 'session-end');
    expect(ended.sessionId).toBe(onDemand.sessionId);
    expect(service.listSessions('draft-1')[0]).toMatchObject({
      endCursor: 1,
      closedAt: expect.any(String),
    });

    addPendingArchitectureProposal(documentStore, 'second');
    service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'second',
      reason: null,
      resolvedAt: '2026-07-24T08:04:00.000Z',
    });
    const sessions = service.listSessions('draft-1');
    expect(sessions).toHaveLength(2);
    expect(sessions[1]).toMatchObject({
      startCursor: 1,
      endCursor: null,
    });
  });

  it('supplies applied durable lessons to Distill only as repository references', () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), 'learning-doctrine-'));
    roots.push(repositoryRoot);
    mkdirSync(join(repositoryRoot, 'whp-youtube'));
    const doctrine = 'Prefer concrete openings.';
    writeFileSync(
      join(repositoryRoot, 'whp-youtube', 'STEERING.md'),
      `# Steering\n\n${doctrine}\n`,
    );
    const contentHash = `sha256:${
      createHash('sha256').update(doctrine).digest('hex')
    }`;
    const submissions: unknown[] = [];
    const operations: LearningOperationService = {
      submit(_operation, inputs) {
        submissions.push(inputs);
        return 'distill-with-durable-provenance';
      },
      get: () => ({ operation: 'distill', state: 'running' }),
      result: () => ({ kind: 'pending' }),
    };
    const { documentStore, learningStore, service } = setup({
      operationService: operations,
      repositoryRoot,
    });
    addPendingArchitectureProposal(documentStore, 'architecture-operation');
    service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    learningStore.createLesson({
      id: 'durable-applied',
      draftId: 'draft-1',
      distillationRunId: null,
      classification: 'durable',
      state: 'applied',
      proposedMarkdown: null,
      reviewedMarkdown: null,
      rationaleMarkdown: 'Repeated choice.',
      proposedTarget: 'writing skill',
      supersedesLessonId: null,
      version: 2,
      repositoryCommit: 'doctrine-commit',
      repositoryPath: 'whp-youtube/STEERING.md',
      repositoryAnchor: 'lines:3-3',
      repositoryContentHash: contentHash,
      createdAt: '2026-07-24T08:04:00.000Z',
      updatedAt: '2026-07-24T08:04:00.000Z',
    }, []);

    const run = service.startDistillation('draft-1', 'on-demand');
    const frozen = run.lessons[0]!.snapshot as Record<string, unknown>;

    expect(frozen).not.toHaveProperty('lesson_markdown');
    expect(frozen).toMatchObject({
      repository_provenance: {
        status: 'resolved',
        commit: 'doctrine-commit',
        path: 'whp-youtube/STEERING.md',
        anchor: 'lines:3-3',
        content_hash: contentHash,
      },
    });
    const supplied = (submissions[0] as {
      existing_lessons: Array<Record<string, unknown>>;
    }).existing_lessons[0]!;
    expect(supplied).not.toHaveProperty('lesson_markdown');
    expect(supplied).toMatchObject({
      id: 'durable-applied',
      classification: 'durable',
      state: 'applied',
      repository_provenance: {
        status: 'resolved',
        commit: 'doctrine-commit',
        path: 'whp-youtube/STEERING.md',
        anchor: 'lines:3-3',
        content_hash: contentHash,
      },
    });
    expect(JSON.stringify(submissions[0])).not.toContain(doctrine);
    expect(JSON.stringify(service.getDistillationRun(run.id))).not.toContain(
      doctrine,
    );
  });

  it('rejects malformed evidence without creating lessons', () => {
    let result: ReturnType<LearningOperationService['result']> = {
      kind: 'pending',
    };
    const operations: LearningOperationService = {
      submit: () => 'operation-distill-1',
      get: () => ({ operation: 'distill', state: 'completed' }),
      result: () => result,
    };
    const { documentStore, service, learningStore } = setup({
      operationService: operations,
    });
    addPendingArchitectureProposal(
      documentStore,
      'architecture-operation',
    );
    service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    const started = service.startDistillation('draft-1', 'on-demand');
    result = {
      kind: 'schema',
      guardrail: null,
      value: {
        status: 'complete',
        lessons: [{
          classification: 'durable',
          lesson_markdown: 'Prefer concrete openings.',
          rationale_markdown: 'The choice repeated.',
          evidence: ['not-frozen'],
          proposed_target: 'writing skill',
          supersedes_lesson_id: null,
        }],
        guardrail_markdown: null,
      },
    };

    expect(service.reconcileDistillation(started.id)).toMatchObject({
      state: 'failed',
      error: expect.stringMatching(/frozen decision/i),
    });
    expect(learningStore.listLessons('draft-1')).toEqual([]);
  });

  it('returns resolved evidence and preserves proposal text through review', () => {
    const { documentStore, service, learningStore } = setup({
      resumeKeyFactory: () => 'reconciliation-token-durable',
    });
    addPendingArchitectureProposal(
      documentStore,
      'architecture-operation',
    );
    const captured = service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: 'Too abstract.',
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    learningStore.createLesson({
      id: 'lesson-local',
      draftId: 'draft-1',
      distillationRunId: null,
      classification: 'episode-local',
      state: 'proposed',
      proposedMarkdown: 'Original agent proposal.',
      reviewedMarkdown: 'Original agent proposal.',
      rationaleMarkdown: 'The explicit rejection named abstraction.',
      proposedTarget: null,
      supersedesLessonId: null,
      version: 1,
      repositoryCommit: null,
      repositoryPath: null,
      repositoryAnchor: null,
      repositoryContentHash: null,
      createdAt: '2026-07-24T08:05:00.000Z',
      updatedAt: '2026-07-24T08:05:00.000Z',
    }, [captured.id]);

    const detail = service.getLesson('draft-1', 'lesson-local');
    expect(detail).toMatchObject({
      proposedMarkdown: 'Original agent proposal.',
      reviewedMarkdown: 'Original agent proposal.',
      evidenceIds: [captured.id],
      evidence: [{
        id: captured.id,
        status: 'resolved',
        decision: expect.objectContaining({ id: captured.id }),
      }],
      reconciliation: null,
    });

    const edited = service.editLesson('draft-1', 'lesson-local', {
      expectedVersion: 1,
      reviewedMarkdown: '  Martin reviewed this exact prose.  ',
    });
    expect(edited).toMatchObject({
      state: 'proposed',
      proposedMarkdown: 'Original agent proposal.',
      reviewedMarkdown: '  Martin reviewed this exact prose.  ',
      version: 2,
    });
    expect(service.approveLesson('draft-1', 'lesson-local', {
      expectedVersion: 2,
    })).toMatchObject({
      state: 'approved',
      reviewedMarkdown: '  Martin reviewed this exact prose.  ',
    });
    expect(service.retireLesson('draft-1', 'lesson-local', {
      expectedVersion: 3,
    })).toMatchObject({ state: 'retired' });
  });

  it('prepares durable reconciliation as a proposal and persists awaiting state', () => {
    const { documentStore, service, learningStore } = setup({
      resumeKeyFactory: () => 'reconciliation-token-durable',
    });
    addPendingArchitectureProposal(
      documentStore,
      'architecture-operation',
    );
    const captured = service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    learningStore.createLesson({
      id: 'lesson-durable',
      draftId: 'draft-1',
      distillationRunId: null,
      classification: 'durable',
      state: 'proposed',
      proposedMarkdown: 'Prefer concrete stakes.',
      reviewedMarkdown: 'Prefer concrete stakes over abstractions.',
      rationaleMarkdown: 'Martin explicitly rejected an abstract treatment.',
      proposedTarget: 'writing skill',
      supersedesLessonId: null,
      version: 1,
      repositoryCommit: null,
      repositoryPath: null,
      repositoryAnchor: null,
      repositoryContentHash: null,
      createdAt: '2026-07-24T08:05:00.000Z',
      updatedAt: '2026-07-24T08:05:00.000Z',
    }, [captured.id]);

    const approved = service.approveLesson(
      'draft-1',
      'lesson-durable',
      { expectedVersion: 1 },
    );

    expect(approved).toMatchObject({
      state: 'approved-pending-reconcile',
      reconciliation: {
        state: 'prepared',
        resumeKey: expect.any(String),
        preparedMarkdown: expect.stringContaining(
          'Prefer concrete stakes over abstractions.',
        ),
      },
    });
    expect(approved.reconciliation?.preparedMarkdown).toContain(
      '$reconcile-whp',
    );
    expect(approved.reconciliation?.preparedMarkdown).toContain(
      'Reconciliation: reconciliation-token-durable',
    );
    expect(approved.reconciliation?.preparedMarkdown).toContain(
      'must add that exact line to DECISIONS.md or a doctrine file',
    );
    expect(approved.reconciliation?.preparedMarkdown).toContain(
      captured.id,
    );
    expect(approved.reconciliation?.preparedMarkdown).toContain(
      'Script Creator has not edited or committed doctrine',
    );
    const awaiting = service.markReconciliationAwaiting(
      approved.reconciliation!.resumeKey,
    );
    expect(awaiting).toMatchObject({
      state: 'awaiting-reconciliation',
      resumeKey: approved.reconciliation!.resumeKey,
    });

    const retry = service.approveLesson(
      'draft-1',
      'lesson-durable',
      { expectedVersion: 1 },
    );
    expect(retry.reconciliation?.id).toBe(approved.reconciliation?.id);
  });

  it('supplies only ordered active episode lessons and records the exact operation snapshot', () => {
    const { documentStore, service, learningStore } = setup();
    addPendingArchitectureProposal(
      documentStore,
      'architecture-operation',
    );
    const captured = service.captureArchitectureRejection({
      draftId: 'draft-1',
      operationId: 'architecture-operation',
      reason: null,
      resolvedAt: '2026-07-24T08:03:00.000Z',
    });
    for (const [id, state, classification, text, createdAt] of [
      ['local-a', 'approved', 'episode-local', '  First exact lesson.  ', '2026-07-24T08:05:00.000Z'],
      ['local-b', 'approved', 'episode-local', 'Second exact lesson.', '2026-07-24T08:06:00.000Z'],
      ['local-retired', 'retired', 'episode-local', 'Retired.', '2026-07-24T08:07:00.000Z'],
      ['durable-applied', 'applied', 'durable', null, '2026-07-24T08:08:00.000Z'],
    ] as const) {
      learningStore.createLesson({
        id,
        draftId: 'draft-1',
        distillationRunId: null,
        classification,
        state,
        proposedMarkdown: text,
        reviewedMarkdown: text,
        rationaleMarkdown: 'Evidence.',
        proposedTarget: classification === 'durable' ? 'skill' : null,
        supersedesLessonId: null,
        version: 3,
        repositoryCommit: classification === 'durable' ? 'abc123' : null,
        repositoryPath: classification === 'durable'
          ? 'whp-youtube/STEERING.md'
          : null,
        repositoryAnchor: classification === 'durable' ? 'lines:1-1' : null,
        repositoryContentHash: classification === 'durable'
          ? 'sha256:stored'
          : null,
        createdAt,
        updatedAt: createdAt,
      }, [captured.id]);
    }

    const active = service.activeEpisodeLessons('draft-1');
    expect(active).toEqual([
      {
        id: 'local-a',
        version: 3,
        markdown: '  First exact lesson.  ',
        contentHash: expect.stringMatching(/^sha256:/u),
      },
      {
        id: 'local-b',
        version: 3,
        markdown: 'Second exact lesson.',
        contentHash: expect.stringMatching(/^sha256:/u),
      },
    ]);

    service.recordOperationLessons('operation-1', active);
    service.recordOperationLessons('operation-1', active);
    expect(service.operationLessons('operation-1')).toEqual([
      expect.objectContaining({
        operationId: 'operation-1',
        lessonId: 'local-a',
        lessonVersion: 3,
        contentHash: active[0]!.contentHash,
      }),
      expect.objectContaining({
        operationId: 'operation-1',
        lessonId: 'local-b',
        lessonVersion: 3,
        contentHash: active[1]!.contentHash,
      }),
    ]);

    expect(service.recoverOperationLessons('operation-recovered', {
      selection: 'Persisted envelope.',
      approved_lessons: active.map(({ markdown }) => markdown),
    }, 'draft-1')).toHaveLength(2);
    expect(service.recoverOperationLessons('operation-recovered', {
      approved_lessons: ['Forged or stale lesson.'],
    })).toHaveLength(2);
  });

  it('recovers exact lesson provenance by persisted draft identity when drafts share text', () => {
    const { documentStore, learningStore, service } = setup();
    documentStore.createDraft({
      id: 'draft-2',
      episodeSlug: 'episode-two',
      title: 'Episode Two',
      format: 'narration',
      doc: {
        type: 'doc',
        attrs: { format: 'narration', preamble: 'Base' },
        content: [],
      },
      updatedAt: '2026-07-24T08:00:00.000Z',
    });
    for (const [id, draftId] of [
      ['lesson-draft-1', 'draft-1'],
      ['lesson-draft-2', 'draft-2'],
    ] as const) {
      learningStore.createLesson({
        id,
        draftId,
        distillationRunId: null,
        classification: 'episode-local',
        state: 'approved',
        proposedMarkdown: 'Shared exact lesson.',
        reviewedMarkdown: 'Shared exact lesson.',
        rationaleMarkdown: 'Evidence.',
        proposedTarget: null,
        supersedesLessonId: null,
        version: 2,
        repositoryCommit: null,
        repositoryPath: null,
        repositoryAnchor: null,
        repositoryContentHash: null,
        createdAt: '2026-07-24T08:05:00.000Z',
        updatedAt: '2026-07-24T08:05:00.000Z',
      }, []);
    }

    expect(service.recoverOperationLessons(
      'operation-draft-1',
      { approved_lessons: ['Shared exact lesson.'] },
      'draft-1',
    )).toEqual([
      expect.objectContaining({
        operationId: 'operation-draft-1',
        lessonId: 'lesson-draft-1',
        lessonVersion: 2,
      }),
    ]);
  });
});
