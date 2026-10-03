import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeckCard } from "./deck-card";
import type { DeckListItem } from "../../lib/decks/read";
import { proxyCopy } from "../../lib/copy/proxies";
import { formatWhen } from "../../lib/format/when";

vi.mock("./deck-card-overflow", () => ({
  DeckCardOverflow: () => <button type="button">Actions</button>,
}));

const now = new Date("2026-09-07T12:00:00Z");
const daysBefore = (n: number) => new Date(now.getTime() - n * 86_400_000);

const deck = (over: Partial<DeckListItem> = {}): DeckListItem => ({
  id: "d1",
  name: "Atraxa, Praetors' Voice",
  createdAt: daysBefore(30),
  commanderName: "Atraxa, Praetors' Voice",
  commanderColorIdentity: ["W", "U", "B", "G"],
  commanderImageUri: "https://example.test/atraxa.jpg",
  commanderArtCropUri: "https://example.test/atraxa-crop.jpg",
  partnerName: null,
  partnerColorIdentity: null,
  folderId: null,
  folderName: null,
  built: 99,
  ownedCount: 96,
  toBuyCount: 3,
  unresolvedCount: 0,
  pendingChanges: 0,
  versionNumber: null,
  statusPill: "To buy",
  bracket: null,
  lastPlayedAt: daysBefore(2),
  lastEditedAt: new Date("2026-09-01T00:00:00Z"),
  lastCommittedAt: null,
  inUseElsewhere: 0,
  proxiedCount: 0,
  ...over,
});

describe("DeckCard", () => {
  // Three tiles in a row ending at three different heights reads as three
  // different kinds of thing. The `<li>` already stretched to the grid row; the
  // tile inside it sat at its own content height, so a deck with no detail line
  // stopped short of the one beside it that had one.
  it("fills the height of the grid row it is given", () => {
    const { container } = render(
      <DeckCard
        folders={[]}
        onCreateFolder={() => {}}
        onMove={() => {}}
        keepsFocus
        closeAfterCreate={null}
        deck={deck({ statusPill: "Complete", toBuyCount: 0, lastPlayedAt: null })}
        shopping={undefined}
        now={now}
      />,
    );

    const tile = container.querySelector("article")!;
    expect(tile.className).toContain("sm:h-full");
    expect(tile.className).toContain("flex-col");
    // The footer takes the slack rather than the art band, and its rows stay at
    // the top of it: stretched tracks would float the progress line into the
    // middle of the space the tile was given.
    const footer = container.querySelector(".deck-card-footer")!;
    expect(footer.className).toContain("flex-1");
    expect(footer.className).toContain("flex-col");
  });

  // The tile's wash is the OWNED printing's art, so the caption under it has to be the
  // name printed on that copy. A Secret Lair art under the oracle name is the pairing the
  // collection reader forbids everywhere else.
  it("captions the tile with the name printed on the copy the player owns", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({
          commanderName: "Iroas, God of Victory",
          commanderPrintedName: "Freya, Queen of the Valkyries",
        })}
        shopping={undefined} now={now} />,
    );

    expect(screen.getByText(/Freya, Queen of the Valkyries/)).toBeTruthy();
    expect(screen.queryByText(/Iroas, God of Victory/)).toBeNull();
  });

  // Absent, not null: every fixture built before the field existed omits it, and a tile
  // that printed `undefined` for them would be the regression this pairing was meant to
  // prevent.
  it("keeps the oracle name when the copy owned prints it", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck()} shopping={undefined} now={now} />,
    );

    expect(screen.getAllByText(/Atraxa, Praetors' Voice/).length).toBeGreaterThan(0);
  });

  it("shows the status, the count with its denominator, and the explaining figure", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
    );
    expect(screen.getByText("To buy")).toBeInTheDocument();
    expect(screen.getByText("99 / 99")).toBeInTheDocument();
    expect(screen.getByText("3 to buy · $18.40")).toBeInTheDocument();
    expect(screen.getByText("2 days ago")).toBeInTheDocument();
  });

  // #364. A pair's commanders take two of the hundred, so a finished pair deck
  // is 98 of 98 — a tile reading 98 / 99 would tell its owner the deck is one
  // card short, and its progress bar would stop just shy of full forever.
  it("measures a pair against 98 and a single commander against 99", () => {
    const pair = deck({ partnerName: "Kratos, Stoic Father", built: 98, statusPill: "Building" });
    const { rerender } = render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={pair} shopping={undefined} now={now} />);
    expect(screen.getByText("98 / 98")).toBeInTheDocument();

    rerender(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck({ built: 98, statusPill: "Building" })} shopping={undefined} now={now} />,
    );
    expect(screen.getByText("98 / 99")).toBeInTheDocument();
  });

  // The overage is measured off the same ceiling: 100 cards in a pair deck is
  // two over its body, not one.
  it("counts a pair's overage against 98", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ partnerName: "Kratos, Stoic Father", built: 100, statusPill: "Over" })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(screen.getByText("2 over")).toBeInTheDocument();
  });

  // `toBuyCount` is `built − ownedCount` and counts basics; the roll-up refuses
  // them, as every Shopping surface does. Printing the deck's number beside the
  // roll-up's cost would be a figure and a price covering different cards.
  it("counts the roll-up's copies, not the deck's, so the count and the cost agree", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ toBuyCount: 3 })}
        shopping={{ copies: 1, cents: 620, pricedCopies: 1 }}
        now={now}
      />,
    );
    expect(screen.getByText("1 to buy · $6.20")).toBeInTheDocument();
  });

  it("prints the copies without a cost when nothing in the deck has a price", () => {
    render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={{ copies: 3, cents: 0, pricedCopies: 0 }} now={now} />);
    expect(screen.getByText("3 to buy")).toBeInTheDocument();
  });

  // A deck whose only unowned cards are basics clears the `To buy` threshold —
  // that one counts them — and has no roll-up entry, because no Shopping
  // surface sells them. Falling back to `toBuyCount` here would print an
  // "unowned" figure that disagrees with every other surface in the app.
  it("draws no figure for a To buy deck the roll-up has nothing for", () => {
    render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck({ toBuyCount: 3 })} shopping={undefined} now={now} />);
    expect(screen.queryByText(/to buy/)).toBeNull();
  });

  it("has no call to action — the pill is the message and the tile is the target", () => {
    render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={undefined} now={now} />);
    // One link (the whole tile) and one button (the overflow). Nothing else.
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /open|build|edit/i })).toBeNull();
  });

  it("draws commander art on a New tile, because every deck has a commander", () => {
    const { container } = render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({
          statusPill: "New",
          built: 0,
          ownedCount: 0,
          toBuyCount: 0,
          lastPlayedAt: null,
          createdAt: now,
        })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(container.querySelector("[data-deck-art]")?.innerHTML).toContain("atraxa-crop.jpg");
    expect(screen.getByText("0 / 99")).toBeInTheDocument();
    expect(screen.getByText("created today")).toBeInTheDocument();
    expect(screen.queryByText(/no commander/i)).toBeNull();
  });

  // Two stated bands, chosen by the tile's own CELL rather than by a ratio or a
  // viewport. A 2.2:1 ratio plus a 104px floor made the band a function of the
  // column; a single 248 would have made it a function of nothing, and the grid
  // gives a 102px cell at 640px — beside a 262px filter column — where 248 is a
  // portrait sliver. The handoff's floor is ~330px of column and this is it.
  it("draws the cell band above its column floor and the resume band below", () => {
    const { container } = render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={undefined} now={now} />);
    const band = container.querySelector<HTMLElement>("[data-deck-art]")!;
    expect(band.className).toContain("h-[168px]");
    expect(band.className).toContain("@min-[330px]:h-[248px]");
    expect(band.className).not.toContain("aspect-[2.2/1]");
    expect(band.className).not.toContain("min-h-[104px]");

    // The tile is the container the band queries — its width IS the column.
    expect(container.querySelector("article")!.className).toContain("@container");

    const heights = Array.from(band.querySelectorAll("[data-art-wash-band]")).map((el) =>
      el.getAttribute("data-art-wash-band"),
    );
    expect(heights).toEqual(["168", "248"]);
    // One block, both bands: a px `labelAt` is the block's own height, so it does
    // not move when the band does.
    const labelAts = Array.from(band.querySelectorAll("[data-art-wash-label-at]")).map((el) =>
      el.getAttribute("data-art-wash-label-at"),
    );
    expect(labelAts).toEqual(["46", "46"]);
  });

  it("leaves a Draft tile's track empty and its last-played slot unrendered", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ statusPill: "Draft", built: 0, lastPlayedAt: null, createdAt: now })}
        shopping={undefined}
        now={now}
      />,
    );
    // The track is drawn for every status; only the fill is withheld, which is
    // what "empty track" means. A Draft tile's detail row carries its created
    // figure alone.
    expect(document.querySelector("[data-deck-bar-fill]")).toBeNull();
    expect(document.querySelector("[data-deck-bar]")).toBeTruthy();
    expect(screen.queryByText("never played")).toBeNull();
  });

  // `never played` is cut with no replacement. It filled a slot rather than
  // answering a question, and if last-played matters it belongs in the overflow
  // menu or on the deck's own page.
  it("draws nothing where never played used to sit", () => {
    render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck({ lastPlayedAt: null })} shopping={undefined} now={now} />);
    expect(screen.queryByText("never played")).toBeNull();
  });

  it("gives each status its own explaining figure", () => {
    const cases: Array<[Partial<DeckListItem>, string]> = [
      // Complete is absent from this list deliberately: `all owned` was a third
      // way of saying finished beside a full green bar and `99 / 99`, and the bar
      // and the count carry it between them. See the assertion below.
      [{ statusPill: "Unresolved", unresolvedCount: 2 }, "2 lines unresolved"],
      [{ statusPill: "Unresolved", unresolvedCount: 1 }, "1 line unresolved"],
      [{ statusPill: "Over", built: 104 }, "5 over"],
      [{ statusPill: "Building", built: 87 }, "87 / 99"],
    ];
    for (const [over, text] of cases) {
      const { unmount } = render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck(over)} shopping={undefined} now={now} />);
      expect(screen.getByText(text)).toBeInTheDocument();
      unmount();
    }
  });

  it("gives a Complete tile no detail figure at all", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ statusPill: "Complete", toBuyCount: 0, ownedCount: 99, built: 99 })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(screen.queryByText("all owned")).toBeNull();
    // The two things that say it instead are both still here.
    expect(screen.getByText("99 / 99")).toBeInTheDocument();
    expect(document.querySelector("[data-deck-bar-fill]")).not.toBeNull();
  });

  it("fills an empty detail slot with the in-use-elsewhere clause", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ statusPill: "Building", built: 87, inUseElsewhere: 3 })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(screen.getByText("3 in use elsewhere")).toBeInTheDocument();
  });

  // The clause is Building's. `Complete` lost its own figure this round, which
  // opened the fallback to it — and a finished deck can still hold a card a
  // senior deck claims, so it would have read `3 in use elsewhere` with a full
  // bar beside it.
  it("draws no clause on a Complete tile, which has no figure of its own", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ statusPill: "Complete", toBuyCount: 0, ownedCount: 99, inUseElsewhere: 3 })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(screen.queryByText("3 in use elsewhere")).toBeNull();
  });

  it("never lets the clause displace a status's own figure", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ statusPill: "Unresolved", unresolvedCount: 2, inUseElsewhere: 3 })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(screen.getByText("2 lines unresolved")).toBeInTheDocument();
    expect(screen.queryByText("3 in use elsewhere")).toBeNull();
  });

  // `detailDraft` is the literal `created today`, so it is only true on the day
  // of creation. There is no copy key for an older Draft, so it falls back to
  // its count rather than being told a date it does not have.
  it("falls back to the count for a Draft older than the day it was created", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ statusPill: "Draft", built: 0, createdAt: daysBefore(9) })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(screen.queryByText("created today")).toBeNull();
    expect(screen.getByText("0 / 99")).toBeInTheDocument();
  });

  // The identity joins it, because the block draws it and the overlay link's
  // explicit label means its descendants are never read: without it the tile
  // shows a commander and a colour a screen reader is never told.
  // One accessible representation, not two. The overlay link has no descendants,
  // so its `aria-label` is the tile's name — and the presentation it covers has
  // to be hidden or a screen reader is told the deck's identity twice, once from
  // the block and again from the link.
  it("hides the presentation the link's own name already states", () => {
    const { container } = render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
    );
    const block = container.querySelector("[data-wash-label]")!;
    const footer = container.querySelector(".deck-card-footer")!;
    expect(block).toHaveAttribute("aria-hidden", "true");
    expect(footer).toHaveAttribute("aria-hidden", "true");
    // Safe only because neither holds anything focusable. The overflow control
    // sits outside both and stays exposed, as does the link.
    expect(block.querySelector("a, button, input, [tabindex]")).toBeNull();
    expect(footer.querySelector("a, button, input, [tabindex]")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("names the whole tile for a screen reader, in the order the tile reads", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
    );
    expect(
      screen.getByRole("link", {
        name: "Atraxa, Praetors' Voice, Atraxa, Praetors' Voice, Non-red, To buy, 99 / 99, 3 to buy · $18.40, 2 days ago",
      }),
    ).toBeInTheDocument();
  });

  describe("the phase, as a word", () => {
    const committed = (over: Partial<DeckListItem> = {}) =>
      deck({ lastCommittedAt: daysBefore(4), versionNumber: 2, ...over });

    it("draws no mark on any tile", () => {
      const { container } = render(
        <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck({ statusPill: "Draft" })} shopping={undefined} now={now} />,
      );
      const chip = container.querySelector("[data-deck-chips]") as HTMLElement;
      expect(chip.style.borderLeft).toBe("");
      expect(chip.style.background).not.toBe("var(--bg)");
      expect((container.querySelector("[data-deck-bar-fill]") as HTMLElement).style.opacity).toBe("");
    });

    // THE COST R6 NAMES, PAID BACK HERE. An uncommitted deck loses the count
    // WORD in the pill, so the row beneath has to carry the count FIGURE — and
    // it is the figure that deck will draw the moment it commits.
    it("keeps a draft's count figure in the detail row", () => {
      render(
        <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck({ statusPill: "Draft", built: 104, unresolvedCount: 0 })} shopping={undefined} now={now} />,
      );
      expect(screen.getByText("5 over")).toBeInTheDocument();
    });

    it("gives a draft the To buy roll-up figure it would commit into", () => {
      render(
        <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck({ statusPill: "Draft", built: 99, ownedCount: 96 })} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
      );
      expect(screen.getByText("3 to buy · $18.40")).toBeInTheDocument();
    });

    // The defect `proxies.ts` documents, reached through the draft's figure:
    // `proxiedCount` is `copies` — the commander included — so adding it to
    // `ownedCount` fills a body slot with a proxied commander and a deck with a
    // card genuinely missing reads as finished.
    // Read through the PROXY FALLBACK, which is the one place `Complete` and
    // `To buy` diverge with no roll-up to print: the fallback draws `1 proxy`
    // for the first and deliberately nothing for the second. A fixture WITH a
    // roll-up cannot see this — `unfundedCount` keeps the answer at `To buy`
    // either way — which is how the first version of this case passed the
    // mutation it was written for.
    it("does not let a proxied commander cover a missing body card", () => {
      render(
        <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
          deck={deck({ statusPill: "Draft", built: 99, ownedCount: 98, toBuyCount: 1, proxiedCount: 1 })}
          shopping={undefined} now={now} />,
      );
      // `To buy`: a card is genuinely missing, so the slot stays empty. Reading
      // `1 proxy` here would mean the deck had been called finished.
      expect(screen.queryByText("1 proxy")).not.toBeInTheDocument();
    });

    // The seniority defect, moved into the detail row: every card owned, every
    // copy spoken for by an older deck. Without the roll-up in the figure this
    // draft draws nothing and then flips to `To buy` on its first commit.
    it("gives a draft whose copies are all spoken for its To buy figure", () => {
      render(
        <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
          deck={deck({ statusPill: "Draft", built: 99, ownedCount: 99, toBuyCount: 0 })}
          shopping={{ copies: 12, cents: 4200, pricedCopies: 12 }} now={now} />,
      );
      expect(screen.getByText("12 to buy · $42.00")).toBeInTheDocument();
    });

    // `Draft` hides the count word on every brew, so a clause keyed to the word
    // rather than the count vanished from all of them.
    it("keeps the in-use-elsewhere clause on a short draft", () => {
      render(
        <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
          deck={deck({ statusPill: "Draft", built: 47, ownedCount: 47, toBuyCount: 0, inUseElsewhere: 3 })}
          shopping={undefined} now={now} />,
      );
      expect(screen.getByText("3 in use elsewhere")).toBeInTheDocument();
    });

    it("still prints the change figure for a committed deck whose draft moved", () => {
      render(
        <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={committed({ pendingChanges: 36 })} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
      );
      expect(screen.getByText("36 changes since v2")).toBeInTheDocument();
    });
  });

  // A pair states BOTH commanders. The visible line shortens them to fit; the
  // accessible name never does, because truncation is a layout compromise rather
  // than an information one.
  it("names both commanders of a pair", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({
          commanderName: "Ishai, Ojutai Dragonspeaker",
          partnerName: "Bruse Tarl, Boorish Herder",
          built: 98,
        })}
        shopping={undefined}
        now={now}
      />,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("aria-label")).toContain(
      "Ishai, Ojutai Dragonspeaker and Bruse Tarl, Boorish Herder",
    );
    // Both, visibly too, with the `+` the spines use: the accessible name
    // naming the pair while the line named one commander gave a sighted reader
    // a different deck identity than a screen reader got.
    // Three spans, because one truncating string loses the `+` and the partner
    // in a narrow cell — so the text is matched across them.
    const subtitle = screen.getByText("Ishai, Ojutai Dragonspeaker").parentElement!;
    expect(subtitle.textContent).toContain("+");
    expect(subtitle.textContent).toContain("Bruse Tarl, Boorish Herder");
  });

  // The pair's colour is the UNION of the two identities. A tile printing the
  // primary commander's colour alone would tell its owner a four-colour deck is
  // two — and every earlier pair test left `partnerColorIdentity` null, so that
  // regression passed them all.
  it("words a pair's colour as the union of both identities", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({
          commanderName: "Ishai, Ojutai Dragonspeaker",
          commanderColorIdentity: ["W", "U"],
          partnerName: "Bruse Tarl, Boorish Herder",
          partnerColorIdentity: ["R", "W"],
          built: 98,
        })}
        shopping={undefined}
        now={now}
      />,
    );
    const link = screen.getByRole("link");
    // W+U ∪ R+W is the three-colour pair name. The primary's identity alone
    // would word itself `Azorius`, which is the regression this pins.
    expect(link.getAttribute("aria-label")).toContain("Jeskai");
    expect(link.getAttribute("aria-label")).not.toContain("Azorius");
  });

  // The detail figure moves between the meta row and the detail row by grid
  // area, never by rendering twice: a doubled node reads the figure twice to a
  // screen reader and passes a property check on both columns while being wrong.
  it("renders the phone and desktop layouts from one set of nodes", () => {
    const { container } = render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
    );
    expect(screen.getAllByText("3 to buy · $18.40")).toHaveLength(1);
    expect(container.querySelectorAll("[data-deck-art]")).toHaveLength(1);
  });

  // §4 of the handoff: the wash owns one band, carrying the name, the subtitle
  // and the status chip. Everything else sits below a divider on flat ground.
  it("prints the commander name and its colour under the deck name, in the band", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ name: "Blink and you'll miss it", commanderName: "Yuriko, the Tiger's Shadow" })}
        shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }}
        now={now}
      />,
    );
    // One line carrying the colour the pips used to draw, in TWO spans: the
    // colour is what the pips came off for, so the name is the half that gives
    // and the colour never truncates.
    const name = screen.getByText("Yuriko, the Tiger's Shadow");
    expect(name.className).toContain("truncate");
    const colour = name.nextElementSibling as HTMLElement;
    expect(colour.className).toContain("flex-none");
    expect(colour.textContent).toContain("·");
  });

  it("separates the band from the data with a divider", () => {
    const { container } = render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
    );
    const footer = container.querySelector(".deck-card-footer") as HTMLElement;
    expect(footer.style.borderTop).toBe("1px solid var(--border)");
  });
});

describe("DeckCard — the progress sentence", () => {
  // `[chip] [bar] [count]`, read left to right. The chip is a status and the bar
  // is a status, so they belong on one row — and moving the chip off the art is
  // what leaves the block above carrying identity alone, which is what drops the
  // band's `labelAt` from 78 to 46 and turns 32px of darkness back into art.
  it("moves the status chip off the art and onto the bar's row", () => {
    const { container } = render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={undefined} now={now} />);
    const band = container.querySelector<HTMLElement>("[data-deck-art]")!;
    expect(band.textContent).not.toContain("To buy");

    const chip = screen.getByText("To buy");
    // The pill sits in the chips row, which it shares with the bracket chip and the notice.
    expect(chip.parentElement!.hasAttribute("data-deck-chips")).toBe(true);
    expect(chip.className).not.toContain("absolute");
    expect(container.querySelector(".deck-card-footer")?.contains(chip)).toBe(true);
  });

  // The pips go, not the worded colour. `Green` beside a green square is the same
  // redundancy one layer down, and at a 189px column the word is what stays
  // legible — an earlier round had this backwards.
  it("draws no identity pips", () => {
    const { container } = render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={undefined} now={now} />);
    const footer = container.querySelector<HTMLElement>(".deck-card-footer")!;
    expect(footer.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
    expect(footer.className).not.toContain("pips");
  });
});

describe("DeckCard — the bracket chip", () => {
  const card = (bracket: DeckListItem["bracket"]) =>
    render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck({ bracket })} shopping={undefined} now={now} />);

  // Round 0 §5: "a deck we have not read draws no chip", not a dash.
  it("draws no chip for a deck that has not been read", () => {
    card(null);
    expect(screen.queryByTestId("bracket-chip")).toBeNull();
  });

  it("draws the chip immediately after the status pill, in the same cell", () => {
    card({ permits: [3], answered: null });
    const chip = screen.getByTestId("bracket-chip");
    const status = screen.getByText("To buy");
    expect(chip.parentElement).toBe(status.parentElement);
    expect(status.nextElementSibling).toBe(chip);
    expect(chip.textContent).toContain("Upgraded");
  });

  // The footer is aria-hidden, so the link's name has to carry the chip or it is visual-only.
  it("names the bracket in the tile link's accessible name", () => {
    card({ permits: [1, 2], answered: null });
    expect(screen.getByRole("link", { name: /To buy, bracket Exhibition or Core,/ })).toBeTruthy();
  });

  it("draws a range as one chip naming both brackets, and an answered range as the answer", () => {
    const { unmount } = card({ permits: [1, 2], answered: null });
    expect(screen.getByTestId("bracket-chip").textContent).toContain("Exhibition or Core");
    expect(screen.getByTestId("bracket-chip").textContent).not.toContain("Split");
    expect(screen.getAllByTestId("bracket-mark")).toHaveLength(2);
    unmount();
    card({ permits: [1, 2], answered: 2 });
    expect(screen.getByTestId("bracket-chip").textContent).toContain("Core");
    expect(screen.getAllByTestId("bracket-mark")).toHaveLength(1);
  });
});

describe("DeckCard — the footer's three rows", () => {
  // THREE FIXED ROWS (deck notices HANDOFF §1a): the detail row is drawn on every tile, empty
  // when there is nothing to put in it, so every tile on /decks is one height.
  it("draws the detail row on a tile with no figure and no date, empty", () => {
    const { container } = render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ statusPill: "Building", built: 87, lastPlayedAt: null, inUseElsewhere: 0 })}
        shopping={undefined}
        now={now}
      />,
    );
    const row = container.querySelector<HTMLElement>("[data-deck-detail]")!;
    expect(row.className).toContain("h-[14px]");
    expect(row.textContent).toBe("");
  });

  it("puts a figure in it when there is one", () => {
    const { container } = render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck({ statusPill: "Over", built: 104 })} shopping={undefined} now={now} />,
    );
    expect(container.querySelector("[data-deck-detail]")!.textContent).toContain("5 over");
  });

  // H6: last played at BOTH widths now, so it carries no `sm:` gate.
  it("draws last played at every width", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ statusPill: "Building", built: 87, lastPlayedAt: daysBefore(2) })} shopping={undefined} now={now} />,
    );
    const played = screen.getByText(formatWhen(daysBefore(2), now));
    expect(played.className).not.toContain("hidden");
  });

  // A New deck CAN have a logged game (the Games panel offers the form on an empty deck), and its
  // detail row carries `created today` alone.
  it("draws no last played for a New deck with a logged game", () => {
    const { container } = render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({
          statusPill: "New",
          built: 0,
          createdAt: daysBefore(30),
          lastPlayedAt: daysBefore(2),
        })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(container.querySelector("[data-deck-detail]")!.textContent).not.toContain(formatWhen(daysBefore(2), now));
  });
});

describe("the tile's proxy line", () => {
  it("draws it on a Complete deck, in the detail slot", () => {
    // The deck page shows the marks; the grid shows a bare pill. Two `Complete`
    // decks — one cardboard, one half paper — are otherwise identical here.
    render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} now={now} deck={deck({ statusPill: "Complete", proxiedCount: 7 })} shopping={undefined} />);
    expect(screen.getByText(proxyCopy.deckCard.line(7))).toBeTruthy();
  });

  it("is absent at zero", () => {
    render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} now={now} deck={deck({ statusPill: "Complete", proxiedCount: 0 })} shopping={undefined} />);
    expect(screen.queryByText(/proxies/)).toBeNull();
  });

  it("yields to the clause that says what is holding the deck up", () => {
    // `3 in use elsewhere` answers a question; a proxy is not holding anything up.
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} now={now}
        deck={deck({ statusPill: "Building", built: 87, inUseElsewhere: 3, proxiedCount: 2 })}
        shopping={undefined}
      />,
    );
    expect(screen.queryByText(proxyCopy.deckCard.line(2))).toBeNull();
  });

  it("takes the slot on a Building deck with nothing in use elsewhere", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} now={now}
        deck={deck({ statusPill: "Building", built: 87, inUseElsewhere: 0, proxiedCount: 2 })}
        shopping={undefined}
      />,
    );
    expect(screen.getByText(proxyCopy.deckCard.line(2))).toBeTruthy();
  });
});

describe("the tile's proxy line yields where the slot is deliberately empty", () => {
  it("does not print over a To buy deck with no roll-up", () => {
    // A deck whose only missing cards are BASICS has a `To buy` pill and no
    // roll-up entry, so `statusDetailFor` returns null on purpose — and printing
    // a proxy count there takes a slot that is meant to stay empty.
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} now={now}
        deck={deck({ statusPill: "To buy", proxiedCount: 3 })}
        shopping={undefined}
      />,
    );
    expect(screen.queryByText(proxyCopy.deckCard.line(3))).toBeNull();
  });
});

describe("DeckCard — the notice mark (tile marker addendum)", () => {
  const card = (over: Partial<DeckListItem>) =>
    render(<DeckCard folders={[]} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} deck={deck(over)} shopping={undefined} now={now} />);
  const mark = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-notice-mark]");

  it("draws no mark for a deck with no notice", () => {
    const { container } = card({ notice: null });
    expect(mark(container)).toBeNull();
    expect(container.querySelector("[data-notice-link]")).toBeNull();
  });

  it("draws unread data as one --fact mark after the chip, and names it in the link", () => {
    const { container } = card({ bracket: { permits: [3], answered: null }, notice: { kind: "unread", count: 3 } });
    const row = container.querySelector("[data-deck-chips]")!;
    const m = mark(container)!;
    expect(m.dataset.noticeMark).toBe("unread");
    expect(m.textContent).toBe("!");
    expect(m.style.color).toBe("var(--fact)");
    expect(row.lastElementChild!.contains(m)).toBe(true);
    expect(screen.getByRole("link", { name: /, bracket \w+, 3 notices since this deck was analyzed,/ })).toBeTruthy();
  });

  // H7 and H8: legality is red, read or unread, and there is no read look on the tile.
  it("draws legality as one --danger mark in the chip's slot, read or unread alike", () => {
    const unread = card({ bracket: null, notice: { kind: "notLegalUnread", count: 2, dataUnread: 0 } });
    const a = mark(unread.container)!;
    expect(a.dataset.noticeMark).toBe("notLegal");
    expect(a.style.color).toBe("var(--danger)");
    expect(a.style.border).toContain("var(--danger) 70%");
    expect(a.style.background).toBe("color-mix(in oklab, var(--danger) 14%, var(--surface-inset))");
    expect(screen.getByRole("link", { name: /To buy, 2 cards not legal in this deck,/ })).toBeTruthy();
    const drawn = a.outerHTML;
    unread.unmount();
    const read = card({ bracket: null, notice: { kind: "notLegalRead", count: 2, dataUnread: 0 } });
    expect(mark(read.container)!.outerHTML).toBe(drawn);
  });

  // F20: both kinds are ONE red mark, and the link names both.
  it("draws both kinds as one red mark, and the link names both counts", () => {
    const { container } = card({ bracket: null, notice: { kind: "notLegalUnread", count: 1, dataUnread: 3 } });
    expect(container.querySelectorAll("[data-notice-mark]")).toHaveLength(1);
    expect(mark(container)!.style.color).toBe("var(--danger)");
    expect(screen.getByRole("link", { name: /1 card not legal in this deck, 3 notices since this deck was analyzed/ })).toBeTruthy();
  });

  // F19: a second link over the cover link, not a forwarded click, out of the tab order and the tree.
  it("lifts the mark as a second link, to the deck's Notices sheet, out of the tab order and the accessibility tree", () => {
    const { container } = card({ notice: { kind: "unread", count: 1 } });
    const link = container.querySelector<HTMLAnchorElement>("[data-notice-link]")!;
    expect(link.tagName).toBe("A");
    // The mark asks for the sheet (Hugh's staging walk, 2026-09-26): landing on the deck with no word
    // of the notices left the reader hunting for what the mark was pointing at.
    expect(link.getAttribute("href")).toBe(`/decks/${deck({}).id}?notices=1`);
    expect(link.getAttribute("tabindex")).toBe("-1");
    expect(link.getAttribute("aria-hidden")).toBe("true");
    expect(link.className).toMatch(/\brelative\b/);
    expect(link.className).toMatch(/\bz-10\b/);
    expect(link.contains(mark(container))).toBe(true);
    // The cover link is still the tile's one named target.
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  // The one yield: only a RANGE beside a mark draws its marks-only twin, in one window for both kinds.
  it("mounts the marks-only twin for a range beside a mark, and for nothing else", () => {
    const faces = (c: HTMLElement) => c.querySelectorAll("[data-testid='bracket-chip']").length;
    const range = card({ bracket: { permits: [1, 2], answered: null }, notice: { kind: "notLegalUnread", count: 1, dataUnread: 0 } });
    expect(faces(range.container)).toBe(2);
    const window = range.container.innerHTML.match(/@min-\[330px\]:@max-\[(\d+)px\]:hidden/)?.[1];
    expect(window).toBeTruthy();
    range.unmount();
    const data = card({ bracket: { permits: [1, 2], answered: null }, notice: { kind: "unread", count: 99 } });
    expect(data.container.innerHTML).toContain(`@min-[330px]:@max-[${window}px]:hidden`);
    data.unmount();
    const single = card({ bracket: { permits: [3], answered: null }, notice: { kind: "notLegalUnread", count: 1, dataUnread: 0 } });
    expect(faces(single.container)).toBe(1);
    single.unmount();
    const quiet = card({ bracket: { permits: [1, 2], answered: null }, notice: null });
    expect(faces(quiet.container)).toBe(1);
  });
});
