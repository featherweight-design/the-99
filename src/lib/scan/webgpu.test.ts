import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMBED_DIM } from "../card-scan/match";
import { EMBED_H, EMBED_W } from "./geometry";
import { resetScanMarks } from "./marks";
import type { Ort, OrtSession } from "./pipeline";
import {
  frameEmbedder, GPU_RUN_TIMEOUT_MS, loadGpuEmbedder, runtimeLoader, ScannerClosed, startGpuEmbedder, switchingEmbedder,
  usableEmbedding, withTimeout, type EmbedRun,
} from "./webgpu";

const WASM_OUT = new Float32Array([1, 0]);
const GPU_OUT = new Float32Array([0, 1]);
const crop = new Float32Array(3);
const yes = () => true;

/** The scan marks made since the last reset, by name. */
const marks = () => performance.getEntriesByType("mark").map((m) => m.name);

describe("startGpuEmbedder", () => {
  beforeEach(() => resetScanMarks());

  it("stays on WASM without a WebGPU adapter, marks none (not off), and never loads the runtime", async () => {
    const load = vi.fn(async (): Promise<EmbedRun> => async () => GPU_OUT);
    expect(await startGpuEmbedder({ adapter: async () => false, load, alive: yes })).toBeNull();
    expect(load).not.toHaveBeenCalled();
    expect(marks()).toContain("scan:webgpu-none");
    expect(marks()).not.toContain("scan:webgpu-off");
  });

  it("stays on WASM when asking for the adapter throws", async () => {
    const load = vi.fn(async (): Promise<EmbedRun> => async () => GPU_OUT);
    expect(await startGpuEmbedder({ adapter: async () => { throw new Error("no gpu"); }, load, alive: yes })).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("stays on WASM when the runtime, the session or its warm-up fails, without rejecting, and marks it off", async () => {
    expect(await startGpuEmbedder({ adapter: async () => true, load: () => Promise.reject(new Error("create failed")), alive: yes })).toBeNull();
    expect(marks()).toContain("scan:webgpu-off");
  });

  it("marks nothing when the scanner closed mid-load: that is the close, not WebGPU", async () => {
    expect(await startGpuEmbedder({ adapter: async () => true, load: () => Promise.reject(new ScannerClosed()), alive: yes })).toBeNull();
    let open = true;
    const load = async (): Promise<EmbedRun> => {
      open = false;
      throw new Error("left the page");
    };
    expect(await startGpuEmbedder({ adapter: async () => true, load, alive: () => open })).toBeNull();
    expect(marks()).not.toContain("scan:webgpu-off");
  });

  it("never starts the load once the scanner closed during the adapter check", async () => {
    const load = vi.fn(async (): Promise<EmbedRun> => async () => GPU_OUT);
    expect(await startGpuEmbedder({ adapter: async () => true, load, alive: () => false })).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("answers the WebGPU embedder once it loads", async () => {
    const run: EmbedRun = async () => GPU_OUT;
    expect(await startGpuEmbedder({ adapter: async () => true, load: async () => run, alive: yes })).toBe(run);
    expect(marks()).not.toContain("scan:webgpu-off");
  });
});

describe("switchingEmbedder", () => {
  it("embeds on WASM until the WebGPU embedder is adopted, then on WebGPU", async () => {
    const e = switchingEmbedder(async () => WASM_OUT);
    expect(await e.run(crop)).toEqual({ data: WASM_OUT, backend: "wasm" });
    e.adopt(async () => GPU_OUT);
    expect(await e.run(crop)).toEqual({ data: GPU_OUT, backend: "webgpu" });
  });

  it("answers a frame whose WebGPU run throws from WASM, and stays on WASM for the rest of the session", async () => {
    const wasm = vi.fn(async () => WASM_OUT);
    const gpu = vi.fn(async (): Promise<Float32Array> => { throw new Error("device lost"); });
    const off = vi.fn();
    const e = switchingEmbedder(wasm, off);
    e.adopt(gpu);
    expect(await e.run(crop)).toEqual({ data: WASM_OUT, backend: "wasm" });
    expect(wasm).toHaveBeenCalledWith(crop);
    expect(off).toHaveBeenCalledExactlyOnceWith("run");
    await e.run(crop);
    expect(gpu).toHaveBeenCalledTimes(1);
    // a WebGPU embedder arriving after one failed is not taken back
    e.adopt(async () => GPU_OUT);
    expect(await e.run(crop)).toEqual({ data: WASM_OUT, backend: "wasm" });
  });

  it("reports a WASM failure as it always did", async () => {
    const e = switchingEmbedder(() => Promise.reject(new Error("left the page")));
    await expect(e.run(crop)).rejects.toThrow("left the page");
  });

  it("passes the error on and keeps WebGPU when the run threw because the scanner closed", async () => {
    const wasm = vi.fn(async () => WASM_OUT);
    const off = vi.fn();
    const e = switchingEmbedder(wasm, off);
    e.adopt(() => Promise.reject(new Error("left the page")));
    await expect(e.run(crop, () => false)).rejects.toThrow("left the page");
    expect(wasm).not.toHaveBeenCalled();
    expect(off).not.toHaveBeenCalled();
  });
});

describe("usableEmbedding", () => {
  const good = () => new Float32Array(EMBED_DIM).fill(0.1);

  it("passes a finite embedding of the match route's length", () => {
    const d = good();
    expect(usableEmbedding(d)).toBe(d);
  });

  it("refuses a wrong length or a value that is not finite", () => {
    expect(() => usableEmbedding(new Float32Array(EMBED_DIM - 1))).toThrow();
    for (const bad of [NaN, Infinity]) {
      const d = good();
      d[7] = bad;
      expect(() => usableEmbedding(d)).toThrow();
    }
  });

  it("an unusable WebGPU answer is run again on WASM, and WASM keeps the embedder", async () => {
    const off = vi.fn();
    const gpu = vi.fn(async () => usableEmbedding(new Float32Array(EMBED_DIM).fill(NaN)));
    const e = switchingEmbedder(async () => WASM_OUT, off);
    e.adopt(gpu);
    expect(await e.run(crop)).toEqual({ data: WASM_OUT, backend: "wasm" });
    expect(off).toHaveBeenCalledExactlyOnceWith("run");
    await e.run(crop);
    expect(gpu).toHaveBeenCalledTimes(1);
  });
});

describe("withTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("rejects a run that never settles once the limit passes", async () => {
    const r = expect(withTimeout(new Promise(() => {}), GPU_RUN_TIMEOUT_MS)).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(GPU_RUN_TIMEOUT_MS);
    await r;
  });

  it("answers a run that settles in time", async () => {
    await expect(withTimeout(Promise.resolve(7), GPU_RUN_TIMEOUT_MS)).resolves.toBe(7);
  });
});

describe("runtimeLoader", () => {
  const fakeRuntime = {} as Ort;

  it("loads the runtime once per page: a later open shares the first, never reading the bytes again", async () => {
    const bytes = vi.fn(async () => new Uint8Array(1));
    const load = vi.fn(async () => fakeRuntime);
    const get = runtimeLoader(bytes, load);
    expect(await get()).toBe(fakeRuntime);
    expect(await get()).toBe(fakeRuntime);
    expect(bytes).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("tries a failed load afresh on the next call", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("init failed")).mockResolvedValue(fakeRuntime);
    const get = runtimeLoader(async () => new Uint8Array(1), load);
    await expect(get()).rejects.toThrow("init failed");
    expect(await get()).toBe(fakeRuntime);
  });

  it("never compiles the bytes for a scanner that closed while they came in", async () => {
    const load = vi.fn(async () => fakeRuntime);
    const get = runtimeLoader(async () => new Uint8Array(1), load);
    await expect(get(() => false)).rejects.toBeInstanceOf(ScannerClosed);
    expect(load).not.toHaveBeenCalled();
  });
});

/** A fake runtime whose sessions answer `out` and record how they were created. */
function fakeOrt(out: Float32Array, run?: () => Promise<unknown>) {
  const creates: Record<string, unknown>[] = [];
  const session: OrtSession = {
    inputNames: ["input"],
    run: vi.fn(run ?? (async () => ({ embedding: { data: out } }))) as OrtSession["run"],
    release: async () => {},
  };
  const ort = {
    env: { wasm: { wasmPaths: "", numThreads: 1 } },
    Tensor: class {
      constructor(public type: string, public data: Float32Array, public dims: number[]) {}
    },
    InferenceSession: {
      create: async (_m: Uint8Array, opts?: Record<string, unknown>) => {
        creates.push(opts ?? {});
        return session;
      },
    },
  } as unknown as Ort;
  return { ort, creates, session };
}

const direct = <T,>(fn: () => Promise<T>) => fn();
const embedCrop = new Float32Array(3 * EMBED_H * EMBED_W);
const model = () => Promise.resolve(new Uint8Array(1));

describe("loadGpuEmbedder", () => {
  it("asks for the webgpu provider and nothing else, warms up, and answers checked embeddings", async () => {
    const out = new Float32Array(EMBED_DIM).fill(0.5);
    const { ort, creates, session } = fakeOrt(out);
    const run = await loadGpuEmbedder(model(), (s) => s, direct, yes, async () => ort);
    expect(creates).toEqual([{ executionProviders: ["webgpu"] }]);
    expect(session.run).toHaveBeenCalledTimes(1); // the warm-up
    expect(await run(embedCrop)).toBe(out);
  });

  it("fails its load when the warm-up answers an unusable embedding", async () => {
    const { ort } = fakeOrt(new Float32Array(EMBED_DIM).fill(NaN));
    await expect(loadGpuEmbedder(model(), (s) => s, direct, yes, async () => ort)).rejects.toThrow();
  });

  it("stops without a session once the scanner closed while the runtime loaded", async () => {
    const { ort, creates } = fakeOrt(new Float32Array(EMBED_DIM));
    await expect(loadGpuEmbedder(model(), (s) => s, direct, () => false, async () => ort)).rejects.toBeInstanceOf(ScannerClosed);
    expect(creates).toEqual([]);
  });

  describe("a run that never settles", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("fails inside `infer`, so the holder's count of runs in flight comes back down", async () => {
      let hang = false;
      const { ort } = fakeOrt(new Float32Array(EMBED_DIM), () => (hang ? new Promise(() => {}) : Promise.resolve({ e: { data: new Float32Array(EMBED_DIM) } })));
      let busy = 0;
      const counted = async <T,>(fn: () => Promise<T>) => {
        busy++;
        try {
          return await fn();
        } finally {
          busy--;
        }
      };
      const run = await loadGpuEmbedder(model(), (s) => s, counted, yes, async () => ort);
      hang = true;
      const r = expect(run(embedCrop)).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(GPU_RUN_TIMEOUT_MS);
      await r;
      expect(busy).toBe(0);
    });
  });
});

describe("frameEmbedder (framePipeline's embedder)", () => {
  it("embeds on WASM until the WebGPU embedder arrives, then on WebGPU", async () => {
    const wasmOut = new Float32Array(EMBED_DIM).fill(1);
    const gpuOut = new Float32Array(EMBED_DIM).fill(2);
    const { ort } = fakeOrt(wasmOut);
    let arrive: (r: EmbedRun | null) => void = () => {};
    const gpu = new Promise<EmbedRun | null>((r) => (arrive = r));
    const wasmSession = await ort.InferenceSession.create(new Uint8Array(1));
    const embed = frameEmbedder(ort, wasmSession, direct, gpu);
    expect(await embed.run(embedCrop)).toEqual({ data: wasmOut, backend: "wasm" });
    arrive(async () => gpuOut);
    await gpu;
    expect(await embed.run(embedCrop)).toEqual({ data: gpuOut, backend: "webgpu" });
  });

  it("stays on WASM when WebGPU never comes", async () => {
    const { ort } = fakeOrt(new Float32Array(EMBED_DIM));
    const embed = frameEmbedder(ort, await ort.InferenceSession.create(new Uint8Array(1)), direct, Promise.resolve(null));
    await Promise.resolve();
    expect((await embed.run(embedCrop)).backend).toBe("wasm");
  });
});
