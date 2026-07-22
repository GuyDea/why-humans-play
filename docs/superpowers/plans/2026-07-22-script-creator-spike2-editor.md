# Script Creator — Spike 2: Editor Range Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the ProseMirror document core can guarantee range identity under concurrent editing: locked passages are mechanically inviolable, proposals re-anchor or conflict (never fuzzy-apply), annotations map or orphan visibly, variants pick atomically, and nothing internal ever leaks into exported Markdown.

**Architecture:** A framework-agnostic `script-creator/editor-core/` package: a script-document schema (beats / narration paragraphs / inline + block variant sets / lock marks / opaque production sections), four ProseMirror plugins (RevisionTracker+LockGuard, AnnotationLayer, ProposalLayer, VariantSet with DOM NodeViews), a deterministic Markdown codec, and a fast-check property harness driving randomized edit/agent interleavings against a reference model. A static esbuild demo page wires everything for real-browser verification. No Angular, no daemon, no codex — the "slow agent" is a controllable promise.

**Tech Stack:** TypeScript strict ESM, prosemirror-model/state/view/transform/history/commands, vitest + jsdom, fast-check, esbuild (demo only).

**Calibration note (from Spike 1 evidence):** in Spike 1, plan-transcribed implementation code caused several fix loops while verbatim tests caught real defects. This plan therefore fixes the **test code and public APIs verbatim** and specifies implementation behavior precisely, leaving plugin internals to the implementer — the tests are the contract.

## Global Constraints

- Branch `script-creator-spike2-editor`; commit after every task, scope `script-creator`.
- Package root `script-creator/editor-core/`; pure ProseMirror — **no TipTap in this spike** (its plugins must be portable into TipTap 3 in Plan 4 unchanged; NodeViews are plain-DOM, framework-agnostic).
- Beat IDs match guyditor's `beat_[a-z2-7]{10}`; planned Short IDs are out of scope here; beat time targets are integer milliseconds (design: Guyditor boundary constraints).
- The five invariants (design: Risks / Spike 2) are the exit bar, enforced by the property harness:
  I1 locked bytes never change; I2 non-overlapping edits rebase proposals; I3 overlapping
  edits always conflict — never fuzzy-apply; I4 locks/proposals/annotations/unsettled
  variants never appear in exported Markdown (export blocked until settled); I5 proposal
  acceptance and its undo are single atomic history steps.
- No editorial logic anywhere in this package — it manages text mechanics only.
- Tests are hermetic (jsdom, no network, no subprocesses). Host `npx vitest run` is the binding green; `npx tsc --noEmit` must stay clean from Task 2 onward.
- Public API names below are normative — later tasks and Plan 4 import them exactly.

## File Structure

```text
script-creator/editor-core/
  package.json / tsconfig.json / vitest.config.ts
  src/schema.ts          — schema (nodes: doc, beat, paragraph, opaqueSection,
                            variantSet, variantOption, inlineVariantSet; marks: lock)
  src/ids.ts             — newBeatId(): beat_[a-z2-7]{10}; newId(prefix)
  src/revision.ts        — revisionPlugin, getRevision(state): number
  src/lock-guard.ts      — lockPlugin, lockRange, unlockRange, getLocks, lockedText
  src/annotations.ts     — annotationPlugin, addAnnotation, getAnnotations
  src/proposals.ts       — proposalPlugin, requestProposal, receiveProposal,
                            acceptProposal, rejectProposal, getProposals
  src/variants.ts        — variant commands + parking lot: insertBlockVariantSet,
                            insertInlineVariantSet, setActive, pickActive, getParkingLot
  src/node-views.ts      — variantNodeViews (block + inline), plain DOM
  src/markdown-codec.ts  — exportMarkdown, parseMarkdown
  src/core.ts            — corePlugins(): Plugin[] (revision, lock, annotation,
                            proposal, variant state, history)
  src/index.ts           — public re-exports
  test/builders.ts       — doc/state builders and edit helpers (non-test module)
  test/*.test.ts         — per-module suites (named in tasks)
  test/property.invariants.test.ts — fast-check harness (Task 11)
  demo/index.html / demo/main.ts / demo/build.mjs — esbuild demo (Task 12)
```

---

### Task 1: Package scaffold

**Files:** Create `script-creator/editor-core/package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`.

**Interfaces:** a workspace where `npx vitest run` and `npx tsc --noEmit` execute; dependencies installed.

- [ ] **Step 1:** `package.json` — `{"name":"@whp/script-creator-editor-core","private":true,"version":"0.0.0","type":"module","scripts":{"test":"vitest run","typecheck":"tsc --noEmit","demo":"node demo/build.mjs"},"dependencies":{"prosemirror-commands":"^1.6.0","prosemirror-history":"^1.4.0","prosemirror-model":"^1.23.0","prosemirror-state":"^1.4.3","prosemirror-transform":"^1.10.0","prosemirror-view":"^1.34.0"},"devDependencies":{"@types/node":"^24.0.0","esbuild":"^0.24.0","fast-check":"^3.22.0","jsdom":"^25.0.0","tsx":"^4.19.0","typescript":"^5.6.0","vitest":"^3.0.0"}}`. `tsconfig.json` and `.gitignore` as in Spike 1 (`target ES2022`, `module NodeNext`, `strict`, `noUncheckedIndexedAccess`; ignore `node_modules/`, `dist/`, `demo/bundle.js`). `vitest.config.ts` sets `test: { environment: 'jsdom', include: ['test/**/*.test.ts'], testTimeout: 20000 }`.
- [ ] **Step 2:** `cd script-creator/editor-core && npm install` — expect clean install.
- [ ] **Step 3:** `npx vitest run` → "No test files found" exit path, no crash.
- [ ] **Step 4:** Commit: `feat(script-creator): scaffold editor-core spike package`.

### Task 2: Schema, IDs, and builders

**Files:** Create `src/schema.ts`, `src/ids.ts`, `test/builders.ts`, `test/schema.test.ts`.

**Interfaces (normative):**
- `schema: Schema` with nodes `doc (content: 'beat+')`, `beat (attrs: beatId, title, timeTargetMs; content: '(paragraph | variantSet | opaqueSection)+')`, `paragraph (content: 'inline*')`, `text`, `opaqueSection (atom; attrs: md)`, `variantSet (attrs: variantId, activeIndex, settled; content: 'variantOption+')`, `variantOption (attrs: label; content: 'paragraph+')`, `inlineVariantSet (inline atom; attrs: variantId, activeIndex, settled, options: Array<{label, text}>)`; mark `lock (attrs: lockId; inclusive: false; excludes: '')`.
- `newBeatId(): string` matching `/^beat_[a-z2-7]{10}$/`; `newId(prefix: string): string`.
- Builders in `test/builders.ts`: `para(text)`, `beatNode(title, ...children)` (auto beatId, `timeTargetMs: 30000`), `docOf(...beats)`, `stateOf(doc)` (EditorState with `corePlugins()` — until Task 5 delivers `core.ts`, a local plugin list of `[history()]`), `apply(state, tr)` shorthand, `insertText(state, pos, text)`, `deleteRange(state, from, to)`, `docText(state)`, `posOfText(state, needle): number` (absolute pos of first character of needle; throws if absent).

- [ ] **Step 1: failing tests** — `test/schema.test.ts` (verbatim):

```ts
import { describe, expect, it } from 'vitest';
import { newBeatId } from '../src/ids.js';
import { schema } from '../src/schema.js';
import { beatNode, docOf, insertText, para, posOfText, stateOf } from './builders.js';

describe('schema', () => {
  it('builds a valid script document', () => {
    const doc = docOf(beatNode('Hook', para('An AI flipped a block.'), para('It got the reward.')));
    expect(doc.check()).toBeUndefined();
    expect(doc.childCount).toBe(1);
    expect(doc.child(0).attrs.beatId).toMatch(/^beat_[a-z2-7]{10}$/);
    expect(doc.child(0).attrs.timeTargetMs).toBe(30000);
  });

  it('rejects narration outside beats', () => {
    expect(() => schema.node('doc', null, [schema.node('paragraph')])).toThrow();
  });

  it('generates unique conforming beat ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newBeatId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^beat_[a-z2-7]{10}$/);
  });

  it('edit helpers insert and locate text', () => {
    let state = stateOf(docOf(beatNode('B', para('hello world'))));
    const pos = posOfText(state, 'world');
    state = insertText(state, pos, 'brave ');
    expect(state.doc.textContent).toContain('hello brave world');
  });
});
```

- [ ] **Step 2:** run → FAIL (modules missing). **Step 3:** implement schema/ids/builders per interfaces. **Step 4:** run → PASS (4). `npx tsc --noEmit` clean. **Step 5:** commit `feat(script-creator): editor-core schema, ids, and test builders`.

### Task 3: Markdown export (settled documents)

**Files:** Create `src/markdown-codec.ts`; test `test/codec-export.test.ts`.

**Interfaces:** `exportMarkdown(state: EditorState | Node): { ok: true; markdown: string } | { ok: false; blocked: string[] }`. Emission per beat: `## Beat NN — <title>` (NN = 2-digit ordinal), blank line, `### Narration`, blank line, one `> <paragraph text>` blockquote line per paragraph (blank line between), opaqueSection `md` attr emitted verbatim. Settled `variantSet`/`inlineVariantSet` emit only the active option's text. Blocked when: any `settled: false` variant (`variant <id> unsettled`), any pending/ready proposal (`proposal <id> unresolved` — wire in Task 8; until then the codec accepts an injectable `pendingProposals: string[]` second argument defaulting to `[]`). Locks and annotations never affect output.

- [ ] **Step 1: failing tests** (verbatim):

```ts
import { describe, expect, it } from 'vitest';
import { exportMarkdown } from '../src/markdown-codec.js';
import { schema } from '../src/schema.js';
import { beatNode, docOf, para } from './builders.js';

describe('exportMarkdown', () => {
  it('emits beats with narration blockquotes', () => {
    const res = exportMarkdown(docOf(
      beatNode('The wrong perfect score', para('One line.'), para('Two lines.')),
      beatNode('The exploit', para('Three.')),
    ));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.markdown).toContain('## Beat 01 — The wrong perfect score');
    expect(res.markdown).toContain('## Beat 02 — The exploit');
    expect(res.markdown).toContain('> One line.');
    expect(res.markdown.indexOf('> One line.')).toBeGreaterThan(res.markdown.indexOf('### Narration'));
  });

  it('round-trips opaque sections verbatim', () => {
    const opaque = schema.node('opaqueSection', { md: '### Claims\n\n- `F-001` — thing — VERIFIED.' });
    const beat = schema.node('beat', { beatId: 'beat_abcdefghij', title: 'X', timeTargetMs: 1000 },
      [schema.node('paragraph', null, [schema.text('Hi.')]), opaque]);
    const res = exportMarkdown(schema.node('doc', null, [beat]));
    expect(res.ok && res.markdown.includes('- `F-001` — thing — VERIFIED.')).toBe(true);
  });

  it('emits only the active option of a settled variant and blocks unsettled ones', () => {
    const opt = (label: string, text: string) =>
      schema.node('variantOption', { label }, [schema.node('paragraph', null, [schema.text(text)])]);
    const settled = schema.node('variantSet', { variantId: 'v1', activeIndex: 1, settled: true }, [opt('A', 'alpha'), opt('B', 'beta')]);
    const unsettled = schema.node('variantSet', { variantId: 'v2', activeIndex: 0, settled: false }, [opt('A', 'gamma'), opt('B', 'delta')]);
    const mk = (v: typeof settled) => schema.node('doc', null, [schema.node('beat', { beatId: 'beat_abcdefghij', title: 'T', timeTargetMs: 1 }, [v])]);
    const good = exportMarkdown(mk(settled));
    expect(good.ok && good.markdown.includes('> beta') && !good.markdown.includes('alpha')).toBe(true);
    const bad = exportMarkdown(mk(unsettled));
    expect(!bad.ok && bad.blocked.join()).toContain('v2');
  });

  it('blocks when pending proposals are reported', () => {
    const res = exportMarkdown(docOf(beatNode('T', para('x'))), ['p1']);
    expect(!res.ok && res.blocked.join()).toContain('p1');
  });
});
```

- [ ] **Steps 2–5:** RED → implement → GREEN (4) + tsc clean → commit `feat(script-creator): markdown export with settlement blocking`.

### Task 4: Markdown parse and round-trip

**Files:** Modify `src/markdown-codec.ts` (add `parseMarkdown(md: string): Node`); test `test/codec-roundtrip.test.ts`.

**Behavior:** `parseMarkdown` inverts `exportMarkdown` for exportable documents: `## Beat NN — title` headers open beats (fresh `newBeatId()`; title preserved; `timeTargetMs` defaults 30000), `### Narration` introduces blockquote paragraphs, every other block between beats round-trips as an `opaqueSection` with byte-identical `md`. Variants never appear in exported markdown, so parse never produces them.

- [ ] **Step 1: failing tests** (verbatim):

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportMarkdown, parseMarkdown } from '../src/markdown-codec.js';
import { beatNode, docOf, para } from './builders.js';

describe('parseMarkdown round-trip', () => {
  it('is byte-identical on a constructed exportable document', () => {
    const first = exportMarkdown(docOf(
      beatNode('Hook', para('An AI flipped a block.'), para('Reward arrived anyway.')),
      beatNode('Turn', para('What did it optimize?')),
    ));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = exportMarkdown(parseMarkdown(first.markdown));
    expect(second.ok && second.markdown).toBe(first.markdown);
  });

  it('preserves unknown production sections opaquely', () => {
    const md = ['## Beat 01 — T', '', '### Narration', '', '> Line.', '',
      '### Claims', '', '- `F-001` — x — VERIFIED.', ''].join('\n');
    const reEmitted = exportMarkdown(parseMarkdown(md));
    expect(reEmitted.ok && reEmitted.markdown.includes('- `F-001` — x — VERIFIED.')).toBe(true);
  });

  it('smoke-parses the real episode scaffold', () => {
    const md = readFileSync(join(import.meta.dirname, '..', '..', '..', 'whp-youtube', 'episodes', '01-why-ai-cheats.md'), 'utf8');
    const doc = parseMarkdown(md);
    expect(doc.childCount).toBeGreaterThanOrEqual(5); // beats
    const out = exportMarkdown(doc);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.markdown).toContain('Popov and colleagues studied simulated block stacking.');
  });
});
```

- [ ] **Steps 2–5:** RED → implement → GREEN (3) + tsc → commit `feat(script-creator): markdown parse with opaque round-trip`.

### Task 5: RevisionTracker and LockGuard

**Files:** Create `src/revision.ts`, `src/lock-guard.ts`, `src/core.ts` (assemble `corePlugins()` = revision, lock, history; extended by later tasks); update `test/builders.ts` `stateOf` to use `corePlugins()`; test `test/lock-guard.test.ts`.

**Interfaces:** `getRevision(state): number` (increments per doc-changing transaction). `lockRange(state, dispatch, { lockId, from, to }): boolean`, `unlockRange(state, dispatch, lockId): boolean` (the only way to remove a lock mark; uses a transaction meta the guard honors), `getLocks(state): Array<{ lockId, from, to }>` (live mapped ranges, merged per lockId), `lockedText(state, lockId): string`. The guard `filterTransaction`s: any step changing content inside a locked range is rejected; adding/removing the lock mark is allowed only via the lock/unlock commands' meta; history transactions are subject to the same filter.

- [ ] **Step 1: failing tests** (verbatim):

```ts
import { undo } from 'prosemirror-history';
import { describe, expect, it } from 'vitest';
import { getLocks, lockRange, lockedText, unlockRange } from '../src/lock-guard.js';
import { getRevision } from '../src/revision.js';
import { beatNode, docOf, deleteRange, insertText, para, posOfText, stateOf } from './builders.js';

function locked(stateDoc = docOf(beatNode('B', para('alpha beta gamma'), para('delta epsilon')))) {
  let state = stateOf(stateDoc);
  const from = posOfText(state, 'beta');
  const to = posOfText(state, 'delta') + 'delta'.length;
  lockRange(state, (tr) => { state = state.apply(tr); }, { lockId: 'L1', from, to });
  return { state, from, to };
}

describe('LockGuard', () => {
  it('locks a cross-paragraph range and rejects edits inside it', () => {
    let { state } = locked();
    const before = lockedText(state, 'L1');
    const inside = posOfText(state, 'gamma');
    const attempt = insertText(state, inside, 'XX');
    expect(attempt.doc.eq(state.doc)).toBe(true);           // rejected
    expect(lockedText(attempt, 'L1')).toBe(before);
  });

  it('rejects deletions overlapping the lock boundary', () => {
    let { state, from } = locked();
    const attempt = deleteRange(state, from - 2, from + 2);
    expect(attempt.doc.eq(state.doc)).toBe(true);
  });

  it('allows edits before and after, and ranges map through them', () => {
    let { state } = locked();
    const before = lockedText(state, 'L1');
    state = insertText(state, posOfText(state, 'alpha'), 'zero ');
    expect(state.doc.textContent).toContain('zero alpha');
    expect(lockedText(state, 'L1')).toBe(before);
    state = insertText(state, posOfText(state, 'epsilon') + 'epsilon'.length, ' zeta');
    expect(lockedText(state, 'L1')).toBe(before);
    expect(getLocks(state)).toHaveLength(1);
  });

  it('unlock then edit succeeds; plain removeMark does not unlock', () => {
    let { state, from, to } = locked();
    const sneaky = state.apply(state.tr.removeMark(from, to, state.schema.marks.lock!.create({ lockId: 'L1' })));
    expect(lockedText(sneaky, 'L1')).not.toBe('');           // rejected removal
    unlockRange(state, (tr) => { state = state.apply(tr); }, 'L1');
    expect(getLocks(state)).toHaveLength(0);
    const edited = insertText(state, posOfText(state, 'gamma'), 'XX');
    expect(edited.doc.textContent).toContain('XXgamma');
  });

  it('blocks undo that would mutate a later-locked range, and counts revisions', () => {
    let state = stateOf(docOf(beatNode('B', para('one two three'))));
    const r0 = getRevision(state);
    state = insertText(state, posOfText(state, 'two'), 'X');
    expect(getRevision(state)).toBe(r0 + 1);
    const from = posOfText(state, 'Xtwo');
    lockRange(state, (tr) => { state = state.apply(tr); }, { lockId: 'L2', from, to: from + 4 });
    const lockedBefore = lockedText(state, 'L2');
    let after = state;
    undo(after, (tr) => { after = after.apply(tr); });
    expect(lockedText(after, 'L2')).toBe(lockedBefore);      // undo rejected or lock intact
  });
});
```

- [ ] **Steps 2–5:** RED → implement → GREEN (5) + tsc → commit `feat(script-creator): revision tracking and mechanical lock guard`.

### Task 6: AnnotationLayer

**Files:** Create `src/annotations.ts`; extend `src/core.ts`; test `test/annotations.test.ts`.

**Interfaces:** `addAnnotation(state, dispatch, { id, kind: 'reviewFinding' | 'evidenceFlag', from, to, message }): boolean`; `getAnnotations(state): Array<{ id, kind, from, to, message, orphaned }>`. Ranges map through every transaction; a fully deleted range sets `orphaned: true` permanently (never reattaches, position frozen at deletion point).

- [ ] **Step 1: failing tests** — three cases (verbatim):

```ts
import { describe, expect, it } from 'vitest';
import { addAnnotation, getAnnotations } from '../src/annotations.js';
import { beatNode, deleteRange, docOf, insertText, para, posOfText, stateOf } from './builders.js';

function annotated() {
  let state = stateOf(docOf(beatNode('B', para('alpha beta gamma'))));
  const from = posOfText(state, 'beta');
  addAnnotation(state, (tr) => { state = state.apply(tr); },
    { id: 'A1', kind: 'reviewFinding', from, to: from + 4, message: 'flat joke' });
  return state;
}

describe('AnnotationLayer', () => {
  it('anchors and maps through preceding edits', () => {
    let state = annotated();
    state = insertText(state, posOfText(state, 'alpha'), 'zero ');
    const a = getAnnotations(state)[0]!;
    expect(state.doc.textBetween(a.from, a.to)).toBe('beta');
    expect(a.orphaned).toBe(false);
  });

  it('orphans when its range is deleted and never reattaches', () => {
    let state = annotated();
    const a0 = getAnnotations(state)[0]!;
    state = deleteRange(state, a0.from - 1, a0.to + 1);
    expect(getAnnotations(state)[0]!.orphaned).toBe(true);
    state = insertText(state, posOfText(state, 'alpha'), 'beta ');
    expect(getAnnotations(state)[0]!.orphaned).toBe(true);
  });

  it('keeps multiple annotations independent', () => {
    let state = annotated();
    const from = posOfText(state, 'gamma');
    addAnnotation(state, (tr) => { state = state.apply(tr); },
      { id: 'A2', kind: 'evidenceFlag', from, to: from + 5, message: 'verify' });
    state = deleteRange(state, posOfText(state, 'beta'), posOfText(state, 'beta') + 4);
    const [a1, a2] = getAnnotations(state);
    expect(a1!.orphaned).toBe(true);
    expect(a2!.orphaned).toBe(false);
    expect(state.doc.textBetween(a2!.from, a2!.to)).toBe('gamma');
  });
});
```

- [ ] **Steps 2–5:** RED → implement → GREEN (3) + tsc → commit `feat(script-creator): mapped annotations with visible orphaning`.

### Task 7: ProposalLayer — request, track, conflict

**Files:** Create `src/proposals.ts`; extend `src/core.ts`; test `test/proposals-track.test.ts`.

**Interfaces:** `requestProposal(state, dispatch, { id, from, to }): boolean` — freezes `{ baseRevision: getRevision(state), fingerprint: textBetween(from,to) }`, status `pending`. `receiveProposal(state, dispatch, { id, replacement }): boolean` — status becomes `ready` (or stays `conflicted`). `getProposals(state): Array<{ id, from, to, status: 'pending'|'ready'|'conflicted', fingerprint, replacement?, baseRevision, current?: string }>` — `current` is the live text of the mapped range. Tracking: every transaction maps ranges; any transaction that changes text intersecting the mapped range (or deletes it, or a lock now overlaps) flips status to `conflicted` permanently.

- [ ] **Step 1: failing tests** (verbatim):

```ts
import { describe, expect, it } from 'vitest';
import { lockRange } from '../src/lock-guard.js';
import { getProposals, receiveProposal, requestProposal } from '../src/proposals.js';
import { beatNode, deleteRange, docOf, insertText, para, posOfText, stateOf } from './builders.js';

function withProposal() {
  let state = stateOf(docOf(beatNode('B', para('alpha beta gamma delta'))));
  const from = posOfText(state, 'beta');
  requestProposal(state, (tr) => { state = state.apply(tr); }, { id: 'P1', from, to: from + 'beta gamma'.length });
  return state;
}

describe('ProposalLayer tracking', () => {
  it('re-anchors through edits before the target', () => {
    let state = withProposal();
    state = insertText(state, posOfText(state, 'alpha'), 'zero ');
    receiveProposal(state, (tr) => { state = state.apply(tr); }, { id: 'P1', replacement: 'REPL' });
    const p = getProposals(state)[0]!;
    expect(p.status).toBe('ready');
    expect(state.doc.textBetween(p.from, p.to)).toBe('beta gamma');
  });

  it('conflicts on edits inside the target and stays conflicted', () => {
    let state = withProposal();
    state = insertText(state, posOfText(state, 'gamma'), 'XX');
    expect(getProposals(state)[0]!.status).toBe('conflicted');
    receiveProposal(state, (tr) => { state = state.apply(tr); }, { id: 'P1', replacement: 'REPL' });
    const p = getProposals(state)[0]!;
    expect(p.status).toBe('conflicted');
    expect(p.fingerprint).toBe('beta gamma');
    expect(p.current).toContain('XX');
  });

  it('conflicts when the target is deleted', () => {
    let state = withProposal();
    const p0 = getProposals(state)[0]!;
    state = deleteRange(state, p0.from - 1, p0.to + 1);
    expect(getProposals(state)[0]!.status).toBe('conflicted');
  });

  it('conflicts when a lock later covers the target', () => {
    let state = withProposal();
    const p0 = getProposals(state)[0]!;
    lockRange(state, (tr) => { state = state.apply(tr); }, { lockId: 'L1', from: p0.from, to: p0.to });
    expect(getProposals(state)[0]!.status).toBe('conflicted');
  });

  it('edits after the target leave it ready', () => {
    let state = withProposal();
    state = insertText(state, posOfText(state, 'delta') + 5, ' end');
    receiveProposal(state, (tr) => { state = state.apply(tr); }, { id: 'P1', replacement: 'REPL' });
    expect(getProposals(state)[0]!.status).toBe('ready');
  });
});
```

- [ ] **Steps 2–5:** RED → implement → GREEN (5) + tsc → commit `feat(script-creator): proposal tracking with re-anchor and conflict`.

### Task 8: Proposal accept/reject — atomicity and codec wiring

**Files:** Modify `src/proposals.ts` (`acceptProposal(state, dispatch, id): boolean`, `rejectProposal(state, dispatch, id): boolean`, `pendingProposalIds(state): string[]`); modify `src/markdown-codec.ts` (`exportMarkdown(state)` consults `pendingProposalIds` automatically when given an EditorState); test `test/proposals-accept.test.ts`.

**Behavior:** accept requires status `ready` and a fingerprint match at accept time; applies ONE transaction replacing the mapped range with the replacement text; refuses (`returns false`, doc unchanged) for `pending`/`conflicted`/lock-violating applications. Reject removes the proposal without touching the doc. One accepted proposal = exactly one undo step restoring both doc and proposal state. Export with pending/ready proposals is blocked; after accept/reject it unblocks.

- [ ] **Step 1: failing tests** (verbatim):

```ts
import { undo } from 'prosemirror-history';
import { describe, expect, it } from 'vitest';
import { exportMarkdown } from '../src/markdown-codec.js';
import { acceptProposal, getProposals, receiveProposal, rejectProposal, requestProposal } from '../src/proposals.js';
import { beatNode, docOf, insertText, para, posOfText, stateOf } from './builders.js';

function ready() {
  let state = stateOf(docOf(beatNode('B', para('alpha beta gamma delta'))));
  const from = posOfText(state, 'beta');
  requestProposal(state, (tr) => { state = state.apply(tr); }, { id: 'P1', from, to: from + 'beta gamma'.length });
  receiveProposal(state, (tr) => { state = state.apply(tr); }, { id: 'P1', replacement: 'REPLACED TEXT' });
  return state;
}

describe('accept/reject', () => {
  it('blocks export while unresolved, applies atomically, unblocks after', () => {
    let state = ready();
    expect(exportMarkdown(state).ok).toBe(false);
    expect(acceptProposal(state, (tr) => { state = state.apply(tr); }, 'P1')).toBe(true);
    expect(state.doc.textContent).toContain('alpha REPLACED TEXT delta');
    expect(getProposals(state)).toHaveLength(0);
    expect(exportMarkdown(state).ok).toBe(true);
  });

  it('one undo restores the pre-accept document', () => {
    let state = ready();
    const before = state.doc;
    acceptProposal(state, (tr) => { state = state.apply(tr); }, 'P1');
    undo(state, (tr) => { state = state.apply(tr); });
    expect(state.doc.eq(before)).toBe(true);
  });

  it('refuses to accept a conflicted proposal and leaves the doc unchanged', () => {
    let state = ready();
    state = insertText(state, posOfText(state, 'gamma'), 'XX');
    const snapshot = state.doc;
    expect(acceptProposal(state, (tr) => { state = state.apply(tr); }, 'P1')).toBe(false);
    expect(state.doc.eq(snapshot)).toBe(true);
  });

  it('reject clears without touching the doc and unblocks export', () => {
    let state = ready();
    const snapshot = state.doc;
    rejectProposal(state, (tr) => { state = state.apply(tr); }, 'P1');
    expect(state.doc.eq(snapshot)).toBe(true);
    expect(getProposals(state)).toHaveLength(0);
    expect(exportMarkdown(state).ok).toBe(true);
  });
});
```

- [ ] **Steps 2–5:** RED → implement → GREEN (4) + tsc → commit `feat(script-creator): atomic proposal acceptance wired into export`.

### Task 9: Block VariantSet — commands, parking lot, NodeView

**Files:** Create `src/variants.ts`, `src/node-views.ts` (block NodeView); extend `src/core.ts`; test `test/variants-block.test.ts`.

**Interfaces:** `insertBlockVariantSet(state, dispatch, { variantId, at, options: Array<{ label, paragraphs: string[] }> }): boolean` (inserts with `activeIndex: 0, settled: false`); `setActive(state, dispatch, variantId, index): boolean`; `pickActive(state, dispatch, variantId): boolean` — replaces the variantSet node with the active option's paragraphs in ONE transaction and records losing options in the parking lot; `getParkingLot(state): Array<{ variantId, label, text }>`. `variantNodeViews`: NodeView for `variantSet` rendering only the active option's content plus a DOM tab strip (`button.variant-tab` per option, active one `.active`); NodeView for `inlineVariantSet` arrives in Task 10.

- [ ] **Step 1: failing tests** (verbatim; NodeView test uses jsdom `EditorView`):

```ts
import { EditorView } from 'prosemirror-view';
import { undo } from 'prosemirror-history';
import { describe, expect, it } from 'vitest';
import { variantNodeViews } from '../src/node-views.js';
import { getParkingLot, insertBlockVariantSet, pickActive, setActive } from '../src/variants.js';
import { beatNode, docOf, para, stateOf } from './builders.js';

function withVariant() {
  let state = stateOf(docOf(beatNode('B', para('intro'))));
  insertBlockVariantSet(state, (tr) => { state = state.apply(tr); }, {
    variantId: 'V1', at: state.doc.content.size - 1,
    options: [
      { label: 'A', paragraphs: ['alpha take'] },
      { label: 'B', paragraphs: ['beta take', 'beta second'] },
    ],
  });
  return state;
}

describe('block VariantSet', () => {
  it('picks the active option atomically and parks the losers', () => {
    let state = withVariant();
    setActive(state, (tr) => { state = state.apply(tr); }, 'V1', 1);
    const before = state.doc;
    pickActive(state, (tr) => { state = state.apply(tr); }, 'V1');
    expect(state.doc.textContent).toContain('beta take');
    expect(state.doc.textContent).not.toContain('alpha take');
    expect(getParkingLot(state)).toEqual([{ variantId: 'V1', label: 'A', text: 'alpha take' }]);
    undo(state, (tr) => { state = state.apply(tr); });
    expect(state.doc.eq(before)).toBe(true);
  });

  it('renders only the active option with a tab strip', () => {
    const state = withVariant();
    const view = new EditorView(document.createElement('div'), { state, nodeViews: variantNodeViews });
    const tabs = view.dom.querySelectorAll('button.variant-tab');
    expect(tabs).toHaveLength(2);
    expect(view.dom.textContent).toContain('alpha take');
    expect(view.dom.textContent).not.toContain('beta take');
    view.destroy();
  });
});
```

- [ ] **Steps 2–5:** RED → implement → GREEN (2) + tsc → commit `feat(script-creator): block variant sets with parking lot and node view`.

### Task 10: Inline VariantSet and full export settlement

**Files:** Modify `src/variants.ts` (`insertInlineVariantSet(state, dispatch, { variantId, at, options: Array<{ label, text }> })`, `setActive`/`pickActive` handle both kinds — inline pick replaces the atom with plain text of the active option, parks losers); `src/node-views.ts` (inline NodeView: span showing active text + `button.variant-cycle` cycling `activeIndex`); `src/markdown-codec.ts` already blocks unsettled inline sets (Task 3 schema-level check — verify). Test `test/variants-inline.test.ts`.

- [ ] **Step 1: failing tests** (verbatim):

```ts
import { EditorView } from 'prosemirror-view';
import { describe, expect, it } from 'vitest';
import { exportMarkdown } from '../src/markdown-codec.js';
import { variantNodeViews } from '../src/node-views.js';
import { getParkingLot, insertInlineVariantSet, pickActive, setActive } from '../src/variants.js';
import { beatNode, docOf, para, posOfText, stateOf } from './builders.js';

function withInline() {
  let state = stateOf(docOf(beatNode('B', para('the joke goes here'))));
  insertInlineVariantSet(state, (tr) => { state = state.apply(tr); }, {
    variantId: 'IV1', at: posOfText(state, 'here'),
    options: [{ label: 'A', text: 'flatly' }, { label: 'B', text: 'like furniture instructions' }],
  });
  return state;
}

describe('inline VariantSet', () => {
  it('blocks export until settled, picks to plain text, parks the loser', () => {
    let state = withInline();
    expect(exportMarkdown(state).ok).toBe(false);
    setActive(state, (tr) => { state = state.apply(tr); }, 'IV1', 1);
    pickActive(state, (tr) => { state = state.apply(tr); }, 'IV1');
    expect(state.doc.textContent).toContain('like furniture instructions');
    expect(getParkingLot(state)).toContainEqual({ variantId: 'IV1', label: 'A', text: 'flatly' });
    expect(exportMarkdown(state).ok).toBe(true);
  });

  it('renders the active text with a cycle control', () => {
    const state = withInline();
    const view = new EditorView(document.createElement('div'), { state, nodeViews: variantNodeViews });
    expect(view.dom.querySelectorAll('button.variant-cycle')).toHaveLength(1);
    expect(view.dom.textContent).toContain('flatly');
    view.destroy();
  });
});
```

- [ ] **Steps 2–5:** RED → implement → GREEN (2) + tsc → commit `feat(script-creator): inline variant sets complete export settlement`.

### Task 11: Property harness — the five invariants

**Files:** Create `test/property.invariants.test.ts`; create `test/model.ts` (reference model, non-test module).

**Reference model:** plain-JS record of `{ lockedTexts: Map<lockId, string>, proposalStatus: Map<id, status>, everConflicted: Set<id> }`. Operation generators over a seeded base doc (3 beats, 4 paragraphs of known words, one cross-paragraph lock, one proposal request, one unsettled block variant): `insertOutside`, `insertInsideLock` (expected rejected), `insertInsideProposal`, `deleteSpan`, `receiveResult`, `tryAccept`, `reject`, `setActive`, `pick`, `undo`, `redo`, `tryExport`. Each op applies to the EditorState and updates the model; invariant assertions run after every op:

- **I1:** for every lockId, `lockedText(state, id) === model.lockedTexts.get(id)`.
- **I2/I3:** a `tryAccept` succeeds iff the plugin reports `ready` AND the model never saw an intersecting edit; on success the mapped range now equals the replacement; on `everConflicted` ids acceptance always fails and the doc is unchanged by the attempt.
- **I4:** whenever `tryExport` returns ok, the markdown contains no `variant-tab`, no lock/annotation/proposal artifact, and none of the losing-option or non-active texts; while any proposal is unresolved or variant unsettled, export is blocked.
- **I5:** immediately after a successful accept, one `undo` yields a doc equal to the pre-accept snapshot.

Harness: `fc.assert(fc.property(fc.array(opArbitrary, { maxLength: 40 }), (ops) => { … }), { numRuns: 250 })` — deterministic seed recorded in the test (`seed: 20260722`), plus one `numRuns: 25` run with `seed: Date.now()`? No — determinism rule: fixed seeds only; use two fixed seeds.

- [ ] **Step 1:** write the harness and model per the spec above (this task is authored code, not verbatim — the five invariant assertions and op list are normative).
- [ ] **Step 2:** run `npx vitest run test/property.invariants.test.ts` — expect GREEN if Tasks 5–10 are correct; ANY counterexample is a real range-identity bug: shrink it, fix the responsible plugin (test-first with the shrunk case as a named regression), and re-run until 250 runs pass on both seeds.
- [ ] **Step 3:** full suite + tsc. **Step 4:** commit `test(script-creator): property harness proves the five range-identity invariants`.

### Task 12: Demo page

**Files:** Create `demo/index.html`, `demo/main.ts`, `demo/build.mjs` (esbuild bundle to `demo/bundle.js`, gitignored).

**Contents:** mounts an EditorView with `corePlugins()` + `variantNodeViews` on a sample doc (locked passage styled `.locked`, one block + one inline variant, one annotation pin), a bubble-menu-style floating toolbar on selection (plain DOM: buttons Lock / Annotate / Rewrite), and a **fake slow agent**: Rewrite requests a proposal on the selection, resolves after 2500 ms with a canned replacement, rendering the inline diff with Accept / Reject / Re-roll buttons. A status bar shows revision, proposal states, parking lot, and an Export button that alerts blocked reasons or downloads the markdown.

- [ ] **Step 1:** implement per spec. **Step 2:** `npm run demo` → bundle builds. **Step 3 (controller):** real-browser verification — load `demo/index.html`, exercise: type during the 2.5 s pending window before accepting; attempt typing inside the locked passage; cycle and pick both variants; export before and after settlement. **Step 4:** commit `feat(script-creator): editor-core demo page with fake slow agent`.

### Task 13: Evidence and close-out

**Files:** Create `docs/superpowers/evidence/2026-07-22-script-creator-spike2-editor.md`.

- [ ] **Step 1:** record: suite totals and repeated-run results, property-harness run counts/seeds and any shrunk counterexamples found during Task 11 (with the fix), NodeView demo verification outcome (what was exercised in the real browser), findings for Plan 4 (TipTap integration notes, any API friction), and the verdict against the five invariants. Use actual outputs only.
- [ ] **Step 2:** commit `docs(evidence): record spike 2 editor range-identity results`.
- [ ] **Step 3:** final whole-branch review (fresh reviewer) per subagent-driven development; fix loop until PASS/APPROVED.

---

## Plan sequence reminder

Plan 3 (daemon + operation layer: Fastify/SSE, envelopes, operation schemas with the
strict rule from Spike 1, XDG wiring, security nonce, fixture updates for
`error`/`turn.failed`) follows once this spike's evidence is committed; then Plan 4
(Script Studio on Angular + TipTap, consuming this package), Plan 5 (Topic Studio),
Plan 6 (gates/Promote/validator), Plan 7 (learning loop).
