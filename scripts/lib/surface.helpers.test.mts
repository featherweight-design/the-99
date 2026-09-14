// @vitest-environment node
//
// The sweep in `surface.test.mts` reads probe source; it never runs the helpers.
// A regression that dropped the `main` scope, or stopped awaiting the animation
// promises, would leave that suite green and restore the false measurement the
// whole helper exists to prevent. These exercise the helpers themselves against
// a stand-in for Playwright's page, which is enough because every behaviour that
// matters here is about WHAT IS ASKED FOR, not about a real browser.
import { describe, expect, it, vi } from "vitest";
import { PAGE, onPage, openSheet, settled } from "./surface.mjs";

/**
 * The smallest thing that records what a caller asked of a page.
 *
 * It CHAINS, because `onPage` does: `page.locator("main").locator(sel)` rather
 * than one concatenated string, so that a selector using a non-CSS engine
 * survives being scoped. `asked` records the composed path at every level —
 * `["main", "main button"]` — and `handed` records the raw selector each level
 * was given, which is where a mangled inner engine would show.
 */
function fakePage({ triggerCount = 1 } = {}) {
  const asked: string[] = [];
  const handed: string[] = [];
  const settledCalls: string[] = [];
  const make = (path: string, given: string) => {
    asked.push(path);
    handed.push(given);
    const self: Record<string, unknown> = {
      locator: (selector: string) => make(`${path} ${selector}`, selector),
      first: () => self,
      count: async () => (path.includes("haspopup") ? triggerCount : 1),
      click: vi.fn(async () => {}),
      waitFor: vi.fn(async () => {}),
      // Recorded, so a caller that skips `settled()` is visible. Returning the
      // dialog without it removes the animation wait, and a spy nobody asserts
      // on would let that through green.
      evaluate: vi.fn(async () => {
        settledCalls.push(path);
      }),
    };
    return self;
  };
  const locator = (selector: string) => make(selector, selector);
  return { page: { locator }, asked, handed, settledCalls };
}

describe("onPage", () => {
  it("scopes the selector to the page, by chaining", () => {
    const { page, asked } = fakePage();
    onPage(page, "button");
    expect(asked).toEqual([PAGE, `${PAGE} button`]);
  });

  it("hands the inner selector over untouched", () => {
    // The reason it chains rather than concatenating. `main text=Safewright
    // Cavalry` is parsed as ONE CSS selector and throws `Unexpected token "="`;
    // a chain scopes the same way and leaves the text engine alone.
    const { page, handed } = fakePage();
    onPage(page, "text=Safewright Cavalry");
    expect(handed).toEqual([PAGE, "text=Safewright Cavalry"]);
  });

  it("scopes to main specifically", () => {
    // Named rather than inferred: the shell is everything outside `<main>`, so
    // this constant is the whole mechanism.
    expect(PAGE).toBe("main");
  });
});

describe("openSheet", () => {
  it("asks for a visible trigger, inside the page", async () => {
    const { page, asked } = fakePage();
    await openSheet(page);
    expect(asked).toContain(`${PAGE} button[aria-haspopup="dialog"]:visible`);
  });

  it("asks for the dialog inside the page too", async () => {
    // The bug one line below the fix: an unscoped dialog lookup settles the
    // shell's account sheet, which is also a `role="dialog"` and comes first.
    const { page, asked } = fakePage();
    await openSheet(page);
    expect(asked).toContain(`${PAGE} [role="dialog"]`);
  });

  it("settles the dialog before returning it", async () => {
    const { page, settledCalls } = fakePage();
    await openSheet(page);
    expect(settledCalls).toEqual([`${PAGE} [role="dialog"]`]);
  });

  it("returns null when the page has no trigger", async () => {
    const { page } = fakePage({ triggerCount: 0 });
    expect(await openSheet(page)).toBeNull();
  });
});

describe("settled", () => {
  it("waits on the element's own animations, subtree included", async () => {
    let optionsSeen: unknown;
    let awaited = 0;
    const locator = {
      evaluate: async (fn: (el: unknown) => unknown) => {
        const el = {
          getAnimations: (options: unknown) => {
            optionsSeen = options;
            return [{ finished: Promise.resolve().then(() => void awaited++) }];
          },
        };
        return fn(el);
      },
    };
    await settled(locator as never);
    expect(optionsSeen).toEqual({ subtree: true });
    expect(awaited).toBe(1);
  });
});
