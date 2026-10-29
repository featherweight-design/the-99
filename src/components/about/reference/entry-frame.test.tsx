import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EntryFrame } from "./entry-frame";

// An opened Reference entry's halo goes through the tool card's clamp (`haloInsets`, Small items 3 item 2), so a
// control running to the frame's edge keeps its ring and glow inside the frame's clip.
const halo = (shot: Parameters<typeof EntryFrame>[0]["shot"]) => {
  // Server markup, as the page is first drawn: jsdom's style parser drops a clamp() it cannot read.
  const html = renderToStaticMarkup(<EntryFrame shot={shot} alt="A screen" />);
  return /data-entry-halo[^>]*style="([^"]*)"|style="([^"]*)"[^>]*data-entry-halo/.exec(html)?.slice(1).find(Boolean) ?? null;
};

describe("EntryFrame", () => {
  it("holds a full-width control's halo 8px inside the frame, with no width or height of its own", () => {
    // A 3:2 frame, so the window is the whole picture: a bar across its foot, edge to edge.
    const style = halo({ src: "/x.webp", width: 780, height: 520, halo: { x: 0, y: 0.9, w: 1, h: 0.05 } })!;
    expect(style).toContain("left:clamp(8px, 0%, calc(100% - 8px))");
    expect(style).toContain("right:max(8px, 0%)");
    expect(style).toContain("top:clamp(8px, 90%, calc(100% - 8px))");
    expect(style).toContain("bottom:max(8px, 5%)");
    expect(style).not.toMatch(/(^|;)\s*(width|height):/);
  });

  it("places a box inside the frame where the window puts it", () => {
    const style = halo({ src: "/x.webp", width: 780, height: 520, halo: { x: 0.2, y: 0.3, w: 0.4, h: 0.1 } })!;
    expect(style).toContain("left:clamp(8px, 20%, calc(100% - 8px))");
    expect(style).toContain("top:clamp(8px, 30%, calc(100% - 8px))");
    expect(style).toContain("right:max(8px, 40%)");
    expect(style).toContain("bottom:max(8px, 60%)");
  });

  it("draws no halo for an entry the locator map does not place", () => {
    expect(halo({ src: "/x.webp", width: 780, height: 520, halo: null })).toBeNull();
  });
});
