// /about under the sheet switch (About R6 §O, §P0, §P). The page with the switch
// off is about-page.test.tsx's, and every one of those tests runs unchanged.

import { act, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const recordAboutVisit = vi.fn(async () => {});
vi.mock("../../app/about/actions", () => ({ dismissAbout: vi.fn(), recordAboutVisit }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { AboutPage } = await import("./about-page");
const { ABOUT_VERSION, aboutCopy, aboutEntries } = await import("../../lib/copy/about");

const newSince = (seen: number) => aboutEntries.filter((e) => seen > 0 && e.since > seen);
const index = () => screen.queryByRole("navigation", { name: /new since you were last here/ });

beforeEach(() => {
  recordAboutVisit.mockClear();
  window.history.replaceState(null, "", "/about");
});

describe("the what's-new index (§O)", () => {
  it("lists exactly the entries newer than the reader's pre-visit seen, in page order", () => {
    const seen = 6;
    const want = newSince(seen);
    expect(want.length).toBeGreaterThan(1);
    render(<AboutPage seen={seen} sheetMode />);
    const nav = index()!;
    expect(within(nav).getByRole("heading").textContent).toBe(aboutCopy.newSinceEyebrow(want.length));
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(want.map((e) => `#${e.id}`));
  });

  it("makes each row one link, holding the title and route as text (O1)", () => {
    render(<AboutPage seen={ABOUT_VERSION - 1} sheetMode />);
    const [row] = within(index()!).getAllByRole("link");
    const entry = newSince(ABOUT_VERSION - 1)[0];
    expect(row.textContent).toBe(`${entry.title}${entry.route}`);
    expect(row.querySelector("a")).toBeNull();
  });

  it("draws nothing for a current reader, nor at seen 0 (O3)", () => {
    const { unmount } = render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    expect(index()).toBeNull();
    unmount();
    render(<AboutPage seen={0} sheetMode />);
    expect(index()).toBeNull();
  });

  it("retires the eyebrow into the index heading", () => {
    render(<AboutPage seen={ABOUT_VERSION - 1} sheetMode />);
    // Once, in the index, rather than an eyebrow above the title as well.
    expect(screen.getAllByText(aboutCopy.newSinceEyebrow(1))).toHaveLength(1);
    expect(screen.getAllByText(aboutCopy.newSinceEyebrow(1))[0].closest("nav")).not.toBeNull();
  });

  it("offers no dismiss, even when a next is on the URL", () => {
    render(<AboutPage seen={ABOUT_VERSION - 1} next="/decks" sheetMode />);
    expect(screen.queryByRole("button", { name: new RegExp("^" + aboutCopy.dismiss) })).toBeNull();
  });
});

describe("the new-entry marks (§P0)", () => {
  it("puts the pill before the title visually, and the spoken half after it", () => {
    render(<AboutPage seen={ABOUT_VERSION - 1} sheetMode />);
    const entry = newSince(ABOUT_VERSION - 1)[0];
    const h3 = document.getElementById(entry.id)!.querySelector("h3")!;
    expect(h3.firstElementChild?.textContent).toBe(aboutCopy.newBadge);
    expect(h3.firstElementChild?.getAttribute("aria-hidden")).not.toBeNull();
    expect(h3.lastElementChild?.className).toContain("sr-only");
    expect(h3.lastElementChild?.textContent?.trim()).toBe(aboutCopy.newBadgeSr);
  });

  it("gives a new entry a 2px accent rule, and an old one none of it", () => {
    render(<AboutPage seen={ABOUT_VERSION - 1} sheetMode />);
    const fresh = document.getElementById(newSince(ABOUT_VERSION - 1)[0].id)!;
    const old = document.getElementById(aboutEntries.find((e) => e.since === 1)!.id)!;
    expect(fresh.className).toContain("border-t-2");
    expect(fresh.className).toContain("border-[color:var(--accent)]");
    expect(old.className).not.toContain("border-t-2");
    expect(old.className).not.toContain("var(--accent)");
  });
});

describe("recording the visit (§O4, audit E2)", () => {
  it("records once the page is open, for a reader who is behind", () => {
    render(<AboutPage seen={ABOUT_VERSION - 1} sheetMode />);
    expect(recordAboutVisit).toHaveBeenCalledOnce();
  });

  it("records a first-run reader too, so their sheet stops", () => {
    render(<AboutPage seen={0} sheetMode />);
    expect(recordAboutVisit).toHaveBeenCalledOnce();
  });

  it("records nothing for a current reader", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    expect(recordAboutVisit).not.toHaveBeenCalled();
  });

  it("records nothing with the switch off, where the dismiss still does it", () => {
    render(<AboutPage seen={ABOUT_VERSION - 1} />);
    expect(recordAboutVisit).not.toHaveBeenCalled();
  });
});

describe("the jump mark (§P)", () => {
  const titleLine = (id: string) => document.getElementById(id)!.querySelector("[data-entry-title]")!;

  it("washes the landed entry's title line and focuses its heading", () => {
    const entry = aboutEntries[3];
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    act(() => {
      window.location.hash = entry.id;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(titleLine(entry.id).hasAttribute("data-jumped")).toBe(true);
    expect(document.activeElement).toBe(document.getElementById(entry.id)!.querySelector("h3"));
  });

  it("moves the mark when another jump lands, leaving one", () => {
    const [a, b] = [aboutEntries[2], aboutEntries[5]];
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    for (const e of [a, b]) {
      act(() => {
        window.location.hash = e.id;
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
    }
    expect(titleLine(a.id).hasAttribute("data-jumped")).toBe(false);
    expect(titleLine(b.id).hasAttribute("data-jumped")).toBe(true);
    expect(document.querySelectorAll("[data-jumped]")).toHaveLength(1);
  });

  it("marks an entry the page was opened on with a hash", () => {
    const entry = aboutEntries[4];
    window.history.replaceState(null, "", `/about#${entry.id}`);
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    expect(titleLine(entry.id).hasAttribute("data-jumped")).toBe(true);
  });

  it("clears once the entry leaves the band, never before it has been in it (§P4)", () => {
    const callbacks: IntersectionObserverCallback[] = [];
    const original = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) {
        callbacks.push(cb);
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
    try {
      const entry = aboutEntries[6];
      render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
      act(() => {
        window.location.hash = entry.id;
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      const jump = callbacks[callbacks.length - 1];
      const fire = (isIntersecting: boolean) =>
        act(() => jump([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));
      fire(false);
      expect(titleLine(entry.id).hasAttribute("data-jumped")).toBe(true);
      fire(true);
      fire(false);
      expect(titleLine(entry.id).hasAttribute("data-jumped")).toBe(false);
    } finally {
      globalThis.IntersectionObserver = original;
    }
  });

  it("draws no mark with the switch off", () => {
    const entry = aboutEntries[3];
    render(<AboutPage seen={ABOUT_VERSION} />);
    act(() => {
      window.location.hash = entry.id;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(document.querySelector("[data-jumped]")).toBeNull();
  });
});
