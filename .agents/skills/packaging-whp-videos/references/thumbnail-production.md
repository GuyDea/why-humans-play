# Thumbnail Production

Turn the three winning packages into rendered thumbnails: brief → prompt → 5 renders
→ best-of selection → compositing notes.

## Write one brief per winner

- **Package:** the title half (verbatim) and the one question the pair opens — the
  render must complete that sentence, not restate it.
- **Route and emotion to win:** e.g. pure-concept / curiosity; face-led / skeptical
  intrigue. Never open-mouth shock — the register is genuine skeptical-curious.
- **Visual:** the single focal idea, ≤3 elements, what a viewer reads in one glance
  at phone size.
- **Overlay:** 0–3 words, never words from the title.
- **Brand:** charcoal `#323232`–`#3b3b3b`, accent green `#309420`, off-white `#f8f8f8`;
  charcoal grounds need a bright rim or off-white mass for dark-mode separation;
  accent red as accent, never dominant field.
- **References:** 3–5 outlier thumbnails from the patterns brief (structure
  inspiration, not copying) and any prior WHP renders for series consistency.

## Author the prompt

One prompt per winner; the 5 variants come from re-sampling the same prompt, not
from prompt edits. Write prompts that:

- describe a photographic/editorial premium image, not an illustration of a
  "YouTube thumbnail" (naming the genre invites the clickbait look);
- name composition explicitly: focal subject, its position, gaze direction, negative
  space for the overlay, 16:9;
- specify the overlay text verbatim in quotes with placement and color — the chosen
  model renders legible text (that is why it was chosen);
- forbid the failure modes: no extra text, no logos, no watermark, no plastic-skin AI
  gloss, no clutter;
- pass reference images for any real asset that must be exact.

## Render

```bash
python3 scripts/gen_thumbnails.py --concepts <episode>/packaging/concepts.json \
    --out <episode>/packaging/renders --variants 5
```

`concepts.json` is a list of `{"id", "prompt", "refs": [paths...]}` objects. Output:
`<id>_v1.png` … `<id>_v5.png` at 1280×720 (15 files for a full trio). Re-render a
single concept with `--only <id>`.

## Select and composite

Build the contact sheet (`scripts/contact_sheet.py`) and pick the best render per
concept at 160×90 — judge at small size first, full size second. Then apply
compositing notes before anything ships:

- The real WHP mark comes from `whp-branding/whp-logo.svg` — composite it; never
  ship a model-drawn approximation of the brand mark.
- A face-led winner uses a stand-in render only for layout; the shipping thumbnail
  needs Martin photographed with the same framing, lighting, and expression register.
- Fix overlay text imperfections in an editor rather than re-rolling a render whose
  composition already wins.

Record per winner: chosen variant, rejected-variant reasons in one line each, and
outstanding compositing work.
