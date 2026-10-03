// The zoom (card detail R2, §3): the whole card at something like hand size, as a
// region inside the dialog rather than a second one.
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { BrowseCard } from "../../lib/collection/browse";
import { cardZoomCopy } from "../../lib/copy/card-surfaces";
import { indexPriceRows } from "../../lib/cards/price-lookup";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardModal } = await import("./card-modal");

const card = (over: Partial<BrowseCard> = {}): BrowseCard => ({
  oracleId: "o1",
  name: "Smothering Tithe",
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
  cmc: 4,
  oracleText: "",
  keywords: [],
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: "https://img/front.jpg",
  printedName: null,
  quantity: 1,
  printings: [{
    setCode: "RVR",
    scryfallId: "s-1",
    setName: "Ravnica Remastered",
    collectorNumber: "12",
    releasedAt: "2024-01-12",
    quantity: 1,
    finishes: { nonfoil: 1 },
    imageUri: "https://img/front.jpg",
    flavorName: null,
  }],
  setCodes: ["RVR"],
  primarySetCode: "RVR",
  preferredPrinting: null,
  ...over,
});

function mount(c: BrowseCard = card()) {
  const onClose = vi.fn();
  render(<CardModal card={c} position={1} total={1} onClose={onClose} onPrev={null} onNext={null} />);
  return { onClose };
}

const openZoom = () => {
  // Both breakpoint trees mount an art trigger; either opens the same layer.
  fireEvent.click(screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0]);
};

describe("the zoom", () => {
  it("opens from the art and shows the whole card with one caption", () => {
    mount();
    expect(screen.queryByTestId("card-zoom")).toBeNull();

    openZoom();

    const layer = screen.getByTestId("card-zoom");
    expect(layer).toHaveAttribute("role", "region");
    expect(layer.querySelector('[data-testid="card-zoom-card"]')).not.toBeNull();
    expect(layer).toHaveTextContent("Ravnica Remastered · RVR 12");
  });

  // H22: the zoom matches the view behind it at each width. On the phone that is the art
  // header's opaque ground and blurred wash of the zoomed face; from `md` the dialog draws no
  // wash, so the zoom keeps the scrim and its blur.
  it("washes the phone zoom in the zoomed face's art, and keeps the desktop scrim", () => {
    mount();
    openZoom();
    const layer = screen.getByTestId("card-zoom");
    expect(layer.className).toContain("bg-[color:var(--surface-sunken)]");
    expect(layer.className).toContain("md:bg-[color-mix(in_srgb,var(--bg)_94%,transparent)]");
    expect(layer.className).toContain("md:backdrop-blur-[10px]");
    const wash = within(layer).getByTestId("card-zoom-wash");
    expect(wash.className).toContain("md:hidden");
    expect(wash.getAttribute("style")).toContain("front.jpg");
    expect(wash.style.filter).toBe("blur(22px)");
  });

  it("is a region inside the dialog, not a second dialog", () => {
    // A second `role="dialog"` would mean a second focus trap, a second thing for
    // Escape to mean, and a backdrop whose click-to-close no longer reaches.
    mount();
    openZoom();

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByTestId("card-zoom").closest('[role="dialog"]')).not.toBeNull();
  });

  it("closes by the card, by the layer, and by its own control", () => {
    mount();

    openZoom();
    fireEvent.click(screen.getByTestId("card-zoom-card"));
    expect(screen.queryByTestId("card-zoom")).toBeNull();

    openZoom();
    fireEvent.click(screen.getByTestId("card-zoom"));
    expect(screen.queryByTestId("card-zoom")).toBeNull();

    openZoom();
    fireEvent.click(screen.getByRole("button", { name: cardZoomCopy.close }));
    expect(screen.queryByTestId("card-zoom")).toBeNull();
  });

  it("takes the first Escape and leaves the dialog the second", () => {
    const { onClose } = mount();
    openZoom();

    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(screen.queryByTestId("card-zoom")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(onClose).toHaveBeenCalled();
  });

  it("names the printing on the reverse face", () => {
    mount(card({ layout: "transform", backImageUri: "https://img/back.jpg", name: "Delver of Secrets // Insectile Aberration" }));

    fireEvent.click(screen.getAllByRole("button", { name: /Look at/ })[0]);
    // Turned INSIDE the layer. The zoom keeps its own face, so turning the art behind
    // it would say nothing about what the zoom is showing.
    fireEvent.click(within(screen.getByTestId("card-zoom")).getByRole("button", { name: /Turn over to/ }));

    expect(screen.getByTestId("card-zoom")).toHaveTextContent(`RVR 12${cardZoomCopy.backSuffix}`);
  });

  it("opens on a card with no art rather than refusing", () => {
    mount(card({
      imageUri: null,
      printings: [{ ...card().printings[0], imageUri: null }],
    }));

    openZoom();

    // The gradient stands in for the picture; nothing is drawn to stand in for a card.
    expect(screen.getByTestId("card-zoom-card").getAttribute("style")).toContain("gradient");
  });

  it("says the same thing about an unowned card", () => {
    mount(card({ quantity: 0, printings: [{ ...card().printings[0], quantity: 0, finishes: {} }] }));

    openZoom();

    expect(screen.getByTestId("card-zoom")).toHaveTextContent("Ravnica Remastered · RVR 12");
  });

  it("omits the collector number and its separator when the holding carries none", () => {
    mount(card({ printings: [{ ...card().printings[0], collectorNumber: "" }] }));

    openZoom();

    expect(screen.getByTestId("card-zoom")).toHaveTextContent("Ravnica Remastered · RVR");
    expect(screen.getByTestId("card-zoom").textContent).not.toContain("RVR ·");
  });

  it("moves focus to the close on open and back to the art on close", () => {
    mount();
    openZoom();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: cardZoomCopy.close }));

    fireEvent.click(screen.getByRole("button", { name: cardZoomCopy.close }));
    expect(document.activeElement).toBe(
      screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0],
    );
  });

  it("makes everything under the layer inert", () => {
    // The shipped ✕ stays mounted behind the zoom, and the dialog's focus trap
    // collects every button in the dialog — so a Tab could otherwise reach it and
    // close the whole modal when the reader meant to close the zoom.
    mount();
    openZoom();

    const covered = screen.getAllByRole("button", { name: "Close card details" });
    expect(covered.length).toBeGreaterThan(0);
    for (const button of covered) {
      expect(button.closest("[inert]")).not.toBeNull();
    }
    // The layer's own control is not under an inert ancestor.
    expect(screen.getByRole("button", { name: cardZoomCopy.close }).closest("[inert]")).toBeNull();
  });

  it("draws no caption at all for a card with no printings", () => {
    // ` · ` is not a printing label.
    mount(card({ printings: [] }));
    openZoom();

    expect(screen.getByTestId("card-zoom").querySelector("p")).toBeNull();
  });

  it("names the set once when the catalog has no name for it", () => {
    mount(card({ printings: [{ ...card().printings[0], setName: null }] }));
    openZoom();

    expect(screen.getByTestId("card-zoom")).toHaveTextContent("RVR 12");
    expect(screen.getByTestId("card-zoom").textContent).not.toContain("RVR · RVR");
  });

  it("points at the region only while it exists", () => {
    // A dangling `aria-controls` is a reference to nothing for assistive tech.
    mount();
    const closed = screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0];
    expect(closed).not.toHaveAttribute("aria-controls");

    openZoom();

    expect(screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0])
      .toHaveAttribute("aria-controls", "card-zoom");
  });

  it("opens the modal on the close, not on the art", () => {
    // The art became a button and sits before the content column, so DOM order alone
    // would have moved the dialog's initial focus onto "Look at … up close".
    mount();

    expect(document.activeElement).toBe(screen.getAllByRole("button", { name: "Close card details" })[0]);
  });

  it("walks down the ladder on a quick double-press", () => {
    // Zoom, then dialog. The rungs are only worth having if pressing twice quickly
    // takes both — an earlier version held the first rung through an exit animation
    // and swallowed the second press.
    const { onClose } = mount();
    openZoom();

    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });

    expect(onClose).toHaveBeenCalled();
  });

  it("still opens from the 72px thumb once the header has collapsed", () => {
    // The compact header withholds the MARK and keeps the GESTURE — withholding a
    // mark is visual, withholding a gesture is functional — so the thumb has to stay
    // a trigger with nothing drawn on it to say so.
    const many = Array.from({ length: 14 }, (_, i) => ({
      ...card().printings[0],
      scryfallId: `s-${i}`,
      collectorNumber: String(i),
    }));
    mount(card({ printings: many }));
    fireEvent.click(screen.getAllByRole("button", { name: /printings owned/ })[0]);

    // Scoped to the PHONE art box: both breakpoint trees are mounted, and the
    // desktop one never collapses — a query across both would pass on the desktop
    // trigger while the thumb had lost its own.
    const thumb = screen.getByTestId("modal-art-mobile");
    const trigger = thumb.querySelector("button");
    expect(trigger).not.toBeNull();
    // Present AND reachable: `querySelector` finds a hidden button just as happily.
    expect(trigger).toBeVisible();
    expect(trigger?.getAttribute("aria-label")).toBe(cardZoomCopy.zoomAria("Smothering Tithe"));
    // And the mark is withheld here, which is the other half of the ruling.
    expect(thumb.textContent).not.toContain("⤢");

    fireEvent.click(trigger as HTMLElement);

    expect(screen.getByTestId("card-zoom")).toBeInTheDocument();
  });

  it("reports its own state on the trigger", () => {
    mount();
    const trigger = screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0];
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    openZoom();

    expect(screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0])
      .toHaveAttribute("aria-expanded", "true");
  });
});

// The turn (card detail R2, §4): inside the zoom the card turns; everywhere else the
// ratified swap stands.
describe("the turn inside the zoom", () => {
  const twoFaced = () => card({
    layout: "transform",
    backImageUri: "https://img/back.jpg",
    name: "Delver of Secrets // Insectile Aberration",
  });

  const openTwoFaced = () => {
    mount(twoFaced());
    fireEvent.click(screen.getAllByRole("button", { name: /Look at/ })[0]);
    return screen.getByTestId("card-zoom");
  };

  it("washes the zoom in the face it turned to", () => {
    const layer = openTwoFaced();
    expect(within(layer).getByTestId("card-zoom-wash").getAttribute("style")).toContain("front.jpg");
    fireEvent.click(within(layer).getByRole("button", { name: /Turn over to/ }));
    expect(within(layer).getByTestId("card-zoom-wash").getAttribute("style")).toContain("back.jpg");
  });

  it("draws both faces, each hiding its own back", () => {
    // A turning card shows both at once. A single box whose background swapped
    // mid-turn would be the instant swap this amendment replaces.
    const layer = openTwoFaced();

    const front = within(layer).getByTestId("card-zoom-face-front");
    const back = within(layer).getByTestId("card-zoom-face-back");
    expect(front.getAttribute("style")).toContain("front.jpg");
    expect(back.getAttribute("style")).toContain("back.jpg");
    expect(front.getAttribute("style")).toContain("backface-visibility: hidden");
    // Both faces hide their own back, not just the front — without it the back shows
    // through mirrored for the whole first half of the turn.
    expect(back.getAttribute("style")).toContain("backface-visibility: hidden");
    expect(back.getAttribute("style")).toContain("rotateY(180deg)");
  });

  it("turns the card rather than swapping the picture", () => {
    const layer = openTwoFaced();
    const box = within(layer).getByTestId("card-zoom-card");
    expect(box.getAttribute("data-face")).toBe("front");

    fireEvent.click(within(layer).getByRole("button", { name: /Turn over to/ }));

    expect(box.getAttribute("data-face")).toBe("back");
    expect(box.getAttribute("style")).toContain("rotateY(180deg)");
    expect(box.className).toContain("anim-card-turn");
  });

  it("does not put the card away when the reader turns it", () => {
    // The layer dismisses on click and the control sits on top of it.
    const layer = openTwoFaced();

    fireEvent.click(within(layer).getByRole("button", { name: /Turn over to/ }));

    expect(screen.getByTestId("card-zoom")).toBeInTheDocument();
  });

  it("names the face it turns to, and announces the one it landed on", () => {
    const layer = openTwoFaced();
    const turn = within(layer).getByRole("button", { name: "Turn over to Insectile Aberration" });

    fireEvent.click(turn);

    expect(within(screen.getByTestId("card-zoom")).getByRole("button", { name: "Turn over to Delver of Secrets" }))
      .toBeInTheDocument();
    // Announced on the landing, not the press: a reader pressing twice quickly is
    // never told about a face the card did not rest on.
    expect(screen.getByRole("dialog").querySelector('[aria-live="polite"]')?.textContent).toBe("");

    fireEvent.transitionEnd(within(screen.getByTestId("card-zoom")).getByTestId("card-zoom-card"), {
      propertyName: "transform",
    });

    expect(screen.getByRole("dialog").querySelector('[aria-live="polite"]')?.textContent)
      .toBe("Showing Insectile Aberration");
  });

  it("keeps the control off the face that turns", () => {
    // Inside the rotating box the control rode the rotation: on the back its corner
    // became the opposite one and its glyph was drawn mirrored from behind.
    const layer = openTwoFaced();

    const control = within(layer).getByRole("button", { name: /Turn over to/ });
    expect(control.closest('[data-testid="card-zoom-card"]')).toBeNull();
    expect(control.closest('[data-testid="card-zoom-stage"]')).not.toBeNull();
  });

  it("puts its announcements where they can be read", () => {
    // The zoom marks the content column inert, and an inert subtree is out of the
    // accessibility tree — a live region inside it announces to nobody.
    const layer = openTwoFaced();
    fireEvent.click(within(layer).getByRole("button", { name: /Turn over to/ }));
    fireEvent.transitionEnd(within(layer).getByTestId("card-zoom-card"), { propertyName: "transform" });

    const region = screen.getByRole("dialog").querySelector('[aria-live="polite"]');
    expect(region?.textContent).toBe("Showing Insectile Aberration");
    expect(region?.closest("[inert]")).toBeNull();
  });

  it("does not carry the art's announcement into the zoom", () => {
    mount(twoFaced());
    fireEvent.click(screen.getAllByRole("button", { name: /Turn over to/ })[0]);
    // The art turns now, so its face is announced on the landing — same rule the
    // zoom's own turn follows, and jsdom runs no transitions.
    screen
      .queryAllByTestId("modal-art-turn")
      .forEach((box) => fireEvent.transitionEnd(box, { propertyName: "transform" }));
    expect(screen.getByRole("dialog").querySelector('[aria-live="polite"]')?.textContent)
      .toBe("Showing Insectile Aberration");

    fireEvent.click(screen.getAllByRole("button", { name: /Look at/ })[0]);

    expect(screen.getByRole("dialog").querySelector('[aria-live="polite"]')?.textContent).toBe("");
  });

  it("does not leave a stale announcement behind when the zoom closes", () => {
    const layer = openTwoFaced();
    fireEvent.click(within(layer).getByRole("button", { name: /Turn over to/ }));
    fireEvent.transitionEnd(within(layer).getByTestId("card-zoom-card"), { propertyName: "transform" });

    fireEvent.click(screen.getByRole("button", { name: cardZoomCopy.close }));

    expect(screen.getByRole("dialog").querySelector('[aria-live="polite"]')?.textContent).toBe("");
  });

  it("keeps the turn off the card entirely", () => {
    // It sat bottom-right, where a creature prints its P/T; then bottom-centre,
    // still printed across the picture. It is now UNDER the card, which is the
    // only placement that covers none of it — so the assertion is containment,
    // not coordinates: a control inside the card's box is on the card however it
    // is positioned.
    const layer = openTwoFaced();

    const control = within(layer).getByRole("button", { name: /Turn over to/ });
    expect(within(layer).getByTestId("card-zoom-card").contains(control)).toBe(false);
    expect(control.getAttribute("style")).not.toContain("position: absolute");
  });

  it("announces at once for a reader who asked for less motion", () => {
    // There is no transition to wait for there, so the press IS the landing — and
    // this is the only path that announces without a `transitionend`.
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      const layer = openTwoFaced();

      fireEvent.click(within(layer).getByRole("button", { name: /Turn over to/ }));

      expect(screen.getByRole("dialog").querySelector('[aria-live="polite"]')?.textContent)
        .toBe("Showing Insectile Aberration");
    } finally {
      window.matchMedia = original;
    }
  });

  it("keeps the seam on both faces", () => {
    // The faces paint over the parent's inset ring, so each carries its own or the
    // zoomed card loses its edge on exactly the cards that have two of them.
    const layer = openTwoFaced();

    for (const id of ["card-zoom-face-front", "card-zoom-face-back"]) {
      expect(within(layer).getByTestId(id).getAttribute("style")).toContain("inset 0 0 0 1px");
    }
  });

  it("gives a one-faced card no control at all", () => {
    // The gate is the `layout` column, never a `//` in the name: a split or adventure
    // card carries the separator and has no back.
    mount(card({ name: "Fire // Ice", layout: "split" }));
    fireEvent.click(screen.getAllByRole("button", { name: /Look at/ })[0]);

    expect(within(screen.getByTestId("card-zoom")).queryByRole("button", { name: /Turn over to/ })).toBeNull();
  });

  it("opens on the front however the last zoom was left", () => {
    // A zoom is a look, not a setting.
    const layer = openTwoFaced();
    fireEvent.click(within(layer).getByRole("button", { name: /Turn over to/ }));
    fireEvent.click(screen.getByRole("button", { name: cardZoomCopy.close }));

    fireEvent.click(screen.getAllByRole("button", { name: /Look at/ })[0]);

    expect(within(screen.getByTestId("card-zoom")).getByTestId("card-zoom-card").getAttribute("data-face"))
      .toBe("front");
  });

  it("leaves the art behind it on the face the reader chose", () => {
    // `flipped` belongs to the un-zoomed control, which the reader may have turned
    // for their own reasons; the layer turns its own copy.
    mount(twoFaced());
    fireEvent.click(screen.getAllByRole("button", { name: /Turn over to/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /Look at/ })[0]);

    expect(within(screen.getByTestId("card-zoom")).getByTestId("card-zoom-card").getAttribute("data-face"))
      .toBe("front");
    fireEvent.click(screen.getByRole("button", { name: cardZoomCopy.close }));
    expect(screen.getAllByRole("button", { name: "Turn over to Delver of Secrets" }).length)
      .toBeGreaterThan(0);
  });

  it("holds a face the art landed on behind the zoom until the zoom closes", () => {
    // Turn the art, open the zoom before the 320ms turn ends, let it land. The
    // layer shows the FRONT, so announcing the back there would describe a card
    // nobody is looking at — but on close that back face IS what is on screen,
    // and a turn nobody announced is a face the reader was never told about.
    mount(twoFaced());
    fireEvent.click(screen.getAllByRole("button", { name: /Turn over to/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /Look at/ })[0]);
    const region = () => screen.getByRole("dialog").querySelector('[aria-live="polite"]');
    expect(region()?.textContent).toBe("");

    screen
      .queryAllByTestId("modal-art-turn")
      .forEach((box) => fireEvent.transitionEnd(box, { propertyName: "transform" }));
    expect(region()?.textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: cardZoomCopy.close }));
    expect(region()?.textContent).toBe("Showing Insectile Aberration");
  });

  it("puts focus on the turn rather than the close", () => {
    const layer = openTwoFaced();

    expect(document.activeElement)
      .toBe(within(layer).getByRole("button", { name: /Turn over to/ }));
  });
});

// #3 and #4 — the ⤢ plate is gone, a line of words says the same thing, and the
// turn control has come off the art to sit between that line and the price.
describe("what sits under the card", () => {
  const twoFaced = () => card({
    layout: "transform",
    backImageUri: "https://img/back.jpg",
    name: "Delver of Secrets // Insectile Aberration",
  });

  it("names the gesture each width actually has", () => {
    mount();
    // Both breakpoint trees mount, one per width, and the word for the gesture is
    // the one thing a hint like this cannot get wrong.
    const hints = screen.getAllByTestId("modal-zoom-hint").map((n) => n.textContent);
    expect(hints).toContain(cardZoomCopy.hintDesktop);
    expect(hints).toContain(cardZoomCopy.hintPhone);
  });

  it("draws no ⤢ plate anywhere — the hint replaced it", () => {
    mount();
    expect(screen.getByRole("dialog").textContent).not.toContain("⤢");
  });

  // PRICED, or the order test proves two thirds of an order: without a figure the
  // stack holds a hint and a turn, and a regression putting the price on top would
  // sail through.
  const pricedTwoFaced = (): BrowseCard => ({
    ...twoFaced(),
    // Built through `indexPriceRows`, the real indexer, rather than a hand-shaped
    // object: the lookup asks about `catalogIds` and two identities, and a fixture
    // shaped by hand agrees with whichever of them it was written against.
    prices: indexPriceRows([{
      newest_as_of: "2026-09-08 09:00:00",
      scryfall_id: "s-1",
      set_code: "RVR",
      collector_number: "12",
      price_cents: 241,
      price_cents_foil: null,
      price_cents_etched: null,
      as_of: "2026-09-08 09:00:00",
    }]),
  });

  it("orders the stack hint, turn, price", () => {
    mount(pricedTwoFaced());
    // Source order is the laid-out order in a flex column, so the DOM is the
    // assertion. A browser proves the geometry; this proves the sequence.
    const stack = screen.getAllByTestId("modal-under-card")[0];
    const rows = [...stack.querySelectorAll("[data-testid], button")];
    const at = (pred: (n: Element) => boolean) => rows.findIndex(pred);
    const hint = at((n) => n.getAttribute("data-testid") === "modal-zoom-hint");
    const turn = at((n) => n.getAttribute("aria-label")?.startsWith("Turn over to") ?? false);
    const price = at((n) => n.getAttribute("data-testid")?.startsWith("modal-price-") ?? false);
    expect(hint).toBeGreaterThanOrEqual(0);
    expect(turn).toBeGreaterThan(hint);
    expect(price).toBeGreaterThan(turn);
  });

  it("announces the art's face at once for a reader who asked for less motion", () => {
    // `anim-card-turn` is `transition: none` under reduced motion, so there is no
    // landing to wait for and the press IS the landing. It is the only
    // announcement path the modal art has there, and nothing covered it — the
    // zoom's own reduced-motion case is a different control.
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      mount(twoFaced());
      fireEvent.click(screen.getAllByRole("button", { name: /Turn over to/ })[0]);
      // No `transitionEnd` fired, deliberately: there is no transition.
      expect(screen.getByRole("dialog").querySelector('[aria-live="polite"]')?.textContent)
        .toBe("Showing Insectile Aberration");
    } finally {
      window.matchMedia = original;
    }
  });

  it("keeps the hint out of the accessibility tree", () => {
    // The art's own button is already named "Look at {card} up close". A second
    // voice saying "Click to zoom" beside it is the same instruction twice.
    mount();
    for (const hint of screen.getAllByTestId("modal-zoom-hint")) {
      expect(hint).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("keeps the turn OUT of the box that rotates", () => {
    // Inside it the control rides the rotation and is drawn from behind on the
    // back face — the bug the zoom's own control was lifted out of the box for.
    mount(twoFaced());
    const turning = screen.getAllByTestId("modal-art-turn")[0];
    expect(turning.querySelector('button[aria-label^="Turn over to"]')).toBeNull();
    // And so is the zoom trigger, or the card stops opening once turned.
    expect(turning.querySelector("button")).toBeNull();
  });

  it("withholds the whole stack on the compact header", () => {
    // A 72px thumbnail is a locator in a printing-picker state, not the thing
    // being read; the name and type line sit beside it instead.
    const many = card({
      layout: "transform",
      backImageUri: "https://img/back.jpg",
      printings: Array.from({ length: 14 }, (_, i) => ({
        setCode: "RVR",
        setName: "Ravnica Remastered",
        collectorNumber: String(i + 1),
        releasedAt: "2024-01-12",
        quantity: 1,
        finishes: { nonfoil: 1 },
        imageUri: "https://img/front.jpg",
        flavorName: null,
      })),
    });
    mount(many);
    fireEvent.click(screen.getAllByRole("button", { name: /printings owned/ })[0]);
    const phoneStack = screen
      .queryAllByTestId("modal-under-card")
      .filter((n) => n.className.includes("relative z-[1]"));
    expect(phoneStack).toHaveLength(0);
  });
});
