import { describe, expect, it, vi } from "vitest";
import { once, startGpuEmbedder, switchingEmbedder, type EmbedRun } from "./webgpu";

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
