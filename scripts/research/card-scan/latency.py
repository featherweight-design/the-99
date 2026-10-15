"""Per-stage latency on this machine's CPU, one thread (what a phone's single WASM thread is closest
to), each stage timed alone over many runs. Prints the median and the minimum, and the load average,
because the machine is shared: the minimum is the cleanest reading of what a stage costs.
"""
from __future__ import annotations

import glob
import os
import platform
import time

import numpy as np

import bench_lib as bl
from common import IMG

RUNS = 40


def timeit(f, n=RUNS):
    f()
    xs = []
    for _ in range(n):
        t0 = time.perf_counter()
        f()
        xs.append((time.perf_counter() - t0) * 1000)
    return np.median(xs), min(xs)


def main():
    print("machine", platform.machine(), platform.processor(), "load", os.getloadavg())
    card = bl.read_rgb(sorted(glob.glob(str(IMG / "*" / "*_front.jpg")))[5])
    img, true = bl.render(card, "realistic", 0, seed=3)
    crop = bl.warp(img, true)
    hc = bl.HcDetector(1, "letterbox")
    pose = bl.DhvPose(1)
    e32, e16, e8 = bl.DhvEmbedder("fp32", 1), bl.DhvEmbedder("fp16", 1), bl.DhvEmbedder("int8", 1)
    dino = bl.DinoEmbedder(1)
    rows = [
        ("HanClinto detector (384, fp32)", lambda: hc(img)),
        ("dhvazquez pose (640, fp32)", lambda: pose(img)),
        ("warp to 448x320 (OpenCV)", lambda: bl.warp(img, true)),
        ("dhvazquez embedder fp32", lambda: e32([crop])),
        ("dhvazquez embedder fp16", lambda: e16([crop])),
        ("dhvazquez embedder int8", lambda: e8([crop])),
        ("DINOv2-small fp32 (224x168)", lambda: dino([crop])),
    ]
    for name, f in rows:
        med, mn = timeit(f, 15 if "pose" in name or "DINO" in name else RUNS)
        print(f"| {name} | {med:.1f} | {mn:.1f} |")
    for n, d in ((34383, 256), (49492, 256), (103823, 256), (34383, 384), (103823, 384)):
        G = np.random.default_rng(0).standard_normal((n, d)).astype(np.float32)
        q = G[0].copy()
        med, mn = timeit(lambda: np.argpartition(-(G @ q), 60)[:60])
        print(f"| brute-force kNN {n} x {d} fp32 (numpy) | {med:.2f} | {mn:.2f} |")
    print("load after", os.getloadavg())


if __name__ == "__main__":
    main()
