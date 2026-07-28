# WHP Human-Nerve Angle Gate — Baseline and Cued-Probe Record

- **Date:** 2026-07-28
- **Branch:** `episode1-story-rebuild`
- **Design:** [`2026-07-28-whp-human-nerve-angle-gate-design.md`](../specs/2026-07-28-whp-human-nerve-angle-gate-design.md)
- **Plan:** [`2026-07-28-whp-human-nerve-angle-gate.md`](../plans/2026-07-28-whp-human-nerve-angle-gate.md)

## Evaluation criteria

An output passes only when:

1. the title activates a specific, personally recognizable concern, dilemma, desire, or
   fascination rather than the broad subject;
2. the nerve names a concrete person, moment, object, and consequence;
3. current audience-language evidence supports the concern without being treated as proof
   of its factual premise or audience size;
4. the proposed mechanism directly explains that concern inside an explicit evidence
   boundary;
5. the evidence and payoff can fully satisfy the title without clickbait; and
6. wonder-, history-, and explicit-game topics are not forced into manufactured suffering.

## RED — untouched-skill baseline

The evaluator received the existing skill and this prompt without the conversation's
accepted answer:

```text
Use the project-local choosing-whp-video-topic skill for this bounded ideation task.
The raw topic is “Popularity.” Return exactly: (1) one proposed YouTube title,
(2) the specific personal human concern or dilemma it addresses, (3) the core
explanatory mechanism, and (4) a two-sentence opening. Do not edit files. Do not
read conversation history or any evaluation artifacts. Do not ask questions.
Keep the answer under 180 words.
```

The untouched skill returned:

> **Title:** Popularity Changes What You Think You Like
>
> **Personal concern:** When choosing music, people, products, or opinions, how can I
> tell whether I genuinely like something—or merely feel safer liking what others
> already approve?
>
> **Core mechanism:** Popularity is a self-reinforcing coordination game. Visible
> approval acts as social proof, attracting more attention and creating cumulative
> advantage that can compound independently of quality.
>
> **Opening:** A song gets no better when its play count jumps from ten to ten
> million—but it may sound better to you. Popularity is a feedback loop, and I’ll show
> you when the crowd is helping your judgment—and when it is replacing it.

The blockquote was transcribed from the evaluator response retained in the working
session. No standalone immutable transcript or evaluator identifier was preserved.

**Verdict:** FAIL. The result is coherent, but it still starts from a familiar mechanism
and an abstract autonomy concern. The title names neither a concrete lived situation nor a
specific personal fear, desire, or dilemma. The concern spans music, people, products, and
opinions instead of choosing one recognizable nerve, and no evidence boundary establishes
that the proposed mechanism explains the promised personal consequence.

This reproduces the live failure that triggered the change: painpoint-first wording alone
did not prevent mechanism-first relevance.

## GREEN — cued development-probe protocol

Separate evaluators received the updated project-local skill and one raw topic each.
Nostalgia and Waiting were unfamiliar to the evaluated skill materials; Sudoku was
intended as the explicit-game case but was later found elsewhere in WHP doctrine and prior
topic work. They were told to:

```text
Use the bounded Ideate subjects/angles operation. Follow the linked subject-to-angle
owner and current public audience/factual signals, but do not run the full selection
pipeline or pick a winner. Return two materially different exact angle proposals.
For each include: working title, specific human nerve/shared tension in first-person
form, concrete lived moment, prospective evidence-backed mechanism, honest payoff,
and one evidence boundary. Cite direct sources compactly. End with a specificity and
clickbait self-check. Do not read evaluation artifacts or use target answers.
```

The explicit-game evaluator also received: `Do not manufacture suffering.`

### Method limitations

These runs are useful development probes, not clean evidence that the skill alone induces
the desired behavior:

- the GREEN prompt explicitly requested the same fields later used for grading, so the
  results demonstrate compliance when cued rather than an unbiased RED/GREEN comparison;
- Sudoku was already present in WHP doctrine and prior topic work, so it is not an
  unfamiliar explicit-game generalization test; and
- the original evaluator transcripts and isolated-run identifiers were not retained. The
  records below are edited summaries. Their first-person nerve wording was normalized and
  the audience-language notes were added during the later evidence audit; they must not be
  represented as verbatim evaluator output; and
- no one subject was run through both the old and updated skill under symmetric prompts,
  so the record is not a controlled before-and-after comparison.

The deterministic package tests remain the reproducible regression evidence. A future
behavioral validation should use neutral prompts, topics absent from WHP materials, and
immutable per-run prompts and transcripts.

### Forward result: Nostalgia

#### Angle A

- **Title:** `Why Childhood Games Feel Like Home When Life Changes`
- **Nerve (first person):** After a hard move, when I reopen my childhood Pokémon save,
  I want it to restore my sense of who I am rather than merely distract me from feeling
  unmoored.
- **Lived moment:** After moving or a brutal week, the viewer opens a childhood Pokémon
  save and recognizes the music, route, competence, and remembered co-player.
- **Audience language (signal, not proof):** In a March 2025 discussion, a player
  described returning almost exclusively to childhood comfort games during a hard period.
  That supports the recognizability of the moment, not its prevalence or a therapeutic
  effect. [Current discussion](https://www.reddit.com/r/patientgamers/comments/1jkhz3w)
- **Mechanism:** Familiar play may cue autobiographical memories of competence,
  relationships, connectedness, and self-continuity.
- **Payoff:** Identify whether the ritual is restoring competence, continuity, or a
  relationship, then distinguish enjoying the ritual from reconnecting with the person it
  evokes.
- **Boundary:** No treatment claim; recall-heavy work is mostly associative or
  short-term, and logged-play research did not find a stable well-being difference between
  retro and non-retro players.
- **Evidence:** [Wulf et al.](https://doi.org/10.1037/ppm0000208),
  [Sedikides et al.](https://pubmed.ncbi.nlm.nih.gov/26751632/),
  [Ballou et al.](https://doi.org/10.1037/ppm0000666).

#### Angle B

- **Title:** `Were Old Games Better—or Are We Comparing the Best of Then to All of Now?`
- **Nerve (first person):** When I abandon several new releases and reopen one childhood
  favorite, I want to know whether games became worse or my memory is stacking the
  comparison—because the answer changes what I should look for next.
- **Lived moment:** The viewer abandons several current releases, reopens one childhood
  favorite, and concludes that gaming peaked in a remembered year.
- **Audience language (signal, not proof):** In a March 2024 discussion, a player
  contrasted repeated returns to older games with difficulty finding emotional value in
  newer releases while explicitly questioning nostalgia. That supports the live dilemma,
  not the claim that older games are better or that the audience is large.
  [Current discussion](https://www.reddit.com/r/patientgamers/comments/1bdb4ov/do_you_feel_like_youre_more_attracted_to_old/)
- **Mechanism:** Selected surviving favorites may be compared with today's unscreened
  field, while negative feeling often fades faster than positive feeling.
- **Payoff:** Compare a cherished classic, a random same-era title, and a genre-matched
  current title while separating remembered life context from design quality.
- **Boundary:** Memory effects cannot disprove real changes in design, monetization,
  preservation, or genre supply.
- **Evidence:** [Hoehne and Zimprich](https://doi.org/10.3389/fpsyg.2025.1608751),
  [Ballou et al.](https://doi.org/10.1037/ppm0000666).

**Verdict:** PASS. The two angles use different nerves, moments, evidence paths, and
payoffs. Neither claims that nostalgia lies, that retro play heals, or that old games were
never better.

### Forward result: Waiting

#### Angle A

- **Title:** `Why 99% Feels Like Forever: How a Progress Bar Turns Waiting Into a Game`
- **Nerve (first person):** Before an important call, when my laptop update stalls at
  99%, I cannot tell whether completion is seconds away or whether quitting will waste the
  entire wait—and either choice could cost me the call.
- **Lived moment:** A laptop update races forward before an important call and appears
  frozen at 99% while its owner watches instead of doing anything else.
- **Audience language (signal, not proof):** In a May 2025 discussion, players watching a
  bar sit at 99% debated whether it was finished, broken, or close enough that starting
  something else would be pointless. That supports the uncertainty and opportunity-cost
  wording, not the proposed perceptual mechanism.
  [Current discussion](https://www.reddit.com/r/Helldivers/comments/1kh7yz5)
- **Mechanism:** A progress bar gives an opaque process a score, goal, and implied finish
  line; animation can direct temporal attention and change predicted completion.
- **Payoff:** Understand that a progress bar is not merely a stopwatch and can change the
  experience of an identical wait.
- **Boundary:** Small samples and brief waits do not establish that every progress bar
  deliberately deceives.
- **Evidence:** [Harrison et al.](https://www.chrisharrison.net/projects/progressbars2/ProgressBarsHarrison.pdf),
  [2025 loading-animation experiments](https://www.mdpi.com/0718-1876/20/4/306).

#### Angle B

- **Title:** `Should You Wait for the Second Marshmallow? Patience as a Trust Game`
- **Nerve (first person):** When someone who has already broken a small promise offers me
  a larger reward later, I want to be patient but fear that waiting will only make me
  easier to fool.
- **Lived moment:** A preschooler sits before one marshmallow after the experimenter has
  kept or broken earlier promises about art supplies.
- **Audience language (signal, not proof):** A December 2025 discussion challenged the
  familiar willpower framing and commenters connected willingness to wait with whether
  adults and home environments had been reliable. That supports the trust dilemma, not
  the post's stronger interpretation or any causal claim.
  [Current discussion](https://www.reddit.com/r/Discussion/comments/1pkktyo/the_marshmallow_test_was_never_really_about/)
- **Mechanism:** Waiting can be a decision under uncertainty and learned reliability
  rather than a pure test of character.
- **Payoff:** Reframe patience as a bet on whether the promised future is credible and an
  immediate choice as potentially rational rather than morally inferior.
- **Boundary:** Context does not explain every result; a 2026 study found no overall
  trustworthiness effect on wait time.
- **Evidence:** [Kidd et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC3730121/),
  [2025 cooperative-delay study](https://doi.org/10.1098/rsos.250392),
  [2026 Japanese study](https://doi.org/10.1111/desc.70185).

**Verdict:** PASS. The first angle makes an everyday interface uncertainty concrete; the
second finds a consequential trust dilemma. Neither substitutes drama for a deliverable
claim.

### Forward result: Sudoku

#### Angle A

- **Title:** `Why a Standard Sudoku Needs at Least 17 Clues`
- **Shared fascination (first person):** When I stare at an ultra-sparse 9×9 grid and
  cannot place a number, I want to know whether I missed the logic or the puzzle never
  supplied enough information—because otherwise I may waste the solve guessing at an
  answer that was never inevitable.
- **Lived moment:** A solver opens a hard puzzle, counts fewer than 17 givens, fills pages
  with candidates, and discovers that the printed answer is only one possible completion.
- **Audience language (signal, not proof):** In a June 2025 discussion, a beginner posted
  a sparse grid and asked whether it was even possible; the replies focused on uniqueness,
  missing givens, and where a solver could start. That supports the solver's exact
  fascination, while the proof itself comes from the paper below.
  [Current discussion](https://www.reddit.com/r/sudoku/comments/1ladzhv)
- **Mechanism:** A unique solution requires the clues to eliminate every alternative
  completed grid; exhaustive unavoidable-set analysis proved that no 16-clue standard
  Sudoku has one solution.
- **Payoff:** Understand the information floor beneath the familiar puzzle and why
  uniqueness and human solving difficulty are different properties.
- **Boundary:** The result applies to classic 9×9 one-solution Sudoku; 17 clues are
  necessary, not sufficient or automatically difficult.
- **Evidence:** [McGuire, Tugemann, and Civario](https://arxiv.org/abs/1201.0749).

#### Angle B

- **Title:** `Does Sudoku Make You Smarter—or Just Better at Sudoku?`
- **Shared tension (first person):** When my daily Sudoku times keep falling but nothing
  outside the app feels easier, I want to know whether I am building general reasoning and
  memory or learning only the grid's recurring patterns—because that changes what my
  practice is actually worth.
- **Lived moment:** A daily solver completes hard puzzles twice as fast as last year but
  notices no obvious change outside the app.
- **Audience language (signal, not proof):** In a January 2025 discussion, a player asked
  whether Sudoku makes people smarter or merely better at Sudoku and questioned how its
  skills transfer elsewhere. That supports the exact audience question, not an answer
  about transfer.
  [Current discussion](https://www.reddit.com/r/stupidquestions/comments/1i72z34)
- **Mechanism:** Learning transfer usually weakens as the new task becomes less like the
  trained one.
- **Payoff:** Separate genuine Sudoku mastery from unsupported claims about broad
  intelligence, memory, or cognitive protection.
- **Boundary:** A large number-puzzle study was cross-sectional, self-reported, and not
  Sudoku-only; a broad brain-training review neither proves that Sudoku has no transfer nor
  establishes broad benefit.
- **Evidence:** [Brooker et al.](https://pubmed.ncbi.nlm.nih.gov/30746778/),
  [Simons et al.](https://pubmed.ncbi.nlm.nih.gov/27697851/).

**Verdict:** PASS. Both angles begin from specific game fascinations and honest questions;
neither manufactures distress to make the explicit-game subject feel important.

## Criterion-by-criterion cued-probe verdict

| Criterion | Nostalgia A | Nostalgia B | Waiting A | Waiting B | Sudoku A | Sudoku B |
|---|---|---|---|---|---|---|
| 1. Specific personal nerve | **PASS** — identity continuity | **PASS** — memory versus real decline | **PASS** — uncertainty at 99% | **PASS** — patience versus being fooled | **PASS** — missed logic versus invalid puzzle | **PASS** — mastery versus broad ability |
| 2. Person, moment, object, consequence | **PASS** — I / hard move / Pokémon save / restored self | **PASS** — I / abandoned releases / childhood favorite / what to seek next | **PASS** — I / before call / stalled update / missed call | **PASS** — I / broken promise / delayed reward / exploitation | **PASS** — I / stuck solve / sparse grid / wasted guessing | **PASS** — I / faster daily solves / app / value of practice |
| 3. Current audience language kept separate from proof | **PASS** — 2025 comfort-game discussion | **PASS** — 2024 old-versus-new discussion | **PASS** — 2025 stalled-bar discussion | **PASS** — 2025 trust-framing discussion | **PASS** — 2025 sparse-grid discussion | **PASS** — 2025 transfer question |
| 4. Direct mechanism plus evidence boundary | **PASS** — memory cues; no treatment claim | **PASS** — selected-memory comparison; real design change allowed | **PASS** — score and temporal attention; small-study limit | **PASS** — learned reliability; contrary 2026 result | **PASS** — unavoidable sets; classic 9×9 only | **PASS** — transfer distance; observational limits |
| 5. Deliverable title and payoff | **PASS** — separates continuity, competence, relationship | **PASS** — gives a fair comparison method | **PASS** — explains why an identical wait feels different | **PASS** — reframes the promised future as a credibility bet | **PASS** — explains the 17-clue floor and what it does not mean | **PASS** — separates mastery from unsupported broad benefit |
| 6. No manufactured suffering | **PASS** — organic identity desire | **PASS** — organic quality dilemma | **PASS** — ordinary interface uncertainty | **PASS** — real trust dilemma without moral panic | **PASS** — mathematical fascination | **PASS** — honest learning question |

## Evaluation conclusion

The baseline failure began with a mechanism and attached broad relevance. When explicitly
cued to apply the updated fields, all six edited proposals could be expressed through a
recognizable person, moment, object, and tension, followed by a bounded mechanism and
payoff. That is evidence that the method is usable across several kinds of material, not
proof that a neutral evaluator will reliably discover the nerve without prompting.
Nostalgia and Waiting were unfamiliar development subjects; Sudoku demonstrates
application to an explicit game but not unfamiliar generalization because it already
appeared in WHP materials.

The forward runs test method application, not audience demand or episode selection. None of
these topics or packages is a WHP winner, backlog addition, or approved episode.
