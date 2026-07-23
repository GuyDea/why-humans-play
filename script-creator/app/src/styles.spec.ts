import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync('src/styles.scss', 'utf8');
const panelSources = [
  'src/app/panels/agent-console.ts',
  'src/app/panels/brief-panel.ts',
  'src/app/panels/findings-panel.ts',
  'src/app/panels/parking-lot.ts',
].map((path) => readFileSync(path, 'utf8'));

describe('Script Studio styling contract', () => {
  it('defines the exact WHP-adjacent palette as shared tokens', () => {
    expect(styles).toMatch(/--whp-ink:\s*#323232;/u);
    expect(styles).toMatch(/--whp-ground:\s*#f8f8f8;/u);
    expect(styles).toMatch(/--whp-accent:\s*#aa0a0a;/u);
  });

  it('keeps narration readable at an approximately 68ch measure', () => {
    expect(styles).toMatch(
      /\.ProseMirror\s*\{[^}]*max-width:\s*68ch;[^}]*font-family:\s*var\(--whp-font-editor\);/su,
    );
  });

  it('uses the accent for the locked-passage treatment', () => {
    expect(styles).toMatch(
      /\.ProseMirror \.locked\s*\{[^}]*var\(--whp-accent-tint\)[^}]*var\(--whp-accent\)/su,
    );
  });

  it('gives editor selection actions a complete floating toolbar treatment', () => {
    expect(styles).toMatch(/\.selection-toolbar\s*\{/u);
    expect(styles).toMatch(/\.selection-toolbar\[hidden\]\s*\{/u);
    expect(styles).toMatch(
      /\.selection-toolbar button\[data-action='rewrite'\]\s*\{[^}]*var\(--whp-accent\)/su,
    );
  });

  it('defines shared panel chrome for every studio panel', () => {
    expect(styles).toMatch(
      /\.studio-panel\s*\{[^}]*border:\s*var\(--whp-panel-border\);[^}]*background:\s*var\(--whp-panel-background\);/su,
    );
    for (const source of panelSources) {
      expect(source).toContain('class="panel studio-panel"');
    }
  });
});
