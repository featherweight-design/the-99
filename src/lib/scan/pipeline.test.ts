// The gate between the detector and the embedder: a card is read only when it is sharp enough and big enough in the
// frame. The rest of the pipeline draws on canvases and runs the models, which the lab's browser proof exercises.
import { describe, expect, it, vi } from "vitest";
import { cardInView, loadModelBytes, loadModels, MIN_CARD_AREA, sourceSize, type Ort, type OrtSession, type Source } from "./pipeline";
import { DETECTOR_BYTES, EMBEDDER_BYTES, SHARPNESS_GATE } from "./models";
import { resetModelLoad, scanModelLoad } from "./model-progress";

const W = 1000, H = 1000;
/** A square of the given share of the frame. */
const quad = (share: number) => {
  const side = Math.sqrt(share * W * H);
  return [{ x: 0, y: 0 }, { x: side, y: 0 }, { x: side, y: side }, { x: 0, y: side }];
};

describe("cardInView", () => {
  it("reads a sharp card that fills enough of the frame", () => {
    expect(cardInView(SHARPNESS_GATE, quad(0.3), W, H)).toBe(true);
  });

  it("passes over a blurred frame", () => {
    expect(cardInView(SHARPNESS_GATE - 0.001, quad(0.3), W, H)).toBe(false);
  });

  it("passes over a card too small in the frame", () => {
    expect(cardInView(1, quad(MIN_CARD_AREA * 0.9), W, H)).toBe(false);
    expect(cardInView(1, quad(MIN_CARD_AREA * 1.1), W, H)).toBe(true);
  });
});

describe("sourceSize", () => {
  it("reads a video by its picture, never its element's box", () => {
    const video = { videoWidth: 1920, videoHeight: 1080, width: 300, height: 150 } as unknown as Source;
    expect(sourceSize(video)).toEqual({ width: 1920, height: 1080 });
  });

  it("reads a still (a chosen photo's bitmap) by its own size", () => {
    const bitmap = { width: 3024, height: 4032 } as unknown as Source;
    expect(sourceSize(bitmap)).toEqual({ width: 3024, height: 4032 });
  });
});

/** A fetch whose bodies stay open, keyed by file, so a test says when each one's bytes land or fail. */
function heldFetch() {
  const bodies: Record<"detector" | "embedder", ReadableStreamDefaultController<Uint8Array>[]> = { detector: [], embedder: [] };
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
    new Response(new ReadableStream<Uint8Array>({ start: (c) => void bodies[String(url).includes("ccgdetector") ? "detector" : "embedder"].push(c) })));
  return { bodies, spy };
}

describe("loadModelBytes", () => {
  it("shares a download already under way, so a scanner mounted twice never fetches the files twice", async () => {
    const fails: ((e: Error) => void)[] = [];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>((_, reject) => fails.push(reject)));
    try {
      const first = loadModelBytes();
      const second = loadModelBytes();
      expect(second.detector).toBe(first.detector);
      expect(second.embedder).toBe(first.embedder);
      await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
      // once both settle they are let go: the next scanner starts its own
      for (const f of fails) f(new Error("offline"));
      await expect(first.detector).rejects.toThrow("offline");
      await expect(first.embedder).rejects.toThrow("offline");
      await new Promise((r) => setTimeout(r, 0));
      const next = loadModelBytes();
      expect(next.detector).not.toBe(first.detector);
      expect(next.embedder).not.toBe(first.embedder);
      // The shared load lives as long as the page (the module), so this one is ended here, still under the fake fetch:
      // left running it would be the next test's shared load, and its fetch the real one.
      await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(4));
      for (const f of fails.slice(2)) f(new Error("offline"));
      await expect(next.detector).rejects.toThrow("offline");
      await expect(next.embedder).rejects.toThrow("offline");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("keeps one download going across a close, and a reopen reads its real progress (loading L1)", async () => {
    resetModelLoad();
    const { bodies, spy } = heldFetch();
    try {
      const first = loadModelBytes(undefined, { report: true });
      await vi.waitFor(() => expect(bodies.embedder).toHaveLength(1));
      bodies.detector[0].enqueue(new Uint8Array(1000));
      // the scanner closes (its frame reader lets go of its sessions, never the load) and opens again
      const reopened = loadModelBytes(undefined, { report: true });
      expect(reopened.detector).toBe(first.detector);
      expect(spy).toHaveBeenCalledTimes(2);
      await vi.waitFor(() => {
        const load = scanModelLoad.get()!;
        expect(load.files.detector).toMatchObject({ from: "network", loaded: 1000, total: DETECTOR_BYTES, done: false });
        expect(load.files.embedder).toMatchObject({ from: "network", loaded: 0, total: EMBEDDER_BYTES });
      });
      for (const b of [...bodies.detector, ...bodies.embedder]) b.close();
      await expect(first.detector).rejects.toThrow(/pinned hash/);
      await expect(first.embedder).rejects.toThrow(/pinned hash/);
      // nothing loading and no scanner holding it: the snapshot is let go
      await vi.waitFor(() => expect(scanModelLoad.get()).toBeNull());
    } finally {
      spy.mockRestore();
      resetModelLoad();
    }
  });

  it("starts a failed file again at once, beside the other still downloading, as a download at 0 (READINESS 6)", async () => {
    resetModelLoad();
    const { bodies, spy } = heldFetch();
    try {
      const first = loadModelBytes(undefined, { report: true });
      await vi.waitFor(() => expect(bodies.embedder).toHaveLength(1));
      bodies.detector[0].enqueue(new Uint8Array(500));
      bodies.detector[0].error(new Error("connection reset"));
      await expect(first.detector).rejects.toThrow("connection reset");
      await vi.waitFor(() => expect(scanModelLoad.get()!.files.detector.failed).toBe(true));
      // the next frame's retry: never the rejected promise, and never waiting on the embedder
      const retry = loadModelBytes(undefined, { report: true });
      expect(retry.detector).not.toBe(first.detector);
      expect(retry.embedder).toBe(first.embedder);
      await vi.waitFor(() => expect(bodies.detector).toHaveLength(2));
      expect(spy).toHaveBeenCalledTimes(3);
      // still a download (loading L1 with fresh progress), never a probe that would read as loading L4
      expect(scanModelLoad.get()!.files.detector).toMatchObject({ from: "network", loaded: 0, failed: false, done: false });
      bodies.detector[1].error(new Error("again"));
      bodies.embedder[0].error(new Error("again"));
      await expect(retry.detector).rejects.toThrow();
      await expect(retry.embedder).rejects.toThrow();
    } finally {
      spy.mockRestore();
      resetModelLoad();
    }
  });

  it("feeds no loading bar from a load that does not ask to (the scan lab), or one given its own deps", async () => {
    resetModelLoad();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("x"));
    try {
      const lab = loadModelBytes();
      await expect(lab.detector).rejects.toThrow();
      const loads = loadModelBytes({ caches: null, fetch: (async () => new Response("x")) as unknown as typeof fetch, sha256: async () => "no" });
      await expect(loads.detector).rejects.toThrow();
      expect(scanModelLoad.get()).toBeNull();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("deletes the caches of a revision no longer pinned as it loads", async () => {
    const deleted: string[] = [];
    const caches = {
      open: async () => ({ match: async () => undefined, put: async () => {}, delete: async () => true }),
      keys: async () => ["scan-models-old", "static-v3"],
      delete: async (n: string) => (deleted.push(n), true),
    } as unknown as CacheStorage;
    const loads = loadModelBytes({ caches, fetch: (async () => new Response("x")) as unknown as typeof fetch, sha256: async () => "no" });
    await expect(loads.detector).rejects.toThrow();
    await vi.waitFor(() => expect(deleted).toEqual(["scan-models-old"]));
  });
});

describe("loadModels", () => {
  it("warms each session once through `infer`, and a warm-up that fails does not fail the load", async () => {
    const runs: number[][] = [];
    const ort = {
      env: { wasm: { wasmPaths: "", numThreads: 1 } },
      Tensor: class {
        constructor(_t: string, _d: Float32Array, public dims: number[]) {}
      },
      InferenceSession: {
        create: async (): Promise<OrtSession> => ({
          inputNames: ["input"],
          release: async () => {},
          run: async (feeds) => {
            runs.push((feeds.input as { dims: number[] }).dims);
            throw new Error("an op the blank input trips");
          },
        }),
      },
    } as unknown as Ort;
    let inferred = 0;
    const infer = <T,>(fn: () => Promise<T>) => {
      inferred++;
      return fn();
    };
    const held: OrtSession[] = [];
    const bytes = { detector: Promise.resolve(new Uint8Array(1)), embedder: Promise.resolve(new Uint8Array(1)) };
    const models = await loadModels(ort, (s) => (held.push(s), s), { bytes, infer });
    expect(held).toHaveLength(2);
    expect(models.detector).toBe(held[0]);
    expect(inferred).toBe(2);
    expect(runs).toEqual(expect.arrayContaining([[1, 3, 384, 384], [1, 3, 448, 320]]));
  });
});
