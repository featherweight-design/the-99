"""Step 3: embed the galleries.

dhv_fp32 and dhv_int8 embed every image in single + multi + all (incrementally: a key already
in the file is not embedded again); dino embeds the same set (it is the fallback, judged on the
same splits; its CPU cost is ~3x the dhvazquez model's). The clean Scryfall image IS
the card, so it is resized straight to the embedder's input with no warp.

Writes CARD_SCAN_DIR/out/gallery_<embedder>.npz: keys ("<sid>_<face>"), embeddings (float32).
"""
from __future__ import annotations

import multiprocessing as mp
import sys
import time

import numpy as np

from common import OUT, img_path, load_json

WORKERS = int(sys.argv[1]) if len(sys.argv) > 1 else 10
_models = {}


def init(names):
    import bench_lib as bl
    for n in names:
        _models[n] = bl.DinoEmbedder(1) if n == "dino" else bl.DhvEmbedder(n.split("_")[1], 1)


def work(chunk):
    import bench_lib as bl
    imgs = [bl.read_rgb(img_path(s, f)) for s, f in chunk]
    return {n: m(imgs) for n, m in _models.items()}


def run(names, keys):
    # incremental: keep what an earlier run embedded, embed only the keys it lacks
    have = {}
    for n in names:
        f = OUT / f"gallery_{n}.npz"
        if f.exists():
            z = np.load(f)
            have[n] = (list(z["keys"]), z["emb"])
    done = set(have[names[0]][0]) if len(have) == len(names) else set()
    keys = [k for k in keys if f"{k[0]}_{k[1]}" not in done]
    out = {n: [] for n in names}
    chunks = [keys[i:i + 16] for i in range(0, len(keys), 16)]
    t0 = time.time()
    with mp.get_context("spawn").Pool(WORKERS, initializer=init, initargs=(names,)) as pool:
        for i, r in enumerate(pool.imap(work, chunks)):
            for n in names:
                out[n].append(r[n])
            if i % 200 == 0:
                print(f"{names} {i * 16}/{len(keys)} {time.time() - t0:.0f}s", flush=True)
    for n in names:
        new_keys = [f"{s}_{f}" for s, f in keys]
        new_emb = np.concatenate(out[n]).astype(np.float32) if out[n] else np.zeros((0, 1), np.float32)
        if n in have and len(done):
            new_keys = have[n][0] + new_keys
            new_emb = np.concatenate([have[n][1], new_emb]) if len(new_emb) else have[n][1]
        np.savez(OUT / f"gallery_{n}.npz", keys=np.array(new_keys), emb=new_emb)
    print(names, "done", f"{time.time() - t0:.0f}s", flush=True)


def main():
    sets = load_json(OUT / "sets.json")
    allk = sorted({(g["sid"], g["face"]) for g in sets["single"] + sets["multi"] + sets.get("all", [])})
    single = sorted({(g["sid"], g["face"]) for g in sets["single"]})
    which = sys.argv[2].split(",") if len(sys.argv) > 2 else ["dhv", "dino"]
    if "dhv" in which:
        run(["dhv_fp32", "dhv_int8"], allk)
    if "dino" in which:
        run(["dino"], allk)


if __name__ == "__main__":
    main()
