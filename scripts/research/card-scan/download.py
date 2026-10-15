"""Step 2: fetch every image the galleries and queries need, ONCE.

Uses the image URIs the catalog stores (cards.scryfall.io, the `normal` 488x680 JPEG). A file
already in CARD_SCAN_DIR/img is never fetched again. At most 8 requests in flight, each worker
pausing between requests, with a User-Agent naming the research fetch.
"""
from __future__ import annotations

import sys
import threading
import time

import requests
from concurrent.futures import ThreadPoolExecutor

from common import OUT, USER_AGENT, img_path, load_json

WORKERS = 8
PAUSE_S = 0.1


def jobs():
    cat = load_json(OUT / "catalog.json")
    sets = load_json(OUT / "sets.json")
    pr = cat["printings"]
    want = {}
    for g in sets["single"] + sets["multi"] + sets.get("all", []):
        p = pr[g["sid"]]
        want[(g["sid"], g["face"])] = p["img"] if g["face"] == "front" else p["back_img"]
    for q in sets["queries"]:
        for sid in filter(None, [q["query"], cat["oracles"][q["oracle_id"]]["ref"]]):
            want[(sid, "front")] = pr[sid]["img"]
    return [(sid, face, url) for (sid, face), url in want.items() if url and not img_path(sid, face).exists()]


lock = threading.Lock()
local = threading.local()
done = {"ok": 0, "fail": 0, "bytes": 0}


def fetch(job):
    sid, face, url = job
    dst = img_path(sid, face)
    dst.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(4):
        try:
            sess = getattr(local, "s", None)
            if sess is None:  # one keep-alive connection per worker
                sess = local.s = requests.Session()
                sess.headers.update({"User-Agent": USER_AGENT, "Accept": "image/*"})
            r = sess.get(url, timeout=30)
            r.raise_for_status()
            body = r.content
            tmp = dst.with_suffix(".part")
            tmp.write_bytes(body)
            tmp.rename(dst)
            with lock:
                done["ok"] += 1
                done["bytes"] += len(body)
            time.sleep(PAUSE_S)
            return
        except Exception as e:  # noqa: BLE001 - research fetch, retried then logged
            time.sleep(2 ** attempt)
            err = e
    with lock:
        done["fail"] += 1
    print("FAIL", sid, face, err, file=sys.stderr, flush=True)


def main():
    todo = jobs()
    print("to fetch", len(todo), flush=True)
    t0 = time.time()
    with ThreadPoolExecutor(WORKERS) as ex:
        for i, _ in enumerate(ex.map(fetch, todo)):
            if i % 2000 == 0:
                el = time.time() - t0
                print(f"{i}/{len(todo)} ok={done['ok']} fail={done['fail']} "
                      f"{done['bytes'] / 1e6:.0f}MB {i / max(el, 1):.1f}/s", flush=True)
    print("done", done, f"{time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
