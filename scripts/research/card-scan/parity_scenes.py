"""Write the parity set wasm_bench.mjs checks the card-scan lab's browser path against.

What it writes, into $CARD_SCAN_DIR/parity/ (replacing whatever is there):
  frame{i}.rgba   the rendered scene, raw RGBA, 4 bytes a pixel, row major, w x h (720 x 960)
  square{i}.rgba  the detector's input before normalisation: the scene letterboxed to a centred
                  square and resized to 384 x 384 with INTER_AREA, raw RGBA
  expected.json   one entry per scene: {i, w, h, det, sharp, emb, emb32}
                  det    Python's corners for the scene (HanClinto detector, letterbox mode), in
                         scene pixels, the detector's own order
                  sharp  the detector's sharpness output
                  emb    the int8 embedder's L2-normalized embedding of the detected warp (256)
                  emb32  the fp32 embedder's L2-normalized embedding of the same warp (256); the
                         lab ships the fp32 embedder, so this is the reference wasm_bench's parity
                         figure is measured against, and wasm_bench refuses a set without it

The scenes are deterministic: the five printings in SCENES, each rendered from its cached front
image under the `realistic` condition at severity 0 with seed 100 + i, so every run writes the same
bytes. They are pinned by Scryfall id rather than picked from the cache, because the cache grows
(the first set, picked as every 400th of the first 2,000 images, changed under four of its five
scenes once download.py had fetched more). These five are that rule's picks on 2026-10-15.

It reads only cached weights (hc_det/fastweb-single-1.39.renamed.onnx and both dhv_embed builds,
from fetch_weights.py and fix_detector.py) and downloads nothing.

Run, from the repository root, with the spike's virtualenv:
  CARD_SCAN_DIR=... python scripts/research/card-scan/parity_scenes.py
then wasm_bench.mjs (see its header) for the per-scene corner error, sharpness and the fp32 and
int8 embedding cosines between Python and the lab's browser code."""
from __future__ import annotations

import json

import cv2
import numpy as np

import bench_lib as bl
from common import ROOT, img_path

SCENES = [
    "0000419b-0bba-4488-8f7a-6194544ce91e",
    "00fe59e8-d1ab-4f74-a7f4-a8feca3705ee",
    "01fe0af9-55b4-4390-8de4-2cd58aa7efde",
    "02fdc551-0b22-49f4-8765-143ad82f16a3",
    "04095ad2-7308-4e26-b9ef-070a5755d066",
]
SEED = 100


def rgba(img: np.ndarray) -> np.ndarray:
    return np.dstack([img, np.full(img.shape[:2], 255, np.uint8)])


def main():
    out_dir = ROOT / "parity"
    out_dir.mkdir(exist_ok=True)
    files = [img_path(sid) for sid in SCENES]
    missing = [str(f) for f in files if not f.is_file()]
    if missing:
        raise SystemExit("not in the image cache (download.py fetches them): " + ", ".join(missing))
    hc = bl.HcDetector(1, "letterbox")
    e8, e32 = bl.DhvEmbedder("int8", 1), bl.DhvEmbedder("fp32", 1)
    out = []
    for i, f in enumerate(files):
        img, _ = bl.render(bl.read_rgb(str(f)), "realistic", 0, seed=SEED + i)
        H, W = img.shape[:2]
        # the same letterbox HcDetector builds, kept so the lab's detector reads Python's exact input
        S = max(H, W)
        pad = np.zeros((S, S, 3), np.uint8)
        ox, oy = (S - W) // 2, (S - H) // 2
        pad[oy:oy + H, ox:ox + W] = img
        sq = cv2.resize(pad, (384, 384), interpolation=cv2.INTER_AREA)
        det, sharp = hc(img)
        crop = bl.warp(img, det)
        emb, emb32 = e8([crop])[0], e32([crop])[0]
        rgba(img).tofile(str(out_dir / f"frame{i}.rgba"))
        rgba(sq).tofile(str(out_dir / f"square{i}.rgba"))
        out.append({"i": i, "w": W, "h": H, "det": det.tolist(), "sharp": sharp,
                    "emb": emb.tolist(), "emb32": emb32.tolist()})
        print(f"scene {i}: {f.name} {W}x{H}, int8 vs fp32 cosine {float(emb @ emb32):.4f}")
    (out_dir / "expected.json").write_text(json.dumps(out))
    print(len(out), "scenes written to", out_dir)


if __name__ == "__main__":
    main()
