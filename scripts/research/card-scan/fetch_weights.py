"""Fetch the spike's model weights into CARD_SCAN_DIR/weights, pinned by commit and checked by sha256.
Never fetches a file already present with the right hash. Weights are never committed."""
import hashlib

import requests

from common import USER_AGENT, WEIGHTS

HF = "https://huggingface.co"
EMB = f"{HF}/dhvazquez/mtg_card_identification_embeddings/resolve/653d88d94b2beb31a7894561e7c6b26f589a3861/20260521-044732/onnx"
POSE = f"{HF}/dhvazquez/mtg_card_pose_estimation/resolve/ef6d7912e7e2db79ce24976cb3ea84984e43721a/exports"
DET = f"{HF}/HanClinto/ccgdetector-fastweb-single/resolve/66ffd4976ec57bda0f6ea2d83e15ca6a3add7dd9"
DINO = f"{HF}/onnx-community/dinov2-small/resolve/8b1f705a3a7f6f062f6bdd21986c1583d3ef105d/onnx"

FILES = [  # (dir, url, sha256 or None for an external-data sidecar)
    ("dhv_embed", f"{EMB}/mtg_embed_int8.onnx", "8a1a2080e64b98ed995e8c942463f3244825ae6b13490894adc9b6a652912ff7"),
    ("dhv_embed", f"{EMB}/mtg_embed_fp16.onnx", "fe9e2e492b9f2acf380ce31632cc9dd2e700e601f90707d8b8d22d49514aed9d"),
    ("dhv_embed", f"{EMB}/mtg_embed_fp32.onnx", "fa092cdc8a25b0f3b80ee0ec0580fc9b4e0dc03bb49f9b7ffa43b83b88672ed2"),
    ("dhv_embed", f"{EMB}/mtg_embed_fp32.onnx.data", None),
    ("dhv_pose", f"{POSE}/mtg_4kp_s_r4b.onnx", "3d33788e992e4882e37b1d2307994942552413092fdebaf998728cdbda4b5a99"),
    ("dhv_pose", f"{POSE}/mtg_4kp_s_r4b.onnx.data", None),
    ("hc_det", f"{DET}/fastweb-single-1.39.onnx", "05d2b90b928a5a3bf0f49aa90aa86211b2103d9c347c238fd18b4f544b3cb8ca"),
    ("dinov2", f"{DINO}/model.onnx", "f22797eabf810a75e41de68d378541ebea372122b25c4ce3ef25ff618250c20a"),
]

for d, url, sha in FILES:
    dst = WEIGHTS / d / url.rsplit("/", 1)[1]
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists():
        r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=120)
        r.raise_for_status()
        dst.write_bytes(r.content)
    if sha and hashlib.sha256(dst.read_bytes()).hexdigest() != sha:
        raise SystemExit(f"sha256 mismatch: {dst}")
    print("ok", dst.name, dst.stat().st_size)
