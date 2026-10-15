"""Shared paths and helpers for the card-scan feasibility spike.

Research only: nothing here ships, and nothing under src/ imports it. Every heavy artifact
(weights, images, embeddings, results) lives in CARD_SCAN_DIR, outside the repository.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

_DIR = os.environ.get("CARD_SCAN_DIR", "")
if not _DIR or not Path(_DIR).expanduser().is_dir():
    raise SystemExit("set CARD_SCAN_DIR to the scratch directory holding weights/, bulk/ and img/")
ROOT = Path(_DIR).expanduser()

WEIGHTS = ROOT / "weights"
IMG = ROOT / "img"          # one file per (scryfall_id, face), fetched once, never re-fetched
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)

USER_AGENT = "the99-card-scan-research/0.1 (one-time research fetch)"

# Layouts with no physical game card a player would scan into a Commander collection.
NON_GAME_LAYOUTS = {"planar", "scheme", "vanguard", "front_card", "token", "double_faced_token",
                    "art_series", "emblem"}


def img_path(scryfall_id: str, face: str = "front") -> Path:
    return IMG / scryfall_id[:2] / f"{scryfall_id}_{face}.jpg"


def load_json(p: Path):
    return json.loads(Path(p).read_text())


def dump_json(p: Path, obj) -> None:
    Path(p).write_text(json.dumps(obj, indent=1, sort_keys=True))
