#!/usr/bin/env python3
"""
Generate WHP YouTube thumbnail prototypes with Google Nano Banana Pro
(gemini-3-pro-image) — chosen over Flash because it renders legible in-image text,
which is essential for thumbnails.

Reads concepts from concepts.json (same dir): a list of {"id","prompt"} objects.
Calls the Gemini REST API at 16:9, fits the result to exactly 1280x720, and writes
PNGs under ./output/ (raw model output under ./output/raw/).

API key: /home/martin/env-secrets/gemini.properties (key GEMINI_API_KEY) or the
GEMINI_API_KEY env var. Never printed or written into the repo.

Usage:
  python3 gen_thumbnails.py --only A            # one concept (smoke test)
  python3 gen_thumbnails.py                     # all concepts
  python3 gen_thumbnails.py --model gemini-2.5-flash-image   # cheaper/faster fallback
"""
import argparse, base64, json, os, sys, time
import requests
from PIL import Image
from io import BytesIO

HERE = os.path.dirname(os.path.abspath(__file__))
CONCEPTS = os.path.join(HERE, "concepts.json")
OUT = os.path.join(HERE, "output")
RAW = os.path.join(OUT, "raw")
DEFAULT_PROPS = "/home/martin/env-secrets/gemini.properties"
DEFAULT_MODEL = "gemini-3-pro-image"   # Nano Banana Pro
API_ROOT = "https://generativelanguage.googleapis.com/v1beta"
W, H = 1280, 720          # YouTube thumbnail
BG = (26, 26, 26)         # letterbox fill if aspect drifts (near brand charcoal)
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
    ap = argparse.ArgumentParser()
    ap.add_argument("--props", default=DEFAULT_PROPS)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--concepts", default=CONCEPTS, help="path to a concepts JSON file")
    ap.add_argument("--only", help="generate just this concept id (e.g. A)")
    ap.add_argument("--sleep", type=float, default=2.0)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    key = load_key(args.props)
    with open(args.concepts) as f:
        concepts = json.load(f)
    if args.only:
        concepts = [c for c in concepts if c["id"] == args.only]
        if not concepts:
            sys.exit(f"no concept with id {args.only}")

    os.makedirs(RAW, exist_ok=True)
    for i, c in enumerate(concepts, 1):
        cid = c["id"]
        atts = c.get("attachments", [])
        print(f"[{i}/{len(concepts)}] {cid}: {c.get('label','')}", flush=True)
        if args.dry_run:
            continue
        img = call_api(key, args.model, c["prompt"], atts, "16:9")
        if not img:
            print("      FAILED after retries", flush=True); continue
        with open(os.path.join(RAW, f"{cid}.png"), "wb") as fp:
            fp.write(img)
        final = fit_exact(img, W, H)
        final.save(os.path.join(OUT, f"{cid}.png"))
        print(f"      OK -> output/{cid}.png", flush=True)
        if i < len(concepts):
            time.sleep(args.sleep)
    print("\nDone.")


if __name__ == "__main__":
    main()
