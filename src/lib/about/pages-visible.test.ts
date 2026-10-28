import { describe, expect, it } from "vitest";
import { ABOUT_RULES, ABOUT_SECTIONS } from "../copy/about-pages";
import { aboutEntries } from "../copy/about-entries";
import { SWITCH_NAMES } from "../switches/registry";
import { resolveEnv, type SwitchSnapshot } from "../switches/resolve";
import {
  labelKey, ruleKey, seenKeysOf, sentenceKey, unitSeen, unseenUnits, visibleSections, type VisibleSection,
} from "./pages-visible";
import { NEVER_SEEN, switchedIds, visibleEntries, type SeenState } from "./visible";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const ALL_ON = env(Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"])));
const OFF = env({});
const units = (v: readonly VisibleSection[]) => v.flatMap((s) => [...s.labels, ...s.rules]);
const keys = (v: readonly VisibleSection[]) => units(v).map((u) => u.key);

/** What a reader at `floor` who visited About with every switch on was written: the floor, and every switched entry
 *  (and variant) drawn to them that had arrived by then. */
function readerAt(floor: number, e = ALL_ON): SeenState {
  const met = visibleEntries(e).filter((x) => x.since <= floor);
  return { version: floor, ids: switchedIds(met) };
}

describe("visibleSections", () => {
  it("drops a label whose switch is off and keeps its section, never greyed", () => {
    const off = visibleSections(OFF);
    const lock = off.find((s) => s.id === "your-deck")!;
    expect(lock.labels.map((l) => l.key)).not.toContain("decks/your-deck/lock");
    expect(off.find((s) => s.id === "notes")!.labels).toEqual([]);
    expect(off.map((s) => s.id)).toEqual(ABOUT_SECTIONS.map((s) => s.id));
  });

  it("cuts a sentence whose switch is off, and keeps a negated one only while its switch is off", () => {
    const replace = (e: NodeJS.ProcessEnv) => visibleSections(e).flatMap((s) => s.rules).find((r) => r.key === "rule/replace")!;
    expect(replace(OFF).text).toBe("An upload replaces your whole Collection with the file.");
    const on = replace(ALL_ON).text;
    expect(on).not.toContain("An upload replaces your whole Collection");
    expect(on).toContain("With Sync");
    const editOnly = replace(env({ COLLECTION_EDIT_ENABLED: "true" })).text;
    expect(editOnly).toContain("With Add");
    expect(editOnly).not.toContain("With Sync");
  });

  it("announces a kept positive sentence on its own key, and never a negated one", () => {
    const replace = visibleSections(ALL_ON).flatMap((s) => s.rules).find((r) => r.key === "rule/replace")!;
    expect(replace.sentenceSwitches).toContain("COLLECTION_SYNC_ENABLED");
    const off = visibleSections(OFF).flatMap((s) => s.rules).find((r) => r.key === "rule/replace")!;
    expect(off.sentenceSwitches).toEqual([]);
  });
});

describe("seen translation", () => {
  it("tells a reader at every floor exactly what the old entries would not have", () => {
    const visible = visibleSections(ALL_ON);
    for (let floor = 1; floor <= 16; floor++) {
      const seen = readerAt(floor);
      const metIds = new Set(seen.ids);
      const unswitchedSince = (leg: readonly string[]) =>
        leg.flatMap((id) => {
          const e = aboutEntries.find((x) => x.id === id);
          return e && !e.switch ? [e.since] : [];
        });
      const expected = units(visible).filter((u) => {
        if (u.legacy.some((id) => metIds.has(id))) return false;
        const own = typeof u.switch === "string" ? u.switch : null;
        const isAnnouncement = own !== null && u.legacy.some((id) => id.endsWith(`@${own}`) || aboutEntries.find((x) => x.id === id)?.switch === own);
        if (isAnnouncement) return true;
        return u.since > floor;
      }).map((u) => u.key);
      const got = unseenUnits(visible, seen).filter((u) => !u.key.includes("@")).map((u) => u.key);
      expect(got, `floor ${floor}`).toEqual(expected);
      // Nothing the reader met is told again: every unit told at this floor has no unswitched source at or under it.
      for (const k of got) {
        const u = units(visible).find((x) => x.key === k)!;
        // Told only when part of it is a source they have not met: an unswitched entry newer than the floor, or the
        // switched entry this unit announces, which they have not been written.
        const unmetSwitched = u.legacy.some((id) => !metIds.has(id) && (id.includes("@") || aboutEntries.find((x) => x.id === id)?.switch));
        expect(unswitchedSince(u.legacy).some((s) => s > floor) || unmetSwitched || unswitchedSince(u.legacy).length === 0, k).toBe(true);
      }
    }
  });

  it("tells a reader who saw everything at version 16 nothing at all", () => {
    expect(unseenUnits(visibleSections(ALL_ON), readerAt(16))).toEqual([]);
  });

  it("treats a switch on only through an app-wide override as heard, as production resolves it", () => {
    const snapshot: SwitchSnapshot = {
      overrides: [{ switchName: "COMMANDERS_PLACE_ENABLED", scope: "app", groupId: null, userId: null, value: "on" }],
      groupOf: new Map(),
    };
    const reader = resolveEnv(OFF, snapshot, "u1");
    const visible = visibleSections(reader);
    const places = units(visible).find((u) => u.key === "commanders/for-you/places");
    expect(places).toBeDefined();
    expect(unitSeen(places!, readerAt(16, reader))).toBe(true);
    expect(unitSeen(places!, { version: places!.since - 1, ids: ["anything"] })).toBe(false);
  });

  it("carries a legacy variant to the sentence it became", () => {
    const visible = visibleSections(ALL_ON);
    const withSync: SeenState = { version: 16, ids: ["upload-choice", "upload-choice@COLLECTION_SYNC_ENABLED"] };
    const withoutSync: SeenState = { version: 16, ids: ["upload-choice"] };
    const sync = sentenceKey("rule/replace", "COLLECTION_SYNC_ENABLED");
    expect(unseenUnits(visible, withSync).map((u) => u.key)).not.toContain(sync);
    expect(unseenUnits(visible, withoutSync).map((u) => u.key)).toContain(sync);
  });

  it("tells a first-run reader nothing, and a written key is seen", () => {
    const visible = visibleSections(ALL_ON);
    expect(unseenUnits(visible, NEVER_SEEN)).toEqual([]);
    const lock = units(visible).find((u) => u.key === "decks/your-deck/lock")!;
    expect(unitSeen(lock, { version: 16, ids: [] })).toBe(false);
    expect(unitSeen(lock, { version: 16, ids: [lock.key] })).toBe(true);
  });

  it("a visit to one page writes that page's keys alone", () => {
    const all = visibleSections(ALL_ON);
    const decks = all.filter((s) => s.area === "decks");
    const written = seenKeysOf(all, "decks");
    expect(written.every((k) => k.startsWith("decks/") || k.startsWith("rule/"))).toBe(true);
    const friendsRules = ABOUT_SECTIONS.filter((s) => s.area === "friends").flatMap((s) => s.rules.map(ruleKey));
    expect(written.some((k) => friendsRules.some((r) => k.startsWith(r)))).toBe(false);
    expect(written).toEqual(expect.arrayContaining(keys(decks)));
  });

  it("tells each new thing once: a new unit carries its sentences, and no key repeats", () => {
    const visible = visibleSections(ALL_ON);
    const fresh: SeenState = { version: 5, ids: ["placeholder"] };
    const told = unseenUnits(visible, fresh).map((u) => u.key);
    expect(new Set(told).size).toBe(told.length);
    expect(told).toContain("rule/friends-see");
    expect(told.filter((k) => k.startsWith("rule/friends-see@"))).toEqual([]);
    const spare: SeenState = { version: 16, ids: ["friend-spares"] };
    expect(unseenUnits(visible, spare).map((u) => u.key)).toContain(sentenceKey("shopping/deck-shopping/spare", "SPARE_REQUESTS_ENABLED"));
    const writes = seenKeysOf(visible, "collection");
    expect(new Set(writes).size).toBe(writes.length);
  });

  it("keeps a label's opening space and drops the one a cut first sentence leaves", () => {
    const editOnly = visibleSections(env({ COLLECTION_EDIT_ENABLED: "true" }));
    const replace = editOnly.flatMap((s) => s.rules).find((r) => r.key === "rule/replace")!;
    expect(replace.text.startsWith("With Replace")).toBe(true);
    const help = editOnly.flatMap((s) => s.labels).find((l) => l.key === "collection/cards/tabs")!;
    expect(help.text).toBe(" are your Collection’s tabs. History lists every change you’ve made to it.");
  });

  it("names every switched legacy entry in some unit, so no announced entry is lost", () => {
    const named = new Set([
      ...ABOUT_SECTIONS.flatMap((s) => s.labels.flatMap((l) => l.legacy)),
      ...Object.values(ABOUT_RULES).flatMap((r) => r.legacy),
    ]);
    const kept = ["upload-choice", "availability", "deck-analysis", "auto-fill", "decklist-marks", "locked-cards", "roles", "versions", "shopping", "friends", "credits", "buying-credits", "statuses", "getting-help"];
    for (const id of kept) expect(named, id).toContain(id);
    expect(labelKey({ area: "home", id: "home" }, { id: "help" })).toBe("home/home/help");
  });
});
