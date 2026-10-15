// The card-scan lab's BROWSER code path, run under Node: onnxruntime-web's WASM backend on one thread,
// with the lab's own JS warp and kNN (src/lib/scan-lab). Research only, not part of the app.
//
// 1. Parity: on scenes `parity_scenes.py` rendered, the lab's corners and embedding against Python's.
// 2. Latency: median and minimum per stage, and the JS kNN over an exported index.
//
// onnxruntime-web is NOT a dependency of this repository. Install it in a scratch directory and pass it:
//   npm install --prefix "$CARD_SCAN_DIR/node-ort" onnxruntime-web@1.27.0
//   ORT_WEB_DIR="$CARD_SCAN_DIR/node-ort/node_modules/onnxruntime-web" CARD_SCAN_DIR=... \
//     arch -arm64 node_modules/.bin/tsx scripts/research/card-scan/wasm_bench.mjs
import { readFileSync } from "node:fs";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const S = process.env.CARD_SCAN_DIR;
const ORT = process.env.ORT_WEB_DIR;
if (!S || !ORT) throw new Error("set CARD_SCAN_DIR and ORT_WEB_DIR");
const WT = fileURLToPath(new URL("../../../", import.meta.url));
const ort = await import(pathToFileURL(`${ORT}/dist/ort.node.min.mjs`).href);
const { cornersFromDetector, rgbaToTensor, warpToTensor } = await import(`${WT}src/lib/scan-lab/geometry.ts`);
const { normalise, parseIndex, topOracles } = await import(`${WT}src/lib/scan-lab/match.ts`);
ort.env.wasm.numThreads = 1;
console.log("load", os.loadavg().map((x) => x.toFixed(0)).join(" "), "ort-web", ort.env.versions?.web);

const det = await ort.InferenceSession.create(readFileSync(`${S}/weights/hc_det/fastweb-single-1.39.onnx`));
const e32 = await ort.InferenceSession.create(readFileSync(`${S}/weights/dhv_embed/mtg_embed_fp32.onnx`));
const e8 = await ort.InferenceSession.create(readFileSync(`${S}/weights/dhv_embed/mtg_embed_int8.onnx`));
const expected = JSON.parse(readFileSync(`${S}/parity/expected.json`, "utf8"));
const read = (f) => new Uint8Array(readFileSync(`${S}/parity/${f}`));

// 1. parity (expected.json holds Python's corners and its int8 embedding of the detected warp)
for (const e of expected) {
  const d = await det.run({ image: new ort.Tensor("float32", rgbaToTensor(read(`square${e.i}.rgba`), 384, 384), [1, 3, 384, 384]) });
  const corners = cornersFromDetector(d.corners.data, e.w, e.h);
  const err = Math.max(...corners.map((c, k) => Math.hypot(c.x - e.det[k][0], c.y - e.det[k][1])));
  const crop = warpToTensor(read(`frame${e.i}.rgba`), e.w, e.h, corners);
  const z = await e8.run({ input: new ort.Tensor("float32", crop, [1, 3, 448, 320]) });
  const q = normalise(z.embedding.data);
  let cos = 0;
  for (let i = 0; i < q.length; i++) cos += q[i] * e.emb[i];
  console.log(`parity scene ${e.i}: corner max error ${err.toFixed(2)}px, sharpness ${d.sharpness.data[0].toFixed(4)} vs ${e.sharp.toFixed(4)}, embedding cosine ${cos.toFixed(4)}`);
}

// 2. latency
async function time(name, f, n = 20) {
  await f();
  const xs = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    await f();
    xs.push(performance.now() - t0);
  }
  xs.sort((a, b) => a - b);
  console.log(`| ${name} | ${xs[Math.floor(n / 2)].toFixed(1)} | ${xs[0].toFixed(1)} |`);
}
const e = expected[0];
const corners = e.det.map(([x, y]) => ({ x, y }));
const frame = read("frame0.rgba");
const crop = warpToTensor(frame, e.w, e.h, corners);
await time("detector (WASM, fp32 384)", () => det.run({ image: new ort.Tensor("float32", rgbaToTensor(read("square0.rgba"), 384, 384), [1, 3, 384, 384]) }));
await time("JS warp to 448x320", () => warpToTensor(frame, e.w, e.h, corners));
await time("embedder fp32 (WASM)", () => e32.run({ input: new ort.Tensor("float32", crop, [1, 3, 448, 320]) }));
await time("embedder int8 (WASM)", () => e8.run({ input: new ort.Tensor("float32", crop, [1, 3, 448, 320]) }));
const meta = JSON.parse(readFileSync(`${S}/out/lab-index/scan-index.json`, "utf8"));
const bin = readFileSync(`${S}/out/lab-index/scan-index.bin`);
const index = parseIndex(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const q = normalise(new Float32Array(meta.dim).fill(1));
await time(`JS kNN over ${meta.rows} int8 rows`, () => topOracles(index, q, 5));
