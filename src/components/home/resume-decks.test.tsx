import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResumeDecks, resumeDecks } from "./resume-decks";
import type { DeckListItem } from "../../lib/decks/read";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";

const deck = (o: Partial<DeckListItem> = {}): DeckListItem => ({
  id: "d1",
  name: "Atraxa",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  commanderName: "Atraxa, Praetors' Voice",
  commanderColorIdentity: ["W", "U", "B", "G"],
  commanderImageUri: null,
  commanderArtCropUri: null,
  partnerName: null,
  partnerColorIdentity: null,
  folderId: null,
  folderName: null,
  built: 99,
  ownedCount: 96,
  toBuyCount: 3,
  unresolvedCount: 0,
  lastPlayedAt: new Date("2026-09-05T00:00:00Z"),
  inUseElsewhere: 0,
  statusPill: "To buy",
  ...o,
});

// Only `byDeck` is read here — `total` is Commitments' figure, and a roll-up
// with no entry for a deck is the shipped shape for "nothing to buy", not a gap.
const rollup = (copiesByDeck: Record<string, number> = {}): ShoppingRollup => ({
  byDeck: new Map(
    Object.entries(copiesByDeck).map(([id, copies]) => [id, { copies, cents: 0, pricedCopies: 0 }]),
  ),
  total: { copies: 0, cents: 0, pricedCopies: 0 },
});

describe("resumeDecks", () => {
  it("puts a played deck above an unplayed one, however new the unplayed is", () => {
    const played = deck({ id: "played", lastPlayedAt: new Date("2026-01-01T00:00:00Z") });
    const fresh = deck({
      id: "fresh",
      lastPlayedAt: null,
      createdAt: new Date("2026-09-07T00:00:00Z"),
    });
    expect(resumeDecks([fresh, played]).map((d) => d.id)).toEqual(["played", "fresh"]);
  });

  it("orders played decks by when they were played", () => {
    const older = deck({ id: "older", lastPlayedAt: new Date("2026-08-01T00:00:00Z") });
    const newer = deck({ id: "newer", lastPlayedAt: new Date("2026-09-05T00:00:00Z") });
    expect(resumeDecks([older, newer]).map((d) => d.id)).toEqual(["newer", "older"]);
  });

  it("orders unplayed decks by when they were created", () => {
    const a = deck({ id: "a", lastPlayedAt: null, createdAt: new Date("2026-08-01T00:00:00Z") });
    const b = deck({ id: "b", lastPlayedAt: null, createdAt: new Date("2026-09-01T00:00:00Z") });
    expect(resumeDecks([a, b]).map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("breaks a tie on id so two renders agree", () => {
    const at = new Date("2026-09-05T00:00:00Z");
    const a = deck({ id: "aaa", lastPlayedAt: at });
    const z = deck({ id: "zzz", lastPlayedAt: at });
    expect(resumeDecks([z, a]).map((d) => d.id)).toEqual(["aaa", "zzz"]);
  });

  it("takes two and no more", () => {
    expect(resumeDecks([deck({ id: "1" }), deck({ id: "2" }), deck({ id: "3" })])).toHaveLength(2);
  });

  it("does not mutate its argument", () => {
    const input = [deck({ id: "b", lastPlayedAt: null }), deck({ id: "a" })];
    resumeDecks(input);
    expect(input.map((d) => d.id)).toEqual(["b", "a"]);
  });
});

describe("ResumeDecks", () => {
  // A4, the round's largest single reversal: a 72px band with a 99px portrait
  // beside it becomes a 168px `cover` band with the text ON the wash. The whole
  // exception goes together — the portrait column, the 116px inset that column
  // bought, and the no-shadow exemption that inset justified.
  it("takes the resume band and puts its text on the wash", () => {
    const { container } = render(<ResumeDecks decks={[deck()]} shopping={rollup()} />);
    const row = container.querySelector("a");
    // Stated, not a floor: the wash is a hard 168px, so a row that could grow
    // past it would show an unwashed strip.
    expect(row?.className).toContain("h-[168px]");
    expect(row?.className).not.toMatch(/min-h-\[/);
    expect(row?.firstElementChild).toHaveAttribute("data-art-wash-band", "168");

    const text = row?.querySelector<HTMLElement>("[data-resume-text]");
    expect(text?.className).not.toContain("pl-[116px]");
    expect(text?.className).toContain("pb-[12px]");
    // The block the ramp is keyed to.
    expect(text).toHaveAttribute("data-wash-label");
  });

  // Decision 3, with its exception deleted: ink over art carries a shadow at
  // full opacity. The exemption was the 116px inset, and the inset is gone — for
  // EVERY string on the row, not just the name, which is why the shadow sits on
  // the meta row rather than on each child.
  it("shadows every string, now that they all stand on art", () => {
    const { container } = render(
      <ResumeDecks
        decks={[deck({ commanderName: "Ishai", partnerName: "Bruse Tarl, Boorish Herder" })]}
        shopping={rollup({ d1: 3 })}
      />,
    );
    const block = container.querySelector<HTMLElement>("[data-resume-text]")!;
    const name = block.firstElementChild as HTMLElement;
    expect(name.style.textShadow).not.toBe("");
    // The row carrying the pair line and the count, so both inherit it. The
    // status pill inside is opaque and needs none.
    const metaRow = block.children[1] as HTMLElement;
    expect(metaRow.style.textShadow).not.toBe("");
    expect(metaRow.textContent).toContain("+ Bruse Tarl");
  });

  it("prints the built count and the copies clause together", () => {
    render(
      <ResumeDecks decks={[deck({ built: 99, toBuyCount: 3 })]} shopping={rollup({ d1: 3 })} />,
    );
    // Two elements, not one string: the clause is the only child a narrow row
    // is allowed to eat into, so it cannot share a span with the figure.
    expect(screen.getByText("99 / 99")).toBeInTheDocument();
    expect(screen.getByText("· 3 cards")).toBeInTheDocument();
  });

  // §ResumeRow — the commander names the row's art. The deck name is the deck's
  // own, so without this line the portrait is unattributed.
  // The commander's name is cut on a single-commander row: the band is 168px of
  // that commander's art, so the name repeats what the picture says. The row's
  // accessible name still carries it.
  it("drops the commander's name on a single-commander row", () => {
    const { container } = render(
      <ResumeDecks
        decks={[deck({ name: "Four colours, one plan", commanderName: "Atraxa, Praetors' Voice" })]}
        shopping={rollup()}
      />,
    );
    expect(screen.getByText("Four colours, one plan")).toBeInTheDocument();
    const block = container.querySelector<HTMLElement>("[data-resume-text]")!;
    // Cut from the DRAWING, not from the accessible name: the band that makes
    // the visible string redundant is `aria-hidden` art, so the name survives in
    // an `sr-only` span — a picture cannot say a commander's name to a screen
    // reader.
    const visible = Array.from(block.querySelectorAll<HTMLElement>("span")).filter(
      (el) => !el.className.includes("sr-only"),
    );
    expect(visible.some((el) => el.textContent === "Atraxa, Praetors' Voice")).toBe(false);
    expect(block.querySelector(".sr-only")?.textContent).toBe("Atraxa, Praetors' Voice");
  });

  // Kept on a pair row, and for the same reason it is cut on a single one: a
  // pair's band shows ONE of two commanders, so the art cannot say it there.
  it("keeps the shortened pair line on a pair row", () => {
    const { container } = render(
      <ResumeDecks
        decks={[deck({ commanderName: "Ishai, Ojutai Dragonspeaker", partnerName: "Bruse Tarl, Boorish Herder" })]}
        shopping={rollup()}
      />,
    );
    const block = container.querySelector<HTMLElement>("[data-resume-text]")!;
    expect(block.textContent).toContain("Ishai");
    expect(block.textContent).toContain("+ Bruse Tarl");
  });

  it("prints the count alone when there is nothing to buy", () => {
    render(
      <ResumeDecks
        decks={[deck({ built: 87, toBuyCount: 0, statusPill: "Building" })]}
        shopping={rollup()}
      />,
    );
    expect(screen.getByText("87 / 99")).toBeInTheDocument();
    expect(screen.queryByText(/cards/)).toBeNull();
  });

  // The roll-up excludes basics and `toBuyCount` (`built − ownedCount`) does
  // not, so they are two different definitions of "unowned". A deck whose only
  // unowned cards are basics carries a `To buy` pill and no roll-up entry;
  // falling back to `toBuyCount` would print a count of cards no Shopping
  // surface will sell, and one that disagrees with the deck tile for the same
  // deck. The clause is absent instead.
  it("draws no copies clause for a deck the roll-up has no entry for", () => {
    render(<ResumeDecks decks={[deck({ built: 99, toBuyCount: 3 })]} shopping={rollup()} />);
    expect(screen.getByText("99 / 99")).toBeInTheDocument();
    expect(screen.queryByText(/cards/)).toBeNull();
  });

  it("names each row for the deck it opens", () => {
    render(<ResumeDecks decks={[deck({ name: "Atraxa", id: "d1" })]} shopping={rollup()} />);
    const link = screen.getByRole("link", { name: /Atraxa/ });
    expect(link).toHaveAttribute("href", "/decks/d1");
  });

  // Decision 19. A pair prints the substring before each first comma, and only
  // a pair does — no single-commander row changes a word.
  it("shortens both names for a pair and leaves a single commander in full", () => {
    render(
      <ResumeDecks
        decks={[deck({ commanderName: "Ishai, Ojutai Dragonspeaker", partnerName: "Bruse Tarl, Boorish Herder" })]}
        shopping={rollup()}
      />,
    );
    expect(screen.getByText("Ishai")).toBeInTheDocument();
    expect(screen.getByText("+ Bruse Tarl")).toBeInTheDocument();
  });

  // Decision 19 inverts the shrink: the count is pinned and the names are the
  // only child that gives, with the partner giving first so the `+` is never
  // the character truncation eats.
  it("pins the count and shrinks the partner's half first", () => {
    render(
      <ResumeDecks
        decks={[deck({ commanderName: "Ishai, Ojutai Dragonspeaker", partnerName: "Bruse Tarl, Boorish Herder" })]}
        shopping={rollup()}
      />,
    );
    const count = screen.getByText("99 / 98");
    expect(count.className).toContain("flex-none");
    // The group keeps its automatic minimum — that minimum IS the figure's
    // width, so the group stops shrinking once the clause is spent instead of
    // letting the row clip an unshrinkable figure into `86 / 9`.
    expect(count.parentElement?.className).not.toContain("min-w-0");
    expect(screen.getByText("+ Bruse Tarl").style.flexShrink).toBe("1000");
    expect(screen.getByText("Ishai").style.textOverflow).toBe("ellipsis");
  });

  // Decision 23. The long-form clause leaves negative room for a name at all,
  // and a partly truncated figure is never the answer — so a pair row drops the
  // clause outright and the figure survives in the accessible name.
  it("drops the to-buy clause on a pair row and keeps it in the accessible name", () => {
    render(
      <ResumeDecks
        decks={[
          deck({
            built: 95,
            commanderName: "Ishai, Ojutai Dragonspeaker",
            partnerName: "Bruse Tarl, Boorish Herder",
          }),
        ]}
        shopping={rollup({ d1: 3 })}
      />,
    );
    expect(screen.getByText("95 / 98")).toBeInTheDocument();
    expect(screen.queryByText(/95 \/ 98 ·/)).toBeNull();
    expect(
      screen.getByRole("link", {
        name: /Ishai, Ojutai Dragonspeaker, with partner Bruse Tarl, Boorish Herder · 3 copies to buy/,
      }),
    ).toBeInTheDocument();
  });

  it("renders nothing when there are no decks", () => {
    const { container } = render(<ResumeDecks decks={[]} shopping={rollup()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
