"""Render a few realistic scenes and write what the Python pipeline makes of them, for
wasm_bench.mjs to check the lab's browser path against: the frame and the detector's letterboxed
square as raw RGBA, and Python's corners, sharpness and int8 embedding of the detected warp."""
from __future__ import annotations

import glob
import json

import cv2
import numpy as np

import bench_lib as bl
from common import IMG, ROOT


def main():
    out_dir = ROOT / "parity"
    out_dir.mkdir(exist_ok=True)
    files = sorted(glob.glob(str(IMG / "*" / "*_front.jpg")))[:2000:400]
    hc, e8 = bl.HcDetector(1, "letterbox"), bl.DhvEmbedder("int8", 1)
    out = []
    for i, f in enumerate(files):
        img, _ = bl.render(bl.read_rgb(f), "realistic", 0, seed=100 + i)
        H, W = img.shape[:2]
        S = max(H, W)
        pad = np.zeros((S, S, 3), np.uint8)
        ox, oy = (S - W) // 2, (S - H) // 2
        pad[oy:oy + H, ox:ox + W] = img
        sq = cv2.resize(pad, (384, 384), interpolation=cv2.INTER_AREA)
        det, sharp = hc(img)
        emb = e8([bl.warp(img, det)])[0]
        np.dstack([img, np.full(img.shape[:2], 255, np.uint8)]).tofile(str(out_dir / f"frame{i}.rgba"))
        np.dstack([sq, np.full(sq.shape[:2], 255, np.uint8)]).tofile(str(out_dir / f"square{i}.rgba"))
        out.append({"i": i, "w": W, "h": H, "det": det.tolist(), "sharp": sharp, "emb": emb.tolist()})
    (out_dir / "expected.json").write_text(json.dumps(out))
    print(len(out), "scenes")


if __name__ == "__main__":
    main()
