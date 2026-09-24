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
  built: 99,
  ownedCount: 96,
  toBuyCount: 3,
  unresolvedCount: 0,
  pendingChanges: 0,
  versionNumber: null,
  lastPlayedAt: new Date("2026-09-05T00:00:00Z"),
  lastEditedAt: new Date("2026-09-01T00:00:00Z"),
  lastCommittedAt: null,
  inUseElsewhere: 0,
  proxiedCount: 0,
  folderId: null,
  folderName: null,
  statusPill: "To buy",
  bracket: null,
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

/** One clock for every stamp, as the page threads one down. */
const NOW = new Date("2026-09-13T12:00:00Z");

describe("resumeDecks", () => {
  // The order is *touched*, not *played*: an edit counts, and a deck edited this
  // morning outranks one played in January. This is the rule that replaced "a
  // played deck always beats an unplayed one".
  it("puts the most recently touched deck first, whatever touched it", () => {
    const played = deck({
      id: "played",
      lastPlayedAt: new Date("2026-01-01T00:00:00Z"),
      lastEditedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const edited = deck({
      id: "edited",
      lastPlayedAt: null,
      lastEditedAt: new Date("2026-09-07T00:00:00Z"),
    });
    expect(resumeDecks([played, edited]).map((d) => d.id)).toEqual(["edited", "played"]);
  });

  it("orders played decks by when they were played", () => {
    const older = deck({ id: "older", lastPlayedAt: new Date("2026-08-01T00:00:00Z") });
    const newer = deck({ id: "newer", lastPlayedAt: new Date("2026-09-05T00:00:00Z") });
    expect(resumeDecks([older, newer]).map((d) => d.id)).toEqual(["newer", "older"]);
  });

  // A deck nobody has edited still has a stamp: the column is seeded from the
  // deck's creation, so a brand-new deck sorts by when it was made without
  // creation being a term in the key.
  it("orders never-played decks by when they were last edited", () => {
    const a = deck({ id: "a", lastPlayedAt: null, lastEditedAt: new Date("2026-08-01T00:00:00Z") });
    const b = deck({ id: "b", lastPlayedAt: null, lastEditedAt: new Date("2026-09-01T00:00:00Z") });
    expect(resumeDecks([a, b]).map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("counts a commit as touching the deck", () => {
    const committed = deck({
      id: "committed",
      lastPlayedAt: null,
      lastEditedAt: new Date("2026-08-01T00:00:00Z"),
      lastCommittedAt: new Date("2026-09-10T00:00:00Z"),
    });
    const edited = deck({
      id: "edited",
      lastPlayedAt: null,
      lastEditedAt: new Date("2026-09-02T00:00:00Z"),
    });
    expect(resumeDecks([edited, committed]).map((d) => d.id)).toEqual(["committed", "edited"]);
  });

  it("breaks a tie on name, then id, so two renders agree", () => {
    const at = new Date("2026-09-05T00:00:00Z");
    const a = deck({ id: "aaa", name: "Zombies", lastPlayedAt: at });
    const z = deck({ id: "zzz", name: "Atraxa", lastPlayedAt: at });
    expect(resumeDecks([a, z]).map((d) => d.id)).toEqual(["zzz", "aaa"]);
  });

  // Four, because this block is the only route back into a deck now.
  it("takes four and no more", () => {
    // `lastPlayedAt` nulled: the shared fixture gives every deck the same play
    // date, which would otherwise decide the order and leave the edit stamps
    // saying nothing.
    const five = [1, 2, 3, 4, 5].map((n) =>
      deck({ id: `${n}`, lastPlayedAt: null, lastEditedAt: new Date(`2026-09-0${n}T00:00:00Z`) }),
    );
    expect(resumeDecks(five)).toHaveLength(4);
    expect(resumeDecks(five).map((d) => d.id)).toEqual(["5", "4", "3", "2"]);
  });

  it("does not mutate its argument", () => {
    const input = [deck({ id: "b", lastPlayedAt: null }), deck({ id: "a" })];
    resumeDecks(input);
    expect(input.map((d) => d.id)).toEqual(["b", "a"]);
  });
});

describe("ResumeDecks", () => {
  // The resume row's portrait is the owned printing's art, so its caption follows the
  // same rule the tile and the spine do.
  it("captions the row with the name printed on the copy the player owns", () => {
    render(
      <ResumeDecks
        decks={[deck({
          commanderName: "Iroas, God of Victory",
          commanderPrintedName: "Freya, Queen of the Valkyries",
        })]}
        shopping={rollup()}
        total={1}
        now={NOW}
      />,
    );

    expect(screen.getByText(/Freya, Queen of the Valkyries/)).toBeTruthy();
    expect(screen.queryByText(/Iroas, God of Victory/)).toBeNull();
  });

  it("gives the art its own column and starts type clear of it", () => {
    const { container } = render(<ResumeDecks decks={[deck()]} shopping={rollup()} total={1} now={NOW} />);
    const row = container.querySelector("a");
    // Stated, not a floor — the wash beside it is a hard 72px, so a row that
    // could grow past it would show an unwashed strip.
    expect(row?.className).toContain("h-[72px]");
    expect(row?.className).not.toContain("min-h-[72px]");
    const text = row?.querySelector("[data-resume-text]");
    expect(text?.className).toContain("pl-[116px]");
  });

  it("needs no text shadow, because type never sits on art", () => {
    const { container } = render(<ResumeDecks decks={[deck()]} shopping={rollup()} total={1} now={NOW} />);
    // A shadow VALUE, not the property: `statusPillStyle` declares
    // `text-shadow: none` on every pill in the app, which is the refusal of a
    // shadow rather than one.
    expect(container.innerHTML).not.toMatch(/text-shadow:(?!\s*none)/);
  });

  it("prints the built count and the copies clause together", () => {
    render(
      <ResumeDecks decks={[deck({ built: 99, toBuyCount: 3 })]} shopping={rollup({ d1: 3 })} total={1} now={NOW} />,
    );
    // Two elements, not one string: the clause is the only child a narrow row
    // is allowed to eat into, so it cannot share a span with the figure.
    expect(screen.getByText("99 / 99")).toBeInTheDocument();
    expect(screen.getByText("· 3 cards")).toBeInTheDocument();
  });

  // §ResumeRow — the commander names the row's art. The deck name is the deck's
  // own, so without this line the portrait is unattributed.
  it("names the commander under the deck name", () => {
    render(
      <ResumeDecks
        decks={[deck({ name: "Four colours, one plan", commanderName: "Atraxa, Praetors' Voice" })]}
        shopping={rollup()} total={1} now={NOW}
      />,
    );
    expect(screen.getByText("Four colours, one plan")).toBeInTheDocument();
    expect(screen.getByText("Atraxa, Praetors' Voice")).toBeInTheDocument();
  });

  it("prints the count alone when there is nothing to buy", () => {
    render(
      <ResumeDecks
        decks={[deck({ built: 87, toBuyCount: 0, statusPill: "Building" })]}
        shopping={rollup()} total={1} now={NOW}
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
    render(<ResumeDecks decks={[deck({ built: 99, toBuyCount: 3 })]} shopping={rollup()} total={1} now={NOW} />);
    expect(screen.getByText("99 / 99")).toBeInTheDocument();
    expect(screen.queryByText(/cards/)).toBeNull();
  });

  it("names each row for the deck it opens", () => {
    render(<ResumeDecks decks={[deck({ name: "Atraxa", id: "d1" })]} shopping={rollup()} total={1} now={NOW} />);
    const link = screen.getByRole("link", { name: /Atraxa/ });
    expect(link).toHaveAttribute("href", "/decks/d1");
  });

  // Decision 19. A pair prints the substring before each first comma, and only
  // a pair does — no single-commander row changes a word.
  it("shortens both names for a pair and leaves a single commander in full", () => {
    render(
      <ResumeDecks
        decks={[deck({ commanderName: "Ishai, Ojutai Dragonspeaker", partnerName: "Bruse Tarl, Boorish Herder" })]}
        shopping={rollup()} total={1} now={NOW}
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
        shopping={rollup()} total={1} now={NOW}
      />,
    );
    // Since the bracket-chip addendum the count has its own line, beside the bar: the
    // whole group is `flex-none` and nothing in it truncates (§C).
    const group = screen.getByText("99 / 98").parentElement!;
    expect(group.className).toContain("flex-none");
    expect(group.className).toContain("whitespace-nowrap");
    expect(group.innerHTML).not.toContain("truncate");
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
        shopping={rollup({ d1: 3 })} total={1} now={NOW}
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
    const { container } = render(<ResumeDecks decks={[]} shopping={rollup()} total={1} now={NOW} />);
    expect(container).toBeEmptyDOMElement();
  });

  // The row's fixed content has to fit the narrowest column it is drawn in. At
  // 640px the dashboard's left column is 252px, and a 116px inset with 18px of
  // right padding left 118 for a meta line needing 121 — the count was clipped
  // by the row's own `overflow-hidden`. The inset's gap and the right padding
  // are the parts that give, and only below 1000px.
  it("tightens its inset and padding below the width it was drawn for", () => {
    const { container } = render(<ResumeDecks decks={[deck()]} shopping={rollup()} total={1} now={NOW} />);
    const text = container.querySelector<HTMLElement>("[data-resume-text]")!;
    expect(text.className).toContain("pl-[108px]");
    expect(text.className).toContain("min-[1000px]:pl-[116px]");
    const row = container.querySelector<HTMLElement>('a[href^="/decks/"]')!;
    expect(row.className).toContain("pr-[10px]");
    expect(row.className).toContain("min-[1180px]:pr-[18px]");
  });

  // Two-up only where two rows clear their own fixed content.
  it("stacks the rows until the column can hold two of them", () => {
    const { container } = render(
      <ResumeDecks decks={[deck(), deck({ id: "d2" })]} shopping={rollup()} total={1} now={NOW} />,
    );
    const rows = container.querySelector<HTMLElement>('a[href^="/decks/"]')!.parentElement!;
    expect(rows.className).toContain("flex-col");
    // 1180, not 1000. The pair's threshold moved when the stamp joined the meta
    // line: at 1024 each row was about 300px and the stamp was clipped away by
    // the row's own overflow.
    expect(rows.className).toContain("min-[1180px]:flex-row");
  });
});

describe("a resume row after the marks", () => {
  // The row draws the status word and nothing else about the phase: no plate
  // swap, no edge, no figure. Its stamp already says when the deck was touched.
  it("draws no mark on a deck with no version", () => {
    const { container } = render(
      <ResumeDecks decks={[deck({ id: "p", lastCommittedAt: null, statusPill: "Draft" })]} shopping={rollup()} total={1} now={NOW} />,
    );
    const chip = container.querySelector("[class*='h-[19px]']") as HTMLElement;
    expect(chip.textContent).toBe("Draft");
    expect(chip.style.borderLeft).toBe("");
    expect(chip.style.background).not.toBe("var(--bg)");
  });

  it("prints no change figure beside the stamp", () => {
    const { container } = render(
      <ResumeDecks
        decks={[deck({ id: "m", lastCommittedAt: new Date("2026-09-10T00:00:00Z"), pendingChanges: 4, versionNumber: 2 })]}
        shopping={rollup()}
        total={1}
        now={NOW}
      />,
    );
    expect(container.textContent).not.toContain("changes since");
  });
});

// The Home bracket-chip addendum, section C (R2 = C): every row is three lines, and the chip is
// marks only (R1).
describe("a resume row with the bracket chip", () => {
  const ranged = deck({ bracket: { permits: [4, 5], answered: null } });

  it("draws the chip marks only, after the pill, and speaks the pair as one phrase", () => {
    const { container } = render(<ResumeDecks decks={[ranged]} shopping={rollup()} total={1} now={NOW} />);
    const chip = container.querySelector<HTMLElement>('[data-testid="bracket-chip"]')!;
    expect(chip.getAttribute("data-bracket")).toBe("4-5");
    expect(chip.textContent).not.toContain("Optimized");
    expect(chip.closest("[aria-hidden]")).not.toBeNull();
    expect(screen.getByText("To buy").closest("[aria-hidden]")).not.toBeNull();
    const spoken = container.querySelector(".sr-only")!;
    expect(spoken.textContent).toBe("To buy, bracket Optimized or cEDH");
  });

  it("draws no chip, and leaves the pill spoken, on a deck with no analysis", () => {
    const { container } = render(<ResumeDecks decks={[deck()]} shopping={rollup()} total={1} now={NOW} />);
    expect(container.querySelector('[data-testid="bracket-chip"]')).toBeNull();
    expect(screen.getByText("To buy").closest("[aria-hidden]")).toBeNull();
  });

  it("states line two's height, so rows with and without a chip line up (N4)", () => {
    const { container } = render(<ResumeDecks decks={[deck()]} shopping={rollup()} total={1} now={NOW} />);
    const lineTwo = screen.getByText("To buy").closest("[data-resume-text] > span:nth-child(2)")!;
    expect(lineTwo.className).toContain("h-[22px]");
    expect(lineTwo.className).toContain("md:h-[24px]");
    expect(container.querySelector("a")!.className).toContain("py-[4px]");
  });

  it("draws the bar on every row, and an empty track for an empty deck (N5)", () => {
    const { container } = render(
      <ResumeDecks decks={[deck({ id: "a" }), deck({ id: "b", built: 0 })]} shopping={rollup()} total={2} now={NOW} />,
    );
    const bars = [...container.querySelectorAll<HTMLElement>("[data-resume-bar]")];
    expect(bars).toHaveLength(2);
    expect(bars.map((b) => b.style.background)).toEqual(["var(--border-strong)", "var(--border-strong)"]);
    expect(bars.map((b) => b.children.length)).toEqual([1, 0]);
  });
});
