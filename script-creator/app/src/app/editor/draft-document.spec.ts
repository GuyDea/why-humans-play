import { describe, expect, it } from 'vitest';
import type { DraftDocument } from '../api/client';
import type { DocumentJson } from '../metrics';
import { preserveDraftDocument } from './draft-document';

describe('preserveDraftDocument', () => {
  it('keeps raw metadata and per-beat context while accepting editor changes', () => {
    const source: DraftDocument = {
      type: 'doc',
      attrs: { format: 'narration', preamble: '' },
      metadata: {
        topic: 'Why constraints create play',
        anchors: ['Players accept the rule.'],
        unknowns: [],
        approvedLessons: [],
        creativeStatus: { phase: 'rapid-prototype' },
        directionApproved: false,
        narrativeJobs: {
          'beat-1': 'Turn the example into the larger question.',
        },
        importedBy: 'fixture',
      },
      schemaVersion: 4,
      content: [{
        type: 'beat',
        attrs: {
          beatId: 'beat-1',
          title: 'The test beat',
          timeTargetMs: 30_000,
          narrativeJob: 'Turn the example into the larger question.',
          sourceMarker: 'preserve-me',
        },
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Original words.' }],
        }],
      }],
    };
    const editorDocument: DocumentJson = {
      type: 'doc',
      attrs: { format: 'narration', preamble: '' },
      content: [{
        type: 'beat',
        attrs: {
          beatId: 'beat-1',
          title: 'The test beat',
          timeTargetMs: 30_000,
        },
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Edited words.' }],
        }],
      }],
    };

    expect(preserveDraftDocument(editorDocument, source)).toEqual({
      ...editorDocument,
      metadata: source['metadata'],
      schemaVersion: 4,
      content: [{
        ...editorDocument.content![0],
        attrs: {
          beatId: 'beat-1',
          title: 'The test beat',
          timeTargetMs: 30_000,
          narrativeJob: 'Turn the example into the larger question.',
          sourceMarker: 'preserve-me',
        },
      }],
    });
  });

  it('matches preserved beat data by stable id before duplicate title', () => {
    const source: DraftDocument = {
      type: 'doc',
      content: [
        {
          type: 'beat',
          attrs: {
            beatId: 'beat-a',
            title: 'Repeated title',
            narrativeJob: 'Job A',
          },
          content: [],
        },
        {
          type: 'beat',
          attrs: {
            beatId: 'beat-b',
            title: 'Repeated title',
            narrativeJob: 'Job B',
          },
          content: [],
        },
      ],
    };
    const editorDocument: DocumentJson = {
      type: 'doc',
      content: [
        {
          type: 'beat',
          attrs: { beatId: 'beat-a', title: 'Repeated title' },
          content: [],
        },
        {
          type: 'beat',
          attrs: { beatId: 'beat-b', title: 'Repeated title' },
          content: [],
        },
      ],
    };

    expect(
      preserveDraftDocument(editorDocument, source)
        .content?.[1]?.attrs?.['narrativeJob'],
    ).toBe('Job B');
  });
});
