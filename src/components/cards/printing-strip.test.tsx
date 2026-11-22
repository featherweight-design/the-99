import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrowsePrinting } from "../../lib/collection/browse";
import { PrintingStrip, orderStrip, stripKey, type StripPrinting } from "./printing-strip";

vi.mock("../../lib/ui/reveal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/ui/reveal")>()),
  reveal: vi.fn(() => () => {}),
}));

afterEach(cleanup);

const printing = (over: Partial<BrowsePrinting> = {}): BrowsePrinting => ({
  setCode: "C21",
  setName: "Commander 2021",
  collectorNumber: "263",
  releasedAt: "2021-04-23",
  quantity: 0,
  finishes: {},
  imageUri: null,
  flavorName: null,
  ...over,
});

const A = printing({ scryfallId: "a", setCode: "AAA", setName: "Alpha Set", collectorNumber: "1", imageUri: "https://img/a.jpg" });
const B = printing({ scryfallId: "b", setCode: "BBB", setName: "Beta Set", collectorNumber: "2" });
const C = printing({ scryfallId: "c", setCode: "CCC", setName: "Gamma Set", collectorNumber: "3" });

function renderStrip(over: Partial<React.ComponentProps<typeof PrintingStrip>> = {}) {
  const onSelect = vi.fn();
  const onAnnounce = vi.fn();
  const printings: StripPrinting[] = over.printings ?? [A, B, C];
  render(
    <PrintingStrip
      printings={printings}
      shownKey="a"
      onSelect={onSelect}
      onAnnounce={onAnnounce}
      cardName="Swan Song"
      colorIdentity={["U"]}
      {...over}
    />,
  );
  return { onSelect, onAnnounce };
}

describe("orderStrip", () => {
  const mineB = { ...B, quantity: 2 };
  const mineC = { ...C, quantity: 1 };
  it("keeps the card's own order for an unowned card", () => {
    expect(orderStrip([C, A, B], [], [], null)).toEqual([C, A, B]);
  });
  it("puts the pick first, then the rest the reader owns, then the others", () => {
    const out = orderStrip(null, [mineB, mineC], [A], { setCode: "CCC", collectorNumber: "3" });
    expect(out.map(stripKey)).toEqual(["c", "b", "a"]);
    expect(out.map((p) => [p.mine === true, p.pick === true])).toEqual([[true, true], [true, false], [false, false]]);
  });
  it("is owned only, in the reader's order, when they own every printing", () => {
    const out = orderStrip(null, [mineB, mineC], [], null);
    expect(out.map(stripKey)).toEqual(["b", "c"]);
  });
});

describe("PrintingStrip", () => {
  it("heads the strip with the count, and what the reader owns when they own any", () => {
    renderStrip();
    expect(screen.getByText("3 printings")).toBeTruthy();
    cleanup();
    renderStrip({ printings: [{ ...B, quantity: 2, mine: true, pick: true }, A] });
    expect(screen.getByText("2 printings · you own 1")).toBeTruthy();
  });

  it("names the group for the card and labels each thumb with its set, number, holding and pick", () => {
    renderStrip({ printings: [{ ...B, quantity: 2, mine: true, pick: true }, { ...C, quantity: 1, mine: true }, A] });
    const group = screen.getByRole("group", { name: "Printings of Swan Song" });
    expect(within(group).getByRole("button", { name: "Beta Set, number 2, 2 in your collection, your pick" })).toBeTruthy();
    expect(within(group).getByRole("button", { name: "Gamma Set, number 3, 1 in your collection" })).toBeTruthy();
    expect(within(group).getByRole("button", { name: "Alpha Set, number 1" })).toBeTruthy();
  });

  it("marks the printing on screen as pressed, and only that one", () => {
    renderStrip({ shownKey: "b" });
    const pressed = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed.map((b) => b.getAttribute("aria-label"))).toEqual(["Beta Set, number 2"]);
  });

  it("selects a printing and announces it, saying it is not held when it is not", () => {
    const { onSelect, onAnnounce } = renderStrip({ printings: [{ ...B, quantity: 1, mine: true }, C] });
    fireEvent.click(screen.getByRole("button", { name: "Gamma Set, number 3" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ scryfallId: "c" }));
    expect(onAnnounce).toHaveBeenLastCalledWith("Showing Gamma Set, number 3. Not in your collection.");
    fireEvent.click(screen.getByRole("button", { name: "Beta Set, number 2, 1 in your collection" }));
    expect(onAnnounce).toHaveBeenLastCalledWith("Showing Beta Set, number 2.");
  });

  it("draws a hairline only where the reader's printings end and the rest begin", () => {
    const { container } = render(
      <PrintingStrip
        printings={[{ ...B, quantity: 1, mine: true }, { ...C, quantity: 1, mine: true }, A]}
        shownKey="b" onSelect={vi.fn()} onAnnounce={vi.fn()} cardName="X" colorIdentity={[]}
      />,
    );
    expect(container.querySelectorAll("[data-strip-divider]")).toHaveLength(1);
    cleanup();
    const owned = render(
      <PrintingStrip
        printings={[{ ...B, quantity: 1, mine: true }, { ...C, quantity: 1, mine: true }]}
        shownKey="b" onSelect={vi.fn()} onAnnounce={vi.fn()} cardName="X" colorIdentity={[]}
      />,
    );
    expect(owned.container.querySelectorAll("[data-strip-divider]")).toHaveLength(0);
  });

  it("has one tab stop, the printing on screen, and arrows move focus along the strip", () => {
    renderStrip({ shownKey: "b" });
    const thumbs = screen.getAllByRole("button");
    expect(thumbs.map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
    thumbs[1].focus();
    fireEvent.keyDown(thumbs[1], { key: "ArrowRight" });
    expect(document.activeElement).toBe(thumbs[2]);
    fireEvent.keyDown(thumbs[2], { key: "ArrowRight" });
    expect(document.activeElement).toBe(thumbs[2]);
    fireEvent.keyDown(thumbs[2], { key: "Home" });
    expect(document.activeElement).toBe(thumbs[0]);
    fireEvent.keyDown(thumbs[0], { key: "End" });
    expect(document.activeElement).toBe(thumbs[2]);
  });

  it("falls to the first thumb as the tab stop when the shown printing is not in the strip", () => {
    renderStrip({ shownKey: "zzz" });
    expect(screen.getAllByRole("button").map((b) => b.tabIndex)).toEqual([0, -1, -1]);
  });

  it("keys a printing with no catalog id by its set and number", () => {
    const bare = printing({ setCode: "DDD", collectorNumber: "9" });
    expect(stripKey(bare)).toBe("DDD|9");
    renderStrip({ printings: [bare], shownKey: "DDD|9" });
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });

  it("draws the identity ground for a thumb with no art, and the art over it where there is some", () => {
    const { container } = render(
      <PrintingStrip printings={[A, B]} shownKey="a" onSelect={vi.fn()} onAnnounce={vi.fn()} cardName="X" colorIdentity={["U"]} />,
    );
    const faces = container.querySelectorAll<HTMLElement>("button > span:first-child");
    expect(faces).toHaveLength(2);
    for (const face of faces) expect(face.style.background).not.toBe("");
    expect(faces[0].children.length).toBe(1);
    expect(faces[1].children.length).toBe(0);
  });

  it("draws no paddle unless asked, and none while the row fits", () => {
    renderStrip();
    expect(screen.queryByRole("button", { name: "More printings" })).toBeNull();
    cleanup();
    renderStrip({ paddles: true });
    // jsdom lays nothing out: scrollWidth equals clientWidth, so nothing overflows.
    expect(screen.queryByRole("button", { name: "More printings" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Previous printings" })).toBeNull();
  });
});
