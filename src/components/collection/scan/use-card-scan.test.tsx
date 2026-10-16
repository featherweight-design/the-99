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

  it("offers no light on a camera without a torch", async () => {
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.screen.kind).toBe("scanning"));
    expect(hook.result.current.torch).toEqual({ available: false, on: false });
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
    }, undefined);
  });


  // Fast adds with no press, and Normal picks the printing in the camera (Hugh, 2026-10-16).
  describe("Fast", () => {
    it("puts a sure card on the list by itself, once, with its photo and closest cards", async () => {
      const crop = new Float32Array(4);
      const photo = vi.fn(() => "data:scan");
      const { hook, onAdd, fetch } = setup({ photo }, { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false, crop });
      await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1), { timeout: 4000 });
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ oracleId: SOL.oracleId }), "fast", {
        photo: "data:scan",
        guesses: [{ oracleId: SOL.oracleId, name: "Sol Ring", imageUri: "https://img/sol" }],
      }, undefined);
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "added", name: "Sol Ring" } }));
      expect(hook.result.current.flipTo).toBe("https://img/sol");
      // The card never left the frame: once the added panel goes it is a duplicate, and nothing more is added.
      await act(async () => new Promise((r) => setTimeout(r, ADDED_MS + 150)));
      expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure", again: { kind: "duplicate", count: 1 } } });
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it("does not take a card again across a missed frame or two after it was added", async () => {
      const frame: FrameRead = { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false };
      let gap = 0;
      const { onAdd } = setup({
        readFrame: async () => {
          await new Promise((r) => setTimeout(r, 5));
          if (gap > 0) {
            gap--;
            return { frame: { kind: "none" }, cardInView: false, dark: false };
          }
          return frame;
        },
      });
      await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1), { timeout: 15000 });
      await act(async () => new Promise((r) => setTimeout(r, ADDED_MS + 150)));
      gap = 2;
      await act(async () => new Promise((r) => setTimeout(r, 400)));
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it("still waits for the frame to empty when the added card's line is removed while it stays in view", async () => {
      const { hook, onAdd, list } = setup();
      await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1), { timeout: 15000 });
      await act(async () => new Promise((r) => setTimeout(r, ADDED_MS + 150)));
      list.current = new Map();
      hook.rerender();
      expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure", again: { kind: "duplicate", count: 0 } } });
      await act(async () => new Promise((r) => setTimeout(r, 200)));
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it("takes a second copy only once the frame has emptied", async () => {
      let frame: FrameRead = { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false };
      const { hook, onAdd } = setup({ readFrame: async () => { await new Promise((r) => setTimeout(r, 5)); return frame; } });
      await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1), { timeout: 4000 });
      await act(async () => new Promise((r) => setTimeout(r, ADDED_MS + 150)));
      expect(onAdd).toHaveBeenCalledTimes(1);
      frame = { frame: { kind: "none" }, cardInView: false, dark: false };
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "looking" } }), { timeout: 15000 });
      // Looking shows on the first missed frame; the scanner calls the frame empty only once its tracker lets go.
      await new Promise((r) => setTimeout(r, 300));
      frame = { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false };
      await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(2), { timeout: 15000 });
      await waitFor(() => expect(hook.result.current.count).toBe(2));
    });

    it("says once that a card could not be added, and does not try it again while it stays in view", async () => {
      const { hook, onAdd, onProblem } = setup();
      onAdd.mockImplementation(async () => false);
      await waitFor(() => expect(onProblem).toHaveBeenCalledWith("notAdded"), { timeout: 4000 });
      await act(async () => new Promise((r) => setTimeout(r, 100)));
      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(hook.result.current.count).toBe(0);
      expect(hook.result.current.screen).toMatchObject({ panel: { kind: "unsure" } });
    });

    it("counts a card the sheet already lists as a second copy, and a line removed while scanning as none", async () => {
      const { hook, onAdd, list } = setup({}, undefined, new Map([[SOL.oracleId, 2]]));
      expect(hook.result.current.count).toBe(2);
      list.current = new Map();
      hook.rerender();
      expect(hook.result.current.count).toBe(0);
      await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1), { timeout: 4000 });
    });
  });

  describe("Normal", () => {
    const normal = { getItem: () => "normal", setItem: () => {} } as unknown as Storage;
    const choice = (n: string) => ({
      scryfallId: `00000000-0000-4000-8000-00000000000${n}`, setCode: `s${n}`, setName: null, collectorNumber: n,
      releasedAt: null, imageUri: null, flavorName: null, finishes: ["nonfoil" as const], owned: {},
    });
    const CHOICES = [choice("1"), choice("2")];

    it("opens the card's printings in the camera, and the one picked goes on the list at that printing", async () => {
      const loadChoices = vi.fn(async () => CHOICES);
      const { hook, onAdd } = setup({ storage: normal, loadChoices });
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "choose", choices: CHOICES } }), { timeout: 4000 });
      expect(loadChoices).toHaveBeenCalledWith(SOL.oracleId);
      expect(onAdd).not.toHaveBeenCalled();
      await act(async () => hook.result.current.choosePrinting(CHOICES[1]));
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ oracleId: SOL.oracleId }), "normal", expect.anything(), {
        choices: CHOICES,
        printing: CHOICES[1],
      });
      expect(hook.result.current.screen).toMatchObject({ panel: { kind: "added" } });
      // The card still in view is a duplicate: the step does not open again by itself.
      await act(async () => new Promise((r) => setTimeout(r, ADDED_MS + 150)));
      expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure", again: { kind: "duplicate" } } });
      expect(loadChoices).toHaveBeenCalledTimes(1);
    });

    it("adds once for two picks while the first add is still landing", async () => {
      const { hook, onAdd } = setup({ storage: normal, loadChoices: async () => CHOICES });
      let land: (v: boolean) => void = () => {};
      onAdd.mockImplementationOnce(() => new Promise<boolean>((r) => (land = r)));
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "choose", choices: CHOICES } }), { timeout: 4000 });
      act(() => hook.result.current.choosePrinting(CHOICES[0]));
      act(() => hook.result.current.choosePrinting(CHOICES[1]));
      await act(async () => land(true));
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it("Add another copy opens the step with the photo from when the press went down, and the feed freezes meanwhile", async () => {
      const first = new Float32Array([1, 0, 0, 0]);
      const later = new Float32Array([0, 1, 0, 0]);
      let crop = first;
      const photo = vi.fn((c: Float32Array) => (c === first ? "data:first" : "data:later"));
      const { hook, onAdd } = setup({
        storage: normal,
        loadChoices: async () => CHOICES,
        photo,
        readFrame: async () => {
          await new Promise((r) => setTimeout(r, 5));
          return { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false, crop };
        },
      });
      const video = document.createElement("video");
      const pause = vi.fn();
      Object.assign(video, { pause, play: vi.fn(() => Promise.resolve()) });
      act(() => hook.result.current.attachVideo(video));
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "choose", choices: CHOICES } }), { timeout: 4000 });
      await act(async () => hook.result.current.choosePrinting(CHOICES[0]));
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "sure", again: { kind: "duplicate" } } }), { timeout: 4000 });
      crop = first;
      await new Promise((r) => setTimeout(r, 30));
      act(() => hook.result.current.hold());
      expect(pause).toHaveBeenCalled();
      crop = later;
      await new Promise((r) => setTimeout(r, 30));
      act(() => hook.result.current.add());
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "choose", choices: CHOICES } }));
      await act(async () => hook.result.current.choosePrinting(CHOICES[1]));
      expect(onAdd).toHaveBeenLastCalledWith(expect.anything(), "normal", expect.objectContaining({ photo: "data:first" }), expect.anything());
    });

    it("Not this card adds nothing and reads on past that answer", async () => {
      const { hook, onAdd } = setup({ storage: normal, loadChoices: async () => CHOICES });
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "choose" } }), { timeout: 4000 });
      act(() => hook.result.current.notThis());
      expect(hook.result.current.screen).toMatchObject({ panel: { kind: "unsure" } });
      await act(async () => new Promise((r) => setTimeout(r, 100)));
      expect(hook.result.current.screen).not.toMatchObject({ panel: { kind: "choose" } });
      expect(onAdd).not.toHaveBeenCalled();
    });

    it("says once when the printings would not load, and does not ask again for the card in view", async () => {
      const loadChoices = vi.fn(async () => { throw new Error("offline"); });
      const { hook, onProblem } = setup({ storage: normal, loadChoices });
      await waitFor(() => expect(onProblem).toHaveBeenCalledWith("notAdded"), { timeout: 4000 });
      await act(async () => new Promise((r) => setTimeout(r, 100)));
      expect(loadChoices).toHaveBeenCalledTimes(1);
      // The answer is turned down, not merely left: the panel reads on rather than offering the card.
      expect(hook.result.current.screen).toMatchObject({ panel: { kind: "unsure" } });
    });

    it("a card taken out of the frame before its printing is picked comes back as a new copy, not a duplicate", async () => {
      let frame: FrameRead = { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false };
      const loadChoices = vi.fn(async () => CHOICES);
      const { hook } = setup({ storage: normal, loadChoices, readFrame: async () => { await new Promise((r) => setTimeout(r, 5)); return frame; } });
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "choose", choices: CHOICES } }), { timeout: 4000 });
      frame = { frame: { kind: "none" }, cardInView: false, dark: false };
      // Long enough for the scanner's tracker to call the frame empty, not just one missed frame.
      await new Promise((r) => setTimeout(r, 300));
      await act(async () => hook.result.current.choosePrinting(CHOICES[0]));
      frame = { frame: { kind: "card", embedding: unit() }, cardInView: true, dark: false };
      await waitFor(() => expect(loadChoices).toHaveBeenCalledTimes(2), { timeout: 15000 });
    });

    it("a card picked from Not sure opens its printings, with the closest cards it was picked from", async () => {
      const SIGNET = { ...SOL, oracleId: "22222222-2222-4222-8222-222222222222", name: "Arcane Signet", imageUri: "https://img/signet", score: 0.96 };
      const fetch = vi.fn(() => json({ index: "all", guesses: [SOL, SIGNET], margin: 0.01 }));
      const { hook, onAdd } = setup({ storage: normal, loadChoices: async () => CHOICES, fetch: fetch as unknown as typeof globalThis.fetch });
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "notSure" } }), { timeout: 4000 });
      act(() => hook.result.current.pick(SIGNET.oracleId));
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "choose", guess: { oracleId: SIGNET.oracleId }, choices: CHOICES } }));
      await act(async () => hook.result.current.choosePrinting(CHOICES[0]));
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ oracleId: SIGNET.oracleId }), "normal", {
        photo: null,
        guesses: [
          { oracleId: SIGNET.oracleId, name: "Arcane Signet", imageUri: "https://img/signet" },
          { oracleId: SOL.oracleId, name: "Sol Ring", imageUri: "https://img/sol" },
        ],
      }, { choices: CHOICES, printing: CHOICES[0] });
    });

    it("keeps the step open when the mode already on is pressed again", async () => {
      const { hook } = setup({ storage: normal, loadChoices: async () => CHOICES });
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "choose", choices: CHOICES } }), { timeout: 15000 });
      act(() => hook.result.current.setMode("normal"));
      expect(hook.result.current.screen).toMatchObject({ panel: { kind: "choose", choices: CHOICES } });
    });

    it("leaves the step when Fast is chosen", async () => {
      const { hook } = setup({ storage: normal, loadChoices: () => new Promise(() => {}) });
      await waitFor(() => expect(hook.result.current.screen).toMatchObject({ panel: { kind: "choose" } }), { timeout: 4000 });
      act(() => hook.result.current.setMode("fast"));
      expect(hook.result.current.screen).not.toMatchObject({ panel: { kind: "choose" } });
    });
  });
});
