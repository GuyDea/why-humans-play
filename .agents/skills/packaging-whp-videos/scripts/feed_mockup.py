#!/usr/bin/env python3
"""
Render a package (thumbnail + title) inside simulated YouTube feeds, light and dark,
among real competitor thumbnails — the package is judged exactly as a viewer meets
it: image and truncated title together, next to its actual neighbors.

Competitors: a directory of .png/.jpg files. A competitor's title is read from a
sidecar <name>.txt when present, otherwise derived from its filename.

Output: <out>/feed_light.png and <out>/feed_dark.png (mobile-style single-column
list), package inserted deterministically at position 3.

Usage:
  python3 feed_mockup.py --package renders/W1_v2.png "The Title Half Here" \\
      --competitors ../packaging/mockups/competitors --out mockups
"""
import argparse, os, sys, textwrap
from PIL import Image, ImageDraw, ImageFont

THUMB_W, THUMB_H = 360, 202
MARGIN = 16
TITLE_TRUNC = 70          # chars shown before ellipsis (approximates 2-line mobile clamp)
ROW_H = THUMB_H + 64

THEMES = {
    "light": {"bg": (255, 255, 255), "fg": (15, 15, 15), "sub": (96, 96, 96)},
    "dark": {"bg": (15, 15, 15), "fg": (241, 241, 241), "sub": (170, 170, 170)},
}


def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    p = os.path.join("/usr/share/fonts/truetype/dejavu", name)
    return ImageFont.truetype(p, size) if os.path.exists(p) else ImageFont.load_default()


def load_competitors(comp_dir):
    items = []
    if not comp_dir or not os.path.isdir(comp_dir):
        return items
    for name in sorted(os.listdir(comp_dir)):
        if not name.lower().endswith((".png", ".jpg", ".jpeg")):
            continue
        path = os.path.join(comp_dir, name)
        sidecar = os.path.splitext(path)[0] + ".txt"
        if os.path.exists(sidecar):
            with open(sidecar) as f:
                title = f.read().strip()
        else:
            title = os.path.splitext(name)[0].replace("-", " ").replace("_", " ").title()
        items.append((path, title))
    return items


def truncate(title):
    return title if len(title) <= TITLE_TRUNC else title[: TITLE_TRUNC - 1].rstrip() + "…"


def draw_feed(rows, theme, out_path, marker_index):
    t = THEMES[theme]
    width = THUMB_W + 2 * MARGIN
    height = MARGIN + len(rows) * ROW_H
    feed = Image.new("RGB", (width, height), t["bg"])
    draw = ImageDraw.Draw(feed)
    f_title, f_sub = font(15, bold=True), font(12)
    y = MARGIN
    for i, (path, title) in enumerate(rows):
        img = Image.open(path).convert("RGB").resize((THUMB_W, THUMB_H), Image.LANCZOS)
        feed.paste(img, (MARGIN, y))
        lines = textwrap.wrap(truncate(title), width=42)[:2]
        ty = y + THUMB_H + 6
        for line in lines:
            draw.text((MARGIN, ty), line, font=f_title, fill=t["fg"])
            ty += 19
        draw.text((MARGIN, ty), "Channel · 12K views · 2 days ago", font=f_sub, fill=t["sub"])
        if i == marker_index:
            draw.rectangle([2, y - 4, width - 3, y + ROW_H - 2], outline=(170, 10, 10), width=2)
        y += ROW_H
    feed.save(out_path)
    print(f"OK -> {out_path}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--package", nargs=2, metavar=("THUMB", "TITLE"), required=True)
    ap.add_argument("--competitors", help="directory of competitor thumbnails")
    ap.add_argument("--out", default="mockups")
    args = ap.parse_args()

    thumb, title = args.package
    if not os.path.exists(thumb):
        sys.exit(f"package thumbnail not found: {thumb}")
    comps = load_competitors(args.competitors)
    if not comps:
        print("WARNING: no competitor thumbnails supplied; the mockup shows the "
              "package against itself only — judge UI separation, not the glance war.")
    pos = min(2, len(comps))
    rows = comps[:pos] + [(thumb, title)] + comps[pos:]
    rows = rows[:6]

    os.makedirs(args.out, exist_ok=True)
    for theme in ("light", "dark"):
        draw_feed(rows, theme, os.path.join(args.out, f"feed_{theme}.png"), pos)


if __name__ == "__main__":
    main()
