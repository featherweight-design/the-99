"""Export the card-scan lab's index (`src/lib/scan/match.ts` reads it).

One row per image of a gallery (default `all`: every paper printing, plus a DFC's back; pass
`single` for one reference per oracle), embedded by the build the lab runs in the browser (fp32 by default; pass `int8` second), so the
gallery and the query share one numeric regime. Each row is quantised to int8 by its own scale (max |v| / 127).

Writes CARD_SCAN_DIR/out/lab-index/scan-index.json and scan-index.bin. Host both at one URL and
set SCAN_LAB_INDEX_BASE to it; they are derived from Scryfall card images and are never committed.

With `--server` it writes the rows for the server's index instead (`pnpm db:seed:scan-index`, plan
2026-10-16-card-scan.md): CARD_SCAN_DIR/out/server-index/scan-rows.json (version, model, dim, rows, and each
row's [scryfall id, face, oracle id]) and scan-rows.f32 (rows x dim float32, little-endian, unit length).
"""
from __future__ import annotations

import json
import sys
import time

import numpy as np

from common import OUT, load_json


def main():
    server = "--server" in sys.argv
    sys.argv = [a for a in sys.argv if a != "--server"]
    cat = load_json(OUT / "catalog.json")
    sets = load_json(OUT / "sets.json")
    build = sys.argv[2] if len(sys.argv) > 2 else "fp32"
    z = np.load(OUT / f"gallery_dhv_{build}.npz")
    emb = z["emb"]  # read once: indexing an NpzFile re-reads the whole array every time
    pos = {k: i for i, k in enumerate(z["keys"])}
    gallery = sys.argv[1] if len(sys.argv) > 1 else "all"
    rows = list(sets[gallery])
    oracle_ids = sorted({g["oracle_id"] for g in rows})
    oi = {o: i for i, o in enumerate(oracle_ids)}
    E = np.stack([emb[pos[f"{g['sid']}_{g['face']}"]] for g in rows]).astype(np.float32)
    E /= np.linalg.norm(E, axis=1, keepdims=True)
    version = f"{gallery}-" + time.strftime("%Y%m%d")
    model = f"dhvazquez/mtg_card_identification_embeddings@653d88d {build}"
    if server:
        out = OUT / "server-index"
        out.mkdir(exist_ok=True)
        meta = {
            "version": version, "model": model, "dim": int(E.shape[1]), "rows": len(rows),
            "keys": [[g["sid"], g["face"], g["oracle_id"]] for g in rows],
        }
        (out / "scan-rows.json").write_text(json.dumps(meta, separators=(",", ":")))
        (out / "scan-rows.f32").write_bytes(E.astype("<f4").tobytes())
        print(version, "rows", len(rows), "oracles", len(oracle_ids), "->", out)
        return
    scales = (np.abs(E).max(axis=1) / 127.0).astype(np.float32)
    codes = np.round(E / scales[:, None]).clip(-127, 127).astype(np.int8)
    out = OUT / "lab-index"
    out.mkdir(exist_ok=True)
    meta = {
        "version": version, "model": model,
        "dim": int(E.shape[1]), "rows": len(rows),
        "oracles": [[o, cat["oracles"][o]["name"]] for o in oracle_ids],
        "rowOracle": [oi[g["oracle_id"]] for g in rows],
    }
    (out / "scan-index.json").write_text(json.dumps(meta, separators=(",", ":")))
    (out / "scan-index.bin").write_bytes(codes.tobytes() + scales.tobytes())
    # how much the int8 rows cost in agreement with the float rows
    deq = codes.astype(np.float32) * scales[:, None]
    cos = (deq * E).sum(axis=1) / np.linalg.norm(deq, axis=1)
    print(version, "rows", len(rows), "oracles", len(oracle_ids),
          f"json {(out / 'scan-index.json').stat().st_size / 1e6:.2f}MB bin {(out / 'scan-index.bin').stat().st_size / 1e6:.2f}MB",
          f"row cosine to float min {cos.min():.5f} mean {cos.mean():.5f}")


if __name__ == "__main__":
    main()
