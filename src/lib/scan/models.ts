/**
 * Where the card-scan lab's runtime and models come from, all pinned. Nothing here is in the
 * repository or the app bundle: a scanner fetches them as it opens, and keeps each model in the
 * browser's Cache Storage under its SHA-256 (`model-cache.ts`), so only a device's first scanner
 * downloads them.
 *
 * - onnxruntime-web (MIT) from jsDelivr, the WASM build, single-threaded (threads need
 *   cross-origin isolation, which would break Clerk and Scryfall's images).
 * - HanClinto/ccgdetector-fastweb-single 1.39 (3.2MB): the four corners. MIT at the pinned
 *   revision (66ffd49, 2026-07-14); the repository was relicensed AGPL-3.0 on 2026-10-21
 *   (2ef37ff). Never bump the detector's revision without a licence review.
 * - dhvazquez/mtg_card_identification_embeddings, fp32 (MIT, 14.8MB; its `.onnx.data` sidecar is
 *   unused, every weight is inline): the 256-d embedding. fp32, not the 3.8MB int8 build, because
 *   onnxruntime-web's WASM runs int8 slower (feasibility report, single thread: 150.7ms median
 *   against fp32's 88.6ms).
 *   The index must be built by the same build (`export_index.py`, fp32 by default).
 */
export const ORT_VERSION = "1.27.0";
export const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
export const DETECTOR_URL =
  "https://huggingface.co/HanClinto/ccgdetector-fastweb-single/resolve/66ffd4976ec57bda0f6ea2d83e15ca6a3add7dd9/fastweb-single-1.39.onnx";
export const EMBEDDER_URL =
  "https://huggingface.co/dhvazquez/mtg_card_identification_embeddings/resolve/653d88d94b2beb31a7894561e7c6b26f589a3861/20260521-044732/onnx/mtg_embed_fp32.onnx";
/** Each model file's SHA-256 at its pinned revision (Hugging Face's `x-linked-etag`): a download that does not hash to
 * it (cut off, or not the file) is never run or cached. */
export const DETECTOR_SHA256 = "05d2b90b928a5a3bf0f49aa90aa86211b2103d9c347c238fd18b4f544b3cb8ca";
export const EMBEDDER_SHA256 = "fa092cdc8a25b0f3b80ee0ec0580fc9b4e0dc03bb49f9b7ffa43b83b88672ed2";

/**
 * The detector's card-present gate on its `sharpness` output. The spike's empty scenes (600, many
 * of them busy playmats of blurred card art) put the 90th percentile at 0.051 and the 99th at
 * 0.061; the 99th kept only 67.5% of real cards in the realistic mix against 90.7% at the 90th.
 * The lab takes the 90th and leans on frame agreement to drop the empty frames that pass.
 */
export const SHARPNESS_GATE = 0.051;
/** Frames in a row that must agree, each clearing the margin over the runner-up. */
export const AGREE_FRAMES = 3;
export const AGREE_MARGIN = 0.02;
