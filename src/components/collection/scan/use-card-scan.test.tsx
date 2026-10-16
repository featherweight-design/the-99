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

function setup(
  over: Partial<CardScanDeps> = {},
  frame: FrameRead = { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false },
  listed: ReadonlyMap<string, number> = new Map(),
) {
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
  // The sheet's list, as the sheet would keep it: an add puts the card on it.
  const list = { current: listed };
  const onAdd = vi.fn(async (g: { oracleId: string }) => {
    list.current = new Map(list.current).set(g.oracleId, (list.current.get(g.oracleId) ?? 0) + 1);
    return true;
  });
  const onProblem = vi.fn();
  // A fresh callback every render, as an inline caller passes: the problem must still be said once.
  const hook = renderHook(() => useCardScan(true, deps, onAdd, (k) => onProblem(k), list.current));
  act(() => hook.result.current.attachVideo(document.createElement("video")));
  return { hook, onAdd, onProblem, fetch, list };
}

describe("useCardScan", () => {
  it("looks a steady card up once and offers it, then adds it under the current mode", async () => {
    const { hook, onAdd, fetch } = setup();
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ kind: "scanning", panel: { kind: "sure" } }), { timeout: 4000 });
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => hook.result.current.add());
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ oracleId: SOL.oracleId, name: "Sol Ring" }), "fast");
    await waitFor(() => expect(hook.result.current.count).toBe(1));
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

  it("calls a frame dark only once dark frames have held for a second", async () => {
    const { hook } = setup({}, { frame: { kind: "none" }, cardInView: false, dark: true });
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ kind: "scanning", dark: true }), { timeout: 4000 });
  });

  it("reads on past a not-sure answer turned down with None of these", async () => {
    const fetch = vi.fn(() => json({ index: "all", guesses: [SOL, { ...SOL, oracleId: "22222222-2222-4222-8222-222222222222", name: "Arcane Signet", score: 0.96 }], margin: 0.01 }));
    const { hook } = setup({ fetch: fetch as unknown as typeof globalThis.fetch });
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "notSure" } }), { timeout: 4000 });
    act(() => hook.result.current.dismiss());
    expect(hook.result.current.screen).toMatchObject({ panel: { kind: "unsure" } });
  });

  it("never spins on a read that answers at once (a camera with no size yet)", async () => {
    let reads = 0;
    const { hook } = setup({ readFrame: () => { reads += 1; return Promise.resolve({ frame: { kind: "none" }, cardInView: false, dark: false }); } });
    // The loop yields a frame between reads, so the test's own timers still run and reads stay bounded.
    await new Promise((r) => setTimeout(r, 100));
    expect(reads).toBeLessThan(50);
    expect(hook.result.current.screen.kind).toBe("scanning");
  });

  it("says nothing is on the list when the add could not land, and counts nothing", async () => {
    const { hook, onAdd, onProblem } = setup();
    onAdd.mockImplementationOnce(async () => false);
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure" } }), { timeout: 4000 });
    await act(async () => hook.result.current.add());
    expect(onProblem).toHaveBeenCalledWith("notAdded");
    expect(hook.result.current.count).toBe(0);
  });

  it("starts from the cards already on the list, so a listed card is a second copy", async () => {
    const { hook } = setup({}, undefined, new Map([[SOL.oracleId, 2]]));
    expect(hook.result.current.count).toBe(2);
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure", again: { kind: "second", count: 2 } } }), { timeout: 4000 });
  });

  it("offers no light on a camera without a torch", async () => {
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.screen.kind).toBe("scanning"));
    expect(hook.result.current.torch).toEqual({ available: false, on: false });
  });

  it("reads the sheet's list live, so a line removed while scanning is no longer a copy on it", async () => {
    const { hook, list } = setup({}, undefined, new Map([[SOL.oracleId, 2]]));
    expect(hook.result.current.count).toBe(2);
    list.current = new Map();
    hook.rerender();
    expect(hook.result.current.count).toBe(0);
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure", again: null } }), { timeout: 4000 });
  });

  it("withdraws an answer once a different card is in the frame, so Add never takes the card before it", async () => {
    const other = new Float32Array(EMBED_DIM);
    other[1] = 1;
    let frame: FrameRead = { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false };
    const { hook } = setup({ readFrame: async () => { await new Promise((r) => setTimeout(r, 5)); return frame; } });
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure" } }), { timeout: 4000 });
    frame = { frame: { kind: "card", embedding: other }, cardInView: true, dark: false };
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "unsure" } }), { timeout: 4000 });
  });

  it("tells the player once when reads keep failing, and stands no answer meanwhile", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { hook, onProblem } = setup({ readFrame: () => Promise.reject(new Error("model failed to load")) });
      await waitFor(() => expect(onProblem).toHaveBeenCalledWith("noStart"), { timeout: 4000 });
      await act(async () => vi.advanceTimersByTimeAsync(20000));
      expect(onProblem.mock.calls.filter(([k]) => k === "noStart")).toHaveLength(1);
      expect(hook.result.current.screen).toMatchObject({ panel: { kind: "looking" } });
    } finally {
      vi.useRealTimers();
    }
  });
});
