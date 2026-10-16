// One lookup per stable card: a card asks the server once it has held (its own embedding agreeing frame to frame for
// the dwell), never per frame; an empty frame that settles makes the next card a new scan (a second copy).
import { describe, expect, it } from "vitest";
import { DWELL_MS } from "./track";
import { nextStableScan, sameCard, startStableScan, type ScanEvent, type ScanFrame } from "./stable-card";

const at = (x: number) => new Float32Array([Math.cos(x), Math.sin(x)]);
const card = (x: number): ScanFrame => ({ kind: "card", embedding: at(x) });
const none: ScanFrame = { kind: "none" };

/** Frames every 150ms (the lab's phone cadence), and the events they raised. */
function play(frames: ScanFrame[], step = 150): { kind: string }[] {
  let s = startStableScan(0);
  const events: ScanEvent[] = [];
  frames.forEach((f, i) => {
    const out = nextStableScan(s, f, i * step);
    s = out.scan;
    if (out.event) events.push(out.event);
  });
  return events.filter((e): e is NonNullable<ScanEvent> => e !== null).map((e) => ({ kind: e.kind }));
}
const hold = (f: ScanFrame | (() => ScanFrame), n: number) => Array.from({ length: n }, () => (typeof f === "function" ? f() : f));

describe("sameCard", () => {
  it("agrees for two reads of one card, and not for another card or an empty frame", () => {
    expect(sameCard(card(0), card(0.1))).toBe(true);
    expect(sameCard(card(0), card(1.2))).toBe(false);
    expect(sameCard(card(0), none)).toBe(false);
    expect(sameCard(none, none)).toBe(true);
  });
});

describe("nextStableScan", () => {
  it("asks once for a card held for the dwell, however many frames it stays", () => {
    const events = play(hold(() => card(Math.random() * 0.1), 40));
    expect(events).toEqual([{ kind: "lookup" }]);
  });

  it("asks nothing for a card that does not hold, frame to frame", () => {
    const frames = Array.from({ length: 40 }, (_, i) => card(i % 2 ? 0 : 1.5));
    expect(play(frames)).toEqual([]);
  });

  it("asks nothing before the dwell", () => {
    expect(play(hold(card(0), Math.floor(DWELL_MS / 150)))).toEqual([]);
  });

  it("reads a brief gap as the same card, and an empty frame that settles as a new scan of the same card", () => {
    expect(play([...hold(card(0), 10), none, none, ...hold(card(0), 10)])).toEqual([{ kind: "lookup" }]);
    expect(play([...hold(card(0), 10), ...hold(none, 10), ...hold(card(0), 10)])).toEqual([
      { kind: "lookup" }, { kind: "empty" }, { kind: "lookup" },
    ]);
  });

  it("asks again for a different card that replaces one without the frame emptying", () => {
    expect(play([...hold(card(0), 10), ...hold(card(1.5), 10)])).toEqual([{ kind: "lookup" }, { kind: "lookup" }]);
  });

  it("asks with the frame's own embedding", () => {
    let s = startStableScan(0);
    let event: ScanEvent = null;
    for (let i = 0; i <= 5; i++) ({ scan: s, event } = nextStableScan(s, card(i * 0.01), i * 150));
    expect(event?.kind).toBe("lookup");
    expect(event?.kind === "lookup" && Array.from(event.embedding)).toEqual(Array.from(at(0.05)));
  });
});
