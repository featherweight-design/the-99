import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { FullCardTrigger } from "./full-card-trigger";

const ATRAXA: BrowseCard = {
  oracleId: "o-atraxa",
  name: "Atraxa, Praetors' Voice",
  typeLine: "Legendary Creature — Phyrexian Angel Horror",
  manaCost: "{G}{W}{U}{B}", cmc: 2,
  oracleText: "Flying, vigilance, deathtouch, lifelink",
  keywords: ["Flying"],
  rarity: "mythic",
  colorIdentity: ["W", "U", "B", "G"],
  imageUri: null,
  printedName: null,
  quantity: 0,
  printings: [],
  setCodes: [],
  primarySetCode: "",
  preferredPrinting: null,
};

function renderTrigger(fetchCard = vi.fn(async () => ATRAXA)) {
  render(
    <CardDetailProvider fetchCard={fetchCard}>
      <FullCardTrigger oracleId="o-atraxa" />
    </CardDetailProvider>,
  );
  return fetchCard;
}

async function click(el: HTMLElement) {
  el.focus();
  await act(async () => {
    fireEvent.click(el);
  });
}

describe("FullCardTrigger", () => {
  // Icon only, on every render and every frame. The words named the action and
  // stood out against art; THE PLATE does the second job, so the name moves into
  // `aria-label` and becomes the only one a screen reader has — which is why it
  // is asserted here rather than assumed.
  it("draws the icon alone and carries the name in aria-label", () => {
    renderTrigger();
    const chip = screen.getByRole("button", { name: "View card details" });
    expect(chip).toHaveTextContent("⛶");
    expect(chip).not.toHaveTextContent("Card details");
    expect(screen.queryByText("Full card")).toBeNull();
  });

  it("opens the shared card modal for its oracle id", async () => {
    const fetchCard = renderTrigger();
    await click(screen.getByRole("button", { name: "View card details" }));

    expect(fetchCard).toHaveBeenCalledWith("o-atraxa", undefined);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByRole("dialog")).toHaveTextContent("Atraxa, Praetors' Voice");
  });

  // Parity with CardDetailTrigger: the fetch is a round trip, and a chip that
  // looks inert until the modal appears invites a second click.
  it("marks the chip busy while the fetch is in flight", async () => {
    let release: (card: BrowseCard) => void = () => {};
    renderTrigger(vi.fn(() => new Promise<BrowseCard>((resolve) => { release = resolve; })));
    const chip = screen.getByRole("button", { name: "View card details" });
    expect(chip).toHaveAttribute("aria-busy", "false");

    await click(chip);
    expect(chip).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      release(ATRAXA);
    });
    await waitFor(() => {
      expect(chip).toHaveAttribute("aria-busy", "false");
    });
  });

  // Tapping the art band is the mobile gesture the lightbox carried, and it
  // survives the swap. It stays aria-hidden because the labeled chip is the
  // accessible control — two names for one action would double it in the
  // accessibility tree.
  it("keeps the art band tappable and out of the accessibility tree", async () => {
    const fetchCard = renderTrigger();
    const band = document.querySelector('[aria-hidden="true"]');
    expect(band).not.toBeNull();

    await act(async () => {
      fireEvent.click(band as Element);
    });
    expect(fetchCard).toHaveBeenCalledWith("o-atraxa", undefined);
  });
});

// The helper above pins one set of props, so placement gets its own mount. The
// provider is still real: `fetchCard` defaults to a server action, and a bare
// provider would reach for it.
function mount(el: React.ReactNode) {
  return render(<CardDetailProvider fetchCard={vi.fn(async () => ATRAXA)}>{el}</CardDetailProvider>);
}

describe("FullCardTrigger placement", () => {
  // `top: 56` existed only to stack this control below the identity pips, and
  // those move into the label block. One rule now places all four: bottom, on
  // whichever side the block does not reach.
  // The target sits 9px further out than the drawn box, so the 26px plate lands
  // at the inset the placement names. Inward rather than overhung: the bands are
  // `overflow-hidden`, and 9px of an overhanging target is clipped out of its own
  // hit area.
  //
  // Bottom-right now: the pips left the band's top edge for the label block, and
  // that block reserves this corner with its own right padding.
  it("sits in the hero's bottom-right corner with a band tap target", () => {
    const { container } = mount(<FullCardTrigger oracleId="o-atraxa" />);
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.style.top).toBe("");
    expect(pill.style.right).toBe("7px");
    expect(pill.style.bottom).toBe("6px");
    expect(container.querySelector('[aria-hidden="true"].inset-0')).not.toBeNull();
  });

  // Not one corner per breakpoint and not one per surface: the drawn box lands at
  // the same inset the design names on all four, and the target is derived from
  // it rather than drawn separately.
  it("lands the drawn plate at every placement's named inset", () => {
    const drawn = {
      hero: { right: 16, bottom: 15 },
      "commander-desktop": { left: 12, bottom: 12 },
      "deck-desktop": { left: 16, bottom: 14 },
      // Bottom-right too: no placement sits at a top edge any more.
      "deck-mobile": { right: 16, bottom: 14 },
    } as const;
    for (const [placement, at] of Object.entries(drawn)) {
      const { unmount } = mount(
        <FullCardTrigger
          oracleId="o-atraxa"
          placement={placement as keyof typeof drawn}
          bandTapTarget={false}
        />,
      );
      const pill = screen.getByRole("button", { name: "View card details" });
      for (const [side, px] of Object.entries(at)) {
        // The target's own inset, plus half the 44−26 difference, is where the
        // plate's edge falls — on the axes the target actually has spare room on.
        // A LABELLED control is shrink-to-fit, so it has no spare width: its
        // horizontal inset is the placement's own figure, or the plate would draw
        // 9px further out than the design states.
        const shrinkToFit = placement === "deck-desktop" && (side === "left" || side === "right");
        const drawn = Number.parseInt(pill.style.getPropertyValue(side), 10) + (shrinkToFit ? 0 : 9);
        expect(drawn).toBe(px);
      }
      unmount();
    }
  });

  it("sits bottom-left on the desktop deck header and draws no band tap target", () => {
    const { container } = mount(
      <FullCardTrigger oracleId="o-atraxa" placement="deck-desktop" bandTapTarget={false} />,
    );
    const pill = screen.getByRole("button", { name: "View card details" });
    // `left` is the raw 16: this is the one labelled placement, its button is
    // shrink-to-fit, and pulling a shrink-to-fit target inward moves the plate
    // rather than centring it. The vertical axis still insets, because 44 of
    // height around a 26px plate is where the touch floor lives.
    expect(pill.style.left).toBe("16px");
    expect(pill.style.bottom).toBe("5px");
    expect(pill.style.top).toBe("");
    expect(container.querySelector('[aria-hidden="true"].inset-0')).toBeNull();
  });

  it("sits inside the desktop commander card frame, whole frame tappable", () => {
    const { container } = mount(
      <FullCardTrigger oracleId="o-atraxa" placement="commander-desktop" />,
    );
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.style.left).toBe("3px");
    expect(pill.style.bottom).toBe("3px");
    // Unlike the deck header, this frame carries no title and no rename pencil,
    // so the tap layer has nothing to eat and the whole card opens the modal.
    expect(container.querySelector('[aria-hidden="true"].inset-0')).not.toBeNull();
  });

  // No placement is at a top edge. The mobile deck header was the last one, and
  // its block is centred — so the right corner is free and the control takes it,
  // which leaves every band in the app with an empty top edge.
  it("sits bottom-right on the mobile deck header, like every other placement", () => {
    mount(<FullCardTrigger oracleId="o-atraxa" placement="deck-mobile" bandTapTarget={false} />);
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.style.top).toBe("");
    expect(pill.style.bottom).toBe("5px");
    expect(pill.style.right).toBe("7px");
  });

  // Visible is not clickable. Every band this chip sits on draws its own content
  // in a positioned sibling AFTER it — the deck header's `relative flex h-full`
  // row spans the whole header box, its 254px padding insetting the content and
  // not the box — and two positioned elements at auto z-index are ordered by
  // document position. Without a z-index the row won the hit test over the
  // chip's corner and the pill was on screen and dead.
  it("stacks above the content that follows it", () => {
    mount(<FullCardTrigger oracleId="o-atraxa" placement="deck-desktop" bandTapTarget={false} />);
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.className).toContain("z-[2]");
  });

  // THE PLATE is opaque, which is what takes this control out of the contrast
  // problem: ink on `var(--bg)` is the page's own body contrast and needs no
  // per-theme measurement, so no alpha can drift here any more. The 44px target
  // and the 26px drawn box are separate elements for the same reason — a 44px
  // plate would be a panel, and a 26px button would miss the touch floor.
  it("plates itself opaquely, 26px drawn inside a 44px target", () => {
    mount(<FullCardTrigger oracleId="o-atraxa" />);
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.style.width).toBe("44px");
    expect(pill.style.height).toBe("44px");
    expect(pill.className).not.toContain("color-mix");

    const plate = pill.firstElementChild as HTMLElement;
    expect(plate.style.width).toBe("26px");
    expect(plate.className).toContain("bg-[color:var(--bg)]");
    expect(plate.className).toContain("border-[color:var(--border-strong)]");
  });

  // The plate is opaque in every state, including while the fetch runs. Dimming
  // the button would composite it at 55% over the crop and put the icon back on
  // uncontrolled art — with no top scrim left to catch it — which would undo the
  // argument that lets the scrim go.
  it("dims the glyph while pending and never the plate", async () => {
    let release: (card: BrowseCard) => void = () => {};
    render(
      <CardDetailProvider
        fetchCard={vi.fn(() => new Promise<BrowseCard>((resolve) => { release = resolve; }))}
      >
        <FullCardTrigger oracleId="o-atraxa" />
      </CardDetailProvider>,
    );
    const pill = screen.getByRole("button", { name: "View card details" });
    const plate = pill.firstElementChild as HTMLElement;
    await act(async () => {
      fireEvent.click(pill);
    });
    expect(pill.getAttribute("aria-busy")).toBe("true");
    expect(pill.style.opacity).toBe("");
    expect(plate.style.opacity).toBe("");
    expect((plate.firstElementChild as HTMLElement).style.opacity).not.toBe("");
    await act(async () => {
      release(ATRAXA);
    });
  });

  // Dropped with the plate, not forgotten: a blur under an opaque box computes a
  // backdrop nothing can see.
  it("draws no backdrop filter", () => {
    mount(<FullCardTrigger oracleId="o-atraxa" />);
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.style.backdropFilter).toBe("");
    expect((pill.firstElementChild as HTMLElement).style.backdropFilter).toBe("");
  });
});
