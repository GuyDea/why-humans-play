# Research report 3: Packaging Process/Workflow Systems (2025–2026)

## 1. Packaging-first workflows (strong evidence — multiple primary interviews)

**MrBeast**: title + thumbnail are decided **before filming**. He structures the video to deliver on that promise, and his team dedicates shoot time specifically for thumbnail photography (not frame-grabs) (Social Media Today on YouTube's own interview with MrBeast thumbnail lead Chucky Appleby; async.com breakdown). Candidate volume: ~20 versions per video shown in a photo Colin & Samir shared; his designer has cited **up to 50 thumbnails tested per video**, at roughly **$10k average spend per thumbnail** (win.gg designer interview). Narrowing is data-over-taste: Appleby described losing an "artistic" argument (open vs closed mouth) to A/B data and pivoting immediately. Informal peer polling also occurs — MrBeast texts variant sets to friends. Design heuristic from his team: "One Face, One Object, One Question"; packaging must match the product or retention collapses.

**Paddy Galloway**: top creators spend **~30% of total effort on ideation + packaging vs ~5% for small creators** (who spend 95% on filming/editing). "The idea sets the ceiling, execution determines the result." Packaging-only case studies: reframing "I photographed the Milky Way" into a time-comparison format took a creator from 2–3K to 1M+ views; a thumbnail-only improvement ("30–40% better") produced **40x more views/day** on an existing video (Colin & Samir — New Rules of YouTube; Marketing Examined guide). No public documentation of his exact candidate counts or scoring mechanics (inside paid programs). Evidence: primary interview, strong.

**Common pipeline shape**: idea → package (title candidates + thumbnail sketch) → validate → **only then** script/produce. Repeated maxim: "If you can't package the idea before writing, you don't understand the idea yet."

## 2. Idea/packaging validation via outlier analysis (strong evidence — tool docs)

**Outlier score** = video views ÷ channel's typical (median or rolling-average) views. 1of10 flags videos at 10x–100x; practitioner consensus threshold: **2x is noise, 3x–5x+ is signal**; a small channel jumping 4K→80K is a *cleaner* idea-signal than a big channel's hit (audience can't explain it) (1of10, OutlierKit, OverseerOS).

Documented research workflow: track **10–30 channels** (niche + adjacent), surface 3x+ outliers from the last ~6–12 months, **cluster outliers by pattern** (title syntax, thumbnail framing, format) rather than analyzing single videos, then generate 3–5 *remixed* (not copied) ideas per pattern. Tools: **1of10** (Chrome extension overlays outlier multipliers; free core), **ViewStats** (MrBeast co-founded; Outliers search, AI Thumbnail Search, A/B test database, AI thumbnail generation since June 2025; Pro $49.99/mo), plus OutlierKit/Outlyr/TubeLab as cheaper alternatives.

## 3. Pre-publish CTR prediction (weak-to-moderate evidence — treat predictions skeptically)

**Nothing credibly predicts absolute CTR pre-publish.** What exists:

- **Feed simulators**: TubeBuddy Thumbnail Preview, touhfa previewer, ThumbMagic — render your thumb in home/sidebar/mobile contexts, dark+light mode (claims ~80% of users browse dark mode), some with "shuffle competitors" to place your thumb among real rival thumbnails. Cheap sanity check, no predictive claim.
- **Glance/blur tests**: shrink to 10% size / blur / 3–5-second exposure; if subject + emotion + one message don't survive, redesign. PickFu operationalizes this as a **5-second test** with paid human panels (50–100 respondents, demographic targeting) — the main credible human-panel option; CollabPals does free creator-vs-creator voting.
- **ML scorers** (Thumblytics, CheckMyThumbnail, ThumbScore): score contrast/face/emotion/text-readability 0–100. Academic support thin: a title-only model hit ~**70% accuracy classifying above/below 6% CTR** (George Paskalev, Medium); thumbnail studies are small-N with overfit-smelling results. **No published tool demonstrates calibrated CTR prediction; use scorers only as lint (readability/contrast), use humans for concept choice.**

## 4. Post-publish iteration loops (moderate-strong evidence)

- **Native Test & Compare**: up to **3 thumbnail variants** (title testing global since 2025); winner decided by **watch-time share, not CTR**; runs up to **2 weeks**; manual title/thumb change aborts the test; outcomes = Winner / Performed Same / Inconclusive. YouTube's guidance: test **diverse** concepts (near-identical variants prolong tests) and start on **older videos** to limit downside. Case study: vidIQ (Aug 2025) — winning variant took 59.7% watch-time share. ThumbnailTest.com covers the gap: unlimited title×thumbnail rotation (hourly/daily) with per-variant CTR/AVD, useful when >3 variants or title+thumb combos needed.
- **Manual swap cadence**: read CTR **by surface** (Browse vs Suggested vs Subscriptions) in first 24–48h; swap and compare next 24–48h window. No official universal threshold; typical overall CTR 4–6%, half of channels 2–10%.
- **Revival case studies**: canonical is **Veritasium** — "Strange Applications of the Magnus Effect" retitled "Backspin Basketball Flies Off Dam" + new thumb → 50M+ views. Paddy Galloway has publicly shown a repackage taking a video "on track to fastest ever to 1M." Nick Nimmin documents evergreen-video thumbnail refreshes reviving traffic.

## 5. Small/new channel specifics (moderate evidence — consistent across ~6 sources)

- Under 1K subs, **CTR runs deceptively high (6–10%)** because scarce impressions go mostly to your most-engaged viewers; it drops as YouTube tests broader audiences — falling CTR with rising impressions is often *growth*, not failure.
- Judge CTR **per traffic source**: Browse ~3.5–4.5% healthy, 7%+ exceptional; Suggested typically 5–10%. First 24–48h performance influences whether impressions expand.
- Implication: optimize for **target-viewer fit + retention promise**, not raw clickiness — high-CTR/low-AVD packaging gets throttled since even the native A/B decision metric is watch time. Small channels still gain most per unit effort: at 1,000 impressions, +1% CTR = 10 extra views the algorithm can learn from.
- Test & Compare requires Advanced Features; brand-new channels may need to unlock these first — plan for manual-swap testing early on.

## 6. Team structures, briefs, rubrics (moderate evidence)

**A good thumbnail brief contains** (synthesized from designer-side sources: Superside design-brief guide, Thomas Frank's thumbnail guide, freelancer norms): (1) working title + the *emotion to win* (curiosity/fear/awe), (2) target viewer + where it'll appear (browse vs suggested), (3) the one question the thumb should raise, (4) 3–5 reference thumbnails (outliers from research), (5) assets (photos shot for the thumb), (6) text limit (~3 words), (7) constraints: legible at 10% size, works in dark+light mode, avoid bottom-right (timestamp), title and thumb must **complement, not repeat**, (8) number of concepts requested (2–3 distinct concepts, not variations of one).

**Public checklists/scorecards**: Banana Thumbnail 12-element checklist; Jamie Whiffen's YouTube Packaging Quiz; OverseerOS idea-scoring system (1–5 per dimension); AI raters use weighted 0–100 composites. **No widely-adopted open-source rubric exists — a genuine gap an in-house skill can fill.**

**Pipeline template that emerges from all sources**: outlier research (clustered patterns) → 5–10 title candidates + 2–3 thumbnail concepts *before scripting* → kill ideas that can't be packaged → cheap human vote + glance test to pick top 2–3 → produce with a dedicated thumbnail shoot → launch with best guess → Test & Compare 2–3 variants → 24–48h per-surface CTR review → repackage underperformers (biggest documented ROI lever) and refresh evergreen winners.

Evidence-strength summary: MrBeast/Galloway process details = primary interviews (strong); outlier methodology = tool docs + practitioner consensus (strong on mechanics, moderate on thresholds); pre-publish CTR prediction = weak, no validated predictor; benchmark numbers = SEO-blog sourced (moderate, directionally consistent).
