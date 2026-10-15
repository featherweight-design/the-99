// The hover preview's foil film (foil handoff R2, G10): R1's tile film, still, only when the row names a finish, and
// marked by its own preload, since the box has no <img> and sits in no list's queue.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FoilFinish } from "../../lib/collection/browse";
import { HoverPreviewProvider, usePreviewRow } from "./hover-preview";

function Row({ name, foil }: { name: string; foil?: FoilFinish }) {
  return <div {...usePreviewRow(ART, foil)} data-testid={name} />;
}

const ART = "https://cards.example/sol-ring.jpg";
let probes: HTMLImageElement[] = [];
const RealImage = window.Image;

beforeEach(() => {
  vi.useFakeTimers();
  probes = [];
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query === "(hover: hover)", media: query,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    }),
  });
  vi.stubGlobal("Image", function () {
    const img = new RealImage();
    Object.defineProperty(img, "complete", { get: () => false, configurable: true });
    probes.push(img);
    return img;
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const hoverOpen = (name: string) => {
  fireEvent.mouseEnter(screen.getByTestId(name), { clientX: 10, clientY: 10 });
  act(() => void vi.advanceTimersByTime(400));
};
const film = () => screen.getByTestId("hover-preview").querySelector<HTMLElement>("[data-foil]");

describe("the hover preview's film", () => {
  it("draws R1's tile film over a foil row's art, with its own arrival mark", () => {
    render(<HoverPreviewProvider><Row name="a" foil="foil" /></HoverPreviewProvider>);
    hoverOpen("a");
    const f = film()!;
    expect(f).toHaveAttribute("data-foil", "foil");
    expect(f).not.toHaveAttribute("data-foil-size");
    expect(f.dataset.arrival).toBe("pending");
    // The box itself is never marked: its art is drawn at once.
    expect(screen.getByTestId("hover-preview").dataset.arrival).toBeUndefined();
    const own = probes.filter((p) => p.src === ART);
    act(() => { for (const p of own) p.dispatchEvent(new Event("load")); });
    expect(f.dataset.arrival).toBe("in");
  });

  it("draws none for a row with no finish", () => {
    render(<HoverPreviewProvider><Row name="a" /></HoverPreviewProvider>);
    hoverOpen("a");
    expect(screen.getByTestId("hover-preview")).toBeInTheDocument();
    expect(film()).toBeNull();
  });

  it("carries the finish through the arming move of a provider that waits for one", () => {
    render(<HoverPreviewProvider waitForMove><Row name="a" foil="etched" /></HoverPreviewProvider>);
    fireEvent.mouseEnter(screen.getByTestId("a"), { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(screen.getByTestId("a"), { clientX: 20, clientY: 10 });
    act(() => void vi.advanceTimersByTime(400));
    expect(film()).toHaveAttribute("data-foil", "etched");
  });
});
