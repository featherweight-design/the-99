import { describe, expect, it } from "vitest";
import { ABOUT_SECTIONS } from "../copy/about-pages";
import { SWITCH_NAMES } from "../switches/registry";
import { PAGE_WIDTHS, type PageShot } from "./page-shots";
import { visibleSections, type VisibleSection } from "./pages-visible";
import {
  BRACKET_ARM, BRACKET_EDGE, BRACKET_MIN, HALO_REACH, MAX_PINS, PIN_GAP, PIN_GUTTER, PIN_SIZE, haloAt, pinsAt, placePins, regionOf,
  screenModel, type Box, type PlacedPin,
} from "./pins";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const ALL_ON = env(Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"])));

// Addendum R4 board 1's regions (`build.py` SHOT1, SHOT2, DSHOT1), fractions of the capture, and the capture sizes the
// board draws them at: a phone column of 358 less the 30px gutter (328 x 710) and a desktop column of 700 (670 x 464).
type Frac = [number, number, number, number];
const SHOT1: [string, Frac][] = [["commit", [0.6795, 0.1774, 0.2462, 0.0427]], ["mix", [0, 0.317, 1, 0.1964]], ["lock", [0.041, 0.671, 0.2974, 0.0521]]];
const SHOT2: [string, Frac][] = [["row", [0.0641, 0.4256, 0.0205, 0.0095]], ["bracket", [0.3478, 0.7739, 0.041, 0.019]]];
const D_MIX: Frac = [0.0477, 0.5124, 0.9523, 0.2092];
const DSHOT1: [string, Frac][] = [["commit", [0.8654, 0.3972, 0.1015, 0.04]], ["mix", D_MIX], ["lock", [0.5954, 0.8051, 0.0892, 0.0356]]];
const PHONE = { w: 328, h: 710 };
const DESK = { w: 670, h: 464 };
const scaled = (regions: [string, Frac][], f: { w: number; h: number }) =>
  regions.map(([key, [x, y, w, h]]) => ({ key, box: { x: x * f.w, y: y * f.h, w: w * f.w, h: h * f.h } }));

const box = (x: number, y: number, w = 60, h = 30): Box => ({ x, y, w, h });

/** Every pin's centre in the gutter, never over the capture, 28px or more below the pin before it, inside the height. */
function gutterRule(pins: readonly PlacedPin[], h: number, where = "") {
  for (const p of pins) {
    expect(p.x, where).toBe(PIN_GUTTER / 2);
    expect(p.x + PIN_SIZE / 2, where).toBeLessThanOrEqual(PIN_GUTTER);
    expect(p.y, where).toBeGreaterThanOrEqual(PIN_SIZE / 2);
    expect(p.y, where).toBeLessThanOrEqual(h - PIN_SIZE / 2 + 0.05);
  }
  for (let i = 1; i < pins.length; i++) expect(pins[i].y - pins[i - 1].y, where).toBeGreaterThanOrEqual(PIN_GAP - 0.1);
}

function bracketRule(pins: readonly PlacedPin[], f: { w: number; h: number }, where = "") {
  for (const { bracket: k } of pins) {
    expect(k.l, where).toBeGreaterThanOrEqual(BRACKET_EDGE);
    expect(k.t, where).toBeGreaterThanOrEqual(BRACKET_EDGE);
    expect(k.r, where).toBeLessThanOrEqual(f.w - BRACKET_EDGE);
    expect(k.b, where).toBeLessThanOrEqual(f.h - BRACKET_EDGE);
    expect(k.arm, where).toBeLessThanOrEqual(BRACKET_ARM);
    // Review round 1: a target at the edge slides its bracket in, never cuts it below the least size.
    expect(k.r - k.l, where).toBeGreaterThanOrEqual(BRACKET_MIN - 0.1);
    expect(k.b - k.t, where).toBeGreaterThanOrEqual(BRACKET_MIN - 0.1);
  }
}

describe("placePins on R4 board 1 (pins in the gutter, brackets on the target)", () => {
  it("shot 1 at the phone: the mock's rows, no stub, brackets round each region", () => {
    const pins = placePins(scaled(SHOT1, PHONE), PHONE);
    expect(pins.map((p) => [p.key, p.n, p.y])).toEqual([["commit", 1, 140], ["mix", 2, 239.1], ["lock", 3, 490.4]]);
    expect(pins.map((p) => p.stub)).toEqual([null, null, null]);
    expect(pins.map((p) => p.bracket)).toEqual([
      { l: 218.9, t: 122, r: 307.6, b: 160.3, arm: 10 },
      { l: 3, t: 221.1, r: 325, b: 368.5, arm: 10 },
      { l: 9.4, t: 472.4, r: 115, b: 517.4, arm: 10 },
    ]);
    gutterRule(pins, PHONE.h);
    bracketRule(pins, PHONE);
  });

  it("shot 2: the 4px row dot still gets a 20 x 20 bracket centred on it", () => {
    const pins = placePins(scaled(SHOT2, PHONE), PHONE);
    expect(pins.map((p) => [p.key, p.y])).toEqual([["row", 305.5], ["bracket", 556.2]]);
    const dot = pins[0].bracket;
    expect(dot).toEqual({ l: 14.4, t: 295.5, r: 34.4, b: 315.5, arm: 10 });
    expect(dot.r - dot.l).toBeGreaterThanOrEqual(BRACKET_MIN);
    expect(dot.b - dot.t).toBeGreaterThanOrEqual(BRACKET_MIN);
    bracketRule(pins, PHONE);
  });

  it("desktop shot 1 at 670: the same rule, the full-width mix region held 3px inside", () => {
    const pins = placePins(scaled(DSHOT1, DESK), DESK);
    expect(pins.map((p) => [p.key, p.y])).toEqual([["commit", 193.6], ["mix", 251.8], ["lock", 381.8]]);
    expect(pins[1].bracket).toEqual({ l: 28, t: 233.8, r: 667, b: 338.8, arm: 10 });
    gutterRule(pins, DESK.h);
    bracketRule(pins, DESK);
  });

  it("two regions on one row: the later pin slides 28px down the gutter, a stub joining it to its row", () => {
    const pins = placePins([{ key: "a", box: box(20, 40) }, { key: "b", box: box(200, 44) }], PHONE);
    expect(pins.map((p) => p.y)).toEqual([54, 82]);
    expect(pins[0].stub).toBeNull();
    // The row is b's top plus half its height (44 + 14), the pin 28 below a's.
    expect(pins[1].stub).toEqual({ top: 58, height: 24 });
    gutterRule(pins, PHONE.h);
  });

  it("slides a pin whose row sits ABOVE the one before it (a negative difference) under it", () => {
    // Reading order is by the region's top; a tall region's row can sit lower than a later short one's.
    const pins = placePins([{ key: "tall", box: box(0, 100, 60, 200) }, { key: "short", box: box(100, 104, 60, 4) }], PHONE);
    expect(pins.map((p) => [p.key, p.y])).toEqual([["tall", 114], ["short", 142]]);
    expect(pins[1].stub).toEqual({ top: 106, height: 36 });
  });

  it("orders by top before left: a region further left but lower reads later", () => {
    const pins = placePins([{ key: "low-left", box: box(0, 200) }, { key: "high-right", box: box(200, 100) }], PHONE);
    expect(pins.map((p) => [p.key, p.n])).toEqual([["high-right", 1], ["low-left", 2]]);
  });

  it("clamps a pin slid past the capture's foot to the frame (R4 ruling 7)", () => {
    const f = { w: 300, h: 100 };
    const pins = placePins(["a", "b", "c", "d"].map((key) => ({ key, box: box(10, 40, 40, 8) })), f);
    for (const p of pins) expect(p.y).toBeLessThanOrEqual(f.h - PIN_SIZE / 2);
    expect(pins.at(-1)!.y).toBe(f.h - PIN_SIZE / 2);
  });

  it("keeps a region that moved past an edge (a re-taken capture) bracketed and pinned inside", () => {
    const f = { w: 268, h: 580 };
    const pins = placePins(
      [{ key: "right", box: box(f.w + 40, 100) }, { key: "below", box: box(100, f.h + 10) }, { key: "left-above", box: box(-80, -50) }],
      f,
    );
    gutterRule(pins, f.h);
    bracketRule(pins, f);
  });
});

describe("haloAt holds a lit region 8px inside the frame (R4 board 2)", () => {
  it("Recommended mix at 670 touches the right edge; its halo stops 8px short of every side", () => {
    const h = haloAt(D_MIX, DESK.w, DESK.h);
    expect(h).toEqual({ x: 32, y: 237.8, w: 630, h: 97.1 });
    expect(h.x).toBeGreaterThanOrEqual(HALO_REACH);
    expect(h.y).toBeGreaterThanOrEqual(HALO_REACH);
    expect(h.x + h.w).toBeLessThanOrEqual(DESK.w - HALO_REACH + 0.05);
    expect(h.y + h.h).toBeLessThanOrEqual(DESK.h - HALO_REACH + 0.05);
  });

  it("a region covering the whole frame is held 8px in on all four sides", () => {
    expect(haloAt([0, 0, 1, 1], 300, 200)).toEqual({ x: 8, y: 8, w: 284, h: 184 });
  });

  it("a region wholly past an edge collapses to a point inside, never a negative box", () => {
    const h = haloAt([1.2, 0.5, 0.1, 0.1], 300, 200);
    expect(h.x).toBe(292);
    expect(h.w).toBe(0);
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

  it("carries each pin's region box, and leaves where it sits to the rendered size", () => {
    const m = screenModel(section(["c"]), "amonkhet", "phone", fake);
    expect(m.shots[0].pins).toEqual([{ key: "decks/s/c", n: 1, box: [0.5, 0.1, 0.2, 0.05] }]);
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

describe("pinsAt: pins placed at the capture's RENDERED size", () => {
  // The capture widths themselves (the column less the 30px gutter). Phone: a 320 window (258), 362 (300), 390 (328)
  // and wider phones up to md. Desktop: about 340 at a 768 window (60% of the content beside the rail, less the gutter)
  // and 670 from about 1180. The disc does not scale with the picture, so the gap and the clamp must hold in real pixels.
  const WIDTHS: Record<"phone" | "desktop", number[]> = { phone: [258, 300, 328, 358, 388], desktop: [340, 358, 388, 670] };

  it("keeps every shipped picture's pins in the gutter, 28px apart and inside, its brackets inside, at every width", () => {
    for (const s of visibleSections(ALL_ON)) {
      for (const width of PAGE_WIDTHS) {
        for (const sh of screenModel(s, "amonkhet", width).shots) {
          for (const w of WIDTHS[width]) {
            const h = (w * sh.shot.h) / sh.shot.w;
            const pins = pinsAt(sh.pins, w, h);
            const where = `${s.area}/${s.id} ${width} ${sh.shot.src} at ${w}px`;
            expect(pins.map((p) => p.n), where).toEqual(sh.pins.map((p) => p.n));
            gutterRule(pins as PlacedPin[], h, where);
            bracketRule(pins as PlacedPin[], { w, h }, where);
          }
        }
      }
    }
  });

  it("puts a pin level with its region's row in rendered pixels", () => {
    const [p] = pinsAt([{ key: "k", n: 3, box: [0.5, 0.5, 0.1, 0.1] }], 388, 269);
    // Row: 134.5 top plus half of min(26.9, 28).
    expect(p).toMatchObject({ key: "k", n: 3, x: 15, y: 148, stub: null });
  });
});
