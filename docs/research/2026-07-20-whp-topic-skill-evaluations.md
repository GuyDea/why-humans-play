# WHP Topic Skill Evaluations

- **Date:** 2026-07-20
- **Branch:** `feat/whp-video-topic-skill`

## Purpose and method

This document establishes the no-skill baseline for the WHP video-topic-selection
workflow before implementation. Three fresh agents received one fixed scenario each without
the proposed skill or its approved workflow. Their completed responses are reproduced in
full in the collapsible blocks below and then evaluated against the same twelve checks. All
visible wording and punctuation are verbatim. The only byte-level normalization is the
removal of two invisible trailing spaces after Scenario A's title line so that the required
`git diff --check` passes.

The evaluator used only evidence visible in each response. A **pass** means the response
demonstrates the full check, **partial** means it demonstrates a material part but omits
another required part, and **fail** means the required behavior is absent or substantially
unsatisfied. An omission is not upgraded on the assumption that unreported work happened.
Exact excerpts accompany every partial or failed check; where the failure is an omission,
the excerpt records the response's narrower substitute or unsupported rationalization.

## Fixed twelve-check rubric

| # | Check |
|---:|---|
| 1 | Establishes date, market, constraints, and cold-start/channel-aware mode. |
| 2 | Reads or requests current WHP doctrine and episode state without inventing them. |
| 3 | Explores at least 30 diverse subjects before narrowing. |
| 4 | Separates broad subjects from specific, filmable angles. |
| 5 | Treats actual games and game history as first-class candidates. |
| 6 | Applies game/play centrality, human revelation, payoff, evidence, feasibility, and duplication gates. |
| 7 | Uses multiple independent demand and competition signals. |
| 8 | Handles normalized Trends values, raw views, spikes, and missing analytics correctly. |
| 9 | Separates observed facts, estimates, and editorial inference with dates and links. |
| 10 | Applies a reach-heavy comparison without letting trend bait bypass WHP rigor. |
| 11 | Tests package/payoff alignment for the top candidates. |
| 12 | Chooses one winner and directly explains why the runner-up lost. |

## Scenario A — cold start and actual games

### Prompt

```text
Act as the editorial researcher for a new English-language YouTube channel called Why Humans Play. The channel has no useful private analytics yet, is made by one presenter, and can publish one researched 8–12 minute video in three weeks. The creator likes Sudoku and thinks its history could work, but does not want that preference rubber-stamped. Research current public evidence and decide the single best topic and angle for the next video. Topics may range broadly across actual games, puzzles, play, and what they reveal about humans. Show how you considered alternatives, cite current evidence, and choose one winner. Do not ask follow-up questions.
```

### Complete baseline response

<details>
<summary>Scenario A response (verbatim)</summary>

```markdown
My pick is **mahjong**, not Sudoku.

## The winner

**Title:** *Why America Is Playing Mahjong Again*
**Angle:** Mahjong keeps returning because it is more than a strategy game: it gives people a structured, low-pressure reason to gather. Its current revival reveals how games become social infrastructure and carriers of identity.

This is the strongest cold-start topic as of July 20, 2026 because it combines a recognizable visual object, a fresh public-interest spike, a surprising history, and a distinctly “Why Humans Play” conclusion.

The current signals are unusually strong:

- Eventbrite reported a **179% increase in U.S. mahjong events from 2023 to 2024**. A San Francisco club now draws as many as 200 people to mahjong nights in bars and restaurants. [Associated Press](https://apnews.com/article/b0dea60bce21804756c0d5c241571056)
- Data published July 19, 2026, from Mahjong 4 Friends counted **nearly 1.8 million U.S. players over the preceding year**, with particularly fast growth in several Southern and Midwestern cities. That is platform data, not a national census, but it is a strong additional behavioral signal. [Axios](https://www.axios.com/2026/07/19/online-mahjong-players-city)
- The wider social context fits the story. Eventbrite’s 2026 survey found 74% of surveyed 18-to-35-year-olds considered in-person experiences more important than digital ones, while 58% preferred social situations where socializing was not the sole focus; its U.S. puzzle-competition attendance also doubled. This is commercial survey data, so it should be presented as context rather than proof of causation. [Eventbrite methodology and results](https://www.eventbrite.com/blog/press/newsroom/eventbrites-inaugural-social-study-report-reveals-the-reset-to-real/)
- The need is real beyond trend reports: the WHO estimates loneliness is most common among adolescents and young adults, affecting roughly one in five. Mahjong is not a “cure,” but its revival fits a documented appetite for regular, embodied connection. [WHO Commission on Social Connection](https://www.who.int/groups/commission-on-social-connection)

The deeper story is richer than “Gen Z discovered grandma’s game.” Modern mahjong developed around China’s Yangtze River Delta in the mid-to-late 1800s—not in an ancient imperial court—and became a huge American craze in the 1920s. It subsequently carried different meanings within Chinese-American communities and among Jewish-American women. Historian Annelise Heinz describes it as a game that acquired meanings around modernity, Chinese-American heritage, and Jewish-American women’s culture. [Oxford University Press](https://academic.oup.com/book/39551), [The Strong Museum’s oral-history archive](https://archives.museumofplay.org/repositories/3/resources/246)

That history creates the real payoff: games survive not because their rules remain frozen, but because communities continually remake them.

## Why it beats the alternatives

| Candidate | Evidence for it | Why it is not the next video |
|---|---|---|
| **Sudoku’s real history** | It contains a good reveal: Nikoli says it found the puzzle as the American “Number Place” and introduced it to Japan in 1984. [Nikoli](https://www.nikoli.co.jp/en/puzzles/sudoku/) | Strong evergreen second episode, but there is no comparably fresh public trigger. A straight history risks becoming a timeline rather than a human thesis. Creator enthusiasm helps execution, but does not outweigh mahjong’s current opportunity. |
| **Why Wordle allows only one game a day** | Demand remains enormous: Wordle was played 4.2 billion times in 2025, within 11.2 billion total NYT Games plays. [Associated Press](https://apnews.com/article/4ab76097d6155a022f089d03e94807c3) | Excellent evergreen concept and easiest production, but the Wordle origin/design story has been covered heavily since 2022. Mahjong supplies a newer development and more distinctive visual world. |
| **The chess boom** | Chess.com reports more than six billion games played on its platform in 2025. [Chess.com year in review](https://www.chess.com/article/view/year-in-review-2025) | The audience is proven, but chess is intensely served by specialist creators. A broad boom explainer offers a new channel little whitespace without a sharper event-driven conflict. |
| **Why puzzle boxes are satisfying to watch** | Videos related to puzzle boxes received more than 60 million YouTube views in the first half of 2025. [YouTube Culture & Trends](https://blog.youtube/culture-and-trends/puzzle-yoodle/) | Very platform-native, but the best versions rely on acquiring and demonstrating elaborate objects. That is a worse fit for one researched presenter and a three-week deadline. |

Sudoku should remain on the slate with the sharper eventual premise **“Sudoku Wasn’t Invented in Japan—So Why Does the World Think It Was?”** It simply should not displace the more timely first choice.

## The 8–12 minute story

- **0:00–0:40 — Cold open:** Tile clacks, four hands, a busy modern club. “A game developed in 19th-century China is filling American bars in 2026. Why this game, and why now?”
- **0:40–1:30 — Just enough rules:** Four players draw and discard tiles to construct a hand. Do not attempt a full tutorial; establish how the turn rhythm keeps everyone involved.
- **1:30–3:10 — Break the ancient-game myth:** Trace the game to the Yangtze River Delta and show how exporters marketed it as older and more exotic than it was.
- **3:10–5:10 — America’s first craze:** The 1920s boom, including the contradiction of Americans embracing an exoticized Chinese product during a period of severe anti-Chinese discrimination.
- **5:10–6:50 — A game becomes identity:** Show its continuing, distinct roles in Chinese-American families and Jewish-American women’s communities. Explain that “mahjong” is a family of variants, not one universal ruleset.
- **6:50–8:50 — Why now:** Use the event and player data, then examine the game’s tactile rhythm and “soft socializing”: people have a shared task, conversation does not need to carry the entire encounter, and regular play can turn strangers into familiar faces.
- **8:50–10:15 — Payoff:** Mahjong’s endurance is not about unchanged rules. Humans use games to make meetings repeatable, preserve identity, and lower the awkwardness of belonging.
- **Closing line:** “Sometimes we do not gather because we already belong. We play until we do.”

## Packaging and production

Use an overhead image of four hands around vivid tiles, with only **“AGAIN?”** as thumbnail text. The tile shapes and colors are much more legible than a Sudoku grid at thumbnail size.

Production is realistic in three weeks: shoot original close-ups and sound from one borrowed or inexpensive set; animate a simple China-to-America timeline; and use rights-cleared archives such as the Library of Congress’s striking 1924 photograph of people playing mahjong at a bathing beach. [Library of Congress](https://www.loc.gov/pictures/item/2016837879/)

The main editorial guardrails are important:

- Do not call mahjong ancient.
- Do not imply it vanished; Chinese and Jewish communities maintained continuous traditions.
- Distinguish Chinese regional forms, Japanese riichi, and American mah-jongg rather than treating them as interchangeable.
- Present loneliness as context, not claim that playing a board game clinically fixes it.
- Include the 1920s exoticism and appropriation history; that complication makes the video stronger, not less clickable.

This is the video I would green-light.
```

</details>

### Rubric result

| # | Result | Basis |
|---:|:---:|---|
| 1 | pass | It dates the decision to July 20, 2026, explicitly calls it a cold-start choice, focuses on the U.S./America and an English-language channel, and addresses the one-presenter, three-week, 8–12 minute production constraint. |
| 2 | fail | It names no WHP doctrine or episode-state file, does not mark either unavailable, and assumes a future episode sequence. |
| 3 | fail | It visibly considers five subjects—mahjong, Sudoku, Wordle, chess, and puzzle boxes—not at least 30 diverse subjects. |
| 4 | pass | It distinguishes subjects from filmable premises, including a specific mahjong thesis and a sharper history premise for Sudoku. |
| 5 | pass | Mahjong and its history win; Sudoku, Wordle, chess, and puzzle boxes are treated as substantive alternatives. |
| 6 | partial | The answer addresses centrality, human meaning, payoff, evidence, and feasibility, but does not apply the six named gates consistently at angle level and never checks current-episode duplication/portfolio fit. |
| 7 | partial | It triangulates several public demand/context signals, but provides no direct competition or comparable-video analysis for the winning mahjong angle. |
| 8 | pass | It explicitly uses cold-start mode, qualifies platform data and related-video views, and does not turn a spike or public metric into a view forecast. No Google Trends value is used. |
| 9 | partial | Many facts are dated, linked, and caveated, but fact/estimate/inference is not tracked consistently and material competitive inferences are uncited. |
| 10 | partial | Reach and timeliness influence the choice and no obvious trend bait bypasses fit, but the comparison has no reach-heavy weights or common scorecard. |
| 11 | partial | The winner receives a title, thumbnail, structure, and payoff; the other leading candidates do not receive package/payoff stress tests. |
| 12 | pass | It chooses mahjong, treats Sudoku as the next-best later episode, and directly says why Sudoku should not displace the winner. |

**Scenario A total:** 5 pass, 5 partial, 2 fail.

### Exact failure excerpts

- **Check 2 — no current doctrine or episode-state read; sequence assumed:**

  > This is the strongest cold-start topic as of July 20, 2026 because it combines a recognizable visual object, a fresh public-interest spike, a surprising history, and a distinctly “Why Humans Play” conclusion.

  > Sudoku should remain on the slate with the sharper eventual premise **“Sudoku Wasn’t Invented in Japan—So Why Does the World Think It Was?”**

  The response claims a distinctly WHP conclusion and places Sudoku on a future slate without
  naming doctrine, published/current episode records, or unavailable files.

- **Check 3 — five visible subjects substitute for the required pool:**

  > My pick is **mahjong**, not Sudoku.

  > **Sudoku’s real history**

  > **Why Wordle allows only one game a day**

  > **The chess boom**

  > **Why puzzle boxes are satisfying to watch**

- **Check 6 — an ad hoc alternative screen and winner-only guardrails substitute for all six gates:**

  > | Candidate | Evidence for it | Why it is not the next video |

  > The main editorial guardrails are important:

  The response never records a duplication/portfolio-fit check and does not show all six gates
  being applied to each angle.

- **Check 7 — demand evidence is offered, but the winning angle's competitive opening is asserted rather than researched:**

  > The current signals are unusually strong:

  > Mahjong supplies a newer development and more distinctive visual world.

  There is no linked public YouTube-results set, comparable-video cohort, or other
  competition/supply signal for the mahjong package.

- **Check 9 — material competitive claims are editorial inference without their own dated evidence:**

  > Excellent evergreen concept and easiest production, but the Wordle origin/design story has been covered heavily since 2022.

  > The audience is proven, but chess is intensely served by specialist creators.

- **Check 10 — the decision invokes opportunity without a common reach-heavy comparison:**

  > This is the strongest cold-start topic as of July 20, 2026 because it combines a recognizable visual object, a fresh public-interest spike, a surprising history, and a distinctly “Why Humans Play” conclusion.

  > | Candidate | Evidence for it | Why it is not the next video |

- **Check 11 — only the winner receives a complete package/payoff treatment:**

  > Use an overhead image of four hands around vivid tiles, with only **“AGAIN?”** as thumbnail text.

  > Sudoku should remain on the slate with the sharper eventual premise **“Sudoku Wasn’t Invented in Japan—So Why Does the World Think It Was?”**

  The Sudoku line is a premise, not a package/payoff stress test, and the remaining alternatives
  receive neither.

## Scenario B — trend bait and misleading metrics

### Prompt

```text
Act as the editorial researcher for Why Humans Play, an ideas channel using games and play to explain humanity. A collaborator insists the next video should be "AI is changing everything" because one AI video has 20 million views and Google Trends briefly reached 100 this week. The only proposed play connection is that some AI agents were evaluated in games. There is a five-day deadline and pressure to chase the spike. Research the opportunity, compare it with broader games/play/human candidates, and choose the single best next topic and angle. Explain whether the raw view count and trend peak are decision-worthy. Do not ask follow-up questions.
```

### Complete baseline response

<details>
<summary>Scenario B response (verbatim)</summary>

```markdown
My recommendation: do not make “AI Is Changing Everything.” Make the next video about **how games turn strangers into a temporary “we,” using the just-finished World Cup as the opening case**.

A strong working title is **“Why Crowds Feel Like One Body.”** The angle is:

> A match is a machine for human synchrony. Shared rules, uncertainty, chants, gestures and emotional peaks align our attention and even aspects of our physiology. That alignment produces belonging—but the same machinery can also produce exclusion and hostility.

This is both timely and unmistakably Why Humans Play. The World Cup final was yesterday, July 19, concluding a record 104-match tournament. Before the quarterfinals, FIFA was already reporting more than 6.25 million stadium spectators and 20 billion video views across its platforms; those are promotional figures, so I would use them only to establish scale, not forecast our views. ([AP](https://apnews.com/article/world-cup-final-spain-argentina-e45fd30932bb9885812805cafa99ca33), [FIFA](https://inside.fifa.com/organisation/media-releases/packed-stadiums-record-digital-reach-world-cup-2026-numbers-unprecedented-scale))

More importantly, there is unusually fresh science behind the story. A study published July 8 monitored 60 spectators through a live basketball game using repeated saliva samples and continuous heart-rate recordings. Heart-rate synchrony increased during and after the game, and stronger synchrony and oxytocin measures were associated with reported unity, enjoyment and intent to return. The study is small and observational, so the script must say “associated with,” not “watching sports releases a bonding hormone.” ([Translational Psychiatry/PubMed](https://pubmed.ncbi.nlm.nih.gov/42420254/))

That finding triangulates well with two stronger story beats:

- A 2025 field study of Brazilian football supporters found their ritualized pregame gathering produced even greater emotional synchrony than key moments of the match itself. ([PNAS/PubMed](https://pubmed.ncbi.nlm.nih.gov/40489616/))
- A 2022 study comparing stadium spectators with small groups watching remotely found greater autonomic synchrony in the stadium, associated with more transformative experiences and stronger identity fusion. ([Scientific Reports/PubMed](https://pubmed.ncbi.nlm.nih.gov/35022461/))

That gives us a clean progression: **shared attention → ritualized movement → physiological synchrony → a felt sense of “us” → belonging and its darker mirror, out-group hostility.** The conclusion can widen from football to concerts, worship, rallies and protests: humans use collectively witnessed games as socially acceptable engines for becoming a group.

### Candidate comparison

| Candidate | Channel fit | Timeliness | Distinctive human question | Five-day feasibility | Verdict |
|---|---:|---:|---:|---:|---|
| World Cup, synchrony and belonging | Excellent | Excellent | Excellent | High | **Make now** |
| “AI is changing everything,” with game benchmarks | Weak–medium | High but unstable | Weak as pitched | Medium | Reject |
| Why betting makes fandom more intense | Strong | High | Strong, but narrower | Medium | Runner-up |
| How video games became psychology laboratories | Excellent | Modest | Strong | High | Evergreen backlog |
| Esports as state power/sportswashing | Strong | High | Strong | Low; geopolitical reporting burden | Future investigation |

The betting candidate has real heat: AP reported that the share of Brazilians placing bets rose from 11% before the World Cup to about 35% by late June, based on a fintech sample of 1.2 million people. But it is geographically specific, harm-sensitive and would require more careful causal and regulatory reporting than five days comfortably allows. ([AP](https://apnews.com/article/brazil-world-cup-gambling-bets-sports-soccer-f68b603d355ac250da11d183f5cd71db))

“Games as cognitive laboratories” is deeply on-brand; a recent review describes projects such as *Sea Hero Quest* using play to gather large-scale behavioral data outside conventional labs. It lacks the World Cup candidate’s immediate cultural doorway, so I would keep it evergreen. ([2026 review](https://arxiv.org/abs/2604.24321))

### Why the AI evidence does not justify a greenlight

The 20-million-view video and Trends peak are useful scouting clues, not decision-grade evidence.

A public view count is an outcome with almost all causal context removed. We do not know the video’s channel size, normal baseline, age, view velocity, traffic sources, audience geography, format, paid or external distribution, retention, or whether viewers subsequently watched more from that creator. YouTube itself separates views from impressions, click-through rate, watch time, retention and unique viewers because those metrics answer different questions. ([YouTube reach documentation](https://support.google.com/youtube/answer/9314355), [YouTube performance documentation](https://support.google.com/youtube/answer/12220281))

One 20-million-view outlier therefore demonstrates that **that package, creator and distribution event** reached 20 million views—not that our audience wants a generic AI essay. A useful public benchmark would be a cohort of comparable long-form videos across adjacent, similarly sized channels, measured by early view velocity and performance relative to each channel’s median, not by the largest absolute number.

A Google Trends value of 100 is also not raw search volume. Google scales the highest relative-interest point within the selected geography and time range to 100. Changing the range or location can change what “100” means. Google explicitly warns that isolated spikes can reflect statistical noise on smaller queries and that a spike does not mean a topic is “popular” or “winning.” ([Google Trends FAQ](https://support.google.com/trends/answer/4365533?hl=en))

There is an additional relevance problem: searches for broad “AI” may be driven by a product release, jobs, regulation or a news controversy. They say nothing about demand for AI agents playing games. The viral view and Trends spike may also be two consequences of the same news event, not independent confirmation.

The AI idea becomes channel-worthy only after inversion: **“Why Do We Test Intelligence With Games?”** Recent Battleship and game-benchmark work could support that question, because play would then be the explanatory engine rather than a decorative example. ([MIT](https://news.mit.edu/2026/teaching-ai-agents-ask-better-questions-playing-battleship-0603)) That is worth developing later, but it is a different and more specific video than “AI is changing everything.”

For the five-day production, I would open on the World Cup crowd rather than the winning goal: thousands of strangers moving, chanting and reacting together. Ask, “Why does watching other people play make us feel more alive—and more connected to people we have never met?” Then move through the three studies, widen to collective ritual, acknowledge the belonging/exclusion tradeoff, and end with the central idea: **perhaps the deepest function of a public game is not determining a winner; it is briefly turning many people into one.**
```

</details>

### Rubric result

| # | Result | Basis |
|---:|:---:|---|
| 1 | partial | It implies a current date immediately after July 19 and establishes the five-day constraint, but does not explicitly record the full decision date, target market/language, or cold-start/channel-aware mode. |
| 2 | fail | It reads or requests no current WHP doctrine or episode state, yet makes definitive WHP-fit judgments. |
| 3 | fail | Its comparison contains five candidates, not at least 30 diverse subjects. |
| 4 | pass | It turns the World Cup into a specific synchrony/belonging angle and correctly reframes broad AI into the filmable question “Why Do We Test Intelligence With Games?” |
| 5 | partial | A football event and video-game research are first-class candidates, but the narrow pool includes no specific game-history lane and little breadth among actual games or puzzles. |
| 6 | partial | It strongly tests centrality, human revelation, evidence, payoff, and five-day feasibility, but does not apply all six gates consistently and omits episode duplication/portfolio fit. |
| 7 | partial | It uses independent scale and research signals for the winner, but does not research competitive supply or comparable public videos for that angle. |
| 8 | pass | It correctly explains that 20 million views lack causal/comparable context, that Trends 100 is normalized to a local peak, that spikes can be noise, and that neither metric greenlights the broad AI pitch. |
| 9 | partial | It dates and links many observations and explicitly labels promotional/observational limitations, but does not consistently classify facts, estimates, and editorial inferences or date every volatile observation. |
| 10 | partial | It prevents trend bait from bypassing centrality and evidence, but its five-column comparison is unweighted and does not establish a reach-heavy decision model. |
| 11 | partial | The winner has a title, angle, opening, progression, and payoff; no top-three set receives multiple honest package/payoff tests. |
| 12 | pass | It chooses World Cup crowd synchrony, explicitly labels betting the runner-up, and directly explains that reporting sensitivity and the deadline make it lose. |

**Scenario B total:** 3 pass, 7 partial, 2 fail.

### Exact failure excerpts

- **Check 1 — a partial date and deadline appear, but the full date, market, and evidence mode do not:**

  > The World Cup final was yesterday, July 19, concluding a record 104-match tournament.

  > For the five-day production, I would open on the World Cup crowd rather than the winning goal

  Neither excerpt, nor the rest of the response, records the full decision date, sets a target
  market/language, or declares cold-start versus channel-aware mode.

- **Check 2 — WHP fit is asserted without current doctrine or episode state:**

  > This is both timely and unmistakably Why Humans Play.

- **Check 3 — the full visible pool is five candidates:**

  > World Cup, synchrony and belonging

  > “AI is changing everything,” with game benchmarks

  > Why betting makes fandom more intense

  > How video games became psychology laboratories

  > Esports as state power/sportswashing

- **Check 5 — actual play is present, but the candidate pool supplies no game-history candidate:**

  > | World Cup, synchrony and belonging | Excellent | Excellent | Excellent | High | **Make now** |

  > | How video games became psychology laboratories | Excellent | Modest | Strong | High | Evergreen backlog |

- **Check 6 — five editorial columns substitute for the complete six-gate screen:**

  > | Candidate | Channel fit | Timeliness | Distinctive human question | Five-day feasibility | Verdict |

  > The AI idea becomes channel-worthy only after inversion: **“Why Do We Test Intelligence With Games?”**

  The centrality correction is sound, but no duplication/portfolio-fit check appears and the
  same complete gate set is not shown for every angle.

- **Check 7 — scale and science are researched, while competitive supply is absent:**

  > Before the quarterfinals, FIFA was already reporting more than 6.25 million stadium spectators and 20 billion video views across its platforms; those are promotional figures, so I would use them only to establish scale, not forecast our views.

  > More importantly, there is unusually fresh science behind the story.

  Neither is a competition/content-gap signal for the proposed long-form package.

- **Check 9 — useful caveats coexist with unclassified editorial judgments:**

  > It lacks the World Cup candidate’s immediate cultural doorway, so I would keep it evergreen.

  > | Esports as state power/sportswashing | Strong | High | Strong | Low; geopolitical reporting burden | Future investigation |

  These are editorial inferences without an attached observation date or cited competitive
  evidence.

- **Check 10 — trend bait is rejected, but the comparison is not reach-weighted:**

  > | Candidate | Channel fit | Timeliness | Distinctive human question | Five-day feasibility | Verdict |

  > The 20-million-view video and Trends peak are useful scouting clues, not decision-grade evidence.

- **Check 11 — a single winner package substitutes for top-candidate package/payoff testing:**

  > A strong working title is **“Why Crowds Feel Like One Body.”**

  > For the five-day production, I would open on the World Cup crowd rather than the winning goal

  No runner-up or third-place candidate receives a comparable title/thumbnail promise and
  delivered-payoff test.

## Scenario C — conflicting evidence and forced choice

### Prompt

```text
Act as the editorial researcher for Why Humans Play. The current finalists are a video about how Sudoku conquered the world and a video about why humans turn work into status games. Public signals are mixed: Sudoku appears evergreen and visually clear, while workplace status is broader but more competitive and harder to prove. There is no reliable channel analytics history. Research both plus credible alternatives, apply a transparent comparison, and choose exactly one next video. Include an honest package direction, the decisive uncertainty, and why the runner-up lost. Do not return an unordered menu and do not ask follow-up questions.
```

### Complete baseline response

<details>
<summary>Scenario C response (verbatim)</summary>

```markdown
Make **How Sudoku Conquered the World** next.

With no trustworthy channel history, I would optimize for a topic with low research risk, a strong visual engine, and an instantly legible promise. Sudoku wins on all three. It also has durable public demand: the World Puzzle Federation is running eight international Sudoku Grand Prix rounds in 2026, while the specialist Cracking the Cryptic channel sits around 700,000 subscribers and 309 million views. Those signals do not predict views for a history video, but they show this is a living interest, not pure 2005 nostalgia. [WPF 2026 schedule](https://gp.worldpuzzle.org/), [current channel count](https://socialcounts.org/youtube-live-subscriber-count/UCC-UOdK8-mIjxBQm_ot1T-Q).

### Comparison

Scores are 1–5 editorial judgments, not faux performance forecasts. I weighted what matters most without analytics: package clarity 25%, channel fit 20%, proof/story spine 20%, visuals 15%, competitive whitespace 10%, and evergreen/production safety 10%.

| Topic | Package | Fit | Proof | Visuals | Whitespace | Durable | Weighted |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Sudoku conquers the world** | 4.5 | 5 | 5 | 5 | 4 | 5 | **95.5** |
| Workplace status games | 4.5 | 5 | 3.5 | 2.5 | 3 | 4.5 | **79.0** |
| Why Tetris follows you into sleep | 3.5 | 4.5 | 4 | 5 | 2 | 3.5 | **77.5** |
| Why humans collect things | 4 | 4 | 3 | 5 | 2 | 4 | **75.0** |

The Sudoku story is unusually well documented. Nikoli openly says it imported the American “Number Place” in 1984, shortened the Japanese name to Sudoku, and made the symmetrical-clue convention that helped it take off. [Nikoli’s history](https://www.nikoli.co.jp/en/puzzles/sudoku/). Then Wayne Gould built a generator, persuaded *The Times* to publish the puzzle in November 2004, and supplied newspapers for free. By May 2005, six other British nationals had followed; *The Times*’ first book had already sold more than 100,000 copies. [Contemporary Guardian report](https://www.theguardian.com/media/2005/may/10/pressandpublishing.uknews). Will Shortz later reported that Gould’s puzzles reached more than 400 newspapers and his books passed four million sales. [TIME profile](https://time.com/collection_hub_item/wayne-gould/).

That gives the episode a supported causal thesis: Sudoku combined three simple, language-independent rules with effectively unlimited supply and a newspaper industry primed to copy a successful daily habit. It is a story about design and distribution, not a vague claim that the puzzle “hacked the brain.”

The credible alternatives did not overturn the result:

- Tetris has excellent visuals and a memorable experiment: players reported intrusive game imagery as they fell asleep. But the core finding is narrow, while “the Tetris effect” has already received extensive documentary and news treatment. Expanding it into a sweeping brain claim would be risky. [Original Science study](https://pubmed.ncbi.nlm.nih.gov/11030656/), [ABC’s 2024 deep dive](https://www.abc.net.au/news/health/2024-08-04/tetris-unlock-dreams-treat-trauma-and-ptsd/103799818).

- Collecting is broad and visual, and a recent six-study paper makes a good case that desire for control can motivate completion of collections. It does not establish one universal explanation for collecting, which also involves identity, nostalgia, community, investment, and preservation. The clean title therefore overpromises, and a TED talk already occupies the exact “why we collect things” package. [Journal of Consumer Research study](https://martinreimann.com/pdf/Cao%2C%20Brucks%2C%20Reimann.%20Seeking%20Structure%20in%20Collections.pdf), [existing TED talk](https://www.ted.com/talks/daniel_krawczyk_why_we_collect_things).

### Why the runner-up lost

Workplace status is a real and important mechanism. A major review supports status as a fundamental human motive, and organizational research shows that status competition can sometimes increase effort. [Psychological Bulletin review](https://pubmed.ncbi.nlm.nih.gov/25774679/), [work-group research](https://www.sciencedirect.com/science/article/pii/S0167268100001074).

But the proposed claim—“humans turn work into status games”—bundles status, power, hierarchy, competition, and office politics into one universal explanation. The findings are context-dependent: one experiment found competition increased cheating only among lower-performing participants, while a newer experiment found no overall honesty effect. [Earlier experiment](https://www.sciencedirect.com/science/article/pii/S0167487009000336), [2024 experiment](https://www.frontiersin.org/journals/behavioral-economics/articles/10.3389/frbhe.2024.1455686/full). The territory is also crowded with career-advice and management framing; HBR alone maintains an entire office-politics topic stream. [HBR topic page](https://hbr.org/topic/subject/office-politics).

An honest version would need to narrow to a particular scoreboard—promotion tournaments, forced rankings, visible performance metrics—and secure concrete workplace cases. Without that, it risks becoming an abstract voiceover laid over generic office footage. It lost because its audience ceiling is higher but its evidentiary and production variance are much worse.

### Package direction

**Title:** *How Sudoku Conquered the World*

**Thumbnail:** One stark 9×9 grid spreading across a globe or wall of newspaper front pages, with the short line: **9 NUMBERS. EVERYWHERE.**

**Cold open:** In November 2004, almost nobody in Britain knew this grid. Six months later, national newspapers were fighting over it. The supposed Japanese craze had actually begun with an American architect—and required a retired judge to go global.

The episode spine should be:

1. Howard Garns and *Number Place* in 1979.
2. Nikoli’s Japanese naming and refinement.
3. Gould’s six-year generator, *Times* pitch, and free-distribution model.
4. The British newspaper arms race and global spread.
5. Why the format endured: simple rules, no language barrier, daily repeatability, and endless variation.

The decisive uncertainty is whether Sudoku’s large play audience has any appetite for its history. Current signals mostly measure people solving puzzles, not clicking documentaries about them; non-solvers may also read the grid as homework and scroll past. That is a genuine package risk. The cross-cultural relay and newspaper takeover—not solving technique—should therefore dominate the title, thumbnail, and first minute.

Even with that uncertainty, Sudoku is the best next bet: the promise is cleaner, the evidence is firmer, the visuals are native to the subject, and the downside is lower.
```

</details>

### Rubric result

| # | Result | Basis |
|---:|:---:|---|
| 1 | fail | It acknowledges the absence of trustworthy channel history but gives no decision date, target market/language, supplied-versus-missing production constraints, or named cold-start mode. |
| 2 | fail | It reads or requests no WHP doctrine or episode state and nevertheless assigns exact channel-fit scores. |
| 3 | fail | It visibly compares four subjects, not at least 30 diverse subjects. |
| 4 | pass | It uses specific, filmable angles and explicitly says the broad workplace subject would need a narrower scoreboard and cases. |
| 5 | pass | A game-history video wins, with Tetris as another first-class actual-game candidate. |
| 6 | partial | The bespoke score touches fit, proof, visuals, whitespace, and production, but does not transparently apply all six gates at angle level and omits duplication/portfolio fit. |
| 7 | partial | It supplies multiple public interest/supply clues, but the winner's competitive-whitespace score lacks direct angle-level competition evidence or a comparable-video cohort. |
| 8 | pass | It treats missing channel history as a limitation and explicitly says public play/channel counts do not predict the history video's views. It does not misuse Trends or a spike. |
| 9 | partial | It links factual sources and labels scores as editorial judgments, but does not date the current channel metric or consistently distinguish each observation from estimate and inference. |
| 10 | partial | It uses a transparent weighted comparison and does not chase a spike, but the rubric has no explicit audience-demand criterion and is not demonstrably reach-heavy. |
| 11 | partial | Only Sudoku receives a full title, thumbnail, cold open, story spine, and payoff alignment test; the other top candidates do not. |
| 12 | pass | It chooses Sudoku and directly explains why workplace status—the named runner-up—loses on claim scope, evidence, production, and competitive variance. |

**Scenario C total:** 4 pass, 5 partial, 3 fail.

### Exact failure excerpts

- **Check 1 — missing analytics are acknowledged, but the rest of the decision frame is absent:**

  > With no trustworthy channel history, I would optimize for a topic with low research risk, a strong visual engine, and an instantly legible promise.

- **Check 2 — exact fit scores are assigned without current doctrine or episode state:**

  > | **Sudoku conquers the world** | 4.5 | 5 | 5 | 5 | 4 | 5 | **95.5** |

  > | Workplace status games | 4.5 | 5 | 3.5 | 2.5 | 3 | 4.5 | **79.0** |

- **Check 3 — the visible candidate landscape contains four subjects:**

  > | **Sudoku conquers the world** | 4.5 | 5 | 5 | 5 | 4 | 5 | **95.5** |

  > | Workplace status games | 4.5 | 5 | 3.5 | 2.5 | 3 | 4.5 | **79.0** |

  > | Why Tetris follows you into sleep | 3.5 | 4.5 | 4 | 5 | 2 | 3.5 | **77.5** |

  > | Why humans collect things | 4 | 4 | 3 | 5 | 2 | 4 | **75.0** |

- **Check 6 — the custom score is not the complete six-gate screen:**

  > Scores are 1–5 editorial judgments, not faux performance forecasts. I weighted what matters most without analytics: package clarity 25%, channel fit 20%, proof/story spine 20%, visuals 15%, competitive whitespace 10%, and evergreen/production safety 10%.

  Game/play centrality and human payoff are compressed into an unexplained fit score, while
  duplication/portfolio fit is absent.

- **Check 7 — demand signals do not validate the exact history package's competitive opening:**

  > It also has durable public demand: the World Puzzle Federation is running eight international Sudoku Grand Prix rounds in 2026, while the specialist Cracking the Cryptic channel sits around 700,000 subscribers and 309 million views.

  > | **Sudoku conquers the world** | 4.5 | 5 | 5 | 5 | 4 | 5 | **95.5** |

  The response assigns whitespace 4/5 without showing current results or comparable
  documentary performance for this angle.

- **Check 9 — a volatile public metric is called current without a dated observation:**

  > [current channel count](https://socialcounts.org/youtube-live-subscriber-count/UCC-UOdK8-mIjxBQm_ot1T-Q).

  > The territory is also crowded with career-advice and management framing; HBR alone maintains an entire office-politics topic stream.

  The first observation lacks an observation date; the second is an editorial competition
  inference rather than a classified market observation.

- **Check 10 — transparent weights omit explicit demand and do not make reach decisive:**

  > I weighted what matters most without analytics: package clarity 25%, channel fit 20%, proof/story spine 20%, visuals 15%, competitive whitespace 10%, and evergreen/production safety 10%.

- **Check 11 — complete packaging is limited to the winner:**

  > **Title:** *How Sudoku Conquered the World*

  > **Thumbnail:** One stark 9×9 grid spreading across a globe or wall of newspaper front pages, with the short line: **9 NUMBERS. EVERYWHERE.**

  > **Cold open:** In November 2004, almost nobody in Britain knew this grid.

  No corresponding package/payoff test is supplied for workplace status, Tetris, or
  collecting.

## Cross-scenario baseline failure patterns

- **The search space collapsed early.** Scenario A and B each expose five subjects, while
  Scenario C exposes four. None records the required 30-subject, multi-lane divergence
  before narrowing.
- **Current WHP state was not consulted.** No response names current doctrine, steering,
  published episodes, committed work, drafts, or backlog state. Each still makes WHP-fit
  judgments, and none performs a reliable duplication/portfolio-fit gate.
- **Eligibility screening was incomplete and implicit.** All three reason about several
  useful dimensions, but none applies the same six hard gates at angle level.
- **Demand research outweighed competition research.** Each response brings multiple public
  demand, scale, historical, or research signals, but none establishes the winning angle's
  competitive opening through current result sets or age/format/channel-aware comparables.
- **Evidence provenance was uneven.** Links and caveats are common strengths, especially in
  Scenario B, but no response maintains a dated fact/estimate/inference trail. Material
  competitive judgments remain uncited or unclassified.
- **Comparison models were improvised.** Scenario A uses an unweighted evidence/rejection
  table, Scenario B an unweighted five-column comparison, and Scenario C a bespoke score
  without an explicit demand criterion. None demonstrates the fixed reach-heavy model.
- **Packaging stopped after selection.** Every winner receives a plausible package and
  payoff, but no response stress-tests packages across the leading candidates before the
  decision.
- **The baseline did show useful decision discipline.** All three select exactly one winner
  and explain why the nearest alternative loses. Scenario B also rejects both the raw
  20-million-view count and normalized Trends peak as sufficient decision evidence.

## Forward-test results

Pending Task 5. No skill-guided forward-test response has been run or evaluated in Task 1.
This baseline record does not establish forward-test success.

## Refinements and final verdict

Pending Task 5. No skill refinement or final acceptance verdict is claimed from the baseline.
The observed failures above are RED-phase evidence to guide implementation and later
forward testing.
