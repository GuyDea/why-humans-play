# Research report 4: Click-Through Science for Recommendation Feeds (2025–2026)

## 1. Strong evidence — large-N randomized field experiments (headlines)

**The Upworthy Research Archive** is the single best evidence base. Every A/B test Upworthy ran Jan 2013–Apr 2015: 32,487 experiments, 150,817 arms, ~538M participant assignments; users saw only headline+image packages, so click effects are cleanly isolated from article content. Matias et al., *Scientific Data* 2021 (nature.com/articles/s41597-021-00934-7). Dataset is public — the one place an engineer can study packaging causally at scale.

**Negativity drives clicks.** Robertson et al., "Negativity drives online news consumption," *Nature Human Behaviour* 7:812–822 (2023): 22,743 RCTs, ~105k headline variants, 370M impressions, 5.7M clicks. Each additional negative word raised CTR ~2.3%; positive words reduced clicks. Crucial nuance: **sadness words increased CTR, fear words decreased it, anger was null** — "negativity works" is emotion-specific, not blanket.

**Curiosity gap is curvilinear, not monotonic.** Aubin Le Quéré et al., "When curiosity gaps backfire: effects of headline concreteness on information selection decisions," *Scientific Reports* 2024 (nature.com/articles/s41598-024-81575-9): meta-analysis of 8,977 headline experiments with a validated concreteness scale. If baseline headlines are vague, more concreteness raises CTR; if already concrete, more concreteness lowers it. An *optimal information amount* — directly operationalizable, consistent with Loewenstein's information-gap theory (*Psychological Bulletin* 116(1):75–98, 1994).

**Registered-report linguistic effects** (pre-registered, Upworthy data, PLOS ONE 2023): negative-emotion words β=0.18; first-person singular pronouns β=0.24; third-person singular β=0.22; longer headlines β=0.07; indefinite articles ("a/an") β=0.12; first-person *plural* β=−0.15. Null: positive-emotion words, readability, **second-person "you" (!)** — direct counter-evidence to a top-5 piece of creator folklore.

**Clickbait backfires on sharing.** "Did clickbait crack the code on virality?", *Journal of the Academy of Marketing Science* 2022: experiment (n=150, 36 headlines) + field study (19,386 articles, propensity-matched). Clickbait triggered perceived manipulative intent → source derogation → sharing intent β=−0.868; field: ~48 fewer shares, ~119 fewer likes per article. High emotionality helped; clickbait *framing* hurt.

## 2. Recommender-system reality: CTR is not the objective

**Covington, Adams & Sargin, "Deep Neural Networks for YouTube Recommendations," RecSys 2016**: the ranking model predicts **expected watch time per impression** via watch-time-weighted logistic regression, explicitly because "ranking by click-through rate often promotes deceptive videos that the user does not complete ('clickbait')." Canonical citation for CTR×retention as the true optimization target.

**Zhao et al., "Recommending what video to watch next: a multitask ranking system," RecSys 2019**: production YouTube ranker is multi-objective — *engagement* (clicks, watch time) plus *satisfaction* (likes, survey responses), with a shallow-tower correction for position/selection bias. Implication: packaging that wins clicks but loses satisfaction signals is fighting the ranker.

**YouTube's native Test & Compare picks winners by watch-time share, not CTR** — platform-level confirmation. YouTube's official FAQ: half of all channels/videos see impressions-CTR between 2% and 10%, and CTR mechanically falls as impressions broaden, so CTR comparisons across videos/time are confounded by traffic mix.

**Position bias is large and grid-specific**: examination probability varies by slot; classic sequential click models don't transfer to grid UIs (Cross-Positional Attention, WWW 2021; probabilistic position-bias model for feeds, RecSys 2023, arxiv.org/abs/2307.14059). Any in-house CTR comparison must control for surface and position.

## 3. Thumbnail-specific studies (weaker: observational, mostly views not true CTR)

- Koh & Cui, *Decision Support Systems* 2022: 3,745 branded YouTube videos; colorfulness/brightness relate to view-through with category-dependent effects; face count shows an **inverted-U** (a moderate number of faces beats zero or many).
- "Thumbnail power: Visual cues and video popularity on UGV platforms," *JAMS* 2026 (springer 10.1007/s11747-026-01152-6) — newest marketing-science treatment of thumbnail cues → popularity.
- "Clicks for money: predicting video views through sentiment analysis of titles and thumbnails," *Journal of Business Research* 2024: strong sentiment (either valence) in *thumbnails* and positive sentiment in *titles* → more views; question-style bait titles → fewer views.
- Clickbait detection literature defines measurable bait features — forward reference/unresolved pronouns, listicles, superlatives, caps/punctuation (Webis Clickbait Corpus 2017, 38,517 graded posts). Multimodal YouTube clickbait dataset: **YTClickbait21K**, 21,238 videos, 40 channels, 29 countries, κ=0.65 (arXiv 2606.14780, 2026).

Caveat: none of these observe true impressions-CTR (private to creators); views conflate packaging with distribution. Grade all of Section 3 below the Upworthy RCTs.

## 4. Attention science usable for thumbnails

- **Faces capture early fixations** in natural scenes; adding a face channel to saliency models improves fixation prediction (Cerf, Frady & Koch, *Journal of Vision* 2009; ETRA 2020). **Text is the second-most-fixated element** — relevant to thumbnail text.
- **Small faces are read differently**: face size biases emotion judgment; smaller faces → more dispersed fixations, lower specificity (*Scientific Reports* 2018). Machine-recognition analog: emotion/face recognition degrades below ~36×48 px head regions — grounds the "one big readable emotion at mobile size" heuristic in data.
- **Saliency models are usable as pre-tests**: DeepGaze II/IIE lead the MIT/Tübingen benchmark and demonstrably learn face/text/meaning features (*Scientific Reports* 2021). DeepGaze IIE (Linardos et al., ICCV 2021) has a public PyTorch implementation (github.com/matthias-k/DeepGaze) — can score where attention lands in a thumbnail at grid size today. It predicts *gaze*, not clicks — treat as a legibility/attention check, not a CTR oracle.

## 5. What the evidence does NOT support (folklore list)

- **"Faces boost CTR 30–35%"** — the ubiquitous "HubSpot 35%" number has no traceable peer-reviewed source; best data shows inverted-U face effects and context dependence.
- **"Maximize curiosity gap / withhold everything"** — curvilinear: too-vague headlines lose (SciRep 2024); classic clickbait phrasing reduces sharing and triggers manipulation detection (JAMS 2022).
- **"Address the viewer as 'you'"** — null in the pre-registered Upworthy test.
- **"Negativity always wins"** — sadness helped, fear *hurt*, anger null (NHB 2023); YouTube-specific sentiment work finds positive title sentiment often outperforms.
- **"Optimize CTR"** — the platform ranks on expected watch time per impression and satisfaction; its own A/B tool crowns watch-time winners. CTR gains that cost retention are net-negative by design (Covington 2016; Zhao 2019).
- **Specific colors (red/yellow), arrows, saturated backgrounds** — no controlled evidence; only category-dependent observational colorfulness effects.
- Cross-domain transfer caveat: Upworthy effects are 2013–2015 news-feed data; headline norms evolve, so treat coefficients as directional priors, not constants for 2026 YouTube.

**Engineer-usable assets**: Upworthy Research Archive (open); Webis Clickbait-17; YTClickbait21K (arXiv 2606.14780); DeepGaze IIE; Hasler–Süsstrunk colorfulness metric; Kaggle trending-video datasets (thumbnails+views, no CTR); YouTube Analytics API for first-party impressions/CTR; native Test & Compare as the only causal CTR×watch-time instrument on-platform.
