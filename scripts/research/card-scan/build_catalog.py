"""Step 0: the catalog the benchmark indexes and queries.

Reads the app's catalog from STAGING, read-only (a `default_transaction_read_only` session),
and joins Scryfall's `default_cards` bulk (fetched once into CARD_SCAN_DIR/bulk) for the facts
our tables do not store: frame, border, full art, frame effects, promo, release date,
illustration id, and whether the printing exists on paper.

Writes CARD_SCAN_DIR/out/catalog.json:
  oracles:   {oracle_id: {name, layout, type_line, ref: scryfall_id, ref_back: bool}}
  printings: {scryfall_id: {oracle_id, set, cn, img, back, frame, border, full_art, effects,
              promo, released, ill, flavor_name, set_type}}

THE REFERENCE PER ORACLE is `cards.scryfall_id` / `cards.image_uri` -- the printing our
catalog's oracle-level row was taken from, which is Scryfall's `oracle_cards` bulk choice
("the most up-to-date recognizable version of the card"). When that printing is not a paper
printing (Alchemy and Arena-only rows), the oracle has no physical card to scan and is dropped.
"""
from __future__ import annotations

import gzip
import json
import os
import sys

import psycopg

from common import NON_GAME_LAYOUTS, OUT, ROOT, dump_json


def staging_rows():
    url = os.environ.get("THE_99_NEON_STAGING_DIRECT")
    if not url:
        raise SystemExit("THE_99_NEON_STAGING_DIRECT is not set")
    with psycopg.connect(url, options="-c default_transaction_read_only=on") as c:
        c.read_only = True
        branch = c.execute("select current_setting('neon.branch_id', true)").fetchone()[0]
        print("staging branch", branch, file=sys.stderr)
        cards = c.execute(
            "select oracle_id::text, scryfall_id::text, name, layout, type_line, image_uri, back_image_uri "
            "from cards").fetchall()
        prints = c.execute(
            "select scryfall_id::text, oracle_id::text, set_code, collector_number, image_uri, back_image_uri, "
            "flavor_name from printings").fetchall()
    return cards, prints


def bulk_meta():
    meta = {}
    path = ROOT / "bulk" / "default_cards.jsonl.gz"
    for line in gzip.open(path, "rt"):
        line = line.strip().rstrip(",")
        if not line or line in "[]":
            continue
        c = json.loads(line)
        faces = c.get("card_faces") or [{}]
        meta[c["id"]] = {
            "paper": "paper" in c.get("games", []),
            "frame": c.get("frame"),
            "border": c.get("border_color"),
            "full_art": bool(c.get("full_art")),
            "effects": c.get("frame_effects") or [],
            "promo": bool(c.get("promo")),
            "released": c.get("released_at"),
            "ill": c.get("illustration_id") or faces[0].get("illustration_id"),
            "ill_back": faces[1].get("illustration_id") if len(faces) > 1 else None,
            "set_type": c.get("set_type"),
            "lang": c.get("lang"),
            "artist": c.get("artist") or faces[0].get("artist"),
            "oversized": bool(c.get("oversized")),
        }
    return meta


def main():
    cards, prints = staging_rows()
    meta = bulk_meta()
    oracles, printings = {}, {}
    dropped = {"layout": 0, "ref_not_paper": 0, "ref_missing_meta": 0, "no_image": 0}
    for oid, sid, name, layout, type_line, img, back in cards:
        if layout in NON_GAME_LAYOUTS:
            dropped["layout"] += 1
            continue
        if not img:
            dropped["no_image"] += 1
            continue
        oracles[oid] = {"name": name, "layout": layout, "type_line": type_line, "ref": sid,
                        "ref_img": img, "ref_back_img": back}
    for sid, oid, set_code, cn, img, back, flavor in prints:
        if oid not in oracles or not img:
            continue
        m = meta.get(sid)
        if m is None or not m["paper"] or m["oversized"]:
            continue
        printings[sid] = {"oracle_id": oid, "set": set_code, "cn": cn, "img": img, "back_img": back,
                          "flavor_name": flavor, **{k: v for k, v in m.items() if k not in ("paper",)}}
    # The reference must itself be a paper printing. When the catalog's oracle-level printing is
    # not (an Arena-only row, or an id today's bulk no longer carries) but the oracle HAS paper
    # printings, fall back to the newest non-promo paper printing, then the newest of any.
    by_oracle = {}
    for sid, p in printings.items():
        by_oracle.setdefault(p["oracle_id"], []).append(sid)
    fallback = 0
    for oid, o in list(oracles.items()):
        o["ref_rule"] = "catalog"
        if o["ref"] in printings:
            continue
        cands = by_oracle.get(oid, [])
        if not cands:
            dropped["ref_not_paper"] += 1
            del oracles[oid]
            continue
        cands.sort(key=lambda s: (not printings[s]["promo"], printings[s]["released"] or ""), reverse=True)
        o["ref"], o["ref_rule"] = cands[0], "fallback_newest_paper"
        o["ref_img"], o["ref_back_img"] = printings[cands[0]]["img"], printings[cands[0]]["back_img"]
        fallback += 1
    dropped["ref_fallback_used"] = fallback
    printings = {k: v for k, v in printings.items() if v["oracle_id"] in oracles}
    dump_json(OUT / "catalog.json", {"oracles": oracles, "printings": printings, "dropped": dropped})
    ills = {(p["oracle_id"], p["ill"]) for p in printings.values()}
    print(f"oracles {len(oracles)}  paper printings {len(printings)}  distinct (oracle, illustration) {len(ills)}")
    print("dropped", dropped)


if __name__ == "__main__":
    main()
