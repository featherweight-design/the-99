import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { EMBED_DIM } from "../../../lib/card-scan/match";
import { useCardScan, type CardScanDeps, type FrameRead } from "./use-card-scan";

const SOL = { oracleId: "11111111-1111-4111-8111-111111111111", name: "Sol Ring", scryfallId: "s1", typeLine: "Artifact", imageUri: "https://img/sol", score: 0.97 };
const unit = () => {
  const v = new Float32Array(EMBED_DIM);
  v[0] = 1;
  return v;
};
const stream = () => {
  const track = { stop: vi.fn(), getCapabilities: () => ({}) };
  return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
};
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

function setup(over: Partial<CardScanDeps> = {}, frame: FrameRead = { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false }) {
  let t = 0;
  const fetch = vi.fn(() => json({ index: "all", guesses: [SOL], margin: null }));
  const deps: CardScanDeps = {
    readFrame: async () => {
      await new Promise((r) => setTimeout(r, 5));
      return frame;
    },
    getUserMedia: async () => stream(),
    fetch: fetch as unknown as typeof globalThis.fetch,
    wait: async () => {},
    now: () => (t += 200),
    storage: null,
    ...over,
  };
  const onAdd = vi.fn();
  const onProblem = vi.fn();
  // A fresh callback every render, as an inline caller passes: the problem must still be said once.
  const hook = renderHook(() => useCardScan(true, deps, onAdd, (k) => onProblem(k)));
  act(() => hook.result.current.attachVideo(document.createElement("video")));
  return { hook, onAdd, onProblem, fetch };
}

describe("useCardScan", () => {
  it("looks a steady card up once and offers it, then adds it under the current mode", async () => {
    const { hook, onAdd, fetch } = setup();
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ kind: "scanning", panel: { kind: "sure" } }), { timeout: 4000 });
    expect(fetch).toHaveBeenCalledTimes(1);
    act(() => hook.result.current.add());
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ oracleId: SOL.oracleId, name: "Sol Ring" }), "fast");
    expect(hook.result.current.count).toBe(1);
    expect(hook.result.current.screen).toMatchObject({ panel: { kind: "added", name: "Sol Ring" } });
    expect(hook.result.current.flipTo).toBe("https://img/sol");
  });

  it("holds the guess under the finger and lets it go", async () => {
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure" } }), { timeout: 4000 });
    act(() => hook.result.current.hold());
    expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure", held: true } });
    act(() => hook.result.current.cancelHold());
    expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure", held: false } });
  });

  it("shows the blocked screen when the camera is refused", async () => {
    const { hook } = setup({ getUserMedia: () => Promise.reject(new Error("NotAllowedError")) });
    await waitFor(() => expect(hook.result.current.screen).toEqual({ kind: "blocked" }));
  });

  it("says a refused lookup once and goes back to looking", async () => {
    const fetch = vi.fn(() => json(null, 404));
    const { hook, onProblem } = setup({ fetch: fetch as unknown as typeof globalThis.fetch });
    await waitFor(() => expect(onProblem).toHaveBeenCalledWith("refused"), { timeout: 4000 });
    hook.rerender();
    hook.rerender();
    expect(onProblem).toHaveBeenCalledTimes(1);
    expect(hook.result.current.screen).toMatchObject({ panel: { kind: "looking" } });
  });

  it("starts at Fast, and a mode change is kept for this device", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } as unknown as Storage;
    const { hook } = setup({ storage });
    expect(hook.result.current.mode).toBe("fast");
    act(() => hook.result.current.setMode("normal"));
    expect(hook.result.current.mode).toBe("normal");
    expect([...store.values()]).toEqual(["normal"]);
  });

  it("offers no light on a camera without a torch", async () => {
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.screen.kind).toBe("scanning"));
    expect(hook.result.current.torch).toEqual({ available: false, on: false });
  });
});
