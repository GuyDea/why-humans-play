# WHP Packaging (Title + Thumbnail) Research Synthesis — 2026-07-30

Synthesis of four parallel research sweeps: (1) title CTR craft, (2) thumbnail visual craft,
(3) packaging process/workflow systems, (4) academic click-through science. Full reports in
[`artifacts/2026-07-30-packaging/`](artifacts/2026-07-30-packaging/). Every claim below is
graded: `[strong]` = RCT / platform-official / primary interview; `[moderate]` =
triangulated practitioner data; `[folklore]` = plausible but unverified.

## Finding 0 — The target metric is NOT raw CTR

- YouTube's ranker optimizes **expected watch time per impression + satisfaction signals**,
  explicitly because pure CTR ranking "promotes deceptive videos" (Covington et al.,
  RecSys 2016; Zhao et al., RecSys 2019). `[strong]`
- YouTube's own Test & Compare A/B tool crowns winners by **watch-time share**, not CTR.
  `[strong]`
- Therefore the skill's objective function is **honest CTR**: maximize clicks whose promise
  the episode pays. This is not a brand compromise for WHP — it is what the platform
  literally optimizes. Veritasium's "legitbait vs clicktrap" distinction is the operating
  model, and his Magnus-effect repackage (flop → 16M+ views, same video) is the existence
  proof that rigorous content + aggressive honest packaging compose. `[strong]`

## Finding 1 — Title levers, ranked by evidence

| Lever | Evidence | Notes |
|---|---|---|
| Curiosity gap is **curvilinear** | `[strong]` SciRep 2024 meta-analysis of 8,977 headline RCTs | Optimal *partial* information: vague loses, fully-resolved loses. Specific-but-incomplete wins. |
| Negativity, but emotion-specific | `[strong]` Nature Human Behaviour 2023, 370M impressions | Sadness ↑ CTR, **fear ↓**, anger null, positive words ↓ (~−1%/word). Directional prior from news, not YouTube constants. |
| Length ≤ ~50–60 chars, hook in first ~40 | `[moderate]` triangulated truncation measurements + 120k-title dataset | Mobile home feed truncates ~40–50 chars; median top-performer ≈ 8 words. |
| Curiosity phrasing transfers across all niches | `[moderate]` 11-niche title study 2026 | "The real reason X", "what nobody tells you" — the only pattern that generalized. |
| Numbers/specificity | `[moderate→folklore]` | Direction consistent (numerals attract fixation), effect sizes unverified. |
| First-person singular ("I/my") | `[strong]` pre-registered Upworthy analysis, β=0.24 | Underused lever for founder-presented WHP. |
| Second-person "you" | **null** `[strong]` same pre-registered analysis | Counter-folklore: "you" per se does not lift clicks. Use when stakes genuinely are the viewer's, not as magic. |
| Question-style bait titles | negative `[moderate]` JBR 2024 | Question titles that smell like bait reduce views; honest paradox questions still fine (calibrate). |
| Clickbait framing | backfires `[strong]` JAMS 2022 | Perceived manipulation → source derogation → sharing β=−0.868. Trust is a ranked signal now. |

## Finding 2 — Thumbnail levers, ranked by evidence

- **Faces capture first fixations; gaze direction steers attention** to the object/text the
  face looks at. `[strong]` (eye-tracking literature). Inverted-U on face *count* — one face
  beats zero and beats many. `[moderate]`
- **Emotion must survive small sizes**: emotion reading degrades sharply below ~36×48 px
  head region → one big readable expression, or no face. `[strong]`
- **Shock-face meta is dying**: MrBeast's own A/B data now favors closed-mouth subtle
  intensity over open-mouth shock. `[strong — primary]` Good news for WHP's register.
- **≤3 visual elements, one focal point** (Galloway's rule). `[moderate — consensus]`
- **Overlay text 0–3 words**, never repeating the title; text is the second-most-fixated
  element. `[strong on fixation; moderate on word count]`
- **Feed-context contrast**: avoid pure-white and near-black grounds (dissolve into
  light/dark UI), avoid YouTube red/blue as dominant fields; grayscale check for value
  hierarchy; ~70%+ watch time is mobile → judge at ~160×90. `[moderate]`
- **Brand consistency**: template *system* (3–5 layouts, shared palette/type) — consistency
  at system level, per-video optimization inside it. Kurzgesagt/Vox-style proves it when
  the style itself is distinctive. `[moderate]`
- **"AI look" is an audience penalty**; composite real photography + real brand marks over
  generated grounds. AI tooling itself is policy-clean (production assistance, no
  disclosure needed). `[moderate; policy strong]`

## Finding 3 — Process, from the best operators

- **Packaging before scripting** (already WHP Law 1) is universal among top operators;
  MrBeast: ~20–50 thumbnail concepts/video, dedicated thumbnail photography at shoot time,
  data-over-taste arbitration. Galloway: top creators spend ~30% of effort on
  ideation+packaging (small creators ~5%). `[strong — primary interviews]`
- **Outlier mining**: patterns, not single videos — track 10–30 niche+adjacent channels,
  cluster ≥3x outliers by title syntax / thumbnail framing, remix the *structure*.
  `[strong on mechanics]`
- **No credible pre-publish CTR predictor exists.** ML scorers are lint at best. What works
  pre-publish: phone-size glance test, grayscale check, dark/light feed mockup **among
  real competitor thumbnails**, small human panels. `[strong — absence well-verified]`
- **Post-publish is where truth arrives**: Test & Compare (3 variants, watch-share winner,
  up to 2 weeks, diverse-not-similar variants, needs Advanced Features); read CTR
  per-surface at 24–48h; repackaging underperformers is the single best-documented ROI
  lever on YouTube. `[strong]`
- **Small-channel calibration**: sub-1K-subs CTR runs deceptively high (6–10%) on warm
  impressions; falling CTR with rising impressions is often growth. Judge only against own
  baseline, per traffic source, jointly with AVD. `[moderate]`

## Finding 4 — What the repo already owns (do not duplicate)

- STEERING.md Law 1: packaging-is-the-product, 15–20 titles, decide before scripting,
  title formulas, ~4.5% educational CTR benchmark.
- writing-whp-youtube-scripts → blueprint `### Packaging`: title scoring via first-sentence
  gate (T1 viewer / T2 unclosable / T3 edge / T4 stakes, 0–2 each, T1–T3 zero kills),
  ≥2 thumbnail routes with phone-size read, Test & Compare trio, honesty check, Martin
  decides.
- choosing-whp-video-topic: three-direction packaging stress test (eligibility, not
  production packaging).
- whp-youtube/thumbnails/: gen_thumbnails.py (Nano Banana Pro, 1280×720 fit, concepts.json
  contract), route taxonomy (face-led / pure-concept / brand-anchor / pattern-reveal),
  v1→v2 lesson: diagram-brain concepts read as generic clickbait; premium/cinematic won.

## Finding 5 — The gaps a new skill should fill

1. **Evidence-graded craft doctrine** — the ranked lever tables above, folklore explicitly
   flagged (matches WHP's `[verified]/[reported]` culture). Nothing in the repo holds this.
2. **Title generation method** — formula lattice + emotion coverage + concreteness
   calibration feeding the existing first-sentence gate (not replacing it).
3. **Thumbnail concept→render→evaluate loop** — brief construction, prompt authoring for
   gen_thumbnails.py, then mechanical evaluation: 160×90 contact sheet, grayscale check,
   dark/light feed mockup among real competitor thumbnails, 3-element/word-count lint,
   brand-system conformance.
4. **Cold-viewer packaging panel** — simulated diverse viewers judging title+thumbnail
   pairs at phone size (stop-scroll? click? expected payoff?), the pre-publish proxy for
   a human panel.
5. **Pairing logic** — title/thumbnail complementarity (show vs tell, no repetition),
   assembling 2–3 *diverse* Test & Compare candidates rather than near-variants.
6. **Post-publish playbook** — per-surface CTR reading windows, swap/test cadence,
   repackaging doctrine for underperformers (the Magnus-effect move).
7. **Packaging ledger** — record what shipped, what tested, what won, so the system learns
   per-episode (the repo's existing pattern: decisions distilled back into doctrine).
