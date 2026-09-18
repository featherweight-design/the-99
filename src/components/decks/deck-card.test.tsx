import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeckCard } from "./deck-card";
import type { DeckListItem } from "../../lib/decks/read";
import { proxyCopy } from "../../lib/copy/proxies";

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
        say={() => {}}
        onMoved={() => {}}
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
    expect(footer.className).toContain("content-start");
  });

  it("shows the status, the count with its denominator, and the explaining figure", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
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
    const { rerender } = render(<DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={pair} shopping={undefined} now={now} />);
    expect(screen.getByText("98 / 98")).toBeInTheDocument();

    rerender(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck({ built: 98, statusPill: "Building" })} shopping={undefined} now={now} />,
    );
    expect(screen.getByText("98 / 99")).toBeInTheDocument();
  });

  // The overage is measured off the same ceiling: 100 cards in a pair deck is
  // two over its body, not one.
  it("counts a pair's overage against 98", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
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
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ toBuyCount: 3 })}
        shopping={{ copies: 1, cents: 620, pricedCopies: 1 }}
        now={now}
      />,
    );
    expect(screen.getByText("1 to buy · $6.20")).toBeInTheDocument();
  });

  it("prints the copies without a cost when nothing in the deck has a price", () => {
    render(<DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={{ copies: 3, cents: 0, pricedCopies: 0 }} now={now} />);
    expect(screen.getByText("3 to buy")).toBeInTheDocument();
  });

  // A deck whose only unowned cards are basics clears the `To buy` threshold —
  // that one counts them — and has no roll-up entry, because no Shopping
  // surface sells them. Falling back to `toBuyCount` here would print an
  // "unowned" figure that disagrees with every other surface in the app.
  it("draws no figure for a To buy deck the roll-up has nothing for", () => {
    render(<DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck({ toBuyCount: 3 })} shopping={undefined} now={now} />);
    expect(screen.queryByText(/to buy/)).toBeNull();
  });

  it("has no call to action — the pill is the message and the tile is the target", () => {
    render(<DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={undefined} now={now} />);
    // One link (the whole tile) and one button (the overflow). Nothing else.
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /open|build|edit/i })).toBeNull();
  });

  it("draws commander art on a Draft tile, because every deck has a commander", () => {
    const { container } = render(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({
          statusPill: "Draft",
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
    const { container } = render(<DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={undefined} now={now} />);
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
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
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
    render(<DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck({ lastPlayedAt: null })} shopping={undefined} now={now} />);
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
      const { unmount } = render(<DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck(over)} shopping={undefined} now={now} />);
      expect(screen.getByText(text)).toBeInTheDocument();
      unmount();
    }
  });

  it("gives a Complete tile no detail figure at all", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
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
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
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
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ statusPill: "Complete", toBuyCount: 0, ownedCount: 99, inUseElsewhere: 3 })}
        shopping={undefined}
        now={now}
      />,
    );
    expect(screen.queryByText("3 in use elsewhere")).toBeNull();
  });

  it("never lets the clause displace a status's own figure", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
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
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
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
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
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
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
    );
    expect(
      screen.getByRole("link", {
        // The base fixture has never committed, so its status is followed by
        // the phase — the mark is drawn on the pill and the name says so where
        // it is drawn.
        name: "Atraxa, Praetors' Voice, Atraxa, Praetors' Voice, Non-red, To buy, not committed yet, 99 / 99, 3 to buy · $18.40, 2 days ago",
      }),
    ).toBeInTheDocument();
  });

  describe("the deck-state marks", () => {
    // A deck with a version behind it and nothing pending: the plain tile, and
    // the control every case below is read against.
    const committed = (over: Partial<DeckListItem> = {}) =>
      deck({ lastCommittedAt: daysBefore(4), versionNumber: 2, ...over });

    it("draws the hollow plate for a deck that has never committed", () => {
      const { container } = render(
        <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={undefined} now={now} />,
      );
      const chip = container.querySelector("[class*='grid-area:chip']") as HTMLElement;
      // `--bg` itself, opaque. A transparent chip breaks the art-wash amendment
      // on the one surface that puts this pill on a wash.
      expect(chip.style.background).toBe("var(--bg)");
      expect(chip.style.borderLeft).toBe("");
    });

    it("draws the pending edge for a committed deck whose draft has moved", () => {
      const { container } = render(
        <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={committed({ pendingChanges: 36 })} shopping={undefined} now={now} />,
      );
      const chip = container.querySelector("[class*='grid-area:chip']") as HTMLElement;
      expect(chip.style.borderLeft).toBe("2px solid var(--fg)");
      // The plate keeps its status tint: this is a deck, not a plan.
      expect(chip.style.background).toContain("color-mix");
    });

    it("draws neither on a committed deck with a clean draft", () => {
      const { container } = render(
        <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={committed()} shopping={undefined} now={now} />,
      );
      const chip = container.querySelector("[class*='grid-area:chip']") as HTMLElement;
      expect(chip.style.borderLeft).toBe("");
      expect(chip.style.background).not.toBe("var(--bg)");
    });

    it("halves the bar for a plan and leaves a deck's alone", () => {
      const { container: plan } = render(
        <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={undefined} now={now} />,
      );
      expect((plan.querySelector("[data-deck-bar-fill]") as HTMLElement).style.opacity).toBe("0.5");
      const { container: real } = render(
        <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={committed()} shopping={undefined} now={now} />,
      );
      expect((real.querySelector("[data-deck-bar-fill]") as HTMLElement).style.opacity).toBe("");
    });

    // The change figure OUTRANKS the count figures while a draft is open: the
    // roll-up is what this tile would otherwise print, and mid-edit it is the
    // figure the reader already knows.
    it("prints the change figure in place of the status figure", () => {
      render(
        <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={committed({ pendingChanges: 36 })} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
      );
      expect(screen.getByText("36 changes since v2")).toBeInTheDocument();
      expect(screen.queryByText(/3 to buy/)).not.toBeInTheDocument();
    });

    // The ONE exception, and the reason the shipped cascade already ranks an
    // unresolved line above shopping: it is not a consequence of editing.
    it("keeps the unresolved figure, which is not a consequence of editing", () => {
      render(
        <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={committed({ pendingChanges: 36, statusPill: "Unresolved", unresolvedCount: 2 })} shopping={undefined} now={now} />,
      );
      expect(screen.getByText("2 lines unresolved")).toBeInTheDocument();
      expect(screen.queryByText(/36 changes/)).not.toBeInTheDocument();
    });

    it("names each mark after the status it is drawn on", () => {
      const { unmount } = render(
        <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={committed({ pendingChanges: 36 })} shopping={undefined} now={now} />,
      );
      expect(screen.getByRole("link").getAttribute("aria-label"))
        .toContain("To buy, pending changes, 99 / 99");
      unmount();
      render(
        <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={undefined} now={now} />,
      );
      expect(screen.getByRole("link").getAttribute("aria-label"))
        .toContain("To buy, not committed yet, 99 / 99");
    });

    // The pill's own `sr-only` mark would be a SECOND announcement of one fact,
    // and what prevents it is the footer's `aria-hidden` — so that is what this
    // asserts. Reading the link's `aria-label` cannot: an `sr-only` span never
    // contributes to an explicit label, so the case would pass with the
    // `aria-hidden` removed and the duplication live. Verified by that mutation.
    it("keeps the pill's own mark out of the name, which states it once", () => {
      const { container } = render(
        <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={committed({ pendingChanges: 36 })} shopping={undefined} now={now} />,
      );
      const chip = container.querySelector("[class*='grid-area:chip']") as HTMLElement;
      expect(chip.textContent).toContain("pending changes, not yet a version");
      expect(chip.closest("[aria-hidden='true']")).not.toBeNull();
      const name = screen.getByRole("link").getAttribute("aria-label") ?? "";
      expect(name.match(/pending changes/g)?.length).toBe(1);
    });
  });

  // A pair states BOTH commanders. The visible line shortens them to fit; the
  // accessible name never does, because truncation is a layout compromise rather
  // than an information one.
  it("names both commanders of a pair", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
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
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
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
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
    );
    expect(screen.getAllByText("3 to buy · $18.40")).toHaveLength(1);
    expect(container.querySelectorAll("[data-deck-art]")).toHaveLength(1);
  });

  // §4 of the handoff: the wash owns one band, carrying the name, the subtitle
  // and the status chip. Everything else sits below a divider on flat ground.
  it("prints the commander name and its colour under the deck name, in the band", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
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
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={{ copies: 3, cents: 1840, pricedCopies: 3 }} now={now} />,
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
    const { container } = render(<DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={undefined} now={now} />);
    const band = container.querySelector<HTMLElement>("[data-deck-art]")!;
    expect(band.textContent).not.toContain("To buy");

    const chip = screen.getByText("To buy");
    expect(chip.className).toContain("[grid-area:chip]");
    expect(chip.className).not.toContain("absolute");
    expect(container.querySelector(".deck-card-footer")?.contains(chip)).toBe(true);
  });

  // The pips go, not the worded colour. `Green` beside a green square is the same
  // redundancy one layer down, and at a 189px column the word is what stays
  // legible — an earlier round had this backwards.
  it("draws no identity pips", () => {
    const { container } = render(<DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck()} shopping={undefined} now={now} />);
    const footer = container.querySelector<HTMLElement>(".deck-card-footer")!;
    expect(footer.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
    expect(footer.className).not.toContain("pips");
  });
});

describe("DeckCard — the footer's second row", () => {
  // Declared unconditionally it cost a blank strip plus the row gap on every
  // tile with nothing to put there — most of them — and taller tiles for an
  // empty area is the opposite of what this round is for.
  it("declares no second row when there is no figure and no date", () => {
    const { container } = render(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({ statusPill: "Building", built: 87, lastPlayedAt: null, inUseElsewhere: 0 })}
        shopping={undefined}
        now={now}
      />,
    );
    const footer = container.querySelector<HTMLElement>(".deck-card-footer")!;
    expect(footer.className).toContain("[grid-template-areas:'chip_bar_count']");
    expect(footer.className).not.toContain("detail_detail_detail");
  });

  it("declares it when a figure is there to go in it", () => {
    const { container } = render(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} deck={deck({ statusPill: "Over", built: 104 })} shopping={undefined} now={now} />,
    );
    const footer = container.querySelector<HTMLElement>(".deck-card-footer")!;
    expect(footer.className).toContain("detail_detail_detail");
    expect(screen.getByText("5 over")).toBeInTheDocument();
  });

  // A Draft CAN have a logged game — the Games panel offers the form on an empty
  // deck — and a Draft never draws last played, because its detail row carries
  // `created today` alone. Two separate conditions gave that deck an empty second
  // row at `sm`; one figure decides both the template and the render.
  it("declares no second row for a Draft with a logged game", () => {
    const { container } = render(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null}
        deck={deck({
          statusPill: "Draft",
          built: 0,
          createdAt: daysBefore(30),
          lastPlayedAt: daysBefore(2),
        })}
        shopping={undefined}
        now={now}
      />,
    );
    const footer = container.querySelector<HTMLElement>(".deck-card-footer")!;
    expect(footer.className).toContain("[grid-template-areas:'chip_bar_count']");
    expect(footer.className).not.toContain("played");
  });
});

describe("the tile's proxy line", () => {
  it("draws it on a Complete deck, in the detail slot", () => {
    // The deck page shows the marks; the grid shows a bare pill. Two `Complete`
    // decks — one cardboard, one half paper — are otherwise identical here.
    render(<DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} now={now} deck={deck({ statusPill: "Complete", proxiedCount: 7 })} shopping={undefined} />);
    expect(screen.getByText(proxyCopy.deckCard.line(7))).toBeTruthy();
  });

  it("is absent at zero", () => {
    render(<DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} now={now} deck={deck({ statusPill: "Complete", proxiedCount: 0 })} shopping={undefined} />);
    expect(screen.queryByText(/proxies/)).toBeNull();
  });

  it("yields to the clause that says what is holding the deck up", () => {
    // `3 in use elsewhere` answers a question; a proxy is not holding anything up.
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} now={now}
        deck={deck({ statusPill: "Building", built: 87, inUseElsewhere: 3, proxiedCount: 2 })}
        shopping={undefined}
      />,
    );
    expect(screen.queryByText(proxyCopy.deckCard.line(2))).toBeNull();
  });

  it("takes the slot on a Building deck with nothing in use elsewhere", () => {
    render(
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} now={now}
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
      <DeckCard folders={[]} onCreateFolder={() => {}} say={() => {}} onMoved={() => {}} keepsFocus closeAfterCreate={null} now={now}
        deck={deck({ statusPill: "To buy", proxiedCount: 3 })}
        shopping={undefined}
      />,
    );
    expect(screen.queryByText(proxyCopy.deckCard.line(3))).toBeNull();
  });
});
