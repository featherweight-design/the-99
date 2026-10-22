import { socialCopy } from "../copy/social";
import { describe, expect, it } from "vitest";
import { ABOUT_VERSION, type AboutEntry } from "../copy/about";
import { aboutEntries } from "../copy/about-entries";
import { sheetCookieValue, sheetDecision } from "./gate";
import { aboutNotice } from "./notice";
import { readSheetState } from "./sheet-state";
import { creditsEntryOf, drawnEntry, isFirstRun, isSeen, resolveEntry, switchedIds, unseenEntries, variantId, visibleEntries, type SeenState } from "./visible";

// TUNING_ENABLED also requires ANALYSIS_TAB_ENABLED (`tuningEnabled()`), already "true" here.
const ON = { NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true", HELP_ME_CHOOSE_ENABLED: "true", SWAP_TOOLS_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true", TUNING_ENABLED: "true", DECK_STATS_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true", HOME_FEED_ENABLED: "true", COMMANDERS_PLACE_ENABLED: "true", DECK_BENCHMARKS_ENABLED: "true", SHOPPING_MARK_BOUGHT_ENABLED: "true", DECK_PRINTINGS_ENABLED: "true", MANA_BALANCE_ENABLED: "true", ALL_DECKS_CART_ENABLED: "true", PRECONS_ENABLED: "true", UPCOMING_PRECONS_ENABLED: "true", DECK_TOKENS_ENABLED: "true", DECK_NOTES_ENABLED: "true", ADDED_COPY_ENABLED: "true", LINEUP_ENABLED: "true", PROPOSED_CUTS_ENABLED: "true", FIND_A_DECK_READ_ENABLED: "true", NO_COLLECTION_ENTRY_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_GAMES_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true", HELP_PANEL_ENABLED: "true", FIRST_RUN_TOUR_ENABLED: "true", RULE_ZERO_ENABLED: "true", SOCIAL_INVITES_ENABLED: "true", CARD_SEARCH_ENABLED: "true", CARD_SCAN_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const OFF = {} as unknown as NodeJS.ProcessEnv;

/** Two switched entries, a and b, beside one plain one, shaped like the launch entries. */
const plain: AboutEntry = { ...aboutEntries[0], id: "plain", since: 3 };
const a: AboutEntry = { ...aboutEntries[0], id: "a", since: 10, switch: "NEVER_CUT_ENABLED" };
const b: AboutEntry = { ...aboutEntries[0], id: "b", since: 10, switch: "CHANGE_COMMANDER_ENABLED" };
const catalog = [plain, a, b];
const seen = (version: number, ids: string[] = []): SeenState => ({ version, ids });

describe("all-decks-cart’s press line", () => {
  it("drops the buy key while I got it is off, so the entry never promises an inert tag", () => {
    const cartOnly = visibleEntries({ ALL_DECKS_CART_ENABLED: "true" } as unknown as NodeJS.ProcessEnv).find((e) => e.id === "all-decks-cart")!;
    const withBuy = visibleEntries({ ALL_DECKS_CART_ENABLED: "true", SHOPPING_MARK_BOUGHT_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true" } as unknown as NodeJS.ProcessEnv).find((e) => e.id === "all-decks-cart")!;
    expect(cartOnly.keys).toHaveLength(3);
    expect(withBuy.keys).toHaveLength(4);
    expect(withBuy.keys[3]).toMatch(/press “buy”/);
  });
});

describe("with every switch off, nothing changes (the invariance Hugh’s ruling requires)", () => {
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
      ["card-scan", "CARD_SCAN_ENABLED"],
      ["start-without-a-collection", "NO_COLLECTION_ENTRY_ENABLED"],
      ["upload-choice", "COLLECTION_EDIT_ENABLED"],
      ["all-decks-cart", "ALL_DECKS_CART_ENABLED"],
      ["added-copy", "ADDED_COPY_ENABLED"],
      ["card-search", "CARD_SEARCH_ENABLED"],
      ["edit-copies", "COLLECTION_EDIT_ENABLED"],
      ["remove-card", "COLLECTION_EDIT_ENABLED"],
      ["collection-history", "COLLECTION_EDIT_ENABLED"],
      ["wishlist", "SOCIAL_WISHLIST_ENABLED"],
      ["whats-new", "HOME_FEED_ENABLED"],
      ["help-me-choose", "HELP_ME_CHOOSE_ENABLED"],
      ["deck-analysis", "ANALYSIS_TAB_ENABLED"],
      ["deck-benchmarks", "DECK_BENCHMARKS_ENABLED"],
      ["card-marks", "ANALYSIS_TAB_ENABLED"],
      ["locked-cards", "NEVER_CUT_ENABLED"],
      ["fits-your-decks", "SWAP_TOOLS_ENABLED"],
      ["find-a-deck-read", "FIND_A_DECK_READ_ENABLED"],
      ["deck-tokens", "DECK_TOKENS_ENABLED"],
      ["stand-ins", "SWAP_TOOLS_ENABLED"],
      ["friend-spares", "SOCIAL_FRIENDS_ENABLED"],
      ["shopping-got-it", "SHOPPING_MARK_BOUGHT_ENABLED"],
      ["precons", "PRECONS_ENABLED"],
      ["upcoming-precons", "UPCOMING_PRECONS_ENABLED"],
      ["change-commander", "CHANGE_COMMANDER_ENABLED"],
      ["deck-printings", "DECK_PRINTINGS_ENABLED"],
      ["friends", "SOCIAL_FRIENDS_ENABLED"],
      ["invites", "SOCIAL_INVITES_ENABLED"],
      ["rule-zero", "RULE_ZERO_ENABLED"],
      ["opponents", "SOCIAL_GAMES_ENABLED"],
      ["suggested-changes", "TUNING_ENABLED"],
      ["proposed-cuts", "PROPOSED_CUTS_ENABLED"],
      ["mana-balance", "MANA_BALANCE_ENABLED"],
      ["deck-stats", "DECK_STATS_ENABLED"],
      ["decks-stats", "LINEUP_ENABLED"],
      ["notes", "DECK_NOTES_ENABLED"],
      ["buying-credits", "PAYMENTS_ENABLED"],
      ["getting-help", "HELP_PANEL_ENABLED"],
    ]);
    // Versions 12 (collection edit), 13 (evidence benchmarks) and 14 (deck printings and I got it, and later every
    // switched entry since, a way in without a collection included) added only switched entries; 16 (the launch-end
    // batch) adds `about-rebuilt`, the one unswitched entry the bump announces. Pinned exactly, so an unswitched entry
    // added (or since moved) without a deliberate edit here fails.
    expect(Math.max(...unswitched.map((e) => e.since))).toBe(16);
    expect(unswitched.filter((e) => e.since === 16).map((e) => e.id)).toEqual(["about-rebuilt"]);
    expect(ABOUT_VERSION).toBe(16);
  });

  it("draws every unswitched entry with the switches off, and every entry with them on", () => {
    // With the feed on, `whats-new` is drawn in place of `ready-to-build`, as `buying-credits` is for `credits` (which stays
    // here, since payments are off in ON).
    // `credits` and `deck-analysis` carry a line gated by `TUNING_ENABLED` alone (2026-10-08),
    // on top of (or with no) entry-level switch — resolved the same way `visibleEntries` itself
    // resolves it, rather than hand-duplicating the string surgery here.
    expect(visibleEntries(OFF)).toEqual(unswitched.map((e) => resolveEntry(e, OFF)));
    expect(visibleEntries(ON)).toEqual(aboutEntries.filter((e) => e.id !== "buying-credits" && e.id !== "ready-to-build").map((e) => resolveEntry(e, ON)));
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
    // `mana-balance`, `all-decks-cart`, `precons`, `upcoming-precons`, `deck-tokens`, `notes`, `added-copy`, `decks-stats`, `find-a-deck-read` and `proposed-cuts` since: 14 too, the current
    // version, with no bump of their own. `start-without-a-collection` (2026-10-15) is since: 14 too: it briefly
    // bumped to 15 (#1840), and went back, since a switched entry is announced by its id.
    // The launch-end batch (2026-10-21): every switched entry it adds is since: 16, the bump's own version.
    // The menu and Home line (2026-10-22): `whats-new` is since: 16 too, with no bump of its own (a switched entry is announced by its id).
    const batch = ["card-scan", "card-search", "invites", "rule-zero", "buying-credits", "getting-help", "whats-new"];
    expect(launch.filter((e) => batch.includes(e.id)).map((e) => e.since)).toEqual(batch.map(() => 16));
    const later = [...batch, "suggested-changes", "deck-stats", "deck-benchmarks", "shopping-got-it", "deck-printings", "mana-balance", "all-decks-cart", "precons", "upcoming-precons", "deck-tokens", "notes", "added-copy", "decks-stats", "find-a-deck-read", "proposed-cuts", "start-without-a-collection", "friends", "opponents", "wishlist", "friend-spares"];
    const [, , , , , , , suggestedChanges, deckStats, deckBenchmarks, gotIt, deckPrintings, manaBalance, cart, precons, upcoming, deckTokens, notes, addedCopy, decksStats, fitsRead, proposedCuts, startWithout, friends, opponents, wishlist, friendSpares] = later.map((id) => launch.filter((e) => e.id === id));
    const originalLaunch = launch.filter((e) => !later.includes(e.id));
    expect(originalLaunch.map((e) => e.since)).toEqual(originalLaunch.map(() => 9));
    expect(suggestedChanges.map((e) => e.since)).toEqual([10]);
    expect(deckStats.map((e) => e.since)).toEqual([11]);
    expect(deckBenchmarks.map((e) => e.since)).toEqual([13]);
    expect([...gotIt, ...deckPrintings, ...manaBalance, ...cart, ...precons, ...upcoming, ...deckTokens, ...notes, ...addedCopy, ...decksStats, ...fitsRead, ...proposedCuts].map((e) => e.since)).toEqual([14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]);
    expect(startWithout.map((e) => e.since)).toEqual([14]);
    // The Social line (R3 PR 5): each follows its own switch, so both are since: 14 and bump nothing.
    expect([...friends, ...opponents].map((e) => e.since)).toEqual([14, 14]);
    // The wishlist (Social R2's last PR) follows its own switch too: since: 14, no bump.
    expect(wishlist.map((e) => e.since)).toEqual([14]);
    // So does a friend's spare (Social R2's last PR): since: 14, no bump.
    expect(friendSpares.map((e) => e.since)).toEqual([14]);
    expect(unseenEntries(visibleEntries(ON), seen(ABOUT_VERSION)).map((e) => e.id)).toEqual([
      "collection-add",
      "card-scan",
      "start-without-a-collection",
      "upload-choice",
      "all-decks-cart",
      "added-copy",
      "card-search",
      "edit-copies",
      "remove-card",
      "collection-history",
      "wishlist",
      "whats-new",
      "help-me-choose",
      "deck-analysis",
      "deck-benchmarks",
      "card-marks",
      "locked-cards",
      "fits-your-decks",
      "find-a-deck-read",
      "deck-tokens",
      "stand-ins",
      "friend-spares",
      "shopping-got-it",
      "precons",
      "upcoming-precons",
      "change-commander",
      "deck-printings",
      "friends",
      "invites",
      "rule-zero",
      "opponents",
      "suggested-changes",
      "proposed-cuts",
      "mana-balance",
      "deck-stats",
      "decks-stats",
      "notes",
      "getting-help",
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

describe("an entry's variant: `upload-choice`'s Sync form (collection sync ruling 5)", () => {
  const entry = aboutEntries.find((e) => e.id === "upload-choice")!;
  const post = aboutEntries.find((e) => e.id === "post-import")!;
  const EDIT = { COLLECTION_EDIT_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
  const SYNC = { COLLECTION_EDIT_ENABLED: "true", COLLECTION_SYNC_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
  const SYNC_KEY = "Sync: takes the file’s changes, removals included, and keeps yours. If you both changed a card, it asks.";
  const HALF = "After a sync it also says how many of your own changes stayed.";
  const drawn = (env: NodeJS.ProcessEnv) => visibleEntries(env).find((e) => e.id === "upload-choice");

  it("reads as today without the Sync switch", () => {
    const e = drawn(EDIT)!;
    expect(e.title).toBe("Replacing or adding from a file");
    expect(e.keys).not.toContain(SYNC_KEY);
    expect(e.variantOn).toBeUndefined();
    expect(switchedIds([e])).toEqual(["upload-choice"]);
  });

  it("reads in its Sync form with the switch, four keys, Sync's in place of the doubling line", () => {
    const e = drawn(SYNC)!;
    expect(e.title).toBe("Replacing, adding or syncing from a file");
    expect(e.caption).toContain("“Sync” takes what changed in the file and keeps what you changed in the app.");
    expect(e.keys).toHaveLength(4);
    expect(e.keys[2]).toBe(SYNC_KEY);
    expect(e.variantOn).toBe("COLLECTION_SYNC_ENABLED");
  });

  it("draws nothing with the Sync switch alone, since the entry's own switch is off", () => {
    expect(drawn({ COLLECTION_SYNC_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBeUndefined();
  });

  it("is announced on the flip, with no version bump, to a reader who met the two-choice form", () => {
    const met = seen(ABOUT_VERSION, switchedIds(visibleEntries(EDIT)));
    expect(unseenEntries(visibleEntries(EDIT), met)).toEqual([]);
    expect(unseenEntries(visibleEntries(SYNC), met).map((e) => e.id)).toEqual(["upload-choice"]);
    // A visit records the form it drew, and the base id with it, so neither form is new after.
    const after = seen(ABOUT_VERSION, switchedIds(visibleEntries(SYNC)));
    expect(after.ids).toEqual(expect.arrayContaining(["upload-choice", variantId("upload-choice", "COLLECTION_SYNC_ENABLED")]));
    expect(unseenEntries(visibleEntries(SYNC), after)).toEqual([]);
    expect(unseenEntries(visibleEntries(EDIT), after)).toEqual([]);
    // The cookie names the form, so the flip makes the proxy decide again.
    expect(sheetCookieValue("u", visibleEntries(SYNC), 9)).not.toBe(sheetCookieValue("u", visibleEntries(EDIT), 9));
  });

  it("keeps `post-import`'s half-line only where a sync can happen", () => {
    expect(resolveEntry(post, EDIT).caption).not.toContain(HALF);
    expect(resolveEntry(post, SYNC).caption.endsWith(`what’s in them.\n${HALF}`)).toBe(true);
  });
});

describe("a negated line switch, and `import`'s two warnings (collection edit)", () => {
  const imp = aboutEntries.find((e) => e.id === "import")!;
  const REPLACES = "Heads up: an import replaces your whole Collection, it doesn’t add to it.";
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

// Friend decks close-out (READINESS 7): the friends key says "never the lists" only while friend decks are off, and the
// privacy line's default sentence once they are on.
describe("the friends key follows FRIEND_DECKS_ENABLED", () => {
  const OLD = "Friends see your deck names, commanders and statuses, never the lists.";
  const NEW = "Friends can see your decks and their lists, except drafts and decks you’re building.";
  const entry = aboutEntries.find((e) => e.keys.includes(OLD))!;
  const keys = (on: Record<string, string>) => resolveEntry(entry, on as unknown as NodeJS.ProcessEnv).keys;

  it("keeps the old sentence with the switch off and swaps it with the switch on", () => {
    expect(keys({ SOCIAL_FRIENDS_ENABLED: "true" })).toContain(OLD);
    expect(keys({ SOCIAL_FRIENDS_ENABLED: "true" })).not.toContain(NEW);
    expect(keys({ SOCIAL_FRIENDS_ENABLED: "true", FRIEND_DECKS_ENABLED: "true" })).toContain(NEW);
    expect(keys({ SOCIAL_FRIENDS_ENABLED: "true", FRIEND_DECKS_ENABLED: "true" })).not.toContain(OLD);
    // FRIEND_DECKS_ENABLED needs its parent: alone it draws neither.
    expect(keys({ FRIEND_DECKS_ENABLED: "true" })).not.toContain(NEW);
  });

  it("matches the privacy line's default sentence word for word", () => {
    expect(NEW).toBe(socialCopy.page.decksSeenBy.finished);
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

  it("is the evidence line’s one bump", () => {
    const entry = aboutEntries.find((e) => e.id === "deck-benchmarks")!;
    expect(entry.since).toBe(13);
    expect(entry.chapter).toBe("03");
    expect(entry.width).toBe("plate");
  });
});

describe("the collection home epic’s two entries (one bump, 14)", () => {
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

  it("draws Commander sets on the way on its own switch, after the precons entry, and only with Precons on", () => {
    expect(ids({ PRECONS_ENABLED: "true" })).not.toContain("upcoming-precons");
    // The switch needs PRECONS_ENABLED: the group and the banner both live under Precons.
    expect(ids({ UPCOMING_PRECONS_ENABLED: "true" })).not.toContain("upcoming-precons");
    const on = ids({ PRECONS_ENABLED: "true", UPCOMING_PRECONS_ENABLED: "true" });
    expect(on[on.indexOf("precons") + 1]).toBe("upcoming-precons");
  });

  it("draws Deck printings on its own switch, after export", () => {
    expect(ids({})).not.toContain("deck-printings");
    const on = ids({ DECK_PRINTINGS_ENABLED: "true" });
    expect(on[on.indexOf("export") + 1]).toBe("deck-printings");
  });

  it("is one bump: both at that launch's version, so the sheet counted its own two", () => {
    for (const id of ["shopping-got-it", "deck-printings"]) {
      const entry = aboutEntries.find((e) => e.id === id)!;
      expect(entry.since, id).toBe(14);
      expect(entry.chapter, id).toBe("03");
      expect(entry.width, id).toBe("plate");
    }
    expect(ABOUT_VERSION).toBeGreaterThanOrEqual(14);
  });
});

describe("a way in without a collection (no-collection entry PR 6: a switched entry, no bump)", () => {
  const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
  const LINE = { COLLECTION_EDIT_ENABLED: "true", NO_COLLECTION_ENTRY_ENABLED: "true" };
  const drawn = (o: Record<string, string>, id: string) => visibleEntries(env(o)).find((e) => e.id === id);
  const PRECON_LINE = "Pick the precons you own and each one starts its deck, with its cards in your Collection at the box’s printings, tokens too.";
  const PRECON_KEY = "Each precon box is its own change in History, and Revert takes its cards back. Adding a box twice stacks its copies and starts a second deck.";

  it("bumps nothing, as a switched entry, and sits in chapter 01 straight after import", () => {
    const entry = aboutEntries.find((e) => e.id === "start-without-a-collection")!;
    expect(entry.switch).toBe("NO_COLLECTION_ENTRY_ENABLED");
    expect(entry.since).toBe(14);
    // 16 is the launch-end batch's bump, for its unswitched `about-rebuilt` alone; this entry moved nothing.
    expect(ABOUT_VERSION).toBe(16);
    const ids = visibleEntries(env(LINE)).map((e) => e.id);
    expect(ids[ids.indexOf("import") + 1]).toBe("start-without-a-collection");
  });

  // What the proxy decides on the redirect path: it sends a reader to /about only when they are `behind` by this
  // rule (`proxy.ts`, `seen: behind ? 0 : ABOUT_VERSION`), never on the version alone.
  const behind = (visible: readonly AboutEntry[], s: SeenState) => isFirstRun(s) || unseenEntries(visible, s).length > 0;

  // With the switch off (production), a current reader is told nothing on any path: no Home line, no sheet,
  // and no redirect.
  it("announces nothing to a current reader while its switch is off", () => {
    const visible = visibleEntries(env({ COLLECTION_EDIT_ENABLED: "true", PRECONS_ENABLED: "true" }));
    // Current: has met every entry it can see, the switched ones by id.
    const current: SeenState = { version: ABOUT_VERSION, ids: switchedIds(visible) };
    expect(unseenEntries(visible, current)).toEqual([]);
    expect(aboutNotice(current, visible, false)).toBeNull();
    expect(sheetDecision({ userId: "u", seen: current, visible }).show).toBe(false);
    expect(behind(visible, current)).toBe(false);
  });

  // #1840 briefly shipped ABOUT_VERSION 15, so a reader may hold 15 as their seen version. The next bump skipped it, so
  // that reader is behind 16 by exactly the unswitched entry 16 added, and by nothing 15 claimed.
  it("reads a reader who holds the spent 15 as behind 16 by about-rebuilt alone", () => {
    const visible = visibleEntries(env({ COLLECTION_EDIT_ENABLED: "true", PRECONS_ENABLED: "true" }));
    const held: SeenState = { version: 15, ids: switchedIds(visible) };
    expect(unseenEntries(visible, held).map((e) => e.id)).toEqual(["about-rebuilt"]);
    const ahead: SeenState = { version: ABOUT_VERSION + 1, ids: switchedIds(visible) };
    expect(unseenEntries(visible, ahead)).toEqual([]);
    expect(behind(visible, ahead)).toBe(false);
  });

  // Flipped on, it is announced by its own id to everyone current, the way a switched entry always is.
  it("is announced by its id, alone, when its switch flips on, to a current reader", () => {
    const before = switchedIds(visibleEntries(env({ COLLECTION_EDIT_ENABLED: "true" })));
    const visible = visibleEntries(env(LINE));
    expect(unseenEntries(visible, { version: ABOUT_VERSION, ids: before }).map((e) => e.id)).toEqual(["start-without-a-collection"]);
  });

  it("draws only with the line's switch, which needs collection editing", () => {
    expect(drawn({ NO_COLLECTION_ENTRY_ENABLED: "true" }, "start-without-a-collection")).toBeUndefined();
    expect(drawn({ COLLECTION_EDIT_ENABLED: "true" }, "start-without-a-collection")).toBeUndefined();
    expect(drawn(LINE, "start-without-a-collection")).toBeDefined();
  });

  it("follows PRECONS_ENABLED line by line: the precon sentence and key go, and the rest reads whole", () => {
    const off = drawn(LINE, "start-without-a-collection")!;
    expect(off.caption).not.toContain(PRECON_LINE);
    expect(off.caption).toBe("No export to upload? Plenty of us don’t have one. If your cards are a few precon boxes, a Moxfield list or a pile on the desk, start there.\n\nImport a deck you play and select that you own its cards. Or add cards one at a time. A file can come later.");
    expect(off.keys).not.toContain(PRECON_KEY);
    expect(off.keys).toHaveLength(3);
    const on = drawn({ ...LINE, PRECONS_ENABLED: "true" }, "start-without-a-collection")!;
    expect(on.caption).toContain(PRECON_LINE);
    expect(on.keys).toHaveLength(4);
  });

  it("gives deck-import its fourth key and precons R3's sentence only with the line's switch", () => {
    const tick = "Own the deck you’re importing? Select “I own these cards” and its cards go into your Collection too.";
    const r3 = "Own a few boxes and don’t want decks from them yet? Press Add cards in your Collection, then Pick them, and they’re added without starting anything.";
    expect(drawn({ COLLECTION_EDIT_ENABLED: "true" }, "deck-import")!.keys).toHaveLength(3);
    expect(drawn(LINE, "deck-import")!.keys).toEqual(expect.arrayContaining([tick]));
    expect(drawn(LINE, "deck-import")!.keys).toHaveLength(4);
    const shipped = drawn({ PRECONS_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true" }, "precons")!.caption;
    expect(shipped).not.toContain(r3);
    expect(shipped).toContain("go into your collection too.\n\nUpgrading");
    expect(drawn({ ...LINE, PRECONS_ENABLED: "true" }, "precons")!.caption).toContain(`go into your collection too.\n${r3}\n\nUpgrading`);
  });
});

describe("Help me choose’s read (rework plan PR 5: the entry rewritten, no bump)", () => {
  // A current reader who never met the entry: production, where the switch is off.
  const behind = seen(ABOUT_VERSION);

  it("shows a current reader no sheet while the switch is off", () => {
    expect(unseenEntries(visibleEntries({} as NodeJS.ProcessEnv), behind)).toEqual([]);
  });

  it("shows exactly the Help me choose entry once the switch is on, never an empty sheet", () => {
    const on = { HELP_ME_CHOOSE_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    expect(unseenEntries(visibleEntries(on), behind).map((e) => e.id)).toEqual(["help-me-choose"]);
  });

  it("is seen by id, so a reader who met the entry before the rewrite is not shown it again", () => {
    // No bump: an entry with a switch is announced by its switch flipping, and its id stays stable.
    const on = { HELP_ME_CHOOSE_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    expect(unseenEntries(visibleEntries(on), seen(ABOUT_VERSION, ["help-me-choose"]))).toEqual([]);
  });

  it("names the read’s credit in the credits entry only with the switch on", () => {
    const bullet = "- Each new “Help me choose” search where you fill in “Anything else?”";
    const credits = (env: Record<string, string>) =>
      visibleEntries(env as unknown as NodeJS.ProcessEnv).find((e) => e.id === "credits")!.caption;
    expect(credits({})).not.toContain(bullet);
    expect(credits({ HELP_ME_CHOOSE_ENABLED: "true" })).toContain(bullet);
  });
});

describe("notes follows DECK_NOTES_ENABLED", () => {
  const ids = (env: Record<string, string>) => visibleEntries(env as unknown as NodeJS.ProcessEnv).map((e) => e.id);

  it("is hidden while the switch is off, and drawn straight after deck-stats once it is on", () => {
    expect(ids({ DECK_STATS_ENABLED: "true" })).not.toContain("notes");
    const on = ids({ DECK_STATS_ENABLED: "true", DECK_NOTES_ENABLED: "true" });
    expect(on[on.indexOf("deck-stats") + 1]).toBe("notes");
  });
});

describe("the History lines follow the Tuning hub, not one tool", () => {
  const HISTORY_KEY = "Every run is kept in History, under Tuning. Open one and its changes come back, each checked against the deck as it is now.";
  const HISTORY_LINE = "Each color you pick is kept in History too. Reopen it and each trade is checked against today’s deck.";
  const entry = (env: NodeJS.ProcessEnv, id: string) => visibleEntries(env).find((e) => e.id === id);
  const tools = (on: { tuning?: boolean; mana?: boolean; cuts?: boolean }) =>
    ({ ...ON, TUNING_ENABLED: on.tuning ? "true" : "false", MANA_BALANCE_ENABLED: on.mana ? "true" : "false", PROPOSED_CUTS_ENABLED: on.cuts ? "true" : "false" }) as unknown as NodeJS.ProcessEnv;

  it("drops them with one tool on: that tool mounts directly, with no History", () => {
    expect(entry(tools({ tuning: true }), "suggested-changes")?.keys).not.toContain(HISTORY_KEY);
    expect(entry(tools({ mana: true }), "mana-balance")?.caption).not.toContain(HISTORY_LINE);
  });

  it("keeps them once a second tool draws the hub", () => {
    expect(entry(tools({ tuning: true, cuts: true }), "suggested-changes")?.keys).toContain(HISTORY_KEY);
    expect(entry(tools({ mana: true, cuts: true }), "mana-balance")?.caption).toContain(HISTORY_LINE);
  });
});

describe("proposed-cuts follows PROPOSED_CUTS_ENABLED, and its hub paragraph the Tuning hub", () => {
  const HUB = "When a deck is over, its header says so, with a Proposed cuts press that opens the tool. Every run is kept in History, under Tuning, and reopening one checks each cut against the deck as it is now.";
  const env = (on: Record<string, string>) => ({ ANALYSIS_TAB_ENABLED: "true", ...on }) as unknown as NodeJS.ProcessEnv;
  const ids = (e: NodeJS.ProcessEnv) => visibleEntries(e).map((x) => x.id);
  const caption = (e: NodeJS.ProcessEnv) => visibleEntries(e).find((x) => x.id === "proposed-cuts")?.caption;

  it("is hidden with the switch off, and drawn straight after suggested-changes once it is on", () => {
    expect(ids(env({ TUNING_ENABLED: "true" }))).not.toContain("proposed-cuts");
    // The Analysis tab is the switch's parent: on alone, the entry stays hidden.
    expect(ids({ PROPOSED_CUTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).not.toContain("proposed-cuts");
    const on = ids(env({ TUNING_ENABLED: "true", PROPOSED_CUTS_ENABLED: "true" }));
    expect(on[on.indexOf("suggested-changes") + 1]).toBe("proposed-cuts");
  });

  it("drops the third paragraph while it is the only tool, and keeps it once the hub draws", () => {
    const alone = caption(env({ PROPOSED_CUTS_ENABLED: "true" }))!;
    expect(alone).not.toContain(HUB);
    expect(alone.endsWith("the tool closes.\n")).toBe(true);
    expect(caption(env({ PROPOSED_CUTS_ENABLED: "true", MANA_BALANCE_ENABLED: "true" }))).toContain(HUB);
    expect(caption(env({ PROPOSED_CUTS_ENABLED: "true", TUNING_ENABLED: "true" }))).toContain(HUB);
  });
});

describe("an entry drawn in another's place (`replaces`, the launch-end batch)", () => {
  const PAID = { ...ON, PAYMENTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
  const ids = (env: NodeJS.ProcessEnv) => visibleEntries(env).map((e) => e.id);

  it("draws the shipped credits entry without payments, and buying-credits in its place with them", () => {
    expect(ids(ON)).toContain("credits");
    expect(ids(ON)).not.toContain("buying-credits");
    expect(ids(PAID)).toContain("buying-credits");
    expect(ids(PAID)).not.toContain("credits");
  });

  it("sees the replaced entry by its version, so a reader who read it is never told it is new", () => {
    const credits = aboutEntries.find((e) => e.id === "credits")!;
    expect(isSeen(credits, seen(credits.since))).toBe(true);
    expect(switchedIds(visibleEntries(ON))).not.toContain("credits");
  });

  it("hands a reader of the credits text, or a #credits link, the form they are drawn", () => {
    expect(creditsEntryOf(visibleEntries(ON))?.id).toBe("credits");
    expect(creditsEntryOf(visibleEntries(PAID))?.id).toBe("buying-credits");
    expect(drawnEntry("notes", visibleEntries(PAID))?.id).toBe("notes");
  });

  it("announces buying-credits by its id when payments turns on", () => {
    const paid = visibleEntries(PAID);
    expect(unseenEntries(paid, seen(ABOUT_VERSION)).map((e) => e.id)).toContain("buying-credits");
    expect(unseenEntries(paid, seen(ABOUT_VERSION, switchedIds(paid))).map((e) => e.id)).toEqual([]);
  });
});

describe("whats-new's line switches, in every state of the four switches they name", () => {
  const entry = aboutEntries.find((e) => e.id === "whats-new")!;
  const flags = ["COMMANDERS_PLACE_ENABLED", "HELP_ME_CHOOSE_ENABLED", "SOCIAL_FRIENDS_ENABLED", "SOCIAL_WISHLIST_ENABLED", "PRECONS_ENABLED"] as const;
  // The renderer's own reading: a blank line starts a paragraph, an empty block is dropped (`EntryCaption`).
  const blocks = (caption: string) => caption.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.length > 0);

  it("draws clean text in all 32 combinations: no gated line left behind, no orphaned heading, no empty paragraph", () => {
    for (let mask = 0; mask < 1 << flags.length; mask++) {
      const env = { HOME_FEED_ENABLED: "true", ...Object.fromEntries(flags.map((f, i) => [f, mask & (1 << i) ? "true" : "false"])) } as unknown as NodeJS.ProcessEnv;
      const on = (f: (typeof flags)[number]) => env[f] === "true";
      const { caption } = resolveEntry(entry, env);
      const paras = blocks(caption);
      expect(paras.every((b) => b.length > 0), `mask ${mask}`).toBe(true);
      // A heading that introduces a list never stands without it.
      const hasHeading = caption.includes("Commanders is one place now");
      const hasTabs = /- For you:|- Discover:|- Help me choose:/.test(caption);
      expect(hasHeading, `mask ${mask}: the tabs heading follows the place`).toBe(on("COMMANDERS_PLACE_ENABLED"));
      expect(hasTabs, `mask ${mask}: tab lines only with the heading`).toBe(on("COMMANDERS_PLACE_ENABLED"));
      expect(caption.includes("- Help me choose:"), `mask ${mask}`).toBe(on("COMMANDERS_PLACE_ENABLED") && on("HELP_ME_CHOOSE_ENABLED"));
      expect(caption.includes("- A precon"), `mask ${mask}`).toBe(on("PRECONS_ENABLED"));
      expect(caption.includes("- A price drop"), `mask ${mask}`).toBe(on("SOCIAL_WISHLIST_ENABLED"));
      expect(caption.includes("- A friend with a spare"), `mask ${mask}`).toBe(on("SOCIAL_FRIENDS_ENABLED") && on("SOCIAL_WISHLIST_ENABLED"));
      expect(caption.includes("Friends has its own spot"), `mask ${mask}`).toBe(on("COMMANDERS_PLACE_ENABLED") && on("SOCIAL_FRIENDS_ENABLED"));
      expect(caption.includes("In Settings, you choose"), `mask ${mask}`).toBe(on("SOCIAL_FRIENDS_ENABLED"));
      // Settings' account-menu row exists with the place on only; off, Settings is reached from Home's Choose what shows.
      expect(caption.includes("then in Settings, in the account menu."), `mask ${mask}`).toBe(on("COMMANDERS_PLACE_ENABLED"));
      expect(caption.includes("then in Settings."), `mask ${mask}`).toBe(!on("COMMANDERS_PLACE_ENABLED"));
    }
  });
});
