import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { creditsPageCopy } from "../../lib/copy/credits-page";
import { showcaseCopy, writtenForYouCopy } from "../../lib/copy/discovery";
import { refreshCopy } from "../../lib/copy/refresh";
import { sheetDay } from "../../lib/copy/welcome-credits";
import type { ShowcaseGroup } from "../../lib/discovery/showcase";
import { welcomeSheet, type WelcomeFacts } from "../../lib/payments/welcome-sheet";
import { WhereCreditsWork } from "./where-credits-work";

const AT = new Date("2026-11-20T18:00:00Z");
const facts = (over: Partial<WelcomeFacts> = {}): WelcomeFacts => ({
  lot: "held", units: 15, left: 15, expiresAtMs: AT.getTime(), days: 30, teaser: true, free: 1, ...over,
});
const card = (id: string, state: ShowcaseGroup["cards"][number]["state"]) =>
  ({ id, copy: {}, credit: null, entry: id, state, note: null }) as unknown as ShowcaseGroup["cards"][number];
const GROUPS: ShowcaseGroup[] = [
  { group: "start", cards: [card("help-me-choose", { kind: "page", href: "/decks/new/choose?tool=help-me-choose", label: "x" })] },
  { group: "tune", cards: [
    card("proposed-cuts", { kind: "deck", href: "/decks/d1?tool=proposed-cuts", deck: "D", more: 0 }),
    card("suggested-changes", { kind: "deck", href: "/decks/d1?tool=suggested-changes", deck: "D", more: 0 }),
  ] },
];
const sheet = (cards: number, decks: number) => welcomeSheet({ written: writtenForYouCopy.rows, cards, decks, groups: GROUPS })!;

function open(cards: number, decks: number, f = facts(), teaser = f.teaser) {
  render(<main><WhereCreditsWork facts={f} sheet={sheet(cards, decks)} teaser={teaser} onClose={() => {}} /></main>);
  return screen.getByRole("dialog", { name: "Where credits work" });
}
const tries = (d: HTMLElement) => within(d).queryAllByRole("link", { name: /Try it/ });

describe("WhereCreditsWork", () => {
  it("carries the L6 line, the grant line with the date, then the five rows as name, where and cost", () => {
    const d = open(0, 0);
    expect(d.textContent).toContain(creditsPageCopy.viewsFree);
    expect(d.textContent).toContain(`You have 15 welcome credits until ${sheetDay(AT)}. Your free credit each day is spent first.`);
    for (const r of writtenForYouCopy.rows) {
      const row = d.querySelector(`[data-welcome-row="${r.id}"]`)!;
      expect(row.textContent).toContain(r.name);
      expect(row.textContent).toContain(r.where);
      expect(row.textContent).toContain(r.short);
      expect(row.textContent).not.toContain(r.what);
    }
  });

  it("before a collection: the lock line once and no Try it", () => {
    const d = open(0, 0);
    expect(within(d).getAllByText(refreshCopy.firstRun.step2Locked)).toHaveLength(1);
    expect(tries(d)).toHaveLength(0);
  });

  it("cards and no deck: Help me choose first with Try it, then the reason line once", () => {
    const d = open(12, 0);
    const ids = [...d.querySelectorAll("[data-welcome-row]")].map((e) => e.getAttribute("data-welcome-row"));
    expect(ids[0]).toBe("help-me-choose");
    expect(within(d).getAllByText(showcaseCopy.needsADeck)).toHaveLength(1);
    expect(tries(d).map((a) => a.getAttribute("href"))).toEqual(["/decks/new/choose?tool=help-me-choose"]);
  });

  it("with a deck: About's order and Try it on the three tools with a landing", () => {
    const d = open(12, 2);
    const ids = [...d.querySelectorAll("[data-welcome-row]")].map((e) => e.getAttribute("data-welcome-row"));
    expect(ids).toEqual(writtenForYouCopy.rows.map((r) => r.id));
    expect(d.querySelector("[data-welcome-line]")).toBeNull();
    expect(tries(d).map((a) => a.getAttribute("data-welcome-try"))).toEqual(["suggested", "look-deeper", "help-me-choose"]);
  });

  it("the teaser is at the foot while teaser holds, and absent otherwise", () => {
    expect(within(open(12, 2)).getByRole("link", { name: /See packs and the monthly plan/ }).getAttribute("href")).toBe("/credits");
  });

  it("no teaser when the caller says so (from /credits, or once bought)", () => {
    expect(within(open(12, 2, facts(), false)).queryByRole("link", { name: /See packs/ })).toBeNull();
  });

  it("expiring: the grant line turns --warning, never --danger", () => {
    const d = open(12, 2, facts({ lot: "expiring", left: 9, days: 3 }));
    const grant = d.querySelector("[data-welcome-grant]")!;
    expect(grant.textContent).toContain(`9 welcome credits expire in 3 days, on ${sheetDay(AT)}.`);
    expect(grant.className).toContain("var(--warning)");
    expect(d.innerHTML).not.toContain("--danger");
  });

  it("a reader with more than one free credit a day is told how many", () => {
    const d = open(12, 2, facts({ free: 5 }));
    expect(d.querySelector("[data-welcome-grant]")!.textContent).toContain("Your 5 free credits each day are spent first.");
  });

  it("partly spent names what is left", () => {
    const d = open(12, 2, facts({ lot: "partly", left: 9 }));
    expect(d.querySelector("[data-welcome-grant]")!.textContent).toContain(`9 of your 15 welcome credits are left, until ${sheetDay(AT)}.`);
  });
});
