import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { collectionEditCopy } from "../../../lib/copy/collection-edit";
import { ScannerView, type ScannerViewProps } from "./scanner-view";
import { createOutlineStore, type OutlineStore } from "../../../lib/scan/outline";
import { outlineLook, type ScanGuess, type ScanPanel } from "./scan-view";

const copy = collectionEditCopy.scan;
const SOL: ScanGuess = { oracleId: "11111111-1111-4111-8111-111111111111", name: "Sol Ring", typeLine: "Artifact", imageUri: "https://img/sol" };
const ARC: ScanGuess = { oracleId: "22222222-2222-4222-8222-222222222222", name: "Arcane Signet", typeLine: "Artifact", imageUri: null };
const MIND: ScanGuess = { oracleId: "33333333-3333-4333-8333-333333333333", name: "Mind Stone", typeLine: "Artifact", imageUri: null };

function baseProps(panel: ScanPanel, outline?: OutlineStore): ScannerViewProps {
  return {
    layout: "phone", screen: { kind: "scanning", panel, dark: false }, mode: "fast", torch: { available: true, on: false }, count: 0, outline,
    onMode: vi.fn(), onTorch: vi.fn(), onClose: vi.fn(), onReview: vi.fn(), onHold: vi.fn(), onAdd: vi.fn(),
    onCancelHold: vi.fn(), onPick: vi.fn(), onNoneOfThese: vi.fn(),
  };
}

function draw(over: Partial<ScannerViewProps> & { panel?: ScanPanel; dark?: boolean } = {}) {
  const { panel = { kind: "looking" }, dark = false, ...rest } = over;
  const props: ScannerViewProps = {
    layout: "phone",
    screen: { kind: "scanning", panel, dark },
    mode: "fast",
    torch: { available: true, on: false },
    count: 0,
    onMode: vi.fn(), onTorch: vi.fn(), onClose: vi.fn(), onReview: vi.fn(), onHold: vi.fn(), onAdd: vi.fn(),
    onCancelHold: vi.fn(), onPick: vi.fn(), onNoneOfThese: vi.fn(),
    ...rest,
  };
  render(<ScannerView {...props} />);
  return props;
}
const panel = () => screen.getByTestId("scan-panel");

// A card shown at the middle of a square picture.
function withCard(): OutlineStore {
  const store = createOutlineStore();
  store.show({ corners: [{ x: 0.4, y: 0.3 }, { x: 0.6, y: 0.3 }, { x: 0.6, y: 0.7 }, { x: 0.4, y: 0.7 }], width: 1000, height: 1000 });
  return store;
}
// jsdom lays nothing out: the feed's box is given a size.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(800);
});
afterEach(() => vi.restoreAllMocks());
const outlineEl = () => screen.getByTestId("scan-outline");

describe("ScannerView", () => {
  it("looks for a card with no outline until a card is seen, the mode's line, and an empty tray whose Review is held (D7)", () => {
    const p = draw();
    expect(panel().dataset.state).toBe("looking");
    expect(screen.queryByTestId("scan-outline")).toBeNull();
    expect(screen.queryByTestId("scan-guide")).toBeNull();
    expect(panel().textContent).toBe(`${copy.view.looking}${copy.mode.fast}: ${copy.mode.fastLine}`);
    expect(screen.getByTestId("scan-tray-count").textContent).toBe(copy.view.emptyList);
    const review = screen.getByRole("button", { name: copy.view.reviewEmpty });
    expect(review.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(review);
    expect(p.onReview).not.toHaveBeenCalled();
  });

  it("names the mode in the segment and switches it", () => {
    const p = draw({ mode: "normal" });
    const group = screen.getByRole("group", { name: copy.mode.label });
    expect(within(group).getByRole("button", { name: copy.mode.normal }).getAttribute("aria-pressed")).toBe("true");
    expect(panel().textContent).toContain(copy.mode.normalLine);
    fireEvent.click(within(group).getByRole("button", { name: copy.mode.fast }));
    expect(p.onMode).toHaveBeenCalledWith("fast");
  });

  it("shows no name before three answers agree, with the agreeing count as dots (V2)", () => {
    draw({ panel: { kind: "unsure", agreeing: 2 }, outline: withCard() });
    expect(panel().dataset.state).toBe("unsure");
    expect(panel().closest("[aria-live=polite]")).toBeTruthy();
    expect(panel().querySelectorAll("i[data-on]")).toHaveLength(2);
    expect(outlineEl().dataset.look).toBe("lit");
    expect(panel().textContent).not.toContain("Sol Ring");
  });

  it("offers a sure card on a green outline, holds on press down and adds on release (V3, V4)", () => {
    const p = draw({ mode: "normal", panel: { kind: "sure", guess: SOL, held: false, again: null }, count: 3, outline: withCard() });
    expect(outlineEl().dataset.look).toBe("ok");
    expect(within(panel()).getByText("Sol Ring")).toBeTruthy();
    expect(within(panel()).getByText("Artifact")).toBeTruthy();
    const add = screen.getByRole("button", { name: copy.view.add });
    fireEvent.pointerDown(add);
    expect(p.onHold).toHaveBeenCalled();
    fireEvent.pointerUp(add);
    expect(p.onAdd).toHaveBeenCalledTimes(1);
    // A pointer's own click is not a second add; a click with no pointer (assistive tech) is one.
    fireEvent.click(add, { detail: 1 });
    expect(p.onAdd).toHaveBeenCalledTimes(1);
    fireEvent.click(add, { detail: 0 });
    expect(p.onAdd).toHaveBeenCalledTimes(2);
    // A held Enter adds once, not once per repeat.
    fireEvent.keyDown(add, { key: "Enter" });
    fireEvent.keyDown(add, { key: "Enter", repeat: true });
    expect(p.onAdd).toHaveBeenCalledTimes(3);
    fireEvent.pointerCancel(add);
    expect(p.onCancelHold).toHaveBeenCalled();
    expect(screen.getByTestId("scan-tray-count").textContent).toBe("3 on the list");
    expect(screen.getByRole("button", { name: copy.view.review(3) })).toBeTruthy();
  });

  it("marks a held guess and cancels when the finger slides off", () => {
    const p = draw({ mode: "normal", panel: { kind: "sure", guess: SOL, held: true, again: null } });
    expect(within(panel()).getByText(copy.view.held)).toBeTruthy();
    const add = screen.getByRole("button", { name: copy.view.add });
    fireEvent.pointerDown(add);
    fireEvent.pointerLeave(add);
    expect(p.onCancelHold).toHaveBeenCalled();
    // Sliding back on and letting go is not a fresh press: nothing is added.
    fireEvent.pointerUp(add);
    expect(p.onAdd).not.toHaveBeenCalled();
  });

  it("adds nothing on a release whose press began somewhere else", () => {
    const p = draw({ mode: "normal", panel: { kind: "sure", guess: SOL, held: false, again: null } });
    fireEvent.pointerUp(screen.getByRole("button", { name: copy.view.add }));
    expect(p.onAdd).not.toHaveBeenCalled();
  });

  it("says a duplicate is already on the list, and a second copy takes its own press (R1, R2)", () => {
    draw({ mode: "normal", panel: { kind: "sure", guess: SOL, held: false, again: { kind: "duplicate", count: 1 } } });
    expect(within(panel()).getByText(copy.again.stillOn(1))).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.again.addAnother })).toBeTruthy();
  });

  it("on the desktop scrolls the printing grid in its own box, with Not this card outside it", () => {
    const choices = [1, 2, 3].map((n) => ({
      scryfallId: `00000000-0000-4000-8000-00000000000${n}`, setCode: `s${n}`, setName: null, collectorNumber: String(n),
      releasedAt: null, imageUri: null, flavorName: null, finishes: ["nonfoil" as const], owned: {},
    }));
    draw({ layout: "desk", mode: "normal", panel: { kind: "choose", guess: SOL, choices } });
    const box = screen.getByTestId("scan-printings");
    expect(box.className).toContain("overflow-y-auto");
    expect(box.className).toContain("max-h-");
    expect(box.contains(screen.getByRole("button", { name: copy.view.notThis }))).toBe(false);
  });

  it("in Auto draws no press and no wait: a sure card reads as added from its own frame, and one never out of the frame says how to add another", () => {
    for (const again of [null, { kind: "second" as const, count: 1 }]) {
      draw({ panel: { kind: "sure", guess: SOL, held: false, again } });
      expect(panel().dataset.state).toBe("added");
      expect(within(panel()).queryByRole("button")).toBeNull();
      expect(panel().textContent).toContain(copy.view.added(SOL.name));
      expect(screen.queryByText(/Adding/)).toBeNull();
      cleanup();
    }
    draw({ panel: { kind: "sure", guess: SOL, held: false, again: { kind: "duplicate", count: 1 } } });
    expect(within(panel()).queryByRole("button")).toBeNull();
    expect(within(panel()).getByText(copy.again.stillOn(1))).toBeTruthy();
    expect(within(panel()).getByRole("status").textContent).toBe(copy.view.takeOut);
    cleanup();
    // Its line removed since: no "on the list" line, and still the take-out instruction.
    draw({ panel: { kind: "sure", guess: SOL, held: false, again: { kind: "duplicate", count: 0 } } });
    expect(within(panel()).queryByText(copy.again.stillOn(0))).toBeNull();
    expect(within(panel()).getByRole("status").textContent).toBe(copy.view.takeOut);
  });

  it("in Normal draws the card's printings in the camera, and a pick or Not this card goes back", () => {
    const choice = (n: string) => ({
      scryfallId: `00000000-0000-4000-8000-00000000000${n}`, setCode: `s${n}`, setName: `Set ${n}`, collectorNumber: n,
      releasedAt: null, imageUri: null, flavorName: null, finishes: ["nonfoil" as const], owned: {},
    });
    const onChoosePrinting = vi.fn();
    const onNotThis = vi.fn();
    draw({ mode: "normal", panel: { kind: "choose", guess: SOL, choices: null }, onChoosePrinting, onNotThis, outline: withCard() });
    expect(panel().dataset.state).toBe("choose");
    expect(within(panel()).getByRole("status").textContent).toBe(copy.view.loadingPrintings);
    expect(outlineEl().dataset.look).toBe("ok");
    cleanup();
    const choices = [choice("1"), choice("2")];
    draw({ mode: "normal", panel: { kind: "choose", guess: SOL, choices }, onChoosePrinting, onNotThis });
    expect(within(panel()).getByText(collectionEditCopy.add.choose.introPhone(2))).toBeTruthy();
    expect(screen.getByTestId("scan-printings").className).not.toContain("overflow-y-auto");
    const tiles = within(panel()).getAllByRole("radio");
    fireEvent.click(tiles[1]);
    expect(onChoosePrinting).toHaveBeenCalledWith(choices[1]);
    fireEvent.click(screen.getByRole("button", { name: copy.view.notThis }));
    expect(onNotThis).toHaveBeenCalled();
  });

  it("leads with the scored printings, the best selected, and takes the selection on Add this printing", () => {
    const pc = (n: string) => ({
      scryfallId: `00000000-0000-4000-8000-00000000000${n}`, setCode: `s${n}`, setName: null, collectorNumber: n,
      releasedAt: null, imageUri: `https://cards.scryfall.io/normal/front/0/0/${n}.jpg?1`, flavorName: null, finishes: ["nonfoil" as const], owned: {},
    });
    const choices = [pc("1"), pc("2"), pc("3"), pc("4")];
    const guess = { ...SOL, printings: [{ scryfallId: choices[2].scryfallId, score: 0.9 }, { scryfallId: choices[0].scryfallId, score: 0.8 }] };
    const onChoosePrinting = vi.fn();
    draw({ mode: "normal", panel: { kind: "choose", guess, choices }, onChoosePrinting });
    const tiles = within(panel()).getAllByRole("radio");
    expect(tiles).toHaveLength(2);
    expect(tiles[0].getAttribute("aria-checked")).toBe("true");
    expect(within(panel()).getByRole("button", { name: collectionEditCopy.add.choose.showAll })).toBeTruthy();
    // The tiles draw Scryfall's small picture.
    expect(panel().innerHTML).toContain("/small/front/0/0/3.jpg");
    fireEvent.click(tiles[1]);
    expect(onChoosePrinting).not.toHaveBeenCalled();
    fireEvent.click(within(panel()).getByRole("button", { name: copy.view.addPrinting }));
    expect(onChoosePrinting).toHaveBeenCalledWith(choices[0]);
  });

  it("draws the second copy's line and press", () => {
    draw({ mode: "normal", panel: { kind: "sure", guess: SOL, held: false, again: { kind: "second", count: 2 } } });
    expect(within(panel()).getByText(copy.again.already(2))).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.again.addSecond })).toBeTruthy();
  });

  it("announces an added card (V5), and the count card turns to show it", () => {
    draw({ panel: { kind: "added", name: "Sol Ring" }, count: 4, flipTo: "https://img/sol" });
    const card = screen.getByTestId("scan-count-card");
    expect(card.hasAttribute("data-flip")).toBe(true);
    expect(card.querySelector("img")?.getAttribute("src")).toBe("https://img/sol");
    expect(screen.getByTestId("scan-flight").getAttribute("aria-hidden")).toBe("true");
    expect(panel().closest("[aria-live=polite]")).toBeTruthy();
    expect(panel().textContent).toContain(copy.view.added("Sol Ring"));
    expect(panel().textContent).toContain(copy.view.next);
  });

  it("offers the closest three when not sure, with the sleeve line and None of these (V6)", () => {
    const p = draw({ panel: { kind: "notSure", guesses: [SOL, ARC, MIND], sleeves: true } });
    fireEvent.click(screen.getByRole("button", { name: "Arcane Signet" }));
    expect(p.onPick).toHaveBeenCalledWith(ARC.oracleId);
    expect(panel().textContent).toContain(copy.view.sleeves);
    fireEvent.click(screen.getByRole("button", { name: copy.view.noneOfThese }));
    expect(p.onNoneOfThese).toHaveBeenCalled();
  });

  it("leaves the sleeve line out without sheen", () => {
    draw({ panel: { kind: "notSure", guesses: [SOL, ARC, MIND], sleeves: false } });
    expect(panel().textContent).not.toContain(copy.view.sleeves);
  });

  it("in the dark, rings the light when there is one, and says to find a lamp when there is not (V7, V8)", () => {
    draw({ dark: true });
    expect(screen.getByRole("status").textContent).toBe(copy.view.darkTorch);
    expect(screen.getByRole("button", { name: copy.view.light }).hasAttribute("data-ring")).toBe(true);
  });

  it("draws no light control at all without a torch, never a greyed one", () => {
    draw({ dark: true, torch: { available: false, on: false } });
    expect(screen.getByRole("status").textContent).toBe(copy.view.darkNoTorch);
    expect(screen.queryByRole("button", { name: copy.view.light })).toBeNull();
  });

  it("presses the light, which reads as on (V9)", () => {
    const p = draw({ torch: { available: true, on: true } });
    const light = screen.getByRole("button", { name: copy.view.light });
    expect(light.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(light);
    expect(p.onTorch).toHaveBeenCalled();
  });

  it("says a transient problem as an alert, at both widths", () => {
    draw({ notice: copy.lookupFailed });
    expect(screen.getByRole("alert").textContent).toBe(copy.lookupFailed);
  });

  it("closes from the ✕", () => {
    const p = draw();
    fireEvent.click(screen.getByRole("button", { name: copy.close }));
    expect(p.onClose).toHaveBeenCalled();
  });

  it("explains a blocked camera (D6), and on the desktop names the webcam with Stop (W6)", () => {
    draw({ screen: { kind: "blocked" } });
    expect(screen.getByRole("heading", { name: copy.camera.blockedTitle })).toBeTruthy();
    expect(screen.getByText(copy.camera.blockedBody)).toBeTruthy();
  });

  it("on the desktop draws the webcam panel with Stop and no tray or light", () => {
    const p = draw({ mode: "normal", layout: "desk", panel: { kind: "sure", guess: SOL, held: false, again: null } });
    expect(screen.getByText(copy.camera.webcam)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.camera.stop }));
    expect(p.onClose).toHaveBeenCalled();
    expect(screen.queryByTestId("scan-tray-count")).toBeNull();
    expect(screen.queryByRole("button", { name: copy.view.light })).toBeNull();
    expect(screen.getByRole("button", { name: copy.view.add })).toBeTruthy();
  });

  it("names the desktop's blocked webcam", () => {
    draw({ layout: "desk", screen: { kind: "blocked" } });
    expect(screen.getByText(copy.camera.noWebcamTitle)).toBeTruthy();
    expect(screen.getByText(copy.camera.noWebcamBody)).toBeTruthy();
  });

  it("offers photos on a blocked camera at both widths (D6, W6), and nothing when no picker is wired", () => {
    for (const layout of ["phone", "desk"] as const) {
      const onChoosePhotos = vi.fn();
      const { unmount } = render(
        <ScannerView
          layout={layout}
          screen={{ kind: "blocked" }}
          mode="fast"
          torch={{ available: false, on: false }}
          count={0}
          onMode={vi.fn()} onTorch={vi.fn()} onClose={vi.fn()} onReview={vi.fn()} onHold={vi.fn()} onAdd={vi.fn()}
          onCancelHold={vi.fn()} onPick={vi.fn()} onNoneOfThese={vi.fn()}
          onChoosePhotos={onChoosePhotos}
        />,
      );
      const press = screen.getByRole("button", { name: copy.camera.choosePhotos });
      if (layout === "phone") {
        // A short screen scrolls the body and never squeezes the footer holding the press.
        expect(press.parentElement!.className).toMatch(/flex-none/);
        expect(press.parentElement!.previousElementSibling!.className).toMatch(/overflow-y-auto/);
      }
      fireEvent.click(press);
      expect(onChoosePhotos).toHaveBeenCalledTimes(1);
      // The phone says what photos are for (D6); the desktop's body already does (W6).
      expect(screen.queryByText(copy.camera.photosLine) !== null).toBe(layout === "phone");
      unmount();
      draw({ layout, screen: { kind: "blocked" } });
      expect(screen.queryByRole("button", { name: copy.camera.choosePhotos })).toBeNull();
      expect(screen.queryByText(copy.camera.photosLine)).toBeNull();
      document.body.innerHTML = "";
    }
  });
});

describe("the card's outline", () => {
  it("is drawn at the detected corners, following object-fit: cover, wherever the card is in the frame", () => {
    draw({ outline: withCard() });
    // A 1000x1000 picture covering 400x800 is scaled 0.8 and cut 200px at each side: x = share * 800 - 200, y = share * 800.
    expect(outlineEl().querySelector("polygon")?.getAttribute("points")).toBe("120.0,240.0 280.0,240.0 280.0,560.0 120.0,560.0");
  });

  it("draws nothing while the store holds no card (a view given no store at all is the first test above)", () => {
    draw({ outline: createOutlineStore() });
    expect(screen.queryByTestId("scan-outline")).toBeNull();
  });

  it("is dashed while the card is only being looked at, lit while answers agree, ok on a read", () => {
    const look = (panel: ScanPanel) => {
      const { unmount } = render(<ScannerView {...baseProps(panel, withCard())} />);
      const l = outlineEl().dataset.look;
      unmount();
      return l;
    };
    expect(look({ kind: "unsure", agreeing: 0 })).toBe("dash");
    expect(look({ kind: "unsure", agreeing: 1 })).toBe("lit");
    expect(look({ kind: "sure", guess: SOL, held: false, again: null })).toBe("ok");
  });
});

describe("the hint for a card too small to match", () => {
  const small = () => {
    const store = createOutlineStore();
    // 0.2 x 0.4 of the picture is 8%, under the 12% where a match holds.
    store.show({ corners: [{ x: 0.4, y: 0.3 }, { x: 0.6, y: 0.3 }, { x: 0.6, y: 0.7 }, { x: 0.4, y: 0.7 }], width: 1000, height: 1000 });
    return store;
  };
  const big = () => {
    const store = createOutlineStore();
    // 0.4 x 0.6 is 24%.
    store.show({ corners: [{ x: 0.3, y: 0.2 }, { x: 0.7, y: 0.2 }, { x: 0.7, y: 0.8 }, { x: 0.3, y: 0.8 }], width: 1000, height: 1000 });
    return store;
  };
  it("says Move closer for a card seen under 12% of the picture, and Hold it still for a bigger one", () => {
    draw({ panel: { kind: "unsure", agreeing: 0 }, outline: small() });
    expect(panel().textContent).toContain(copy.view.closer);
    expect(panel().textContent).not.toContain(copy.view.unsure);
  });
  it("keeps Hold it still for a card of a good size, and for a view with no store", () => {
    draw({ panel: { kind: "unsure", agreeing: 0 }, outline: big() });
    expect(panel().textContent).toContain(copy.view.unsure);
    document.body.innerHTML = "";
    draw({ panel: { kind: "unsure", agreeing: 0 } });
    expect(panel().textContent).toContain(copy.view.unsure);
  });
});

describe("outlineLook", () => {
  it("is green on a sure answer, solid once answers agree, dashed while a card is only seen", () => {
    const s = (panel: ScanPanel) => outlineLook({ kind: "scanning", panel, dark: false });
    expect(s({ kind: "sure", guess: SOL, held: false, again: null })).toBe("ok");
    expect(s({ kind: "unsure", agreeing: 0 })).toBe("dash");
    expect(s({ kind: "unsure", agreeing: 2 })).toBe("lit");
    expect(s({ kind: "notSure", guesses: [], sleeves: false })).toBe("lit");
    expect(s({ kind: "looking" })).toBe("dash");
    expect(outlineLook({ kind: "blocked" })).toBe("dash");
    expect(outlineLook({ kind: "scanning", panel: { kind: "looking" }, dark: true }, true)).toBe("ok");
    expect(outlineLook({ kind: "scanning", panel: { kind: "looking" }, dark: true })).toBe("lit");
  });
});

describe("ScannerView, more", () => {
  it("ignores a right-click on Add: the context menu opens and nothing is held or added", () => {
    const p = draw({ mode: "normal", panel: { kind: "sure", guess: SOL, held: false, again: null } });
    const add = screen.getByRole("button", { name: copy.view.add });
    fireEvent.pointerDown(add, { button: 2 });
    fireEvent.pointerUp(add, { button: 2 });
    expect(p.onHold).not.toHaveBeenCalled();
    expect(p.onAdd).not.toHaveBeenCalled();
  });
});
