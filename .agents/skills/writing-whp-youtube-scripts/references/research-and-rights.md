# Research and Rights

## Contents

- [Keep two separate ledgers](#keep-two-separate-ledgers)
- [Run the claim workflow](#run-the-claim-workflow)
- [Apply the confidence-to-wording ladder](#apply-the-confidence-to-wording-ladder)
- [Match source hierarchy to claim type](#match-source-hierarchy-to-claim-type)
- [Search and cross-check](#search-and-cross-check)
- [Run the reverse claim audit](#run-the-reverse-claim-audit)
- [Separate proof from example](#separate-proof-from-example)
- [Treat personal experience as a first-person source](#treat-personal-experience-as-a-first-person-source)
- [Bound the viewer application to the evidence](#bound-the-viewer-application-to-the-evidence)
- [Make a visual decision for every important claim](#make-a-visual-decision-for-every-important-claim)
- [Run the rights workflow](#run-the-rights-workflow)
- [Use rights statuses exactly](#use-rights-statuses-exactly)
- [Record attribution and operational details](#record-attribution-and-operational-details)
- [Sources for this method](#sources-for-this-method)
- [Adversarial claim verification](#adversarial-claim-verification)
- [Gate precedence](#gate-precedence)
- [Contested findings](#contested-findings)

## Keep two separate ledgers

Maintain one claim ledger and one asset ledger. Use the claim ledger to decide what
the narration may say. Use the asset ledger to decide whether and how a visual may
appear in the final cut. Never let evidence for a sentence stand in for permission
to publish a visual, or permission to publish a visual stand in for evidence of a
claim.

Follow the exact record fields in
[Annotated Script Format](annotated-script-format.md#evidence-and-asset-records). Keep
claim and asset IDs stable while revising their wording, sources, treatments, or
rights findings.

## Run the claim workflow

1. Write the smallest exact claim the script needs.
2. Trace search results and reposts to the earliest practical originating source.
3. Record author, publisher, date, context, and a precise locator.
4. Seek an independent corroborating or contradicting source.
5. Compare retellings for changed denominators, species, dates, causality, or scope.
6. Assign one confidence status before drafting narration.
7. Use only the approved wording or a weaker formulation.

Map every factual narration sentence or separable factual clause to at least one `F-###` ID,
and mark it in narration, exactly as
[the annotated script format](annotated-script-format.md#numbered-narration-only-beats)
requires. That file owns the claim-mapping and inline-indicator contract; this method owns
only which evidence earns the mapping.

Record the precise page, table, figure, section, paragraph, or timestamp where
available, and check chronology separately when comparing retellings.

Preserve the population, denominator, comparison, time period, direction of effect,
and uncertainty that make the claim true. Split compound claims when their parts
have different support. Reject a memorable formulation when the evidence supports
only a narrower one.

## Apply the confidence-to-wording ladder

Assign exactly one status to each claim before using it. Make the spoken wording
audibly match that status.

| Status | Evidence threshold | Approved narration stance |
|---|---|---|
| `VERIFIED` | Primary or authoritative source supports the exact wording. | `The experiment found…` |
| `CORROBORATED` | Independent credible sources agree. | `Multiple investigations found…` |
| `REPORTED` | One identifiable plausible source. | `According to a 2019 report…` |
| `UNVERIFIED-EXAMPLE` | Provenance or corroboration remains incomplete. | `There is an unconfirmed account that…` |
| `DISPUTED` | Credible sources conflict. | `Researchers disagree about…` |
| `REJECTED` | Fabricated, contradicted, or materially misleading. | `Omit from narration.` |

Treat “not obviously fake” as a reason to keep checking, never as verification. Do
not upgrade a claim because it is widely repeated, plausible, vivid, or published by
an interested institution.

Use a weaker formulation whenever the source, locator, scope, or cross-check does not
support the stronger one. Present a `DISPUTED` claim as a real disagreement with its
material boundaries, or omit it. Never paraphrase uncertainty out of a source.

## Match source hierarchy to claim type

Match the source to the exact claim it can establish:

- Treat a direct statement as verification only that the named person or
  organization made the statement, not that the underlying event occurred.
- Use an original study for its bounded population, method, comparison, and result;
  do not turn it into an unscoped generalization.
- Require appropriate synthesis, replication, or authoritative consensus for a
  broader scientific claim. Prefer a high-quality systematic review over one primary
  study when the claim concerns the broader state of evidence.
- Keep an originating but independently unconfirmed account `REPORTED`, even when
  its provenance is clear.
- Use `CORROBORATED` when genuinely independent credible sources support the same
  bounded approved wording. That independent support supersedes a merely
  single-source `REPORTED` status for that wording; a repost, common press release,
  or source that depends on the origin does not.

Do not assign status by source prestige alone. Assign it to the smallest approved
wording after checking whether the source type can establish that kind of claim.

## Search and cross-check

Treat Google, image search, social feeds, aggregators, snippets, and reposts as
discovery layers, not final sources. For each material claim:

1. Open the originating page, paper, dataset, record, or statement.
2. Compare publication and event dates; distinguish a later repost from the origin.
3. Search distinctive phrases to locate earlier versions and changed wording.
4. Inspect edits, excerpts, captions, crops, and missing context.
5. Reverse-search an image and seek the earliest upload when identity, date,
   location, or authorship matters.
6. Record the checks performed, negative results, remaining unknowns, and the date of
   access.

Prefer primary studies, datasets, official records, and direct statements. Use
strong secondary reporting for context, interpretation, and genuinely independent
corroboration. Do not manufacture an independent cross-check by counting the
originating institution's press release as separate evidence for its own study.

Look for corrections, retractions, version history, methodological limitations, and
credible criticism. When a secondary source changes a number or conclusion, resolve
the discrepancy against the origin before drafting.

## Run the reverse claim audit

Before finalizing, reverse-audit every narrated material claim against its evidence
record.

Before the word-for-word checks, confirm that every factual narration sentence or separable
factual clause has a matching appendix-beat `F-###` mapping. Treat an unmapped factual
statement as unresolved even when its source exists elsewhere in the document.
Then confirm that each mapped sentence or clause has a visible inline indicator whose label
and target match the evidence record's stable ID and exact `Original URL`.

1. Compare the narration word for word with `Exact claim`, `Scope`, `Caveat`, and
   `Approved wording`. Retain every limiting scope or modal term; if it does not fit,
   weaken the narration rather than strengthening the record.
2. Open the `Original URL` and review its full relevant scope. Open every
   `Cross-checks` source and scan it for material wording that conflicts on origin,
   date, chronology, causality, or scope, even when that source supports a different
   subclaim. Record every discovered material conflict in `Contradictions`, using the
   per-source outcome strings and no-conflict rule owned by
   [the annotated script format](annotated-script-format.md#evidence-records), and explain
   how each conflict changes or bounds the status or wording.
3. For `CORROBORATED`, trace whether the sources have genuinely independent evidence
   chains. If they converge on the same originating investigation, record the
   dependence and re-evaluate the claim under the existing status thresholds: use
   `VERIFIED` only when the primary or authoritative source type can establish the
   exact claim and no unresolved credible conflict remains; use `REPORTED` when one
   identifiable plausible account remains; and retain
   `CORROBORATED` only when another genuinely independent chain supports the exact
   wording. A material credible conflict takes precedence over `VERIFIED`: resolve it
   by narrowing the wording, use `DISPUTED`, or omit the claim; never assign `VERIFIED`
   while that conflict remains.
   If narrated subclaims do not all meet the normal threshold for the same status,
   split the compound claim into separate evidence records. Assign `CORROBORATED` only
   when every narrated subclaim independently meets the `CORROBORATED` threshold.
4. Use stable, source-native locators: page, section, table, figure, timestamp, or a
   descriptive paragraph anchor. Never use browser-rendered or search-result line
   numbers as source locators.

## Separate proof from example

Ask what job a claim performs.

- **Use as proof:** The argument, prevalence estimate, causal inference, or final
  answer depends on the claim being true. Require evidence strong enough for that
  job; never use an anecdote or `UNVERIFIED-EXAMPLE` this way.
- **Use as example:** The material illustrates a possibility already supported by
  other evidence, and removing it would not weaken the argument. Keep an online
  anecdote only as an attributed example with an audible caveat.

Do not let an example quietly become proof through placement, visuals, music, or
confident delivery. If the viewer would reasonably hear “this story shows the pattern
is common” or “this caused the outcome,” the example is carrying an argument and
needs commensurate evidence.

## Treat personal experience as a first-person source

Martin is the first-person source for his own experience. Use only details he supplied
and approved. Confirm names, dates, chronology, quoted speech, and other externally
checkable details when they matter to the story; label reconstructions. Personal
testimony may illustrate a question, possibility, or change in perspective, but it does
not independently prove prevalence, causality, or a scientific mechanism.

Treat personal photos, recordings, screenshots, locations, and objects as separate asset
decisions. Before marking one `OWNED`, check ownership, releases, depicted works, private
information, and every component right needed for the planned edit. Always preserve a
presenter-only or newly created fallback. Do not send private personal material to a
public service without authority to disclose it.

## Bound the viewer application to the evidence

The application cannot be more confident than the claim packet. Animal evidence cannot
by itself support a human prescription. Correlational evidence cannot establish that the
suggested action causes an outcome. A personal anecdote, `REPORTED` account,
`UNVERIFIED-EXAMPLE`, or `DISPUTED` claim cannot carry a general recommendation.

When evidence is weak, indirect, or high-stakes, use an observation-only lens or a
reflection question and voice the limitation. Do not give medical, therapeutic, legal,
or financial direction. A structurally complete application is not proof that it is
wise, safe, lawful, or effective; those judgments remain with qualified human review.

## Make a visual decision for every important claim

Give every important claim a visual decision, but do not assume that decision must be
a third-party image. Choose authentic evidence, original footage, an owned diagram,
a sourced example, a clearly attributed reenactment, on-camera demonstration,
restrained text, or intentionally no added visual.

Create a claim card for the sentence and an asset card for every external visual, using
the exact fields required by
[Annotated Script Format](annotated-script-format.md#evidence-and-asset-records).

Never infer permission from a credit, public availability, a search thumbnail, the
word `free`, the phrase `royalty-free`, or “from Google.” Record the original asset
page separately from the direct file: the page supplies provenance and terms; the
file identifies the exact production copy. Do not substitute one for the other.

Verify that a visual depicts the claimed person, species, place, object, event, or
version. Record uncertainty instead of using a merely similar image as authentic
evidence.

## Run the rights workflow

For every external asset:

1. Identify the exact asset and its original asset page.
2. Identify the creator and current rightsholder; do not assume they are the uploader.
3. Record the rights basis and exact license or permission document.
4. Check whether commercial use, synchronization, distribution, and the planned
   adaptation are permitted.
5. Record required attribution, notices, modification disclosures, and access date.
6. Confirm that the direct production file matches the reviewed asset and license.
7. Assign one allowed rights status.
8. Supply an ownable fallback whenever clearance is uncertain or conditional.

Treat credit and permission as separate facts. Credit does not grant permission.
Treat a paid download as licensed only after reading the applicable terms and
recording the license that covers this use.

Keep unknown-rights material as research or visual reference only. Do not treat it as
final-cut clearance. Replace it with original footage, licensed stock, a diagram
built from supported facts, an attributed reenactment, restrained text, or no added
visual if clearance does not arrive.

Never invent an example, placeholder, or `.invalid` URL to satisfy an asset record or
validator. When a discovery lead has no concrete original asset-page URL, do not
assign it an `A-###` production-asset ID or propose it for use; record it as an
unnumbered blocked lead under `Unverified or disputed material`, and make the ownable
or no-external fallback the beat's actual visual treatment. Repost and search-result
URLs remain discovery metadata only, never the `Original asset page`.

## Use rights statuses exactly

Use only these statuses:

- `OWNED` — Confirm that the production owns the asset and all required rights.
- exact versioned `CC-*` — Record the precise Creative Commons license and version,
  such as `CC-BY-4.0`, and comply with commercial-use and adaptation conditions.
- `CC0` — Record the applicable CC0 dedication and provenance; do not imply that CC0
  resolves trademark, privacy, publicity, or depicted-work rights.
- `PUBLIC-DOMAIN` — Record both the basis and jurisdiction for the conclusion.
- `PERMISSION-ON-FILE` — Retain written permission that covers the planned use,
  territory, duration, media, edits, and commercial publication.
- `COMMERCIAL-LICENSE` — Retain the applicable license and verify that the planned
  use, seat, channel, distribution, and edits fall within it.
- `FAIR-USE-CANDIDATE-NOT-CLEARED` — Send the proposed use and its context for
  authorized editor or counsel review; never describe it as cleared.
- `REFERENCE-ONLY-RIGHTS-UNVERIFIED` — Keep it out of the required final cut and use
  it only to guide research or an ownable replacement.
- `UNKNOWN-BLOCKED` — Treat the asset as blocked until a valid basis is documented or
  a fallback replaces it.

A versioned `CC-*` status records the asset's license; it does not by itself clear the
planned use. Require substantive human review of license compatibility beyond
structural validation. Treat a crop, excerpt, overlay, animation, or similar
modification under an ND license as a mandatory human-review trigger, not as a
categorical determination that Adapted Material has been created. Treat these as
blocking conflicts:

- an NC term conflicts with monetized or other commercial use;
- the planned treatment constitutes or may constitute Adapted Material under the
  applicable ND license, and no permission, non-adapted compliant treatment, or
  usable fallback exists; or
- SA or attribution obligations cannot be met in the planned publication.

When a conflict exists, change the treatment to comply or supply a usable fallback.
Prohibit `RECORD-READY` while the conflict or fallback remains unresolved. Do not ask
the validator to decide license compatibility; its pass remains structural only.
Refer interpretation to an authorized rights reviewer or counsel; this workflow does
not provide legal advice.

Do not let a validator, score, attribution line, or production deadline promote a
fair-use candidate to cleared. Fair use is context-specific legal analysis and
remains an authorized editor or counsel decision.

## Record attribution and operational details

For Creative Commons material, prepare compact TASL attribution: **Title, Author,
Source, License**. Link the source to the original asset page and the license to the
exact license and version. Add an adaptation note that accurately describes crops,
overlays, excerpts, color changes, or other modifications. Keep the full
publication-ready attribution in the script ledger even when on-screen space calls
for a compact credit.

For Wikimedia Commons material, inspect and record the specific file page, its
version and creator information, and any asset-specific conditions. Never cite a
Wikimedia or general web search result as the asset page.

For music, clear the composition, recording, synchronization, and any performance or
platform rights separately when relevant. Do not assume permission for one layer
clears the others.

Verify visual identity before production: species, person, item, location, date, and
authorship must match the intended claim or be labeled as an example or
reenactment. Carry essential qualifications into narration, captions, or descriptive
transcripts so the edit cannot imply more than the research supports.

Do not send private, embargoed, licensed, client-supplied, or project-confidential
material to a public web service without authority to disclose it.

Apply research effort proportionally: investigate hero claims most deeply, then
supporting facts, then incidental facts. Never relax wording honesty, provenance, or
rights honesty for a lower-priority fact.

## Sources for this method

- [FactCheck.org — Our Process](https://www.factcheck.org/our-process/)
- [Creative Commons Wiki — Best practices for attribution](https://wiki.creativecommons.org/wiki/Best_practices_for_attribution)
- [Wikimedia Commons — Reusing content outside Wikimedia](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en)
- [YouTube Help — Fair use on YouTube](https://support.google.com/youtube/answer/9783148?hl=en)
- [U.S. Copyright Office — Fair Use Index](https://www.copyright.gov/fair-use/)

## Adversarial claim verification

Four layers, each placed where its facts become load-bearing. Verification agents are
independent by construction: a fresh-context agent receives only the claims under test
and the source citation or URL — never the project's evidence records, approved
wording, or rationale — and is instructed to refute, classifying every claim
SUPPORTED, OVERSTATED, UNSUPPORTED, or CANNOT-VERIFY with the supporting source
passage quoted. Use the `whp-claim-verifier` brief
(`.claude/agents/whp-claim-verifier.md`) for Layers 1–3; Layer 0 briefs its verifier
differently, as described in its entry below.

- **Layer 0 — before architecture approval, when the episode explains a common human
  behavior.** One fresh-context verifier is briefed as a hostile expert in the
  *phenomenon* the episode explains — not the chosen mechanism — receives only the
  central question, core answer, and earned reframe, and answers one question: is this
  the field's standard account of that behavior, and if not, what is? It must search
  the phenomenon's own literature (meta-analyses, reviews, consensus sources found by
  the behavior's name) and name the dominant account and strongest rivals. It also
  enumerates the everyday observations laypeople commonly volunteer about the
  phenomenon and marks, for each, whether the thesis explains it, must absorb it, or
  leaves it dangling — feeding the architecture's folk-observation inventory. Its verdict
  feeds the architecture's coverage-and-rivals record; an unanswered challenge blocks
  architecture approval. If source access is unavailable, label the coverage record
  `INCOMPLETE—LAYER 0 NOT RUN`; the architecture may circulate as provisional exactly
  like an unscanned concept inventory, but it is not approval-ready until the layer
  runs or Martin explicitly accepts the recorded omission risk. This layer attacks
  the frame where Layers 1–3 attack the
  sentences — it exists because every sentence can verify while the composition
  overclaims.

- **Layer 1 — before story-progression approval.** Every load-bearing row — the
  throughline case, the central statistic, the climax result, anything a beat's
  reversal depends on — passes adversarial verification before the progression is
  approved. A row that fails is narrowed or the structure is not built on it. This
  layer exists because a load-bearing fact discovered wrong at Final collapses the
  episode, not a sentence.
- **Layer 2 — at the draft creative gate.** A mechanical consistency check: every
  number, percentage, year, name, and attribution in narration must match its evidence
  row, and reworded or compressed passages are re-checked against the row's approved
  wording. This catches paraphrase drift where it happens — during compression passes.
- **Layer 3 — at Final, before any audit sign-off.** The full sweep: per-record
  fresh-context agents fetch the original source and classify every mapped narration
  sentence. OVERSTATED and UNSUPPORTED sentences are narrowed or cut; CANNOT-VERIFY
  results are recorded in the issue ledger, never silently passed.

A claim that survives Layer 1 can still die at Layer 3 — the layers are cumulative,
not alternative. No layer's pass is inferred from an earlier layer's.


## Gate precedence

When gates collide, evidence outranks retention and style. Wording mandated by the
evidence apparatus — kill-panel bounds, contested-findings treatments, scope and
population terms, spoken sample-size disclosures, confidence-status hedges — may not
be cut on the strength of a retention, pacing, or style finding. A retention finding
that targets mandated wording converts to *reposition or compress*: move the caveat
after its beat's topper, tighten its words, fold it into a sentence doing other work —
but the bound stays spoken. No evaluator-adoption default overrides this precedence,
and a conflict between a mandated bound and a locked line reopens the lock through
the locked-lines protocol rather than resolving silently in either direction.

## Contested findings

When a load-bearing result carries a failed replication or a live dispute, choose one
of three treatments, never a fourth: make the fight the narration (both sides at their
strongest, takeaways as conditionals, the beat's load landed on undisputed material);
demote the material below load-bearing; or cut it. Never narrate a contested result
behind technically-true scoping — past tense, "in those rooms," "the original study
found" — that a first-time listener will hear as settled. A wording only a lawyer
would defend is a defect, not a defense.

A presenter ruling is the honest fourth path: Martin may judge the dispute on camera
when the judgment is genuinely his, formed from a full-text briefing of both sides.
A ruling rides one premise — it cannot declare a test broken and then use the broken
data's magnitudes as evidence — narrates its checkable basis (the number a viewer
could verify), and carries the disagreement boundary aloud ("some scientists read it
differently").
