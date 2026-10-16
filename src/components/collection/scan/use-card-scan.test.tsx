import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { EMBED_DIM } from "../../../lib/card-scan/match";
import { ADDED_MS, DARK_HOLD_MS, useCardScan, type CardScanDeps, type FrameRead } from "./use-card-scan";

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
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ oracleId: SOL.oracleId, name: "Sol Ring" }), "fast", expect.anything());
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

  it("calls a frame dark only once dark frames have held for a second, and a bright frame starts the wait over", async () => {
    let clock = 0;
    let dark = true;
    const reads = { n: 0 };
    const { hook } = setup({
      now: () => clock,
      readFrame: async () => {
        await new Promise((r) => setTimeout(r, 5));
        reads.n++;
        return { frame: { kind: "none" }, cardInView: false, dark };
      },
    });
    const after = async (n: number) => {
      const at = reads.n;
      await waitFor(() => expect(reads.n).toBeGreaterThanOrEqual(at + n));
    };
    await after(3);
    clock = DARK_HOLD_MS - 1;
    await after(2);
    expect(hook.result.current.screen).toMatchObject({ dark: false });
    clock = DARK_HOLD_MS + 10;
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ dark: true }));
    dark = false;
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ dark: false }));
    // Dark again: the hold starts from this frame, not the first one.
    dark = true;
    await after(3);
    clock = DARK_HOLD_MS * 2;
    await after(2);
    expect(hook.result.current.screen).toMatchObject({ dark: false });
    clock = DARK_HOLD_MS * 3 + 20;
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ dark: true }));
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

  it("adds once for two taps while the first add is still waiting on its printings", async () => {
    const { hook, onAdd } = setup();
    let land: (v: boolean) => void = () => {};
    onAdd.mockImplementationOnce(() => new Promise<boolean>((r) => (land = r)));
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure" } }), { timeout: 4000 });
    act(() => hook.result.current.hold());
    act(() => hook.result.current.add());
    // A second press and release while the first add waits: it adds nothing, and leaves no hold behind.
    act(() => hook.result.current.hold());
    act(() => hook.result.current.add());
    await act(async () => land(true));
    expect(onAdd).toHaveBeenCalledTimes(1);
    // Once the added panel has gone, the scanner reads on rather than showing the second press's hold.
    await act(async () => new Promise((r) => setTimeout(r, ADDED_MS + 100)));
    expect(hook.result.current.screen).not.toMatchObject({ panel: { held: true } });
  });

  it("never offers an answer that arrives after its card has left the frame", async () => {
    let answer: (r: Response) => void = () => {};
    const fetch = vi.fn(() => new Promise<Response>((r) => (answer = r)));
    const other = new Float32Array(EMBED_DIM);
    other[1] = 1;
    // Card A until its lookup is asked for, then one frame of card B, then no further frame at all: the answer for A
    // lands while B is in view and has not settled, and nothing after it re-checks.
    let left = false;
    const readFrame = async (): Promise<FrameRead> => {
      await new Promise((r) => setTimeout(r, 5));
      if (fetch.mock.calls.length === 0) return { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false };
      if (!left) {
        left = true;
        return { frame: { kind: "card", embedding: other }, cardInView: true, dark: false };
      }
      return new Promise<FrameRead>(() => {});
    };
    const { hook } = setup({ fetch: fetch as unknown as typeof globalThis.fetch, readFrame });
    await waitFor(() => expect(left).toBe(true), { timeout: 4000 });
    await new Promise((r) => setTimeout(r, 20));
    await act(async () => answer(new Response(JSON.stringify({ index: "all", guesses: [SOL], margin: null }), { status: 200, headers: { "Content-Type": "application/json" } })));
    await new Promise((r) => setTimeout(r, 30));
    expect(hook.result.current.screen).not.toMatchObject({ panel: { kind: "sure" } });
  });

  it("shows the blocked screen on a browser with no camera API at all", async () => {
    const { hook } = setup({ getUserMedia: () => { throw new TypeError("navigator.mediaDevices is undefined"); } });
    await waitFor(() => expect(hook.result.current.screen).toEqual({ kind: "blocked" }));
  });

  it("freezes the feed while Add is held, and runs it again on release", async () => {
    const { hook } = setup();
    const video = document.createElement("video");
    const pause = vi.fn();
    const play = vi.fn(() => Promise.resolve());
    Object.assign(video, { pause, play });
    act(() => hook.result.current.attachVideo(video));
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure" } }), { timeout: 4000 });
    play.mockClear();
    act(() => hook.result.current.hold());
    expect(pause).toHaveBeenCalled();
    act(() => hook.result.current.cancelHold());
    expect(play).toHaveBeenCalled();
  });

  it("turns the light on once for two presses before the camera answers the first", async () => {
    let answer: () => void = () => {};
    const applyConstraints = vi.fn(() => new Promise<void>((r) => (answer = r)));
    const track = { stop: vi.fn(), getCapabilities: () => ({ torch: true }), applyConstraints };
    const lit = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
    const { hook } = setup({ getUserMedia: async () => lit });
    await waitFor(() => expect(hook.result.current.torch.available).toBe(true));
    act(() => hook.result.current.toggleTorch());
    act(() => hook.result.current.toggleTorch());
    await act(async () => answer());
    expect(applyConstraints).toHaveBeenCalledTimes(1);
    expect(hook.result.current.torch.on).toBe(true);
  });

  it("leaves no hold behind when an add lands while a second press is still down", async () => {
    const { hook, onAdd } = setup();
    let land: (v: boolean) => void = () => {};
    onAdd.mockImplementationOnce(() => new Promise<boolean>((r) => (land = r)));
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure" } }), { timeout: 4000 });
    act(() => hook.result.current.hold());
    act(() => hook.result.current.add());
    // The second press goes down, and the first add lands before it is let go.
    act(() => hook.result.current.hold());
    await act(async () => land(true));
    await act(async () => new Promise((r) => setTimeout(r, ADDED_MS + 100)));
    expect(hook.result.current.screen).not.toMatchObject({ panel: { held: true } });
  });

  it("hands each add the card's photo as read and the closest cards, the added one first (L2)", async () => {
    const SIGNET = { ...SOL, oracleId: "22222222-2222-4222-8222-222222222222", name: "Arcane Signet", imageUri: "https://img/signet", score: 0.96 };
    const fetch = vi.fn(() => json({ index: "all", guesses: [SOL, SIGNET], margin: 0.01 }));
    const crop = new Float32Array(4);
    const photo = vi.fn(() => "data:image/jpeg;base64,scan");
    const { hook, onAdd } = setup(
      { fetch: fetch as unknown as typeof globalThis.fetch, photo },
      { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false, crop },
    );
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "notSure" } }), { timeout: 4000 });
    await act(async () => hook.result.current.pick(SIGNET.oracleId));
    expect(photo).toHaveBeenCalledWith(crop);
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ oracleId: SIGNET.oracleId }), "fast", {
      photo: "data:image/jpeg;base64,scan",
      guesses: [
        { oracleId: SIGNET.oracleId, name: "Arcane Signet", imageUri: "https://img/signet" },
        { oracleId: SOL.oracleId, name: "Sol Ring", imageUri: "https://img/sol" },
      ],
    });
  });

  it("adds with no photo when no frame held a crop", async () => {
    const { hook, onAdd } = setup();
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure" } }), { timeout: 4000 });
    await act(async () => hook.result.current.add());
    expect(onAdd).toHaveBeenCalledWith(expect.anything(), "fast", expect.objectContaining({ photo: null }));
  });

  it("adds a held card with the photo and closest cards from when the press went down", async () => {
    const first = new Float32Array([1, 0, 0, 0]);
    const later = new Float32Array([0, 1, 0, 0]);
    let crop = first;
    const photo = vi.fn((c: Float32Array) => (c === first ? "data:first" : "data:later"));
    const { hook, onAdd } = setup({
      photo,
      readFrame: async () => {
        await new Promise((r) => setTimeout(r, 5));
        return { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false, crop };
      },
    });
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure" } }), { timeout: 4000 });
    act(() => hook.result.current.hold());
    // A frame read finishes while the press is still down.
    crop = later;
    await new Promise((r) => setTimeout(r, 30));
    await act(async () => hook.result.current.add());
    expect(onAdd).toHaveBeenCalledWith(expect.anything(), "fast", expect.objectContaining({ photo: "data:first" }));
  });

  it("drops the photo of a press discarded during an add, so a later add carries its own", async () => {
    const first = new Float32Array([1, 0, 0, 0]);
    const later = new Float32Array([0, 1, 0, 0]);
    let crop = first;
    const photo = vi.fn((c: Float32Array) => (c === first ? "data:first" : "data:later"));
    const { hook, onAdd } = setup({
      photo,
      readFrame: async () => {
        await new Promise((r) => setTimeout(r, 5));
        return { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false, crop };
      },
    });
    let land: (v: boolean) => void = () => {};
    onAdd.mockImplementationOnce(() => new Promise<boolean>((r) => (land = r)));
    await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure" } }), { timeout: 4000 });
    act(() => hook.result.current.add());
    // A second press and release while the first add waits: discarded, with what it saw.
    act(() => hook.result.current.hold());
    act(() => hook.result.current.add());
    await act(async () => land(true));
    crop = later;
    await act(async () => new Promise((r) => setTimeout(r, ADDED_MS + 100)));
    // A keyboard Add with no hold: the photo is the frame now, not the discarded press's.
    await act(async () => hook.result.current.add());
    expect(onAdd).toHaveBeenLastCalledWith(expect.anything(), "fast", expect.objectContaining({ photo: "data:later" }));
  });
});

