# Package Evaluation

Three layers, in order of cost. No layer approves a package — evaluation informs the
trio ranking; Martin decides. Nothing here predicts absolute CTR; no credible
pre-publish predictor exists. These layers catch legibility failures, dishonest
promises, and weak halves before impressions are spent on them.

## Layer 1 — Mechanical lint (always)

- **Contact sheet:** `scripts/contact_sheet.py` renders every variant at 160×90 with
  a grayscale row. Kill any render whose subject, emotion, or overlay dies at that
  size or whose hierarchy dies in grayscale.
- **Feed mockups:** `scripts/feed_mockup.py` places the package — thumbnail plus
  truncated title, exactly as feeds render it — into light and dark feed grids among
  the competitor thumbnails saved by the outlier sweep. Judge: does it separate from
  the UI ground? Does it win or lose the glance against its real neighbors? Does the
  truncated title still carry the promise?
- **Checklist:** ≤3 elements, overlay ≤3 words and disjoint from the title, nothing
  critical bottom-right, title ≤ ~60 chars with decisive words in first ~40.

## Layer 2 — Cold-viewer panel (before any trio recommendation)

Dispatch one fresh-context subagent per persona. Each receives ONLY the feed mockup
image (or the pair as image + title text), never the episode, the scores, or the
drafting rationale — a panelist who knows the episode cannot model a cold viewer.

Personas (default seven; vary wording per episode, keep coverage): curious
generalist scrolling mobile at night; science-video regular (watches Veritasium/
Kurzgesagt); casual viewer with no science habit; skeptic who distrusts clickbait;
non-native English speaker; person living the episode's problem; returning WHP
subscriber.

Each panelist answers exactly:

1. **Stop?** Would this stop your scroll in that feed? (yes/no + one-line reason)
2. **Click?** Would you click over the neighbors shown? (yes/no + one-line reason)
3. **Expected payoff:** What exactly do you expect this video to show or prove?
4. **Suspicion:** Anything that smells like bait or confuses you?

Aggregate honestly: report counts, not vibes. Then run the **honesty check**: compare
every panelist's expected payoff against what the episode actually delivers. A
package whose expected payoff the episode does not deliver fails outright — that is
the clickbait line, found before publish instead of in the retention graph.

## Layer 3 — Saliency (when renders exist)

`scripts/saliency_score.py` runs DeepGaze IIE (a fixation-prediction model trained on
human gaze) on each finalist at feed size and writes a heatmap overlay. Read it as a
legibility instrument only: attention should land on the focal subject and overlay,
not the background. It predicts gaze, not clicks. If the stack is not installed the
script prints the install steps; install rather than skip — evaluation rigor is not
budget-capped for this channel.

## Output

Append to the packaging record: lint verdicts per variant, panel table (persona ×
four answers), honesty-check result per package, saliency notes, and the final
ranked trio with one paragraph per package stating why it ranks where it does and
what live signal would prove the ranking wrong.
