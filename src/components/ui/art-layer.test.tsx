import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArtLayer } from "./art-layer";

// The stand-in Image the layer preloads, so a test can land it, or say it is already cached.
let probes: HTMLImageElement[] = [];
let cached = false;
const RealImage = window.Image;
beforeEach(() => {
  probes = [];
  cached = false;
  vi.stubGlobal("Image", function () {
    const img = new RealImage();
    Object.defineProperty(img, "complete", { get: () => cached, configurable: true });
    probes.push(img);
    return img;
  });
});
afterEach(() => vi.unstubAllGlobals());

const SRC = "https://cards.scryfall.io/normal/front/a/b/ab.jpg";
const mount = () => {
  const { container } = render(<div className="relative overflow-hidden">text stays<ArtLayer src={SRC} /></div>);
  return { host: container.firstElementChild as HTMLElement, layer: container.firstElementChild!.lastElementChild as HTMLElement };
};

describe("ArtLayer", () => {
  it("draws the art as its own filled layer, so the host's own content is never hidden with it", () => {
    const { host, layer } = mount();
    expect(layer.style.backgroundImage).toContain(SRC);
    expect(layer.className).toContain("absolute");
    expect(layer.className).toContain("inset-0");
    expect(host.dataset.arrival).toBeUndefined();
    expect(host.textContent).toBe("text stays");
  });

  it("is held pending while its bytes travel, then fades in once", () => {
    const { layer } = mount();
    expect(layer.dataset.arrival).toBe("pending");
    act(() => void probes[0].dispatchEvent(new Event("load")));
    expect(layer.dataset.arrival).toBe("in");
  });

  it("draws cached art at once, with no fade and nothing hidden", () => {
    cached = true;
    const { layer } = mount();
    expect(layer.dataset.arrival).toBe("done");
  });
});

describe("ArtLayer under a media query", () => {
  it("makes no preload, and so fetches nothing, while its media query does not match", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} }));
    const { container } = render(<div className="relative"><ArtLayer src={SRC} media="(min-width: 40rem)" /></div>);
    const layer = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(probes).toHaveLength(0);
    expect(layer.dataset.arrival).toBeUndefined();
  });

  it("arms as usual where it matches", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: true, media: q, addEventListener: () => {}, removeEventListener: () => {} }));
    const { container } = render(<div className="relative"><ArtLayer src={SRC} media="(min-width: 40rem)" /></div>);
    const layer = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(probes).toHaveLength(1);
    expect(layer.dataset.arrival).toBe("pending");
  });
});
