import '@angular/compiler';
import {
  createComponent,
  provideZonelessChangeDetection,
  signal,
  ɵSIGNAL,
  type ɵInputSignalNode,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import type {
  DraftRecord,
  SaveDraftInput,
  SavedDraft,
} from '../api/client';
import {
  ApprovalGate,
  BriefPanel,
  BriefPanelModel,
  buildDraftEnvelopeInputs,
  readDraftMetadata,
  type BriefPanelSaver,
  type PromotionLauncher,
  type ScriptDraftMetadata,
} from './brief-panel';

const draft: DraftRecord = {
  id: 'draft-1',
  episodeSlug: 'why-we-play',
  title: 'Why we play',
  format: 'narration',
  doc: {
    type: 'doc',
    attrs: { format: 'narration', preamble: '' },
    content: [],
  },
  updatedAt: '2026-07-23T10:00:00.000Z',
};

const metadata: ScriptDraftMetadata = {
  topic: 'Why people accept artificial constraints',
  anchors: ['Golf has deliberately inefficient rules.'],
  unknowns: ['Whether the first rule was written down.'],
  approvedLessons: ['Keep the premise concrete.'],
  creativeStatus: {
    phase: 'rapid-prototype',
  },
  directionApproved: false,
};

function savedDraft(input: SaveDraftInput, seq: number): SavedDraft {
  const updated = {
    ...draft,
    doc: input.doc,
    updatedAt: `2026-07-23T10:00:0${seq}.000Z`,
  };
  return {
    draft: updated,
    revision: {
      id: `revision-${seq}`,
      draftId: draft.id,
      seq,
      opId: null,
      disposition: input.disposition ?? 'edit',
      doc: input.doc,
      createdAt: updated.updatedAt,
    },
  };
}

describe('draft brief metadata', () => {
  it('reads a complete metadata record from the draft document', () => {
    expect(readDraftMetadata({
      ...draft.doc,
      metadata,
    })).toEqual(metadata);
  });

  it('falls back field-by-field when persisted metadata is malformed', () => {
    expect(readDraftMetadata({
      ...draft.doc,
      metadata: {
        topic: 42,
        anchors: ['usable anchor', null],
        unknowns: 'not-a-list',
        approvedLessons: ['approved'],
        creativeStatus: { phase: '' },
        directionApproved: 'yes',
      },
    })).toEqual({
      topic: '',
      anchors: ['usable anchor'],
      unknowns: [],
      approvedLessons: ['approved'],
      creativeStatus: { phase: 'rapid-prototype' },
      directionApproved: false,
    });
  });

  it('persists edits in draft metadata and revisions without changing narration', async () => {
    let seq = 0;
    const save = vi.fn<BriefPanelSaver['save']>(async (_id, input) =>
      savedDraft(input, ++seq));
    const model = new BriefPanelModel(draft, { save });

    await model.update({
      topic: metadata.topic,
      anchors: metadata.anchors,
      unknowns: metadata.unknowns,
      approvedLessons: metadata.approvedLessons,
      creativeStatus: metadata.creativeStatus,
    });

    expect(save).toHaveBeenCalledWith('draft-1', {
      doc: {
        ...draft.doc,
        metadata: {
          ...metadata,
          directionApproved: false,
        },
      },
      disposition: 'brief-metadata',
    });
    expect(model.draft().doc['content']).toBe(draft.doc['content']);
    expect(model.metadata()).toEqual({
      ...metadata,
      directionApproved: false,
    });
    expect(model.saveError()).toBeNull();
  });

  it('preserves metadata when saving an editor-core document snapshot', async () => {
    const save = vi.fn<BriefPanelSaver['save']>(async (_id, input) =>
      savedDraft(input, 1));
    const model = new BriefPanelModel({
      ...draft,
      doc: { ...draft.doc, metadata },
    }, { save });
    const editedDocument = {
      ...draft.doc,
      content: [{ type: 'beat', content: [] }],
    };

    await model.save('draft-1', {
      doc: editedDocument,
      disposition: 'autosave',
    });

    expect(save).toHaveBeenCalledWith('draft-1', {
      doc: {
        ...editedDocument,
        metadata,
      },
      disposition: 'autosave',
    });
  });

  it('persists brief edits against the latest editor document', async () => {
    const save = vi.fn<BriefPanelSaver['save']>(async (_id, input) =>
      savedDraft(input, 1));
    const model = new BriefPanelModel({
      ...draft,
      doc: { ...draft.doc, metadata },
    }, { save });
    const editedDocument = {
      ...draft.doc,
      content: [{
        type: 'beat',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Latest narration.' }],
        }],
      }],
    };

    model.syncDocument(editedDocument);
    await model.update({ topic: 'Updated topic' });

    expect(save).toHaveBeenCalledWith('draft-1', {
      doc: {
        ...editedDocument,
        metadata: {
          ...metadata,
          topic: 'Updated topic',
        },
      },
      disposition: 'brief-metadata',
    });
  });

  it('injects the persisted brief fields into the exact operation envelope shape', () => {
    const inputs = buildDraftEnvelopeInputs({
      selection: 'selected narration',
      before: 'before paragraph',
      after: 'after paragraph',
      beatTitle: 'Opening',
      narrativeJob: 'Make the puzzle visible.',
      requestedScope: 'Promote this approved baseline.',
    }, metadata);

    expect(Object.keys(inputs)).toEqual([
      'topic_brief',
      'approved_lessons',
      'selection',
      'surrounding_context',
      'beat_title',
      'narrative_job',
      'creative_status',
      'requested_scope',
    ]);
    expect(inputs).toEqual({
      topic_brief: {
        topic: metadata.topic,
        factual_anchors: metadata.anchors,
        unknowns: metadata.unknowns,
      },
      approved_lessons: metadata.approvedLessons,
      selection: 'selected narration',
      surrounding_context: {
        before: 'before paragraph',
        after: 'after paragraph',
      },
      beat_title: 'Opening',
      narrative_job: 'Make the puzzle visible.',
      creative_status: metadata.creativeStatus,
      requested_scope: 'Promote this approved baseline.',
    });
  });
});

describe('approval gate', () => {
  it('stores explicit direction approval before enabling Promote', async () => {
    let seq = 0;
    const save = vi.fn<BriefPanelSaver['save']>(async (_id, input) =>
      savedDraft(input, ++seq));
    const model = new BriefPanelModel({
      ...draft,
      doc: { ...draft.doc, metadata },
    }, { save });

    const launched = {
      id: signal<string | null>('op-promote'),
      phase: signal<'streaming'>('streaming'),
      events: signal([]),
      consoleEntries: signal([]),
      result: signal(null),
      telemetry: signal({ tokens: null, elapsed: null }),
      stallFlag: signal(false),
      remainingHops: signal(0),
      canResume: signal(false),
      meta: { operation: 'promote' as const, draftId: draft.id },
    };
    const launch = vi.fn<PromotionLauncher['launch']>(() => launched);
    const onLaunch = vi.fn();
    const gate = new ApprovalGate(
      model,
      { launch },
      () => ({
        selection: 'full approved narration',
        before: '',
        after: '',
        beatTitle: 'Episode',
        narrativeJob: 'Creative-approved baseline',
        requestedScope: 'Phase 2 promotion',
      }),
      { onLaunch },
    );

    expect(model.canPromote()).toBe(false);
    expect(gate.promote()).toBeNull();
    expect(launch).not.toHaveBeenCalled();

    await model.setDirectionApproved(true);

    expect(model.canPromote()).toBe(true);
    expect(save).toHaveBeenLastCalledWith('draft-1', {
      doc: {
        ...draft.doc,
        metadata: {
          ...metadata,
          directionApproved: true,
        },
      },
      disposition: 'brief-metadata',
    });

    expect(gate.promote()).toBe(launched);
    expect(launch).toHaveBeenCalledWith(
      'promote',
      expect.objectContaining({
        topic_brief: {
          topic: metadata.topic,
          factual_anchors: metadata.anchors,
          unknowns: metadata.unknowns,
        },
        approved_lessons: metadata.approvedLessons,
        creative_status: metadata.creativeStatus,
        selection: 'full approved narration',
      }),
      { operation: 'promote', draftId: draft.id },
    );
    expect(gate.activeOperation()).toBe(launched);
    expect(onLaunch).toHaveBeenCalledWith(launched);
  });

  it('renders Promote disabled until the approval toggle is on', async () => {
    const save = vi.fn<BriefPanelSaver['save']>(async (_id, input) =>
      savedDraft(input, 1));
    const model = new BriefPanelModel({
      ...draft,
      doc: { ...draft.doc, metadata },
    }, { save });
    const gate = new ApprovalGate(
      model,
      { launch: vi.fn() },
      () => ({
        selection: 'full narration',
        before: '',
        after: '',
        beatTitle: draft.title,
        narrativeJob: '',
        requestedScope: { kind: 'full-draft' },
      }),
    );
    const application = await createApplication({
      providers: [provideZonelessChangeDetection()],
    });
    const host = document.createElement('app-brief-panel');
    document.body.append(host);
    const component = createComponent(BriefPanel, {
      environmentInjector: application.injector,
      hostElement: host,
    });
    setRequiredInput(component.instance.model, model);
    setRequiredInput(component.instance.gate, gate);
    application.attachView(component.hostView);
    component.changeDetectorRef.detectChanges();

    try {
      const promote = host.querySelector<HTMLButtonElement>('button.promote')!;
      expect(promote.disabled).toBe(true);

      await model.setDirectionApproved(true);
      component.changeDetectorRef.detectChanges();
      expect(promote.disabled).toBe(false);
    } finally {
      application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      host.remove();
    }
  });
});

function setRequiredInput<T>(
  inputSignal: { [ɵSIGNAL]: unknown },
  value: T,
): void {
  const node = inputSignal[ɵSIGNAL] as ɵInputSignalNode<T, T>;
  node.applyValueToInputSignal(node, value);
}
