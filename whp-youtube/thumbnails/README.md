> **Rebrand note (2026-08-05):** the brand accent changed from red `#aa0a0a` to green
> `#309420`. Concepts and renders below predate the rebrand; re-render any reused
> concept with the green accent (red-bar descriptions read as green-bar now).

# Episode 1 — Title & Thumbnail Prototypes

Working set for **EP1: the evolutionary paradox of play**. Prototypes generated with
Nano Banana Pro (`gemini-3-pro-image`) via [`gen_thumbnails.py`](gen_thumbnails.py);
prompts in [`concepts.json`](concepts.json); renders in [`output/`](output/).

**Packaging law (see ../STEERING.md Law 1):** the thumbnail *shows* the paradox, the
title *tells* it — they must not repeat each other. Pairings below respect that.

## Prototypes

| ID | Concept | Route | Overlay | Best-paired title |
|----|---------|-------|---------|-------------------|
| **A** | Host, genuine skeptical face + red-bar brain | Face-led | "WHY PLAY?" | *Evolution Should Have Deleted This. It Didn't.* |
| **B** | Fox caught mid-leap on charcoal | Animal/object-led | "POINTLESS?" | *The Most Wasteful Thing in Nature Built Your Brain* |
| **C** | Before/after split: dim brain vs. red-lit brain | Pure concept (strongest gap) | "DELETE?" | *Evolution Tried to Delete Play. Your Brain Is Why It Failed.* |
| **D** | Brand mark: the red bar is a leaping figure | Brand-identity anchor | "PLAY" | *Why Every Intelligent Animal Plays* |
| **E** | Who-plays lineup: lizard ✕ / crow ✓ / dolphin ✓ / human ✓ | Pattern reveal | "WHO PLAYS?" | *There's a Hidden Rule About Which Animals Play* |
| **F** | Host contemplating a glowing red-bar brain | Face-led (Veritasium "looking-at-object") | "USELESS?" | *Play Looks Useless. It's Why You're Smart.* |

## Prototypes — v2 (premium/cinematic, away from the diagram-brain look)

Prompts in [`concepts_v2.json`](concepts_v2.json). Generated after feedback that the
red-brain concepts read as generic clickbait.

| ID | Concept | Route | Overlay | Best-paired title |
|----|---------|-------|---------|-------------------|
| **G** | Wild raven tumbling mid-play, near-monochrome | Premium wildlife (quiet) | "play" | *Why the Smartest Animals Waste the Most Time* |
| **H** | Suited adult on all fours chasing a red marble | Human paradox (**lead**) | "WHY?" | *The Most Important Thing You Do Looks Completely Pointless* |
| **I** | Fox kit leaping in play, predator looming behind | Danger paradox (**co-lead**) | "DEADLY?" | *Why Do Animals Risk Their Lives Just to Play?* |
| **J** | Brain built from playground equipment + blocks | Distinctive illustration / series look | "PLAY" | *The Pointless Habit That Built the Human Mind* |
| **K** | Lone tiny goalie in a vast empty goal, red ball | Suits "unnecessary obstacle" paradox | "ON PURPOSE?" | *Why Would Anyone Make a Game Harder on Purpose?* |

**Current recommendation:** champion **H** (original, premium, on-brand for *why HUMANS play*,
self-contained paradox, perfect at phone size), A/B challenger **I** (highest emotional
scroll-stop — cute-animal-in-peril travels to the widest audience). **J** is the best
series-identity anchor. This supersedes the earlier "split-brain C" pick.

## Notes / not-yet-real

- **Faces (A, F) are a stand-in presenter** to show layout + the correct *expression register*
  (genuine skeptical-curious, NOT MrBeast shock). Reshoot with Martin using the same framing,
  lighting (hard key + rim on charcoal seamless), and expression.
- **The bar-brain reads as heart/soundwave-ish** in the model renders. For finals, composite the
  real WHP brain mark ([`../../whp-branding/whp-logo.svg`](../../whp-branding/whp-logo.svg)) rather
  than model-generating it, so brand identity is exact.
- **Ship a Test & Compare trio** (YouTube picks the winner by CTR): one face (A), one pure-concept
  (C), one brand-native (D or pattern-reveal E). That trio also answers fastest whether the
  host's face is an asset for this channel.
- **Keep the gap honest** — every overlay question is truthfully answered in the video.

## Regenerate / iterate

```
cd why-humans-play_sources/whp-youtube/thumbnails
python3 gen_thumbnails.py --only C            # one concept
python3 gen_thumbnails.py                      # all concepts in concepts.json
```
Edit `concepts.json` prompts to iterate; outputs overwrite by `id`.
