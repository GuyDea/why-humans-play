import { describe, expect, it } from 'vitest';
import type { FindingLayer } from '../editor/proposal-bridge';
import { findingRows } from './findings-panel';

const finding: FindingLayer = {
  annotationId: 'finding-1',
  anchor: 'the score',
  severity: 'important',
  findingMarkdown: 'Clarify what the score measured.',
  optionalDirectionMarkdown: 'Name the proxy before the exploit.',
  from: 4,
  to: 13,
  orphaned: false,
};

describe('findingRows', () => {
  it('marks a live finding as anchored', () => {
    expect(findingRows([finding])).toEqual([{
      ...finding,
      anchorStatus: 'anchored',
    }]);
  });

  it('keeps orphaned findings visible with an orphan indicator', () => {
    expect(findingRows([{ ...finding, orphaned: true }])).toEqual([{
      ...finding,
      orphaned: true,
      anchorStatus: 'orphaned',
    }]);
  });
});
