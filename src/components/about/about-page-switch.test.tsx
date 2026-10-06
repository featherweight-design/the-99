// /about with an entry tied to a feature switch (Hugh, 2026-09-25): Locked cards, which follows
// NEVER_CUT_ENABLED. Everything between that and the page — which entries draw, which are new,
// what the index lists — is the code that ships.

import { render, screen, within } from "@testing-library/react";
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
