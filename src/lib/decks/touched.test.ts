import { describe, expect, it } from "vitest";
import { byTouched, elapsed, touchedBy, type TouchableDeck } from "./touched";

const at = (iso: string) => new Date(iso);

function deck(overrides: Partial<TouchableDeck> & { id: string }): TouchableDeck {
  return {
    name: overrides.id,
    lastEditedAt: at("2026-09-01T00:00:00Z"),
    lastCommittedAt: null,
    lastPlayedAt: null,
    ...overrides,
  };
}

describe("touchedBy", () => {
  it("names the edit when nothing else has happened", () => {
    const t = touchedBy(deck({ id: "a", lastEditedAt: at("2026-09-10T09:00:00Z") }));
    expect(t).toEqual({ at: at("2026-09-10T09:00:00Z"), verb: "edited" });
  });

  it("names the game when it is the most recent", () => {
    const t = touchedBy(
      deck({
        id: "a",
        lastEditedAt: at("2026-09-01T00:00:00Z"),
        lastPlayedAt: at("2026-09-12T20:00:00Z"),
      }),
    );
    expect(t.verb).toBe("played");
  });

  it("names the commit when it is the most recent", () => {
    const t = touchedBy(
      deck({
        id: "a",
        lastEditedAt: at("2026-09-05T00:00:00Z"),
        lastCommittedAt: at("2026-09-09T00:00:00Z"),
        lastPlayedAt: at("2026-09-07T00:00:00Z"),
      }),
    );
    expect(t.verb).toBe("committed");
  });

  // THE MIGRATION CASE. `0024` stamped a synthetic v1 on every already-full deck
  // with `committed_at = decks.created_at`, and `0030` seeds `last_edited_at`
  // from the same column — so every deck that predates versioning ties here,
  // having never been committed by anybody. It must not read `committed`.
  it("resolves an edit and a commit at the same instant to the edit", () => {
    const same = at("2026-09-12T12:00:00Z");
    expect(touchedBy(deck({ id: "a", lastEditedAt: same, lastCommittedAt: same })).verb)
      .toBe("edited");
  });

  it("still names a commit that is strictly newer than the edit", () => {
    expect(
      touchedBy(deck({
        id: "a",
        lastEditedAt: at("2026-09-12T12:00:00Z"),
        lastCommittedAt: at("2026-09-12T12:00:01Z"),
      })).verb,
    ).toBe("committed");
  });

  it("resolves an edit and a game at the same instant to the game", () => {
    const same = at("2026-09-12T12:00:00Z");
    expect(touchedBy(deck({ id: "a", lastEditedAt: same, lastPlayedAt: same })).verb)
      .toBe("played");
  });

  // The column is NOT NULL, so a deck nobody has touched still answers — with
  // its own creation, which the migration seeded. A block that drew a row with
  // no stamp is the state this makes unreachable.
  it("always has an answer", () => {
    expect(touchedBy(deck({ id: "a" })).verb).toBe("edited");
  });

  it("ignores a commit or a game older than the edit", () => {
    const t = touchedBy(
      deck({
        id: "a",
        lastEditedAt: at("2026-09-12T00:00:00Z"),
        lastCommittedAt: at("2026-09-01T00:00:00Z"),
        lastPlayedAt: at("2026-09-02T00:00:00Z"),
      }),
    );
    expect(t.verb).toBe("edited");
  });

  // Only reachable by two Dates colliding at the millisecond: no transaction
  // writes a game and a commit together. Tested so the choice is stated rather
  // than left to the order of two `if`s.
  it("resolves a commit and a game at the same instant to the game", () => {
    const same = at("2026-09-12T12:00:00Z");
    expect(
      touchedBy(deck({
        id: "a",
        lastEditedAt: at("2026-01-01T00:00:00Z"),
        lastCommittedAt: same,
        lastPlayedAt: same,
      })).verb,
    ).toBe("played");
  });
});

describe("byTouched", () => {
  it("puts the most recently touched first, whatever the verb", () => {
    const decks = [
      deck({ id: "old", lastEditedAt: at("2026-09-01T00:00:00Z") }),
      deck({ id: "played", lastPlayedAt: at("2026-09-12T00:00:00Z") }),
      deck({ id: "committed", lastCommittedAt: at("2026-09-11T00:00:00Z") }),
    ];
    expect([...decks].sort(byTouched).map((d) => d.id)).toEqual(["played", "committed", "old"]);
  });

  it("breaks a tie on name, case-insensitively", () => {
    const same = at("2026-09-12T00:00:00Z");
    const decks = [
      deck({ id: "1", name: "zombies", lastEditedAt: same }),
      deck({ id: "2", name: "Atraxa", lastEditedAt: same }),
      deck({ id: "3", name: "birds", lastEditedAt: same }),
    ];
    expect([...decks].sort(byTouched).map((d) => d.name)).toEqual(["Atraxa", "birds", "zombies"]);
  });

  // Deck names are not unique, and two renders of the same list must agree.
  it("breaks a tied name on id", () => {
    const same = at("2026-09-12T00:00:00Z");
    const decks = [
      deck({ id: "b", name: "Slivers", lastEditedAt: same }),
      deck({ id: "a", name: "Slivers", lastEditedAt: same }),
    ];
    expect([...decks].sort(byTouched).map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("is stable across repeated sorts of the same list", () => {
    const same = at("2026-09-12T00:00:00Z");
    const decks = [
      deck({ id: "c", name: "Same", lastEditedAt: same }),
      deck({ id: "a", name: "Same", lastEditedAt: same }),
      deck({ id: "b", name: "Same", lastEditedAt: same }),
    ];
    const once = [...decks].sort(byTouched).map((d) => d.id);
    const twice = [...decks].sort(byTouched).sort(byTouched).map((d) => d.id);
    expect(once).toEqual(twice);
  });
});

describe("elapsed", () => {
  const now = at("2026-09-13T12:00:00Z");

  it("reads hours under a day", () => {
    expect(elapsed(at("2026-09-13T10:00:00Z"), now)).toEqual({ unit: "hours", value: 2 });
  });

  // No "just now": a stamp of 0 is not news.
  it("reads 0 hours rather than inventing a word for it", () => {
    expect(elapsed(at("2026-09-13T11:59:00Z"), now)).toEqual({ unit: "hours", value: 0 });
  });

  // A game the player logged with tomorrow's date. Clamped, never negative.
  it("clamps a future instant to 0", () => {
    expect(elapsed(at("2026-09-14T12:00:00Z"), now)).toEqual({ unit: "hours", value: 0 });
  });

  it("reads yesterday at one day", () => {
    expect(elapsed(at("2026-09-12T11:00:00Z"), now).unit).toBe("yesterday");
  });

  it("reads days from two to six", () => {
    expect(elapsed(at("2026-09-10T12:00:00Z"), now)).toEqual({ unit: "days", value: 3 });
    expect(elapsed(at("2026-09-07T12:00:00Z"), now)).toEqual({ unit: "days", value: 6 });
  });

  it("reads weeks from one to four", () => {
    expect(elapsed(at("2026-09-06T12:00:00Z"), now)).toEqual({ unit: "weeks", value: 1 });
    expect(elapsed(at("2026-08-17T12:00:00Z"), now)).toEqual({ unit: "weeks", value: 3 });
  });

  it("reads months past a month", () => {
    expect(elapsed(at("2026-07-13T12:00:00Z"), now)).toEqual({ unit: "months", value: 2 });
  });
});
