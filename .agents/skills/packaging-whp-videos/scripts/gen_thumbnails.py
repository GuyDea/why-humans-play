#!/usr/bin/env python3
"""
Generate WHP thumbnail renders with Google Nano Banana Pro (gemini-3-pro-image),
chosen because it renders legible in-image text and accepts reference images.

Reads concepts from a JSON file: a list of {"id", "prompt", "refs": [image paths]}
objects ("attachments" is accepted as a legacy alias for "refs"). For each concept it
generates --variants independent samples of the SAME prompt (the skill's 3x5
contract), fits each to exactly 1280x720, and writes <id>_v<N>.png under --out
(raw model output under <out>/raw/).

API key: GEMINI_API_KEY env var or /home/martin/env-secrets/gemini.properties.

Usage:
  python3 gen_thumbnails.py --concepts concepts.json --out renders --variants 5
  python3 gen_thumbnails.py --concepts concepts.json --out renders --only W1
"""
import argparse, base64, json, os, sys, time
import requests
from PIL import Image
from io import BytesIO

DEFAULT_PROPS = "/home/martin/env-secrets/gemini.properties"
DEFAULT_MODEL = "gemini-3-pro-image"   # Nano Banana Pro
API_ROOT = "https://generativelanguage.googleapis.com/v1beta"
W, H = 1280, 720                       # YouTube thumbnail
MAX_TRIES = 4


def load_key(props_path):
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ["GEMINI_API_KEY"].strip()
    if not os.path.exists(props_path):
        sys.exit(f"ERROR: no GEMINI_API_KEY env var and no properties file at {props_path}")
    with open(props_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k.strip() == "GEMINI_API_KEY":
                return v.strip().strip('"').strip("'")
    sys.exit(f"ERROR: GEMINI_API_KEY not found in {props_path}")


def part_for_image(path):
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    return {"inlineData": {"mimeType": "image/png", "data": data}}


def extract_image(resp_json):
    fb = resp_json.get("promptFeedback", {})
    if fb.get("blockReason"):
        return None, f"prompt blocked: {fb['blockReason']}"
    for cand in resp_json.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"]), None
        fr = cand.get("finishReason")
        if fr and fr not in ("STOP", "MAX_TOKENS"):
            return None, f"finishReason={fr}"
    txt = ""
    for cand in resp_json.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            if part.get("text"):
                txt += part["text"][:200]
    return None, f"no image in response{(' — said: ' + txt) if txt else ''}"


def config_ladder(aspect_ratio):
    return [
        {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": aspect_ratio}},
        {"responseModalities": ["IMAGE"]},
        {"responseModalities": ["TEXT", "IMAGE"]},
        None,
    ]


def call_api(key, model, prompt, attachments, aspect_ratio, verbose=True):
    url = f"{API_ROOT}/models/{model}:generateContent"
    headers = {"x-goog-api-key": key, "Content-Type": "application/json"}
    parts = [{"text": prompt}] + [part_for_image(p) for p in attachments]
    for cfg in config_ladder(aspect_ratio):
        body = {"contents": [{"role": "user", "parts": parts}]}
        if cfg is not None:
            body["generationConfig"] = cfg
        for attempt in range(1, MAX_TRIES + 1):
            try:
                r = requests.post(url, headers=headers, json=body, timeout=240)
            except requests.RequestException as e:
                if verbose: print(f"      network error ({e}); retrying", flush=True)
                time.sleep(3 * attempt); continue
            if r.status_code == 200:
                img, reason = extract_image(r.json())
                if img:
                    return img
                if verbose: print(f"      no image ({reason}); retry {attempt}/{MAX_TRIES}", flush=True)
                time.sleep(2 * attempt); continue
            if r.status_code in (429, 500, 503):
                if verbose: print(f"      HTTP {r.status_code}; backing off", flush=True)
                time.sleep(5 * attempt); continue
            if r.status_code == 400:
                if verbose: print(f"      HTTP 400 with config {cfg}; trying simpler config", flush=True)
                break
            sys.exit(f"ERROR: HTTP {r.status_code} from API: {r.text[:400]}")
    return None


def fit_exact(img_bytes, w, h):
    img = Image.open(BytesIO(img_bytes)).convert("RGB")
    scale = max(w / img.width, h / img.height)      # cover: fill, center-crop
    nw, nh = round(img.width * scale), round(img.height * scale)
    img = img.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - w) // 2, (nh - h) // 2
    return img.crop((left, top, left + w, top + h))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--concepts", required=True, help="path to a concepts JSON file")
    ap.add_argument("--out", required=True, help="output directory for renders")
    ap.add_argument("--variants", type=int, default=5,
                    help="independent samples per concept prompt (default 5)")
    ap.add_argument("--only", help="generate just this concept id")
    ap.add_argument("--props", default=DEFAULT_PROPS)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--sleep", type=float, default=2.0)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    key = None if args.dry_run else load_key(args.props)
    with open(args.concepts) as f:
        concepts = json.load(f)
    if args.only:
        concepts = [c for c in concepts if c["id"] == args.only]
        if not concepts:
            sys.exit(f"no concept with id {args.only}")

    concepts_dir = os.path.dirname(os.path.abspath(args.concepts))
    raw_dir = os.path.join(args.out, "raw")
    os.makedirs(raw_dir, exist_ok=True)
    total = len(concepts) * args.variants
    done = 0
    for c in concepts:
        cid = c["id"]
        refs = c.get("refs", c.get("attachments", []))
        # Resolve reference paths relative to the concepts file.
        refs = [r if os.path.isabs(r) else os.path.join(concepts_dir, r) for r in refs]
        for v in range(1, args.variants + 1):
            done += 1
            print(f"[{done}/{total}] {cid} v{v}", flush=True)
            if args.dry_run:
                continue
            img = call_api(key, args.model, c["prompt"], refs, "16:9")
            if not img:
                print("      FAILED after retries", flush=True)
                continue
            with open(os.path.join(raw_dir, f"{cid}_v{v}.png"), "wb") as fp:
                fp.write(img)
            fit_exact(img, W, H).save(os.path.join(args.out, f"{cid}_v{v}.png"))
            print(f"      OK -> {args.out}/{cid}_v{v}.png", flush=True)
            if done < total:
                time.sleep(args.sleep)
    print("\nDone.")


if __name__ == "__main__":
    main()
