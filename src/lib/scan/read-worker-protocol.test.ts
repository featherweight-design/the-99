import { describe, expect, it } from "vitest";
import { captureSize, decodeFromWorker, encodeRead, outlineAt, pageCaps, readPath, type PageCaps } from "./read-worker-protocol";
import type { FrameRead } from "./pipeline";

const ALL: PageCaps = { worker: true, offscreenCanvas: true, imageBitmap: true };

describe("readPath", () => {
  it("reads on the main thread wherever the page lacks a worker, an OffscreenCanvas or createImageBitmap", () => {
    expect(readPath({ ...ALL, worker: false })).toEqual({ path: "main", reason: "no-worker" });
    expect(readPath({ ...ALL, offscreenCanvas: false })).toEqual({ path: "main", reason: "no-offscreen" });
    expect(readPath({ ...ALL, imageBitmap: false })).toEqual({ path: "main", reason: "no-bitmap" });
  });

  it("asks the worker before settling, and turns down one with no 2D OffscreenCanvas", () => {
    expect(readPath(ALL)).toEqual({ path: "worker" });
    expect(readPath(ALL, { offscreen2d: false, gpu: true })).toEqual({ path: "main", reason: "no-2d-in-worker" });
  });

  it("never costs the embedder its WebGPU run: WebGPU on the page but not in the worker reads on the main thread", () => {
    expect(readPath(ALL, { offscreen2d: true, gpu: false }, true)).toEqual({ path: "main", reason: "no-worker-gpu" });
    // WebGPU in both, or in neither: the worker.
    expect(readPath(ALL, { offscreen2d: true, gpu: true }, true)).toEqual({ path: "worker" });
    expect(readPath(ALL, { offscreen2d: true, gpu: false }, false)).toEqual({ path: "worker" });
    // WebGPU only in the worker: the worker, which gains it.
    expect(readPath(ALL, { offscreen2d: true, gpu: true }, false)).toEqual({ path: "worker" });
  });

  it("reads a page's capabilities off its global scope", () => {
    expect(pageCaps({})).toEqual({ worker: false, offscreenCanvas: false, imageBitmap: false });
    const f = () => {};
    expect(pageCaps({ Worker: f, OffscreenCanvas: f, createImageBitmap: f })).toEqual(ALL);
  });
});

describe("encodeRead / decodeFromWorker", () => {
  const card: FrameRead = {
    kind: "card", dark: false, crop: new Float32Array([1, 2, 3]), embedding: new Float32Array([0.6, 0.8]),
    outline: { corners: [{ x: 0, y: 0 }], width: 10, height: 10 }, detMs: 5, embMs: 9, backend: "webgpu",
    raw: { detIn: new Float32Array(1), corners: new Float32Array(8) },
  };

  it("sends a card's crop and embedding as copies of their own, transferred, and never the lab's raw", () => {
    const { msg, transfer } = encodeRead(7, card);
    expect(msg.type).toBe("read");
    const read = (msg as { read: FrameRead }).read;
    expect(read).toEqual({ ...card, raw: undefined });
    expect("raw" in read).toBe(false);
    // Copies: the worker's own arrays (one a timed-out WebGPU run may hold) are never detached.
    expect(read.kind === "card" && read.crop).not.toBe(card.crop);
    expect(transfer).toHaveLength(2);
    expect(transfer).toContain(read.kind === "card" ? read.crop.buffer : null);
  });

  it("sends no card, and no read, with nothing to transfer", () => {
    expect(encodeRead(1, { kind: "none", dark: true, detMs: 3, raw: card.raw })).toEqual({
      msg: { type: "read", id: 1, read: { kind: "none", dark: true, detMs: 3 } }, transfer: [],
    });
    expect(encodeRead(2, null)).toEqual({ msg: { type: "read", id: 2, read: null }, transfer: [] });
  });

  it("decodes the worker's messages and nothing else", () => {
    const { msg } = encodeRead(3, card);
    expect(decodeFromWorker(structuredClone(msg))).toEqual(msg);
    expect(decodeFromWorker({ type: "caps", caps: { offscreen2d: true, gpu: false } })).toEqual({ type: "caps", caps: { offscreen2d: true, gpu: false } });
    expect(decodeFromWorker({ type: "elsewhere" })).toBeNull();
    expect(decodeFromWorker("ready")).toBeNull();
    expect(decodeFromWorker(null)).toBeNull();
  });
});

describe("captureSize / outlineAt", () => {
  it("hands a frame over no bigger than the read draws it, its aspect kept", () => {
    expect(captureSize(1920, 1080, 1280)).toEqual({ width: 1280, height: 720 });
    expect(captureSize(1080, 1920, 1280)).toEqual({ width: 720, height: 1280 });
    expect(captureSize(640, 480, 1280)).toEqual({ width: 640, height: 480 });
  });
  it("tells an outline read off the smaller bitmap in the camera's own size, its corners shares as they were", () => {
    const o = { corners: [{ x: 0.25, y: 0.5 }], width: 1280, height: 720 };
    expect(outlineAt(o, { width: 1920, height: 1080 })).toEqual({ corners: [{ x: 0.25, y: 0.5 }], width: 1920, height: 1080 });
  });
});
