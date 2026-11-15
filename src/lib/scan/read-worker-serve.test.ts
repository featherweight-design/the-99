import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serveReads, type Reader, type ServeDeps, type WorkerScope } from "./read-worker-serve";
import { relayScanMarks, resetScanMarks, scanMark } from "./marks";
import type { FromWorker, ToWorker } from "./read-worker-protocol";
import type { FrameRead, ModelBytesLoads, Ort } from "./pipeline";

/** The worker's global scope stood in: what it posted, and a hand to send it the page's messages. */
function scope() {
  const posted: FromWorker[] = [];
  const s: WorkerScope & { posted: FromWorker[]; send(m: ToWorker): void } = {
    posted,
    onmessage: null,
    postMessage: (m) => void posted.push(m),
    send(m) {
      this.onmessage?.({ data: m } as MessageEvent<ToWorker>);
    },
  };
  return s;
}

const frame = () => ({ close: vi.fn(), width: 4, height: 4 }) as unknown as ImageBitmap & { close: ReturnType<typeof vi.fn> };
const NONE: FrameRead = { kind: "none", dark: false, detMs: 2 };

function deps(over: Partial<ServeDeps> = {}): ServeDeps & { reads: ReturnType<typeof vi.fn>; got: ModelBytesLoads[] } {
  const reads = vi.fn(async (): Promise<FrameRead | null> => NONE);
  const got: ModelBytesLoads[] = [];
  return {
    reads, got,
    loadOrt: async () => ({}) as Ort,
    gpu: async () => true,
    has2d: () => true,
    start: async (_ort, bytes): Promise<Reader> => {
      got.push(bytes);
      await Promise.all([bytes.detector, bytes.embedder]);
      // the sessions' marks, made while the worker is not yet accepted
      scanMark("scan:detector-session");
      return { read: reads };
    },
    ...over,
  };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

/** Boots a worker and starts its reader from both models. */
async function ready(s = scope(), d = deps()) {
  const served = serveReads(s, d);
  s.send({ type: "model", key: "detector", bytes: new Uint8Array(1) });
  s.send({ type: "model", key: "embedder", bytes: new Uint8Array(2) });
  s.send({ type: "init", gpuMode: "at-open" });
  await vi.waitFor(() => expect(s.posted.some((m) => m.type === "ready")).toBe(true));
  return { s, d, served };
}

beforeEach(() => resetScanMarks());
afterEach(() => relayScanMarks(null));

describe("serveReads", () => {
  it("always says what it can, a failed check reading as no", async () => {
    const s = scope();
    serveReads(s, deps({ gpu: () => Promise.reject(new Error("no adapter")), has2d: () => { throw new Error("no canvas"); } }));
    await settle();
    expect(s.posted).toContainEqual({ type: "caps", caps: { offscreen2d: false, gpu: false } });
    expect(s.posted).toContainEqual({ type: "ort", ok: true });
  });

  it("holds its marks until the page accepts it, then hands them over and every one after", async () => {
    const { s } = await ready();
    expect(s.posted.some((m) => m.type === "mark")).toBe(false);
    s.send({ type: "accept" });
    expect(s.posted).toContainEqual({ type: "mark", name: "scan:detector-session", detail: undefined });
    scanMark("scan:first-detect");
    expect(s.posted.at(-1)).toEqual({ type: "mark", name: "scan:first-detect", detail: undefined });
  });

  it("lets go of the models' bytes once the reader holds them", async () => {
    const s = scope();
    const d = deps();
    const served = serveReads(s, d);
    expect(served.holdsBytes()).toBe(true);
    s.send({ type: "model", key: "detector", bytes: new Uint8Array(1) });
    s.send({ type: "model", key: "embedder", bytes: new Uint8Array(2) });
    s.send({ type: "init", gpuMode: "at-open" });
    await vi.waitFor(() => expect(s.posted.some((m) => m.type === "ready")).toBe(true));
    expect(served.holdsBytes()).toBe(false);
    expect(await d.got[0].embedder).toEqual(new Uint8Array(2));
  });

  it("answers a start that failed, a model that never came included", async () => {
    const s = scope();
    serveReads(s, deps());
    s.send({ type: "model-failed", key: "detector" });
    s.send({ type: "init", gpuMode: "at-open" });
    await vi.waitFor(() => expect(s.posted.some((m) => m.type === "init-failed")).toBe(true));
    expect(s.posted.some((m) => m.type === "ready")).toBe(false);
  });

  it("closes every frame it is handed, read or failed", async () => {
    const { s, d } = await ready();
    const ok = frame();
    s.send({ type: "read", id: 1, frame: ok });
    await vi.waitFor(() => expect(s.posted).toContainEqual({ type: "read", id: 1, read: NONE }));
    expect(ok.close).toHaveBeenCalledTimes(1);
    d.reads.mockRejectedValueOnce(new Error("the detector threw"));
    const bad = frame();
    s.send({ type: "read", id: 2, frame: bad });
    await vi.waitFor(() => expect(s.posted).toContainEqual({ type: "read-failed", id: 2, message: "the detector threw" }));
    expect(bad.close).toHaveBeenCalledTimes(1);
  });

  it("closes a frame that arrives before the reader started, and says so", async () => {
    const s = scope();
    serveReads(s, deps());
    const early = frame();
    s.send({ type: "read", id: 7, frame: early });
    await vi.waitFor(() => expect(s.posted.some((m) => m.type === "read-failed")).toBe(true));
    expect(early.close).toHaveBeenCalledTimes(1);
  });
});
