import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { OVER_ART_PLATE } from "../ui/art-wash";
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
  // The label is the amendment's only player-visible change: the modal draws
  // the art smaller than the lightbox it replaces, so "Full card" would be
  // promising a picture this control no longer opens.
  it("labels the chip 'Card details', not 'Full card'", () => {
    renderTrigger();
    const chip = screen.getByRole("button", { name: "View card details" });
    expect(chip).toHaveTextContent("Card details");
    expect(screen.queryByText("Full card")).toBeNull();
  });

  it("opens the shared card modal for its oracle id", async () => {
    const fetchCard = renderTrigger();
    await click(screen.getByRole("button", { name: "View card details" }));

    expect(fetchCard).toHaveBeenCalledWith("o-atraxa");
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
    expect(fetchCard).toHaveBeenCalledWith("o-atraxa");
  });
});

// The helper above pins one set of props, so placement gets its own mount. The
// provider is still real: `fetchCard` defaults to a server action, and a bare
// provider would reach for it.
function mount(el: React.ReactNode) {
  return render(<CardDetailProvider fetchCard={vi.fn(async () => ATRAXA)}>{el}</CardDetailProvider>);
}

describe("FullCardTrigger placement", () => {
  it("defaults to the hero corner with a band tap target", () => {
    const { container } = mount(<FullCardTrigger oracleId="o-atraxa" />);
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.style.top).toBe("56px");
    expect(pill.style.right).toBe("16px");
    expect(container.querySelector('[aria-hidden="true"].inset-0')).not.toBeNull();
  });

  it("sits bottom-left on the desktop deck header and draws no band tap target", () => {
    const { container } = mount(
      <FullCardTrigger oracleId="o-atraxa" placement="deck-desktop" bandTapTarget={false} />,
    );
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.style.left).toBe("16px");
    expect(pill.style.bottom).toBe("14px");
    expect(pill.style.top).toBe("");
    expect(container.querySelector('[aria-hidden="true"].inset-0')).toBeNull();
  });

  it("sits inside the desktop commander card frame, whole frame tappable", () => {
    const { container } = mount(
      <FullCardTrigger oracleId="o-atraxa" placement="commander-desktop" />,
    );
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.style.left).toBe("12px");
    expect(pill.style.bottom).toBe("12px");
    // Unlike the deck header, this frame carries no title and no rename pencil,
    // so the tap layer has nothing to eat and the whole card opens the modal.
    expect(container.querySelector('[aria-hidden="true"].inset-0')).not.toBeNull();
  });

  it("sits top-right at 13px on the mobile deck header", () => {
    mount(<FullCardTrigger oracleId="o-atraxa" placement="deck-mobile" bandTapTarget={false} />);
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.style.top).toBe("13px");
    expect(pill.style.right).toBe("16px");
  });

  // The plate has to be written out as a literal class — Tailwind compiles no
  // interpolated one — while the contrast suite measures the exported number.
  // This is the only thing keeping the two from drifting, and the drift matters:
  // every band this chip sits on now runs clear where it lands, so a plate below
  // `OVER_ART_PLATE` is a label on bare art rather than a slightly lighter chip.
  it("plates itself at the alpha the contrast suite measures", () => {
    mount(<FullCardTrigger oracleId="o-atraxa" />);
    const pill = screen.getByRole("button", { name: "View card details" });
    expect(pill.className).toContain(`var(--bg)_${OVER_ART_PLATE}%`);
  });
});
