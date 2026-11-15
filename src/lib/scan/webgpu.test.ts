import { describe, expect, it, vi } from "vitest";
import { EMBED_H, EMBED_W } from "./geometry";
import type { Ort, OrtSession } from "./pipeline";
import {
  EMBEDDING_LENGTH, frameEmbedder, loadGpuEmbedder, once, startGpuEmbedder, switchingEmbedder, usableEmbedding, type EmbedRun,
} from "./webgpu";

const WASM_OUT = new Float32Array([1, 0]);
const GPU_OUT = new Float32Array([0, 1]);
const crop = new Float32Array(3);

describe("startGpuEmbedder", () => {
  it("stays on WASM without a WebGPU adapter, and never loads the runtime", async () => {
    const load = vi.fn(async (): Promise<EmbedRun> => async () => GPU_OUT);
    const off = vi.fn();
    expect(await startGpuEmbedder({ adapter: async () => false, load }, off)).toBeNull();
    expect(load).not.toHaveBeenCalled();
    expect(off).toHaveBeenCalledWith("adapter");
  });

  it("stays on WASM when asking for the adapter throws", async () => {
    const load = vi.fn(async (): Promise<EmbedRun> => async () => GPU_OUT);
    expect(await startGpuEmbedder({ adapter: async () => { throw new Error("no gpu"); }, load })).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("stays on WASM when the runtime, the session or its warm-up fails, without rejecting", async () => {
    const off = vi.fn();
    const r = await startGpuEmbedder({ adapter: async () => true, load: () => Promise.reject(new Error("create failed")) }, off);
    expect(r).toBeNull();
    expect(off).toHaveBeenCalledWith("load");
  });

  it("answers the WebGPU embedder once it loads", async () => {
    const run: EmbedRun = async () => GPU_OUT;
    const off = vi.fn();
    expect(await startGpuEmbedder({ adapter: async () => true, load: async () => run }, off)).toBe(run);
    expect(off).not.toHaveBeenCalled();
  });
});

describe("switchingEmbedder", () => {
  it("embeds on WASM until the WebGPU embedder is adopted, then on WebGPU", async () => {
    const e = switchingEmbedder(async () => WASM_OUT);
    expect(await e.run(crop)).toEqual({ data: WASM_OUT, backend: "wasm" });
    e.adopt(async () => GPU_OUT);
    expect(e.backend()).toBe("webgpu");
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
    expect(e.backend()).toBe("wasm");
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
});

describe("once", () => {
  it("loads the runtime once per page: a later open shares the first load", async () => {
    const load = vi.fn(async () => "runtime");
    const get = once(load);
    expect(await get()).toBe("runtime");
    expect(await get()).toBe("runtime");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("tries a failed load afresh on the next call", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("download cut off")).mockResolvedValue("runtime");
    const get = once(load);
    await expect(get()).rejects.toThrow("download cut off");
    expect(await get()).toBe("runtime");
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("a closed scanner is not a WebGPU failure", () => {
  it("passes the error on and keeps WebGPU when the run threw because the scanner closed", async () => {
    const wasm = vi.fn(async () => WASM_OUT);
    const off = vi.fn();
    const e = switchingEmbedder(wasm, off);
    e.adopt(() => Promise.reject(new Error("left the page")));
    await expect(e.run(crop, () => false)).rejects.toThrow("left the page");
    expect(wasm).not.toHaveBeenCalled();
    expect(off).not.toHaveBeenCalled();
    expect(e.backend()).toBe("webgpu");
  });
});

describe("usableEmbedding", () => {
  const good = () => new Float32Array(EMBEDDING_LENGTH).fill(0.1);

  it("passes a finite embedding of the model's length", () => {
    const d = good();
    expect(usableEmbedding(d)).toBe(d);
  });

  it("refuses a wrong length or a value that is not finite", () => {
    expect(() => usableEmbedding(new Float32Array(EMBEDDING_LENGTH - 1))).toThrow();
    for (const bad of [NaN, Infinity]) {
      const d = good();
      d[7] = bad;
      expect(() => usableEmbedding(d)).toThrow();
    }
  });

  it("an unusable WebGPU answer is run again on WASM, and WASM keeps the embedder", async () => {
    const off = vi.fn();
    const gpu = vi.fn(async () => usableEmbedding(new Float32Array(EMBEDDING_LENGTH).fill(NaN)));
    const e = switchingEmbedder(async () => WASM_OUT, off);
    e.adopt(gpu);
    expect(await e.run(crop)).toEqual({ data: WASM_OUT, backend: "wasm" });
    expect(off).toHaveBeenCalledExactlyOnceWith("run");
    await e.run(crop);
    expect(gpu).toHaveBeenCalledTimes(1);
  });
});

/** A fake runtime whose sessions answer `out` and record how they were created. */
function fakeOrt(out: Float32Array) {
  const creates: Record<string, unknown>[] = [];
  const session: OrtSession = {
    inputNames: ["input"],
    run: vi.fn(async () => ({ embedding: { data: out } })),
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

describe("loadGpuEmbedder", () => {
  it("asks for the webgpu provider and nothing else, warms up, and answers checked embeddings", async () => {
    const out = new Float32Array(EMBEDDING_LENGTH).fill(0.5);
    const { ort, creates, session } = fakeOrt(out);
    const run = await loadGpuEmbedder(Promise.resolve(new Uint8Array(1)), (s) => s, direct, async () => ort);
    expect(creates).toEqual([{ executionProviders: ["webgpu"] }]);
    expect(session.run).toHaveBeenCalledTimes(1); // the warm-up
    expect(await run(embedCrop)).toBe(out);
  });

  it("fails its load when the warm-up answers an unusable embedding", async () => {
    const { ort } = fakeOrt(new Float32Array(EMBEDDING_LENGTH).fill(NaN));
    await expect(loadGpuEmbedder(Promise.resolve(new Uint8Array(1)), (s) => s, direct, async () => ort)).rejects.toThrow();
  });
});

describe("frameEmbedder (framePipeline's embedder)", () => {
  it("embeds on WASM until the WebGPU embedder arrives, then on WebGPU", async () => {
    const wasmOut = new Float32Array(EMBEDDING_LENGTH).fill(1);
    const gpuOut = new Float32Array(EMBEDDING_LENGTH).fill(2);
    const { ort } = fakeOrt(wasmOut);
    let arrive: (r: EmbedRun | null) => void = () => {};
    const gpu = new Promise<EmbedRun | null>((r) => (arrive = r));
    const wasmSession = (await ort.InferenceSession.create(new Uint8Array(1)));
    const embed = frameEmbedder(ort, wasmSession, direct, gpu);
    expect(await embed.run(embedCrop)).toEqual({ data: wasmOut, backend: "wasm" });
    arrive(async () => gpuOut);
    await gpu;
    expect(await embed.run(embedCrop)).toEqual({ data: gpuOut, backend: "webgpu" });
  });

  it("stays on WASM when WebGPU never comes", async () => {
    const { ort } = fakeOrt(new Float32Array(EMBEDDING_LENGTH));
    const embed = frameEmbedder(ort, await ort.InferenceSession.create(new Uint8Array(1)), direct, Promise.resolve(null));
    await Promise.resolve();
    expect((await embed.run(embedCrop)).backend).toBe("wasm");
  });
});
