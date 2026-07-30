#!/usr/bin/env python3
"""
Build a phone-size contact sheet from a directory of thumbnail renders.

Groups <id>_v<N>.png files by concept id (any other .png is its own group), renders
each variant at 160x90 (the feed glance size) in a color row with a grayscale row
directly beneath it, and labels every cell. Judge renders HERE first: whatever dies
at this size or in grayscale is dead.

Usage:
  python3 contact_sheet.py <renders-dir> --out contact_sheet.png
"""
import argparse, os, re, sys
from collections import OrderedDict
from PIL import Image, ImageDraw, ImageFont, ImageOps

CELL_W, CELL_H = 160, 90
PAD = 12
LABEL_H = 16
BG = (34, 34, 34)
FG = (240, 240, 240)


def font(size=11, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    for base in ("/usr/share/fonts/truetype/dejavu",):
        p = os.path.join(base, name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def collect(renders_dir):
    groups = OrderedDict()
    names = sorted(n for n in os.listdir(renders_dir) if n.lower().endswith(".png"))
    for name in names:
        m = re.match(r"(.+)_v(\d+)\.png$", name)
        gid = m.group(1) if m else os.path.splitext(name)[0]
        groups.setdefault(gid, []).append(os.path.join(renders_dir, name))
    return groups


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("renders_dir")
    ap.add_argument("--out", default="contact_sheet.png")
    args = ap.parse_args()

    groups = collect(args.renders_dir)
    if not groups:
        sys.exit(f"no .png files in {args.renders_dir}")

    cols = max(len(v) for v in groups.values())
    group_h = LABEL_H + 2 * (CELL_H + PAD)          # label + color row + gray row
    width = PAD + cols * (CELL_W + PAD)
    height = PAD + len(groups) * (group_h + PAD)
    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    f_label = font(12, bold=True)

    y = PAD
    for gid, paths in groups.items():
        draw.text((PAD, y), f"{gid}  (color / grayscale @160x90)", font=f_label, fill=FG)
        y += LABEL_H
        for row, gray in enumerate((False, True)):
            x = PAD
            for p in paths:
                img = Image.open(p).convert("RGB").resize((CELL_W, CELL_H), Image.LANCZOS)
                if gray:
                    img = ImageOps.grayscale(img).convert("RGB")
                sheet.paste(img, (x, y))
                draw.text((x + 2, y + CELL_H - 12), os.path.basename(p)[:-4],
                          font=font(9), fill=(255, 255, 0))
                x += CELL_W + PAD
            y += CELL_H + PAD
        y += PAD

    sheet.save(args.out)
    print(f"OK -> {args.out}  ({len(groups)} concepts, {cols} variants max)")


if __name__ == "__main__":
    main()
