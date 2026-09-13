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

/** The smallest thing that records what a caller asked of a page. */
function fakePage({ triggerCount = 1 } = {}) {
  const asked: string[] = [];
  const locator = (selector: string) => {
    asked.push(selector);
    const self: Record<string, unknown> = {
      first: () => self,
      count: async () => (selector.includes("haspopup") ? triggerCount : 1),
      click: vi.fn(async () => {}),
      waitFor: vi.fn(async () => {}),
      evaluate: vi.fn(async () => {}),
    };
    return self;
  };
  return { page: { locator }, asked };
}

describe("onPage", () => {
  it("scopes the selector to the page", () => {
    const { page, asked } = fakePage();
    onPage(page, "button");
    expect(asked).toEqual([`${PAGE} button`]);
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
    expect(asked[0]).toBe(`${PAGE} button[aria-haspopup="dialog"]:visible`);
  });

  it("asks for the dialog inside the page too", async () => {
    // The bug one line below the fix: an unscoped dialog lookup settles the
    // shell's account sheet, which is also a `role="dialog"` and comes first.
    const { page, asked } = fakePage();
    await openSheet(page);
    expect(asked).toContain(`${PAGE} [role="dialog"]`);
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
