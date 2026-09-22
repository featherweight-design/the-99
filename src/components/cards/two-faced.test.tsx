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
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(),
}));

const { CardModal } = await import("./card-modal");

const FRONT = "https://x/front.jpg";
const BACK = "https://x/back.jpg";
const OTHER = "https://x/other-printing.jpg";

const delver: BrowseCard = {
  oracleId: "o1",
  name: "Delver of Secrets // Insectile Aberration",
  typeLine: "Creature — Human Wizard",
  manaCost: "{U}", cmc: 2,
  oracleText: "",
  keywords: [],
  rarity: "common",
  colorIdentity: ["U"],
  imageUri: FRONT,
  printedName: null,
  quantity: 1,
  // Both faces resolve through the printing, which is what makes a flip on a picked
  // printing turn to that printing's own back rather than to the oracle row's.
  printings: [{
    setCode: "ISD", setName: "Innistrad", collectorNumber: "51",
    releasedAt: "2011-09-30", quantity: 1, finishes: { nonfoil: 1 }, imageUri: FRONT,
    backImageUri: BACK, flavorName: null,
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
// The art in the modal TURNS now rather than swapping, so the face is announced
// when the card lands — the rule the zoom has always followed. jsdom runs no
// transitions, so the landing is fired by hand. Both breakpoint trees mount a
// turning box; in a browser only the one with layout transitions.
const settle = () =>
  screen
    .queryAllByTestId("modal-art-turn")
    .forEach((box) => fireEvent.transitionEnd(box, { propertyName: "transform" }));

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
    settle();
    expect(screen.getByText(twoFacedCopy.flippedAria("Insectile Aberration"))).toBeTruthy();

    fireEvent.click(flipTo("Delver of Secrets")[0]);
    expect(wash().style.backgroundImage).toContain(FRONT);
    settle();
    expect(screen.getByText(twoFacedCopy.flippedAria("Delver of Secrets"))).toBeTruthy();
  });

  // A modal titled `Battle of Olympus // Aftermath` whose flip control announces
  // `Insectile Aberration` names two different cards at once. The faces come off
  // the name on screen, which is the printed one when the copy in hand has one.
  it("names and announces the printed faces of a renamed two-faced card", () => {
    mount({ ...delver, printedName: "Battle of Olympus // Aftermath" });
    expect(flipTo("Aftermath").length).toBeGreaterThan(0);
    fireEvent.click(flipTo("Aftermath")[0]);
    settle();
    expect(screen.getByText(twoFacedCopy.flippedAria("Aftermath"))).toBeTruthy();
  });

  it("offers no control for a split card", () => {
    // The printing carries no back art either, and THAT is what excludes it rather
    // than the layout word: Scryfall gives `split`, `adventure` and `prepare` one image
    // between both halves, so `card_faces[1]` has no `image_uris` and the transform
    // stores null. A reversible printing of one of those layouts does carry two images
    // and does turn over — the `tdm/381` case below. Checked against the catalog on
    // 2026-09-22: every printing holding its own back art is a two-sided layout or a
    // reversible printing, and none is an ordinary split.
    mount({
      ...delver,
      name: "Fire // Ice",
      layout: "split",
      backImageUri: null,
      printings: [{ ...delver.printings[0], backImageUri: null }],
    });
    expect(flipTo("Ice")).toHaveLength(0);
  });

  it("turns over a REVERSIBLE printing, whose oracle layout says one side", () => {
    // `sld/2214`: Secret Lair prints one card on both sides with different art. The
    // oracle row's layout comes from an ordinary printing and says `normal`, so the
    // layout gate alone left 81 printings' back art ingested and unreachable.
    mount({
      ...delver,
      name: "Teferi's Ageless Insight",
      printedName: "Mimir's Ancient Wisdom",
      layout: "normal",
      backImageUri: null,
      printings: [{ ...delver.printings[0], backImageUri: BACK, flavorName: "Mimir's Ancient Wisdom" }],
    });
    // Labelled by SIDE, not by name: both faces print `Mimir's Ancient Wisdom`, so
    // `Turn over to Mimir's Ancient Wisdom` would name the card already on screen.
    const control = screen.getAllByLabelText(twoFacedCopy.flipToSideAria("back"));
    expect(control.length).toBeGreaterThan(0);
    fireEvent.click(control[0]);
    settle();
    expect(screen.getByText(twoFacedCopy.flippedSideAria("back"))).toBeTruthy();
    expect(screen.getAllByLabelText(twoFacedCopy.flipToSideAria("front")).length).toBeGreaterThan(0);
  });

  it("does not strand a turned card when the pick has no back art", () => {
    // Reachable only since a PRINTING's own back art became a turn signal. `flipped`
    // survives a printing pick by design, so turning `sld/2214` over and then picking
    // the M21 printing took the back image away underneath a turned card: the art fell
    // back to the colour-identity gradient and the control disappeared with it, leaving
    // no way back. The drawn state is clamped to what exists now.
    mount({
      ...delver,
      name: "Teferi's Ageless Insight",
      layout: "normal",
      backImageUri: null,
      quantity: 2,
      printings: [
        { setCode: "SLD", setName: "Secret Lair", collectorNumber: "2214",
          releasedAt: "2025-10-27", quantity: 1, finishes: { foil: 1 }, imageUri: FRONT,
          backImageUri: BACK, flavorName: "Mimir's Ancient Wisdom" },
        { setCode: "M21", setName: "Core Set 2021", collectorNumber: "76",
          releasedAt: "2020-07-03", quantity: 1, finishes: { nonfoil: 1 }, imageUri: OTHER,
          backImageUri: null, flavorName: null },
      ],
      setCodes: ["SLD", "M21"],
      primarySetCode: "SLD",
    });

    fireEvent.click(screen.getAllByLabelText(twoFacedCopy.flipToSideAria("back"))[0]);
    expect(wash().style.backgroundImage).toContain(BACK);

    // Through the real picker rather than by prop, because the bug lives in the state
    // that SURVIVES the pick.
    fireEvent.click(screen.getAllByLabelText(/printings owned/i)[0]);
    const m21 = screen.getAllByLabelText(/Core Set 2021/i)[0];
    fireEvent.click(m21);

    // The M21 art, never the gradient — and nothing claims a back to turn to.
    expect(wash().style.backgroundImage).toContain(OTHER);
    expect(wash().style.background ?? "").not.toContain("linear-gradient");
    expect(screen.queryAllByLabelText(/Turn over/)).toHaveLength(0);
  });

  it("keeps the LAYOUT half of the gate, for an oracle-level back with no printing art", () => {
    // Distinguishes the two-signal gate from `Boolean(backImage)` alone: an oracle-level
    // back image on a one-sided layout is not evidence that the copy in hand has two
    // sides, and inferring a turn from it is the same guess `faces.ts` refuses to make
    // from a `//` in a name.
    mount({
      ...delver,
      name: "Fire // Ice",
      layout: "split",
      backImageUri: BACK,
      printings: [{ ...delver.printings[0], backImageUri: null }],
    });
    expect(screen.queryAllByLabelText(/Turn over/)).toHaveLength(0);
  });

  it("still names the FACES of a reversible printing whose sides differ", () => {
    // `tdm/381` Bloomvine Regent // Claim Territory: an adventure card printed with
    // its two halves on two sides. Same layout mismatch, two different names — so the
    // side wording would be the wrong choice here and the names are what to say.
    mount({
      ...delver,
      name: "Bloomvine Regent // Claim Territory",
      layout: "adventure",
      backImageUri: null,
      printings: [{ ...delver.printings[0], backImageUri: BACK }],
    });
    expect(flipTo("Claim Territory").length).toBeGreaterThan(0);
  });

  it("offers no control when the layout says two faces but no back art was stored", () => {
    // A row seeded before the back-face column existed. The layout alone would
    // turn the art to a colour-identity gradient — the lie the gate prevents.
    mount({ ...delver, backImageUri: null, printings: [{ ...delver.printings[0], backImageUri: null }] });
    expect(flipTo("Insectile Aberration")).toHaveLength(0);
  });

  // The defect this column was added for: a treatment redraws BOTH faces, so a flip on a
  // picked printing showed the front of one printing and the back of another.
  it("turns to the back of the printing being shown", () => {
    const ALT_FRONT = "https://x/sld-front.jpg";
    const ALT_BACK = "https://x/sld-back.jpg";
    mount({
      ...delver,
      quantity: 2,
      printings: [
        delver.printings[0],
        {
          setCode: "SLD", setName: "Secret Lair Drop", collectorNumber: "7",
          releasedAt: "2023-01-01", quantity: 1, finishes: { nonfoil: 1 },
          imageUri: ALT_FRONT, backImageUri: ALT_BACK, flavorName: null,
        },
      ],
      preferredPrinting: { setCode: "SLD", collectorNumber: "7" },
    });
    expect(wash().style.backgroundImage).toContain(ALT_FRONT);
    fireEvent.click(flipTo("Insectile Aberration")[0]);
    expect(wash().style.backgroundImage).toContain(ALT_BACK);
    expect(wash().style.backgroundImage).not.toContain(BACK);
  });

  // A set cell is a printing the reader often does not own, so the modal injects it as a row
  // of its own. A row with no back reads as "this printing has no second face", and the flip
  // then draws this printing's front against the ORACLE row's back — the same two-printing
  // pairing, reached through the door that injects rather than the one that resolves.
  it("turns to the back of a printing it was opened at but does not own", () => {
    const CELL_FRONT = "https://x/cell-front.jpg";
    const CELL_BACK = "https://x/cell-back.jpg";
    render(
      <CardModal
        card={delver}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
        openAtPrinting={{
          setCode: "SLD", collectorNumber: "7",
          imageUri: CELL_FRONT, backImageUri: CELL_BACK,
        }}
      />,
    );
    expect(wash().style.backgroundImage).toContain(CELL_FRONT);
    fireEvent.click(flipTo("Insectile Aberration")[0]);
    expect(wash().style.backgroundImage).toContain(CELL_BACK);
    expect(wash().style.backgroundImage).not.toContain(BACK);
  });

  // The same door, on a card the reader DOES own: the row is repointed rather than injected,
  // and a repointing that moved the front and left the back is the same mismatch.
  it("repoints both faces when the opened printing is one it owns", () => {
    const CELL_FRONT = "https://x/owned-front.jpg";
    const CELL_BACK = "https://x/owned-back.jpg";
    render(
      <CardModal
        card={delver}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
        openAtPrinting={{
          setCode: "ISD", collectorNumber: "51",
          imageUri: CELL_FRONT, backImageUri: CELL_BACK,
        }}
      />,
    );
    expect(wash().style.backgroundImage).toContain(CELL_FRONT);
    fireEvent.click(flipTo("Insectile Aberration")[0]);
    expect(wash().style.backgroundImage).toContain(CELL_BACK);
  });

  // Until the catalog is re-seeded against the new column every printing row carries a null
  // back, and the flip has to go on working exactly as it did before.
  it("keeps the oracle-level back when the printing carries none", () => {
    mount({ ...delver, printings: [{ ...delver.printings[0], backImageUri: null }] });
    fireEvent.click(flipTo("Insectile Aberration")[0]);
    expect(wash().style.backgroundImage).toContain(BACK);
  });
});
