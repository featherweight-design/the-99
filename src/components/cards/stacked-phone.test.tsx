// Stacked sheets on the phone (R1): a card opened from a sheet replaces it rather than stepping
// down beneath it, and the ✕ becomes the `← {sheet}` pill. jsdom matches no media query, so every
// component here takes its phone branch.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import type { BrowseCard } from "../../lib/collection/browse";
import { cardSheetCopy } from "../../lib/copy/card-carousel";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../lib/swaps/actions", () => ({}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const { CardDetailProvider, CardDetailTrigger, useCardDetail, STACK_DROP_MS } = await import("./card-detail-provider");
const { ModalChrome } = await import("../decks/receipt-modal");

const birds: BrowseCard = {
  oracleId: "o-birds", name: "Birds of Paradise", typeLine: "Creature", manaCost: "{G}", cmc: 1, oracleText: null,
  keywords: [], rarity: "rare", colorIdentity: ["G"], imageUri: null, printedName: null, quantity: 2, printings: [],
  setCodes: [], primarySetCode: "", preferredPrinting: null, commanderLegal: true, hasDecks: true,
};

function draw(onCloseSheet = vi.fn()) {
  return render(
    <CardDetailProvider fetchCard={async () => birds}>
      <ModalChrome title="Game changers" closeLabel="Close game changers" onClose={onCloseSheet} width={760}>
        <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">open birds</CardDetailTrigger>
      </ModalChrome>
    </CardDetailProvider>,
  );
}

async function openFromSheet() {
  await act(async () => {
    fireEvent.click(screen.getByText("open birds"));
  });
}

// A card over a sheet drops for STACK_DROP_MS on the phone before it goes.
const landed = () => act(() => new Promise<void>((r) => { setTimeout(r, STACK_DROP_MS); }));

const cardDialog = () => document.querySelector('[aria-labelledby="card-modal-title"]') as HTMLElement;
const pill = () => screen.getByTestId("card-modal-back-mobile");

describe("a card opened from a sheet, on the phone", () => {
  it("draws at the unstacked geometry, with no phone offset class on the dialog", async () => {
    draw();
    await openFromSheet();
    expect(cardDialog().className).not.toMatch(/max-md:!h-\[calc/);
  });

  it("puts the way back in the ✕'s slot as `← {sheet}`, named in full, with no ✕ beside it", async () => {
    draw();
    await openFromSheet();
    expect(pill()).toHaveTextContent("Game changers");
    expect(pill()).toHaveAccessibleName(cardSheetCopy.back.a11y("Game changers"));
    expect(pill().querySelector('[aria-hidden="true"]')).toHaveTextContent("←");
    expect(screen.queryByRole("button", { name: "Close card details" })).toBeNull();
  });

  it("caps the pill at 354 with no counter beside it", async () => {
    draw();
    await openFromSheet();
    expect(pill()).toHaveClass("max-w-[min(354px,calc(100%-36px))]");
  });

  it("hands focus to the pill on open", async () => {
    draw();
    await openFromSheet();
    expect(document.activeElement).toBe(pill());
  });

  it("goes straight back to the sheet from the full state, skipping the teaser", async () => {
    draw();
    await openFromSheet();
    fireEvent.click(screen.getByRole("button", { name: /Show all details/ }));
    expect(screen.getByTestId("card-sheet")).toHaveAttribute("data-sheet", "full");
    await act(async () => {
      fireEvent.click(pill());
    });
    await landed();
    expect(cardDialog()).toBeNull();
    expect(screen.getByTestId("receipt-modal")).toBeInTheDocument();
  });

  it("peels one rung per Escape: full, then the teaser, then the card", async () => {
    draw();
    await openFromSheet();
    fireEvent.click(screen.getByRole("button", { name: /Show all details/ }));
    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(screen.getByTestId("card-sheet")).toHaveAttribute("data-sheet", "teaser");
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    await landed();
    expect(cardDialog()).toBeNull();
    expect(screen.getByTestId("receipt-modal")).toBeInTheDocument();
  });

  it("hands focus back to the opener inside the sheet on the way back", async () => {
    draw();
    screen.getByText("open birds").focus();
    await openFromSheet();
    expect(document.activeElement).toBe(pill());
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    await landed();
    expect(cardDialog()).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("open birds"));
  });

  it("hands focus back to the opener even when the press focused nothing, as in Safari", async () => {
    draw();
    // A Safari click focuses no button, so the dialog's own capture would find <body>.
    (document.activeElement as HTMLElement | null)?.blur();
    await openFromSheet();
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    await landed();
    expect(cardDialog()).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("open birds"));
  });

  it("hides the sheet underneath while the card is up, and draws it again after", async () => {
    draw();
    const under = () => screen.getByTestId("receipt-modal").parentElement as HTMLElement;
    expect(under()).not.toHaveAttribute("aria-hidden");
    await openFromSheet();
    expect(under()).toHaveAttribute("aria-hidden", "true");
    expect(under().style.opacity).toBe("0");
    expect(under().style.pointerEvents).toBe("none");
    // Not inert: an inert sheet refuses the focus the card hands back to its opener as it closes.
    expect(under()).not.toHaveAttribute("inert");
    await act(async () => { fireEvent.click(pill()); });
    await landed();
    expect(under()).not.toHaveAttribute("aria-hidden");
    expect(under().style.opacity).toBe("");
    expect(under().style.pointerEvents).toBe("");
  });

  it("offers no Find a deck: nothing in a stacked card opens a further layer", async () => {
    draw();
    await openFromSheet();
    expect(screen.queryAllByTestId("fits-door")).toHaveLength(0);
  });
});

describe("a card opened from the page", () => {
  it("keeps its ✕ and its Find a deck", async () => {
    render(
      <CardDetailProvider fetchCard={async () => birds}>
        <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">open birds</CardDetailTrigger>
      </CardDetailProvider>,
    );
    await openFromSheet();
    expect(screen.getAllByRole("button", { name: "Close card details" }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("card-modal-back-mobile")).toBeNull();
    expect(screen.getAllByTestId("fits-door").length).toBeGreaterThan(0);
  });
});

/** A sheet opened OVER the open card, as the stand-ins sheet is from its door. */
function OverCard() {
  const { registerSheet } = useCardDetail();
  useEffect(() => registerSheet("Cheaper stand-ins", undefined, true), [registerSheet]);
  return null;
}

describe("the way back through three layers (page · card · sheet · card)", () => {
  it("gives each card its own opener, so the first card still hands focus to its trigger", async () => {
    const view = (sheet: boolean) => (
      <CardDetailProvider fetchCard={async () => birds}>
        <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">page trigger</CardDetailTrigger>
        {sheet ? (
          <>
            <OverCard />
            <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">sheet trigger</CardDetailTrigger>
          </>
        ) : null}
      </CardDetailProvider>
    );
    const { rerender } = render(view(false));
    // Nothing focused on a press, as in Safari, so only the provider's opener can find the way back.
    (document.activeElement as HTMLElement | null)?.blur();
    await act(async () => { fireEvent.click(screen.getByText("page trigger")); });
    await act(async () => rerender(view(true)));
    await act(async () => { fireEvent.click(screen.getByText("sheet trigger")); });
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    await landed();
    await act(async () => rerender(view(false)));
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(document.querySelector('[aria-labelledby^="card-modal-title"]')).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("page trigger"));
  });
});

describe("paging keeps focus in the card", () => {
  it("never hands focus to the opener while paging, only when the card closes", async () => {
    const cards: Record<string, BrowseCard> = {
      "o-a": { ...birds, oracleId: "o-a", name: "Card A" },
      "o-b": { ...birds, oracleId: "o-b", name: "Card B" },
    };
    render(
      <CardDetailProvider fetchCard={async (id) => cards[id] ?? null}>
        <CardDetailTrigger oracleId="o-a" name="Card A" siblings={["o-a", "o-b"]}>open a</CardDetailTrigger>
      </CardDetailProvider>,
    );
    const opener = screen.getByText("open a");
    const focused: string[] = [];
    opener.addEventListener("focus", () => focused.push("opener"));
    await act(async () => { fireEvent.click(opener); });
    const next = screen.getAllByRole("button", { name: "Next card" })[0];
    await act(async () => { fireEvent.click(next); });
    expect(document.getElementById("card-modal-title")).toHaveTextContent("Card B");
    expect(focused).toEqual([]);
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(focused).toEqual(["opener"]);
  });
});

describe("a list sheet over a card, on the phone (call 7)", () => {
  it("draws `← {card}` in its head, named for the card, with no × beside it", () => {
    const onClose = vi.fn();
    render(
      <CardDetailProvider fetchCard={async () => birds}>
        <ModalChrome
          title="Cheaper stand-ins"
          closeLabel="Close cheaper stand-ins"
          onClose={onClose}
          width={560}
          overCard={{ name: "Plateau", backAria: "Back to Plateau" }}
        >
          <p>rows</p>
        </ModalChrome>
      </CardDetailProvider>,
    );
    const sheet = screen.getByTestId("receipt-modal");
    const back = screen.getByRole("button", { name: "Back to Plateau" });
    expect(back).toHaveTextContent("Plateau");
    // At both widths now: not the desktop-only class it shipped with.
    expect(back).not.toHaveClass("hidden");
    expect(screen.queryByRole("button", { name: "Close cheaper stand-ins" })).toBeNull();
    expect(sheet.textContent).not.toContain("×");
    // At 52 over the card, as any sheet, not the retired 96.
    expect(sheet).toHaveClass("h-[calc(100%-52px)]");
    fireEvent.click(back);
    expect(onClose).toHaveBeenCalled();
  });
});

describe("a stacked stand-in's Take on the phone (call 9)", () => {
  const take = vi.fn();
  function FooterSheet() {
    const { registerSheet } = useCardDetail();
    useEffect(
      () => registerSheet("Cheaper stand-ins", (oracleId, layout) => {
        if (oracleId !== "o-birds") return null;
        if (layout === "teaserNote") return <span>in place of Ad Nauseam</span>;
        if (layout === "teaserAction" || layout === "foot") {
          return <button type="button" onClick={take}>{`Take Birds (${layout})`}</button>;
        }
        return <button type="button">Take (row)</button>;
      }),
      [registerSheet],
    );
    return <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">open birds</CardDetailTrigger>;
  }
  const mountTake = async () => {
    render(
      <CardDetailProvider fetchCard={async () => ({ ...birds, oracleText: "{T}: Add one mana of any color." })}>
        <FooterSheet />
      </CardDetailProvider>,
    );
    await openFromSheet();
  };

  it("shares the teaser's foot row with All details, its note in the oracle's third line", async () => {
    await mountTake();
    expect(screen.getByTestId("teaser-footer-note")).toHaveTextContent("in place of Ad Nauseam");
    const action = screen.getByTestId("teaser-footer-action");
    expect(action).toHaveTextContent("Take Birds (teaserAction)");
    expect(action.parentElement).toHaveClass("grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]");
    expect(screen.getByTestId("teaser-oracle")).toHaveClass("max-h-[44px]");
    expect(screen.queryByTestId("sheet-footer-foot")).toBeNull();
  });

  it("pins the action to the full sheet's foot, and only there", async () => {
    await mountTake();
    fireEvent.click(screen.getByRole("button", { name: /Show all details/ }));
    expect(screen.getByTestId("sheet-footer-foot")).toHaveTextContent("Take Birds (foot)");
    expect(screen.queryByTestId("teaser-footer-action")).toBeNull();
  });

  it("keeps an unstacked card's three oracle lines and plain All details", async () => {
    render(
      <CardDetailProvider fetchCard={async () => ({ ...birds, oracleText: "{T}: Add one mana of any color." })}>
        <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">open birds</CardDetailTrigger>
      </CardDetailProvider>,
    );
    await openFromSheet();
    expect(screen.getByTestId("teaser-oracle")).toHaveClass("max-h-[64px]");
    expect(screen.queryByTestId("teaser-footer-action")).toBeNull();
  });
});

describe("a sheet with its own phone name (s2)", () => {
  it("draws the phone pill with the phone name and keeps the desktop pill's", async () => {
    render(
      <CardDetailProvider fetchCard={async () => birds}>
        <ModalChrome
          title="Core, two things would have to go"
          closeLabel="Close"
          onClose={vi.fn()}
          width={700}
          backLabel="Core"
          phoneBackLabel="What would have to go"
        >
          <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">open birds</CardDetailTrigger>
        </ModalChrome>
      </CardDetailProvider>,
    );
    await openFromSheet();
    expect(pill()).toHaveTextContent("What would have to go");
    expect(pill()).toHaveAccessibleName(cardSheetCopy.back.a11y("What would have to go"));
    expect(screen.getByTestId("card-modal-back")).toHaveTextContent("Core");
  });
});

describe("the rise and the drop (motion)", () => {
  const stubMedia = (matching: string) => {
    const saved = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === matching, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    return () => { window.matchMedia = saved; };
  };

  it("starts the drop from the card's current transform, so a dismissal mid-rise reverses", async () => {
    const calls: { from: unknown; to: unknown }[] = [];
    const saved = (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
    const savedStyle = window.getComputedStyle;
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = function (frames: Keyframe[]) {
      calls.push({ from: frames[0].transform, to: frames[1].transform });
      return { cancel: () => {} };
    };
    window.getComputedStyle = ((el: Element) => {
      const real = savedStyle(el);
      return el.getAttribute("aria-labelledby") === "card-modal-title"
        ? ({ ...real, transform: "matrix(1, 0, 0, 1, 0, 300)" } as CSSStyleDeclaration) : real;
    }) as typeof window.getComputedStyle;
    try {
      draw();
      await openFromSheet();
      await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
      expect(calls).toEqual([{ from: "matrix(1, 0, 0, 1, 0, 300)", to: "translateY(100%)" }]);
      await landed();
    } finally {
      (HTMLElement.prototype as unknown as { animate?: unknown }).animate = saved;
      window.getComputedStyle = savedStyle;
    }
  });

  it("answers nothing while it drops: Escape then ArrowRight pages no card in", async () => {
    const cards: Record<string, BrowseCard> = {
      "o-a": { ...birds, oracleId: "o-a", name: "Card A" },
      "o-b": { ...birds, oracleId: "o-b", name: "Card B" },
    };
    const fetchCard = vi.fn(async (id: string) => cards[id] ?? null);
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <ModalChrome title="Game changers" closeLabel="Close game changers" onClose={vi.fn()} width={760}>
          <CardDetailTrigger oracleId="o-a" name="Card A" siblings={["o-a", "o-b"]}>open a</CardDetailTrigger>
        </ModalChrome>
      </CardDetailProvider>,
    );
    await act(async () => { fireEvent.click(screen.getByText("open a")); });
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(cardDialog().closest("[data-stack-dropping]")).toHaveAttribute("inert");
    await act(async () => { fireEvent.keyDown(document, { key: "ArrowRight" }); });
    expect(document.getElementById("card-modal-title")).toHaveTextContent("Card A");
    await landed();
    expect(cardDialog()).toBeNull();
  });

  it("rises over the sheet on arrival", async () => {
    draw();
    await openFromSheet();
    expect(cardDialog()).toHaveClass("anim-stack-rise");
  });

  it("rises once on arrival, and not again when paged inside the sheet's list", async () => {
    const cards: Record<string, BrowseCard> = {
      "o-a": { ...birds, oracleId: "o-a", name: "Card A" },
      "o-b": { ...birds, oracleId: "o-b", name: "Card B" },
    };
    render(
      <CardDetailProvider fetchCard={async (id) => cards[id] ?? null}>
        <ModalChrome title="Game changers" closeLabel="Close game changers" onClose={vi.fn()} width={760}>
          <CardDetailTrigger oracleId="o-a" name="Card A" siblings={["o-a", "o-b"]}>open a</CardDetailTrigger>
        </ModalChrome>
      </CardDetailProvider>,
    );
    await act(async () => { fireEvent.click(screen.getByText("open a")); });
    expect(cardDialog()).toHaveClass("anim-stack-rise");
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: "Next card" })[0]); });
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: "Previous card" })[0]); });
    expect(document.getElementById("card-modal-title")).toHaveTextContent("Card A");
    expect(cardDialog()).not.toHaveClass("anim-stack-rise");
  });

  it("does not rise when opened from the page", async () => {
    render(
      <CardDetailProvider fetchCard={async () => birds}>
        <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">page trigger</CardDetailTrigger>
      </CardDetailProvider>,
    );
    await act(async () => { fireEvent.click(screen.getByText("page trigger")); });
    expect(cardDialog()).not.toHaveClass("anim-stack-rise");
  });

  it("drops for STACK_DROP_MS with the sheet already back under it, then goes", async () => {
    draw();
    await openFromSheet();
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    // The drop runs on the Web Animations API from the card's current transform (jsdom has none,
    // so this asserts the state that starts it); the rise class stays on underneath (#1268).
    expect(cardDialog().closest("[data-stack-dropping]")).not.toBeNull();
    expect(cardDialog()).toHaveClass("anim-stack-rise");
    // Drawn again while the card drops, but still out of the accessibility tree and unpressable:
    // the card is still the modal dialog until it really closes (#1268).
    const cover = screen.getByTestId("receipt-modal").closest("[data-hidden-under-card]") as HTMLElement;
    expect(cover).toHaveAttribute("aria-hidden", "true");
    expect(cover.style.opacity).toBe("");
    expect(cover.style.pointerEvents).toBe("none");
    await landed();
    expect(cardDialog()).toBeNull();
    expect(screen.getByTestId("receipt-modal").closest("[data-hidden-under-card]")).toBeNull();
  });

  it("swaps out at once under reduced motion", async () => {
    const restore = stubMedia("(prefers-reduced-motion: reduce)");
    try {
      draw();
      await openFromSheet();
      await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
      expect(cardDialog()).toBeNull();
    } finally {
      restore();
    }
  });

  it("closes at once on desktop, where nothing drops", async () => {
    const restore = stubMedia("(min-width: 768px)");
    try {
      draw();
      await openFromSheet();
      await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
      expect(cardDialog()).toBeNull();
    } finally {
      restore();
    }
  });
});
