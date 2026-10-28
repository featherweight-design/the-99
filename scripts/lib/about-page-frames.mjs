// The About pages' frames (plan `2026-10-27-about-visual.md`, PR 2, Task 2.2): where `scripts/capture-about.mjs` takes
// each capture `ABOUT_REGIONS` and `TOOL_REGIONS` name, at its width. Declarative, so a test holds the set whole: every
// capture a region or a tool crop names has a frame here, at the width its name says (`p-` 390x844, `d-` 1300x900).
//
// A frame is a route, or one of the fixture's decks (`about-fixtures.mts`, by role) opened on a view:
//   - `deck`: `played` (whole, committed v1, a pending change after it, a stored analysis, one locked card) or `fresh`
//     (whole, never analyzed, no description: the Analyze press and the Describe field draw only on such a deck);
//   - `view`: the capture's `DECK_VIEW_STEPS` key (`your-deck`, `shopping`, `stats`, `notes`, `analysis`, `games`,
//     `versions`);
//   - `scroll`: `tabs` puts the deck's tab row under the header (the view leads, as the 390 set is shot); a selector
//     puts that element's top there instead (a deck's to-do card, Home's figures, the tuning hub); none leaves the page
//     at its top.
// `feed: "off"` frames are Home as a reader without the feed sees it (Ready to build), taken ONLY in the
// `CAPTURE_FEED=off` pass; `rearm` re-arms the feed's lead story before the frame.

/** @typedef {{ width: "phone" | "desktop", path?: string, deck?: "played" | "fresh", view?: string, scroll?: string, feed?: "off", rearm?: true }} PageFrame */

/** @type {Record<string, PageFrame>} */
export const PAGE_FRAMES = {
  // ---- 390x844 -----------------------------------------------------------------------------------------------------
  "p-home": { width: "phone", path: "/", feed: "off" },
  "p-home-in-use": { width: "phone", path: "/", feed: "off", scroll: "[data-commitments]" },
  "p-home-feed": { width: "phone", path: "/", rearm: true },
  "p-collection": { width: "phone", path: "/collection" },
  "p-upload": { width: "phone", path: "/collection/replace" },
  "p-commanders": { width: "phone", path: "/commanders" },
  "p-discover": { width: "phone", path: "/discover" },
  "p-decks": { width: "phone", path: "/decks" },
  "p-deck-top": { width: "phone", deck: "played", view: "your-deck", scroll: "[data-todo-card]" },
  "p-deck-your-deck": { width: "phone", deck: "played", view: "your-deck", scroll: "tabs" },
  "p-deck-analysis": { width: "phone", deck: "fresh", view: "analysis", scroll: "tabs" },
  "p-deck-analysis-read": { width: "phone", deck: "played", view: "analysis", scroll: "tabs" },
  "p-analysis-tuning": { width: "phone", deck: "played", view: "analysis", scroll: "[data-tuning-hub]" },
  "p-deck-versions": { width: "phone", deck: "played", view: "versions", scroll: "tabs" },
  "p-deck-games": { width: "phone", deck: "played", view: "games", scroll: "tabs" },
  "p-deck-stats": { width: "phone", deck: "played", view: "stats", scroll: "tabs" },
  "p-deck-notes": { width: "phone", deck: "played", view: "notes", scroll: "tabs" },
  "p-deck-shopping": { width: "phone", deck: "played", view: "shopping", scroll: "tabs" },
  "p-friends": { width: "phone", path: "/friends" },

  // ---- 1300x900 ----------------------------------------------------------------------------------------------------
  "d-home": { width: "desktop", path: "/", feed: "off" },
  "d-home2": { width: "desktop", path: "/", feed: "off" },
  "d-home-feed": { width: "desktop", path: "/", rearm: true },
  "d-collection2": { width: "desktop", path: "/collection" },
  "d-upload": { width: "desktop", path: "/collection/replace" },
  "d-commanders": { width: "desktop", path: "/commanders" },
  "d-discover": { width: "desktop", path: "/discover" },
  "d-decks2": { width: "desktop", path: "/decks" },
  "d-deck-top": { width: "desktop", deck: "played", view: "your-deck" },
  "d-deck-list": { width: "desktop", deck: "played", view: "your-deck", scroll: "tabs" },
  "d-analysis": { width: "desktop", deck: "played", view: "analysis", scroll: "tabs" },
  "d-analysis-describe": { width: "desktop", deck: "fresh", view: "analysis", scroll: "tabs" },
  "d-versions-precon": { width: "desktop", deck: "played", view: "versions", scroll: "tabs" },
  "d-games": { width: "desktop", deck: "played", view: "games", scroll: "tabs" },
  "d-stats": { width: "desktop", deck: "played", view: "stats", scroll: "tabs" },
  "d-notes": { width: "desktop", deck: "played", view: "notes", scroll: "tabs" },
  "d-shopping": { width: "desktop", deck: "played", view: "shopping", scroll: "tabs" },
  "d-friends": { width: "desktop", path: "/friends" },
};

/** The two widths' viewports, and the device scale each is shot at. */
export const PAGE_VIEWPORTS = {
  phone: { width: 390, height: 844, scale: 2, isMobile: true },
  desktop: { width: 1300, height: 900, scale: 1.5, isMobile: false },
};

/**
 * A desktop tool card's crop around its control, in CSS px of the 1300x900 frame: 3:2, at least `MIN_W` wide and at
 * least `PAD` clear of the control on each side where the frame allows, kept inside the frame.
 */
export function toolCrop(rect, view = PAGE_VIEWPORTS.desktop, { MIN_W = 650, PAD = 24 } = {}) {
  const width = Math.min(view.width, Math.max(MIN_W, Math.ceil(rect.width + 2 * PAD)));
  const height = Math.min(view.height, Math.round((width * 2) / 3));
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const left = Math.round(Math.min(Math.max(0, cx - width / 2), view.width - width));
  const top = Math.round(Math.min(Math.max(0, cy - height / 2), view.height - height));
  const clamp = (n) => Math.min(1, Math.max(0, n));
  const x0 = clamp((rect.x - left) / width);
  const y0 = clamp((rect.y - top) / height);
  const x1 = clamp((rect.x + rect.width - left) / width);
  const y1 = clamp((rect.y + rect.height - top) / height);
  return { left, top, width, height, halo: [x0, y0, x1 - x0, y1 - y0] };
}

/**
 * True when two decoded images are the same picture: same size, and no more than `share` of their pixels differ by more
 * than `tolerance` in any channel. A re-capture is written only when this is false (d9's weight rule: decode-compare,
 * never byte-compare, so an unchanged screen adds nothing to the repository).
 */
export function samePixels(a, b, { tolerance = 8, share = 0.0005 } = {}) {
  if (!a || !b || a.width !== b.width || a.height !== b.height || a.channels !== b.channels) return false;
  const { data: x } = a;
  const { data: y } = b;
  if (x.length !== y.length) return false;
  const ch = a.channels;
  const limit = Math.floor((x.length / ch) * share);
  let off = 0;
  for (let i = 0; i < x.length; i += ch) {
    for (let c = 0; c < ch; c += 1) {
      if (Math.abs(x[i + c] - y[i + c]) > tolerance) {
        off += 1;
        if (off > limit) return false;
        break;
      }
    }
  }
  return true;
}
