// Foil, large views (foil handoff R2, PR 1): card details and the zoom read the film off the printing they SHOW, and
// the face never waits for it. Only the film span carries an arrival mark. jsdom applies no stylesheet, so these pin
// the marks and the markup the CSS reads; what the CSS does with them is `probe:foil-film`'s.
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { faceFilm, type BrowseCard, type BrowsePrinting } from "../../lib/collection/browse";
import { cardZoomCopy } from "../../lib/copy/card-surfaces";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardModal } = await import("./card-modal");

// The stand-in Image every arrival mark preloads, so a test can land it, break it, or say it is cached.
let probes: HTMLImageElement[] = [];
let cached = false;
const RealImage = window.Image;
beforeEach(() => {
  probes = [];
  cached = false;
  vi.stubGlobal("Image", function () {
    const img = new RealImage();
    Object.defineProperty(img, "complete", { get: () => cached, configurable: true });
    Object.defineProperty(img, "naturalWidth", { get: () => (cached ? 488 : 0), configurable: true });
    probes.push(img);
    return img;
  });
});
afterEach(() => vi.unstubAllGlobals());

const FRONT = "https://img/front.jpg";
const BACK = "https://img/back.jpg";

const printing = (over: Partial<BrowsePrinting> = {}): BrowsePrinting => ({
  setCode: "MSC",
  scryfallId: "s-1",
  setName: "Duskmourn Commander",
  collectorNumber: "12",
  releasedAt: "2024-09-27",
  quantity: 1,
  finishes: { foil: 1 },
  imageUri: FRONT,
  hasOwnArt: true,
  flavorName: null,
  ...over,
});

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
  imageUri: FRONT,
  printedName: null,
  quantity: 1,
  printings: [printing()],
  setCodes: ["MSC"],
  primarySetCode: "MSC",
  preferredPrinting: null,
  ...over,
});

function mount(c: BrowseCard, props: Partial<Parameters<typeof CardModal>[0]> = {}) {
  return render(<CardModal card={c} position={1} total={1} onClose={vi.fn()} onPrev={null} onNext={null} {...props} />);
}

const films = (host: HTMLElement) => Array.from(host.querySelectorAll<HTMLElement>('[data-testid="foil-film"]'));
const ownFilm = (host: HTMLElement) => films(host).find((f) => f.parentElement === host) ?? null;
// The one-faced face is the tilt host round the art (foil R2 PR 2, G1 and G2), not the box the stack hangs off.
const desktop = () => screen.getByTestId("modal-art-desktop-tilt");
const phone = () => screen.getByTestId("modal-art-mobile-tilt");

// The rule itself, read off the printing a face is drawn from (audit G9).
describe("faceFilm", () => {
  const own = printing();
  it("is the sole foil finish over the printing's own front art", () => {
    expect(faceFilm(own)).toBe("foil");
    expect(faceFilm({ ...own, finishes: { etched: 2 } })).toBe("etched");
    expect(faceFilm({ ...own, finishes: { foil: 1, nonfoil: 1 } })).toBeUndefined();
    expect(faceFilm({ ...own, finishes: {} })).toBeUndefined();
    expect(faceFilm({ ...own, hasOwnArt: false })).toBeUndefined();
    expect(faceFilm({ ...own, imageUri: null })).toBeUndefined();
    expect(faceFilm(undefined)).toBeUndefined();
  });

  it("is the viewed finish, a precon box's, over the reader's own holding or none", () => {
    expect(faceFilm({ ...own, finishes: {}, hasOwnArt: false, viewedFinish: "foil" })).toBe("foil");
    expect(faceFilm({ ...own, finishes: { nonfoil: 1 }, viewedFinish: "foil" })).toBe("foil");
    expect(faceFilm({ ...own, imageUri: null, viewedFinish: "foil" })).toBeUndefined();
    // A plain box card stays plain over the reader's own foil copy.
    expect(faceFilm({ ...own, viewedFinish: "nonfoil" })).toBeUndefined();
  });

  it("draws on the back only over the printing's own back art", () => {
    expect(faceFilm({ ...own, backImageUri: BACK, hasOwnBack: true }, "back")).toBe("foil");
    expect(faceFilm({ ...own, backImageUri: BACK, hasOwnBack: false }, "back")).toBeUndefined();
    expect(faceFilm({ ...own, backImageUri: null, hasOwnBack: true }, "back")).toBeUndefined();
    expect(faceFilm({ ...own, hasOwnArt: false, backImageUri: BACK, hasOwnBack: true }, "back")).toBeUndefined();
  });
});

describe("where details reads foil", () => {
  it("draws a large film on a one-faced card whose every owned copy of the shown printing is foil", () => {
    mount(card());
    for (const host of [desktop(), phone()]) {
      const film = ownFilm(host);
      expect(film).not.toBeNull();
      expect(film).toHaveAttribute("data-foil", "foil");
      expect(film).toHaveAttribute("data-foil-size", "large");
    }
  });

  it("draws the silver film for an etched holding", () => {
    mount(card({ printings: [printing({ finishes: { etched: 2 } })] }));
    expect(ownFilm(desktop())).toHaveAttribute("data-foil", "etched");
  });

  it("follows a pick to a plain printing at once, never the card's stale `foil`", () => {
    const plain = printing({ setCode: "RVR", scryfallId: "s-2", collectorNumber: "214", finishes: { nonfoil: 1 }, imageUri: "https://img/plain.jpg" });
    mount(card({ foil: "foil", printings: [printing(), plain], preferredPrinting: { setCode: "RVR", collectorNumber: "214" } }));
    expect(films(desktop())).toHaveLength(0);
    expect(films(phone())).toHaveLength(0);
  });

  it("draws nothing over a mixed holding", () => {
    mount(card({ printings: [printing({ finishes: { foil: 1, nonfoil: 2 } })] }));
    expect(films(desktop())).toHaveLength(0);
  });

  it("draws nothing for a card not held", () => {
    mount(card({ quantity: 0, printings: [printing({ quantity: 0, finishes: {} })] }));
    expect(films(desktop())).toHaveLength(0);
  });

  // Review round 1: an all-foil holding with no Scryfall id resolves to the set's representative art, so it is not
  // its own. Opened from its exact set-grid cell, the caller's art IS its own, and the film follows.
  it("draws the film on an id-less foil holding opened at its exact printing with that printing's art", () => {
    const REP = "https://img/representative.jpg";
    mount(card({ printings: [printing({ scryfallId: undefined, imageUri: REP, hasOwnArt: false })] }), {
      openAtPrinting: { setCode: "MSC", collectorNumber: "12", imageUri: FRONT, scryfallId: "s-1" },
    });
    for (const host of [desktop(), phone()]) expect(ownFilm(host)).toHaveAttribute("data-foil", "foil");
  });

  // A precon's box foil (Hugh, 2026-10-28): the box names the finish, so the face draws it for a reader who holds no
  // copy, and for one who holds a plain one.
  it("draws the box's foil on a precon card the reader does not hold", () => {
    mount(card({ quantity: 0, printings: [printing({ quantity: 0, finishes: {} })] }), {
      openAtPrinting: { setCode: "MSC", collectorNumber: "12", imageUri: FRONT, scryfallId: "s-1", finish: "foil" },
    });
    for (const host of [desktop(), phone()]) expect(ownFilm(host)).toHaveAttribute("data-foil", "foil");
  });
  it("draws the box's foil over the reader's own plain copy of that printing", () => {
    mount(card({ printings: [printing({ finishes: { nonfoil: 1 } })] }), {
      openAtPrinting: { setCode: "MSC", collectorNumber: "12", imageUri: FRONT, scryfallId: "s-1", finish: "foil" },
    });
    for (const host of [desktop(), phone()]) expect(ownFilm(host)).toHaveAttribute("data-foil", "foil");
  });
  it("draws no film over the oracle's art when the box names a foil printing with no art of its own", () => {
    mount(card({ quantity: 0, printings: [printing({ quantity: 0, finishes: {} })] }), {
      openAtPrinting: { setCode: "MSC", collectorNumber: "99", imageUri: null, scryfallId: "s-9", finish: "foil" },
    });
    expect(films(desktop())).toHaveLength(0);
  });
  it("draws a plain box card plain over the reader's own foil copy", () => {
    mount(card({ printings: [printing()] }), {
      openAtPrinting: { setCode: "MSC", collectorNumber: "12", imageUri: FRONT, scryfallId: "s-1", finish: "nonfoil" },
    });
    expect(films(desktop())).toHaveLength(0);
  });
  it("draws no film where the opener names no finish and the reader holds none", () => {
    mount(card({ quantity: 0, printings: [printing({ quantity: 0, finishes: {} })] }), {
      openAtPrinting: { setCode: "MSC", collectorNumber: "12", imageUri: FRONT, scryfallId: "s-1" },
    });
    expect(films(desktop())).toHaveLength(0);
  });

  it("draws nothing over another printing's or the oracle-level picture", () => {
    mount(card({ printings: [printing({ hasOwnArt: false })] }));
    expect(films(desktop())).toHaveLength(0);
  });

  it("draws a film on each face of a two-faced foil printing, inside the face so it turns with it", () => {
    mount(card({
      layout: "transform",
      printings: [printing({ backImageUri: BACK, hasOwnBack: true })],
    }));
    const front = screen.getAllByTestId("modal-art-face-front")[0] as HTMLElement;
    const back = screen.getAllByTestId("modal-art-face-back")[0] as HTMLElement;
    expect(ownFilm(front)).toHaveAttribute("data-foil-size", "large");
    expect(ownFilm(back)).toHaveAttribute("data-foil", "foil");
  });

  it("draws no film on a back face drawn from the oracle's back art", () => {
    mount(card({
      layout: "transform",
      backImageUri: BACK,
      printings: [printing({ backImageUri: BACK, hasOwnBack: false })],
    }));
    const front = screen.getAllByTestId("modal-art-face-front")[0] as HTMLElement;
    const back = screen.getAllByTestId("modal-art-face-back")[0] as HTMLElement;
    expect(ownFilm(front)).not.toBeNull();
    expect(ownFilm(back)).toBeNull();
  });

  it("draws the same large film on the zoom card", () => {
    mount(card());
    fireEvent.click(screen.getAllByRole("button", { name: cardZoomCopy.zoomAria("Smothering Tithe") })[0]);
    const zoom = screen.getByTestId("card-zoom-card");
    expect(ownFilm(zoom)).toHaveAttribute("data-foil-size", "large");
  });
});

describe("the face never waits for the film", () => {
  const hosts = () => [desktop(), phone()];

  it("marks the film pending while the face's bytes travel, then in, and never the face", () => {
    mount(card());
    for (const host of hosts()) {
      expect(ownFilm(host)!.dataset.arrival).toBe("pending");
      expect(host.dataset.arrival).toBeUndefined();
    }
    // The preload is of the face's own URL: no new image.
    expect(probes.length).toBeGreaterThan(0);
    for (const p of probes) expect(p.src).toBe(FRONT);
    act(() => { for (const p of probes) p.dispatchEvent(new Event("load")); });
    for (const host of hosts()) {
      expect(ownFilm(host)!.dataset.arrival).toBe("in");
      expect(host.dataset.arrival).toBeUndefined();
    }
  });

  it("marks the film failed when the face broke, and still never the face", () => {
    mount(card());
    act(() => { for (const p of probes) p.dispatchEvent(new Event("error")); });
    for (const host of hosts()) {
      expect(ownFilm(host)!.dataset.arrival).toBe("failed");
      expect(host.dataset.arrival).toBeUndefined();
    }
  });

  it("marks cached art done at once", () => {
    cached = true;
    mount(card());
    for (const host of hosts()) {
      expect(ownFilm(host)!.dataset.arrival).toBe("done");
      expect(host.dataset.arrival).toBeUndefined();
    }
  });

  it("leaves no face of a two-faced card marked, in any state", () => {
    mount(card({ layout: "transform", printings: [printing({ backImageUri: BACK, hasOwnBack: true })] }));
    const faces = () => [...screen.getAllByTestId("modal-art-face-front"), ...screen.getAllByTestId("modal-art-face-back")];
    for (const face of faces()) expect(face.dataset.arrival).toBeUndefined();
    act(() => { for (const p of probes) p.dispatchEvent(new Event("load")); });
    for (const face of faces()) {
      expect(face.dataset.arrival).toBeUndefined();
      expect(ownFilm(face as HTMLElement)!.dataset.arrival).toBe("in");
    }
  });

  it("plays on landing, outside the modal's arrival queue, ahead of a neighbor still travelling (G8)", () => {
    // jsdom lays out nothing, and the queue takes only art with a box: give every element one, all on one row,
    // so anything queued would wait for the whole row to land.
    const rects = vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
    const box = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ top: 100, left: 0, width: 200, height: 280, right: 200, bottom: 380, x: 0, y: 100 } as DOMRect);
    onTestFinished(() => { rects.mockRestore(); box.mockRestore(); });
    mount(card(), {
      position: 2, total: 3, onPrev: vi.fn(), onNext: vi.fn(), onPrevPeek: vi.fn(), onNextPeek: vi.fn(),
      prevSibling: { oracleId: "o0", name: "Rhystic Study", imageUri: "https://img/prev.jpg" },
      nextSibling: { oracleId: "o2", name: "Esper Sentinel", imageUri: "https://img/next.jpg" },
    });
    // Only the face's bytes land; the peek before it in reading order is still on its way.
    act(() => { for (const p of probes.filter((i) => i.src === FRONT)) p.dispatchEvent(new Event("load")); });
    expect(ownFilm(phone())!.dataset.arrival).toBe("in");
  });

  it("re-arms on a new face URL, and the old preload no longer marks anything", () => {
    const { rerender } = mount(card());
    const first = [...probes];
    const next = "https://img/other.jpg";
    rerender(
      <CardModal
        card={card({ imageUri: next, printings: [printing({ imageUri: next })] })}
        position={1} total={1} onClose={vi.fn()} onPrev={null} onNext={null}
      />,
    );
    act(() => { for (const p of first) p.dispatchEvent(new Event("load")); });
    expect(ownFilm(desktop())!.dataset.arrival).toBe("pending");
  });
});

describe("the phone peek's film", () => {
  const peeks = (foil: "foil" | undefined) => ({
    position: 2, total: 3, onPrev: vi.fn(), onNext: vi.fn(), onPrevPeek: vi.fn(), onNextPeek: vi.fn(),
    prevSibling: { oracleId: "o0", name: "Rhystic Study", imageUri: "https://img/prev.jpg", foil },
    nextSibling: { oracleId: "o2", name: "Esper Sentinel", imageUri: "https://img/next.jpg" },
  });

  it("is R1's still tile film, after the ArtLayer whose mark it reads", () => {
    mount(card(), peeks("foil"));
    const peek = screen.getByTestId("phone-peek-prev");
    const film = within(peek).getByTestId("sibling-foil-film");
    expect(film).toHaveAttribute("data-foil", "foil");
    expect(film).not.toHaveAttribute("data-foil-size");
    expect(film).toHaveAttribute("data-foil-still");
    // The sibling rule `[data-arrival] ~ [data-foil]` needs the art layer BEFORE the film, under one parent.
    const layer = film.previousElementSibling as HTMLElement;
    expect(layer.style.backgroundImage).toContain("prev.jpg");
    expect(layer.dataset.arrival).toBeDefined();
    // It carries no mark of its own: it follows the layer.
    expect(film.dataset.arrival).toBeUndefined();
    expect(within(screen.getByTestId("phone-peek-next")).queryByTestId("sibling-foil-film")).toBeNull();
  });

  it("is absent with no finish", () => {
    mount(card(), peeks(undefined));
    expect(within(screen.getByTestId("phone-peek-prev")).queryByTestId("sibling-foil-film")).toBeNull();
  });
});
