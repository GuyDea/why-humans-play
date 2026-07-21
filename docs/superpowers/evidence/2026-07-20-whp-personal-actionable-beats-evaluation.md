# WHP Personal Voice and Viewer Application — Evaluation Evidence

## Environment

- **Evaluation date:** 2026-07-21 (`Europe/Bratislava`).
- **Branch:** `feat/whp-personal-actionable-beats`.
- **Final evaluated skill commit:** `5316f0ef0e1fd9f9aa07d1bbecbfc7f3ea18e6f0`.
- **Canonical package:** `.agents/skills/writing-whp-youtube-scripts`.
- **Claude discovery path:** `.claude/skills/writing-whp-youtube-scripts`, one relative symlink to the canonical package.
- **Behavioral client:** Codex multi-agent runtime; the exact deployed model identifier was not exposed. Every generation and scoring run used a fresh `fork_turns="none"` agent. A generation agent received only the canonical skill, `BRAND.md`, `whp-youtube/STEERING.md`, and its natural assignment—not the expected decision, score gates, prior output, or planned fix.
- **Frozen run directory:** `/tmp/whp-personal-actionable-evaluation/run-20260721/`. Artifact hashes below were recomputed on 2026-07-21. Scorecards were written independently from the generators.
- **Skill states:** Initial E1–E6 used `ec814ff`; E1 rerun 1 and E3 reruns 1–2 used the personal/application refinement at `750a1ea`; E3 rerun 3 used the reverse-audit refinement through `cd9a83c`; E3 rerun 4 used the final source-specific contract at `5316f0e`.
- **Deterministic state at `5316f0e`:** `88/88` standard-library tests passed; `quick_validate.py` returned `Skill is valid!` through both the canonical path and Claude symlink; the worked template returned `PASS: annotated script is structurally valid`; and the symlink resolved to the canonical package. These are package, syntax, and discovery checks—not proof of factual truth, source trustworthiness, rights, or semantic compliance.
- **Runtime rule:** A `RESEARCH-DRAFT` may pass the runtime gate when exact narration count and beat timing imply a credible delivery pace. A Martin-paced human table read remains a quality deduction and a readiness requirement. No artifact here is promoted to `EDITORIAL-DRAFT` or `RECORD-READY`.

## Results matrix

All E1–E5 artifacts, including failed reruns, passed the canonical structural validator. E6 correctly stayed outside the WHP format.

| Scenario / run | Frozen artifact and SHA-256 | Independent behavioral result | Decisive result |
|---|---|---:|---|
| E1 initial — no personal details | `/tmp/whp-personal-actionable-evaluation/run-20260721/E1.md` · `bc0868165ef5bd2806c9dca6fa93b222ce214eafc9d44fd62b859fda300a85ca` | **FAIL 17/20** | Chose `OMIT` merely because no memory was supplied instead of requesting potentially useful authentic input. |
| E1 rerun 1 | `/tmp/whp-personal-actionable-evaluation/run-20260721/E1-rerun1.md` · `346179a95193952bee4611e31f6b5d3c839a27beebaf19cb0bdb32c77cdeb992` | **PASS 19/20** | `INPUT-REQUESTED`, no invented memory, and all five application elements voiced. |
| E2 — supplied experience | `/tmp/whp-personal-actionable-evaluation/run-20260721/E2.md` · `a0d765883c8183bf46ae0d8a68c612ecf33a810bc7c5cee4300d4665bf9cf301` | **PASS 19/20** | Used only Martin's supplied statement, explicitly denied that one evening was evidence, and delivered a bounded fresh-choice application. |
| E3 initial — autobiography adds nothing | `/tmp/whp-personal-actionable-evaluation/run-20260721/E3.md` · `1a1579461e2d011124bfb37b4d6168778b381c1c60b72c94e7bc07775c5983fd` | **FAIL 18/20** | `Observe` existed in notes but was not voiced. |
| E3 rerun 1 | `/tmp/whp-personal-actionable-evaluation/run-20260721/E3-rerun1.md` · `5e54ce188b19ad075adf0bd3a0ba2f6b367852a92f076a8155f0b17c3a1dbc95` | **FAIL 17/20** | Voiced `Observe`, but over-strengthened the relay interpretation and omitted a Guardian origin conflict. |
| E3 rerun 2 | `/tmp/whp-personal-actionable-evaluation/run-20260721/E3-rerun2.md` · `fe9b9a3151dbeb180a098d8b28d9494ef3e50526f569cdaf5841a6cfb061c2d5` | **FAIL 17/20** | Dropped the material word “modern,” omitted the same conflict, and did not establish an independent chain for a `CORROBORATED` attribution. |
| E3 rerun 3 | `/tmp/whp-personal-actionable-evaluation/run-20260721/E3-rerun3.md` · `13de86d88c0cf2b4fd194d1c9d8918fbca6aa3d689c967db873ae46f3bab05f1` | **FAIL 15/20, reconciled** | Compound `CORROBORATED` status and an unlogged Guardian conflict failed Evidence and References. An earlier `PASS 17/20` scorecard is superseded. |
| E3 rerun 4 — final | `/tmp/whp-personal-actionable-evaluation/run-20260721/E3-rerun4.md` · `de1e11b9702dd4343b3acbfc49806af239d16a60ff4c9bfb7e2bbdb95ed1bf34` | **FAIL 17/20** | Personal, application, runtime, visual, rights, animation, and accessibility gates passed; semantic full-source conflict/dependence accounting still failed Evidence and References. |
| E4 — ordinary actionable topic | `/tmp/whp-personal-actionable-evaluation/run-20260721/E4.md` · `8e919cb0ce24508cc1e7f671505e54496111e4f0fb9f92d9637993bbf2dc65f8` | **PASS 18/20** | Concrete 20-minute notification observation with urgent-channel, causal, and outcome boundaries. |
| E5 — sensitive weak evidence | `/tmp/whp-personal-actionable-evaluation/run-20260721/E5.md` · `429e2733f6a002cfd9557d7a0f0d06a3d3605348d07e0b62e30aac0d722a815f` | **PASS 19/20** | Correlation stayed correlation; the ending observed already-chosen play without prescribing a burnout cure. |
| E6 — negative trigger | `/tmp/whp-personal-actionable-evaluation/run-20260721/E6.md` · `cade45225081c260ad80212e786842074756c0d9323570c31e312b46aceb5f3e` | **PASS routing** | Returned exactly three ordinary accounting-app headlines and did not imitate or claim use of the WHP skill. |

The independent E3-rerun3 score trail is preserved. The original scorecard, `/tmp/whp-personal-actionable-evaluation/run-20260721/E3-rerun3-score.md` (`9ccf8436a9c3ee775feb6e9214fdfb60268fad77c0cbc022db3f81c5f9fbf2a5`), said `PASS 17/20` while also identifying gate-level source defects. The reconciled scorecard, `/tmp/whp-personal-actionable-evaluation/run-20260721/E3-rerun3-score-reconciled.md` (`47ca9c0ee4c5561a924325abec0b07d93e34114e6b9ad7f48c3e708efc337def`), consistently applies the zero anchors and supersedes it with `FAIL 15/20`. The final E3-rerun4 scorecard is `/tmp/whp-personal-actionable-evaluation/run-20260721/E3-rerun4-score.md` (`a51bf0504e141238199f2695b2fbabf58cdc6296128ca721ac5c25ada7e9e69f`).

## Per-scenario evidence

### E1 — missing personal material

The initial artifact was structurally valid and useful, but its exact decision was `- **Decision:** OMIT`, followed by “No memory prompt is issued because Martin supplied no relevant memory.” That failed the assignment-specific no-details path: absence of supplied material was treated as sufficient reason to omit.

Rerun 1 changed the decision to `INPUT-REQUESTED`, asked one moment-specific question plus four observable follow-ups, supplied narration-safe bridges, visual hints and a removal condition, retained exactly one non-spoken marker, and invented no memory. Its application naturally voiced the insight, diary action, observable change, study boundary, and larger choice. It passed every hard gate at 19/20.

### E2 — supplied personal experience

The opening reproduces Martin's supplied sentence verbatim and adds no game title, date, outcome, setting, or sensory detail. The next beat states, “One evening isn’t evidence,” before naming the sunk-cost literature. `PI-001` is `COMPLETED`; the personal account supplies stakes, never prevalence, causality, or mechanism. The final narration voices a concrete fresh-choice question, what changed answer to notice, why that cannot diagnose bias, and how the distinction supports more deliberate future play. Result: PASS 19/20.

### E3 — autobiography correctly omitted; evidence audit unresolved

Every E3 sample made the correct personal decision. The final artifact uses one story-specific `PI-001: OMIT`, explicitly because Martin has never played Sudoku and has no connection; it contains no unresolved marker and invents no first-person fact. Its one application is fully voiced: “trace publication, redesign, and distribution,” “Notice who changed what,” the precursor/inventor boundary, and the historical-credit benefit.

E3-rerun4 also passes the non-semantic production gates. The validator passes; 142 spoken words across exactly 60 seconds imply a credible 142 wpm; every material beat has a production-built timeline, grid, or newspaper treatment and explanatory motion; essential relationships are narrated or described; and no external asset is selected, so evidence URLs are not mistaken for publishing permission. Martin's table read and final ownership/accessibility checks remain open readiness work.

Rerun 3 also retained a 58.6-second synthetic timing aid at `/tmp/whp-personal-actionable-evaluation/run-20260721/E3-rerun3-table-read.wav` (`6fc788c4a852a9eb99968282018e3f619c6bc3128632f3f95be7eec09e06df94`). It supports plausibility only; it is not Martin's human table read and does not close readiness.

The final result is nevertheless FAIL 17/20 because semantic evidence review is not complete:

- `F-006` combines an independently supported November 2004 Times launch with a newspaper-count subclaim whose reports appear to share Gould/Pappocom as their chain, yet the compound record remains `CORROBORATED` and narration is unqualified.
- The Oxford chapter is marked `COMPLETE` after only its accessible abstract was scanned, even though the full chapter was unavailable.
- `COMPLETE` outcomes omit material source-wide conflicts in the Observer, the 10 May Guardian article, and the Stamford reprint, including Japanese-origin/creation and competing origin/chronology language.
- `F-005` adds “Retired New Zealand judge” outside its exact claim; the sources more precisely describe a New Zealander and former Hong Kong judge.

Those are Evidence and References hard-gate failures. Structural validation cannot detect them.

### E4 — ordinary low-risk application

The script uses one story-specific `OMIT` and no invented personal episode. It turns notification timing into a Hidden Game, then voices a 20-minute trial: pause nonessential alerts, preserve urgent contacts, schedule one check, and tally urges. It says one round cannot identify a cause, diagnose a problem, or guarantee focus. Original graphics and presenter footage avoid external-asset dependence. Result: PASS 18/20; the remaining deductions are a human timing pass and a clearer visual separation between the two-week study and the 20-minute application.

### E5 — sensitive, correlational evidence

The script says at the outset, “Human evidence does not show” that play cures burnout, preserves the small correlational result and construct mismatch, and makes no therapeutic prescription. Its application begins only “the next time you already choose to play,” asks the viewer to observe energy/distance and the return to work, and states that observation cannot prove treatment or changed workplace conditions. The story-specific `OMIT` keeps autobiography from displacing the causal audit. Result: PASS 19/20; a Martin-paced read and production checks remain open.

### E6 — negative routing

The unrelated request produced three plausible accounting-product headlines only. It contained no WHP narration, annotation schema, personal/application block, ledger, or WHP voice. The trigger remained appropriately narrow.

## Baseline comparison

The RED report recovered historical artifacts because five fresh B1/B2 attempts stalled without producing files and B3 never started. These are therefore behavioral before/after comparisons, not matched reruns of the fresh E1–E6 assignments. The retained baselines are `/tmp/whp-script-skill-evals/E1.md` (`781ca7a9c45771d9738e65c2eacc4d95ca9bbd0e7081c2f44842063eaa347fd6`), `/tmp/whp-script-skill-evals/E2-rerun2.md` (`4b45805e154ca55f4ffed0859ae81011d052878621efb72c99cbac13ea43bb8d`), and `/tmp/whp-script-skill-evals/E4.md` (`f86b9b1c6e18577ee36519975fddb90bf61a990d6ce82917afa4de6931807c12`). E4 was a targeted artifact and already handled weak material conservatively; the actual full-script failures were in E1 and E2-rerun2.

| Actual baseline failure | Shortest exact before evidence | Exact after evidence | Change demonstrated |
|---|---|---|---|
| No explicit personal-input decision or scaffold in retained full scripts | This is a whole-document absence in baseline E1 and E2-rerun2: neither contains `### Personal input`, a `PI-###` ID, or a `Decision`. An absent block has no excerpt to quote. | E1 rerun: `- **Decision:** INPUT-REQUESTED`; E2: `- **Decision:** COMPLETED`; E3: `- **Decision:** OMIT`. | Every fresh full script makes one honest, story-specific choice; the three valid paths are all exercised without invented memory. |
| Baseline E1 application was concrete but incomplete | “keep urgent alerts; batch the rest; choose when you check.” | “Try the diary.” / “Notice whether play gets easier to spot.” / “This cannot explain your history or manufacture leisure.” / “It can help you see one hidden rule, then decide whether to keep playing by it.” | The new script voices try, observable signal, boundary, and larger benefit rather than leaving the observation loop implicit. |
| Baseline E2-rerun2 declared a useful change but voiced no concrete application | “Rats reveal a mechanism worth testing. Humans still need human evidence.” | “Ask: if this run appeared right now, would I spend the next twenty minutes on it?” / “Notice whether hiding the past changes your answer.” / “That shift cannot prove a bias; it only shows whether previous time is pulling on the choice.” / “The move you still control is what the next twenty minutes are worth.” | The new E2 turns a bounded insight into one specific reflection, signal, limitation, and future-facing benefit. |

## Refinements

Two failures in the initial forward set produced the first behavioral refinement:

- **Missing-input default:** E1 changed from `- **Decision:** OMIT` to `- **Decision:** INPUT-REQUESTED`, with the specific prompt “Can you remember one specific adult moment when you wanted to do something purely for fun but stopped, hid it, or gave it a useful reason?”
- **Narrated observation:** E3 initially kept “Notice whether the same person, place, or institution actually controls all three parts of the story” only in its structured `Observe` field. Rerun 1 voiced the repaired signal: “notice when its rules, name, or reach changed.”

| Commits | Observed cause | Minimal contract change and result |
|---|---|---|
| `22144f6` → `750a1ea` | E1 defaulted to `OMIT` when no memory was supplied; E3 hid `Observe` in notes. | Test first, then require `INPUT-REQUESTED` when a truthful memory could plausibly do story work and require all five application elements in narration. E1 rerun 1 and E3 rerun 1 closed those exact failures. |
| `3e8f30e` → `0e15fce` → `967157f` → `2803921` → `0a539d4` → `15bd6ef` → `fb42e6d` → `cd9a83c` | E3 reruns 1–2 strengthened modal/scope wording, missed the Guardian origin conflict, used a rendered-line locator, and obscured dependent evidence chains. Review then found ambiguity around conflict recording, `VERIFIED` precedence, and incomplete scans. | Add reverse narration-to-card comparison, full cross-check scans, mandatory conflict recording, source-native locators, independence checks, status re-evaluation, credible-conflict precedence, and an honest incomplete-scan path; mirror the gate in the rubric. E3 rerun 3 still exposed semantic noncompliance rather than a missing rule. |
| `a926936` → `6cb22bd` → `309a6e6` → `5316f0e` | E3 rerun 3 could say full reports “agree” while omitting a conflict and mixing differently supported subclaims. | Require a named outcome for the `Original URL` and every cross-check, exact `COMPLETE`/`INCOMPLETE` syntax with coverage, findings, and consequence, plus separate records when compound subclaims do not share one status. Tests and the worked template model the executable format. E3 rerun 4 used the syntax but falsely marked some semantic scans complete, leaving an honest unresolved failure. |

The final deterministic suite has 15 package-contract tests and 73 validator tests. These lock wording and structural behavior; they do not prove that a generated source summary is truthful or that a claimed source-wide scan actually happened.

## Remaining limits

- **E3 is not GREEN.** The final sample passes structure, authentic `OMIT`, fully voiced application, credible draft runtime, visuals, rights planning, animation, and accessibility, but fails semantic Evidence and References review.
- No further source-specific prose tuning was made. The rules are now explicit, source-by-source, regression-tested, portable, and demonstrated in the worked template. The remaining failure is that a generator can still falsely label a semantic scan `COMPLETE` or overlook evidence-chain dependence. Human evidence review is therefore mandatory.
- The deterministic validator intentionally cannot establish factual truth, source trustworthiness, source independence, full-source coverage, copyright ownership, fair use, safety, or editorial quality. A static pass must never be reported as semantic approval.
- Codex was exercised end to end. Claude discovery was checked only through the relative symlink and static package validation; Claude and other LLM clients were not run end to end.
- Exact count and beat timing can establish a credible `RESEARCH-DRAFT` runtime. Martin's natural table read, pronunciation, breathing, and performed holds remain required before later readiness.
- All positive artifacts remain `RESEARCH-DRAFT`. Human story/fact approval, final media ownership and releases, captions, contrast, descriptive transcript, and rendered-cut checks remain open.
- The historical baseline is recovered, not a matched execution of B1–B3, and the behavioral set is a small sample from one client family. Fresh sampling may reveal further loopholes.
- Bulk artifacts and scorecards remain under `/tmp`; their exact paths and hashes are recorded here, but the files themselves are not committed to the repository.
