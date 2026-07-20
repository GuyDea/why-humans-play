# WHP YouTube Script Skill — Forward Evaluation

## Environment

- **Date:** 2026-07-20
- **Branch:** `feat/whp-youtube-script-skill`
- **Skill commit for original E1–E5 runs:** `fd098e5380c50da9413dcaed83191cd487e1484b`
- **Refined skill commits for the E5 reruns:** `f367152` (`fix: require ledgers in targeted script artifacts`) and `20061ef` (`fix: reject placeholder asset URLs`)
- **Client/model:** Codex multi-agent runtime, GPT-5 family; the exact deployed model identifier was not exposed.
- **Evaluation isolation:** Each scenario was given to a fresh, fork-none evaluator with only the portable skill path and the natural assignment. Evaluators were not shown expected answers, the rubric, baseline failures, other outputs, or planned fixes. Bulk artifacts remain under `/tmp/whp-script-skill-evals/` and are not committed.
- **Web availability:** Live web retrieval was available but uneven. DOI metadata, PubMed/PMC text, a Frontiers article page, a Duke publication record, and a Wikimedia Commons file page were spot-checked. One institutional PDF endpoint returned HTTP 500, so inaccessible primary wording was not upgraded on the strength of an evaluator's claim.
- **Static status:** The 42-test suite, skill `quick_validate`, worked-asset validation, and `git diff --check` passed after each refinement.
- **End-to-end status:** Codex behavioral runs were completed. Claude Code 2.1.214 was installed at `/home/martin/.local/bin/claude`, and a clean non-interactive E3 startup from the repository root listed `writing-whp-youtube-scripts` in both its `slash_commands` and `skills` discovery metadata. The sandboxed run then failed a startup hook with `EROFS: read-only file system, mkdir '/home/martin/.claude/session-env/<session-id>'` and retried the model API seven times with `error: unknown` before it was stopped with exit 130. An unsandboxed retry was denied because it would send private repository content to an external service without explicit approval. No model response or skill invocation occurred. **Claude Code end-to-end: untested.** Discovery metadata and static tests do not substitute for behavioral evidence. No other client was tested end to end.

Scores use the ten 0–2 dimensions in `references/quality-rubric.md`. A pass requires at least 16/20 and no applicable binary-gate failure. Scores do not confer `EDITORIAL-DRAFT` or `RECORD-READY` status.

## Results matrix

| Scenario | Score | Binary gates | Validator | Result |
|---|---:|---|---|---|
| E1 — Hidden Game | 19/20 | Pass: observable demonstration; bounded slot/phone distinction; important-fact visuals; explanatory motion; owned treatment; four end sections | PASS | PASS |
| E2 — Contested science | 18/20 | Pass: male-rat/species/manipulation scope preserved; human inference rejected; important-fact visuals; asset pages/statuses/fallbacks; explanatory motion; four end sections | PASS | PASS |
| E3 — Existing draft revision | 18/20 | Pass: exact 26 taken → 22 of those 26 playing relationship; `REPORTED` wording; asset page/status/fallback; explanatory motion; four end sections | N/A for the requested audit/two-beat excerpt. An advisory full-document run failed only the nine omitted header fields. | PASS |
| E4 — Unverified account | 17/20 | Pass: `UNVERIFIED-EXAMPLE` is audibly qualified and non-load-bearing; no external visual; owned still; four end sections | FAIL recorded honestly: the assignment supplied no originating blog URL and the evaluator did not invent one | PASS |
| E5 — Unclear rights, original | 11/20 | **Fail:** safe rights decision, but the targeted plan omitted packaging, a concrete WHP lens, and the unified four-section end ledger | N/A as returned; an advisory run failed the absent document structure | FAIL |
| E5 — Rerun 1 | 14/20 | **Fail:** inherited packaging placeholders and no concrete WHP lens; `example.invalid` was substituted for a real asset page | PASS structurally, but the URL-shape pass supplied no provenance | FAIL |
| E5 — Final rerun | 19/20 | Pass: repost is an unnumbered `REFERENCE-ONLY-RIGHTS-UNVERIFIED` lead; no external asset is proposed; owned visual and fallback; explanatory motion; four end sections | PASS, structural only | PASS |
| E6 — Negative trigger | N/A | Pass: exactly three ordinary ad headlines; no WHP apparatus, imitation, or skill-activation claim | N/A | PASS |

E1 lost one point because performed timing remained open. E2 lost both spoken-runtime points because it returned a 00:50/111-word opening rather than the requested 90-second script; this was a substantial assignment miss even though the evidence behavior passed. E3 lost one spoken-runtime point and one evidence-completeness point because performed timing and full-publisher wording/locator confirmation remained pending. E4 lost one spoken-runtime point and both evidence-completeness points because the originating blog URL, author, date, and locator were unavailable. The final E5 rerun lost one visual-treatment point because its production-owned visual has not yet been created.

## Score vectors and retained artifacts

Vectors below are ordered `D1` through `D10` and use the rubric's integer anchors. No dimension is treated as N/A inside a scored E1–E5 artifact: targeted artifacts still receive all ten dimension scores, using the lowest applicable anchor. N/A is reserved for the unscored E6 negative-trigger observation and for validator applicability; neither changes a rubric total. A missing internal document version is recorded as N/A and is not silently replaced. The contaminated E5 rerun 2 was discarded, is not counted, and has no retained scored-artifact row.

| Run | D1–D10 vector | Total | Internal version | Exact retained artifact | SHA-256 |
|---|---|---:|---|---|---|
| E1 | `2,2,2,1,2,2,2,2,2,2` | 19 | 0.1 | `/tmp/whp-script-skill-evals/E1.md` | `781ca7a9c45771d9738e65c2eacc4d95ca9bbd0e7081c2f44842063eaa347fd6` |
| E2 | `2,2,2,0,2,2,2,2,2,2` | 18 | 0.1 | `/tmp/whp-script-skill-evals/E2.md` | `8437b950e6c988f78332f76d26608a060154500c3d65b9b8a5ab3fdb2d0ae52d` |
| E3 | `2,2,2,1,2,2,1,2,2,2` | 18 | N/A | `/tmp/whp-script-skill-evals/E3.md` | `7cfcaa52d4493089236db2b246c137650ea430df19d2ab4c2f84783ba6690c56` |
| E4 | `2,2,2,1,2,2,0,2,2,2` | 17 | 0.1 | `/tmp/whp-script-skill-evals/E4.md` | `f86b9b1c6e18577ee36519975fddb90bf61a990d6ce82917afa4de6931807c12` |
| E5 baseline | `0,2,1,0,2,2,0,1,2,1` | 11 | N/A | `/tmp/whp-script-skill-evals/E5.md` | `46da719203e6e71f6cac1ebd332c366f508fecbd796f14f7d72363c16251f1f4` |
| E5 rerun 1 | `1,2,1,0,2,2,2,1,2,1` | 14 | 0.1 | `/tmp/whp-script-skill-evals/E5-rerun.md` | `324390ae668fc37f6381fe647efb307863e2ebc1707a04638702593271b6eabb` |
| E5 final rerun | `2,2,2,2,1,2,2,2,2,2` | 19 | 0.1 | `/tmp/whp-script-skill-evals/E5-rerun3.md` | `524e547796100c15aea34e084cd4d7df927cab53520948d42dbb93847e34afe8` |

Every sub-2 score has this recorded basis:

| Run | Sub-2 dimension | Rationale |
|---|---|---|
| E1 | D4 = 1 | Word budget was credible, but Martin's performed timed read remained open. |
| E2 | D4 = 0 | The artifact delivered 00:50/111 words instead of the requested 90-second script. |
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

- The manipulation keeps species, sex, and chronology: “For three weeks, these young male rats could see, smell, and hear their cage-mates. But a Plexiglas divider stopped them from touching—and from rough-and-tumble play. Then the wall came down, and the pairs lived together again until adulthood.”
- The measured result stays narrow: “the play-deprived rats had reduced inhibitory input onto layer-five cells in the medial prefrontal cortex. Excitatory input was unchanged.”
- The human boundary is audible: “That is not ‘play made rats smarter.’ And it is definitely not proof that play builds the human prefrontal cortex.” It adds that “the barrier removed physical contact, not play alone.”
- The primary DOI is [Bijlsma et al.](https://doi.org/10.1523/JNEUROSCI.0524-22.2022). PubMed/PMC spot-checks confirmed young male rats, P21–P42 deprivation/resocialization, the Plexiglas contact boundary, adult medial-prefrontal layer-five recordings, reduced inhibitory currents, and unchanged excitatory currents.
- `A-001` uses the concrete [Frontiers article/figure page](https://www.frontiersin.org/articles/10.3389/fnbeh.2022.1076765/full) as a clearly labeled related-study candidate under `CC-BY-4.0`; the live page showed Figure 1 and a CC BY statement. `A-002`, the exact-study figure, is `REFERENCE-ONLY-RIGHTS-UNVERIFIED` because the article carries an SfN exclusive license. The required final treatment is an original schematic.
- Validator: PASS. Runtime remained a major miss: the evaluator reframed the deliverable as a 50-second opening despite the 90-second assignment.

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

No other instruction refinement was made. In particular, E2's duration miss did not expose a documentation gap: `SKILL.md` already requires runtime in the assignment contract and timing spoken delivery against it, while `story-and-hook-method.md` requires an aloud read, honest timing, and revision. Duplicating that rule would not be an evidence-driven fix; the miss remains recorded as model variance.

## Remaining limits

- Model behavior varies. One evaluator ignored an explicit 90-second target and produced 50 seconds; future runs still require human runtime review.
- Links, hosted files, captions, and license statements can change. Access-date spot checks do not freeze later provenance or rights conditions.
- Some primary material was inaccessible during the run. E3 appropriately remains `REPORTED`; a source URL or secondary reproduction is not independent factual verification.
- The validator checks structure, not truth, source quality, identity, copyright, fair use, license compatibility, spoken performance, or editorial quality.
- The failed first E5 rerun demonstrates a structural limit: the validator checks URL shape, not whether the page is the original asset page. A syntactically valid repost, search-result, placeholder, or other non-original URL can pass; instruction and human review must still reject it as provenance.
- An owned fallback is a plan until the production actually creates it and checks fonts, component assets, releases, and ownership.
- Claude Code and all clients other than the Codex runtime used here remain untested end to end. Claude Code 2.1.214 discovered the project skill during Task 8 startup, but the sandbox blocked the model run before any E3 output; static discovery is not behavioral evidence.
