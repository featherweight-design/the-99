// @vitest-environment jsdom
// The press probes stamp in the page, from the press to the first frame that holds the result, so a
// figure is never the harness's own wait returning late (press-probe.mjs).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NAV_PROBE, PRESS_PROBE } from "./press-probe.mjs";

const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const press = () => window.dispatchEvent(new Event("pointerdown"));

type Stamps = { at: number | null; dialog?: number | null; art?: number | null; drew?: number | null };
const stamps = (key: "__press" | "__nav") => (window as unknown as Record<string, Stamps>)[key];

beforeEach(() => {
  // jsdom computes no layout, so no innerText; the probe reads it for `<main>`'s content.
  Object.defineProperty(HTMLElement.prototype, "innerText", { configurable: true, get() { return this.textContent; } });
});
afterEach(() => { document.body.innerHTML = ""; });

describe("PRESS_PROBE", () => {
  it("times the dialog and its art from the press, in the frames that first hold them", async () => {
    PRESS_PROBE();
    press();
    await wait(40);
    document.body.innerHTML = '<div role="dialog" aria-labelledby="card-modal-title"><div id="art"></div></div>';
    await frame();
    await frame();
    const s = stamps("__press");
    expect(s.dialog! - s.at!).toBeGreaterThanOrEqual(35);
    expect(s.art).toBeNull();
    // The FIRST frame that held the dialog, kept while the art is still to come.
    const first = s.dialog;
    await frame();
    await frame();
    expect(s.dialog).toBe(first);
    document.getElementById("art")!.style.backgroundImage = 'url("https://cards.scryfall.io/x.jpg")';
    await frame();
    await frame();
    expect(s.art! - s.at!).toBeGreaterThanOrEqual(s.dialog! - s.at!);
  });

  it("stamps nothing before the press, even with a dialog already drawn", async () => {
    document.body.innerHTML = '<div role="dialog" aria-labelledby="card-modal-title"></div>';
    PRESS_PROBE();
    await frame();
    await frame();
    expect(stamps("__press")).toEqual({ at: null, dialog: null, art: null });
  });
});

describe("NAV_PROBE", () => {
  it("does not stamp the page being left, however much content it holds", async () => {
    // A soft navigation leaves a page whose <main> already has content: only the destination counts.
    document.body.innerHTML = `<main>${"The page being left, with plenty of content of its own.".repeat(2)}</main>`;
    const from = location.pathname;
    NAV_PROBE({ path: "/decks/elsewhere", at: performance.now() });
    await frame();
    await frame();
    expect(stamps("__nav").drew).toBeNull();
    history.pushState(null, "", "/decks/elsewhere");
    await frame();
    await frame();
    expect(stamps("__nav").drew).not.toBeNull();
    history.pushState(null, "", from);
  });

  it("times from a given push to the frame where the path is current and main holds content", async () => {
    NAV_PROBE({ path: location.pathname, at: performance.now() });
    await wait(30);
    document.body.innerHTML = `<main>${"A deck with enough words in it to count as content.".repeat(2)}</main>`;
    await frame();
    await frame();
    const s = stamps("__nav");
    expect(s.drew! - s.at!).toBeGreaterThanOrEqual(25);
  });

  it("waits for the press, and for the loading screen to go", async () => {
    document.body.innerHTML = `<main><div role="status" class="min-h-[420px]">${"Loading the deck page now, please wait.".repeat(2)}</div></main>`;
    NAV_PROBE({ path: location.pathname, at: null });
    await frame();
    await frame();
    expect(stamps("__nav").at).toBeNull();
    press();
    await frame();
    await frame();
    expect(stamps("__nav").drew).toBeNull();
    document.body.innerHTML = `<main>${"A deck with enough words in it to count as content.".repeat(2)}</main>`;
    await frame();
    await frame();
    expect(stamps("__nav").drew).not.toBeNull();
  });
});
