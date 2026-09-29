import { describe, expect, it } from "vitest";
import { ABOUT_VERSION, aboutEntries, type AboutEntry } from "../copy/about";
import { sheetCookieValue, sheetDecision } from "./gate";
import { readSheetState } from "./sheet-state";
import { isSeen, switchedIds, unseenEntries, visibleEntries, type SeenState } from "./visible";

const ON = { NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true", HELP_ME_CHOOSE_ENABLED: "true", SWAP_TOOLS_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const OFF = {} as unknown as NodeJS.ProcessEnv;

/** Two switched entries, a and b, beside one plain one, shaped like the launch entries. */
const plain: AboutEntry = { ...aboutEntries[0], id: "plain", since: 3 };
const a: AboutEntry = { ...aboutEntries[0], id: "a", since: 10, switch: "NEVER_CUT_ENABLED" };
const b: AboutEntry = { ...aboutEntries[0], id: "b", since: 10, switch: "CHANGE_COMMANDER_ENABLED" };
const catalog = [plain, a, b];
const seen = (version: number, ids: string[] = []): SeenState => ({ version, ids });

describe("with every switch off, nothing changes (the invariance Hugh's ruling requires)", () => {
  // The entries a switch cannot hide. With every switch off they are the whole page, and the page
  // must behave exactly as the single-version model did over them.
  const unswitched = aboutEntries.filter((e) => !e.switch);
  // TODAY's rules, stated as the spec this model must reproduce: the proxy shows the sheet
  // below the version, the sheet lists `since > seen`, and the cookie is `<user>.<version>`.
  const legacy = (s: number) =>
    s === 0
      ? { kind: "firstRun" as const }
      : s >= ABOUT_VERSION
        ? { kind: "none" as const }
        : {
            kind: "behind" as const,
            entries: unswitched.filter((e) => e.since > s).map((e) => ({ id: e.id, title: e.title })),
          };

  it("ties exactly the launch entries to their switches, and the version to the rest", () => {
    expect(aboutEntries.filter((e) => e.switch).map((e) => [e.id, e.switch])).toEqual([
      ["help-me-choose", "HELP_ME_CHOOSE_ENABLED"],
      ["deck-analysis", "ANALYSIS_TAB_ENABLED"],
      ["card-marks", "ANALYSIS_TAB_ENABLED"],
      ["locked-cards", "NEVER_CUT_ENABLED"],
      ["fits-your-decks", "SWAP_TOOLS_ENABLED"],
      ["stand-ins", "SWAP_TOOLS_ENABLED"],
      ["change-commander", "CHANGE_COMMANDER_ENABLED"],
    ]);
    expect(Math.max(...unswitched.map((e) => e.since))).toBe(ABOUT_VERSION);
  });

  it("draws every unswitched entry with the switches off, and every entry with them on", () => {
    expect(visibleEntries(OFF)).toEqual(unswitched);
    expect(visibleEntries(ON)).toEqual(aboutEntries);
  });

  it("makes the same proxy decision, sheet and cookie as before at every seen", () => {
    for (let s = 0; s <= ABOUT_VERSION + 2; s++) {
      const d = sheetDecision({ userId: "u", seen: seen(s), visible: visibleEntries(OFF) });
      expect(d.cookie).toBe(`u.${ABOUT_VERSION}`);
      const state = d.show ? readSheetState(new Headers({ "x-about-sheet": d.header })) : { kind: "none" };
      expect(state, `seen ${s}`).toEqual(legacy(s));
    }
  });

  it("marks the same entries new as the version rule did", () => {
    for (let s = 1; s <= ABOUT_VERSION; s++) {
      const now = unseenEntries(visibleEntries(OFF), seen(s)).map((e) => e.id);
      const before = unswitched.filter((e) => e.since > s).map((e) => e.id);
      expect(now, `seen ${s}`).toEqual(before);
    }
  });
});

describe("an entry tied to a switch", () => {
  it("draws only while its switch is on", () => {
    expect(visibleEntries(OFF, catalog)).toEqual([plain]);
    expect(visibleEntries({ NEVER_CUT_ENABLED: "true" } as unknown as NodeJS.ProcessEnv, catalog)).toEqual([plain, a]);
    // The feature's own flag rule: anything but the exact string 'true' is off.
    expect(visibleEntries({ NEVER_CUT_ENABLED: "1" } as unknown as NodeJS.ProcessEnv, catalog)).toEqual([plain]);
  });

  it("reads unseen for a returning reader at the current version, in the shipped catalog", () => {
    // The shipped launch entries carry `since` equal to ABOUT_VERSION, which every returning
    // reader has reached. Were the version floor applied to them, a flip would announce nothing.
    const launch = aboutEntries.filter((e) => e.switch);
    expect(launch.map((e) => e.since)).toEqual(launch.map(() => ABOUT_VERSION));
    expect(unseenEntries(visibleEntries(ON), seen(ABOUT_VERSION)).map((e) => e.id)).toEqual([
      "help-me-choose",
      "deck-analysis",
      "card-marks",
      "locked-cards",
      "fits-your-decks",
      "stand-ins",
      "change-commander",
    ]);
  });

  it("is seen by its id, never by the version", () => {
    expect(isSeen(a, seen(99))).toBe(false);
    expect(isSeen(a, seen(0, ["a"]))).toBe(true);
    expect(isSeen(plain, seen(3))).toBe(true);
  });

  it("reads unseen when switched on after another was switched on and read (out of order)", () => {
    // Switch B on, and the reader visits: the visit records the switched ids it drew.
    const bOn = visibleEntries({ CHANGE_COMMANDER_ENABLED: "true" } as unknown as NodeJS.ProcessEnv, catalog);
    const afterVisit = seen(9, switchedIds(bOn));
    expect(unseenEntries(bOn, afterVisit)).toEqual([]);
    // Now switch A on. A version number would say the reader is current; A is still new.
    const both = visibleEntries(ON, catalog);
    expect(unseenEntries(both, afterVisit).map((e) => e.id)).toEqual(["a"]);
    const d = sheetDecision({ userId: "u", seen: afterVisit, visible: both, version: 9 });
    expect(d).toEqual({ show: true, header: "a", cookie: "u.9+a+b" });
  });

  it("retires the sheet cookie when a switch flips, so the proxy decides again", () => {
    const bOnly = visibleEntries({ CHANGE_COMMANDER_ENABLED: "true" } as unknown as NodeJS.ProcessEnv, catalog);
    expect(sheetCookieValue("u", visibleEntries(OFF, catalog), 9)).toBe("u.9");
    expect(sheetCookieValue("u", bOnly, 9)).toBe("u.9+b");
    expect(sheetCookieValue("u", visibleEntries(ON, catalog), 9)).toBe("u.9+a+b");
  });

  it("still introduces the page to a brand-new account rather than listing it", () => {
    expect(unseenEntries(visibleEntries(ON, catalog), seen(0))).toEqual([]);
    expect(sheetDecision({ userId: "u", seen: seen(0), visible: visibleEntries(ON, catalog), version: 9 }).show).toBe(true);
  });
});

describe("HOW_IT_WORKS_ENABLED", () => {
  // No entry follows it yet (PR C adds the sheet line), so the map is proved with an entry
  // built for the purpose: it draws exactly when the switch reads the string 'true'.
  const how: AboutEntry = { ...aboutEntries[0], id: "how-it-works", since: 10, switch: "HOW_IT_WORKS_ENABLED" };
  const env = (v?: string) => (v === undefined ? {} : { HOW_IT_WORKS_ENABLED: v }) as unknown as NodeJS.ProcessEnv;

  it("draws an entry tied to it only while it is on", () => {
    expect(visibleEntries(env("true"), [how])).toEqual([how]);
    expect(visibleEntries(env("1"), [how])).toEqual([]);
    expect(visibleEntries(env(), [how])).toEqual([]);
  });
});
