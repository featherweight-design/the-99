// About's lines on Home's banner (About visual PR 6b): the pages' own announcement rule, worded per launch, one sentence a line, with the glyph of the page it opens; and the ✕'s re-validation, which writes only what the page drew and is still announced, by each unit's `ack`.
import { describe, expect, it } from "vitest";
import { ABOUT_VERSION } from "../copy/about";
import { aboutEntries } from "../copy/about-entries";
import { SWITCH_NAMES } from "../switches/registry";
import { bannerCap } from "./banner-line";
import { aboutDismissal, aboutLine, launchHref } from "./notice";
import { afterVisit, everyAnnouncement, sentenceKey, unseenUnits, visibleSections, type VisibleSection } from "./pages-visible";
import { NEVER_SEEN, switchedIds, visibleEntries, type SeenState } from "./visible";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const ALL_ON = env(Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"])));
const OFF = env({});
const units = (v: readonly VisibleSection[]) => v.flatMap((s) => [...s.labels, ...s.rules]);

/** A reader at `floor` who visited About with these switches: the floor, and every switched entry drawn by then. */
function readerAt(floor: number, e = ALL_ON): SeenState {
  return { version: floor, ids: switchedIds(visibleEntries(e).filter((x) => x.since <= floor)) };
}

/** Task 1.2's sweep, at one floor: the units a reader there has not been told about (`pages-visible.test.ts`). */
function sweepAt(floor: number, visible: readonly VisibleSection[]): string[] {
  const met = new Set(readerAt(floor).ids);
  const drawn = new Set(units(visible).map((u) => u.key));
  return units(visible).filter((u) => {
    // A unit riding a drawn label (the pick card on Suggested changes) is told with it, never on its own.
    if (u.announcedWith && drawn.has(u.announcedWith)) return false;
    if (u.legacy.some((id) => met.has(id))) return false;
    const own = typeof u.switch === "string" ? u.switch : null;
    const announces = own !== null && u.legacy.some((id) => id.endsWith(`@${own}`) || aboutEntries.find((x) => x.id === id)?.switch === own);
    // A switched unit with no source is new whatever the floor (the cart's labels, Small items 7, item 6).
    return announces || (u.switch !== null && u.legacy.length === 0) || u.since > floor;
  }).map((u) => u.key);
}

describe("aboutLine", () => {
  it("tells a reader at floor 16 holding every switched id nothing but Suggested changes v2's rewrite and the cart's new labels", () => {
    // The Reference never wrote a v2 id (the entry has no variant), so v2 turning on is told to every reader, this one
    // too, as the one sentence (Small items 7 addendum 4). The cart's decks, views, ask and buy have no source, so their
    // switches announce them (Small items 7, item 6).
    expect(aboutLine(readerAt(16), visibleSections(ALL_ON))?.ids).toEqual([
      sentenceKey("decks/analysis/suggested", "SUGGESTED_CHANGES_V2_ENABLED"),
      "shopping/all-decks/decks", "shopping/all-decks/views", "shopping/all-decks/ask", "shopping/all-decks/buy",
    ]);
    expect(aboutLine(readerAt(16, OFF), visibleSections(OFF))).toBeNull();
  });

  it("names exactly the units Task 1.2's sweep names for a reader at floor 9, in page order", () => {
    const visible = visibleSections(ALL_ON);
    const line = aboutLine(readerAt(9), visible);
    expect(line?.kind).toBe("launches");
    if (line?.kind !== "launches") return;
    expect(line.ids).toEqual(unseenUnits(visible, readerAt(9)).map((u) => u.key));
    expect(line.ids.filter((k) => !k.includes("@"))).toEqual(sweepAt(9, visible));
    expect(line.ids.length).toBeGreaterThan(1);
  });

  it("never names a unit switched off for the reader (Review Focus 2)", () => {
    // The cart's total follows ALL_DECKS_CART_ENABLED and is announced by its id alone.
    const reader: SeenState = { version: 16, ids: ["something-else"] };
    const on = aboutLine(reader, visibleSections(env({ ALL_DECKS_CART_ENABLED: "true" })));
    expect(on?.ids).toContain("shopping/all-decks/total");
    const off = aboutLine(reader, visibleSections(OFF));
    expect(off?.ids ?? []).not.toContain("shopping/all-decks/total");
    for (const k of off?.ids ?? []) expect(units(visibleSections(OFF)).map((u) => u.key)).toContain(k.split("@")[0]);
  });

  it("words one launch: its page, its lead and rest, Show me to the label lit, and the glyph of its page", () => {
    const line = aboutLine({ version: 16, ids: ["x"] }, visibleSections(OFF));
    const lock = line?.kind === "launches" ? line.launches.find((l) => l.key === "decks/your-deck/lock") : undefined;
    expect(lock).toMatchObject({
      lead: "New on Decks:",
      text: "Lock cards protects the cards you pick.",
      icon: "/decks",
      href: "/about/decks?lit=decks%2Fyour-deck%2Flock#your-deck",
    });
  });

  it("draws a rule with no glyph, so the banner keeps the diamond mark for it", () => {
    const visible = visibleSections(ALL_ON);
    const rule = units(visible).find((u) => u.kind === "rule")!;
    const line = aboutLine({ version: 0, ids: ["x"] }, visible);
    const told = line?.kind === "launches" ? line.launches.find((l) => l.key === rule.key) : undefined;
    expect(told).toBeDefined();
    expect(told!.icon).toBeNull();
    expect(told!.href).toBe(`/about/${rule.area}?lit=${encodeURIComponent(rule.key)}#${rule.section}`);
  });

  it("words a switched sentence told on its own as that sentence alone, landing on its unit", () => {
    const visible = visibleSections(ALL_ON);
    const reader: SeenState = { version: 16, ids: ["upload-choice"] };
    const sync = sentenceKey("rule/replace", "COLLECTION_SYNC_ENABLED");
    const line = aboutLine(reader, visible);
    const told = line?.kind === "launches" ? line.launches.find((l) => l.key === sync) : undefined;
    expect(told?.text).toMatch(/^With Sync/);
    expect(told?.href).toContain(`lit=${encodeURIComponent("rule/replace")}`);
  });

  it("points a first-run reader at the index, standing for every unit they are drawn", () => {
    const visible = visibleSections(ALL_ON);
    expect(aboutLine(NEVER_SEEN, visible)).toEqual({
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
    expect(aboutDismissal(["shopping/all-decks/total"], reader, visibleSections(OFF))).toBeNull();
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
  // Commanders' places unit (its own switch retired, always drawn) with a sentence on HELP_ME_CHOOSE_ENABLED. Spare
  // requests' sentence, then the wishlist's on a friend's page, were this case until each switch retired. The reader's
  // floor sits under the unit (since 1), so the unit itself is a launch.
  const UNIT = "commanders/for-you/places";
  const SENTENCE = sentenceKey(UNIT, "HELP_ME_CHOOSE_ENABLED");
  const HMC_ON = env({ HELP_ME_CHOOSE_ENABLED: "true" });
  const HMC_OFF = env({});
  const reader: SeenState = { version: 0, ids: ["x"] };
  // A friend's page: its unit follows SOCIAL_FRIENDS_ENABLED.
  const FRIEND = "friends/friends/friend";

  it("a base unit drawn before HELP_ME_CHOOSE_ENABLED turned on does not take its new sentence's key", () => {
    const line = aboutLine(reader, visibleSections(HMC_OFF));
    const drawn = line?.kind === "launches" ? line.launches.find((l) => l.key === UNIT) : undefined;
    expect(drawn?.ack).toEqual([UNIT]);
    const now = visibleSections(HMC_ON);
    const write = aboutDismissal(drawn!.ack, reader, now)!;
    expect(write.ids).toContain(UNIT);
    expect(write.ids).not.toContain(SENTENCE);
    // The sentence is the next launch: the floor stays under its unit.
    const after: SeenState = { version: write.version, ids: [...reader.ids, ...write.ids] };
    expect(unseenUnits(now, after).map((u) => u.key)).toContain(SENTENCE);
  });

  it("writes the sentence's key when the render drew it", () => {
    const now = visibleSections(HMC_ON);
    const line = aboutLine(reader, now);
    const drawn = line?.kind === "launches" ? line.launches.find((l) => l.key === UNIT) : undefined;
    expect([...drawn!.ack].sort()).toEqual([UNIT, SENTENCE].sort());
    expect(aboutDismissal(drawn!.ack, reader, now)!.ids).toContain(SENTENCE);
  });

  it("a first-run ✕ takes only the baseline it rendered: a unit and a sentence switched on since stay new", () => {
    const line = aboutLine(NEVER_SEEN, visibleSections(OFF));
    expect(line?.kind).toBe("firstRun");
    const now = visibleSections(env({ ALL_DECKS_CART_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "true" }));
    const write = aboutDismissal(line?.kind === "firstRun" ? line.ack : [], NEVER_SEEN, now)!;
    expect(write.ids).not.toContain("shopping/all-decks/total");
    expect(write.ids).not.toContain(FRIEND);
    const after: SeenState = { version: write.version, ids: write.ids };
    const told = unseenUnits(now, after).map((u) => u.key);
    expect(told).toContain("shopping/all-decks/total");
    expect(told).toContain(FRIEND);
  });

  it("cuts a claim past the bound, as a page never draws one that long", () => {
    const padded = [...Array.from({ length: 200 }, (_, i) => `pad/${i}`), "decks/your-deck/lock"];
    expect(aboutDismissal(padded, { version: 16, ids: ["x"] }, visibleSections(OFF))).toBeNull();
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
