import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { writtenForYouCopy } from "../../lib/copy/discovery";
import { stripDay } from "../../lib/copy/welcome-credits";
import { welcomeSheet, type WelcomeFacts, type WelcomeSheet } from "../../lib/payments/welcome-sheet";

const dismiss = vi.hoisted(() => vi.fn(async () => ({ dismissed: true })));
vi.mock("../../app/welcome-actions", () => ({ dismissWelcomeStripAction: dismiss }));

const { WelcomeStrip, resetWelcomeStripClosed } = await import("./welcome-strip");

const AT = new Date("2026-11-20T18:00:00Z");
const DAY = stripDay(AT);
const facts = (over: Partial<WelcomeFacts> = {}): WelcomeFacts => ({
  lot: "held", units: 15, left: 15, expiresAtMs: AT.getTime(), days: 30, teaser: true, free: 1, ...over,
});
const SHEET: WelcomeSheet = welcomeSheet({ written: writtenForYouCopy.rows, cards: 0, decks: 0, groups: [] })!;

const strip = () => screen.queryByRole("region", { name: "Welcome credits" });

beforeEach(() => {
  resetWelcomeStripClosed();
  dismiss.mockClear();
});

describe("WelcomeStrip, by state", () => {
  it("held: the count, the date in the reader's own day, Where they work and ✕", () => {
    render(<main><WelcomeStrip facts={facts()} sheet={SHEET} place="first-run" /></main>);
    const s = strip()!;
    expect(s.textContent).toContain(`15 welcome credits to try the tools, until ${DAY}.`);
    expect(within(s).getByRole("button", { name: "Where they work" })).toBeTruthy();
    expect(within(s).getByRole("button", { name: "Dismiss" })).toBeTruthy();
    expect(s.getAttribute("data-welcome-strip")).toBe("held");
    expect(s.className).toContain("var(--accent-dim)");
  });

  it("partly spent says what is left", () => {
    render(<WelcomeStrip facts={facts({ lot: "partly", left: 9 })} sheet={SHEET} place="dashboard" />);
    expect(strip()!.textContent).toContain(`9 of your 15 welcome credits are left, until ${DAY}.`);
  });

  it("expiring: border, mark and count in --warning, never --danger", () => {
    render(<WelcomeStrip facts={facts({ lot: "expiring", left: 9, days: 3 })} sheet={SHEET} place="dashboard" />);
    const s = strip()!;
    expect(s.textContent).toContain(`9 welcome credits expire in 3 days, on ${DAY}.`);
    expect(s.className).toContain("var(--warning)");
    expect(s.innerHTML).not.toContain("--danger");
    expect(within(s).getByText("9 welcome credits").className).toContain("var(--warning)");
  });

  it("used up, teaser on: says so and links to /credits, with no Where they work", () => {
    render(<WelcomeStrip facts={facts({ lot: "usedUp", left: 0 })} sheet={SHEET} place="dashboard" />);
    const s = strip()!;
    expect(s.textContent).toContain("You’ve used all 15 welcome credits.");
    expect(within(s).getByRole("link", { name: "See packs and the monthly plan" }).getAttribute("href")).toBe("/credits");
    expect(within(s).queryByRole("button", { name: "Where they work" })).toBeNull();
  });

  it("used up, teaser off: the free credit line and no link", () => {
    render(<WelcomeStrip facts={facts({ lot: "usedUp", left: 0, teaser: false })} sheet={SHEET} place="dashboard" />);
    const s = strip()!;
    expect(s.textContent).toContain("Your free credit comes back each day.");
    expect(within(s).queryByRole("link")).toBeNull();
  });

  it("used up, teaser off, a larger allowance: names how many come back", () => {
    render(<WelcomeStrip facts={facts({ lot: "usedUp", left: 0, teaser: false, free: 5 })} sheet={SHEET} place="dashboard" />);
    expect(strip()!.textContent).toContain("Your 5 free credits come back each day.");
  });

  it("is absent with no lot, an expired lot or a closed strip (no facts)", () => {
    render(<WelcomeStrip facts={null} sheet={SHEET} place="first-run" />);
    expect(strip()).toBeNull();
  });

  it("with every row off draws no Where they work", () => {
    render(<WelcomeStrip facts={facts()} sheet={null} place="first-run" />);
    expect(within(strip()!).queryByRole("button", { name: "Where they work" })).toBeNull();
  });
});

describe("WelcomeStrip, presses", () => {
  it("✕ calls the dismissal and hides the strip", async () => {
    render(<WelcomeStrip facts={facts()} sheet={SHEET} place="first-run" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    });
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(strip()).toBeNull();
  });

  it("a re-mount in the same document stays closed", async () => {
    const first = render(<WelcomeStrip facts={facts()} sheet={SHEET} place="first-run" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    });
    first.unmount();
    render(<WelcomeStrip facts={facts()} sheet={SHEET} place="first-run" />);
    expect(strip()).toBeNull();
  });

  it("Where they work opens the sheet, with the teaser while teaser holds", () => {
    render(<main><WelcomeStrip facts={facts()} sheet={SHEET} place="first-run" /></main>);
    fireEvent.click(screen.getByRole("button", { name: "Where they work" }));
    const dialog = screen.getByRole("dialog", { name: "Where credits work" });
    expect(within(dialog).getByRole("link", { name: /See packs and the monthly plan/ }).getAttribute("href")).toBe("/credits");
  });

  it("the sheet from the strip has no teaser once something was bought", () => {
    render(<main><WelcomeStrip facts={facts({ teaser: false })} sheet={SHEET} place="first-run" /></main>);
    fireEvent.click(screen.getByRole("button", { name: "Where they work" }));
    const dialog = screen.getByRole("dialog", { name: "Where credits work" });
    expect(within(dialog).queryByRole("link", { name: /See packs/ })).toBeNull();
  });
});
