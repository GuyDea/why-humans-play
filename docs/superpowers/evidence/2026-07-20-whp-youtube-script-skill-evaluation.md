# WHP YouTube Script Skill — Forward Evaluation

## Environment

- **Date:** 2026-07-20
- **Branch:** `feat/whp-youtube-script-skill`
- **Skill commit for original E1–E5 runs:** `fd098e5380c50da9413dcaed83191cd487e1484b`
- **Refined skill commits for the E5 reruns:** `f367152` (`fix: require ledgers in targeted script artifacts`) and `20061ef` (`fix: reject placeholder asset URLs`)
- **Client/model:** Codex multi-agent runtime, GPT-5 family; the exact deployed model identifier was not exposed.
- **Evaluation isolation:** Each scenario was given to a fresh, fork-none evaluator with only the portable skill path and the natural assignment. Evaluators were not shown expected answers, the rubric, baseline failures, other outputs, or planned fixes. Bulk artifacts remain under `/tmp/whp-script-skill-evals/` and are not committed.
- **Web availability:** Live web retrieval was available but uneven. DOI metadata, PubMed/PMC text, a Frontiers article page, a Duke publication record, and a Wikimedia Commons file page were spot-checked. One institutional PDF endpoint returned HTTP 500, so inaccessible primary wording was not upgraded on the strength of an evaluator's claim.
- **Current static status:** The 48-test suite, skill `quick_validate`, worked-asset validation, and `git diff --check` passed in final verification. The historical refinement checks below accurately record the then-current 42-test suite.
- **End-to-end status:** Codex behavioral runs were completed. `command -v claude` returned `/home/martin/.local/bin/claude`, and `claude --version` returned `2.1.214 (Claude Code)`. A sandboxed non-interactive E3 run did not complete, and no retained model response or skill-invocation evidence supports a behavioral result. **Claude Code end-to-end: untested.** Static package and symlink compatibility tests remain separate from end-to-end behavior. No other client was tested end to end.

Scores use the ten 0–2 dimensions in `references/quality-rubric.md`. A pass requires at least 16/20, no applicable binary-gate failure, and adherence to the assignment's requested deliverable type, scope, runtime, and required content. A high rubric total cannot rescue an assignment/deliverable miss or another hard-gate failure. Scores do not confer `EDITORIAL-DRAFT` or `RECORD-READY` status.

## Results matrix

| Scenario | Score | Binary gates | Validator | Result |
|---|---:|---|---|---|
| E1 — Hidden Game | 19/20 | Pass: observable demonstration; bounded slot/phone distinction; important-fact visuals; explanatory motion; owned treatment; four end sections | PASS | PASS |
| E2 — Contested science, original | 18/20 | **Fail — assignment/deliverable adherence:** the requested 90-second script was replaced by a 00:50/111-word opening. The evidence, visual, rights, and species-boundary gates otherwise passed. | PASS, structural only | FAIL |
| E2 — Model-output rerun 1 | 18/20 | **Fail — denominator/source meaning:** the F-002 scope attached the paper-wide `N=96` to an Experiment 1 morphology result that used 18 female focal subjects. Runtime and other applicable gates passed. | PASS, structural only; it did not detect the denominator error | FAIL |
| E2 — Final model-output rerun | 17/20 | Pass: full 213-word/plausible-90-second deliverable; rat/human boundary; important-fact visuals; asset statuses/fallbacks; explanatory motion; four end sections. No narrated denominator or ratio was changed, and remaining scope and origin defects are documented as `RESEARCH-DRAFT` limits. | PASS, structural only | PASS |
| E3 — Existing draft revision | 18/20 | Pass: exact 26 taken → 22 of those 26 playing relationship; `REPORTED` wording; asset page/status/fallback; explanatory motion; four end sections | N/A for the requested audit/two-beat excerpt. An advisory full-document run failed only the nine omitted header fields. | PASS |
| E4 — Unverified account | 17/20 | Pass: `UNVERIFIED-EXAMPLE` is audibly qualified and non-load-bearing; no external visual; owned still; four end sections | FAIL recorded honestly: the assignment supplied no originating blog URL and the evaluator did not invent one | PASS |
| E5 — Unclear rights, original | 11/20 | **Fail:** safe rights decision, but the targeted plan omitted packaging, a concrete WHP lens, and the unified four-section end ledger | N/A as returned; an advisory run failed the absent document structure | FAIL |
| E5 — Rerun 1 | 14/20 | **Fail:** inherited packaging placeholders and no concrete WHP lens; `example.invalid` was substituted for a real asset page | PASS structurally, but the URL-shape pass supplied no provenance | FAIL |
| E5 — Final rerun | 19/20 | Pass: repost is an unnumbered `REFERENCE-ONLY-RIGHTS-UNVERIFIED` lead; no external asset is proposed; owned visual and fallback; explanatory motion; four end sections | PASS, structural only | PASS |
| E6 — Negative trigger | N/A | Pass: exactly three ordinary ad headlines; no WHP apparatus, imitation, or skill-activation claim | N/A | PASS |

E1 lost one point because performed timing remained open. The original E2 lost both spoken-runtime points and failed the assignment/deliverable gate because it returned a 00:50/111-word opening instead of the requested 90-second script. E2 model-output rerun 1 reached a plausible 90-second length but failed the denominator/source-meaning gate. The final E2 model-output rerun delivered exactly 213 narration words, a plausible 90-second budget, and passed every hard gate; its 17/20 score preserves factual-wording, runtime, and evidence-ledger shortcomings described below. E3 lost one spoken-runtime point and one evidence-completeness point because performed timing and full-publisher wording/locator confirmation remained pending. E4 lost one spoken-runtime point and both evidence-completeness points because the originating blog URL, author, date, and locator were unavailable. The final E5 rerun lost one visual-treatment point because its production-owned visual has not yet been created.

## Score vectors and retained artifacts

Vectors below are ordered `D1` through `D10` and use the rubric's integer anchors. No dimension is treated as N/A inside a scored E1–E5 artifact: targeted artifacts still receive all ten dimension scores, using the lowest applicable anchor. N/A is reserved for the unscored E6 negative-trigger observation and for validator applicability; neither changes a rubric total. A missing internal document version is recorded as N/A and is not silently replaced. The contaminated E5 rerun 2 was discarded, is not counted, and has no retained scored-artifact row.

| Run | D1–D10 vector | Total | Internal version | Exact retained artifact | SHA-256 |
|---|---|---:|---|---|---|
| E1 | `2,2,2,1,2,2,2,2,2,2` | 19 | 0.1 | `/tmp/whp-script-skill-evals/E1.md` | `781ca7a9c45771d9738e65c2eacc4d95ca9bbd0e7081c2f44842063eaa347fd6` |
| E2 original | `2,2,2,0,2,2,2,2,2,2` | 18 | 0.1 | `/tmp/whp-script-skill-evals/E2.md` | `8437b950e6c988f78332f76d26608a060154500c3d65b9b8a5ab3fdb2d0ae52d` |
| E2 model-output rerun 1 | `2,2,2,1,2,2,1,2,2,2` | 18 | 0.1 | `/tmp/whp-script-skill-evals/E2-rerun.md` | `a3d09d02f8ea77e87e6aa4b4bd1f5ad20746e97b996c41bfebc1c9f85b4313a1` |
| E2 final model-output rerun | `2,1,2,1,2,2,1,2,2,2` | 17 | 0.1 | `/tmp/whp-script-skill-evals/E2-rerun2.md` | `4b45805e154ca55f4ffed0859ae81011d052878621efb72c99cbac13ea43bb8d` |
| E3 | `2,2,2,1,2,2,1,2,2,2` | 18 | N/A | `/tmp/whp-script-skill-evals/E3.md` | `7cfcaa52d4493089236db2b246c137650ea430df19d2ab4c2f84783ba6690c56` |
| E4 | `2,2,2,1,2,2,0,2,2,2` | 17 | 0.1 | `/tmp/whp-script-skill-evals/E4.md` | `f86b9b1c6e18577ee36519975fddb90bf61a990d6ce82917afa4de6931807c12` |
| E5 baseline | `0,2,1,0,2,2,0,1,2,1` | 11 | N/A | `/tmp/whp-script-skill-evals/E5.md` | `46da719203e6e71f6cac1ebd332c366f508fecbd796f14f7d72363c16251f1f4` |
| E5 rerun 1 | `1,2,1,0,2,2,2,1,2,1` | 14 | 0.1 | `/tmp/whp-script-skill-evals/E5-rerun.md` | `324390ae668fc37f6381fe647efb307863e2ebc1707a04638702593271b6eabb` |
| E5 final rerun | `2,2,2,2,1,2,2,2,2,2` | 19 | 0.1 | `/tmp/whp-script-skill-evals/E5-rerun3.md` | `524e547796100c15aea34e084cd4d7df927cab53520948d42dbb93847e34afe8` |

Every sub-2 score has this recorded basis:

| Run | Sub-2 dimension | Rationale |
|---|---|---|
| E1 | D4 = 1 | Word budget was credible, but Martin's performed timed read remained open. |
| E2 original | D4 = 0 | The artifact delivered 00:50/111 words instead of the requested 90-second script and therefore also failed the assignment/deliverable hard gate. |
| E2 model-output rerun 1 | D4 = 1 | Its 199 narration words form a credible paper budget for 90 seconds, but no performed table read was recorded. |
| E2 model-output rerun 1 | D7 = 1 | F-002's scope attached the paper-wide `N=96` to the Experiment 1 morphology result, whose endpoint analysis used 18 female focal subjects. That denominator/source-meaning defect also failed a hard gate despite the 18/20 total and structural validator pass. |
| E2 final model-output rerun | D2 = 1 | `F-005` is `REPORTED`, but “the brain circuitry rats use” is narrated as fact rather than audibly attributed; “largest reduction” omits “relative to controls”; narration broadens male Lister Hooded physiology and female Long-Evans morphology to “rats” without audibly preserving strain and sex; and “play experience is part of how these circuits are refined” is firmer than the all-physical-contact manipulation warrants. |
| E2 final model-output rerun | D4 = 1 | Exactly 213 narration words make a credible approximately 90-second budget, but no performed table read was recorded and Beat 04 packs 64 words into 25 seconds. |
| E2 final model-output rerun | D7 = 1 | The records are traceable, but applicable animal/cell denominators are absent, and F-001 calls a 2022 Frontiers reprint the `Original URL` even though its figure was reprinted from Pellis and Pellis (1987). |
| E3 | D4 = 1 | No performed aloud timing was recorded for the revised excerpt. |
| E3 | D7 = 1 | The DOI and article pages were recorded, but full-publisher wording and a more exact primary locator remained pending. |
| E4 | D4 = 1 | The 63-word insert had a calculated budget but no performed timed read. |
| E4 | D7 = 0 | The material claim has no original URL, identified author, date, or locator. Honest `UNVERIFIED-EXAMPLE` status does not satisfy the rubric's original-source requirement. |
| E5 baseline | D1 = 0 | Packaging is absent: there is no concrete title, thumbnail, opening, or payoff contract to align. |
| E5 baseline | D3 = 1 | The rights plan is usable, but it is not a complete story beat with a resolved narrative change. |
| E5 baseline | D4 = 0 | It contains no spoken narration or timed delivery. |
| E5 baseline | D7 = 0 | The evidence ledger and unified four-section reference structure are missing. |
| E5 baseline | D8 = 1 | The fallback is safe, but the original page, photographer/rightsholder, and license remain unresolved. |
| E5 baseline | D10 = 1 | It gives a generic rights-safe treatment without a concrete WHP, play, or hidden-game viewer lens. |
| E5 rerun 1 | D1 = 1 | Title, thumbnail, mode, and related packaging are inherited-parent placeholders rather than a concrete aligned contract. |
| E5 rerun 1 | D3 = 1 | It supplies no actual narration or resolved story sequence for the visual insert. |
| E5 rerun 1 | D4 = 0 | It intentionally supplies zero new narration and therefore no spoken-performance evidence. |
| E5 rerun 1 | D8 = 1 | Rights treatment and fallback are candid, but `example.invalid` is not a concrete original asset page. |
| E5 rerun 1 | D10 = 1 | It remains a generic rights plan without a concrete WHP, play, or hidden-game viewer lens. |
| E5 final rerun | D5 = 1 | The visual treatment and fallback are concrete, but the planned owned production asset does not yet exist. |

## Per-scenario evidence

### E1 — Hidden Game

- The opening is an owned observable demonstration: “Put your phone face-down. Now check it once. Message? Like? Nothing?” It invents no historical scene.
- The comparison is bounded in narration: “Your phone is different. Updates arrive with time and other people, not because you checked.” The output rejects the stronger claim that phones use the same schedule as slot machines.
- The intervention remains scoped to “a two-week field experiment with 237 Android users,” adds that one study is not a universal cure, and reports increased notification FoMO rather than hiding it.
- Important facts use owned split diagrams, loop graphics, and schedule graphics. Every motion note states the relationship it clarifies. No third-party production asset is proposed.
- The primary records are [Madden et al.](https://doi.org/10.1007/s10899-006-9041-5), [Oulasvirta et al.](https://doi.org/10.1007/s00779-011-0412-2), and [Fitz et al.](https://doi.org/10.1016/j.chb.2019.07.016). DOI metadata confirmed the cited titles and page ranges; the [Duke record](https://scholars.duke.edu/publication/1402953) confirmed the 237-participant randomized batching study and its bounded outcome framing. These checks do not independently establish every number in the script.
- The saved artifact passed the structural validator. It stays `RESEARCH-DRAFT` and explicitly leaves Martin's performed timing and post-capture ownership/release review open.

### E2 — Contested science

- **Original — 18/20, FAIL:** The manipulation kept species, sex, and chronology; the measured result stayed narrow; and the human boundary was audible. The primary [Bijlsma et al. DOI](https://doi.org/10.1523/JNEUROSCI.0524-22.2022), visual decisions, asset statuses, fallbacks, and four end sections were present. The structural validator passed. Nevertheless, the evaluator replaced the requested 90-second script with a 00:50/111-word opening, so assignment/deliverable adherence failed. Artifact: `/tmp/whp-script-skill-evals/E2.md`, version 0.1, SHA-256 `8437b950e6c988f78332f76d26608a060154500c3d65b9b8a5ab3fdb2d0ae52d`.
- **Model-output rerun 1 — 18/20, FAIL:** The rerun produced a complete 01:30/199-word script, maintained the rat-to-human boundary, and passed the structural validator. Its F-002 scope nevertheless said “Ninety-six female Long-Evans rats” for the narrated Experiment 1 medial-prefrontal morphology result. `N=96` was the paper-wide allocation; that endpoint result used 18 female focal subjects. Attaching the paper-wide denominator to the narrower result changed source meaning, so the denominator hard gate failed. Artifact: `/tmp/whp-script-skill-evals/E2-rerun.md`, version 0.1, SHA-256 `a3d09d02f8ea77e87e6aa4b4bd1f5ad20746e97b996c41bfebc1c9f85b4313a1`.
- **Final model-output rerun — 17/20, PASS:** The final rerun contains exactly 213 narration words and a plausible 01:30 budget, separates rat findings from a human hypothesis, assigns useful visual and motion decisions, records candid rights statuses and fallbacks, includes all four end sections, and passes the structural validator. No narrated denominator or ratio is changed; species and sex remain identifiable in the records; and uncertainty is documented. Artifact: `/tmp/whp-script-skill-evals/E2-rerun2.md`, version 0.1, SHA-256 `4b45805e154ca55f4ffed0859ae81011d052878621efb72c99cbac13ea43bb8d`.
- The artifact's embedded 19/20 self-score is the generating model's assessment and is superseded by the independent 17/20 evaluation recorded here.
- The final pass remains `RESEARCH-DRAFT`. D2 remains 1 because `REPORTED` F-005 is voiced without audible attribution, “largest reduction” omits “relative to controls,” strain/sex scope is generalized in narration, and one cross-study synthesis is firmer than the divider manipulation warrants. D4 remains 1 because there is no performed table read and Beat 04 is dense at 64 words/25 seconds. D7 remains 1 because applicable animal/cell denominators are absent and F-001 labels the 2022 Frontiers reprint as the original URL despite its Pellis and Pellis (1987) source. Authorized editorial approval, owned-graphic production, presenter timing, and any human-positive claim remain open.

### E3 — Existing draft revision

The revision removes “22 baby seals died,” “last season,” “other pups fled,” and “same reason the seal died,” then uses this exact opening:

> In 1991, zoologist Robert Harcourt reported a brutal pattern among South American fur-seal pups. Twenty-six pups were taken by sea lions. Twenty-two of those 26 had been playing immediately beforehand. That does not prove play caused every capture. But it makes the cost impossible to dismiss. So what could play possibly give back?

The first science beat repeats the relationship without compression:

> Here is what Harcourt reported. Across 2,523 hours of observation in 1988, sea lions attacked pups on 102 occasions. Twenty-six pups were taken; 22 of those 26 had been playing in shallow tidal pools immediately beforehand. Harcourt's interpretation was that play left them less vigilant.

It immediately calls the study a field observation, not an experiment, and says it cannot prove an individual cause or a universal risk.

- **Evidence URL:** `https://doi.org/10.1016/S0003-3472(05)80055-7`
- **Locator:** “Article pp. 509–511; relationship reproduced in the accessible abstract/record”
- **Evidence status:** `REPORTED`; full-publisher-PDF wording and locator remain pending
- **Visual asset page:** `https://commons.wikimedia.org/wiki/File:Arctocephalus_australis_1.JPG`
- **Direct file:** `https://upload.wikimedia.org/wikipedia/commons/3/36/Arctocephalus_australis_1.JPG`
- **Rights status:** `PUBLIC-DOMAIN`, recorded from LadyofHats's worldwide PD-self dedication; representative-image labeling and an owned 26-marker fallback remain required
- **Animation-purpose note:** “Make the nested relationship—22 of the 26 taken pups—immediately understandable and prevent ‘22 total deaths’ from becoming the remembered claim.”

Crossref metadata confirmed the Harcourt title, DOI, and pp. 509–511. The live Commons page displayed the species label, LadyofHats attribution, `PD-self` category, and worldwide public-domain dedication. This spot-check is not a legal clearance opinion.

The artifact was an audit plus two-beat excerpt rather than a full episode document. It contains the four end sections; the advisory full-document validator run reports the absent header fields rather than silently treating the excerpt as a complete validated script.

### E4 — Unverified account

- **Exact spoken qualification:** “We found a dramatic claim: that one town restored recess and violence fell by 70 percent. But its only source was a personal blog, and we could not find a school record or an independent report confirming the number, what counted as violence, or that recess caused any change. So we are not using that number as evidence. This episode works without it.”
- **Status:** `UNVERIFIED-EXAMPLE`.
- **Load-bearing test:** Removing it changes no conclusion. The editorial ruling defaults to omission, and the story-function note says the beat “supplies no premise, causal inference, or payoff.”
- The visual is an owned static claim-audit card. The output explicitly avoids generic school footage, a blog screenshot, and any identifiable town. It chooses no animation because a still makes the evidentiary mismatch clearer.
- Validator: FAIL, recorded. `F-001` cannot supply the required web URL because the assignment did not identify the blog. The result correctly remains a provenance blocker rather than being hidden behind a fabricated source.

### E5 — Unclear rights

The original run made the safe editorial decision but failed the required end-ledger structure. It recorded:

- **Status:** `REFERENCE-ONLY-RIGHTS-UNVERIFIED`.
- **Exact fallback:** “The presenter shot and the from-scratch WHP graphic are the fallback, not a temporary placeholder.”
- **Publication boundary:** no crop, trace, animation, public cut, thumbnail, teaser, or Short use of the repost.

The first fresh rerun after the format clarification fixed the four end sections and excluded the repost from the cut, but failed the asset-page gate by writing `https://example.invalid/original-not-located` in a numbered asset record. Calling it a reserved placeholder did not make it an original page. That output was scored 14/20 and failed its hard gate.

The final fresh rerun after the placeholder-URL correction records:

- **Status:** the photograph is an unnumbered blocked lead under `Unverified or disputed material`, with status `REFERENCE-ONLY-RIGHTS-UNVERIFIED`.
- **Exact fallback:** “If the tabletop footage is not captured, use only the production-owned rectangles-and-arrows diagram. The narration and diagram together preserve every essential relationship.”
- **Required treatment:** owned overhead footage and a WHP-built `PLAYER MAKES ADD-ON → GAME GAINS VALUE` diagram; no third-party production asset is referenced.
- **Animation purpose:** “Make the causal/economic relationship legible—creative activity starts with the player, adds value to the game, and sits inside both play and labor—without implying that an unverified historical photograph proves the claim.”
- **Publication boundary:** the repost stays an unnumbered private research lead. A numbered asset record is prohibited until a concrete original page, exact file, creator/rightsholder, context, terms, and human review exist.
- **Four end sections:** present under `## References and source materials`.
- **Validator:** PASS, structural only.
- **Evidence spot-check:** the live [Kücklich primary article](https://five.fibreculturejournal.org/fcj-025-precarious-playbour-modders-and-the-digital-games-industry/) contains the cited numbered paragraphs, “source of value,” “rarely remunerated,” and “playbour” framing. This verifies the locator and bounded attribution, not any photograph.

### E6 — Negative trigger

The evaluator returned only ordinary ad copy:

1. Close Your Books Faster—Without the Headaches
2. Automate Accounting and Focus on Growing Your Business
3. Real-Time Financial Clarity, All in One Place

There is no WHP framing, script header, evidence apparatus, production direction, or claim that the optional skill was activated.

## Baseline comparison

| Baseline failure | E3 after behavior | Exact proof |
|---|---|---|
| Statistic changed meaning | Corrected | “Twenty-six pups were taken by sea lions. Twenty-two of those 26 had been playing immediately beforehand.” |
| Evidence link lacked a precise locator | Corrected with an honest remaining limit | URL `https://doi.org/10.1016/S0003-3472(05)80055-7`; locator “Article pp. 509–511; relationship reproduced in the accessible abstract/record”; status `REPORTED` pending full-PDF check |
| Visual concept lacked an asset page | Corrected | `https://commons.wikimedia.org/wiki/File:Arctocephalus_australis_1.JPG` |
| “Licensed” substituted for a rights basis | Corrected | Status `PUBLIC-DOMAIN`; basis recorded as LadyofHats's worldwide PD-self dedication; representative-only label and owned fallback retained |
| Animation was decorative | Corrected | “Make the nested relationship—22 of the 26 taken pups—immediately understandable and prevent ‘22 total deaths’ from becoming the remembered claim.” |

All five baseline behaviors are corrected in E3. The word `REPORTED` and the pending full-PDF check are important: this comparison demonstrates status-matched behavior, not independent proof that every asserted detail is factually true.

## Refinements

### E5 targeted-plan end ledgers

- **Observed failure:** The original E5 artifact used `## Visual and archival source record`, `## Uncertainty and production decision register`, and `## Attribution copy`, but had no unified `## References and source materials` heading and no `### Evidence references` section. The full-document validator therefore reported the missing document/end structure.
- **Violated rule:** Targeted visual work did not carry all four required end-reference sections, failing the explicit evaluation gate even though its rights decision was safe.
- **Smallest change:** Added one clarification to `references/annotated-script-format.md`: targeted beats, inserts, audits, and revision excerpts still use the four-section end structure, with explicit none-needed statements where a section has no records.
- **Commit:** `f367152 fix: require ledgers in targeted script artifacts`
- **Deterministic result after change:** 42/42 unit tests passed; `quick_validate` passed; the worked annotated asset passed; `git diff --check` passed.
- **Fresh rerun 1:** E5 improved from 11/20 to 14/20 and the validator passed, but the output still failed the real-asset-page gate by inserting a labeled `example.invalid` placeholder.

### E5 placeholder asset URL

- **Observed failure:** The first rerun wrote `https://example.invalid/original-not-located` as `A-001`'s original asset page while admitting that it was only a reserved placeholder.
- **Violated rule:** A URL-shaped placeholder is not provenance. The external-asset gate requires a real page, or the linkless item must remain an unavailable, non-production lead with an ownable fallback.
- **Smallest change:** Added one rights instruction to `references/research-and-rights.md`: never invent example, placeholder, or `.invalid` URLs; keep a no-page discovery lead unnumbered under `Unverified or disputed material`, and make the ownable/no-external fallback the actual beat treatment.
- **Commit:** `20061ef fix: reject placeholder asset URLs`
- **Deterministic result after change:** 42/42 unit tests passed; `quick_validate` passed; the worked annotated asset passed; `git diff --check` passed. The validator contract did not change.
- **Fresh rerun 2:** One run was discarded because a follow-up accidentally named the expected placeholder behavior. A separate clean fork-none rerun with only the natural assignment scored 19/20, passed every binary gate, and passed the structural validator.

### E2 model-output reruns — no instruction change

- **Original observed failure:** The 18/20 original output failed assignment/deliverable adherence by replacing the requested 90-second script with a 00:50/111-word opening.
- **Model-output rerun 1:** A fresh run produced a complete 01:30/199-word artifact but failed the denominator/source-meaning gate by attaching the paper-wide `N=96` to an Experiment 1 morphology result based on 18 female focal subjects. The structural validator passed because it does not evaluate factual truth or denominator meaning.
- **Final model-output rerun:** A separate fresh output produced exactly 213 narration words, a plausible 90-second deliverable, passed the structural validator, and passed every hard gate at 17/20. The D2, D4, and D7 deficiencies remain recorded rather than promoted away; it is a `RESEARCH-DRAFT` pending human editorial review, performed timing, ledger correction, and production work.
- **Instruction decision:** These were model-output reruns, not instruction refinements. `SKILL.md` already requires runtime in the assignment contract and spoken timing against it. `research-and-rights.md` and `quality-rubric.md` already require exact denominators, source meaning, scope, and locators. Adding duplicate instructions would not be an evidence-driven fix.

No other instruction refinement was made. The only skill-instruction refinements in this evaluation remain the two E5 changes documented above.

## Remaining limits

- Model behavior varies. The original E2 evaluator ignored an explicit 90-second target and produced 50 seconds; model-output reruns corrected duration but exposed a separate denominator defect before the final pass. Future runs still require assignment-adherence and human runtime review.
- Links, hosted files, captions, and license statements can change. Access-date spot checks do not freeze later provenance or rights conditions.
- Some primary material was inaccessible during the run. E3 appropriately remains `REPORTED`; a source URL or secondary reproduction is not independent factual verification.
- The validator checks structure, not truth, source quality, identity, copyright, fair use, license compatibility, spoken performance, or editorial quality.
- The failed first E5 rerun demonstrates a structural limit: the validator checks URL shape, not whether the page is the original asset page. A syntactically valid repost, search-result, placeholder, or other non-original URL can pass; instruction and human review must still reject it as provenance.
- An owned fallback is a plan until the production actually creates it and checks fonts, component assets, releases, and ownership.
- Claude Code and all clients other than the Codex runtime used here remain untested end to end. Static schema, package, and symlink compatibility evidence does not establish model behavior or skill invocation.
