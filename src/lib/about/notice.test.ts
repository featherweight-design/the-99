// About's lines on Home's banner (About visual PR 6b): the pages' own announcement rule, worded per launch with its
// crop; and the ✕'s re-validation, which writes only what the page drew and is still announced, by each unit's `ack`.
import { describe, expect, it } from "vitest";
import { ABOUT_VERSION } from "../copy/about";
import { aboutEntries } from "../copy/about-entries";
import { SWITCH_NAMES } from "../switches/registry";
import { bannerCap, cropStyle } from "./banner-line";
import { aboutDismissal, aboutLine, launchHref } from "./notice";
import { afterVisit, everyAnnouncement, sentenceKey, unseenUnits, visibleSections, type VisibleSection } from "./pages-visible";
import { DEFAULT_THEME } from "../theme/themes";
import { NEVER_SEEN, switchedIds, visibleEntries, type SeenState } from "./visible";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const ALL_ON = env(Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"])));
const OFF = env({});
const THEME = DEFAULT_THEME;
const units = (v: readonly VisibleSection[]) => v.flatMap((s) => [...s.labels, ...s.rules]);

/** A reader at `floor` who visited About with these switches: the floor, and every switched entry drawn by then. */
function readerAt(floor: number, e = ALL_ON): SeenState {
  return { version: floor, ids: switchedIds(visibleEntries(e).filter((x) => x.since <= floor)) };
}

/** Task 1.2's sweep, at one floor: the units a reader there has not been told about (`pages-visible.test.ts`). */
function sweepAt(floor: number, visible: readonly VisibleSection[]): string[] {
  const met = new Set(readerAt(floor).ids);
  return units(visible).filter((u) => {
    if (u.legacy.some((id) => met.has(id))) return false;
    const own = typeof u.switch === "string" ? u.switch : null;
    const announces = own !== null && u.legacy.some((id) => id.endsWith(`@${own}`) || aboutEntries.find((x) => x.id === id)?.switch === own);
    return announces || u.since > floor;
  }).map((u) => u.key);
}

describe("aboutLine", () => {
  it("tells a reader at floor 16 holding every switched id nothing", () => {
    expect(aboutLine(readerAt(16), visibleSections(ALL_ON), THEME)).toBeNull();
    expect(aboutLine(readerAt(16, OFF), visibleSections(OFF), THEME)).toBeNull();
  });

  it("names exactly the units Task 1.2's sweep names for a reader at floor 9, in page order", () => {
    const visible = visibleSections(ALL_ON);
    const line = aboutLine(readerAt(9), visible, THEME);
    expect(line?.kind).toBe("launches");
    if (line?.kind !== "launches") return;
    expect(line.ids).toEqual(unseenUnits(visible, readerAt(9)).map((u) => u.key));
    expect(line.ids.filter((k) => !k.includes("@"))).toEqual(sweepAt(9, visible));
    expect(line.ids.length).toBeGreaterThan(1);
  });

  it("never names a unit switched off for the reader (Review Focus 2)", () => {
    // Lock cards follows NEVER_CUT_ENABLED and is announced by its id alone.
    const reader: SeenState = { version: 16, ids: ["something-else"] };
    const on = aboutLine(reader, visibleSections(env({ NEVER_CUT_ENABLED: "true" })), THEME);
    expect(on?.ids).toContain("decks/your-deck/lock");
    const off = aboutLine(reader, visibleSections(OFF), THEME);
    expect(off?.ids ?? []).not.toContain("decks/your-deck/lock");
    for (const k of off?.ids ?? []) expect(units(visibleSections(OFF)).map((u) => u.key)).toContain(k.split("@")[0]);
  });

  it("words one launch: its page, its lead and rest, Show me to the label lit, and a crop at each width", () => {
    const line = aboutLine({ version: 16, ids: ["x"] }, visibleSections(env({ NEVER_CUT_ENABLED: "true" })), THEME);
    const lock = line?.kind === "launches" ? line.launches.find((l) => l.key === "decks/your-deck/lock") : undefined;
    expect(lock).toMatchObject({
      lead: "New on Decks:",
      text: "Lock cards protects the cards you pick. No tool will cut a locked card unless you say so.",
      href: "/about/decks?lit=decks%2Fyour-deck%2Flock#your-deck",
    });
    // The picture matches the device (call 0): each crop from its own width's capture, centred on the label's region.
    expect(lock!.phone?.src).toMatch(new RegExp(`^/about/pages/${THEME}/phone/`));
    expect(lock!.desktop?.src).toMatch(new RegExp(`^/about/pages/${THEME}/desktop/`));
    expect(lock!.phone?.box).toHaveLength(4);
  });

  it("draws a rule with no crop, so the banner keeps the diamond mark for it", () => {
    const visible = visibleSections(ALL_ON);
    const rule = units(visible).find((u) => u.kind === "rule")!;
    const line = aboutLine({ version: 0, ids: ["x"] }, visible, THEME);
    const told = line?.kind === "launches" ? line.launches.find((l) => l.key === rule.key) : undefined;
    expect(told).toBeDefined();
    expect(told!.phone).toBeNull();
    expect(told!.desktop).toBeNull();
    expect(told!.href).toBe(`/about/${rule.area}?lit=${encodeURIComponent(rule.key)}#${rule.section}`);
  });

  it("words a switched sentence told on its own as that sentence alone, landing on its unit", () => {
    const visible = visibleSections(ALL_ON);
    const reader: SeenState = { version: 16, ids: ["upload-choice"] };
    const sync = sentenceKey("rule/replace", "COLLECTION_SYNC_ENABLED");
    const line = aboutLine(reader, visible, THEME);
    const told = line?.kind === "launches" ? line.launches.find((l) => l.key === sync) : undefined;
    expect(told?.text).toMatch(/^With Sync/);
    expect(told?.href).toContain(`lit=${encodeURIComponent("rule/replace")}`);
  });

  it("points a first-run reader at the index, standing for every unit they are drawn", () => {
    const visible = visibleSections(ALL_ON);
    expect(aboutLine(NEVER_SEEN, visible, THEME)).toEqual({
      kind: "firstRun", ids: units(visible).map((u) => u.key), ack: everyAnnouncement(visible).flatMap((u) => u.ack),
    });
  });

  it("lands Show me on the unit's page, lit, at its section", () => {
    expect(launchHref({ key: "decks/games/matchups", area: "decks", section: "games" })).toBe("/about/decks?lit=decks%2Fgames%2Fmatchups#games");
    expect(launchHref({ key: "rule/replace@COLLECTION_SYNC_ENABLED", area: "collection", section: "import" }))
      .toBe("/about/collection?lit=rule%2Freplace#import");
  });
});

describe("aboutDismissal (the banner's ✕)", () => {
  const visible = visibleSections(ALL_ON);

  it("writes every claimed unit's ack, not just its key, and raises the floor when every launch was claimed", () => {
    const reader = readerAt(9);
    const unseen = unseenUnits(visible, reader);
    const write = aboutDismissal(unseen.flatMap((u) => u.ack), reader, visible);
    expect(write?.version).toBe(ABOUT_VERSION);
    expect(new Set(write?.ids)).toEqual(new Set(unseen.flatMap((u) => u.ack)));
    // A unit told whole carries its sentences' keys, so none is told on its own next.
    expect(unseen.some((u) => u.ack.length > 1)).toBe(true);
    const after: SeenState = { version: write!.version, ids: [...reader.ids, ...write!.ids] };
    expect(unseenUnits(visible, after)).toEqual([]);
  });

  it("holds the floor under an unclaimed launch, so it stays new", () => {
    const reader = readerAt(9);
    const unseen = unseenUnits(visible, reader);
    const [left, ...claimed] = unseen;
    const write = aboutDismissal(claimed.flatMap((u) => u.ack), reader, visible)!;
    const since = units(visible).find((u) => u.key === left!.key.split("@")[0])!.since;
    expect(write.version).toBeLessThan(Math.max(since, reader.version + 1));
    expect(write.version).toBeGreaterThanOrEqual(reader.version);
    expect(unseenUnits(visible, { version: write.version, ids: [...reader.ids, ...write.ids] }).map((u) => u.key)).toContain(left!.key);
  });

  it("writes nothing a client adds: an unknown key, a unit already seen, or a non-array", () => {
    const reader = readerAt(9);
    expect(aboutDismissal(["not/a/key"], reader, visible)).toBeNull();
    expect(aboutDismissal("decks/games/matchups", reader, visible)).toBeNull();
    expect(aboutDismissal(["home/home/ready"], readerAt(16), visible)).toBeNull();
  });

  it("writes nothing for a unit switched off since the page rendered", () => {
    const reader: SeenState = { version: 16, ids: ["x"] };
    expect(aboutDismissal(["decks/your-deck/lock"], reader, visibleSections(OFF))).toBeNull();
  });

  it("gives a first-run reader the baseline a first visit writes", () => {
    const keys = everyAnnouncement(visible).flatMap((u) => u.ack);
    const write = aboutDismissal(keys, NEVER_SEEN, visible)!;
    const baseline = afterVisit(visible, "home", NEVER_SEEN);
    expect(write.version).toBe(baseline.version);
    expect(new Set(write.ids)).toEqual(new Set(baseline.ids));
  });
});

// Review round 1: the ✕ writes what was RENDERED, intersected with what is announced now, never widened to it.
describe("aboutDismissal, a switch turned on between the render and the ✕", () => {
  const SPARE = "shopping/deck-shopping/spare";
  const SPARE_ON = env({ SOCIAL_FRIENDS_ENABLED: "true", SPARE_REQUESTS_ENABLED: "true" });
  const SPARE_OFF = env({ SOCIAL_FRIENDS_ENABLED: "true" });
  const reader: SeenState = { version: 16, ids: ["x"] };

  it("a base unit drawn before SPARE_REQUESTS_ENABLED turned on does not take its new sentence's key", () => {
    const line = aboutLine(reader, visibleSections(SPARE_OFF), THEME);
    const drawn = line?.kind === "launches" ? line.launches.find((l) => l.key === SPARE) : undefined;
    expect(drawn?.ack).toEqual([SPARE]);
    const now = visibleSections(SPARE_ON);
    const write = aboutDismissal(drawn!.ack, reader, now)!;
    expect(write.ids).toContain(SPARE);
    expect(write.ids).not.toContain(sentenceKey(SPARE, "SPARE_REQUESTS_ENABLED"));
    // The sentence is the next launch: the floor stays under its unit.
    const after: SeenState = { version: write.version, ids: [...reader.ids, ...write.ids] };
    expect(unseenUnits(now, after).map((u) => u.key)).toContain(sentenceKey(SPARE, "SPARE_REQUESTS_ENABLED"));
  });

  it("writes the sentence's key when the render drew it", () => {
    const now = visibleSections(SPARE_ON);
    const line = aboutLine(reader, now, THEME);
    const drawn = line?.kind === "launches" ? line.launches.find((l) => l.key === SPARE) : undefined;
    expect(drawn?.ack).toEqual([SPARE, sentenceKey(SPARE, "SPARE_REQUESTS_ENABLED")]);
    expect(aboutDismissal(drawn!.ack, reader, now)!.ids).toContain(sentenceKey(SPARE, "SPARE_REQUESTS_ENABLED"));
  });

  it("a first-run ✕ takes only the baseline it rendered: a unit and a sentence switched on since stay new", () => {
    const line = aboutLine(NEVER_SEEN, visibleSections(OFF), THEME);
    expect(line?.kind).toBe("firstRun");
    const now = visibleSections(env({ NEVER_CUT_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "true", SPARE_REQUESTS_ENABLED: "true" }));
    const write = aboutDismissal(line?.kind === "firstRun" ? line.ack : [], NEVER_SEEN, now)!;
    expect(write.ids).not.toContain("decks/your-deck/lock");
    expect(write.ids).not.toContain(SPARE);
    const after: SeenState = { version: write.version, ids: write.ids };
    const told = unseenUnits(now, after).map((u) => u.key);
    expect(told).toContain("decks/your-deck/lock");
    expect(told).toContain(SPARE);
  });

  it("cuts a claim past the bound, as a page never draws one that long", () => {
    const padded = [...Array.from({ length: 200 }, (_, i) => `pad/${i}`), "decks/your-deck/lock"];
    expect(aboutDismissal(padded, reader, visibleSections(env({ NEVER_CUT_ENABLED: "true" })))).toBeNull();
  });
});

describe("bannerCap", () => {
  it("shows four in full and past four three, so `and 1 more` never prints", () => {
    expect(bannerCap(1)).toEqual({ shown: 1, more: 0 });
    expect(bannerCap(4)).toEqual({ shown: 4, more: 0 });
    expect(bannerCap(5)).toEqual({ shown: 3, more: 2 });
    for (let n = 0; n < 60; n++) expect(bannerCap(n).more).not.toBe(1);
  });
});

describe("cropStyle", () => {
  const crop = (box: readonly [number, number, number, number]) => ({ src: "x", w: 1000, h: 2000, box });

  it("fits the region in the box with the board's margin and centres it there", () => {
    // A 100x100 region in the middle of a tall capture, in a 64x48 box: scaled to 80% of 48 tall, centred.
    const at = cropStyle(crop([0.45, 0.475, 0.1, 0.05]), 64, 48);
    expect(at.width).toBeCloseTo(384);
    expect(at.height).toBeCloseTo(768);
    expect(at.left + (0.5 * at.width)).toBeCloseTo(32, 0);
    expect(at.top + (0.5 * at.height)).toBeCloseTo(24, 0);
  });

  it("matches the board's Matchups crop on the phone capture: 55.8 wide, flush left", () => {
    // Ways-In "Banner · one launch · phone": the Matchups region (0.9179 of the 780px capture wide) at 64x48.
    const at = cropStyle({ src: "x", w: 780, h: 1688, box: [0.041, 0.2563, 0.9179, 0.3045] }, 64, 48);
    expect(at.width).toBeCloseTo(55.8, 0);
    expect(at.height).toBeCloseTo(120.7, 0);
    expect(at.left).toBe(0);
  });

  it("holds the image at the box's edge rather than leave a gap at a capture's corner", () => {
    const at = cropStyle(crop([0, 0, 0.1, 0.05]), 64, 48);
    expect(at.left).toBe(0);
    expect(at.top).toBe(0);
    const far = cropStyle(crop([0.9, 0.95, 0.1, 0.05]), 64, 48);
    expect(far.left + far.width).toBeCloseTo(64, 0);
    expect(far.top + far.height).toBeCloseTo(48, 0);
  });
});
