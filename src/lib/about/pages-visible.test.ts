import { describe, expect, it } from "vitest";
import { ABOUT_RULES, ABOUT_SCREEN_OFF, ABOUT_SECTIONS, diagramColumn, type AboutSection } from "../copy/about-pages";
import type { AboutLineSwitch } from "../copy/about";
import { aboutEntries } from "../copy/about-entries";
import { SWITCHES, SWITCH_NAMES } from "../switches/registry";
import { TOOLS } from "../discovery/tools";
import { resolveEnv, type SwitchSnapshot } from "../switches/resolve";
import {
  afterVisit, answeredKeys, heldAnswer, labelKey, resolveDiagram, showMeLabel, ruleKey, seenKeysOf, sentenceKey, unitSeen, unseenUnits, visibleSections, type VisibleSection,
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
    expect(off.find((s) => s.id === "stats")!.labels).toEqual([]);
    // DECK_NOTES_ENABLED is retired (always on): its label draws whatever the env.
    expect(off.find((s) => s.id === "notes")!.labels.map((l) => l.key)).toEqual(["decks/notes/note"]);
    expect(off.map((s) => s.id)).toEqual(ABOUT_SECTIONS.map((s) => s.id));
  });

  // COLLECTION_EDIT_ENABLED and COLLECTION_SYNC_ENABLED are retired (always on): their sentences always draw, and the
  // negated one never does.
  it("keeps a retired switch's sentences, and never its negated one, whatever the env", () => {
    const replace = (e: NodeJS.ProcessEnv) => visibleSections(e).flatMap((s) => s.rules).find((r) => r.key === "rule/replace")!;
    for (const e of [OFF, ALL_ON]) {
      const text = replace(e).text;
      expect(text).not.toContain("An upload replaces your whole Collection");
      expect(text.startsWith("With Replace")).toBe(true);
      expect(text).toContain("With Add");
      expect(text).toContain("With Sync");
    }
  });

  it("announces a kept positive sentence on its own key, and never a negated one", () => {
    const replace = visibleSections(ALL_ON).flatMap((s) => s.rules).find((r) => r.key === "rule/replace")!;
    expect(replace.sentenceSwitches).toContain("COLLECTION_SYNC_ENABLED");
    const off = visibleSections(OFF).flatMap((s) => s.rules).find((r) => r.key === "rule/replace")!;
    expect(off.sentenceSwitches).toEqual(replace.sentenceSwitches);
  });
});

describe("each sentence follows its own switch", () => {
  const textOf = (e: Record<string, string>, key: string) =>
    units(visibleSections(env(e))).find((u) => u.key === key)?.text;
  it.each([
    ["Ready to build is gone with the feed always on", {}, "home/home/ready", undefined, undefined],
    ["the feed's lead names no kind a switch can hide", {}, "home/whats-new/lead", "You choose what can lead in Settings", "precon"],
    ["the + with scanning (collection edit is retired)", {}, "collection/cards/add", "scan them", undefined],
    ["the place strip without Help me choose", {}, "commanders/for-you/places", "two ways", "Help me choose"],
    ["a game log without Suggested changes", {}, "decks/games/log", "fifteen seconds", "Suggested changes"],
    ["credits with Suggested changes and not Proposed cuts", { ANALYSIS_TAB_ENABLED: "true", TUNING_ENABLED: "true" }, "rule/credits", "Suggested changes run", "Look deeper"],
    ["credits with Proposed cuts and not Suggested changes", { ANALYSIS_TAB_ENABLED: "true", PROPOSED_CUTS_ENABLED: "true" }, "rule/credits", "Look deeper", "Suggested changes"],
    ["credits with payments", { PAYMENTS_ENABLED: "true" }, "rule/credits", "Pack and gift credits never expire", "Overview"],
    ["credits with nothing on", {}, "rule/credits", "Anything written just for you", "never expire"],
    ["a proxy keeps its retired tokens sentence with nothing on", {}, "rule/proxy", "I have one", undefined],
    ["a fill without Help me choose", {}, "rule/autofill", "then uses your Collection", "Help me choose"],
    ["a fill with Help me choose", { HELP_ME_CHOOSE_ENABLED: "true" }, "rule/autofill", "any cards will do", undefined],
    ["friends see the wishlist with friends on (its own switch is retired)", { SOCIAL_FRIENDS_ENABLED: "true" }, "rule/friends-see", "Your wishlist is theirs to read too", undefined],
    ["friends see nothing with friends off", {}, "rule/friends-see", undefined, undefined],
    ["friends open decks", { SOCIAL_FRIENDS_ENABLED: "true" }, "rule/friends-see", "can open the decks", "names, status"],
    ["bracket marks are explained with the Analysis tab off, as they are drawn", {}, "decks/your-deck/bracket-marks", "Game Changers", undefined],
  ] as const)("%s", (_name, e, key, has, lacks) => {
    const text = textOf(e as Record<string, string>, key);
    if (has === undefined) {
      expect(text).toBeUndefined();
      return;
    }
    expect(text).toContain(has);
    if (lacks) expect(text).not.toContain(lacks);
  });
});

describe("Suggested changes v2 follows its own switch, and its parents'", () => {
  const V1 = "offers up to five cards to add and five to cut";
  const V2 = "asks how many cards to change and what you’re after";
  const OTHER_DECKS = "Include my other decks also offers cards your other decks hold";
  const REFUND = "A Suggested changes run that comes back short gives its credit back too";
  const TWO = "So does each Suggested changes run, or two for more than 10 changes.";
  const textOf = (e: Record<string, string>, key: string) =>
    units(visibleSections(env(e))).find((u) => u.key === key)?.text;
  const PARENTS = { ANALYSIS_TAB_ENABLED: "true", TUNING_ENABLED: "true" };

  it("draws v1's label and no refund sentence with v2 off and both parents on", () => {
    const label = textOf(PARENTS, "decks/analysis/suggested")!;
    expect(label).toContain(V1);
    expect(label).not.toContain(V2);
    expect(label).not.toContain(OTHER_DECKS);
    const credits = textOf(PARENTS, "rule/credits")!;
    expect(credits).toContain("So does each Suggested changes run.");
    expect(credits).not.toContain(TWO);
    expect(credits).not.toContain(REFUND);
  });

  it("draws v2's label and the refund sentence with v2 and both parents on", () => {
    const on = { ...PARENTS, SUGGESTED_CHANGES_V2_ENABLED: "true" };
    const label = textOf(on, "decks/analysis/suggested")!;
    expect(label).toContain(V2);
    expect(label).toContain(OTHER_DECKS);
    expect(label).not.toContain(V1);
    const credits = textOf(on, "rule/credits")!;
    expect(credits).toContain(REFUND);
    expect(credits).toContain(TWO);
    expect(credits).not.toContain("So does each Suggested changes run.");
  });

  it.each([
    ["Suggested changes off", { ANALYSIS_TAB_ENABLED: "true" }],
    ["the Analysis tab off", { TUNING_ENABLED: "true" }],
  ] as const)("drops the label and the refund sentence with v2 on and %s", (_name, parents) => {
    const e = { ...parents, SUGGESTED_CHANGES_V2_ENABLED: "true" };
    // The label rides TUNING_ENABLED, which needs the Analysis tab; v2 needs both, so neither form is drawn.
    expect(textOf(e, "decks/analysis/suggested")).toBeUndefined();
    const credits = textOf(e, "rule/credits")!;
    expect(credits).not.toContain(REFUND);
    expect(credits).not.toContain("Suggested changes");
  });
});

describe("Suggested changes v2's About errata (Small items 6, item 3)", () => {
  const PARENTS = { ANALYSIS_TAB_ENABLED: "true", TUNING_ENABLED: "true" };
  const analysis = (e: Record<string, string>) => visibleSections(env(e)).find((s) => s.id === "analysis")!;
  const creditRows = (e: Record<string, string>) =>
    analysis(e).rules.find((r) => r.key === "rule/credits")!.diagram!.columns
      .flatMap((c) => c.parts)
      .flatMap((p) => (p.part === "row" ? [p.name] : []));

  it("draws the pick card first in Good to know only with v2 on", () => {
    expect(analysis(PARENTS).rules.map((r) => r.key)).not.toContain("rule/pick");
    const on = analysis({ ...PARENTS, SUGGESTED_CHANGES_V2_ENABLED: "true" });
    expect(on.rules[0].key).toBe("rule/pick");
  });

  it("swaps the credits card's empty-handed row for the two v2 rows with v2 on", () => {
    expect(creditRows(PARENTS)).toEqual(["Read the bracket", "Suggested changes run", "Came back empty-handed"]);
    expect(creditRows({ ...PARENTS, SUGGESTED_CHANGES_V2_ENABLED: "true" }))
      .toEqual(["Read the bracket", "Suggested changes run", "Came back short or empty", "Short by your price cap"]);
  });

  it("keeps the shipped row when v2 is on but its parents are not", () => {
    expect(creditRows({ ANALYSIS_TAB_ENABLED: "true", SUGGESTED_CHANGES_V2_ENABLED: "true" })).toContain("Came back empty-handed");
  });

  it("announces the pick card as new when v2 turns on, to a reader who has seen everything else", () => {
    const pick = analysis({ ...PARENTS, SUGGESTED_CHANGES_V2_ENABLED: "true" }).rules[0];
    expect(unitSeen(pick, { version: 999, ids: [] })).toBe(false);
  });
});

describe("Show me", () => {
  /** A switch with every parent it needs, and nothing else on. */
  const withNeeds = (name: string): Record<string, string> => {
    const out: Record<string, string> = {};
    for (let n: string | undefined = name; n; n = (SWITCHES.find((s) => s.name === n) as { needs?: string } | undefined)?.needs) out[n] = "true";
    return out;
  };

  it.each(TOOLS.map((t) => [t.id, t] as const))("%s has a label the reader is drawn whenever the tool is on", (_id, t) => {
    const envs = [ALL_ON, env(t.switch ? withNeeds(t.switch) : {})];
    for (const e of envs) expect(showMeLabel(t.labels, visibleSections(e)), t.id).not.toBeNull();
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
      overrides: [{ switchName: "SWAP_TOOLS_ENABLED", scope: "app", groupId: null, userId: null, value: "on" }],
      groupOf: new Map(),
    };
    const reader = resolveEnv(OFF, snapshot, "u1");
    const visible = visibleSections(reader);
    const limit = units(visible).find((u) => u.key === "shopping/deck-shopping/limit");
    expect(limit).toBeDefined();
    expect(unitSeen(limit!, readerAt(16, reader))).toBe(true);
    expect(unitSeen(limit!, { version: limit!.since - 1, ids: ["anything"] })).toBe(false);
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
    const noSwitches = visibleSections(OFF);
    const replace = noSwitches.flatMap((s) => s.rules).find((r) => r.key === "rule/replace")!;
    expect(replace.text.startsWith("With Replace")).toBe(true);
    const help = noSwitches.flatMap((s) => s.labels).find((l) => l.key === "collection/cards/tabs")!;
    expect(help.text).toBe(" are your Collection’s tabs. History lists your changes from the last 90 days. Wishlist holds the cards you’re after.");
  });

  it("never lets the floor answer for a unit whose every source was switched", () => {
    const face = units(visibleSections(ALL_ON)).find((u) => u.key === "friends/friends/face")!;
    expect(unitSeen(face, { version: 16, ids: [] })).toBe(false);
    expect(unitSeen(face, { version: 16, ids: ["friends"] })).toBe(true);
  });

  it("announces a new unit's switched sentence when its switch turns on after a visit", () => {
    const base = ABOUT_SECTIONS.find((s) => s.id === "home")!;
    const section = { ...base, labels: [{ ...base.labels[0], id: "fresh", region: "home/home/fresh", rest: " a. b.", switch: null, sentences: { " b.": "PUSH_ENABLED" as const }, since: 16, legacy: [] }] };
    const off = visibleSections(OFF, [section]);
    const seen = { version: 16, ids: seenKeysOf(off, "home") };
    const on = visibleSections(env({ PUSH_ENABLED: "true" }), [section]);
    expect(unseenUnits(on, seen).map((u) => u.key)).toEqual([sentenceKey("home/home/fresh", "PUSH_ENABLED")]);
  });

  it("keeps a Help me choose acknowledgement when the fill rule's sentence turns on", () => {
    const hmcOn = env({ HELP_ME_CHOOSE_ENABLED: "true" });
    const told = (ids: string[]) => unseenUnits(visibleSections(hmcOn), { version: 16, ids }).map((u) => u.key);
    expect(told(["x"])).toContain(sentenceKey("rule/autofill", "HELP_ME_CHOOSE_ENABLED"));
    expect(told(["help-me-choose"])).not.toContain(sentenceKey("rule/autofill", "HELP_ME_CHOOSE_ENABLED"));
  });

  it("lets the floor answer for a switched sentence only where it was a switched line of an unswitched entry", () => {
    // Each was a \`captionLineSwitches\` line of the unswitched entry named, shown with it and seen by the floor.
    const floorSeen = new Set([
      "decks/games/log@TUNING_ENABLED", // log-a-game: "reads your games the next time it runs"
      "rule/credits@ANALYSIS_TAB_ENABLED", "rule/credits@TUNING_ENABLED", "rule/credits@PROPOSED_CUTS_ENABLED", // credits
      // Suggested changes v2's rewrite of a unit the reader already met: no legacy entry carries its switch, so the floor
      // answers and the rewrite is not told as New (About ruling 6: a label is announced only at Hugh's discretion).
      "decks/analysis/suggested@SUGGESTED_CHANGES_V2_ENABLED", "rule/credits@SUGGESTED_CHANGES_V2_ENABLED",
    ]);
    const switchOf = new Map(aboutEntries.map((e) => [e.id, e.switch ?? null]));
    const units2 = [
      ...ABOUT_SECTIONS.flatMap((s) => s.labels.map((l) => [`${s.area}/${s.id}/${l.id}`, l] as const)),
      ...Object.entries(ABOUT_RULES).map(([k, r]) => [`rule/${k}`, r] as const),
    ];
    for (const [key, u] of units2) for (const sw of Object.values(u.sentences ?? {})) {
      for (const one of (Array.isArray(sw) ? sw : [sw]) as string[]) {
        if (one.startsWith("!")) continue;
        const carried = u.legacy.some((id) => id.endsWith(`@${one}`) || switchOf.get(id) === one);
        if (!carried) expect(floorSeen, `${key}@${one}`).toContain(`${key}@${one}`);
      }
    }
  });

  it("announces a new switched label when its switch turns on, whatever the floor", () => {
    const fresh = { key: "x/y/z", since: 16, legacy: [] as string[], switch: "PUSH_ENABLED" as const };
    expect(unitSeen(fresh, { version: 16, ids: ["a"] })).toBe(false);
    expect(unitSeen({ ...fresh, switch: null }, { version: 16, ids: ["a"] })).toBe(true);
  });

  it("introduces a first-run reader on their first visit, then announces only what arrives later", () => {
    const visible = visibleSections(ALL_ON);
    const after = afterVisit(visible, "home", NEVER_SEEN);
    expect(after.version).toBe(16);
    expect(unseenUnits(visible, after)).toEqual([]);
    const later = visibleSections(ALL_ON, ABOUT_SECTIONS.map((s) => s.id !== "home" ? s : {
      ...s, labels: [...s.labels, { ...s.labels[0], id: "later", region: "home/home/later", since: 17, legacy: [] }],
    }));
    expect(unseenUnits(later, after).map((u) => u.key)).toEqual(["home/home/later"]);
    const returning: SeenState = { version: 9, ids: ["x"] };
    expect(afterVisit(visible, "home", returning).version).toBe(9);
  });

  it("acknowledging an announcement leaves nothing of it to announce next", () => {
    const visible = visibleSections(ALL_ON);
    let seen: SeenState = { version: 16, ids: ["placeholder"] };
    const first = unseenUnits(visible, seen);
    const spare = first.find((u) => u.key === "shopping/deck-shopping/spare")!;
    expect(spare.ack).toEqual(["shopping/deck-shopping/spare", sentenceKey("shopping/deck-shopping/spare", "SPARE_REQUESTS_ENABLED")]);
    seen = { version: 16, ids: [...seen.ids, ...first.flatMap((u) => u.ack)] };
    expect(unseenUnits(visible, seen)).toEqual([]);
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

describe("a section's sub-line", () => {
  const sub = (e: NodeJS.ProcessEnv, id: string) => visibleSections(e).find((s) => s.id === id)!.sub;
  const off = (...names: string[]) => env({ ...(ALL_ON as Record<string, string>), ...Object.fromEntries(names.map((n) => [n, "off"])) });
  const named = (sw: AboutLineSwitch | null | undefined): string[] =>
    sw == null ? [] : (Array.isArray(sw) ? sw : [sw]).map((one: string) => one.replace(/^!/, ""));
  const positive = (sw: AboutLineSwitch): string[] => (Array.isArray(sw) ? sw : [sw]).filter((one: string) => !one.startsWith("!"));
  /** Every switch a section's words or units hang on: its sub's sentences, its labels and their sentences, its rules. */
  const switchesOfSection = (sec: AboutSection): string[] => [...new Set([
    ...Object.values(sec.subSentences ?? {}).flatMap(named),
    ...sec.labels.flatMap((l) => [...named(l.switch), ...Object.values(l.sentences ?? {}).flatMap(named)]),
    ...sec.rules.flatMap((id) => [...named(ABOUT_RULES[id].switch), ...Object.values(ABOUT_RULES[id].sentences ?? {}).flatMap(named)]),
  ])];
  const sentencesOf = (text: string) => text.split(/(?<=[.?])\s+/).filter(Boolean);

  it("draws one or two sentences under every combination of the switches its sentences name (Small items 3, item 4)", () => {
    for (const sec of ABOUT_SECTIONS) {
      const names = [...new Set(Object.values(sec.subSentences ?? {}).flatMap(named))];
      for (let mask = 0; mask < 2 ** names.length; mask++) {
        const e = off(...names.filter((_, i) => mask & (1 << i)));
        const n = sentencesOf(sub(e, sec.id)).length;
        expect(n, `${sec.id} ${mask}`).toBeGreaterThanOrEqual(1);
        expect(n, `${sec.id} ${mask}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("names no feature whose switch is off: a section emptied of labels by a switch says only that its screen is off", () => {
    for (const sec of ABOUT_SECTIONS) {
      // With every switch on, every screen is on, and no sub says otherwise.
      expect(sub(ALL_ON, sec.id), sec.id).not.toContain(ABOUT_SCREEN_OFF.trim());
      // A retired switch is gone from the registry and always on: there is no off state to assert.
      for (const sw of switchesOfSection(sec).filter((n) => (SWITCH_NAMES as readonly string[]).includes(n))) {
        const e = off(sw);
        const drawn = visibleSections(e).find((s) => s.id === sec.id)!;
        const text = sub(e, sec.id);
        // No sentence gated on the switch survives it.
        for (const [sentence, gate] of Object.entries(sec.subSentences ?? {})) {
          if (gate && positive(gate).includes(sw)) expect(text, `${sec.id} ${sw}`).not.toContain(sentence.trim());
        }
        // A screen with nothing left to label is off: its sub describes none of it.
        if (drawn.labels.length === 0) expect(text, `${sec.id} ${sw}`).toBe(ABOUT_SCREEN_OFF.trim());
      }
    }
  });

  it("describes each screen while its switch is on, and only says it is off while it is off", () => {
    const cases: [string, string, string][] = [
      ["analysis", "ANALYSIS_TAB_ENABLED", "bracket"],
      ["stats", "DECK_STATS_ENABLED", "charts"],
      ["all-decks", "ALL_DECKS_CART_ENABLED", "one cart"],
      ["friends", "SOCIAL_FRIENDS_ENABLED", "pods"],
    ];
    for (const [id, sw, phrase] of cases) {
      expect(sub(ALL_ON, id), id).toContain(phrase);
      expect(sub(ALL_ON, id), id).not.toContain(ABOUT_SCREEN_OFF.trim());
      expect(sub(off(sw), id), id).toBe(ABOUT_SCREEN_OFF.trim());
    }
  });

  it("names Analysis's tuning tools only while all three are on, and keeps the bracket while they are off", () => {
    expect(sub(ALL_ON, "analysis")).toBe("Which bracket your deck sits in, and why. Suggested changes, Proposed cuts and Mana Balance help you tune it.");
    for (const sw of ["TUNING_ENABLED", "PROPOSED_CUTS_ENABLED", "MANA_BALANCE_ENABLED"]) {
      expect(sub(off(sw), "analysis"), sw).toBe("Which bracket your deck sits in, and why.");
    }
  });

  it("cuts a sentence naming a switched feature while that switch is off, and keeps the rest (Small items 3, item 4)", () => {
    expect(sub(ALL_ON, "stats")).toContain("curve by card type");
    const noStats = env({ ...(ALL_ON as Record<string, string>), DECK_STATS_ENABLED: "off" });
    expect(sub(noStats, "stats")).toBe(ABOUT_SCREEN_OFF.trim());
    // Collection editing is retired: its sentence always draws.
    expect(sub(OFF, "cards")).toBe("Everything you own, card by card, and which copies your decks are holding. Add cards by name or scan them in.");
    // Ready to build is gone (the feed is always on).
    expect(sub(ALL_ON, "home")).not.toContain("best-fit commanders");
    // Only a spare request ever waits on you, so the sentence saying what comes first hangs on spare requests too, which
    // follow friends now their own switch is retired.
    expect(sub(ALL_ON, "whats-new")).toContain("Within Today and Earlier, anything waiting on you comes first.");
    expect(sub(env({ ...(ALL_ON as Record<string, string>), SOCIAL_FRIENDS_ENABLED: "off" }), "whats-new")).not.toContain("waiting on you");
  });
});

describe("resolveDiagram", () => {
  const parts = (d: ReturnType<typeof resolveDiagram>) =>
    [...(d.head ? diagramColumn(d.head).parts : []), ...d.columns.flatMap((c) => c.parts), ...(d.foot ? diagramColumn(d.foot).parts : [])];
  const rule = (e: NodeJS.ProcessEnv, id: string) => visibleSections(e).flatMap((s) => s.rules).find((r) => r.key === ruleKey(id as never))!;

  it("drops a part, a chip and an emptied column whose switch is off, as a sentence is cut", () => {
    const off = env({ ...(ALL_ON as Record<string, string>), PROPOSED_CUTS_ENABLED: "off" });
    const names = (d: ReturnType<typeof resolveDiagram>) =>
      parts(d).flatMap((p) => (p.part === "row" ? [p.name] : p.part === "caption" ? [p.text] : p.part === "chips" ? p.chips.map((c) => c.text) : []));
    // A retired switch's parts draw whatever the env says (the tokens switch is gone).
    expect(names(rule(off, "proxy").diagram!)).toContain("Treasure token");
    expect(rule(off, "proxy").diagram!.foot).not.toEqual([]);
    // A full-column foot keeps its column, its switched parts cut from it.
    const hidden = rule(ALL_ON, "hidden-deck").diagram!.foot;
    expect(hidden && "parts" in hidden ? hidden.w : null).toBe(250);
    expect(names(rule(ALL_ON, "credits").diagram!)).toContain("Look deeper");
    expect(names(rule(off, "credits").diagram!)).not.toContain("Look deeper");
    // The wishlist's switch is retired: its chip draws whatever the env says.
    expect(names(rule(env({ ...(ALL_ON as Record<string, string>), SOCIAL_WISHLIST_ENABLED: "off" }), "friends-see").diagram!)).toContain("Wishlist");
    const emptied = resolveDiagram(
      { kind: "card-row", columns: [{ parts: [{ part: "row", name: "a", switch: "PROPOSED_CUTS_ENABLED" }] }, { parts: [{ part: "row", name: "b" }] }] },
      off,
    );
    expect(emptied.columns).toHaveLength(1);
  });

  it("keeps a negated part only while its live switch is off", () => {
    const off = env({ ...(ALL_ON as Record<string, string>), PROPOSED_CUTS_ENABLED: "off" });
    const negated = (e: NodeJS.ProcessEnv) => resolveDiagram(
      { kind: "card-row", columns: [{ parts: [{ part: "row", name: "a", switch: "!PROPOSED_CUTS_ENABLED" }, { part: "row", name: "b", switch: "PROPOSED_CUTS_ENABLED" }] }] },
      e,
    ).columns.flatMap((c) => c.parts).flatMap((p) => (p.part === "row" ? [p.name] : []));
    expect(negated(off)).toEqual(["a"]);
    expect(negated(ALL_ON)).toEqual(["b"]);
  });

  it("never draws a negated part of a retired switch", () => {
    const captions = (e: NodeJS.ProcessEnv) => parts(rule(e, "replace").diagram!).flatMap((p) => (p.part === "caption" ? [p.text] : []));
    for (const e of [OFF, ALL_ON]) {
      expect(captions(e)).toContain("Your Collection, then Replace");
      expect(captions(e)).not.toContain("Your Collection, then an upload");
    }
  });
});

// Review rounds 6 and 7: every About write answers from the state it leaves the reader at.
describe("heldAnswer", () => {
  const visible = visibleSections(ALL_ON);
  const [shopping] = seenKeysOf(visible, "shopping");
  const [decks] = seenKeysOf(visible, "decks");

  it("answers a no-write visit with every key the stored state covers, another page's included", () => {
    const seen: SeenState = { version: 1, ids: [shopping] };
    const answer = heldAnswer(visible, seen, null);
    expect(answer).toContain(shopping);
    expect(answer).toEqual(expect.arrayContaining(answeredKeys(visible, seen)));
  });

  it("answers a write with the merged state: held ids, written ids, and the keys the raised floor covers", () => {
    const seen: SeenState = { version: 1, ids: [shopping] };
    const write: SeenState = { version: 9, ids: [decks] };
    const after: SeenState = { version: 9, ids: [shopping, decks] };
    const answer = heldAnswer(visible, seen, write);
    expect(answer).toEqual(expect.arrayContaining([shopping, decks, ...answeredKeys(visible, after)]));
  });

  it("answers nothing for a first-run reader nothing was written for", () => {
    expect(heldAnswer(visible, NEVER_SEEN, null)).toEqual([]);
  });
});
