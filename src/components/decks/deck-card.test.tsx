import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { overCopy } from "../../lib/copy/decks-builder";
import type { DeckListItem } from "../../lib/decks/read";
import { DeckCard } from "./deck-card";

const deck = (over: Partial<DeckListItem> = {}): DeckListItem => ({
  id: "d1",
  name: "Slime Time",
  createdAt: new Date("2026-08-05"),
  commanderName: "Slimefoot, the Stowaway",
  commanderColorIdentity: ["B", "G"],
  commanderImageUri: null,
  built: 97,
  ownedCount: 90,
  toBuyCount: 7,
  unresolvedCount: 0,
  lastPlayedAt: null,
  statusPill: "Building",
  ...over,
});

describe("DeckCard — unresolved badge", () => {
  it("marks a deck that imported short", () => {
    render(<DeckCard deck={deck({ unresolvedCount: 2 })} />);
    expect(screen.getByText(deckImportCopy.unresolved.deckCardBadge(2))).toBeInTheDocument();
  });

  it("shows nothing on a deck with no unresolved lines", () => {
    render(<DeckCard deck={deck()} />);
    expect(screen.queryByText(/couldn't name/)).not.toBeInTheDocument();
  });

  // The badge and the pill are not redundant — the pill carries the word, the
  // badge carries the count, and below 99 the badge shows against a Building
  // pill that says nothing about unresolved lines.
  it("keeps the count badge beside the Unresolved pill", () => {
    render(<DeckCard deck={deck({ built: 99, ownedCount: 99, unresolvedCount: 2, statusPill: "Unresolved" })} />);
    expect(screen.getByText("Unresolved")).toBeInTheDocument();
    expect(screen.getByText(deckImportCopy.unresolved.deckCardBadge(2))).toBeInTheDocument();
  });
});

// #357. Green is the claim that the deck can be put on a table, so exactly one
// pill may carry it. The retired `Playable` took the same green as `Complete`
// while the caption beneath it read "15 to buy".
describe("DeckCard — status pill tone", () => {
  // Read off `style.color` rather than getComputedStyle: the component sets the
  // tone inline, and a computed read routes the answer through jsdom's own
  // handling of custom properties, which is not what ships.
  const toneOf = (status: DeckListItem["statusPill"]) => {
    const { unmount } = render(<DeckCard deck={deck({ statusPill: status })} />);
    const tone = (screen.getByText(status) as HTMLElement).style.color;
    unmount();
    return tone;
  };

  it("gives Complete the only success tone", () => {
    expect(toneOf("Complete")).toBe("var(--success)");
  });

  it.each(["Building", "Over", "Unresolved", "To buy"] as const)(
    "gives %s a warning tone, not success",
    (status) => {
      expect(toneOf(status)).toBe("var(--warning)");
    },
  );

  it("leaves Draft muted", () => {
    expect(toneOf("Draft")).toBe("var(--fg-muted)");
  });
});

describe("DeckCard — over 99", () => {
  const overDeck = deck({ built: 104, ownedCount: 104, toBuyCount: 0, statusPill: "Over" });

  it("says how many to cut", () => {
    render(<DeckCard deck={overDeck} />);
    expect(screen.getByText(overCopy.toCut("5"))).toBeInTheDocument();
  });

  // A bare amber 104 with no denominator is the reading this amendment exists
  // to stop, so the suffix is present at phone width too — where a deck at or
  // under 99 hides it.
  it("keeps the / 99 denominator visible at every width", () => {
    render(<DeckCard deck={overDeck} />);
    const suffix = screen.getByText(overCopy.figure.denominator.trim());
    expect(suffix.className).not.toContain("hidden");
  });

  // A valuenow of 104 against a max of 99 is an invalid range, and a reader
  // that clamps it to 100% announces a finished deck. Holding valuenow at the
  // legal 99 below a raised max keeps the ratio short of full, and the
  // valuetext says the part no percentage can.
  it("reports the legal 99 against the deck's own total as the max", () => {
    render(<DeckCard deck={overDeck} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "99");
    expect(bar).toHaveAttribute("aria-valuemax", "104");
    expect(bar).toHaveAttribute("aria-valuetext", overCopy.aria.progress("104", "5"));
    // The name is the deck, not the count. A name that moved with the value
    // would be announced alongside the valuetext that already carries it.
    expect(bar).toHaveAccessibleName(`${overDeck.name} build progress`);
  });

  it("leaves a deck at 99 alone", () => {
    render(<DeckCard deck={deck({ built: 99, ownedCount: 99, toBuyCount: 0, statusPill: "Complete" })} />);
    expect(screen.queryByText(/to cut/)).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "99");
  });
});
