# Packaging Craft Doctrine

Evidence-graded levers for WHP packaging. Grades: `[strong]` = randomized trials,
platform-official sources, or primary operator interviews; `[moderate]` = triangulated
practitioner data; `[folklore]` = plausible but unverified — never load-bearing.
Full research: `docs/research/2026-07-30-packaging-ctr-research.md` (repo root).

## The objective function

- YouTube ranks on **expected watch-time per impression plus satisfaction signals**,
  explicitly because pure-CTR ranking promotes deception (Covington et al. RecSys 2016;
  Zhao et al. RecSys 2019). Native Test & Compare crowns **watch-share** winners.
  `[strong]`
- Therefore optimize honest CTR: the click and the delivered episode are one promise.
  Veritasium's legitbait/clicktrap line is the operating model; his Magnus-effect
  repackage (flop → 16M+ views, unchanged video) proves rigor and aggressive honest
  packaging compose. `[strong]`
- Clickbait framing triggers perceived manipulation and suppresses sharing and channel
  trust; satisfaction now feeds ranking, so trust compounds. `[strong]`

## Title-half levers

| Lever | Grade | Rule |
|---|---|---|
| Curiosity gap is curvilinear | `[strong]` | Specific but incomplete. A title that fully answers itself kills the click; a vague one never earns it. Calibrate: if the draft reads vague, add one concrete noun; if it reads resolved, remove the answer, keep the tension. |
| Emotion is specific, not blanket | `[strong]` | Sadness/loss framing lifts clicks; **fear framing hurts**; anger is null; positive words mildly hurt. Prefer stakes and loss over threat and alarm. |
| Truncation physics | `[moderate]` | ≤ ~60 characters; decisive words in the first ~40; mobile feeds truncate the tail. |
| First-person narrator | `[strong]` | "I/my" framing outperforms in the largest pre-registered headline data; natural fit for a founder-presented channel when the stake is honest. |
| Second-person "you" | `[strong — null]` | No lift per se. Use "you" only when the stake genuinely is the viewer's; never as a magic word. |
| Curiosity phrasing transfers | `[moderate]` | "The real reason X", "what nobody tells you" — the only pattern that generalized across all niches in cross-niche data. Adapt, don't stamp. |
| Numbers/specificity | `[moderate]` | Numerals attract fixation; direction consistent, effect sizes unverified. |
| Question-bait titles | `[moderate — negative]` | Question titles that smell like bait reduce views. An honest paradox question must survive the honesty gate and read as inquiry, not tease. |

## Thumbnail-half levers

| Lever | Grade | Rule |
|---|---|---|
| Faces capture first fixations; gaze steers | `[strong]` | One face max; point its gaze at the key object or text. |
| Emotion dies small | `[strong]` | Below ~36×48 px head size expressions blur. One big readable expression, or no face. |
| Shock-face meta is dying | `[strong — primary]` | Closed-mouth subtle intensity now beats open-mouth shock in MrBeast's own A/B data. WHP's register (genuine skeptical-curious) is currently the winning register. |
| ≤3 elements, one focal point | `[moderate]` | More elements split attention and lower clicks. |
| Overlay text 0–3 words | `[moderate]` | Never repeats the title; text is the second-most-fixated element. |
| Feed-context contrast | `[moderate]` | Avoid pure-white and near-black grounds (dissolve into light/dark UI) and YouTube red/blue as dominant fields. Check grayscale hierarchy. Charcoal grounds need a bright rim or off-white mass to separate in dark mode. |
| Judge at 160×90 | `[strong]` | ~70%+ of watch time is mobile. Nothing critical in the bottom-right (timestamp). |
| Brand system | `[moderate]` | Consistency at the system level (palette, type, 3–5 layouts), optimization per video. Distinctive style is the value; generic consistency buys nothing. |
| Real texture beats AI gloss | `[moderate]` | The "AI look" is an audience penalty. Composite real photography and the real WHP mark over generated grounds. AI tooling itself is policy-clean. |

## Pair levers

- **Complementarity** `[strong consensus]`: thumbnail shows, title tells; each half
  carries weight the other cannot; together they open exactly one question. Write the
  pair as one two-part sentence.
- **Familiar yet unexpected** `[moderate]`: sit inside the niche's packaging
  conventions, add one twist that opens the gap.

## Folklore — never load-bearing

"Faces add +35% CTR" (untraceable); "always maximize the curiosity gap" (curvilinear);
"'you' lifts clicks" (null); "negativity always wins" (fear hurts); "arrows/circles
boost CTR" (unverified, off-register for WHP); "red/yellow are the best colors"
(category-dependent at best); any pre-publish CTR predictor (none is credible — treat
ML scorers as lint, humans and live tests as truth).
