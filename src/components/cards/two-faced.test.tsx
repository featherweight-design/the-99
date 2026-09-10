// #363 — the `//` mark and the modal's turn-over control.
//
// The one behaviour worth pinning above all the others: the mark and the control
// are driven by the `layout` column, never by the `//` in a name. `Fire // Ice`
// carries the separator and has nothing to turn over, so it gets neither.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { BrowseCard } from "../../lib/collection/browse";
import { twoFacedCopy } from "../../lib/copy/card-surfaces";
import { TwoFacedMark } from "./two-faced-mark";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(),
  clearCardArtPreference: vi.fn(),
}));

const { CardModal } = await import("./card-modal");

const FRONT = "https://x/front.jpg";
const BACK = "https://x/back.jpg";

const delver: BrowseCard = {
  oracleId: "o1",
  name: "Delver of Secrets // Insectile Aberration",
  typeLine: "Creature — Human Wizard",
  manaCost: "{U}",
  oracleText: "",
  keywords: [],
  rarity: "common",
  colorIdentity: ["U"],
  imageUri: FRONT,
  quantity: 1,
  // The front art resolves through the printing, which is the whole point of the
  // back's known limitation: the back has no per-printing form to resolve through.
  printings: [{
    setCode: "ISD", setName: "Innistrad", collectorNumber: "51",
    releasedAt: "2011-09-30", quantity: 1, finishes: { nonfoil: 1 }, imageUri: FRONT,
    flavorName: null,
  }],
  setCodes: ["ISD"],
  primarySetCode: "ISD",
  preferredPrinting: null,
  layout: "transform",
  backImageUri: BACK,
};

function mount(c: BrowseCard) {
  render(
    <CardModal card={c} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
  );
}

const wash = () => screen.getByTestId("mobile-art-wash");
const flipTo = (face: string) => screen.queryAllByLabelText(twoFacedCopy.flipToAria(face));

describe("TwoFacedMark", () => {
  it("draws the mark and its spoken sibling for a two-sided layout", () => {
    render(<TwoFacedMark layout="modal_dfc" />);
    expect(screen.getByText(twoFacedCopy.mark)).toBeTruthy();
    expect(screen.getByText(twoFacedCopy.markAria)).toBeTruthy();
  });

  it("draws nothing for a split card, which carries the separator and no back", () => {
    const { container } = render(<TwoFacedMark layout="split" />);
    expect(container.innerHTML).toBe("");
  });

  it("draws nothing when the layout is absent, rather than guessing", () => {
    const { container } = render(<TwoFacedMark layout={undefined} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("CardModal flip control", () => {
  it("names the face it turns to, not the act", () => {
    mount(delver);
    expect(flipTo("Insectile Aberration").length).toBeGreaterThan(0);
    expect(flipTo("Delver of Secrets")).toHaveLength(0);
  });

  it("swaps the art and announces the face, then turns back", () => {
    mount(delver);
    expect(wash().style.backgroundImage).toContain(FRONT);

    fireEvent.click(flipTo("Insectile Aberration")[0]);
    expect(wash().style.backgroundImage).toContain(BACK);
    expect(screen.getByText(twoFacedCopy.flippedAria("Insectile Aberration"))).toBeTruthy();

    fireEvent.click(flipTo("Delver of Secrets")[0]);
    expect(wash().style.backgroundImage).toContain(FRONT);
    expect(screen.getByText(twoFacedCopy.flippedAria("Delver of Secrets"))).toBeTruthy();
  });

  it("offers no control for a split card", () => {
    mount({ ...delver, name: "Fire // Ice", layout: "split", backImageUri: null });
    expect(flipTo("Ice")).toHaveLength(0);
  });

  it("offers no control when the layout says two faces but no back art was stored", () => {
    // A row seeded before the back-face column existed. The layout alone would
    // turn the art to a colour-identity gradient — the lie the gate prevents.
    mount({ ...delver, backImageUri: null });
    expect(flipTo("Insectile Aberration")).toHaveLength(0);
  });
});
