// Which decks a friend sees (friend decks G2): one pure rule over the owner's three inputs, and the hide write's SQL.
import { describe, expect, it } from "vitest";
import type { StatusPill } from "../decks/status";
import { DEFAULT_FRIEND_DECK_PREFS, friendCanSeeDeck, hideDeckUpdate } from "./deck-visibility";

const PILLS: StatusPill[] = ["New", "Draft", "Over", "Building", "Unresolved", "To buy", "Complete"];
const seen = (prefs: { seeDecks: boolean; seeUnfinished: boolean }, hiddenFromFriends = false) =>
  PILLS.filter((statusPill) => friendCanSeeDeck({ statusPill, hiddenFromFriends }, prefs));

describe("friendCanSeeDeck", () => {
  it("by default shows the finished decks only: never New, Draft or Building", () => {
    expect(seen(DEFAULT_FRIEND_DECK_PREFS)).toEqual(["Over", "Unresolved", "To buy", "Complete"]);
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
