"""Step 3: embed the galleries.

dhv_fp32 and dhv_int8 embed every image in single + multi + all (incrementally, per model: a
key already in that model's file is not embedded again for it); dino embeds the same set (it is
the fallback, judged on the same splits; its CPU cost is ~3x the dhvazquez model's). The clean Scryfall image IS
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
    # incremental, per model: each model's cache keeps what an earlier run embedded and fills only
    # the keys IT lacks, so an interrupted paired run that saved one model and not the other leaves
    # the other to finish its own keys rather than treating them as done.
    have = {}
    for n in names:
        f = OUT / f"gallery_{n}.npz"
        if f.exists():
            z = np.load(f)
            have[n] = (list(z["keys"]), z["emb"])
        else:
            have[n] = ([], None)
    missing = {n: {f"{s}_{fc}" for s, fc in keys} - set(have[n][0]) for n in names}
    todo = [k for k in keys if any(f"{k[0]}_{k[1]}" in missing[n] for n in names)]
    out = {n: [] for n in names}
    chunks = [todo[i:i + 16] for i in range(0, len(todo), 16)]
    t0 = time.time()
    with mp.get_context("spawn").Pool(WORKERS, initializer=init, initargs=(names,)) as pool:
        for i, r in enumerate(pool.imap(work, chunks)):
            for n in names:
                out[n].append(r[n])
            if i % 200 == 0:
                print(f"{names} {i * 16}/{len(todo)} {time.time() - t0:.0f}s", flush=True)
    todo_keys = [f"{s}_{f}" for s, f in todo]
    for n in names:
        emb = np.concatenate(out[n]).astype(np.float32) if out[n] else None
        # keep only the rows this model lacked; a key another model was missing is not re-added
        idx = [i for i, k in enumerate(todo_keys) if k in missing[n]]
        new_keys = [todo_keys[i] for i in idx]
        new_emb = emb[idx] if emb is not None and idx else None
        old_keys, old_emb = have[n]
        if new_emb is None:
            if old_emb is None:
                continue
            all_keys, all_emb = old_keys, old_emb
        elif old_emb is None:
            all_keys, all_emb = new_keys, new_emb
        else:
            all_keys, all_emb = old_keys + new_keys, np.concatenate([old_emb, new_emb])
        np.savez(OUT / f"gallery_{n}.npz", keys=np.array(all_keys), emb=all_emb)
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
