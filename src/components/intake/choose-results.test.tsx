import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const trialFillRows = vi.fn();
const moreRows = vi.fn();
vi.mock("../../app/decks/new/choose/results-actions", () => ({ trialFillRows, moreRows }));

const { CardDetailProvider } = await import("../cards/card-detail-provider");
const { ChooseResults } = await import("./choose-results");
const { ReadScope } = await import("./read-panel");
import type { ReadPhase } from "./read-panel";
const { emptyParams } = await import("../../lib/intake/params");
import type { ResultRow, ResultsPage } from "../../lib/intake/rows";

const row = (i: number): ResultRow => ({
  oracleId: `0000aaaa-0000-4000-8000-${String(i).padStart(12, "0")}`, name: `Commander ${i}`, colorIdentity: ["G"],
  imageUri: null, artCropUri: null, mark: { kind: "free" }, themeFits: [{ slug: "dinosaurs", share: 0.5 }],
  cardFit: null, ownedSupport: 0, supportTotal: 0,
});
const page = (n: number, over: Partial<ResultsPage> = {}): ResultsPage => ({
  order: "fit", tooNarrow: null, card: null, rows: Array.from({ length: n }, (_, i) => row(i + 1)), hasMore: false, total: n, ...over,
});
const narrow = { without: [{ answers: [{ kind: "theme" as const, slug: "dinosaurs" }], count: 30 }], widen: null, anyOf: null, cardOverBracket: null };

function draw(p: ResultsPage, read: ReadPhase | null = null, themes = ["dinosaurs"], deckNames: Record<string, string> = {}) {
  return render(
    <CardDetailProvider fetchCard={vi.fn()}>
      <ReadScope initial={read}>
        <ChooseResults
          page={p}
          params={{ ...emptyParams(), results: true, themes }}
          themeLabels={{ dinosaurs: "Dinosaurs" }}
          cardName={null}
          queryString="t=dinosaurs&v=results"
          changeHref="/decks/new/choose?t=dinosaurs"
          deckNames={deckNames}
        />
      </ReadScope>
    </CardDetailProvider>,
  );
}

const DECK = "0000bbbb-0000-4000-8000-000000000001";
/** The first `k` rows carry the read's reasons, as a done read's page does. */
const picked = (n: number, k: number, order: ResultsPage["order"] = "owned") => page(n, {
  order,
  rows: Array.from({ length: n }, (_, i) => (i < k
    ? { ...row(i + 1), reason: i === 0 ? [{ text: "Unlike " }, { deck: DECK }, { text: ", it wins with lands." }] : [{ text: "It builds what you wrote." }] }
    : row(i + 1))),
});

describe("the results under a read (the read addendum R1)", () => {
  it("orders a done read's head by what was written, with its reasons and the rest under a divider", () => {
    draw(picked(14, 10), "done", [], { [DECK]: "Omnath" });
    expect(screen.getByTestId("order-line").textContent).toBe("Ordered by what you wrote");
    expect(document.body.textContent).toContain("The first ten are the read’s picks");
    // Best fits carry their reasons too.
    for (const b of screen.getAllByTestId("best-fit")) expect(b.querySelector("[data-testid='row-reason']")).toBeTruthy();
    expect(screen.getAllByTestId("row-reason")).toHaveLength(10);
    // The deck part is the commander's short name, in 600 --fg.
    const deck = screen.getAllByTestId("reason-deck")[0];
    expect(deck.textContent).toBe("Omnath");
    expect(deck.className).toContain("font-semibold");
    expect(screen.getAllByTestId("row-reason")[0].textContent).toBe("Unlike Omnath, it wins with lands.");
    // One divider, after the tenth pick and before the first free row.
    const divider = screen.getByTestId("rest-divider");
    expect(divider.textContent).toBe("The rest of your resultsordered by cards you already have");
    const items = [...divider.parentElement!.children];
    const at = items.indexOf(divider);
    expect(items[at - 1].querySelector("[data-testid='row-reason']")).toBeTruthy();
    expect(items[at + 1].querySelector("[data-testid='row-reason']")).toBeNull();
  });

  it("draws the divider's tail only when the rest are in the owned order", () => {
    draw(picked(14, 10, "fit"), "done");
    expect(screen.getByTestId("rest-divider").textContent).toBe("The rest of your results");
  });

  it("draws no divider with no picks, or when every row is a pick", () => {
    draw(page(14), "done");
    expect(screen.queryByTestId("rest-divider")).toBeNull();
    cleanup();
    draw(picked(10, 10), "done");
    expect(screen.queryByTestId("rest-divider")).toBeNull();
  });

  it("keeps the free order's title while reading, says it is not in it yet, and dims the rows and best fits", () => {
    draw(page(14), "reading");
    expect(screen.getByTestId("order-line").textContent).toBe("Ordered by Dinosaurs");
    expect(document.body.textContent).toContain("What you wrote isn’t in this order yet.");
    const dimmed = document.querySelectorAll("ol[data-dim]");
    expect(dimmed).toHaveLength(2);
    for (const ol of dimmed) expect(ol.className).toContain("opacity-[0.45]");
  });

  it("says an unread, stopped or failed read is not in the owned order, and keeps a fit order's own sub", () => {
    for (const phase of ["unread", "stopped", "failed", "nothing"] as const) {
      draw(page(4, { order: "owned" }), phase, []);
      expect(screen.getByTestId("order-line").textContent).toBe("Ordered by cards you already have");
      expect(document.body.textContent).toContain("What you wrote isn’t in this order. These are commanders");
      expect(document.querySelector("ol[data-dim]")).toBeNull();
      cleanup();
    }
    draw(page(4), "stopped");
    expect(document.body.textContent).toContain("Each figure is the share of that commander’s decks on EDHREC tagged Dinosaurs.");
    expect(document.body.textContent).not.toContain("What you wrote");
  });

  it("says nothing of a read with no words", () => {
    draw(page(4, { order: "owned" }), null, []);
    expect(document.body.textContent).not.toContain("What you wrote");
  });
});

beforeEach(() => {
  moreRows.mockReset();
  trialFillRows.mockReset().mockReturnValue(new Promise(() => {}));
});

describe("the results", () => {
  it("draws three best fits above the rest from four rows, and prints no total", () => {
    draw(page(4));
    expect(screen.getAllByTestId("best-fit")).toHaveLength(3);
    expect(screen.getAllByTestId("result-row")).toHaveLength(1);
    expect(screen.getByTestId("order-line").textContent).toBe("Ordered by Dinosaurs");
    expect(document.body.textContent).not.toMatch(/\b4 commanders\b/);
  });

  it("draws no best fits under a narrow bar, nor with three rows", () => {
    draw(page(3, { tooNarrow: narrow }));
    expect(screen.queryAllByTestId("best-fit")).toHaveLength(0);
    expect(screen.getByTestId("narrow-few")).toBeTruthy();
    cleanup();
    // Three rows and no narrow bar: the count alone withholds the best fits.
    draw(page(3));
    expect(screen.queryAllByTestId("best-fit")).toHaveLength(0);
    expect(screen.getAllByTestId("result-row")).toHaveLength(3);
  });

  it("replaces the results with the empty state when nothing fits, with no order line", () => {
    draw(page(0, { tooNarrow: narrow }));
    expect(screen.getByTestId("narrow-none")).toBeTruthy();
    expect(screen.queryByTestId("order-line")).toBeNull();
  });

  it("asks for the next twelve from where the list ends, only while more exist", async () => {
    moreRows.mockResolvedValue(page(0, { rows: [row(13)], hasMore: false }));
    draw(page(12, { hasMore: true }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Show 12 more" })));
    expect(moreRows).toHaveBeenCalledWith("t=dinosaurs&v=results", 12);
    expect(screen.getByText("Commander 13")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show 12 more" })).toBeNull();
  });

  it("says the next slice failed to load, not that a count failed, and keeps the button", async () => {
    moreRows.mockRejectedValue(new Error("down"));
    draw(page(12, { hasMore: true }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Show 12 more" })));
    expect(screen.getByText("Couldn’t load more commanders. Try again.")).toBeTruthy();
    expect(screen.queryByText("Couldn’t count what you own.")).toBeNull();
    expect(screen.getByRole("button", { name: "Show 12 more" })).toBeTruthy();
  });

  it("counts a slice's figures in ONE call, and each new slice in one more", async () => {
    moreRows.mockResolvedValue(page(0, { rows: [row(13), row(14)], hasMore: false }));
    draw(page(12, { hasMore: true }));
    expect(trialFillRows).toHaveBeenCalledTimes(1);
    expect(trialFillRows.mock.calls[0][0]).toHaveLength(12);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Show 12 more" })));
    expect(trialFillRows).toHaveBeenCalledTimes(2);
    expect(trialFillRows.mock.calls[1][0]).toEqual([row(13).oracleId, row(14).oracleId]);
  });

  it("marks a row whose fill failed, and counts that row alone again on Retry", async () => {
    const [a, b] = [row(1), row(2)];
    trialFillRows.mockResolvedValueOnce({ [a.oracleId]: null, [b.oracleId]: { body: 99, owned: 9, buyCents: 100, unpricedCard: null } });
    draw(page(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy());
    expect(screen.getAllByRole("button", { name: "Retry" })).toHaveLength(1);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Retry" })));
    expect(trialFillRows).toHaveBeenLastCalledWith([a.oracleId], "t=dinosaurs&v=results");
  });
});
