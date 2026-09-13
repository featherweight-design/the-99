// Reaching a PAGE's controls, rather than the app shell's.
//
// The shell renders `NavRail`, `MobileHeader` and `TabBar` around `<main>`, and
// its account menu is a button with `aria-haspopup="dialog"` at phone width —
// the same selector a page's filter-sheet trigger carries. The shell comes
// first in document order, so `page.$('button[aria-haspopup="dialog"]')` finds
// the account menu on every route, and a probe then measures the shell while
// naming the surface it meant to measure.
//
// That is not hypothetical: it produced two false findings in `probe-sets.mjs`
// — a sheet footer said to be painted over, and a panel said to overflow the
// fold — both of them the account menu, and the second compounded by the
// animation note below.
//
// The remedy is a scope, not a more specific selector: page content lives
// inside `<main>` and nothing of the shell does.
export const PAGE = "main";

/** A locator scoped to the page, never the shell around it. */
export function onPage(page, selector) {
  return page.locator(`${PAGE} ${selector}`);
}

/**
 * Wait for every animation currently running on an element and its subtree.
 *
 * Not tied to a class: it asks the engine what is animating and waits for those
 * promises. A sheet arrives under a 180ms transform — `.anim-sheet-in` for a
 * page's own sheet, `.anim-sheet-up` for the shell's account menu — and a box
 * measured part-way through reads as hanging below the fold, a real-looking
 * number for a state the reader never sees. A `settle` delay is a guess about
 * how long that takes; this is not.
 */
export async function settled(locator) {
  await locator.evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))),
  );
  return locator;
}

/**
 * Open the page's own filter sheet and return its dialog, settled.
 *
 * Returns null when the page has no sheet trigger, so a caller can report that
 * as its own failure rather than crashing — a missing trigger and a trigger
 * that opens nothing are different findings.
 */
export async function openSheet(page, { timeout = 5_000 } = {}) {
  // `:visible`, not just `.first()`. A route mounts both renderings of its
  // control and hides one with `md:`, so the phone trigger is in the DOM at
  // desktop width and comes first — clicking it opens nothing and times out.
  const trigger = onPage(page, 'button[aria-haspopup="dialog"]:visible').first();
  if ((await trigger.count()) === 0) return null;
  await trigger.click();
  // The dialog is scoped too. The shell's account sheet is also a
  // `role="dialog"` and sits before `<main>`, so an unscoped lookup here would
  // settle and return the account sheet — the same substitution this helper
  // exists to prevent, one line further down.
  const dialog = onPage(page, '[role="dialog"]').first();
  await dialog.waitFor({ state: "visible", timeout });
  return settled(dialog);
}
