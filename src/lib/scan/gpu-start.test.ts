import { describe, expect, it, vi } from "vitest";
import { GPU_START_MODES, gpuStartsAtOpen, scheduleGpuEmbedder, SCANNER_GPU_START } from "./gpu-start";
import { filesCached, modelCacheName, type ModelCacheDeps } from "./model-cache";

const run = async () => new Float32Array(1);
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("gpuStartsAtOpen", () => {
  it("starts the scanner's embedder at open only when the runtime is cached", () => {
    expect(SCANNER_GPU_START).toBe("at-open");
    expect(gpuStartsAtOpen(SCANNER_GPU_START, true)).toBe(true);
    expect(gpuStartsAtOpen(SCANNER_GPU_START, false)).toBe(false);
  });
  it("lets the lab's modes override the cache", () => {
    expect(gpuStartsAtOpen("after-answer", true)).toBe(false);
    expect(gpuStartsAtOpen("after-answer", false)).toBe(false);
    expect(gpuStartsAtOpen("frontload", false)).toBe(true);
    expect(gpuStartsAtOpen("frontload", true)).toBe(true);
    expect(GPU_START_MODES).toEqual(["after-answer", "at-open", "frontload"]);
  });
});

describe("scheduleGpuEmbedder", () => {
  function deferred() {
    let resolve!: () => void;
    const p = new Promise<void>((r) => { resolve = r; });
    return { p, resolve };
  }

  it("never starts the download before the first answer on a not-cached scanner open", async () => {
    const answer = deferred();
    const start = vi.fn(async () => run);
    const out = scheduleGpuEmbedder({ mode: SCANNER_GPU_START, runtimeCached: Promise.resolve(false), firstAnswer: () => answer.p, start });
    await flush();
    expect(start).not.toHaveBeenCalled();
    answer.resolve();
    expect(await out).toBe(run);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("reads a failed cache check as not cached", async () => {
    const start = vi.fn(async () => run);
    void scheduleGpuEmbedder({ mode: "at-open", runtimeCached: Promise.reject(new Error("blocked")), firstAnswer: () => new Promise(() => {}), start });
    await flush();
    expect(start).not.toHaveBeenCalled();
  });

  it("starts at open, with no answer drawn, when cached or frontloading", async () => {
    for (const [mode, cached] of [["at-open", true], ["frontload", false]] as const) {
      const start = vi.fn(async () => run);
      expect(await scheduleGpuEmbedder({ mode, runtimeCached: Promise.resolve(cached), firstAnswer: () => new Promise(() => {}), start })).toBe(run);
      expect(start).toHaveBeenCalledTimes(1);
    }
  });

  it("waits for the answer in after-answer mode even when cached", async () => {
    const start = vi.fn(async () => run);
    void scheduleGpuEmbedder({ mode: "after-answer", runtimeCached: Promise.resolve(true), firstAnswer: () => new Promise(() => {}), start });
    await flush();
    expect(start).not.toHaveBeenCalled();
  });
});

describe("filesCached", () => {
  const file = { url: "https://example.test/rt.wasm", sha256: "a".repeat(64) };
  const deps = (names: string[], urls: string[]): ModelCacheDeps => ({
    caches: {
      has: async (n: string) => names.includes(n),
      match: async (u: string) => (urls.includes(u) ? new Response("x") : undefined),
      open: () => { throw new Error("must not open (it would create the cache)"); },
    } as unknown as CacheStorage,
    fetch: () => { throw new Error("must not download"); },
    sha256: async () => "",
  });

  it("answers from Cache Storage without opening a cache or downloading", async () => {
    const name = modelCacheName([file], "scan-ort-");
    expect(await filesCached([file], deps([name], [file.url]), "scan-ort-")).toBe(true);
    expect(await filesCached([file], deps([name], []), "scan-ort-")).toBe(false);
    expect(await filesCached([file], deps([], [file.url]), "scan-ort-")).toBe(false);
    expect(await filesCached([file], { ...deps([], []), caches: null }, "scan-ort-")).toBe(false);
  });
});
