import { describe, expect, it } from 'vitest';
import { selectionActivityMessage } from './studio-composition';

describe('selectionActivityMessage', () => {
  it('points review activity to the Review findings panel', () => {
    expect(selectionActivityMessage('review', 'streaming')).toContain(
      'Review findings',
    );
  });

  it('says alternatives arrive inline', () => {
    expect(
      selectionActivityMessage('generate-alternatives', 'submitting'),
    ).toMatch(/alternatives/i);
  });

  it('says rewrite proposes at the selection', () => {
    expect(selectionActivityMessage('rewrite-selection', 'streaming')).toMatch(
      /proposal/i,
    );
  });

  it('falls back to a titled label for other operations', () => {
    expect(selectionActivityMessage('promote', 'streaming')).toBe(
      'Promote · streaming…',
    );
  });
});
