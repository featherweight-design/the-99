// Where the ? lands (About visual build, plan `2026-10-27-about-visual.md`, PR 6a; handoff
// `design/design_handoff_the99_about_visual/`, call 5 and Addendum A1). Pure, and LIGHT: the ? is in the shell on every
// page, so this module ships to the browser everywhere and imports no About copy (`about-pages.ts`, the entry list).
// Its two tables are therefore written out here, and `question-landing.test.ts` derives both from `ABOUT_SECTIONS`
// and fails on any drift.
//
// The ? on a screen some section lists in its `screens` lands on that section with nothing lit (`SCREEN_SECTIONS`).
// The screens with no section of their own (`account` aside) land on the section that answers their question, with one
// label or rule lit (the halo, no New tag): `ABOUT_Q_LANDINGS`, transcribed from the handoff's `copy-strings.ts`
// (Addendum A1), and the all-decks cart's row from Small items 7, item 6.
// New deck splits by path, because `/decks/new`, `/decks/import`, `/decks/precons/**` and `/commanders/choose` are all
// its screen. `account` and a path no screen answers for (About itself, admin) have no landing: the ? opens `/about`.
//
// Whether the reader is drawn the lit unit is the page's to decide (`visibleSections` on the server): a landing whose
// unit is switched off lands on its section with nothing lit.

import type { AboutScreen, DeckView } from "../copy/about";
import { screenForPath } from "./screen-for-path";

// The same strings as `page-tools.ts`'s, which this module cannot import (it reaches the About copy).
const LIT = "lit";
const FROM = "from";

type AreaId = "home" | "collection" | "commanders" | "decks" | "shopping" | "friends";
type SectionRef = `${AreaId}/${string}`;

/** The section a sectioned screen lands on, the first in page order that lists it; a deck by its view. */
export const SCREEN_SECTIONS: Readonly<Partial<Record<AboutScreen | `deck:${DeckView}`, SectionRef>>> = {
  home: "home/home",
  collection: "collection/cards",
  upload: "collection/upload",
  commanders: "commanders/for-you",
  discover: "commanders/discover",
  decks: "decks/your-decks",
  "deck:your-deck": "decks/your-deck",
  "deck:analysis": "decks/analysis",
  "deck:versions": "decks/versions",
  "deck:games": "decks/games",
  "deck:stats": "decks/stats",
  "deck:notes": "decks/notes",
  "deck:shopping": "shopping/deck-shopping",
  friends: "friends/friends",
};

/** The ? on a screen with no section: the section it lands on and the one unit lit there. */
export type QuestionLandingRow = { lands: SectionRef; lit: { label: string } | { rule: string } };

/** The A1 screens and the cart, keyed by screen; New deck's three paths as `new-deck`, `new-deck@precons` and `new-deck@choose`. */
export type QuestionLandingId =
  | "card-details" | "sets" | "proxies" | "history" | "wishlist" | "new-deck" | "new-deck@precons" | "new-deck@choose"
  | "settings" | "credits" | "cart";

export const ABOUT_Q_LANDINGS: Readonly<Record<QuestionLandingId, QuestionLandingRow>> = {
  // Desktop only: at 390 card details covers the header's ?.
  "card-details": { lands: "collection/cards", lit: { label: "key" } },
  sets: { lands: "collection/cards", lit: { label: "tabs" } },
  proxies: { lands: "shopping/deck-shopping", lit: { rule: "proxy" } },
  history: { lands: "collection/upload", lit: { rule: "replace" } },
  wishlist: { lands: "collection/cards", lit: { label: "tabs" } },
  // /decks/new, /decks/import
  "new-deck": { lands: "decks/your-decks", lit: { label: "new-deck" } },
  // /decks/precons/**
  "new-deck@precons": { lands: "decks/your-decks", lit: { label: "precons" } },
  // /commanders/choose
  "new-deck@choose": { lands: "commanders/for-you", lit: { label: "places" } },
  settings: { lands: "home/whats-new", lit: { label: "lead" } },
  credits: { lands: "decks/analysis", lit: { rule: "credits" } },
  // The all-decks cart (Small items 7, item 6): its section pictures the cart but lists no screen, so the ? lights the total.
  cart: { lands: "shopping/all-decks", lit: { label: "total" } },
};

export type QuestionLanding = { area: AreaId; section: string; lit: string | null };

/** The lit unit's key, as the page's labels and rules carry it (`labelKey`, `ruleKey` in `pages-visible.ts`). */
export function landingRowKey(row: QuestionLandingRow): string {
  return "rule" in row.lit ? `rule/${row.lit.rule}` : `${row.lands}/${row.lit.label}`;
}

function rowFor(screen: AboutScreen, path: string): QuestionLandingRow | null {
  if (screen === "new-deck") {
    if (path === "/commanders/choose") return ABOUT_Q_LANDINGS["new-deck@choose"];
    if (path.split("/")[2] === "precons") return ABOUT_Q_LANDINGS["new-deck@precons"];
    return ABOUT_Q_LANDINGS["new-deck"];
  }
  return Object.hasOwn(ABOUT_Q_LANDINGS, screen) ? ABOUT_Q_LANDINGS[screen as QuestionLandingId] : null;
}

const at = (ref: SectionRef, lit: string | null): QuestionLanding => {
  const [area, section] = ref.split("/") as [AreaId, string];
  return { area, section, lit };
};

/**
 * Where the ? pressed on `pathname` + `search` lands, or null for `/about` itself. `deckView` is the deck's live view
 * (`BuilderScreenContext`), null off a deck (Your deck, the view a deck opens on). `desktop`: card details is answered
 * only where its ? can be pressed; on a phone the ? answers for the list under it.
 */
export function questionLanding(
  pathname: string,
  search: string,
  opts: { deckView: DeckView | null; desktop: boolean },
): QuestionLanding | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  let screen = screenForPath(path, search);
  if (screen === "card-details" && !opts.desktop) {
    const rest = new URLSearchParams(search);
    rest.delete("card");
    screen = screenForPath(path, rest);
  }
  if (screen === null) return null;
  const key: AboutScreen | `deck:${DeckView}` = screen === "deck" ? `deck:${opts.deckView ?? "your-deck"}` : screen;
  const listed = SCREEN_SECTIONS[key];
  if (listed) return at(listed, null);
  const row = rowFor(screen, path);
  return row === null ? null : at(row.lands, landingRowKey(row));
}

/** The ?'s address for a landing: the area page at the section, with where the reader came from and the lit unit. */
export function questionHref(landing: QuestionLanding | null, from: string): string {
  if (landing === null) return "/about";
  const q = new URLSearchParams({ [FROM]: from });
  if (landing.lit !== null) q.set(LIT, landing.lit);
  return `/about/${landing.area}?${q.toString()}#${landing.section}`;
}
