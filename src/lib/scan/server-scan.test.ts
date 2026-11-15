// The lab's recorded behavior, on the server path: a frame-one lookup kept only when sure, then the dwell before a
// card is asked about, one lookup per stable card (two when the early answer is not confident)
// however long it stays, a new lookup for a second copy after the frame empties, and the retry with its own state.
import { SCAN_MODEL } from "../card-scan/match";
import { describe, expect, it, vi } from "vitest";
import { DWELL_MS, LOSE_MS } from "./track";
import { LOOKUP_BACKOFF_MS, SURE_MARGIN } from "./lookup";
import { EARLY_DWELL_MS, keepsFrameOne, serverScanner, settleOnFrameOne, type ServerState } from "./server-scan";
import { startStableScan, nextStableScan } from "./stable-card";
import type { ScanFrame } from "./stable-card";

const MODEL = SCAN_MODEL;
const MATCH = { index: "all-20261014", guesses: [{ oracleId: "o1", name: "Sol Ring", scryfallId: "s1", score: 0.93 }, { oracleId: "o2", name: "Mana Crypt", scryfallId: "s2", score: 0.6 }], margin: 0.33 };
const card = (x: number): ScanFrame => ({ kind: "card", embedding: new Float32Array([Math.cos(x), Math.sin(x)]) });
const none: ScanFrame = { kind: "none" };
const ok = () => ({ ok: true, status: 200, json: async () => MATCH });
/** An answer under the sure gate: a frame-one lookup drops it. */
const unsure = () => ({ ok: true, status: 200, json: async () => ({ ...MATCH, margin: 0.01 }) });
const flush = () => new Promise((r) => setTimeout(r, 0));

/** Frames every 150ms, the lab's phone cadence; answers the states seen. */
async function play(frames: ScanFrame[], fetch: (u: string, i: RequestInit) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }> = vi.fn(async () => ok())) {
  let clock = 0;
  const states: ServerState["kind"][] = [];
  const s = serverScanner(MODEL, { fetch, wait: async () => {}, now: () => clock }, (st) => states.push(st.kind));
  let last: ServerState = { kind: "idle" };
  for (const f of frames) {
    last = s.frame(f, clock);
    await flush();
    clock += 150;
  }
  return { fetch, states, last, scanner: s };
}
const hold = (f: ScanFrame, n: number) => Array.from({ length: n }, () => f);

describe("serverScanner", () => {
  it("asks on a card's first frame, keeps a sure answer, and asks nothing more however long it stays", async () => {
    const first = await play(hold(card(0), 1));
    expect(first.fetch).toHaveBeenCalledTimes(1);
    const { fetch, states, last } = await play(hold(card(0), 40));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(states).toEqual(["match"]);
    expect(last.kind === "match" && last.result.guesses[0].name).toBe("Sol Ring");
  });

  it("asks again for a second copy once the frame has emptied, and not across a brief gap", async () => {
    expect((await play([...hold(card(0), 10), none, none, ...hold(card(0), 10)])).fetch).toHaveBeenCalledTimes(1);
    const { fetch, states } = await play([...hold(card(0), 10), ...hold(none, 10), ...hold(card(0), 10)]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(states).toEqual(["match", "idle", "match"]);
  });

  it("says it is retrying while a failed lookup is retried, then shows the answer", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(unsure()).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(ok());
    const { states } = await play(hold(card(0), 10), fetch);
    expect(states).toEqual(["looking", "retrying", "match"]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("gives up after the lookup's retries and asks again only for the next stable card", async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    const { states } = await play(hold(card(0), 20), fetch);
    // the frame-one lookup's one try (it never retries), then the early lookup's with its retries
    expect(fetch).toHaveBeenCalledTimes(1 + 1 + LOOKUP_BACKOFF_MS.length);
    expect(states.at(-1)).toBe("failed");
  });

  it("drops the answer to a card that has left the frame", async () => {
    let land: (v: unknown) => void = () => {};
    const fetch = vi.fn().mockImplementationOnce(async () => unsure()).mockImplementation(() => new Promise((r) => { land = r; }));
    const { states, scanner } = await play([...hold(card(0), 6), ...hold(none, 10)], fetch as never);
    land(ok());
    await flush();
    expect(states).toEqual(["looking", "idle"]);
    scanner.stop();
  });
  it("never hands one card's answer back with another card's frame while the new card settles", async () => {
    let clock = 0;
    const fetch = vi.fn(async () => ok());
    const s = serverScanner(MODEL, { fetch, wait: async () => {}, now: () => clock }, () => {});
    let last: ServerState = { kind: "idle" };
    for (const f of hold(card(0), 10)) { last = s.frame(f, clock); await flush(); clock += 150; }
    expect(s.frame(card(0), clock).kind).toBe("match");
    // card B replaces A with no empty frame: every frame before B settles answers nothing about A
    for (let i = 0; i < 3; i++) { clock += 150; last = s.frame(card(1.5), clock); expect(last.kind).not.toBe("match"); }
  });
  it("keeps handing back a card's answer as its embedding drifts slowly, frame to frame, then holds", async () => {
    let clock = 0;
    const s = serverScanner(MODEL, { fetch: vi.fn(async () => ok()), wait: async () => {}, now: () => clock }, () => {});
    let last: ServerState = { kind: "idle" };
    for (const f of hold(card(0), 10)) { last = s.frame(f, clock); await flush(); clock += 150; }
    // each frame within the same-card cosine of the last, ending far (cos < 0.85) from where it was asked
    for (let i = 1; i <= 30; i++) { last = s.frame(card(i * 0.03), clock); clock += 150; }
    for (let i = 0; i < 5; i++) { last = s.frame(card(0.9), clock); clock += 150; }
    expect(last.kind).toBe("match");
  });
  it("times a match from the start of the frame that asked, not just the round trip", async () => {
    let clock = 1000;
    let land: (v: unknown) => void = () => {};
    const fetch = vi.fn().mockImplementationOnce(async () => unsure()).mockImplementation(() => new Promise((r) => { land = r; }));
    const states: ServerState[] = [];
    const s = serverScanner(MODEL, { fetch: fetch as never, wait: async () => {}, now: () => clock }, (st) => states.push(st));
    for (let i = 0; i < 6; i++) { s.frame(card(0), clock, clock - 300); await flush(); clock += 150; }
    clock += 400;
    land(ok());
    await flush();
    const m = states.at(-1);
    expect(m?.kind).toBe("match");
    if (m?.kind === "match") expect(m.totalMs).toBe(m.ms + 300);
  });
});

describe("serverScanner's early lookup", () => {
  const answer = (margin: number) => ({ ok: true, status: 200, json: async () => ({ ...MATCH, margin }) });
  it("shows a confident answer asked for at the early dwell, and asks once", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(answer(SURE_MARGIN - 0.01)).mockResolvedValue(answer(SURE_MARGIN));
    const { states, last } = await play(hold(card(0), Math.ceil(EARLY_DWELL_MS / 150) + 2), fetch);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(states).toEqual(["looking", "match"]);
    expect(last.kind).toBe("match");
  });
  it("asks again at the full dwell when the early answer is not confident, and shows that one", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(answer(0.01)).mockResolvedValueOnce(answer(SURE_MARGIN - 0.01)).mockResolvedValue(answer(0.05));
    const early = await play(hold(card(0), Math.floor(DWELL_MS / 150)), fetch);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(early.last.kind).toBe("looking");
    const fetch2 = vi.fn().mockResolvedValueOnce(answer(0.01)).mockResolvedValueOnce(answer(SURE_MARGIN - 0.01)).mockResolvedValue(answer(0.05));
    const { states, last } = await play(hold(card(0), 20), fetch2);
    expect(fetch2).toHaveBeenCalledTimes(3);
    expect(states).toEqual(["looking", "looking", "looking", "match"]);
    expect(last.kind === "match" && last.result.margin).toBe(0.05);
  });
  it("does not ask again after the scanner is stopped", async () => {
    let clock = 0;
    const fetch = vi.fn(async () => answer(0.01));
    const s = serverScanner(MODEL, { fetch, wait: async () => {}, now: () => clock }, () => {});
    for (let i = 0; i < 4; i++) { s.frame(card(0), clock); await flush(); clock += 150; }
    expect(fetch).toHaveBeenCalledTimes(2);
    s.stop();
    for (let i = 0; i < 10; i++) { s.frame(card(0), clock); await flush(); clock += 150; }
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("asks again at the full dwell from the run's start, at any cadence", async () => {
    let clock = 0;
    const fetch = vi.fn(async () => answer(0.01));
    const s = serverScanner(MODEL, { fetch, wait: async () => {}, now: () => clock }, () => {});
    // frames every 250ms: settles at 500, and the 750 frame has held 750ms
    for (let i = 0; i < 4; i++) { s.frame(card(0), clock); await flush(); clock += 250; }
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("says it is looking, not retrying, while it waits to ask again", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(answer(0.01)).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(answer(0.01)).mockReturnValue(new Promise(() => {}));
    const { states } = await play(hold(card(0), 4), fetch);
    expect(states).toEqual(["looking", "retrying", "looking"]);
  });
  it("starts the full dwell again when the card's run is broken before it is asked again", async () => {
    let clock = 0;
    const fetch = vi.fn(async () => answer(0.01));
    const s = serverScanner(MODEL, { fetch, wait: async () => {}, now: () => clock }, () => {});
    const at = async (f: ScanFrame, t: number) => { clock = t; s.frame(f, t); await flush(); };
    for (const t of [0, 150, 300]) await at(card(0), t);
    expect(fetch).toHaveBeenCalledTimes(2);
    await at(none, 450);
    await at(none, 600);
    await at(card(0), 750);
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const t of [900, 1050, 1200, 1350]) await at(card(0), t);
    expect(fetch).toHaveBeenCalledTimes(2);
    await at(card(0), 1500);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("counts a break in the card's run while the early answer is still on its way", async () => {
    let clock = 0;
    let land: (v: unknown) => void = () => {};
    const fetch = vi.fn().mockImplementationOnce(async () => answer(0.01)).mockImplementationOnce(() => new Promise((r) => (land = r))).mockImplementation(async () => answer(0.05));
    const s = serverScanner(MODEL, { fetch, wait: async () => {}, now: () => clock }, () => {});
    const at = async (f: ScanFrame, t: number) => { clock = t; s.frame(f, t); await flush(); };
    for (const t of [0, 150, 300]) await at(card(0), t);
    await at(none, 1400);
    land(answer(0.09));
    await flush();
    await at(card(0), 1600);
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const t of [1750, 1900, 2050, 2200]) await at(card(0), t);
    expect(fetch).toHaveBeenCalledTimes(2);
    await at(card(0), 2300);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("does not ask again once the card is gone", async () => {
    const fetch = vi.fn(async () => answer(0.01));
    const { states } = await play([...hold(card(0), 4), ...hold(none, 20)], fetch);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(states.at(-1)).toBe("idle");
  });
  it("still needs the full dwell before an empty frame forgets the card", async () => {
    const fetch = vi.fn(async () => answer(0.5));
    const { states } = await play([...hold(card(0), 6), ...hold(none, Math.floor(DWELL_MS / 150)), ...hold(card(0), 6)], fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(states).not.toContain("idle");
  });
});

describe("serverScanner's frame-one lookup", () => {
  const answer = (margin: number) => ({ ok: true, status: 200, json: async () => ({ ...MATCH, margin }) });
  it("keeps a sure first-frame answer at once, as if the card had held, and asks nothing more", async () => {
    const fetch = vi.fn(async () => answer(SURE_MARGIN));
    let clock = 0;
    const states: ServerState["kind"][] = [];
    const s = serverScanner(MODEL, { fetch, wait: async () => {}, now: () => clock }, (st) => states.push(st.kind));
    expect(s.frame(card(0), clock).kind).toBe("idle");
    await flush();
    expect(states).toEqual(["match"]);
    clock += 150;
    // the very next frame hands the answer back: before the early dwell has passed
    expect(s.frame(card(0), clock).kind).toBe("match");
    for (let i = 0; i < 20; i++) { clock += 150; s.frame(card(0), clock); await flush(); }
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("drops a first-frame answer just under the gate unseen, and today's early and full-dwell lookups follow", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(answer(SURE_MARGIN - 0.0001)).mockResolvedValue(answer(SURE_MARGIN));
    const { states, last } = await play(hold(card(0), 10), fetch);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(states).toEqual(["looking", "match"]);
    expect(last.kind).toBe("match");
  });
  it("counts two lookups when the first frame is not sure and the early one is", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(answer(0.034)).mockResolvedValue(answer(0.2));
    const { fetch: f } = await play(hold(card(0), 40), fetch);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("never asks a second frame-one lookup for a blurred frame of the same card", async () => {
    const fetch = vi.fn(async () => answer(0.01));
    // card, a blurred frame (cos < 0.85, a new run), the card again, and on: one frame-one, one early, one full dwell
    const { fetch: f } = await play([card(0), card(1), ...hold(card(0), 20)], fetch);
    expect(f).toHaveBeenCalledTimes(3);
    // a blur after a sure frame-one answer asks nothing at all
    const sure = vi.fn(async () => answer(0.5));
    const after = await play([card(0), card(0), card(1), ...hold(card(0), 20)], sure);
    expect(sure).toHaveBeenCalledTimes(1);
    expect(after.last.kind).toBe("match");
  });
  it("drops a sure first-frame answer whose card's run broke while it was out", async () => {
    let clock = 0;
    let land: (v: unknown) => void = () => {};
    const fetch = vi.fn().mockImplementationOnce(() => new Promise((r) => (land = r))).mockImplementation(async () => answer(0.5));
    const states: ServerState["kind"][] = [];
    const s = serverScanner(MODEL, { fetch, wait: async () => {}, now: () => clock }, (st) => states.push(st.kind));
    s.frame(card(0), clock);
    clock += 150;
    s.frame(card(1.5), clock);
    land(answer(0.5));
    await flush();
    expect(states).toEqual([]);
  });
  it("waits for a sure frame-one answer that lands after the early dwell: one request, and the card is taken", async () => {
    let clock = 0;
    let land: (v: unknown) => void = () => {};
    const fetch = vi.fn().mockImplementationOnce(() => new Promise((r) => (land = r))).mockImplementation(async () => answer(0.5));
    const states: ServerState["kind"][] = [];
    const s = serverScanner(MODEL, { fetch, wait: async () => {}, now: () => clock }, (st) => states.push(st.kind));
    for (const t of [0, 150, 300, 450]) { clock = t; s.frame(card(0), t); await flush(); }
    expect(fetch).toHaveBeenCalledTimes(1);
    land(answer(SURE_MARGIN));
    await flush();
    expect(states).toEqual(["match"]);
    for (const t of [600, 750, 900, 1050]) { clock = t; expect(s.frame(card(0), t).kind).toBe("match"); await flush(); }
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("sends the held early lookup at once when a frame-one answer past the early dwell is not sure", async () => {
    let clock = 0;
    let land: (v: unknown) => void = () => {};
    const fetch = vi.fn().mockImplementationOnce(() => new Promise((r) => (land = r))).mockImplementation(async () => answer(0.5));
    const states: ServerState["kind"][] = [];
    const s = serverScanner(MODEL, { fetch, wait: async () => {}, now: () => clock }, (st) => states.push(st.kind));
    for (const t of [0, 150, 300, 450]) { clock = t; s.frame(card(0), t); await flush(); }
    // the early dwell has passed, but the frame-one answer is still out: nothing more is asked yet
    expect(fetch).toHaveBeenCalledTimes(1);
    land(answer(SURE_MARGIN - 0.01));
    await flush();
    // no frame read since: the early lookup went on the answer itself
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(states).toEqual(["looking", "match"]);
  });
  it("still aborts a frame-one lookup when the view empties before it answers", async () => {
    let land: (v: unknown) => void = () => {};
    const fetch = vi.fn().mockImplementationOnce(() => new Promise((r) => (land = r))).mockImplementation(async () => answer(0.5));
    const { states } = await play([...hold(card(0), 4), ...hold(none, 10)], fetch);
    land(answer(0.5));
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(states).toEqual(["idle"]);
  });
  it("opens again once a card goes unseen for LOSE_MS, with no empty view", async () => {
    const fetch = vi.fn(async () => answer(0.5));
    // card A is taken on its first frame, then two other cards flap in turn: neither settles, and A is dropped at LOSE_MS
    const flap = Array.from({ length: Math.ceil(LOSE_MS / 150) + 2 }, (_, i) => card(i % 2 ? 3 : 1.5));
    const { fetch: f, states } = await play([card(0), card(0), ...flap], fetch);
    expect(states).not.toContain("idle");
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("opens again for the next card once the view has emptied", async () => {
    const fetch = vi.fn(async () => answer(0.5));
    const { fetch: f, states } = await play([card(0), ...hold(none, 10), card(1.5), card(1.5)], fetch);
    expect(f).toHaveBeenCalledTimes(2);
    expect(states).toEqual(["match", "idle", "match"]);
  });
});

describe("keepsFrameOne and settleOnFrameOne", () => {
  const match = (sure: boolean) => ({ kind: "match" as const, index: "i", guesses: [], margin: 0.1, sure });
  it("keeps only a sure match", () => {
    expect(keepsFrameOne(match(true))).toBe(true);
    expect(keepsFrameOne(match(false))).toBe(false);
    expect(keepsFrameOne({ kind: "failed" })).toBe(false);
    expect(keepsFrameOne({ kind: "refused", reason: "signedOut" })).toBe(false);
  });
  it("settles the run's card at once, and nothing when the run is another card's or gone", () => {
    const run = nextStableScan(startStableScan(0), card(0), 0, EARLY_DWELL_MS).scan;
    expect(run.value).toBeNull();
    const settled = settleOnFrameOne(run, card(0), 200);
    expect(settled?.value).toEqual(card(0));
    expect(settled?.candidate).toBeNull();
    // the next frame of the card is the settled card: no lookup event
    expect(nextStableScan(settled!, card(0), 300, EARLY_DWELL_MS).event).toBeNull();
    expect(settleOnFrameOne(run, card(1.5), 200)).toBeNull();
    expect(settleOnFrameOne(startStableScan(0), card(0), 200)).toBeNull();
  });
});
