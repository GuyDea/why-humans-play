import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EditorState } from 'prosemirror-state';
import {
  parseMarkdown,
  personalInputAcceptanceTransaction,
  schema,
} from '../src/index.js';

describe('personal input acceptance', () => {
  it('preserves marked evidence text around the real template marker', () => {
    const markdown = readFileSync(
      join(
        import.meta.dirname,
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
        .exec(markdown);
    expect(personalInputMatch).not.toBeNull();
    const marker = '<!-- PI-001: Martin input -->';
    let state = EditorState.create({ doc: parseMarkdown(markdown) });
    let markerParagraphPosition: number | null = null;
    let evidenceOffset: number | null = null;
    state.doc.descendants((node, position) => {
      if (
        node.type.name === 'paragraph'
        && node.textContent.includes(marker)
      ) {
        markerParagraphPosition = position;
        evidenceOffset = node.textContent.indexOf('[F-001]');
        return false;
      }
      return true;
    });
    expect(markerParagraphPosition).not.toBeNull();
    expect(evidenceOffset).not.toBeNull();
    const evidenceLabel = '[F-001]';
    const evidenceFrom =
      markerParagraphPosition! + 1 + evidenceOffset!;
    state = state.apply(state.tr.addMark(
      evidenceFrom,
      evidenceFrom + evidenceLabel.length,
      schema.marks['lock']!.create({ lockId: 'evidence-link' }),
    ));

    const transaction = personalInputAcceptanceTransaction(state, {
      marker,
      bodyMd: personalInputMatch![1]!.trimEnd(),
      replacement: 'Martin supplied the exact remembered moment.',
    });

    expect(transaction).not.toBeNull();
    expect(transaction!.doc.textContent).not.toContain(marker);
    const markedEvidence: string[] = [];
    transaction!.doc.descendants((node) => {
      if (
        node.isText
        && node.marks.some((mark) =>
          mark.type.name === 'lock'
          && mark.attrs['lockId'] === 'evidence-link')
      ) {
        markedEvidence.push(node.text ?? '');
      }
      return true;
    });
    expect(markedEvidence.join('')).toBe(evidenceLabel);
    expect(transaction!.doc.toJSON()).toEqual(
      expect.objectContaining({ type: 'doc' }),
    );
    expect(JSON.stringify(transaction!.doc.toJSON())).toContain(
      '- **Decision:** COMPLETED',
    );
  });
});
