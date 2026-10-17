// The table page's body, rendered from the boards' fixtures (plan PR 3): every seat state of T1 to T10 (and D1 to
// D10, the same tree at 1300), the flag tags in words, no link on another player's seat (readiness gap 11), no
// other player's deck id anywhere (decision 5), and `Log this game` absent with games off (L3).
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ruleZeroCopy as copy } from "../../lib/copy/rule-zero";
import { TABLES, VIEWER_DECK_ID } from "../../lib/rule-zero/table-fixtures";
import type { TableView } from "../../lib/rule-zero/table-view";
import { closesWhen } from "../../lib/social/when";
import { TableBody } from "./table-body";
import { TableClosed } from "./table-closed";
import { driversSentence } from "./table-seat";

const NOW = new Date("2026-10-16T21:40:00Z");
const draw = (view: TableView, gamesEnabled = true) =>
  render(<TableBody view={view} gamesEnabled={gamesEnabled} now={NOW} />);

const seatOf = (name: string) => screen.getByRole("article", { name: name === "You" ? "Your seat" : `${name}’s seat` });
const meta = () => screen.getByRole("heading", { level: 1 }).nextElementSibling as HTMLElement;
const headline = () => within(screen.getByTestId("read-card")).getByRole("heading", { level: 2 });

describe("TableBody", () => {
  it("T1: balanced, every seat in the read, no flag, the rail's band at the middle", () => {
    draw(TABLES.T1);
    expect(headline()).toHaveTextContent("Balanced: every deck reads Upgraded.");
    expect(screen.queryAllByTestId("flag-tag")).toHaveLength(0);
    expect(screen.getAllByTestId("table-seat").map((s) => s.dataset.state)).toEqual(["fresh", "fresh", "fresh", "fresh"]);
    expect(screen.getByTestId("read-band")).toHaveTextContent("TABLE");
    expect(screen.getAllByTestId("rail-face")).toHaveLength(4);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rule 0 check");
    // After hydration the close time is the reader's own zone's, so the expectation is too (`closesWhen`).
    const closes = closesWhen(TABLES.T1.closesAt, NOW);
    // The pod's name is bold and `open until` breaks to its own line on the phone: the meta line reads as one run.
    expect(meta()).toHaveTextContent(`Thursday night · set by Colin · 4 seated · open until ${closes}`);
  });

  it("T2: the high seat carries ▲ Above the table in words, its reason, and the headline in its ink", () => {
    draw(TABLES.T2);
    const colin = seatOf("Colin");
    expect(colin.dataset.flag).toBe("high");
    expect(within(colin).getByTestId("flag-tag")).toHaveTextContent("Above the table");
    expect(within(colin).getByTestId("seat-why")).toHaveTextContent(
      "What puts it here: it can find a two-card combo, Thassa’s Oracle + Demonic Consultation, with 5 tutors to reach it.",
    );
    // Each count names itself in text a screen reader reads, not in an aria-label on a generic span.
    const combos = within(colin).getByText("Two-card infinites:").closest("[data-finding]") as HTMLElement;
    expect(combos).toHaveTextContent("Two-card infinites: 1");
    expect(combos).toHaveAttribute("data-driving");
    expect(combos).not.toHaveAttribute("aria-label");
    expect(headline()).toHaveTextContent("Colin’s Zimone Combo reads above the table.");
    expect(headline().querySelector("[data-ink='high']")).toHaveTextContent("above the table");
    expect(within(screen.getByTestId("read-card")).getByText(/sits at/)).toHaveTextContent(
      "The table sits at Upgraded; Zimone Combo reads Optimized. Worth a word before you shuffle.",
    );
  });

  it("T3: the low seat carries ▼ Below the table and says counts can miss cards", () => {
    draw(TABLES.T3);
    const peter = seatOf("Peter");
    expect(within(peter).getByTestId("flag-tag")).toHaveTextContent("Below the table");
    expect(within(peter).getByTestId("seat-why")).toHaveTextContent("Counts can miss cards");
    expect(headline()).toHaveTextContent("Peter’s Giada Angels reads below the table.");
  });

  it("T4: two outliers, each in its own words", () => {
    draw(TABLES.T4);
    expect(headline()).toHaveTextContent(copy.read.two);
    expect(screen.getAllByTestId("flag-tag").map((t) => t.textContent)).toEqual(["Above the table", "Below the table"]);
  });

  it("T5: Split on both seats in words, no band on the rail", () => {
    draw(TABLES.T5);
    expect(screen.getAllByTestId("flag-tag").map((t) => t.textContent)).toEqual(["Split", "Split"]);
    expect(screen.queryByTestId("read-band")).toBeNull();
    expect(headline()).toHaveTextContent(copy.read.split);
    expect(meta()).toHaveTextContent(/· set by you · 2 seated/);
  });

  it("T6: the declared range and the undeclared one each say what they are measured from", () => {
    draw(TABLES.T6);
    expect(within(seatOf("Colin")).getByTestId("seat-range-line")).toHaveTextContent("declared Optimized · reads Optimized or cEDH");
    expect(within(seatOf("Peter")).getByTestId("seat-range-line")).toHaveTextContent("not declared · measured from Core");
    expect(within(seatOf("Colin")).getByTestId("seat-why")).toHaveTextContent("5 game changers, where Upgraded allows 3.");
    expect(screen.getAllByTestId("read-span")).toHaveLength(1);
  });

  it("T7: a drifted declaration keeps the range chip and its line", () => {
    draw(TABLES.T7);
    const colin = seatOf("Colin");
    expect(within(colin).getByTestId("bracket-chip")).toHaveAttribute("data-bracket", "4-5");
    expect(within(colin).getByTestId("seat-range-line")).toHaveTextContent("declared Exhibition, outside this reading · measured from Optimized");
  });

  it("T8: short of 100, over 100 and stale", () => {
    draw(TABLES.T8);
    expect(within(seatOf("Colin")).getByTestId("seat-stale")).toHaveTextContent("from before its last change");
    const peter = seatOf("Peter");
    expect(peter.dataset.state).toBe("illegal");
    expect(within(peter).getByTestId("seat-wait")).toHaveTextContent("87 of 100 cards.");
    const max = seatOf("Max");
    expect(within(max).getByTestId("seat-wait")).toHaveTextContent("101 cards, over 100.");
    // The over-100 deck's old reading is not drawn.
    expect(within(max).queryByTestId("bracket-chip")).toBeNull();
    expect(within(max).queryByTestId("seat-facts")).toBeNull();
    expect(headline()).toHaveTextContent("2 seats aren’t in the read yet.");
  });

  it("T9: a legal deck with no reading draws Reading this deck", () => {
    draw(TABLES.T9);
    const peter = seatOf("Peter");
    expect(peter.dataset.state).toBe("unread");
    expect(within(peter).getByTestId("seat-wait")).toHaveTextContent("Reading this deck.");
    expect(headline()).toHaveTextContent("Reading Peter’s deck…");
  });

  it("T10: nothing to compare, no rail, and a waiting seat in initials", () => {
    draw(TABLES.T10);
    expect(headline()).toHaveTextContent("Nothing to compare yet.");
    expect(screen.queryByTestId("read-rail")).toBeNull();
    const max = seatOf("Max");
    expect(max.dataset.state).toBe("waiting");
    expect(within(max).getByTestId("seat-initials")).toHaveTextContent("MA");
    expect(within(max).getByTestId("seat-wait")).toHaveTextContent("Max picks their own deck on their phone.");
  });

  it("tags seats as the pod card does: YOU, owner, not a friend", () => {
    draw(TABLES.T1);
    expect(within(seatOf("You")).getByText("YOU")).toBeInTheDocument();
    expect(within(seatOf("Colin")).getByText("owner")).toBeInTheDocument();
    expect(within(seatOf("Max")).getByText("not a friend")).toBeInTheDocument();
    expect(within(seatOf("Peter")).queryByText("not a friend")).toBeNull();
  });

  it("draws the honesty line and the shipped provenance opener on every read", () => {
    for (const view of Object.values(TABLES)) {
      const { unmount } = draw(view);
      expect(screen.getByText(copy.read.honest)).toBeInTheDocument();
      expect(screen.getByTestId("provenance-opener")).toHaveTextContent("How we make these decisions");
      expect(screen.getByTestId("counts-key")).toBeInTheDocument();
      unmount();
    }
  });

  it("puts no link on any seat that is not the viewer's, in any state", () => {
    for (const view of Object.values(TABLES)) {
      const { unmount } = draw(view);
      for (const seat of screen.getAllByTestId("table-seat")) {
        if (seat.dataset.you !== undefined) continue;
        expect(seat.querySelectorAll("a, [href]")).toHaveLength(0);
        expect(within(seat).queryAllByRole("link")).toHaveLength(0);
        expect(within(seat).queryAllByRole("button")).toHaveLength(0);
      }
      unmount();
    }
  });

  it("holds no deck id but the viewer's own, and no public id", () => {
    for (const view of Object.values(TABLES)) {
      const { container, unmount } = draw(view);
      const html = container.innerHTML;
      expect(html.match(/deck-[a-z-]+/g) ?? []).toEqual([VIEWER_DECK_ID]);
      expect(html).not.toContain("pub-");
      unmount();
    }
  });

  it("links Log this game to the viewer's seated deck's Games tab", () => {
    draw(TABLES.T1);
    expect(screen.getByRole("link", { name: "Log this game" })).toHaveAttribute(
      "href",
      `/decks/${VIEWER_DECK_ID}?tab=games&table=table-1`,
    );
  });

  it("draws no Log this game with games off (L3)", () => {
    draw(TABLES.T1, false);
    expect(screen.queryByRole("link", { name: "Log this game" })).toBeNull();
    expect(screen.queryByText("Log this game")).toBeNull();
  });

  it("keeps an unreadable reading out of the read without a spinner", () => {
    draw(TABLES.needsAnalysis);
    const peter = seatOf("Peter");
    expect(peter.dataset.state).toBe("needsAnalysis");
    expect(within(peter).getByTestId("seat-wait")).toHaveTextContent(
      "Needs a fresh analysis. Peter can analyze it again from the deck page. Until then this seat is left out of the read.",
    );
    expect(within(peter).queryByTestId("bracket-chip")).toBeNull();
    expect(peter.querySelector(".animate-spin")).toBeNull();
  });
});

describe("TableClosed", () => {
  it("says the table closed, why, and that logged games stay, with Back to Friends", () => {
    render(<TableClosed podName="Thursday night" setBy="Colin" faces={[{ name: "Hugh", artCropUri: null }, { name: "Colin", artCropUri: "https://cards.example/a.jpg" }]} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This table has closed");
    expect(screen.getByText(copy.expired.body("Thursday night", "Colin"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Friends" })).toHaveAttribute("href", "/friends");
  });

  it("opens the provenance sheet from the read without a card-detail ancestor", () => {
    draw(TABLES.T1);
    fireEvent.click(within(screen.getByTestId("read-card")).getByRole("button", { name: /How we make these decisions/ }));
    expect(screen.getByRole("dialog", { name: /How we make these decisions/ })).toBeInTheDocument();
  });

  it("claims no shared bracket when the read seats read differently", () => {
    draw(TABLES.mixed);
    expect(headline()).toHaveTextContent(copy.read.balancedMixed);
  });

  it("words an extra-turn reason at Core or Upgraded as combos that loop turns, and at Exhibition as cards", () => {
    const seat = (below: 1 | 2 | 3, have: number) =>
      ({ drivers: { kind: "ruledOut", below, reasons: [{ rule: "extraTurns", have, limit: 0 }] }, chip: null, rangeLine: null, seat: { you: false, displayName: "Colin" } }) as never;
    expect(driversSentence(seat(3, 1))).toBe("1 combo that loops turns, where Upgraded allows 0.");
    expect(driversSentence(seat(2, 2))).toBe("2 combos that loop turns, where Core allows 0.");
    expect(driversSentence(seat(1, 1))).toBe("1 extra-turn card, where Exhibition allows 0.");
  });

  it("truncates a long unbroken display name and keeps its tag whole beside it", () => {
    const long = "Maximilianowiczaleksandrovski1";
    draw({ ...TABLES.T1, seats: TABLES.T1.seats.map((x) => (x.displayName === "Max" ? { ...x, displayName: long } : x)) });
    const seat = seatOf(long);
    expect(within(seat).getByTestId("seat-name")).toHaveClass("min-w-0", "truncate");
    expect(within(seat).getByText("not a friend")).toHaveClass("flex-none");
  });

  it("rides each range span on its own face's row when two ranges' faces share a column", () => {
    draw(TABLES.twoRanges);
    const spans = screen.getAllByTestId("read-span");
    expect(spans.map((el) => el.dataset.row).sort()).toEqual(["0", "1"]);
    expect(new Set(spans.map((el) => el.style.bottom)).size).toBe(2);
  });
});
