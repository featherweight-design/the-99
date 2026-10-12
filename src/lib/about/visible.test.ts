import { describe, expect, it } from "vitest";
import { ABOUT_VERSION, aboutEntries, type AboutEntry } from "../copy/about";
import { sheetCookieValue, sheetDecision } from "./gate";
import { readSheetState } from "./sheet-state";
import { isSeen, resolveEntry, switchedIds, unseenEntries, visibleEntries, type SeenState } from "./visible";

// TUNING_ENABLED also requires ANALYSIS_TAB_ENABLED (`tuningEnabled()`), already "true" here.
const ON = { NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true", HELP_ME_CHOOSE_ENABLED: "true", SWAP_TOOLS_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true", TUNING_ENABLED: "true", DECK_STATS_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true", DECK_BENCHMARKS_ENABLED: "true", SHOPPING_MARK_BOUGHT_ENABLED: "true", DECK_PRINTINGS_ENABLED: "true", MANA_BALANCE_ENABLED: "true", ALL_DECKS_CART_ENABLED: "true", PRECONS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const OFF = {} as unknown as NodeJS.ProcessEnv;

/** Two switched entries, a and b, beside one plain one, shaped like the launch entries. */
const plain: AboutEntry = { ...aboutEntries[0], id: "plain", since: 3 };
const a: AboutEntry = { ...aboutEntries[0], id: "a", since: 10, switch: "NEVER_CUT_ENABLED" };
const b: AboutEntry = { ...aboutEntries[0], id: "b", since: 10, switch: "CHANGE_COMMANDER_ENABLED" };
const catalog = [plain, a, b];
const seen = (version: number, ids: string[] = []): SeenState => ({ version, ids });

describe("all-decks-cart's press line", () => {
  it("drops the buy key while I got it is off, so the entry never promises an inert tag", () => {
    const cartOnly = visibleEntries({ ALL_DECKS_CART_ENABLED: "true" } as unknown as NodeJS.ProcessEnv).find((e) => e.id === "all-decks-cart")!;
    const withBuy = visibleEntries({ ALL_DECKS_CART_ENABLED: "true", SHOPPING_MARK_BOUGHT_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true" } as unknown as NodeJS.ProcessEnv).find((e) => e.id === "all-decks-cart")!;
    expect(cartOnly.keys).toHaveLength(3);
    expect(withBuy.keys).toHaveLength(4);
    expect(withBuy.keys[3]).toMatch(/press “buy”/);
  });
});

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
  // Version 12 added only switched entries, so a reader at 11 with every switch off has nothing
  // unseen: the sheet has nothing to name and does not draw.
  const expected = (s: number) => {
    const l = legacy(s);
    return l.kind === "behind" && l.entries.length === 0 ? { kind: "none" as const } : l;
  };

  it("ties exactly the launch entries to their switches, and the version to the rest", () => {
    expect(aboutEntries.filter((e) => e.switch).map((e) => [e.id, e.switch])).toEqual([
      ["collection-add", "COLLECTION_EDIT_ENABLED"],
      ["upload-choice", "COLLECTION_EDIT_ENABLED"],
      ["all-decks-cart", "ALL_DECKS_CART_ENABLED"],
      ["edit-copies", "COLLECTION_EDIT_ENABLED"],
      ["remove-card", "COLLECTION_EDIT_ENABLED"],
      ["collection-history", "COLLECTION_EDIT_ENABLED"],
      ["help-me-choose", "HELP_ME_CHOOSE_ENABLED"],
      ["deck-analysis", "ANALYSIS_TAB_ENABLED"],
      ["deck-benchmarks", "DECK_BENCHMARKS_ENABLED"],
      ["card-marks", "ANALYSIS_TAB_ENABLED"],
      ["locked-cards", "NEVER_CUT_ENABLED"],
      ["fits-your-decks", "SWAP_TOOLS_ENABLED"],
      ["stand-ins", "SWAP_TOOLS_ENABLED"],
      ["shopping-got-it", "SHOPPING_MARK_BOUGHT_ENABLED"],
      ["precons", "PRECONS_ENABLED"],
      ["change-commander", "CHANGE_COMMANDER_ENABLED"],
      ["deck-printings", "DECK_PRINTINGS_ENABLED"],
      ["suggested-changes", "TUNING_ENABLED"],
      ["mana-balance", "MANA_BALANCE_ENABLED"],
      ["deck-stats", "DECK_STATS_ENABLED"],
    ]);
    // Versions 12 (collection edit), 13 (evidence benchmarks) and 14 (deck printings and I got it)
    // added only switched entries, so
    // the newest UNSWITCHED entry is still 11's: a version no unswitched entry carries moves the cookie and nothing else. Pinned
    // exactly, so an unswitched entry added (or since moved) without a deliberate edit here fails.
    expect(Math.max(...unswitched.map((e) => e.since))).toBe(11);
    expect(ABOUT_VERSION).toBeGreaterThanOrEqual(11);
  });

  it("draws every unswitched entry with the switches off, and every entry with them on", () => {
    // `credits` and `deck-analysis` carry a line gated by `TUNING_ENABLED` alone (2026-10-08),
    // on top of (or with no) entry-level switch — resolved the same way `visibleEntries` itself
    // resolves it, rather than hand-duplicating the string surgery here.
    expect(visibleEntries(OFF)).toEqual(unswitched.map((e) => resolveEntry(e, OFF)));
    expect(visibleEntries(ON)).toEqual(aboutEntries.map((e) => resolveEntry(e, ON)));
  });

  it("makes the same proxy decision, sheet and cookie as before at every seen", () => {
    for (let s = 0; s <= ABOUT_VERSION + 2; s++) {
      const d = sheetDecision({ userId: "u", seen: seen(s), visible: visibleEntries(OFF) });
      expect(d.cookie).toBe(`u.${ABOUT_VERSION}`);
      const state = d.show ? readSheetState(new Headers({ "x-about-sheet": d.header })) : { kind: "none" };
      expect(state, `seen ${s}`).toEqual(expected(s));
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
    // The ORIGINAL launch entries all carry `since: 9`, the version active when the switch
    // convention was adopted (Hugh, 2026-09-25) — a fixed historical stamp, not a live tracker
    // of ABOUT_VERSION. `suggested-changes` (2026-10-08, picking up its own TUNING_ENABLED) is
    // the one exception, since: 10 — `isSeen` ignores `since` entirely for a switch-tied entry,
    // so neither stamp can make one of them unseen again.
    const launch = aboutEntries.filter((e) => e.switch && e.switch !== "COLLECTION_EDIT_ENABLED");
    // `deck-stats` (2026-10-10) is the other: since: 11, the current version, with no bump of its own.
    // `deck-benchmarks` (2026-10-10) is since: 13, the evidence line's one bump, and
    // `shopping-got-it` and `deck-printings` (2026-10-11) since: 14, the collection home epic's, and
    // `mana-balance`, `all-decks-cart` and `precons` since: 14 too, the current version, with no bump
    // of their own.
    const later = ["suggested-changes", "deck-stats", "deck-benchmarks", "shopping-got-it", "deck-printings", "mana-balance", "all-decks-cart", "precons"];
    const [suggestedChanges, deckStats, deckBenchmarks, gotIt, deckPrintings, manaBalance, cart, precons] = later.map((id) => launch.filter((e) => e.id === id));
    const originalLaunch = launch.filter((e) => !later.includes(e.id));
    expect(originalLaunch.map((e) => e.since)).toEqual(originalLaunch.map(() => 9));
    expect(suggestedChanges.map((e) => e.since)).toEqual([10]);
    expect(deckStats.map((e) => e.since)).toEqual([11]);
    expect(deckBenchmarks.map((e) => e.since)).toEqual([13]);
    expect([...gotIt, ...deckPrintings, ...manaBalance, ...cart, ...precons].map((e) => e.since)).toEqual([14, 14, 14, 14, 14]);
    expect(unseenEntries(visibleEntries(ON), seen(ABOUT_VERSION)).map((e) => e.id)).toEqual([
      "collection-add",
      "upload-choice",
      "all-decks-cart",
      "edit-copies",
      "remove-card",
      "collection-history",
      "help-me-choose",
      "deck-analysis",
      "deck-benchmarks",
      "card-marks",
      "locked-cards",
      "fits-your-decks",
      "stand-ins",
      "shopping-got-it",
      "precons",
      "change-commander",
      "deck-printings",
      "suggested-changes",
      "mana-balance",
      "deck-stats",
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

describe("TUNING_ENABLED, and the two lines it gates without an entry switch of their own", () => {
  const anEntry: AboutEntry = {
    ...aboutEntries[0],
    id: "entry",
    since: 3,
    caption: "Before.\n\n- Keep\n- Drop this\n\nAfter.",
    captionLineSwitches: { "- Drop this": "TUNING_ENABLED" },
    keys: ["Keep this key", "Drop this key"],
    keySwitches: { "Drop this key": "TUNING_ENABLED" },
  };

  it("drops the gated line and key with the switch off, keeping the rest of the entry", () => {
    const [resolved] = visibleEntries({} as unknown as NodeJS.ProcessEnv, [anEntry]);
    expect(resolved.caption).toBe("Before.\n\n- Keep\n\nAfter.");
    expect(resolved.keys).toEqual(["Keep this key"]);
  });

  it("keeps every line with the switch on", () => {
    const [resolved] = visibleEntries({ TUNING_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true" } as unknown as NodeJS.ProcessEnv, [anEntry]);
    expect(resolved).toEqual(anEntry);
  });

  it("draws the real deck-analysis and credits entries with Tuning off, Analysis on", () => {
    const env = { ANALYSIS_TAB_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    const visible = visibleEntries(env);
    const deckAnalysis = visible.find((e) => e.id === "deck-analysis")!;
    expect(deckAnalysis.keys).toHaveLength(3);
    expect(deckAnalysis.keys.join(" ")).not.toContain("Suggested changes");
    const credits = visible.find((e) => e.id === "credits")!;
    expect(credits.caption).not.toContain("Suggested changes");
    expect(credits.caption).toContain("Writing a deck’s Overview");
    // The entry itself is still gone: `TUNING_ENABLED` is off.
    expect(visible.find((e) => e.id === "suggested-changes")).toBeUndefined();
  });

  it("draws every line with both Analysis and Tuning on", () => {
    const env = { ANALYSIS_TAB_ENABLED: "true", TUNING_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    const visible = visibleEntries(env);
    expect(visible.find((e) => e.id === "deck-analysis")!.keys).toHaveLength(4);
    expect(visible.find((e) => e.id === "credits")!.caption).toContain("Suggested changes");
    expect(visible.find((e) => e.id === "suggested-changes")).toBeDefined();
  });
});

// The switched lines are matched by their exact text, so an edit to the copy that changes one of
// them would leave the line showing with its switch off and nothing failing. Every switched line
// has to name text the entry actually carries.
describe("every switched line names text its entry carries", () => {
  it.each(aboutEntries.filter((e) => e.captionLineSwitches || e.keySwitches).map((e) => [e.id, e] as const))(
    "%s",
    (_id, entry) => {
      for (const line of Object.keys(entry.captionLineSwitches ?? {})) expect(entry.caption).toContain(line);
      for (const key of Object.keys(entry.keySwitches ?? {})) expect(entry.keys).toContain(key);
    },
  );
});

describe("a negated line switch, and `import`'s two warnings (collection edit)", () => {
  const imp = aboutEntries.find((e) => e.id === "import")!;
  const REPLACES = "Heads up: an import replaces your whole Collection, it doesn't add to it.";
  const ASKS = "Already have a Collection here? The 99 asks whether the file replaces it or adds to it.";
  const env = (v?: string) => (v === undefined ? {} : { COLLECTION_EDIT_ENABLED: v }) as unknown as NodeJS.ProcessEnv;

  it("shows the replace warning alone with the switch off, exactly as before the switch existed", () => {
    const resolved = resolveEntry(imp, env());
    expect(resolved.caption).toContain(REPLACES);
    expect(resolved.caption).not.toContain(ASKS);
    expect(resolved.caption.endsWith(REPLACES)).toBe(true);
  });

  it("swaps it for the question with the switch on, leaving no blank line behind", () => {
    const resolved = resolveEntry(imp, env("true"));
    expect(resolved.caption).not.toContain(REPLACES);
    expect(resolved.caption.endsWith(`\n\n${ASKS}`)).toBe(true);
  });

  it("reads anything but the exact string 'true' as off", () => {
    expect(resolveEntry(imp, env("1")).caption).toContain(REPLACES);
  });

  it("keeps a `!` key while its switch is off and drops it while on", () => {
    const e: AboutEntry = { ...aboutEntries[0], id: "neg", since: 3, keys: ["Old", "New"], keySwitches: { Old: "!COLLECTION_EDIT_ENABLED", New: "COLLECTION_EDIT_ENABLED" } };
    expect(resolveEntry(e, env()).keys).toEqual(["Old"]);
    expect(resolveEntry(e, env("true")).keys).toEqual(["New"]);
  });
});

describe("deck-benchmarks follows DECK_BENCHMARKS_ENABLED", () => {
  const ids = (env: Record<string, string>) => visibleEntries(env as unknown as NodeJS.ProcessEnv).map((e) => e.id);

  it("is hidden while the switch is off, and drawn after deck-analysis once it is on", () => {
    expect(ids({ ANALYSIS_TAB_ENABLED: "true" })).not.toContain("deck-benchmarks");
    const on = ids({ ANALYSIS_TAB_ENABLED: "true", DECK_BENCHMARKS_ENABLED: "true" });
    expect(on[on.indexOf("deck-analysis") + 1]).toBe("deck-benchmarks");
    // The feature's own flag rule: anything but the exact string 'true' is off.
    expect(ids({ DECK_BENCHMARKS_ENABLED: "1" })).not.toContain("deck-benchmarks");
    // The block lives on the Analysis tab: with the tab off, the entry would describe nothing.
    expect(ids({ DECK_BENCHMARKS_ENABLED: "true" })).not.toContain("deck-benchmarks");
  });

  it("is the evidence line's one bump", () => {
    const entry = aboutEntries.find((e) => e.id === "deck-benchmarks")!;
    expect(entry.since).toBe(13);
    expect(entry.chapter).toBe("03");
    expect(entry.width).toBe("plate");
  });
});

describe("the collection home epic's two entries (one bump, 14)", () => {
  const ids = (env: Record<string, string>) => visibleEntries(env as unknown as NodeJS.ProcessEnv).map((e) => e.id);

  it("draws I got it only with both of its switches, after stand-ins", () => {
    // `shoppingMarkBoughtEnabled` is the AND of the two: the tag does nothing without the ledger.
    expect(ids({ SHOPPING_MARK_BOUGHT_ENABLED: "true" })).not.toContain("shopping-got-it");
    expect(ids({ COLLECTION_EDIT_ENABLED: "true" })).not.toContain("shopping-got-it");
    const on = ids({ SHOPPING_MARK_BOUGHT_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true", SWAP_TOOLS_ENABLED: "true" });
    expect(on[on.indexOf("stand-ins") + 1]).toBe("shopping-got-it");
  });

  it("draws the precons entry on its own switch, after starting a new deck", () => {
    expect(ids({})).not.toContain("precons");
    const on = ids({ PRECONS_ENABLED: "true" });
    expect(on[on.indexOf("new-deck") + 1]).toBe("precons");
  });

  it("draws Deck printings on its own switch, after export", () => {
    expect(ids({})).not.toContain("deck-printings");
    const on = ids({ DECK_PRINTINGS_ENABLED: "true" });
    expect(on[on.indexOf("export") + 1]).toBe("deck-printings");
  });

  it("is one bump: both at the current version, so the sheet counts its own two", () => {
    for (const id of ["shopping-got-it", "deck-printings"]) {
      const entry = aboutEntries.find((e) => e.id === id)!;
      expect(entry.since, id).toBe(ABOUT_VERSION);
      expect(entry.chapter, id).toBe("03");
      expect(entry.width, id).toBe("plate");
    }
    expect(ABOUT_VERSION).toBe(14);
  });
});

describe("Help me choose's read (rework plan PR 5: the entry rewritten, no bump)", () => {
  // A reader one version behind who never met the entry: production, where the switch is off.
  const behind = seen(ABOUT_VERSION - 1);

  it("shows a reader one version behind no sheet while the switch is off", () => {
    expect(unseenEntries(visibleEntries({} as NodeJS.ProcessEnv), behind)).toEqual([]);
  });

  it("shows exactly the Help me choose entry once the switch is on, never an empty sheet", () => {
    const on = { HELP_ME_CHOOSE_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    expect(unseenEntries(visibleEntries(on), behind).map((e) => e.id)).toEqual(["help-me-choose"]);
  });

  it("is seen by id, so a reader who met the entry before the rewrite is not shown it again", () => {
    // No bump: an entry with a switch is announced by its switch flipping, and its id stays stable.
    const on = { HELP_ME_CHOOSE_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    expect(unseenEntries(visibleEntries(on), seen(ABOUT_VERSION - 1, ["help-me-choose"]))).toEqual([]);
  });

  it("names the read's credit in the credits entry only with the switch on", () => {
    const bullet = "- Each new “Help me choose” search where you fill in “Anything else?”";
    const credits = (env: Record<string, string>) =>
      visibleEntries(env as unknown as NodeJS.ProcessEnv).find((e) => e.id === "credits")!.caption;
    expect(credits({})).not.toContain(bullet);
    expect(credits({ HELP_ME_CHOOSE_ENABLED: "true" })).toContain(bullet);
  });
});
