import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { writtenForYouCopy } from "../../lib/copy/discovery";
import { stripDay } from "../../lib/copy/welcome-credits";
import { buildCreditsModel } from "../../lib/payments/page-model";
import { welcomeSheet, type WelcomeFacts } from "../../lib/payments/welcome-sheet";
import { Balance } from "./balance";

const NOW = new Date("2026-10-21T12:00:00Z");
const AT = new Date("2026-11-20T18:00:00Z");
const SOON = new Date("2026-10-24T06:00:00Z");

function cells(at: Date, welcome = 9) {
  const built = buildCreditsModel({
    switchOn: true,
    allowance: { used: 0, limit: 1, nextAt: null, welcome, welcomeExpiresAt: at },
    history: [],
    offers: [],
    now: NOW,
  });
  if (!built.sees) throw new Error("unseen");
  return built.model.cells;
}
const facts: WelcomeFacts = { lot: "partly", units: 15, left: 9, expiresAtMs: AT.getTime(), days: 30, teaser: true, free: 1 };
const sheet = welcomeSheet({ written: writtenForYouCopy.rows, cards: 12, decks: 0, groups: [] })!;
const cell = () => document.querySelector('[data-cell="welcome"]') as HTMLElement;

describe("the Welcome cell's line", () => {
  it("says when the lot expires, in the reader's own day, then Where they work on its own line", () => {
    render(<main><Balance total={10} cells={cells(AT)} freeLimit={1} nextAtMs={null} welcome={{ facts, sheet }} /></main>);
    const line = cell().querySelector("[data-welcome-expires]")!;
    expect(line.textContent).toBe(`expire ${stripDay(AT)}`);
    expect(line.getAttribute("data-welcome-expires")).toBe("held");
    expect(cell().querySelector("br")).not.toBeNull();
    fireEvent.click(within(cell()).getByRole("button", { name: "Where they work" }));
    const dialog = screen.getByRole("dialog", { name: "Where credits work" });
    // Opened from /credits, the teaser is absent: the reader is already there.
    expect(within(dialog).queryByRole("link", { name: /See packs/ })).toBeNull();
  });

  it("within three days it reads the expiring form in --warning", () => {
    render(<Balance total={10} cells={cells(SOON)} freeLimit={1} nextAtMs={null} welcome={{ facts, sheet }} />);
    const line = cell().querySelector("[data-welcome-expires]")!;
    expect(line.textContent).toBe(`expire in 3 days, ${stripDay(SOON)}`);
    expect(line.className).toContain("var(--warning)");
  });

  it("one credit left expires, singular", () => {
    render(<Balance total={2} cells={cells(AT, 1)} freeLimit={1} nextAtMs={null} welcome={null} />);
    expect(cell().querySelector("[data-welcome-expires]")!.textContent).toBe(`expires ${stripDay(AT)}`);
  });

  it("with every row off the date stands alone", () => {
    render(<Balance total={10} cells={cells(AT)} freeLimit={1} nextAtMs={null} welcome={null} />);
    expect(cell().querySelector("[data-welcome-expires]")!.textContent).toBe(`expire ${stripDay(AT)}`);
    expect(within(cell()).queryByRole("button")).toBeNull();
  });
});
