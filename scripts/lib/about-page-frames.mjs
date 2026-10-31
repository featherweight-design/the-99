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

// `reveal` scrolls the page the least that brings that element fully above the frame's bottom chrome (Friends: the pod's
// Rule 0 check row, which otherwise sits half behind the phone's tab bar).
/** @typedef {{ width: "phone" | "desktop", path?: string, deck?: "played" | "fresh", view?: string, scroll?: string, reveal?: string, feed?: "off", rearm?: true }} PageFrame */

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
  // The findings lead: the bracket card sits above them on an analyzed deck.
  "p-deck-analysis-read": { width: "phone", deck: "played", view: "analysis", scroll: "[data-testid='findings-block']" },
  "p-analysis-tuning": { width: "phone", deck: "played", view: "analysis", scroll: "[data-tuning-hub]" },
  "p-deck-versions": { width: "phone", deck: "played", view: "versions", scroll: "tabs" },
  "p-deck-games": { width: "phone", deck: "played", view: "games", scroll: "tabs" },
  "p-deck-stats": { width: "phone", deck: "played", view: "stats", scroll: "tabs" },
  "p-deck-notes": { width: "phone", deck: "played", view: "notes", scroll: "tabs" },
  "p-deck-shopping": { width: "phone", deck: "played", view: "shopping", scroll: "tabs" },
  // The all-decks cart in By friend, at its top (Small items 7, item 6): the fixture's six decks and four friends.
  "p-cart": { width: "phone", path: "/decks/shopping?view=friend" },
  "p-friends": { width: "phone", path: "/friends", reveal: "[data-testid='pod-rule-zero']" },

  // ---- 1300x900 ----------------------------------------------------------------------------------------------------
  "d-home": { width: "desktop", path: "/", feed: "off" },
  "d-home-feed": { width: "desktop", path: "/", rearm: true },
  "d-collection2": { width: "desktop", path: "/collection" },
  "d-upload": { width: "desktop", path: "/collection/replace" },
  "d-commanders": { width: "desktop", path: "/commanders" },
  "d-discover": { width: "desktop", path: "/discover" },
  "d-decks2": { width: "desktop", path: "/decks" },
  "d-deck-top": { width: "desktop", deck: "played", view: "your-deck" },
  "d-deck-list": { width: "desktop", deck: "played", view: "your-deck", scroll: "tabs" },
  "d-analysis": { width: "desktop", deck: "played", view: "analysis", scroll: "tabs" },
  "d-analysis-tuning": { width: "desktop", deck: "played", view: "analysis", scroll: "[data-tuning-hub]" },
  "d-analysis-describe": { width: "desktop", deck: "fresh", view: "analysis", scroll: "tabs" },
  "d-versions-precon": { width: "desktop", deck: "played", view: "versions", scroll: "tabs" },
  "d-games": { width: "desktop", deck: "played", view: "games", scroll: "tabs" },
  "d-stats": { width: "desktop", deck: "played", view: "stats", scroll: "tabs" },
  "d-notes": { width: "desktop", deck: "played", view: "notes", scroll: "tabs" },
  "d-shopping": { width: "desktop", deck: "played", view: "shopping", scroll: "tabs" },
  "d-cart": { width: "desktop", path: "/decks/shopping?view=friend" },
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
  // Wide enough for the control's width AND, at 3:2, its height, so a tall control is not cut top and bottom.
  const width = Math.min(view.width, Math.max(MIN_W, Math.ceil(rect.width + 2 * PAD), Math.ceil(((rect.height + 2 * PAD) * 3) / 2)));
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
 * True when two decoded images are the same picture: same size, and no pixel differs by more than `tolerance` in any
 * channel. The tolerance absorbs encoder noise; there is no share of pixels allowed to differ, because one changed digit
 * at 2x is only 100 to 250 pixels, and a picture judged unchanged keeps a stale image beside a fresh manifest. A re-capture is written only when this is false (d9's weight rule: decode-compare,
 * never byte-compare, so an unchanged screen adds nothing to the repository).
 */
export function samePixels(a, b, { tolerance = 8, share = 0 } = {}) {
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

/**
 * How much of a region the photograph actually shows (the coordinator's fix round, finding 4): `rect` sampled on a
 * `grid`×`grid` lattice, a point counting only when it is inside the frame AND under none of `occluders`, the fixed or
 * sticky chrome drawn over the page (the phone's tab bar, the deck's add dock, a sticky header). Returns the visible
 * share of the region, the bounding box of what is visible (CSS px, or null), and whether that is enough to label:
 * `MIN_SHARE` of the region, or, for a region taller or wider than the frame can hold, `MIN_FRAME` of the frame's area.
 * A sliver at the frame's edge or behind the tab bar is NOT in frame.
 */
export function visibleRegion(rect, view, occluders = [], { grid = 20, MIN_SHARE = 0.6, MIN_FRAME = 0.25 } = {}) {
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return { share: 0, box: null, ok: false };
  const inside = (o, x, y) => x >= o.x && x <= o.x + o.width && y >= o.y && y <= o.y + o.height;
  let seen = 0;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const dx = rect.width / grid, dy = rect.height / grid;
  for (let i = 0; i < grid; i += 1) {
    for (let j = 0; j < grid; j += 1) {
      const x = rect.x + (i + 0.5) * dx;
      const y = rect.y + (j + 0.5) * dy;
      if (x < 0 || y < 0 || x > view.width || y > view.height) continue;
      if (occluders.some((o) => inside(o, x, y))) continue;
      seen += 1;
      x0 = Math.min(x0, x - dx / 2);
      y0 = Math.min(y0, y - dy / 2);
      x1 = Math.max(x1, x + dx / 2);
      y1 = Math.max(y1, y + dy / 2);
    }
  }
  const share = seen / (grid * grid);
  if (seen === 0) return { share, box: null, ok: false };
  const box = {
    x: Math.max(0, x0),
    y: Math.max(0, y0),
    width: Math.min(view.width, x1) - Math.max(0, x0),
    height: Math.min(view.height, y1) - Math.max(0, y0),
  };
  const ok = share >= MIN_SHARE || share * rect.width * rect.height >= MIN_FRAME * view.width * view.height;
  return { share, box, ok };
}
