// The lab's recorded behavior, on the server path: the dwell before a card is asked about, one lookup per stable card
// however long it stays, a new lookup for a second copy after the frame empties, and the retry with its own state.
import { SCAN_MODEL } from "../card-scan/match";
import { describe, expect, it, vi } from "vitest";
import { DWELL_MS } from "./track";
import { LOOKUP_BACKOFF_MS } from "./lookup";
import { CONFIDENT_MARGIN, EARLY_DWELL_MS, serverScanner, type ServerState } from "./server-scan";
import type { ScanFrame } from "./stable-card";

const MODEL = SCAN_MODEL;
const MATCH = { index: "all-20261014", guesses: [{ oracleId: "o1", name: "Sol Ring", scryfallId: "s1", score: 0.93 }, { oracleId: "o2", name: "Mana Crypt", scryfallId: "s2", score: 0.6 }], margin: 0.33 };
const card = (x: number): ScanFrame => ({ kind: "card", embedding: new Float32Array([Math.cos(x), Math.sin(x)]) });
const none: ScanFrame = { kind: "none" };
const ok = () => ({ ok: true, status: 200, json: async () => MATCH });
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
  it("asks nothing before the dwell, then once for a card however long it stays, and hands back its answer", async () => {
    const before = await play(hold(card(0), Math.floor(EARLY_DWELL_MS / 150)));
    expect(before.fetch).not.toHaveBeenCalled();
    const { fetch, states, last } = await play(hold(card(0), 40));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(states).toEqual(["looking", "match"]);
    expect(last.kind === "match" && last.result.guesses[0].name).toBe("Sol Ring");
  });

  it("asks again for a second copy once the frame has emptied, and not across a brief gap", async () => {
    expect((await play([...hold(card(0), 10), none, none, ...hold(card(0), 10)])).fetch).toHaveBeenCalledTimes(1);
    const { fetch, states } = await play([...hold(card(0), 10), ...hold(none, 10), ...hold(card(0), 10)]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(states).toEqual(["looking", "match", "idle", "looking", "match"]);
  });

  it("says it is retrying while a failed lookup is retried, then shows the answer", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(ok());
    const { states } = await play(hold(card(0), 10), fetch);
    expect(states).toEqual(["looking", "retrying", "match"]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("gives up after the lookup's retries and asks again only for the next stable card", async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    const { states } = await play(hold(card(0), 20), fetch);
    expect(fetch).toHaveBeenCalledTimes(1 + LOOKUP_BACKOFF_MS.length);
    expect(states.at(-1)).toBe("failed");
  });

  it("drops the answer to a card that has left the frame", async () => {
    let land: (v: unknown) => void = () => {};
    const fetch = vi.fn(() => new Promise((r) => { land = r; }));
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
    const fetch = vi.fn(() => new Promise((r) => { land = r; }));
    const states: ServerState[] = [];
    const s = serverScanner(MODEL, { fetch: fetch as never, wait: async () => {}, now: () => clock }, (st) => states.push(st));
    for (let i = 0; i < 6; i++) { s.frame(card(0), clock, clock - 300); clock += 150; }
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
    const fetch = vi.fn(async () => answer(CONFIDENT_MARGIN));
    const { states, last } = await play(hold(card(0), Math.ceil(EARLY_DWELL_MS / 150) + 2), fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(states).toEqual(["looking", "match"]);
    expect(last.kind).toBe("match");
  });
  it("asks again at the full dwell when the early answer is not confident, and shows that one", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(answer(CONFIDENT_MARGIN - 0.01)).mockResolvedValue(answer(0.05));
    const early = await play(hold(card(0), Math.floor(DWELL_MS / 150)), fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(early.last.kind).toBe("looking");
    const fetch2 = vi.fn().mockResolvedValueOnce(answer(CONFIDENT_MARGIN - 0.01)).mockResolvedValue(answer(0.05));
    const { states, last } = await play(hold(card(0), 20), fetch2);
    expect(fetch2).toHaveBeenCalledTimes(2);
    expect(states).toEqual(["looking", "looking", "match"]);
    expect(last.kind === "match" && last.result.margin).toBe(0.05);
  });
  it("does not ask again once the card is gone", async () => {
    const fetch = vi.fn(async () => answer(0.01));
    const { states } = await play([...hold(card(0), 4), ...hold(none, 20)], fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe("idle");
  });
  it("still needs the full dwell before an empty frame forgets the card", async () => {
    const fetch = vi.fn(async () => answer(0.5));
    const { states } = await play([...hold(card(0), 6), ...hold(none, Math.floor(DWELL_MS / 150)), ...hold(card(0), 6)], fetch);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(states).not.toContain("idle");
  });
});
