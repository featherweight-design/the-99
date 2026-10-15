// The tilt (foil handoff R2, PR 2; audit G1 to G13): the markup the CSS reads, the values the handlers write, and the CSS
// as text. What it draws is `probe:foil-film`'s; the phone's hold has its own tests beside the sheet gesture's.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { BrowseCard, BrowsePrinting } from "../../lib/collection/browse";
import { cardZoomCopy } from "../../lib/copy/card-surfaces";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardModal } = await import("./card-modal");

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../app/globals.css"), "utf8");

/** One pass by brace matching: each `@media` block's body under its query, and what is left outside every block. */
const media = new Map<string, string>();
let outside = "";
for (let i = 0; i < CSS.length;) {
  const at = CSS.indexOf("@media", i);
  if (at === -1) { outside += CSS.slice(i); break; }
  outside += CSS.slice(i, at);
  const open = CSS.indexOf("{", at);
  let depth = 0, j = open;
  for (; j < CSS.length; j++) if (CSS[j] === "{") depth++; else if (CSS[j] === "}" && --depth === 0) break;
  const query = CSS.slice(at + 7, open).trim();
  media.set(query, (media.get(query) ?? "") + CSS.slice(open + 1, j));
  i = j + 1;
}
const block = (q: string) => media.get(q) ?? "";
const MOTION = block("(prefers-reduced-motion: no-preference)");
const FINE = block("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");

const FRONT = "https://img/front.jpg";
const BACK = "https://img/back.jpg";
const printing = (over: Partial<BrowsePrinting> = {}): BrowsePrinting => ({
  setCode: "MSC", scryfallId: "s-1", setName: "Duskmourn Commander", collectorNumber: "12", releasedAt: "2024-09-27",
  quantity: 1, finishes: { foil: 1 }, imageUri: FRONT, hasOwnArt: true, flavorName: null, ...over,
});
const card = (over: Partial<BrowseCard> = {}): BrowseCard => ({
  oracleId: "o1", name: "Smothering Tithe", typeLine: "Enchantment", manaCost: "{3}{W}", cmc: 4, oracleText: "",
  keywords: [], rarity: "rare", colorIdentity: ["W"], imageUri: FRONT, printedName: null, quantity: 1,
  printings: [printing()], setCodes: ["MSC"], primarySetCode: "MSC", preferredPrinting: null, ...over,
});
const twoFaced = () => card({
  name: "Delver of Secrets // Insectile Aberration", layout: "transform", backImageUri: BACK,
  printings: [printing({ backImageUri: BACK, hasOwnBack: true })],
});
function mount(c: BrowseCard = card(), props: Partial<Parameters<typeof CardModal>[0]> = {}) {
  return render(<CardModal card={c} position={1} total={1} onClose={vi.fn()} onPrev={null} onNext={null} {...props} />);
}
// A card paged to, so the outer boxes carry their entry animations.
const paged = { position: 2, total: 3, onPrev: vi.fn(), onNext: vi.fn(), enterFrom: "next" as const, enterOffset: -100 };
const desktopHost = () => screen.getByTestId("modal-art-desktop-tilt");
const phoneHost = () => screen.getByTestId("modal-art-mobile-tilt");
const tiltValues = (el: HTMLElement) => ({ x: el.style.getPropertyValue("--tilt-x"), y: el.style.getPropertyValue("--tilt-y"),
  lift: el.style.getPropertyValue("--tilt-lift"), tilting: el.hasAttribute("data-tilting") });
const FLAT = { x: "", y: "", lift: "", tilting: false };
/** A 264 x 368 box at (0, 0), since jsdom lays nothing out. */
const sized = (el: HTMLElement) => {
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 264, height: 368, right: 264, bottom: 368, x: 0, y: 0, toJSON: () => ({}) });
  return el;
};
function reducedMotion() {
  const real = window.matchMedia;
  window.matchMedia = ((q: string) => ({ ...real(q), matches: q === "(prefers-reduced-motion: reduce)" || real(q).matches })) as typeof window.matchMedia;
  return () => { window.matchMedia = real; };
}
let restore: (() => void) | null = null;
afterEach(() => { restore?.(); restore = null; });

describe("the stylesheet", () => {
  it("registers the three values, so the transition eases them rather than stepping", () => {
    for (const [name, initial] of [["--tilt-x", ".5"], ["--tilt-y", ".5"], ["--tilt-lift", "0"]]) {
      expect(CSS).toContain(`@property ${name} { syntax: "<number>"; inherits: true; initial-value: ${initial}; }`);
    }
  });

  it("keeps every motion rule under no-preference, with --tilt-ease local to the host", () => {
    const still = outside;
    for (const motion of ["rotateX(", "--tilt-swing", "--tilt-ease", "transition: --tilt", "[data-turning]", "[data-glare] {\n"]) {
      expect(still).not.toContain(motion);
    }
    expect(MOTION).toMatch(/\[data-tilt\] \{\s*--tilt-ease: cubic-bezier\(\.22, 1, \.36, 1\);/);
    expect(MOTION).toContain("transition: --tilt-x 600ms var(--tilt-ease), --tilt-y 600ms var(--tilt-ease), --tilt-lift 600ms var(--tilt-ease);");
    expect(MOTION).toContain("[data-tilt][data-turning] { --tilt-x: .5; --tilt-y: .5; --tilt-lift: 0; transition-duration: 300ms; }");
    expect(MOTION).toMatch(/\[data-tilt\] \[data-glare\] \{\s*opacity: var\(--tilt-lift\);/);
    expect(MOTION).toContain('[data-tilt] [data-foil-size="large"]::before { transform: translateX(calc((var(--tilt-x) - .5) * -33.333%)); }');
  });

  it("draws the card's own shadow outside the motion query, so reduced motion keeps it (G3)", () => {
    const still = outside;
    expect(still).toContain("[data-tilt] { --card-shadow: 0 24px 50px rgb(0 0 0 / .55); box-shadow: var(--card-shadow); }");
    expect(still).toContain("[data-tilt][data-tilt-seam] { --card-shadow: 0 24px 50px rgb(0 0 0 / .55), inset 0 0 0 1px rgb(0 0 0 / .3); }");
    expect(still).toContain('[data-tilt="zoom"] { --card-shadow: 0 24px 60px rgb(0 0 0 / .6); }');
  });

  it("states the swing once, and both axes read it (G11)", () => {
    expect(CSS.match(/--tilt-swing: 12deg;/g)).toHaveLength(1);
    expect(MOTION).toContain("rotateX(calc((var(--tilt-y) - .5) * var(--tilt-swing)))");
    expect(MOTION).toContain("rotateY(calc((.5 - var(--tilt-x)) * var(--tilt-swing)));");
  });

  it("plays R1's one band on keyboard focus of the host's own button, on a fine pointer with motion (G6)", () => {
    expect(FINE).toMatch(/\[data-tilt\]:has\(> button:focus-visible\) \[data-foil-size="large"\]::after \{\s*animation: foil-sweep calc\(var\(--motion-duration\) \* 2\) var\(--motion-ease\);/);
  });

  it("drops the light under reduced transparency and forced colors", () => {
    expect(block("(prefers-reduced-transparency: reduce)")).toContain("[data-glare] { display: none; }");
    expect(block("(forced-colors: active)")).toContain("[data-glare] { display: none; }");
  });
});

describe("the hosts", () => {
  it("desktop: an inner box round the art alone, holding the zoom trigger as its direct child (G1, G6)", () => {
    mount(card(), paged);
    const outer = screen.getByTestId("modal-art-desktop");
    const host = desktopHost();
    expect(host).toHaveAttribute("data-tilt");
    expect(host.parentElement).toBe(outer);
    expect(outer).toHaveClass("anim-carousel-next");
    // The paging animation stays on the outer box, whose transform it fills.
    expect(host.className).not.toMatch(/anim-carousel/);
    // The hint, turn and price stack is outside it.
    expect(host.contains(screen.getByTestId("modal-under-card"))).toBe(false);
    const trigger = within(outer).getByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") });
    expect(trigger.parentElement).toBe(host);
    // The face is the host's: a one-faced card's art is drawn on it, with its seam.
    expect(host.getAttribute("style")).toContain("front.jpg");
    expect(host).toHaveAttribute("data-tilt-seam");
    expect(host.querySelector("[data-glare]")).not.toBeNull();
  });

  it("phone: an inner box inside the card, clear of its entry animation and its turn plate (G2)", () => {
    mount(twoFaced(), paged);
    const outer = screen.getByTestId("modal-art-mobile");
    const host = phoneHost();
    expect(host.parentElement).toBe(outer);
    expect(outer).toHaveClass("anim-phone-card-enter");
    expect(host.className).not.toMatch(/anim-phone-card-enter/);
    const plate = within(outer).getByRole("button", { name: /Turn over to/ });
    expect(host.contains(plate)).toBe(false);
    // A two-faced card's seam is on its faces, so the host carries none; each face carries its own light.
    expect(host).not.toHaveAttribute("data-tilt-seam");
    expect(within(host).getByTestId("modal-art-face-back").querySelector("[data-glare]")).not.toBeNull();
  });

  it("draws no inline shadow on any card box, so the stylesheet's wins (G3)", () => {
    mount(card());
    for (const id of ["modal-art-desktop", "modal-art-mobile", "modal-art-desktop-tilt", "modal-art-mobile-tilt"]) {
      expect(screen.getByTestId(id).style.boxShadow).toBe("");
    }
    fireEvent.click(screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0]);
    expect(screen.getByTestId("card-zoom-tilt").style.boxShadow).toBe("");
    expect(screen.getByTestId("card-zoom-tilt")).toHaveAttribute("data-tilt", "zoom");
    // The zoom card keeps its seam alone; the drop shadow is the host's.
    expect(screen.getByTestId("card-zoom-card").style.boxShadow).toBe("inset 0 0 0 1px rgba(0,0,0,0.35)");
  });
});

describe("desktop hover", () => {
  it("lifts and follows a mouse or a pen, and settles when it leaves", () => {
    mount();
    const host = sized(desktopHost());
    fireEvent.pointerEnter(host, { pointerType: "mouse", clientX: 66, clientY: 92 });
    expect(tiltValues(host)).toEqual({ x: "0.25", y: "0.25", lift: "1", tilting: true });
    fireEvent.pointerMove(host, { pointerType: "pen", clientX: 264, clientY: 368 });
    expect(tiltValues(host)).toMatchObject({ x: "1", y: "1" });
    fireEvent.pointerLeave(host, { pointerType: "mouse" });
    expect(tiltValues(host)).toEqual(FLAT);
  });

  it("does nothing for touch at a desktop width (G12)", () => {
    mount();
    const host = sized(desktopHost());
    fireEvent.pointerEnter(host, { pointerType: "touch", clientX: 66, clientY: 92 });
    fireEvent.pointerMove(host, { pointerType: "touch", clientX: 100, clientY: 100 });
    expect(tiltValues(host)).toEqual(FLAT);
  });
});

describe("the flip (G4)", () => {
  it("takes the inline values off and pins the host flat until the turn settles, then tilts again", () => {
    mount(twoFaced());
    const host = sized(desktopHost());
    fireEvent.pointerMove(host, { pointerType: "mouse", clientX: 66, clientY: 92 });
    expect(tiltValues(host).tilting).toBe(true);
    fireEvent.click(within(screen.getByTestId("modal-under-card")).getByRole("button", { name: /Turn over to/ }));
    expect(tiltValues(host)).toEqual(FLAT);
    expect(host).toHaveAttribute("data-turning");
    expect(phoneHost()).toHaveAttribute("data-turning");
    // A move during the turn writes nothing, or it would beat the turn's centre.
    fireEvent.pointerMove(host, { pointerType: "mouse", clientX: 200, clientY: 200 });
    expect(tiltValues(host)).toEqual(FLAT);
    const turn = within(host).getByTestId("modal-art-turn");
    fireEvent.transitionEnd(turn, { propertyName: "transform" });
    expect(host).not.toHaveAttribute("data-turning");
    fireEvent.pointerMove(host, { pointerType: "mouse", clientX: 66, clientY: 92 });
    expect(tiltValues(host).tilting).toBe(true);
  });

  it("ends a turn whose back a pick took away, so a later pick with a back is not pinned flat", () => {
    const { rerender } = mount(twoFaced());
    fireEvent.click(within(screen.getByTestId("modal-under-card")).getByRole("button", { name: /Turn over to/ }));
    expect(desktopHost()).toHaveAttribute("data-turning");
    const props = { position: 1, total: 1, onClose: vi.fn(), onPrev: null, onNext: null };
    rerender(<CardModal card={card()} {...props} />);
    rerender(<CardModal card={twoFaced()} {...props} />);
    expect(desktopHost()).not.toHaveAttribute("data-turning");
    expect(phoneHost()).not.toHaveAttribute("data-turning");
  });

  it("never sets data-turning under reduced motion, where no transition would clear it", () => {
    restore = reducedMotion();
    mount(twoFaced());
    fireEvent.click(within(screen.getByTestId("modal-under-card")).getByRole("button", { name: /Turn over to/ }));
    expect(desktopHost()).not.toHaveAttribute("data-turning");
    expect(phoneHost()).not.toHaveAttribute("data-turning");
  });

  it("pins the zoom's host while the zoom card turns", () => {
    mount(twoFaced());
    fireEvent.click(screen.getAllByRole("button", { name: /^Look at/ })[0]);
    const zoom = screen.getByTestId("card-zoom");
    const host = within(zoom).getByTestId("card-zoom-tilt");
    fireEvent.click(within(zoom).getByRole("button", { name: /Turn over to/ }));
    expect(host).toHaveAttribute("data-turning");
    fireEvent.transitionEnd(within(zoom).getByTestId("card-zoom-card"), { propertyName: "transform" });
    expect(host).not.toHaveAttribute("data-turning");
  });
});

describe("the zoom (G5)", () => {
  const open = () => {
    fireEvent.click(screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0]);
    return sized(screen.getByTestId("card-zoom-tilt"));
  };

  it("tilts on a press that moves, and its release closes nothing", () => {
    vi.useFakeTimers();
    try {
      mount();
      const host = open();
      fireEvent.pointerDown(host, { pointerId: 3, pointerType: "mouse", button: 0, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(host, { pointerId: 3, pointerType: "mouse", clientX: 104, clientY: 100 });
      expect(tiltValues(host)).toEqual(FLAT);
      fireEvent.pointerMove(host, { pointerId: 3, pointerType: "mouse", clientX: 132, clientY: 92 });
      expect(tiltValues(host)).toMatchObject({ x: "0.5", y: "0.25", lift: "1", tilting: true });
      fireEvent.pointerUp(host, { pointerId: 3, pointerType: "mouse", clientX: 132, clientY: 92 });
      fireEvent.click(host);
      expect(screen.getByTestId("card-zoom")).toBeInTheDocument();
      expect(tiltValues(host)).toEqual(FLAT);
      // The swallow is the release's own click: a later tap still closes.
      act(() => { vi.advanceTimersByTime(1); });
      fireEvent.pointerDown(host, { pointerId: 4, pointerType: "mouse", button: 0, clientX: 100, clientY: 100 });
      fireEvent.pointerUp(host, { pointerId: 4, pointerType: "mouse", clientX: 100, clientY: 100 });
      fireEvent.click(host);
      expect(screen.queryByTestId("card-zoom")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the phone hold, wired to the card", () => {
  it("lifts the card after 300ms inside the slop, and never from the turn plate", () => {
    vi.useFakeTimers();
    try {
      mount(twoFaced());
      const host = sized(phoneHost());
      fireEvent.pointerDown(host, { pointerId: 7, pointerType: "touch", button: 0, clientX: 132, clientY: 184 });
      act(() => { vi.advanceTimersByTime(300); });
      expect(tiltValues(host)).toMatchObject({ lift: "1", tilting: true });
      fireEvent.pointerUp(window, { pointerId: 7, pointerType: "touch", clientX: 132, clientY: 184 });
      expect(tiltValues(host)).toEqual(FLAT);
      act(() => { vi.advanceTimersByTime(1); });
      const plate = within(screen.getByTestId("modal-art-mobile")).getByRole("button", { name: /Turn over to/ });
      fireEvent.pointerDown(plate, { pointerId: 8, pointerType: "touch", button: 0, clientX: 132, clientY: 350 });
      act(() => { vi.advanceTimersByTime(400); });
      expect(tiltValues(host)).toEqual(FLAT);
      fireEvent.pointerUp(window, { pointerId: 8, pointerType: "touch", clientX: 132, clientY: 350 });
    } finally {
      vi.useRealTimers();
    }
  });
});
