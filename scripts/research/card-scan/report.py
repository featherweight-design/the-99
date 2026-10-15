"""Step 5: turn results.jsonl into the report's tables (Markdown on stdout).

Definitions used in every table:
  detected      the HanClinto quad overlaps the true card with IoU >= 0.90 AND its sharpness
                clears the card-present gate (the 99th percentile of sharpness on scenes with no
                card, so at most ~1% of empty frames would fire).
  matcher       oracle top-1 / top-5 from a crop; "on detected" uses the detector's own warp,
                counted only over detected frames; "perfect crop" warps the true corners.
  end-to-end    a frame counts as right when it is detected AND the detector-warp top-1 is the
                right oracle; an undetected frame is a miss.
  galleries     single (one reference per oracle), multi (one printing per illustration, query
                printings held out), all_heldout (every printing but the scene's own: the main
                multi-printing figure), all (every printing, own included). See run_queries.py.
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict

import numpy as np

from common import OUT, load_json

IOU_OK = 0.90
ORDER = ["clean", "realistic", "perspective", "blur", "low_light", "glare", "sleeve", "occlusion", "low_contrast", "foil"]
GALS = ("single", "multi", "all_heldout", "all")


def pct(a):
    return f"{100 * np.mean(a):.1f}" if len(a) else "-"


def main():
    cat = load_json(OUT / "catalog.json")
    sets = load_json(OUT / "sets.json")
    qs = sets["queries"]
    oracles, pr = cat["oracles"], cat["printings"]
    rows = [json.loads(line) for line in open(OUT / "results.jsonl")]
    neg = [r for r in rows if r["kind"] == "negative"]
    rows = [r for r in rows if r["kind"] != "negative"]
    # cv2.intersectConvexConvex mis-measures a self-intersecting predicted quad (3 of 46,712 scenes
    # read IoU > 1); such a quad is a detector failure, so it counts as IoU 0.
    for r in rows:
        if r["hc_iou"] > 1.0001:
            r["hc_iou"] = 0.0
    if not neg:  # a partial run: the empty scenes are planned last
        neg = [{"hc_sharp": 0.0, "pose_score": 0.0}]
        print("**PARTIAL RUN: no empty scenes yet, the gate is 0**\n")
    gate = float(np.percentile([r["hc_sharp"] for r in neg], 99))
    pgate = float(np.percentile([r["pose_score"] for r in neg], 99))
    pos_sharp = np.array([r["hc_sharp"] for r in rows])
    print(f"## Gate\n\nscenes {len(rows)}, empty scenes {len(neg)}. HanClinto sharpness on empty scenes: "
          f"p50 {np.median([r['hc_sharp'] for r in neg]):.4f}, p99 {gate:.4f}, max {max(r['hc_sharp'] for r in neg):.4f}; "
          f"on card scenes p1 {np.percentile(pos_sharp, 1):.4f}, p50 {np.median(pos_sharp):.4f}. "
          f"dhvazquez pose score on empty scenes p99 {pgate:.3f}.\n")

    def truth(r):
        return qs[r["qi"]]["oracle_id"]

    def hit(r, key, k=1):
        res = r["res"].get(key)
        return res is not None and truth(r) in [o for o, _ in res[:k]]

    def detected(r):
        return r["hc_iou"] >= IOU_OK and r["hc_sharp"] >= gate

    def pose_detected(r):
        return r.get("pose_iou", 0) >= IOU_OK and r.get("pose_score", 0) >= pgate

    def e2e(r, key, k=1):
        return detected(r) and hit(r, f"det/{key}", k)

    def on_det(sel, key, k=1):
        return pct([hit(r, f"det/{key}", k) for r in sel if detected(r)])

    def crop(sel, key, k=1):
        return pct([hit(r, f"gt/{key}", k) for r in sel])

    cells = defaultdict(list)
    for r in rows:
        cells[(r["kind"], r["cond"], r["sev"])].append(r)

    def cell(kind, cond, sev, tag=None, rep0=True):
        return [r for r in cells[(kind, cond, sev)] if (tag is None or tag in r["sets"]) and (not rep0 or r["rep"] == 0)]

    # ---- gate sensitivity
    print("## Card-present gate sensitivity (cross-printing; end-to-end top-1 with the gate at each percentile of empty-scene sharpness)\n")
    print("| gate | sharpness >= | empty scenes passing | clean: detected | clean: all_heldout e2e | clean: all e2e | realistic: detected | realistic: all_heldout e2e | realistic: all e2e |")
    print("|---|---|---|---|---|---|---|---|---|")
    negs = np.array([r["hc_sharp"] for r in neg])
    for label, g in (("none (corners only)", -1.0), ("p90", np.percentile(negs, 90)), ("p95", np.percentile(negs, 95)), ("p99 (used below)", gate)):
        cols = [label, f"{g:.4f}" if g >= 0 else "-", pct(negs >= g)]
        for cond in ("clean", "realistic"):
            sel = cell("cross", cond, 0)
            ok = [r["hc_iou"] >= IOU_OK and r["hc_sharp"] >= g for r in sel]
            cols.append(pct(ok))
            for gal in ("all_heldout", "all"):
                cols.append(pct([o and hit(r, f"det/dhv32/{gal}") for o, r in zip(ok, sel)]))
        print("| " + " | ".join(cols) + " |")
    print()

    # ---- headline
    print("## Headline (set A, realistic mix, 2 renders per query)\n")
    print("| query | n | gallery | detected | top-1 perfect crop | top-5 perfect crop | top-1 on detected | end-to-end top-1 | end-to-end top-5 |")
    print("|---|---|---|---|---|---|---|---|---|")
    for label, kind, filt, gals in (
        ("cross-printing (a different printing from the reference)", "cross", lambda r: True,
         ("single", "multi", "all_heldout", "all_heldout_vote", "all", "all_vote")),
        ("same printing as the reference (control)", "same", lambda r: qs[r["qi"]]["query"] is not None, ("single", "all_heldout", "all")),
        ("only one printing exists", "same", lambda r: qs[r["qi"]]["query"] is None, ("single", "all_heldout", "all")),
    ):
        sel = [r for r in rows if r["kind"] == kind and r["cond"] == "realistic" and "A" in r["sets"] and r["rep"] < 2 and filt(r)]
        for gal in gals:
            key = f"dhv32/{gal}"
            print(f"| {label} | {len(sel)} | {gal} | {pct([detected(r) for r in sel])} | {crop(sel, key)} | {crop(sel, key, 5)} | "
                  f"{on_det(sel, key)} | {pct([e2e(r, key) for r in sel])} | {pct([e2e(r, key, 5) for r in sel])} |")
    sel = [r for r in rows if r["kind"] == "cross" and r["cond"] == "clean" and "A" in r["sets"]]
    for gal in ("single", "all_heldout", "all"):
        key = f"dhv32/{gal}"
        print(f"| cross-printing, CLEAN shot | {len(sel)} | {gal} | {pct([detected(r) for r in sel])} | {crop(sel, key)} | {crop(sel, key, 5)} | "
              f"{on_det(sel, key)} | {pct([e2e(r, key) for r in sel])} | {pct([e2e(r, key, 5) for r in sel])} |")
    print()
    sel = [r for r in rows if r["kind"] == "cross" and r["cond"] == "realistic" and "A" in r["sets"] and r["rep"] < 2]
    print("### int8 embedder against fp32 (cross-printing, realistic)\n")
    print("| gallery | fp32 top-1 crop | int8 top-1 crop | fp32 end-to-end | int8 end-to-end |")
    print("|---|---|---|---|---|")
    for gal in GALS:
        print(f"| {gal} | {crop(sel, f'dhv32/{gal}')} | {crop(sel, f'dhv8/{gal}')} | "
              f"{pct([e2e(r, f'dhv32/{gal}') for r in sel])} | {pct([e2e(r, f'dhv8/{gal}') for r in sel])} |")
    print()

    # ---- detector stage
    print("## Detector stage (cross-printing queries; set B, plus clean and realistic from A)\n")
    print("| augmentation | severity | n | HanClinto recall (IoU>=0.9 + gate) | IoU>=0.9 alone | mean IoU | dhvazquez pose recall (n) |")
    print("|---|---|---|---|---|---|---|")
    for cond in ORDER:
        for sev in ((0,) if cond in ("clean", "realistic") else (1, 2, 3)):
            sel = cell("cross", cond, sev)
            if not sel:
                continue
            ps = [r for r in sel if "pose_iou" in r]
            print(f"| {cond} | {sev or '-'} | {len(sel)} | {pct([detected(r) for r in sel])} | {pct([r['hc_iou'] >= IOU_OK for r in sel])} | "
                  f"{np.mean([r['hc_iou'] for r in sel]):.3f} | {pct([pose_detected(r) for r in ps])} ({len(ps)}) |")
    print()

    # ---- matcher stage
    print("## Matcher stage (cross-printing queries, dhvazquez fp32)\n")
    print("| augmentation | severity | single crop | single on detected | multi crop | all_heldout crop | all_heldout top-5 crop | all_heldout on detected | all (own present) crop | all on detected |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for cond in ORDER:
        for sev in ((0,) if cond in ("clean", "realistic") else (1, 2, 3)):
            sel = cell("cross", cond, sev)
            if not sel:
                continue
            print(f"| {cond} | {sev or '-'} | {crop(sel, 'dhv32/single')} | {on_det(sel, 'dhv32/single')} | {crop(sel, 'dhv32/multi')} | "
                  f"{crop(sel, 'dhv32/all_heldout')} | {crop(sel, 'dhv32/all_heldout', 5)} | {on_det(sel, 'dhv32/all_heldout')} | "
                  f"{crop(sel, 'dhv32/all')} | {on_det(sel, 'dhv32/all')} |")
    print()

    # ---- end to end
    print("## End-to-end (cross-printing queries): detected x matched\n")
    print("| augmentation | severity | detected | single e2e | all_heldout: on detected | all_heldout: product | all_heldout: measured e2e | all_heldout e2e top-5 | all (own present) e2e |")
    print("|---|---|---|---|---|---|---|---|---|")
    for cond in ORDER:
        for sev in ((0,) if cond in ("clean", "realistic") else (1, 2, 3)):
            sel = cell("cross", cond, sev)
            if not sel:
                continue
            d = np.mean([detected(r) for r in sel])
            m = [hit(r, "det/dhv32/all_heldout") for r in sel if detected(r)]
            prod = f"{100 * d * np.mean(m):.1f}" if m else "-"
            print(f"| {cond} | {sev or '-'} | {100 * d:.1f} | {pct([e2e(r, 'dhv32/single') for r in sel])} | {pct(m)} | {prod} | "
                  f"{pct([e2e(r, 'dhv32/all_heldout') for r in sel])} | {pct([e2e(r, 'dhv32/all_heldout', 5) for r in sel])} | "
                  f"{pct([e2e(r, 'dhv32/all') for r in sel])} |")
    print()

    # ---- same-printing control
    print("## Same-printing control (set C, severity 2)\n")
    print("| augmentation | n | single crop | single e2e | all_heldout crop | all (own present) crop | all e2e |")
    print("|---|---|---|---|---|---|---|")
    for cond in ORDER[2:]:
        sel = cell("same", cond, 2, "C")
        print(f"| {cond} | {len(sel)} | {crop(sel, 'dhv32/single')} | {pct([e2e(r, 'dhv32/single') for r in sel])} | "
              f"{crop(sel, 'dhv32/all_heldout')} | {crop(sel, 'dhv32/all')} | {pct([e2e(r, 'dhv32/all') for r in sel])} |")
    print()

    # ---- DINOv2 on the same splits
    print("## DINOv2-small against the dhvazquez embedder (set D, cross-printing, perfect crop / end-to-end top-1)\n")
    print("| augmentation | n | " + " | ".join(f"dhv {g} | DINOv2 {g}" for g in GALS) + " |")
    print("|---|---|" + "---|---|" * len(GALS))
    for cond in ORDER:
        sev = 0 if cond in ("clean", "realistic") else 2
        a = cell("cross", cond, sev, "D")
        if not a:
            continue
        cols = []
        for g in GALS:
            cols.append(f"{crop(a, f'dhv32/{g}')} / {pct([e2e(r, f'dhv32/{g}') for r in a])}")
            cols.append(f"{crop(a, f'dino/{g}')} / {pct([e2e(r, f'dino/{g}') for r in a])}")
        print(f"| {cond}{'' if not sev else ' (sev 2)'} | {len(a)} | " + " | ".join(cols) + " |")
    print()

    # ---- frame agreement
    print("## Frame agreement (set F: 5 independent frames per query, detector path, cross-printing)\n")
    print("A frame votes for its top-1 oracle when it is detected; an undetected frame casts no vote. "
          "k-of-n: the first n frames, answered when one oracle has at least k votes.\n")
    print("| augmentation | severity | gallery | n | one frame e2e | 2-of-3 right | 2-of-3 no consensus | 2-of-3 wrong | 3-of-5 right | 3-of-5 no consensus | 3-of-5 wrong |")
    print("|---|---|---|---|---|---|---|---|---|---|---|")
    fr = defaultdict(dict)
    for r in rows:
        if "F" in r["sets"]:
            fr[(r["qi"], r["cond"], r["sev"])][r["rep"]] = r
    for cond, sevs in (("blur", (1, 2, 3)), ("low_light", (1, 2, 3)), ("realistic", (0,))):
        for sev in sevs:
            groups = [v for (qi, c, s), v in fr.items() if c == cond and s == sev and len(v) == 5]
            for gal in ("all_heldout", "all", "single"):
                key = f"det/dhv32/{gal}"

                def vote(frames, k):
                    c = Counter(f["res"][key][0][0] for f in frames if detected(f))
                    if not c:
                        return None
                    o, n = c.most_common(1)[0]
                    return o if n >= k else None
                one = [detected(v[0]) and hit(v[0], key) for v in groups]
                out = {}
                for k, n in ((2, 3), (3, 5)):
                    ans = [(vote([v[i] for i in range(n)], k), truth(v[0])) for v in groups]
                    out[(k, n)] = (pct([a == t for a, t in ans]), pct([a is None for a, t in ans]),
                                   pct([a is not None and a != t for a, t in ans]))
                print(f"| {cond} | {sev or '-'} | {gal} | {len(groups)} | {pct(one)} | {' | '.join(out[(2, 3)])} | {' | '.join(out[(3, 5)])} |")
    print()

    # ---- strata on the realistic mix
    trained = set()
    cm = OUT.parent / "meta" / "dhv_class_map.json"
    if cm.exists():
        trained = {k.split("__")[1].split("_")[0] for k in json.load(open(cm))}
    for q in qs:
        q["query_printing_trained"] = (q["query"] in trained) if q["query"] else None
        q["query_released_after_2026_05_21"] = bool(q["query"]) and (pr[q["query"]]["released"] or "") > "2026-05-21"
    print(f"Embedder class map: {len(trained)} printings; catalog paper printings among them: "
          f"{sum(1 for sid in pr if sid in trained)} of {len(pr)}.\n")
    sel = [r for r in rows if r["kind"] == "cross" and r["cond"] == "realistic" and "A" in r["sets"] and r["rep"] < 2]
    print("## Strata (realistic mix, cross-printing, set A)\n")
    for field in ("treatment", "layout_group", "era", "same_art_as_ref", "query_art_in_multi", "stratum",
                  "query_printing_trained", "query_released_after_2026_05_21"):
        print(f"| {field} | n | detected | single crop | single e2e | all_heldout crop | all_heldout e2e | all (own present) e2e |")
        print("|---|---|---|---|---|---|---|---|")
        groups = defaultdict(list)
        for r in sel:
            groups[str(qs[r["qi"]][field])].append(r)
        for g in sorted(groups):
            a = groups[g]
            print(f"| {g} | {len(a)} | {pct([detected(r) for r in a])} | {crop(a, 'dhv32/single')} | {pct([e2e(r, 'dhv32/single') for r in a])} | "
                  f"{crop(a, 'dhv32/all_heldout')} | {pct([e2e(r, 'dhv32/all_heldout') for r in a])} | {pct([e2e(r, 'dhv32/all') for r in a])} |")
        print()

    # ---- confidence and failure modes
    ills = defaultdict(set)
    artists = defaultdict(set)
    for p in pr.values():
        ills[p["oracle_id"]].add(p["ill"])
        artists[p["oracle_id"]].add(p["artist"])

    def confidence_and_failures(key, title, needs_detection):
        pool = [r for r in sel if detected(r)] if needs_detection else sel
        print(f"## Confidence: {title} (n={len(pool)})\n")
        right = [r for r in pool if hit(r, key)]
        wrong = [r for r in pool if not hit(r, key)]

        def sm(r):
            res = r["res"][key]
            return res[0][1], res[0][1] - (res[1][1] if len(res) > 1 else 0)
        for label, a in (("right", right), ("wrong", wrong)):
            if a:
                v = np.array([sm(r) for r in a])
                print(f"- {label} top-1 ({len(a)}): cosine p10/p50/p90 {np.percentile(v[:, 0], 10):.3f}/{np.median(v[:, 0]):.3f}/"
                      f"{np.percentile(v[:, 0], 90):.3f}; margin over runner-up p10/p50/p90 {np.percentile(v[:, 1], 10):.3f}/"
                      f"{np.median(v[:, 1]):.3f}/{np.percentile(v[:, 1], 90):.3f}")
        for thr in (0.02, 0.05, 0.1):
            acc = [(sm(r)[1] >= thr, hit(r, key)) for r in pool]
            kept = [h for k, h in acc if k]
            print(f"- auto-accept when margin >= {thr}: accepts {100 * len(kept) / len(acc):.1f}% of frames, "
                  f"{100 * np.mean(kept) if kept else 0:.1f}% of those right (confident-wrong {100 * (len(kept) - sum(kept)) / len(acc):.1f}% of all frames)")
        print()
        fm = Counter()
        examples = defaultdict(list)
        for r in wrong:
            q = qs[r["qi"]]
            t = q["oracle_id"]
            res = r["res"][key]
            top = res[0][0]
            qp = pr[q["query"]]
            refp = pr[oracles[t]["ref"]]
            if qp["ill"] in ills[top] or refp["ill"] in ills[top]:
                mode = "wrong oracle shares the SAME illustration"
            elif oracles[top]["name"].split(" //")[0] == oracles[t]["name"].split(" //")[0]:
                mode = "same name, different oracle"
            elif not q["same_art_as_ref"] and "single" in key:
                mode = "query art differs from the indexed reference's art"
            elif artists[top] & {qp["artist"]}:
                mode = "same artist, different art"
            else:
                mode = "other"
            fm[mode] += 1
            if len(examples[mode]) < 8:
                ranks = [o for o, _ in res]
                examples[mode].append(f"{oracles[t]['name']} [{qp['set']} {qp['cn']}, {q['treatment']}] -> "
                                      f"{oracles[top]['name']} (truth rank {ranks.index(t) + 1 if t in ranks else '>5'})")
        print(f"## Failure modes: {title}\n")
        for mode, n in fm.most_common():
            print(f"- **{mode}**: {n} of {len(wrong)}")
            for e in examples[mode]:
                print(f"  - {e}")
        print()

    confidence_and_failures("gt/dhv32/single", "realistic, cross-printing, SINGLE gallery, perfect crop", False)
    confidence_and_failures("gt/dhv32/all_heldout", "realistic, cross-printing, ALL-printings gallery, own printing held out, perfect crop", False)
    confidence_and_failures("det/dhv32/all_heldout", "realistic, cross-printing, own printing held out, detected frames", True)
    confidence_and_failures("det/dhv32/all", "realistic, cross-printing, own printing PRESENT, detected frames", True)

    # ---- latency inside the run (contended CPU)
    for k in ("t_render", "t_det", "t_emb", "t_knn_all"):
        a = np.array([r[k] for r in rows if k in r]) * 1000
        print(f"- in-run {k}: median {np.median(a):.1f} ms, p10 {np.percentile(a, 10):.1f} ms")


if __name__ == "__main__":
    sys.exit(main())
