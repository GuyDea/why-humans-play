# WHP Script-First Appendix Format Implementation Plan

> **Execution note:** Implement this plan in the existing isolated
> `feat/episode-1-finalization` worktree, then fast-forward `main` after verification.

**Goal:** Protect complete narration from premature timing cuts and make every final WHP
script readable as numbered narration-only beats followed by a production appendix.

**Architecture:** The writing skill owns the script-first workflow and routes production
work only after creative review. The Markdown format stores narration and production data
in separate layers connected by matching beat numbers and titles. The validator enforces
that separation without judging or rewriting prose.

**Implementation:** Markdown skill resources and template; Python standard-library
validator and unit tests.

---

### Task 1: Lock the workflow with a failing skill-package test

**Files:**
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_skill_package.py`

1. Add assertions that complete narration is shown before editorial, retention, or timing
   audits.
2. Assert that timing is a post-draft diagnostic and audit concerns do not silently rewrite
   or remove context.
3. Run the focused test and confirm it fails against the old skill wording.

### Task 2: Lock the document format with failing validator tests

**Files:**
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`

1. Add a valid fixture with numbered narration-only beats and a final appendix.
2. Add invalid cases for metadata inside a narration beat, missing appendix beat mappings,
   and mismatched beat titles or numbers.
3. Run the focused tests and confirm they fail against the old parser.

### Task 3: Update the skill and format contract

**Files:**
- Modify: `.agents/skills/writing-whp-youtube-scripts/SKILL.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/rapid-prototyping.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/references/annotated-script-format.md`
- Modify: `.agents/skills/writing-whp-youtube-scripts/assets/annotated-script-template.md`

1. Make full-script review precede all editorial, retention, and timing audits.
2. Define audits as separate concern reports that cannot silently replace the narration.
3. Define numbered narration beats and the beat-matched appendix schema.
4. Update the reusable template to demonstrate the new structure.

### Task 4: Update structural validation

**Files:**
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/validate_annotated_script.py`
- Modify: `.agents/skills/writing-whp-youtube-scripts/scripts/test_validate_annotated_script.py`

1. Parse numbered beat headings before `## Appendix`.
2. Allow only blockquoted spoken narration in each beat body.
3. Parse required metadata and production sections from appendix beat entries.
4. Verify one-to-one beat number and title matching.
5. Preserve existing claim-reference, evidence, rights, personal-input, viewer-application,
   audit, and status checks within their new appendix locations.
6. Run all validator and skill-package tests to green.

### Task 5: Rewrite Episode 1 without running a creative audit

**Files:**
- Modify: `whp-youtube/episodes/01-why-ai-cheats.md`

1. Restore the precise opening question and the complete DeepMind block-flip premise.
2. Keep the reward surprise, earned joke, defined goal gap, viewer relevance,
   consequential question, and literal by-end promise.
3. Finish the complete narration across numbered beats before considering runtime.
4. Move the existing evidence, production, and editorial material into the final appendix;
   keep the status honest where review remains pending.
5. Do not run an editorial or timing audit on the narration before showing Martin.

### Task 6: Structural verification and integration

1. Run Markdown/package tests and the structural validator. Structural validation may
   confirm schema only; it must not rewrite or score the narration.
2. Inspect the diff for accidental changes and confirm the isolated worktree is clean after
   committing.
3. Fast-forward `main` to the verified feature commit without touching the concurrent
   shared checkout.
4. Present the complete numbered narration to Martin first. Defer editorial and timing
   concerns until after his review.
