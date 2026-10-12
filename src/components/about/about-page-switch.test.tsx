// /about with an entry tied to a feature switch (Hugh, 2026-09-25): Locked cards, which follows
// NEVER_CUT_ENABLED. Everything between that and the page — which entries draw, which are new,
// what the index lists — is the code that ships.

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../app/about/actions", () => ({ dismissAbout: vi.fn(), recordAboutVisit: vi.fn(async () => {}) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { AboutPage } = await import("./about-page");
const { ABOUT_VERSION, aboutEntries } = await import("../../lib/copy/about");
const switched = aboutEntries.find((e) => e.id === "locked-cards")!;

const index = () => screen.queryByRole("navigation", { name: /new since your last visit/ });
const drawn = () => document.getElementById(switched.id);

afterEach(() => {
  delete process.env.NEVER_CUT_ENABLED;
});

describe("an entry tied to a switch, on the page", () => {
  it("is not on the page while its switch is off", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    expect(drawn()).toBeNull();
  });

  it("is on the page, and new, once the switch is on, for a reader who is current by version", () => {
    process.env.NEVER_CUT_ENABLED = "true";
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    expect(drawn()).not.toBeNull();
    const links = within(index()!).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([`#${switched.id}`]);
  });

  it("is not new once the reader has met it by id", () => {
    process.env.NEVER_CUT_ENABLED = "true";
    render(<AboutPage seen={ABOUT_VERSION} seenIds={[switched.id]} sheetMode />);
    expect(drawn()).not.toBeNull();
    expect(index()).toBeNull();
  });
});

describe("the legacy page (no sheet), for a reader current by version", () => {
  it("marks a newly enabled switched entry new and offers the way back, as the legacy gate sent them for it", () => {
    process.env.NEVER_CUT_ENABLED = "true";
    render(<AboutPage seen={ABOUT_VERSION} next="/decks" />);
    expect(drawn()).toBeTruthy();
    expect(index()).toBeNull(); // the index is the sheet's; the eyebrow and the mark are the legacy page's
    expect(screen.getAllByRole("button", { name: /got it/i }).length).toBeGreaterThan(0);
  });

  it("leaves a reader who has met the entry alone: nothing to acknowledge, no dismiss", () => {
    process.env.NEVER_CUT_ENABLED = "true";
    render(<AboutPage seen={ABOUT_VERSION} seenIds={[switched.id]} next="/decks" />);
    expect(screen.queryByRole("button", { name: /got it/i })).toBeNull();
  });
});

describe("deck-benchmarks, on the page", () => {
  const benchmarks = () => document.getElementById("deck-benchmarks");
  afterEach(() => {
    delete process.env.DECK_BENCHMARKS_ENABLED;
    delete process.env.ANALYSIS_TAB_ENABLED;
  });

  it("is not on the page while the Analysis tab is off, whatever its own switch says", () => {
    process.env.DECK_BENCHMARKS_ENABLED = "true";
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    expect(benchmarks()).toBeNull();
  });

  it("is not on the page while DECK_BENCHMARKS_ENABLED is off", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    expect(benchmarks()).toBeNull();
  });

  it("draws with its specimen, and is new, once the switch is on", () => {
    process.env.DECK_BENCHMARKS_ENABLED = "true";
    process.env.ANALYSIS_TAB_ENABLED = "true";
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    expect(benchmarks()).not.toBeNull();
    expect(benchmarks()!.querySelector("[data-specimen] [data-benchmarks]")).not.toBeNull();
    const links = within(index()!).getAllByRole("link");
    // The Analysis tab's own entries come up new with it here; this entry is among them.
    expect(links.map((a) => a.getAttribute("href"))).toContain("#deck-benchmarks");
  });
});

describe("all-decks-cart, on the page", () => {
  afterEach(() => {
    delete process.env.ALL_DECKS_CART_ENABLED;
  });

  it("speaks the owned fact and the price its hidden figure draws, which no key line repeats", async () => {
    process.env.ALL_DECKS_CART_ENABLED = "true";
    const { allDecksCartCopy } = await import("../../lib/copy/all-decks-cart");
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    const entry = document.getElementById("all-decks-cart")!;
    expect(entry).not.toBeNull();
    const spoken = [...entry.querySelectorAll(".sr-only")].map((e) => e.textContent ?? "");
    expect(spoken.some((t) => t.includes(allDecksCartCopy.list.owned(17)) && t.includes("$3.87"))).toBe(true);
  });

  it("draws the Sol Ring cart line in its figure: three decks, the owned fact and the line's tag", () => {
    process.env.ALL_DECKS_CART_ENABLED = "true";
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    // The body, not the frame: `Specimen` makes the `[data-specimen]` node whatever it holds.
    const el = document.querySelector<HTMLElement>('[data-specimen="all-decks-cart"]')!;
    expect(el).not.toBeNull();
    const text = el.textContent ?? "";
    for (const part of ["Sol Ring", "HD - Gishath", "HD - Kratos", "HD -Thorin", "you own 17 · all 17 in other decks", "$3.87"]) {
      expect(text, part).toContain(part);
    }
  });
});

describe("notes, on the page", () => {
  afterEach(() => {
    delete process.env.DECK_NOTES_ENABLED;
  });

  it("draws only while its switch is on", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    expect(document.getElementById("notes")).toBeNull();
    cleanup();
    process.env.DECK_NOTES_ENABLED = "true";
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    expect(document.getElementById("notes")).not.toBeNull();
  });

  it("draws the note in its figure: both tagged cards and the date, the panel's own tags", () => {
    process.env.DECK_NOTES_ENABLED = "true";
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    const el = document.querySelector<HTMLElement>('[data-specimen="notes"]')!;
    expect(el).not.toBeNull();
    expect(el.textContent).toContain("Laboratory Maniac");
    expect(el.textContent).toContain("Thassa’s Oracle");
    expect(el.textContent).toContain("2 Oct");
    // Both of the row's date placements, as the real row has them: under the text on a phone, beside it from md.
    expect([...el.querySelectorAll("span")].filter((n) => n.textContent === "2 Oct").map((n) => n.className.includes("md:hidden") ? "phone" : "wide")).toEqual(["phone", "wide"]);
    expect(within(el).getByRole("button", { name: /Laboratory Maniac/, hidden: true }).className).toContain("decoration-solid");
    expect(within(el).getByRole("button", { name: /Thassa’s Oracle/, hidden: true }).className).toContain("decoration-dashed");
  });
});
