// Which decks a friend sees (friend decks G2): one pure rule over the owner's three inputs, and the hide write's SQL.
import { describe, expect, it } from "vitest";
import { TO_BUY_STATUS, type StatusPill } from "../decks/status";
import { DEFAULT_FRIEND_DECK_PREFS, friendCanSeeDeck, hideDeckUpdate, settingsHideDeck } from "./deck-visibility";
import { hiddenWhy } from "./deck-visibility-rule";

const PILLS: StatusPill[] = ["New", "Draft", "Over", "Building", "Unresolved", TO_BUY_STATUS, "Complete"];
const seen = (prefs: { seeDecks: boolean; seeUnfinished: boolean }, hiddenFromFriends = false) =>
  PILLS.filter((statusPill) => friendCanSeeDeck({ statusPill, hiddenFromFriends }, prefs));

describe("friendCanSeeDeck", () => {
  it("by default shows the finished decks only: never New, Draft or Building", () => {
    expect(seen(DEFAULT_FRIEND_DECK_PREFS)).toEqual(["Over", "Unresolved", TO_BUY_STATUS, "Complete"]);
  });

  it("shows every phase once drafts and building decks are included", () => {
    expect(seen({ seeDecks: true, seeUnfinished: true })).toEqual(PILLS);
  });

  it("shows nothing with Friends can see my decks off, whatever the second rule says", () => {
    expect(seen({ seeDecks: false, seeUnfinished: true })).toEqual([]);
  });

  it("never shows a deck hidden on its own", () => {
    expect(seen({ seeDecks: true, seeUnfinished: true }, true)).toEqual([]);
  });

  it("reads an absent flag as not hidden", () => {
    expect(friendCanSeeDeck({ statusPill: "Complete" }, DEFAULT_FRIEND_DECK_PREFS)).toBe(true);
  });
});

// The ⋯ row's lock (README 4b): the Settings rules alone, never the deck's own flag.
describe("settingsHideDeck", () => {
  const locked = (prefs: { seeDecks: boolean; seeUnfinished: boolean }) => PILLS.filter((pill) => settingsHideDeck(pill, prefs));
  it("locks the unfinished phases under the defaults", () => {
    expect(locked(DEFAULT_FRIEND_DECK_PREFS)).toEqual(["New", "Draft", "Building"]);
  });
  it("locks every deck with Friends can see my decks off", () => {
    expect(locked({ seeDecks: false, seeUnfinished: true })).toEqual(PILLS);
  });
  it("locks none once drafts are included", () => {
    expect(locked({ seeDecks: true, seeUnfinished: true })).toEqual([]);
  });
});

describe("hideDeckUpdate", () => {
  const q = hideDeckUpdate("user_1", "11111111-1111-4111-8111-111111111111", true).toSQL();

  it("sets the flag alone: not last_edited_at, and nothing a table or a logged game reads (G4)", () => {
    expect(q.sql).toMatch(/^update "decks" set "hidden_from_friends" = \$1 where/);
    expect(q.sql).not.toContain("last_edited_at");
  });

  it("names the owner and writes only a change", () => {
    expect(q.sql).toContain('"decks"."user_id" = ');
    expect(q.sql).toContain('"decks"."hidden_from_friends" <> ');
    expect(q.params).toEqual([true, "11111111-1111-4111-8111-111111111111", "user_1", true]);
  });
});

describe("hiddenWhy (draft hidden row, #2988)", () => {
  const prefs = { seeDecks: true, seeUnfinished: false };
  const base = { built: 99, size: 99, canCommit: false };
  it("tests the master switch first: it hides every deck, whatever its status, and offers only Settings", () => {
    for (const statusPill of ["New", "Draft", "Building"] as const) {
      expect(hiddenWhy({ ...base, statusPill, prefs: { seeDecks: false, seeUnfinished: true }, canCommit: true })).toEqual({ why: "seeDecksOff", commit: false, settings: "see", label: "all" });
    }
  });
  it("a Draft that can commit offers the commit; a short one, one past its size and an unresolved one do not", () => {
    expect(hiddenWhy({ ...base, statusPill: "Draft", prefs, canCommit: true })).toEqual({ why: "draftReady", commit: true, settings: "unfinished", label: "drafts" });
    expect(hiddenWhy({ ...base, statusPill: "Draft", prefs, built: 40 }).why).toBe("draftShort");
    expect(hiddenWhy({ ...base, statusPill: "Draft", prefs, built: 104 }).why).toBe("draftFull");
    expect(hiddenWhy({ ...base, statusPill: "Draft", prefs, built: 99 }).why).toBe("draftFull");
  });
  it("a New deck and a Building deck never offer the commit, and name their own Settings sentence", () => {
    expect(hiddenWhy({ ...base, statusPill: "New", prefs, built: 0, canCommit: true })).toEqual({ why: "empty", commit: false, settings: "unfinished", label: "drafts" });
    expect(hiddenWhy({ ...base, statusPill: "Building", prefs, built: 97, canCommit: true })).toEqual({ why: "building", commit: false, settings: "unfinished", label: "building" });
  });
});
