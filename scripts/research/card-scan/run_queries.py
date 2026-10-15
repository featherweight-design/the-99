"""Step 4: render synthetic phone photos, run them through the pipeline, and record what came back.

For each query scene:
  detector  HanClinto fastweb-single 1.39 (letterboxed 384 input): corners, sharpness, and the
            IoU of its quad against the true one. On a subset, dhvazquez's pose model as well.
  warp      the detected corners to 448x320, and separately the TRUE corners (a perfect crop),
            so a detector failure and an embedder failure can be told apart.
  match     cosine kNN, aggregated to ORACLE ids (an oracle's score is its best-scoring gallery
            image), against four galleries cut from one matrix of every printing:
              single      one reference per oracle (plan_sets.py)
              multi       one printing per illustration, query printings held out (plan_sets.py)
              all_heldout every printing EXCEPT the scene's own printing: the scene's scryfall id
                          is masked out per query, in `ranked` below (`exclude`). The main figure.
              all         every printing, the scene's own included ("own printing present")
            plus a top-10 vote over all_heldout and all.

Query sets (all deterministic):
  A  every query oracle: clean, realistic x2; the cross-printing query (or the reference when
     the oracle has one printing) and the same-printing control. dhv int8 is measured here.
  B  a 700-oracle subset: every augmentation at severity 1-3, cross-printing.
  C  subset B: every augmentation at severity 2, same-printing control.
  D  400 of B: DINOv2-small on clean, realistic and every augmentation at severity 2.
  F  300 of B: frame agreement. Blur and low light at severity 1-3, and the realistic mix, each
     rendered as 5 independent frames (rep 0-4, each its own seed) of the same printing.
  P  150 of B: dhvazquez's pose detector on every cell of A and B.
  N  600 scenes with no card: the detectors' scores, to set a card-present gate. Before
     2026-10-15 these drew the clutter background too, a whole card blurred to fill the frame;
     the report's figures come from that run (124 of the 600; see the report's Detector stage).

Writes CARD_SCAN_DIR/out/results.jsonl (one JSON object per scene).
"""
from __future__ import annotations

import base64
import json
import multiprocessing as mp
import sys
import time
import zlib

import numpy as np

from common import OUT, img_path, load_json

# the worker count is the first positional argument; flags such as --plan are not counts
_POSITIONAL = [a for a in sys.argv[1:] if not a.startswith("--")]
WORKERS = int(_POSITIONAL[0]) if _POSITIONAL else 10
SEV_CONDS = ["perspective", "blur", "low_light", "glare", "sleeve", "occlusion", "low_contrast", "foil"]
F_CONDS = ["blur", "low_light"]
N_B, N_D, N_F, N_P, N_NEG = 700, 400, 300, 150, 600

G = {}


def seed_of(*parts) -> int:
    return zlib.crc32("|".join(map(str, parts)).encode()) & 0x7FFFFFFF


def init():
    import bench_lib as bl
    cat = load_json(OUT / "catalog.json")
    sets = load_json(OUT / "sets.json")
    G["bl"] = bl
    G["hc"] = bl.HcDetector(1, "letterbox")
    G["pose"] = bl.DhvPose(1)
    G["e32"] = bl.DhvEmbedder("fp32", 1)
    G["e8"] = bl.DhvEmbedder("int8", 1)
    G["dino"] = bl.DinoEmbedder(1)
    oracle_ids = sorted(cat["oracles"])
    G["oracles"] = oracle_ids
    oi = {o: i for i, o in enumerate(oracle_ids)}
    G["single_list"] = sorted(f"{g['sid']}_{g['face']}" for g in sets["single"])
    all_rows = sets["all"]
    all_keys = [f"{g['sid']}_{g['face']}" for g in all_rows]
    G["all_oracle"] = np.array([oi[g["oracle_id"]] for g in all_rows])
    by_sid = {}
    for i, g in enumerate(all_rows):
        by_sid.setdefault(g["sid"], []).append(i)
    G["rows_of_sid"] = {k: np.array(v) for k, v in by_sid.items()}
    pos = {k: i for i, k in enumerate(all_keys)}
    G["subset"] = {
        "single": np.array(sorted(pos[f"{g['sid']}_{g['face']}"] for g in sets["single"])),
        "multi": np.array(sorted(pos[f"{g['sid']}_{g['face']}"] for g in sets["multi"])),
    }
    G["gal"] = {}
    for name in ("dhv_fp32", "dhv_int8", "dino"):
        z = np.load(OUT / f"gallery_{name}.npz")
        keys, emb = z["keys"], z["emb"]
        kp = {k: i for i, k in enumerate(keys)}
        missing = [k for k in all_keys if k not in kp]
        if missing:
            raise SystemExit(f"gallery_{name} lacks {len(missing)} images")
        G["gal"][name] = np.ascontiguousarray(emb[[kp[k] for k in all_keys]])


def ranked(scores, rows=None, exclude=None, vote=False, k=5):
    """Top-k ORACLES from per-row scores over the all-printings matrix, restricted to `rows`
    (a subset) and with `exclude` rows (the scene's own printing) masked out."""
    s = scores.copy()
    if exclude is not None:
        s[exclude] = -np.inf
    if rows is not None:
        sub = np.full_like(s, -np.inf)
        sub[rows] = s[rows]
        s = sub
    O = G["all_oracle"]
    if vote:
        # the vote counts the 10 nearest rows by design, so it can name fewer than k oracles
        idx = np.argpartition(-s, 10)[:10]
        idx = idx[np.argsort(-s[idx])]
        counts = {}
        for r in idx[:10]:
            o = int(O[r])
            c, best = counts.get(o, (0, -9.0))
            counts[o] = (c + 1, max(best, float(s[r])))
        order = sorted(counts.items(), key=lambda kv: (-kv[1][0], -kv[1][1]))
        return [[G["oracles"][o], round(v[1], 4)] for o, v in order[:k]]
    # Widen the candidate pool until it holds k distinct oracles among unmasked rows: a popular card
    # can fill the first 60 rows with its own printings, and a short list would understate top-k and,
    # with no runner-up, inflate the margin.
    n_live = int(np.isfinite(s).sum())
    if n_live == 0:
        return []
    pool = 60
    while True:
        pool = min(pool, n_live)
        idx = np.argpartition(-s, pool - 1)[:pool] if pool < len(s) else np.arange(len(s))
        idx = idx[np.isfinite(s[idx])]
        idx = idx[np.argsort(-s[idx])]
        seen, out = set(), []
        for r in idx:
            o = int(O[r])
            if o in seen:
                continue
            seen.add(o)
            out.append([G["oracles"][o], round(float(s[r]), 4)])
            if len(out) == k:
                return out
        if pool >= n_live:
            return out
        pool *= 4


def views(prefix, scores, own_sid, votes=True):
    own = G["rows_of_sid"].get(own_sid)
    res = {
        f"{prefix}/single": ranked(scores, rows=G["subset"]["single"]),
        f"{prefix}/multi": ranked(scores, rows=G["subset"]["multi"]),
        f"{prefix}/all_heldout": ranked(scores, exclude=own),
        f"{prefix}/all": ranked(scores),
    }
    if votes:
        res[f"{prefix}/all_heldout_vote"] = ranked(scores, exclude=own, vote=True)
        res[f"{prefix}/all_vote"] = ranked(scores, vote=True)
    return res


def work(job):
    bl = G["bl"]
    out = []
    if job["kind"] == "negative":
        for j in job["cells"]:
            rng = np.random.default_rng(j["seed"])
            # No clutter image: the clutter branch is a whole card (frame and text) blurred to fill
            # the frame, so an "empty" scene would hold a card. With None, background() redraws a
            # card-free kind; the other seeds keep exactly the background they drew before.
            img = bl.jpeg(bl.background(rng, None), 88)
            _, sharp = G["hc"](img)
            _, pscore = G["pose"](img)
            out.append({"kind": "negative", "hc_sharp": sharp, "pose_score": pscore})
        return out
    sid = job["sid"]
    card = bl.read_rgb(img_path(sid, "front"))
    for j in job["cells"]:
        clutter = bl.read_rgb(img_path(*G["single_list"][j["seed"] % len(G["single_list"])].rsplit("_", 1)))
        t0 = time.perf_counter()
        img, true = bl.render(card, j["cond"], j["sev"], j["seed"], clutter)
        t_render = time.perf_counter() - t0
        rec = {"qi": job["qi"], "kind": job["kind"], "cond": j["cond"], "sev": j["sev"], "rep": j["rep"],
               "sets": j["sets"], "res": {}, "t_render": t_render}
        t0 = time.perf_counter()
        det, sharp = G["hc"](img)
        rec["t_det"] = time.perf_counter() - t0
        rec["hc_iou"], rec["hc_sharp"] = bl.quad_iou(det, true), sharp
        crops = {"det": bl.warp(img, det), "gt": bl.warp(img, true)}
        only_frames = j["sets"] == ["F"]  # an extra agreement frame: the detector path is all it needs
        t0 = time.perf_counter()
        e = {k: G["e32"]([v])[0] for k, v in crops.items() if not (only_frames and k == "gt")}
        rec["t_emb"] = (time.perf_counter() - t0) / len(e)
        for k, v in e.items():
            t0 = time.perf_counter()
            scores = G["gal"]["dhv_fp32"] @ v
            rec["t_knn_all"] = time.perf_counter() - t0
            rec["res"].update(views(f"{k}/dhv32", scores, sid, votes=not only_frames))
        if "A" in j["sets"]:
            # kept so gallery-side variants can be re-scored offline
            rec["emb"] = {k: base64.b64encode(v.astype(np.float16).tobytes()).decode() for k, v in e.items()}
            for k, v in crops.items():
                rec["res"].update(views(f"{k}/dhv8", G["gal"]["dhv_int8"] @ G["e8"]([v])[0], sid, votes=False))
        if "D" in j["sets"]:
            for k, v in crops.items():
                rec["res"].update(views(f"{k}/dino", G["gal"]["dino"] @ G["dino"]([v])[0], sid, votes=False))
        if "P" in j["sets"]:
            pdet, pscore = G["pose"](img)
            rec["pose_iou"], rec["pose_score"] = bl.quad_iou(pdet, true), pscore
            pe = G["e32"]([bl.warp(img, pdet)])[0]
            rec["res"].update(views("pose/dhv32", G["gal"]["dhv_fp32"] @ pe, sid, votes=False))
        out.append(rec)
    return out


def plan():
    sets = load_json(OUT / "sets.json")
    cat = load_json(OUT / "catalog.json")
    qs = sets["queries"]
    order = sorted(range(len(qs)), key=lambda i: seed_of("subset", qs[i]["oracle_id"]))
    Bl = [i for i in order if qs[i]["query"]][:N_B]
    B = set(Bl)
    D, F, P = set(Bl[:N_D]), set(Bl[:N_F]), set(Bl[:N_P])
    jobs = []
    for qi, q in enumerate(qs):
        ref = cat["oracles"][q["oracle_id"]]["ref"]
        kinds = [("cross", q["query"]), ("same", ref)] if q["query"] else [("same", ref)]
        for kind, sid in kinds:
            cells = {}

            def add(cond, sev, rep, tag):
                cells.setdefault((cond, sev, rep), set()).add(tag)

            for cond, sev, rep in (("clean", 0, 0), ("realistic", 0, 0), ("realistic", 0, 1)):
                add(cond, sev, rep, "A")
                if qi in D and kind == "cross" and rep == 0:
                    add(cond, sev, rep, "D")
                if qi in P and kind == "cross":
                    add(cond, sev, rep, "P")
            if qi in F and kind == "cross":
                for rep in range(5):
                    add("realistic", 0, rep, "F")
                    for cond in F_CONDS:
                        for sev in (1, 2, 3):
                            add(cond, sev, rep, "F")
            if qi in B:
                for cond in SEV_CONDS:
                    for sev in (1, 2, 3):
                        if kind == "cross":
                            add(cond, sev, 0, "B")
                            if qi in D and sev == 2:
                                add(cond, sev, 0, "D")
                            if qi in P:
                                add(cond, sev, 0, "P")
                        elif sev == 2:
                            add(cond, sev, 0, "C")
            jobs.append({"qi": qi, "kind": kind, "sid": sid, "cells": [
                {"cond": c, "sev": s, "rep": r, "sets": sorted(t), "seed": seed_of(qi, kind, c, s, r)}
                for (c, s, r), t in sorted(cells.items())]})
    for n in range(0, N_NEG, 20):
        jobs.append({"kind": "negative", "cells": [{"seed": seed_of("neg", n + i)} for i in range(20)]})
    return jobs


def main():
    jobs = plan()
    split = []
    for j in jobs:
        for i in range(0, len(j["cells"]), 6):
            split.append({**j, "cells": j["cells"][i:i + 6]})
    total = sum(len(j["cells"]) for j in split)
    print("scenes", total, "chunks", len(split), flush=True)
    if "--plan" in sys.argv:
        return
    t0 = time.time()
    done = 0
    with open(OUT / "results.jsonl", "w") as f, mp.get_context("spawn").Pool(WORKERS, initializer=init) as pool:
        for recs in pool.imap_unordered(work, split, chunksize=1):
            for r in recs:
                f.write(json.dumps(r) + "\n")
            done += len(recs)
            if done % 2000 < len(recs):
                el = time.time() - t0
                print(f"{done}/{total} {el:.0f}s eta {el / done * (total - done):.0f}s", flush=True)
    print("done", f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
