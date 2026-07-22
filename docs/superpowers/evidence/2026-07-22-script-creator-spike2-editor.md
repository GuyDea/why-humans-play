# Script Creator — Spike 2 Editor Range Identity: Evidence

**Date:** 2026-07-22
**Package:** `script-creator/editor-core/` (pure ProseMirror, TypeScript strict ESM)
**Plan:** [2026-07-22-script-creator-spike2-editor.md](../plans/2026-07-22-script-creator-spike2-editor.md)
**Deterministic suite at verdict:** 10 test files / 38 tests green on the host;
`tsc --noEmit` clean throughout Tasks 2–12.

## The five invariants — property-tested

`test/property.invariants.test.ts` drives randomized operation sequences (up to 40 ops
drawn from twelve kinds: inserts and deletions inside/outside lock and proposal zones,
proposal receive/accept/reject, variant setActive/pick, undo, redo, export attempts)
against a plain-JS reference model, asserting after every operation:

- **I1** locked bytes never change (`lockedText` equals the model's record);
- **I2** proposals with no intersecting edits re-anchor and accept exactly at the mapped
  range;
- **I3** any intersecting edit conflicts the proposal permanently — acceptance always
  refuses and the document is unchanged by the attempt;
- **I4** export succeeds only with settled variants and resolved proposals, and clean
  exports contain no lock/annotation/proposal/variant artifacts or losing-option text;
- **I5** a successful accept is one atomic history step — a single undo restores the
  pre-accept document.

Result: **250 runs on each of two fixed seeds (20260722, 20260723), all green**, stable
across repeated host executions. During harness development fast-check shrank one
counterexample (`pick → insertOutside → receiveResult → tryAccept`); it exposed an
over-strong assertion in the harness's own model, not an editor defect — no plugin
change was needed at any point after Tasks 5–10 landed. The suite total includes the
worked unit contracts: lock rejection matrix (including the undo-blocked-by-later-lock
rule and rejected raw `removeMark`), annotation mapping and permanent orphaning,
proposal re-anchor/conflict cases (before/inside/after edits, deletion, late lock),
atomic accept with `closeHistory` isolation, and variant pick/parking-lot round trips.

## Real-browser verification (Chrome via Playwright)

The esbuild demo (`demo/index.html`, fake 2.5 s agent) was exercised live:

1. Typing with the caret inside the locked passage: every keystroke rejected; locked
   spans byte-identical; the typed characters appear nowhere.
2. Rewrite requested on an unlocked phrase, then 29 revisions of concurrent typing
   before the result arrived: the proposal re-anchored and reported `ready`.
3. Accept applied the replacement at the mapped position in one step — typed text
   preserved, original phrase gone, locks untouched.
4. Export while variants were unsettled: blocked with precise reasons
   (`variant demo-inline-variant unsettled`, `variant demo-block-variant unsettled`).
5. Inline cycle + pick and block tab-switch + pick both worked; the parking lot
   captured the losing options.
6. Post-settlement export produced clean narration markdown with zero internal
   artifacts.

## Findings

- **F1 — jsdom is not a renderer proof.** The lock mark had no `toDOM`, so any locked
  document crashed EditorView in a real browser while all jsdom tests passed (none
  rendered a locked range). Fixed with a `toDOM`/`parseDOM` pair plus a jsdom regression
  that mounts a locked document. Same class as the beat/paragraph `toDOM` gap the
  implementer caught in Task 9. **Plan 4 rule: every schema type must have a rendering
  regression the moment it exists.**
- **F2 — the working script format moved mid-spike.** The live Episode 1 source was
  rewritten into the Phase-1 narration format (`## N. Title` + bare blockquotes +
  production appendix) by a parallel editorial session, breaking the plan's pinned
  fixture assertion. The codec became dual-format (auto-detected, stored as
  `doc.attrs.format`, emission-preserving), and the smoke test became
  content-independent. Recorded in `DECISIONS.md` ("Support both Script Creator episode
  formats") — the reconcile flow was correctly self-invoked by the implementer.
- **F3 — cross-paragraph locks merge into an envelope range** (single `lockId` spans
  both text nodes and the boundary between them); edits at the paragraph break inside
  the envelope are rejected. Conservative and correct for V1; splitting per-segment
  lock ranges is a Plan 4 refinement only if beat-editing UX demands it.
- **Minor (deferred to Plan 4):** malformed externally-loaded `options` attrs on inline
  variants are not hardened (relevant once documents load from persistence); inline
  variant options are attr-held plain text, so marks inside inline alternatives are not
  preserved — acceptable for spike scope, revisit with TipTap integration.

## Verdict

**The editor core is confirmed as the Script Studio foundation.** All five range-identity
invariants hold under 500 randomized interleavings and in a real browser end to end:
locks are mechanically inviolable, slow agent results re-anchor or conflict but never
fuzzy-apply, acceptance is atomic and cleanly undoable, and exported Markdown is always
free of internal state. The four plugins are plain ProseMirror and NodeViews are plain
DOM, ready for TipTap 3 + Angular embedding in Plan 4. Proceed to Plan 3 (daemon +
operation layer), carrying F1's rendering-regression rule and the dual-format codec into
Plan 4.
