/**
 * Quick return for the phone header (card search handoff, README call 3; plan `2026-10-16-card-search.md`, PR B).
 * Pure: the hook in `components/shell/use-quick-return.ts` feeds it scroll positions and the page's state, and
 * draws what it answers.
 *
 * - `page`: the header sits in the page as it always has, moving with the scroll (at the top, and on arrival).
 * - `away`: slid off the top. Reached by scrolling past it, or by 8px of downward travel while it is back.
 * - `shown`: back over the page, after 12px of upward travel from the lowest point.
 *
 * Under a sheet or a modal nothing moves (the page under it cannot scroll anyway, and the lock's own release must
 * not read as travel). While a page field has focus the header does not come back, and one already back slides away,
 * so it never covers what the reader is typing into. A scroll the app makes (a `reveal()`, a restore, a navigation)
 * moves the reference points and never the header.
 */

/** Downward travel, past the header, that sends a returned header away. */
export const AWAY_AFTER_PX = 8;
/** Upward travel from the lowest point that brings the header back. */
export const BACK_AFTER_PX = 12;
/** The slide away, and the slide back (the sheet curve's length). */
export const AWAY_MS = 160;
export const BACK_MS = 200;
/** How long a scroll after a navigation or a history move is treated as the app's, not the reader's. */
export const SETTLE_MS = 300;

export type QuickReturnMode = "page" | "away" | "shown";

export type QuickReturnState = {
  mode: QuickReturnMode;
  /** The scroll position last seen. */
  y: number;
  /** While away: the lowest point since it went. While shown: the highest point since it came back. */
  mark: number;
};

export type QuickReturnInput = {
  /** `window.scrollY`, never negative (an iOS rubber band reads below 0). */
  y: number;
  /** The header's own height. */
  height: number;
  /** A scroll lock is held: a sheet or a modal is up. */
  locked: boolean;
  /** A page field has focus. */
  fieldFocus: boolean;
  /** The app is scrolling, not the reader. */
  programmatic: boolean;
};

export const INITIAL: QuickReturnState = { mode: "page", y: 0, mark: 0 };

export function quickReturnStep(state: QuickReturnState, input: QuickReturnInput): QuickReturnState {
  const y = Math.max(0, input.y);
  if (input.locked) return state;
  if (y <= 0) return { mode: "page", y, mark: y };
  // A field taking focus takes a returned header off the page whoever is scrolling, so it never sits over what is
  // typed: into the page within its own height, away past it.
  if (input.fieldFocus && state.mode === "shown") return { mode: y > input.height ? "away" : "page", y, mark: y };
  if (input.programmatic) return { mode: settledMode(state.mode, y, input.height), y, mark: y };

  switch (state.mode) {
    case "page":
      // Scrolled past it: it has left with the page, so it is away without sliding anywhere.
      return y > input.height ? { mode: "away", y, mark: y } : { mode: "page", y, mark: y };
    case "away": {
      // Back within its own height: the page shows it where it sits, part way scrolled off.
      if (y <= input.height) return { mode: "page", y, mark: y };
      const low = Math.max(state.mark, y);
      if (!input.fieldFocus && low - y >= BACK_AFTER_PX) return { mode: "shown", y, mark: y };
      return { mode: "away", y, mark: low };
    }
    case "shown": {
      const high = Math.min(state.mark, y);
      if (y > input.height && y - high >= AWAY_AFTER_PX) return { mode: "away", y, mark: y };
      return { mode: "shown", y, mark: high };
    }
  }
}

/**
 * Where an app scroll leaves the header: where the page puts it within its own height (or still back over the page),
 * scrolled off with the page past it, and otherwise as it was. Away inside its height would leave the page's room for
 * it empty at the top.
 */
function settledMode(mode: QuickReturnMode, y: number, height: number): QuickReturnMode {
  if (y <= height) return mode === "shown" ? "shown" : "page";
  return mode === "page" ? "away" : mode;
}

/**
 * The room a returned header takes at the top of the screen, which a sticky page head rides under
 * (`--header-offset`). Zero in the page: a head below the header cannot be stuck before the header has scrolled off.
 */
export function headerOffset(mode: QuickReturnMode, height: number): number {
  return mode === "shown" ? height : 0;
}
