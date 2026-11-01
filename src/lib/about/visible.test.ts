import { socialCopy } from "../copy/social";
import { describe, expect, it } from "vitest";
import { ABOUT_VERSION, type AboutEntry } from "../copy/about";
import { aboutEntries } from "../copy/about-entries";
import { creditsEntryOf, drawnEntry, isFirstRun, isSeen, resolveEntry, switchedIds, unseenEntries, variantId, visibleEntries, type SeenState } from "./visible";

// ANALYSIS_TAB_ENABLED and TUNING_ENABLED are retired (always on): their entries and lines draw whatever this says.
const ON = { SWAP_TOOLS_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true", TUNING_ENABLED: "true", OVERVIEW_V2_ENABLED: "true", ADDED_COPY_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "true", HELP_PANEL_ENABLED: "true", FIRST_RUN_TOUR_ENABLED: "true", CARD_SCAN_ENABLED: "true", NEAR_COMBOS_ENABLED: "true", PUSH_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const OFF = {} as unknown as NodeJS.ProcessEnv;

/** Two switched entries, a and b, beside one plain one, shaped like the launch entries. */
const plain: AboutEntry = { ...aboutEntries[0], id: "plain", since: 3 };
const a: AboutEntry = { ...aboutEntries[0], id: "a", since: 10, switch: "OVERVIEW_V2_ENABLED" };
const b: AboutEntry = { ...aboutEntries[0], id: "b", since: 10, switch: "PUSH_ENABLED" };
const catalog = [plain, a, b];
const seen = (version: number, ids: string[] = []): SeenState => ({ version, ids });

// Retired switches draw always and are still seen by id (so no reader's New marks moved): with "every switch off" they
// are drawn like an unswitched entry, and a reader who "met every launch" has met them too.
// Collection editing's entries, and the names that followed it (scanning, added copy, the way in without a collection, I got
// it), are among them. `upload-choice` draws in its Sync variant, so its variant id is met too.
const RETIRED = ["CARD_SEARCH_ENABLED", "FIRST_RUN_TOUR_ENABLED", "HELP_PANEL_ENABLED", "NEAR_COMBOS_ENABLED", "PRECONS_ENABLED", "UPCOMING_PRECONS_ENABLED", "DECK_TOKENS_ENABLED", "LINEUP_ENABLED", "COMMANDERS_PLACE_ENABLED", "HOME_FEED_ENABLED", "SOCIAL_WISHLIST_ENABLED", "COLLECTION_EDIT_ENABLED", "CARD_SCAN_ENABLED", "ADDED_COPY_ENABLED", "NO_COLLECTION_ENTRY_ENABLED", "SHOPPING_MARK_BOUGHT_ENABLED", "DECK_NOTES_ENABLED", "DECK_STATS_ENABLED", "DECK_PRINTINGS_ENABLED", "NEVER_CUT_ENABLED", "CHANGE_COMMANDER_ENABLED", "ALL_DECKS_CART_ENABLED", "SOCIAL_FRIENDS_ENABLED", "FRIEND_DECKS_ENABLED", "SOCIAL_INVITES_ENABLED", "RULE_ZERO_ENABLED", "SOCIAL_GAMES_ENABLED", "SWAP_TOOLS_ENABLED", "FIND_A_DECK_READ_ENABLED", "HELP_ME_CHOOSE_ENABLED", "ANALYSIS_TAB_ENABLED", "TUNING_ENABLED", "DECK_BENCHMARKS_ENABLED", "PROPOSED_CUTS_ENABLED", "MANA_BALANCE_ENABLED", "STRATEGY_FOCUS_ENABLED"];
const retiredEntries = aboutEntries.filter((e) => e.switch && RETIRED.includes(e.switch));
const retiredIds = switchedIds(retiredEntries.map((e) => resolveEntry(e, OFF)));

describe("all-decks-cart’s press line", () => {
  it("always carries the buy key: I got it is always on (collection editing is retired)", () => {
    // Shopping for all decks is retired (always on): the entry draws with no switch set.
    const cart = visibleEntries(OFF).find((e) => e.id === "all-decks-cart")!;
    expect(cart.keys).toHaveLength(4);
    expect(cart.keys[3]).toMatch(/press “buy”/);
  });
});

describe("with every switch off, nothing changes (the invariance Hugh’s ruling requires)", () => {
  // The entries a switch cannot hide. With every switch off they are the whole page, and the page
  // must behave exactly as the single-version model did over them.
  const unswitched = aboutEntries.filter((e) => !e.switch);
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
      ["combos-one-away", "NEAR_COMBOS_ENABLED"],
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
      ["friend-decks", "FRIEND_DECKS_ENABLED"],
      ["invites", "SOCIAL_INVITES_ENABLED"],
      ["rule-zero", "RULE_ZERO_ENABLED"],
      ["opponents", "SOCIAL_GAMES_ENABLED"],
      ["suggested-changes", "TUNING_ENABLED"],
      ["proposed-cuts", "PROPOSED_CUTS_ENABLED"],
      ["mana-balance", "MANA_BALANCE_ENABLED"],
      ["deck-focus", "STRATEGY_FOCUS_ENABLED"],
      ["deck-stats", "DECK_STATS_ENABLED"],
      ["decks-stats", "LINEUP_ENABLED"],
      ["notes", "DECK_NOTES_ENABLED"],
      ["buying-credits", "PAYMENTS_ENABLED"],
      ["getting-help", "HELP_PANEL_ENABLED"],
      ["push", "PUSH_ENABLED"],
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
    // `whats-new` (retired switch) is drawn in place of `ready-to-build`, even with every switch off.
    expect(visibleEntries(OFF)).toEqual(aboutEntries.filter((e) => e.id !== "ready-to-build" && (!e.switch || retiredEntries.includes(e))).map((e) => resolveEntry(e, OFF)));
    expect(visibleEntries(ON)).toEqual(aboutEntries.filter((e) => e.id !== "buying-credits" && e.id !== "ready-to-build").map((e) => resolveEntry(e, ON)));
  });

  it("marks the same entries new as the version rule did", () => {
    for (let s = 1; s <= ABOUT_VERSION; s++) {
      const now = unseenEntries(visibleEntries(OFF), seen(s, retiredIds)).map((e) => e.id);
      const before = unswitched.filter((e) => e.since > s).map((e) => e.id);
      expect(now, `seen ${s}`).toEqual(before);
    }
  });
});

describe("an entry tied to a switch", () => {
  it("draws only while its switch is on", () => {
    expect(visibleEntries(OFF, catalog)).toEqual([plain]);
    expect(visibleEntries({ OVERVIEW_V2_ENABLED: "true" } as unknown as NodeJS.ProcessEnv, catalog)).toEqual([plain, a]);
    // The feature's own flag rule: anything but the exact string 'true' is off.
    expect(visibleEntries({ OVERVIEW_V2_ENABLED: "1" } as unknown as NodeJS.ProcessEnv, catalog)).toEqual([plain]);
  });

  // FIND_A_DECK_READ_ENABLED and its parent SWAP_TOOLS_ENABLED are retired: the swap tools' entries always draw.
  it("always draws the swap tools' entries and Find a deck's read, whatever their retired switches say", () => {
    const ids = (env: Record<string, string>) => visibleEntries(env as unknown as NodeJS.ProcessEnv).map((e) => e.id);
    for (const env of [{}, { SWAP_TOOLS_ENABLED: "off" }, { SWAP_TOOLS_ENABLED: "false", FIND_A_DECK_READ_ENABLED: "false" }] as Record<string, string>[]) {
      expect(ids(env)).toEqual(expect.arrayContaining(["fits-your-decks", "find-a-deck-read", "stand-ins"]));
    }
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
    // Friend decks (2026-10-22): `friend-decks` is since: 16 too, no bump. So are `combos-one-away` and `deck-focus` (2026-10-22), and `push` (2026-10-23).
    const batch = ["card-scan", "card-search", "invites", "rule-zero", "buying-credits", "getting-help", "whats-new", "friend-decks", "combos-one-away", "deck-focus", "push"];
    expect(launch.filter((e) => batch.includes(e.id)).map((e) => e.since)).toEqual(batch.map(() => 16));
    const later = [...batch, "suggested-changes", "deck-stats", "deck-benchmarks", "shopping-got-it", "deck-printings", "mana-balance", "all-decks-cart", "precons", "upcoming-precons", "deck-tokens", "notes", "added-copy", "decks-stats", "find-a-deck-read", "proposed-cuts", "start-without-a-collection", "friends", "opponents", "wishlist", "friend-spares"];
    const [, , , , , , , , , , , suggestedChanges, deckStats, deckBenchmarks, gotIt, deckPrintings, manaBalance, cart, precons, upcoming, deckTokens, notes, addedCopy, decksStats, fitsRead, proposedCuts, startWithout, friends, opponents, wishlist, friendSpares] = later.map((id) => launch.filter((e) => e.id === id));
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
      "combos-one-away",
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
      "friend-decks",
      "invites",
      "rule-zero",
      "opponents",
      "suggested-changes",
      "proposed-cuts",
      "mana-balance",
      "deck-focus",
      "deck-stats",
      "decks-stats",
      "notes",
      "getting-help",
      "push",
    ]);
  });

  it("is seen by its id, never by the version", () => {
    expect(isSeen(a, seen(99))).toBe(false);
    expect(isSeen(a, seen(0, ["a"]))).toBe(true);
    expect(isSeen(plain, seen(3))).toBe(true);
  });

  it("reads unseen when switched on after another was switched on and read (out of order)", () => {
    // Switch B on, and the reader visits: the visit records the switched ids it drew.
    const bOn = visibleEntries({ PUSH_ENABLED: "true" } as unknown as NodeJS.ProcessEnv, catalog);
    const afterVisit = seen(9, switchedIds(bOn));
    expect(unseenEntries(bOn, afterVisit)).toEqual([]);
    // Now switch A on. A version number would say the reader is current; A is still new.
    const both = visibleEntries(ON, catalog);
    expect(unseenEntries(both, afterVisit).map((e) => e.id)).toEqual(["a"]);
  });

  it("still introduces the page to a brand-new account rather than listing it", () => {
    expect(unseenEntries(visibleEntries(ON, catalog), seen(0))).toEqual([]);
  });
});

describe("HOW_IT_WORKS_ENABLED", () => {
  // Retired (always on): an entry tied to it draws whatever the environment says.
  const how: AboutEntry = { ...aboutEntries[0], id: "how-it-works", since: 10, switch: "HOW_IT_WORKS_ENABLED" };

  it("draws an entry tied to it with the variable unset", () => {
    expect(visibleEntries({} as unknown as NodeJS.ProcessEnv, [how])).toEqual([how]);
  });
});

// TUNING_ENABLED is retired (Hugh 2026-11-01), and so is its parent, ANALYSIS_TAB_ENABLED: the name, kept as Suggested
// changes' entry's and lines' historical identity, always draws, whatever either variable says.
describe("TUNING_ENABLED (retired), and the lines it gates without an entry switch of their own", () => {
  const anEntry: AboutEntry = {
    ...aboutEntries[0],
    id: "entry",
    since: 3,
    caption: "Before.\n\n- Keep\n- Drop this\n\nAfter.",
    captionLineSwitches: { "- Drop this": "TUNING_ENABLED" },
    keys: ["Keep this key", "Drop this key"],
    keySwitches: { "Drop this key": "TUNING_ENABLED" },
  };

  it("keeps every line, whatever the retired switches say", () => {
    for (const v of [undefined, "false", "off", "true"]) {
      const [resolved] = visibleEntries({ TUNING_ENABLED: v, ANALYSIS_TAB_ENABLED: v } as unknown as NodeJS.ProcessEnv, [anEntry]);
      expect(resolved).toEqual(anEntry);
    }
  });

  it("draws every line of the real deck-analysis and credits entries, and Suggested changes' own, with both retired switches off", () => {
    for (const env of [{}, { ANALYSIS_TAB_ENABLED: "off", TUNING_ENABLED: "off" }] as unknown as NodeJS.ProcessEnv[]) {
      const visible = visibleEntries(env);
      expect(visible.find((e) => e.id === "deck-analysis")!.keys).toHaveLength(4);
      expect(visible.find((e) => e.id === "credits")!.caption).toContain("Suggested changes");
      expect(visible.find((e) => e.id === "suggested-changes")).toBeDefined();
    }
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

// COLLECTION_SYNC_ENABLED and its parent COLLECTION_EDIT_ENABLED are retired: the variant keeps the name as its identity
// and always draws, so the two-choice form no longer does.
describe("an entry's variant: `upload-choice`'s Sync form (collection sync ruling 5, switch retired)", () => {
  const post = aboutEntries.find((e) => e.id === "post-import")!;
  const SYNC = {} as unknown as NodeJS.ProcessEnv;
  const SYNC_KEY = "Sync: takes the file’s changes, removals included, and keeps yours. If you both changed a card, it asks.";
  const HALF = "After a sync it also says how many of your own changes stayed.";
  const drawn = (env: NodeJS.ProcessEnv) => visibleEntries(env).find((e) => e.id === "upload-choice");

  it("reads in its Sync form, four keys, Sync's in place of the doubling line", () => {
    const e = drawn(SYNC)!;
    expect(e.title).toBe("Replacing, adding or syncing from a file");
    expect(e.caption).toContain("“Sync” takes what changed in the file and keeps what you changed in the app.");
    expect(e.keys).toHaveLength(4);
    expect(e.keys[2]).toBe(SYNC_KEY);
    expect(e.variantOn).toBe("COLLECTION_SYNC_ENABLED");
  });

  it("is announced, with no version bump, to a reader who met the two-choice form", () => {
    // Everything the reader sees today, less the Sync form: what a visit recorded while the switch was off.
    const sync = variantId("upload-choice", "COLLECTION_SYNC_ENABLED");
    const met = seen(ABOUT_VERSION, switchedIds(visibleEntries(SYNC)).filter((id) => id !== sync));
    expect(unseenEntries(visibleEntries(SYNC), met).map((e) => e.id)).toEqual(["upload-choice"]);
    // A visit records the form it drew, and the base id with it, so it is not new after.
    const after = seen(ABOUT_VERSION, switchedIds(visibleEntries(SYNC)));
    expect(after.ids).toEqual(expect.arrayContaining(["upload-choice", sync]));
    expect(unseenEntries(visibleEntries(SYNC), after)).toEqual([]);
  });

  it("keeps `post-import`'s half-line", () => {
    expect(resolveEntry(post, SYNC).caption.endsWith(`what’s in them.\n${HALF}`)).toBe(true);
  });
});

describe("a negated line switch, and `import`'s two warnings (collection edit, retired)", () => {
  const imp = aboutEntries.find((e) => e.id === "import")!;
  const REPLACES = "Heads up: an import replaces your whole Collection, it doesn’t add to it.";
  const ASKS = "Already have a Collection here? The 99 asks whether the file replaces it or adds to it.";
  const env = (v?: string) => (v === undefined ? {} : { PUSH_ENABLED: v }) as unknown as NodeJS.ProcessEnv;

  it("always draws the question, never the replace warning, leaving no blank line behind", () => {
    const resolved = resolveEntry(imp, env());
    expect(resolved.caption).not.toContain(REPLACES);
    expect(resolved.caption.endsWith(`\n\n${ASKS}`)).toBe(true);
  });

  it("keeps a `!` key while its switch is off and drops it while on, reading anything but 'true' as off", () => {
    const e: AboutEntry = { ...aboutEntries[0], id: "neg", since: 3, keys: ["Old", "New"], keySwitches: { Old: "!PUSH_ENABLED", New: "PUSH_ENABLED" } };
    expect(resolveEntry(e, env()).keys).toEqual(["Old"]);
    expect(resolveEntry(e, env("1")).keys).toEqual(["Old"]);
    expect(resolveEntry(e, env("true")).keys).toEqual(["New"]);
  });
});

// Friend decks close-out (READINESS 7): the friends key says the privacy line's default sentence. The switch is retired
// (it was on exactly where Friends is), so the old "never the lists" form never draws.
describe("the friends key says what friends see of decks", () => {
  const OLD = "Friends see your deck names, commanders and statuses, never the lists.";
  const NEW = "Friends can see your decks and their lists, except drafts and decks you’re building.";
  const entry = aboutEntries.find((e) => e.keys.includes(OLD))!;
  const keys = (on: Record<string, string>) => resolveEntry(entry, on as unknown as NodeJS.ProcessEnv).keys;

  it("always draws the new sentence, never the old (SOCIAL_FRIENDS_ENABLED is retired)", () => {
    expect(keys({})).toContain(NEW);
    expect(keys({})).not.toContain(OLD);
  });

  it("matches the privacy line's default sentence word for word", () => {
    expect(NEW).toBe(socialCopy.page.decksSeenBy.finished);
  });
});

// The block lives on the Analysis tab, whose switch is retired (always on, 2026-11-01).
describe("deck-benchmarks follows the Analysis tab, always drawn", () => {
  const ids = (env: Record<string, string>) => visibleEntries(env as unknown as NodeJS.ProcessEnv).map((e) => e.id);

  it("is drawn after deck-analysis whatever the tab's retired switch says", () => {
    for (const env of [{}, { ANALYSIS_TAB_ENABLED: "off" }] as Record<string, string>[]) {
      const on = ids(env);
      expect(on[on.indexOf("deck-analysis") + 1]).toBe("deck-benchmarks");
    }
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

  // SHOPPING_MARK_BOUGHT_ENABLED and its parent COLLECTION_EDIT_ENABLED are retired: the entry always draws.
  // Friend spares (always on, SOCIAL_FRIENDS_ENABLED retired) sits between them.
  it("always draws I got it, after stand-ins and friend spares", () => {
    expect(ids({})).toContain("shopping-got-it");
    const on = ids({});
    const at = on.indexOf("stand-ins");
    expect(on.slice(at + 1, at + 3)).toEqual(["friend-spares", "shopping-got-it"]);
  });

  it("always draws the precons entry (retired switch), after starting a new deck", () => {
    const on = ids({});
    expect(on[on.indexOf("new-deck") + 1]).toBe("precons");
  });

  it("always draws Commander sets on the way (retired switch), after the precons entry", () => {
    const on = ids({});
    expect(on[on.indexOf("precons") + 1]).toBe("upcoming-precons");
  });

  it("always draws Deck printings (retired switch), after export", () => {
    const on = ids({});
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
  const LINE = {};
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
  it("announces nothing to a current reader who has met the entries it can see", () => {
    const visible = visibleEntries(env(LINE));
    // Current: has met every entry it can see, the switched ones by id.
    const current: SeenState = { version: ABOUT_VERSION, ids: switchedIds(visible) };
    expect(unseenEntries(visible, current)).toEqual([]);
    expect(behind(visible, current)).toBe(false);
  });

  // #1840 briefly shipped ABOUT_VERSION 15, so a reader may hold 15 as their seen version. The next bump skipped it, so
  // that reader is behind 16 by exactly the unswitched entry 16 added, and by nothing 15 claimed.
  it("reads a reader who holds the spent 15 as behind 16 by about-rebuilt alone", () => {
    const visible = visibleEntries(env(LINE));
    const held: SeenState = { version: 15, ids: switchedIds(visible) };
    expect(unseenEntries(visible, held).map((e) => e.id)).toEqual(["about-rebuilt"]);
    const ahead: SeenState = { version: ABOUT_VERSION + 1, ids: switchedIds(visible) };
    expect(unseenEntries(visible, ahead)).toEqual([]);
    expect(behind(visible, ahead)).toBe(false);
  });

  it("always draws (collection editing is retired)", () => {
    expect(drawn(LINE, "start-without-a-collection")).toBeDefined();
  });

  it("always draws the precon sentence and key (retired switch), and the rest reads whole", () => {
    const on = drawn(LINE, "start-without-a-collection")!;
    expect(on.caption).toContain(PRECON_LINE);
    expect(on.keys).toContain(PRECON_KEY);
    expect(on.keys).toHaveLength(4);
  });

  it("gives deck-import its fourth key and precons R3's sentence", () => {
    const tick = "Own the deck you’re importing? Select “I own these cards” and its cards go into your Collection too.";
    const r3 = "Own a few boxes and don’t want decks from them yet? Press Add cards in your Collection, then Pick them, and they’re added without starting anything.";
    expect(drawn(LINE, "deck-import")!.keys).toEqual(expect.arrayContaining([tick]));
    expect(drawn(LINE, "deck-import")!.keys).toHaveLength(4);
    expect(drawn(LINE, "precons")!.caption).toContain(`go into your collection too.\n${r3}\n\nUpgrading`);
  });
});

// HELP_ME_CHOOSE_ENABLED is retired (always on): the entry keeps the name as its identity and is always drawn.
describe("Help me choose’s read (rework plan PR 5: the entry rewritten, no bump; its switch retired)", () => {
  const OFF_ENVS = [{}, { HELP_ME_CHOOSE_ENABLED: "off" }] as unknown as NodeJS.ProcessEnv[];
  // A current reader who never met the entry.
  const behind = seen(ABOUT_VERSION, retiredIds.filter((id) => id !== "help-me-choose"));

  it("is drawn whatever its retired switch says", () => {
    for (const env of OFF_ENVS) expect(visibleEntries(env).map((e) => e.id)).toContain("help-me-choose");
  });

  it("shows a current reader who never met it exactly the Help me choose entry, never an empty sheet", () => {
    expect(unseenEntries(visibleEntries(OFF), behind).map((e) => e.id)).toEqual(["help-me-choose"]);
  });

  it("is seen by id, so a reader who met the entry before the rewrite is not shown it again", () => {
    // No bump: the id stays stable.
    expect(unseenEntries(visibleEntries(OFF), seen(ABOUT_VERSION, ["help-me-choose", ...retiredIds]))).toEqual([]);
  });

  it("names the read’s credit in the credits entry whatever its retired switch says", () => {
    const bullet = "- Each new “Help me choose” search where you fill in “Anything else?”";
    for (const env of OFF_ENVS) expect(visibleEntries(env).find((e) => e.id === "credits")!.caption).toContain(bullet);
  });
});

// DECK_NOTES_ENABLED is retired: the entry keeps the name as its identity and is always drawn.
describe("notes is always drawn (switch retired)", () => {
  const ids = (env: Record<string, string>) => visibleEntries(env as unknown as NodeJS.ProcessEnv).map((e) => e.id);

  it("is drawn with every switch off, straight after decks-stats", () => {
    const on = ids({});
    expect(on).toContain("notes");
    // decks-stats is always drawn too (its switch is retired), so the order holds with nothing on.
    expect(on[on.indexOf("decks-stats") + 1]).toBe("notes");
  });
});

describe("the History lines follow the Tuning hub, not one tool", () => {
  const HISTORY_KEY = "Every run is kept in History, under Tuning. Open one and its changes come back, each checked against the deck as it is now.";
  const HISTORY_LINE = "Each color you pick is kept in History too. Reopen it and each trade is checked against today’s deck.";
  const entry = (env: NodeJS.ProcessEnv, id: string) => visibleEntries(env).find((e) => e.id === id);
  // No Tuning tool has a switch (Suggested changes' own retired 2026-11-01, Proposed cuts' 2026-10-31), nor has the
  // Analysis tab (2026-11-01): all three are always tools, so the hub, and its History lines, draw whatever the retired
  // switches say.
  const tools = (on: { tuning?: boolean }) =>
    ({ ...ON, TUNING_ENABLED: on.tuning ? "true" : "off", PROPOSED_CUTS_ENABLED: "off" }) as unknown as NodeJS.ProcessEnv;

  it("keeps them, whatever the retired switches say", () => {
    for (const tuning of [false, true]) {
      expect(entry(tools({ tuning }), "suggested-changes")?.keys).toContain(HISTORY_KEY);
      expect(entry(tools({ tuning }), "mana-balance")?.caption).toContain(HISTORY_LINE);
    }
  });

  it("keeps them with the tab's retired switch off too", () => {
    const off = { ANALYSIS_TAB_ENABLED: "off", TUNING_ENABLED: "off", PROPOSED_CUTS_ENABLED: "off" } as unknown as NodeJS.ProcessEnv;
    expect(entry(off, "suggested-changes")?.keys).toContain(HISTORY_KEY);
    expect(entry(off, "mana-balance")?.caption).toContain(HISTORY_LINE);
  });
});

describe("mana-balance follows the Analysis tab (its own switch and the tab's are retired)", () => {
  const ids = (e: Record<string, string>) => visibleEntries(e as unknown as NodeJS.ProcessEnv).map((x) => x.id);

  it("always draws, whatever the retired switches say", () => {
    expect(ids({})).toContain("mana-balance");
    expect(ids({ ANALYSIS_TAB_ENABLED: "off", MANA_BALANCE_ENABLED: "off" })).toContain("mana-balance");
  });
});

describe("proposed-cuts follows the Analysis tab (its own switch and the tab's are retired), and its hub paragraph the Tuning hub", () => {
  const HUB = "When a deck is over, its header says so, with a Proposed cuts press that opens the tool. Every run is kept in History, under Tuning, and reopening one checks each cut against the deck as it is now.";
  const env = (on: Record<string, string>) => on as unknown as NodeJS.ProcessEnv;
  const ids = (e: NodeJS.ProcessEnv) => visibleEntries(e).map((x) => x.id);
  const caption = (e: NodeJS.ProcessEnv) => visibleEntries(e).find((x) => x.id === "proposed-cuts")?.caption;

  it("is drawn straight after suggested-changes, whatever the retired switches say", () => {
    for (const on of [{}, { ANALYSIS_TAB_ENABLED: "off" }, { PROPOSED_CUTS_ENABLED: "off", TUNING_ENABLED: "off" }] as Record<string, string>[]) {
      const drawn = ids(env(on));
      expect(drawn[drawn.indexOf("suggested-changes") + 1]).toBe("proposed-cuts");
    }
  });

  it("always keeps the third paragraph: Mana Balance beside it draws the hub", () => {
    expect(caption(env({}))).toContain(HUB);
    expect(caption(env({ PROPOSED_CUTS_ENABLED: "off" }))).toContain(HUB);
    expect(caption(env({ TUNING_ENABLED: "true" }))).toContain(HUB);
    expect(caption(env({ ANALYSIS_TAB_ENABLED: "off" }))).toContain(HUB);
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

describe("whats-new's line switches, in every state of the live switch they name", () => {
  const entry = aboutEntries.find((e) => e.id === "whats-new")!;
  // `SOCIAL_WISHLIST_ENABLED`, `SOCIAL_FRIENDS_ENABLED` and `HELP_ME_CHOOSE_ENABLED` are retired: their lines follow them
  // as always on. The one name left is swept anyway, to prove its line ignores it.
  const flags = ["HELP_ME_CHOOSE_ENABLED"] as const;
  // The renderer's own reading: a blank line starts a paragraph, an empty block is dropped (`EntryCaption`).
  const blocks = (caption: string) => caption.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.length > 0);

  it("draws clean text in both states: no gated line left behind, no orphaned heading, no empty paragraph", () => {
    for (let mask = 0; mask < 1 << flags.length; mask++) {
      const env = { ...Object.fromEntries(flags.map((f, i) => [f, mask & (1 << i) ? "true" : "false"])) } as unknown as NodeJS.ProcessEnv;
      const { caption } = resolveEntry(entry, env);
      const paras = blocks(caption);
      expect(paras.every((b) => b.length > 0), `mask ${mask}`).toBe(true);
      // A heading that introduces a list never stands without it.
      const hasHeading = caption.includes("Commanders is one place now");
      const hasTabs = /- For you:|- Discover:|- Help me choose:/.test(caption);
      expect(hasHeading, `mask ${mask}: the tabs heading is always drawn (the place is retired)`).toBe(true);
      expect(hasTabs, `mask ${mask}: tab lines only with the heading`).toBe(true);
      expect(caption.includes("- Help me choose:"), `mask ${mask}`).toBe(true);
      expect(caption.includes("- A precon"), `mask ${mask}`).toBe(true);
      expect(caption.includes("- A price drop"), `mask ${mask}`).toBe(true);
      expect(caption.includes("- A friend with a spare"), `mask ${mask}`).toBe(true);
      expect(caption.includes("Friends has its own spot"), `mask ${mask}`).toBe(true);
      expect(caption.includes("In Settings, you choose"), `mask ${mask}`).toBe(true);
      // Settings' account-menu row is always drawn now that the place is retired.
      expect(caption.includes("then in Settings, in the account menu."), `mask ${mask}`).toBe(true);
      expect(caption.includes("then in Settings."), `mask ${mask}`).toBe(false);
    }
  });
});

// Spare requests close-out: `friend-spares` reads its requests variant, which says how to ask and how an ask is answered.
// SPARE_REQUESTS_ENABLED and SOCIAL_FRIENDS_ENABLED are retired: the variant keeps the name as its identity and always
// draws, so the view-only form no longer does.
describe("friend-spares' requests form (SPARE_REQUESTS_ENABLED, retired)", () => {
  const ASKS = {} as unknown as NodeJS.ProcessEnv;
  const drawn = (env: NodeJS.ProcessEnv) => visibleEntries(env).find((e) => e.id === "friend-spares");
  const VIEW_ONLY = "It’s view only";

  it("always reads the ask", () => {
    const on = drawn(ASKS)!;
    expect(on.caption).toContain("drafts included. Press “Ask”");
    expect(on.caption).not.toContain(VIEW_ONLY);
    expect(on.variantOn).toBe("SPARE_REQUESTS_ENABLED");
  });

  it("keeps the entry's key switches in its requests form", () => {
    // The cart's key rides ALL_DECKS_CART_ENABLED, which is retired (always on): it always draws.
    expect(drawn(ASKS)!.keys).toContain("The same mark shows on the cart for all your decks.");
  });
});

describe("deck-focus and Suggested changes", () => {
  // Review round 1 (#2254): the ring needs only Analysis, whose switch is retired (always on, 2026-11-01), as Suggested
  // changes' own is: the entry always names Suggested changes in its paragraph and its credit key.
  const ring = {} as unknown as NodeJS.ProcessEnv;
  const entry = (env: NodeJS.ProcessEnv) => visibleEntries(env).find((e) => e.id === "deck-focus");

  it("keeps the Suggested changes paragraph and key, whatever the retired switches say", () => {
    for (const v of [undefined, "off"]) {
      const on = entry({ ...ring, TUNING_ENABLED: v, ANALYSIS_TAB_ENABLED: v } as unknown as NodeJS.ProcessEnv)!;
      expect(on.caption).toContain("“Suggested changes” aims at it");
      expect(on.keys).toContain("The ring and the focus are free.");
      expect(on.keys).toContain("“Suggested changes” uses a credit, as it always has.");
    }
  });

  it("with Suggested changes v2 on, the credit key says 2 over 10 changes instead; off, it never says two", () => {
    const V1 = "“Suggested changes” uses a credit, as it always has.";
    const V2 = "“Suggested changes” uses a credit, or two for more than 10 changes.";
    const v2 = entry({ ...ring, SUGGESTED_CHANGES_V2_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)!;
    expect(v2.keys).toContain(V2);
    expect(v2.keys).not.toContain(V1);
    const v1 = entry(ring)!;
    expect(v1.keys).toContain(V1);
    expect(v1.keys).not.toContain(V2);
  });
});

describe("Suggested changes v2's price (2 credits for more than 10 changes) where About names a run's cost", () => {
  // The Analysis tab's switch is retired (always on): nothing else need be set for v1.
  const V1_ENV = {} as unknown as NodeJS.ProcessEnv;
  const V2_ENV = { ...V1_ENV, SUGGESTED_CHANGES_V2_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
  const of = (env: NodeJS.ProcessEnv, id: string) => visibleEntries(env).find((e) => e.id === id)!;
  const V1_BULLET = "- Each “Suggested changes” run";
  const V2_BULLET = "- Each “Suggested changes” run, or two for more than 10 changes";

  it.each(["credits", "buying-credits"])("%s: exactly one Suggested changes bullet, the v2 one only with v2 on", (id) => {
    const env = (e: NodeJS.ProcessEnv) => (id === "buying-credits" ? { ...e, PAYMENTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv : e);
    const v1 = of(env(V1_ENV), id).caption.split("\n");
    expect(v1).toContain(V1_BULLET);
    expect(v1).not.toContain(V2_BULLET);
    const v2 = of(env(V2_ENV), id).caption.split("\n");
    expect(v2).toContain(V2_BULLET);
    expect(v2).not.toContain(V1_BULLET);
    // Suggested changes' own switch is retired, and so is the Analysis tab's: their names set off withhold neither bullet.
    const off = of(env({ TUNING_ENABLED: "off", ANALYSIS_TAB_ENABLED: "off" } as unknown as NodeJS.ProcessEnv), id).caption.split("\n");
    expect(off).toContain(V1_BULLET);
  });

  it("the Suggested changes entry's credit key: two for more than 10 only with v2 on", () => {
    expect(of(V1_ENV, "suggested-changes").keys).toContain("Each run uses a credit.");
    expect(of(V1_ENV, "suggested-changes").keys).not.toContain("Each run uses a credit, or two for more than 10 changes.");
    expect(of(V2_ENV, "suggested-changes").keys).toContain("Each run uses a credit, or two for more than 10 changes.");
    expect(of(V2_ENV, "suggested-changes").keys).not.toContain("Each run uses a credit.");
  });
});

describe("push (close-out): each line follows the kind's own availability (`feedKindAvailable`)", () => {
  const env = (extra: Record<string, string>) => ({ PUSH_ENABLED: "true", ...extra }) as unknown as NodeJS.ProcessEnv;
  const push = (e: NodeJS.ProcessEnv) => visibleEntries(e).find((x) => x.id === "push");

  it("draws only with PUSH_ENABLED", () => {
    expect(push(env({}))).toBeDefined();
    expect(push({} as unknown as NodeJS.ProcessEnv)).toBeUndefined();
  });

  it("names a set and a precon, always", () => {
    expect(push(env({}))!.caption).toContain("- A set or a precon that just came out\n");
  });

  it("names the spare-request kind, and its starting tick, always (SOCIAL_FRIENDS_ENABLED is retired)", () => {
    const on = push(env({}))!;
    expect(on.caption).toContain("- A friend asking for one of your spares");
    expect(on.keys[0]).toBe("Only a friend asking for your spare starts ticked. Nothing is sent until you allow it on a device.");
    expect(on.keys).toHaveLength(4);
  });

  it("swaps whats-new's news key with push", () => {
    const key = (e: NodeJS.ProcessEnv) => visibleEntries(e).find((x) => x.id === "whats-new")!.keys[0];
    expect(key({} as unknown as NodeJS.ProcessEnv)).toMatch(/^News stays in the app/);
    expect(key(env({}))).toBe("News shows on Home, and as push where you turn it on. No email, ever.");
  });
});

describe("the friends entry under the signature card", () => {
  const friends = aboutEntries.find((e) => e.id === "friends")!;
  // SIGNATURE_CARD_ENABLED and SOCIAL_FRIENDS_ENABLED are retired: its lines always draw.
  const env = () => ({}) as unknown as NodeJS.ProcessEnv;
  it.each([
    ["your name, your signature card and the decks", "Pick a signature card, any card in any printing, and its art"],
  ])("draws one privacy key and one face sentence (%s)", (key, face) => {
    const e = resolveEntry(friends, env());
    const privacy = e.keys.filter((k) => k.startsWith("Friends see your name"));
    expect(privacy).toHaveLength(1);
    expect(privacy[0]).toContain(key);
    expect(e.caption).toContain(face);
    expect(e.caption).not.toMatch(/commander and signature card/);
  });
});
