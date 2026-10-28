import { describe, expect, it } from "vitest";
import { ABOUT_SECTIONS } from "../copy/about-pages";
import { SWITCH_NAMES } from "../switches/registry";
import { PAGE_WIDTHS, type PageShot } from "./page-shots";
import { visibleSections, type VisibleSection } from "./pages-visible";
import { MAX_PINS, PIN_GAP, PIN_SIZE, placePins, regionOf, screenModel, type Box, type PlacedPin } from "./pins";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const ALL_ON = env(Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"])));

// The Labels board's crowding study draws a phone capture 268x580 with each pin's centre where it sits. A region whose
// top-left corner is 14px up and left of that centre puts its pin back there.
const FRAME = { w: 268, h: 580 };
const STUDY: readonly [number, number][] = [
  [15.0, 231.4], [15.0, 189.5], [15.0, 96.7], [43.2, 501.5], [17.7, 52.0], [129.1, 141.3], [71.8, 141.3], [236.9, 230.5],
];
const box = (x: number, y: number, w = 60, h = 30): Box => ({ x, y, w, h });
const study = (n: number) => STUDY.slice(0, n).map(([x, y], i) => ({ key: `r${i + 1}`, box: box(x - 14, y - 14) }));

function apart(pins: readonly PlacedPin[]): number {
  let min = Infinity;
  for (let i = 0; i < pins.length; i++) {
    for (let j = i + 1; j < pins.length; j++) min = Math.min(min, Math.hypot(pins[i].x - pins[j].x, pins[i].y - pins[j].y));
  }
  return min;
}

const inside = (pins: readonly PlacedPin[], frame = FRAME) =>
  pins.every((p) => p.x >= PIN_SIZE / 2 && p.x <= frame.w - PIN_SIZE / 2 && p.y >= PIN_SIZE / 2 && p.y <= frame.h - PIN_SIZE / 2);

describe("placePins on the boards' crowding study (Labels board)", () => {
  for (const n of [3, 5, 8]) {
    it(`${n} regions: each pin 14px inside its corner, numbered top then left`, () => {
      const pins = placePins(study(n), FRAME);
      expect(pins).toHaveLength(n);
      // Reading order: by the region's top, then its left; the board's label order is not it.
      const order = [...STUDY.slice(0, n).entries()].sort(([, a], [, b]) => a[1] - b[1] || a[0] - b[0]).map(([i]) => `r${i + 1}`);
      expect(pins.map((p) => p.key)).toEqual(order);
      expect(pins.map((p) => p.n)).toEqual(order.map((_, i) => i + 1));
      for (const p of pins) {
        const [x, y] = STUDY[Number(p.key.slice(1)) - 1];
        expect([p.x, p.y]).toEqual([x, y]);
      }
      expect(inside(pins)).toBe(true);
      expect(apart(pins)).toBeGreaterThanOrEqual(PIN_GAP);
    });
  }

  it("orders by top before left: a region further left but lower reads later", () => {
    const pins = placePins([{ key: "low-left", box: box(0, 200) }, { key: "high-right", box: box(200, 100) }], FRAME);
    expect(pins.map((p) => [p.key, p.n])).toEqual([["high-right", 1], ["low-left", 2]]);
  });
});

describe("placePins when pins crowd (G6)", () => {
  it("slides a later pin under 28px from an earlier one right along its region's top edge, to exactly 28px", () => {
    const pins = placePins([{ key: "a", box: box(20, 40) }, { key: "b", box: box(30, 44) }], FRAME);
    const [a, b] = pins;
    expect(a).toMatchObject({ key: "a", x: 34, y: 54 });
    expect(b.key).toBe("b");
    expect(b.y).toBe(58); // its own top edge: the height never moves
    expect(b.x).toBeGreaterThan(44);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(PIN_GAP, 0);
  });

  it("leaves pins 28px or more apart where they are", () => {
    const pins = placePins([{ key: "a", box: box(0, 0) }, { key: "b", box: box(28, 0) }], FRAME);
    expect(pins.map((p) => p.x)).toEqual([14, 42]);
  });
});

describe("placePins on a re-taken capture (Review Focus 5)", () => {
  it("keeps a pin on the picture when its region moved past an edge", () => {
    const pins = placePins(
      [
        { key: "right", box: box(FRAME.w + 40, 100) },
        { key: "below", box: box(100, FRAME.h + 10) },
        { key: "left-above", box: box(-80, -50) },
      ],
      FRAME,
    );
    expect(inside(pins)).toBe(true);
    expect(pins.find((p) => p.key === "right")!.x).toBe(FRAME.w - PIN_SIZE / 2);
    expect(pins.find((p) => p.key === "below")!.y).toBe(FRAME.h - PIN_SIZE / 2);
    expect(pins.find((p) => p.key === "left-above")).toMatchObject({ x: PIN_SIZE / 2, y: PIN_SIZE / 2 });
  });

  it("never draws two pins on one spot when two regions overlap fully", () => {
    const pins = placePins([{ key: "a", box: box(50, 50) }, { key: "b", box: box(50, 50) }], FRAME);
    expect(apart(pins)).toBeGreaterThanOrEqual(PIN_GAP - 0.1);
    expect(inside(pins)).toBe(true);
  });

  it("three full overlaps still spread out", () => {
    const pins = placePins(["a", "b", "c"].map((key) => ({ key, box: box(50, 50) })), FRAME);
    expect(apart(pins)).toBeGreaterThanOrEqual(PIN_GAP - 0.1);
    expect(inside(pins)).toBe(true);
  });

  it("slides left instead when the frame's right edge stops it", () => {
    const pins = placePins([{ key: "a", box: box(FRAME.w - 5, 50) }, { key: "b", box: box(FRAME.w - 5, 50) }], FRAME);
    expect(apart(pins)).toBeGreaterThanOrEqual(PIN_GAP - 0.1);
    expect(inside(pins)).toBe(true);
    expect(pins[1].x).toBeLessThan(pins[0].x);
  });
});

// ---- screenModel: numbering across a section's captures ----------------------------------------------------------

const shot = (capture: string, regions: Record<string, [number, number, number, number]>): PageShot => ({
  w: 780, h: 1688, bytes: 1, quality: 60, regions, tools: {}, src: `/x/${capture}.webp`, theme: "amonkhet", width: "phone",
});

function section(labels: readonly string[]): Pick<VisibleSection, "captures" | "labels"> {
  return {
    captures: { phone: ["one", "two"], desktop: [] },
    labels: labels.map((id) => ({
      key: `decks/s/${id}`, area: "decks", section: "s", kind: "label", lead: id.toUpperCase(), text: ` is ${id}.`,
      switch: null, since: 1, legacy: [], sentenceSwitches: [],
    })),
  };
}

// Label order a, b, c, d; on the first capture, c sits above a and b sits below a, so reading order is c, a, b; d is on
// the second capture.
const SHOTS: Record<string, PageShot> = {
  one: shot("one", { "decks/s/a": [0.1, 0.3, 0.2, 0.05], "decks/s/b": [0.1, 0.6, 0.2, 0.05], "decks/s/c": [0.5, 0.1, 0.2, 0.05] }),
  two: shot("two", { "decks/s/d": [0.1, 0.2, 0.2, 0.05] }),
};
const fake = (_t: string | undefined, _w: string, capture: string) => SHOTS[capture] ?? null;

describe("screenModel: numbers in reading order across the captures", () => {
  it("numbers by reading order, not by the copy's label order, and a second shot numbers on", () => {
    const m = screenModel(section(["a", "b", "c", "d"]), "amonkhet", "phone", fake);
    expect(m.labels.map((l) => [l.key.split("/")[2], l.n, l.shot])).toEqual([
      ["c", 1, 0], ["a", 2, 0], ["b", 3, 0], ["d", 4, 1],
    ]);
    expect(m.shots.map((s) => s.pins.map((p) => p.n))).toEqual([[1, 2, 3], [4]]);
    // The list line and the pin carry the same number.
    for (const s of m.shots) for (const p of s.pins) expect(m.labels.find((l) => l.key === p.key)!.n).toBe(p.n);
  });

  it("a label the reader is not drawn has no pin and no line, and the numbers close up", () => {
    const m = screenModel(section(["b", "c", "d"]), "amonkhet", "phone", fake);
    expect(m.labels.map((l) => [l.key.split("/")[2], l.n])).toEqual([["c", 1], ["b", 2], ["d", 3]]);
    expect(m.shots.flatMap((s) => s.pins).map((p) => p.key)).not.toContain("decks/s/a");
    expect(m.shots.flatMap((s) => s.pins).map((p) => p.n)).toEqual([1, 2, 3]);
  });

  it("drops a second shot none of whose labels are drawn", () => {
    const m = screenModel(section(["a", "c"]), "amonkhet", "phone", fake);
    expect(m.shots).toHaveLength(1);
  });

  it("places pins in percent of the picture", () => {
    const m = screenModel(section(["c"]), "amonkhet", "phone", fake);
    const [p] = m.shots[0].pins;
    // 358 wide: 0.5 * 358 + 14 = 193 → 53.9%.
    expect(p.left).toBeCloseTo(53.9, 1);
  });
});

describe("the shipped pages, every switch on", () => {
  const envs = [ALL_ON, env({ ...(ALL_ON as Record<string, string>), HOME_FEED_ENABLED: "off" })];

  it("every label's region is its key, so the manifest is read by the key the reader carries", () => {
    for (const s of ABOUT_SECTIONS) for (const l of s.labels) expect(l.region).toBe(regionOf({ key: `${s.area}/${s.id}/${l.id}` }));
  });

  it("pins every drawn label on a capture, at most five a picture, at both widths, in every section", () => {
    for (const e of envs) {
      for (const s of visibleSections(e)) {
        for (const width of PAGE_WIDTHS) {
          const m = screenModel(s, "amonkhet", width);
          expect(m.labels.filter((l) => l.shot === null).map((l) => l.key), `${s.area}/${s.id} ${width}`).toEqual([]);
          for (const sh of m.shots) expect(sh.pins.length, `${s.area}/${s.id} ${width}`).toBeLessThanOrEqual(MAX_PINS);
          expect(m.labels.map((l) => l.n)).toEqual(m.labels.map((_, i) => i + 1));
        }
      }
    }
  });
});
