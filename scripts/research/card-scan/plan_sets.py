"""Step 1: choose the query oracles and define the two galleries.

Galleries (all three cover EVERY oracle in the catalog, so the distractor set is the real one):
  single  one image per oracle: the reference printing's front (see build_catalog.py), plus its
          back face for a double-faced layout, both labelled with the oracle.
  multi   one printing per distinct (oracle, illustration_id): the reference for its own
          illustration, otherwise the newest non-promo paper printing of that illustration.
          A sampled oracle's QUERY printing is never in it: when it is the only printing of its
          illustration, that illustration is left out for this run, so every cross-printing
          query is a printing the index has never seen.
  all     every paper printing, the query printings included: the player's own printing is in
          the index, and the answer is the oracle of the nearest printing (or a top-10 vote).

Queries: N oracles, stratified by the query printing's frame treatment, layout and era. The
query printing is a DIFFERENT printing from the reference wherever one exists (`cross`), and the
reference printing itself is always queried as a control (`same`).
"""
from __future__ import annotations

import random
import sys
from collections import Counter, defaultdict

from common import OUT, dump_json, load_json

N_PER_STRATUM = int(sys.argv[1]) if len(sys.argv) > 1 else 220
SEED = 1015

DFC = {"transform", "modal_dfc", "meld", "reversible_card"}
SPLIT_LIKE = {"split", "adventure", "flip", "prepare"}


def treatment(p) -> str:
    e = set(p["effects"])
    if p.get("flavor_name"):
        return "flavor_name"
    if "showcase" in e:
        return "showcase"
    if "extendedart" in e:
        return "extended_art"
    if p["border"] == "borderless":
        return "borderless"
    if p["full_art"]:
        return "full_art"
    if p["frame"] in ("1993", "1997"):
        return "retro_frame_reprint" if (p["released"] or "") >= "2020" else "old_border"
    if p["frame"] == "2003":
        return "modern_2003"
    if p["frame"] in ("2015", "future"):
        return "m15"
    return "other"


def era(p) -> str:
    y = (p["released"] or "0000")[:4]
    return "pre2003" if y < "2003" else "2003-2014" if y < "2015" else "2015-2019" if y < "2020" else "2020+"


def layout_group(o) -> str:
    if o["layout"] in DFC:
        return "dfc"
    if o["layout"] in SPLIT_LIKE:
        return "split_adventure"
    if "Basic Land" in o["type_line"]:
        return "basic_land"
    return "single_face"


def main():
    cat = load_json(OUT / "catalog.json")
    oracles, printings = cat["oracles"], cat["printings"]
    by_oracle = defaultdict(list)
    for sid, p in printings.items():
        by_oracle[p["oracle_id"]].append(sid)
    rng = random.Random(SEED)

    # candidate (oracle, query printing, stratum) rows; one oracle may offer several strata
    pools = defaultdict(list)
    for oid, o in oracles.items():
        others = [s for s in by_oracle[oid] if s != o["ref"]]
        lg = layout_group(o)
        if not others:
            pools["only_one_printing"].append((oid, None))
            continue
        for s in others:
            pools["t:" + treatment(printings[s])].append((oid, s))
            if lg != "single_face":
                pools["l:" + lg].append((oid, s))
            if printings[s]["ill"] != printings[o["ref"]]["ill"]:
                pools["different_art"].append((oid, s))
    chosen, used = [], set()
    for stratum in sorted(pools):
        rows = pools[stratum][:]
        rng.shuffle(rows)
        n = 0
        for oid, s in rows:
            if oid in used:
                continue
            used.add(oid)
            chosen.append({"oracle_id": oid, "query": s, "stratum": stratum})
            n += 1
            if n >= N_PER_STRATUM:
                break
        print(f"{stratum:28s} pool {len(pools[stratum]):6d}  chosen {n}")

    query_sids = {c["query"] for c in chosen if c["query"]}
    # single gallery
    single = []
    for oid, o in oracles.items():
        single.append({"sid": o["ref"], "face": "front", "oracle_id": oid})
        if o["layout"] in DFC and printings[o["ref"]]["back_img"]:
            single.append({"sid": o["ref"], "face": "back", "oracle_id": oid})
    # multi gallery: one printing per (oracle, illustration), query printings held out
    multi = []
    for oid, o in oracles.items():
        groups = defaultdict(list)
        for s in by_oracle[oid]:
            if s in query_sids:
                continue
            groups[printings[s]["ill"]].append(s)
        for ill, sids in groups.items():
            if o["ref"] in sids:
                pick = o["ref"]
            else:
                sids.sort(key=lambda s: (not printings[s]["promo"], printings[s]["released"] or ""), reverse=True)
                pick = sids[0]
            multi.append({"sid": pick, "face": "front", "oracle_id": oid})
            if o["layout"] in DFC and printings[pick]["back_img"]:
                multi.append({"sid": pick, "face": "back", "oracle_id": oid})
    # all: EVERY paper printing (and a DFC's back), query printings included. This is the
    # deployment where the player's own printing is in the index and the answer is voted by oracle.
    every = []
    for sid, p in printings.items():
        every.append({"sid": sid, "face": "front", "oracle_id": p["oracle_id"]})
        if oracles[p["oracle_id"]]["layout"] in DFC and p["back_img"]:
            every.append({"sid": sid, "face": "back", "oracle_id": p["oracle_id"]})
    multi_ills = {(g["oracle_id"], printings[g["sid"]]["ill"]) for g in multi}
    for c in chosen:
        o = oracles[c["oracle_id"]]
        q = printings[c["query"]] if c["query"] else None
        c.update({
            "name": o["name"], "layout_group": layout_group(o),
            "treatment": treatment(q) if q else treatment(printings[o["ref"]]),
            "era": era(q) if q else era(printings[o["ref"]]),
            "same_art_as_ref": (q["ill"] == printings[o["ref"]]["ill"]) if q else True,
            "query_art_in_multi": ((c["oracle_id"], q["ill"]) in multi_ills) if q else True,
        })
    dump_json(OUT / "sets.json", {"queries": chosen, "single": single, "multi": multi, "all": every, "seed": SEED})
    print("query oracles", len(chosen), "cross-printing", len(query_sids),
          "single gallery", len(single), "multi gallery", len(multi), "all gallery", len(every))
    print(Counter(c["treatment"] for c in chosen))
    print(Counter(c["layout_group"] for c in chosen))
    print(Counter(c["era"] for c in chosen))


if __name__ == "__main__":
    main()
