import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const trialFillRows = vi.fn();
const moreRows = vi.fn();
vi.mock("../../app/decks/new/choose/results-actions", () => ({ trialFillRows, moreRows }));

const { CardDetailProvider } = await import("../cards/card-detail-provider");
const { ChooseResults } = await import("./choose-results");
const { emptyParams } = await import("../../lib/intake/params");
import type { ResultRow, ResultsPage } from "../../lib/intake/rows";

const row = (i: number): ResultRow => ({
  oracleId: `0000aaaa-0000-4000-8000-${String(i).padStart(12, "0")}`, name: `Commander ${i}`, colorIdentity: ["G"],
  imageUri: null, artCropUri: null, mark: { kind: "free" }, themeFits: [{ slug: "dinosaurs", share: 0.5 }],
  cardFit: null, ownedSupport: 0, supportTotal: 0,
});
const page = (n: number, over: Partial<ResultsPage> = {}): ResultsPage => ({
  order: "fit", tooNarrow: null, card: null, rows: Array.from({ length: n }, (_, i) => row(i + 1)), hasMore: false, ...over,
});
const narrow = { without: [{ answers: [{ kind: "theme" as const, slug: "dinosaurs" }], count: 30 }], widen: null, cardOverBracket: null };

function draw(p: ResultsPage) {
  return render(
    <CardDetailProvider fetchCard={vi.fn()}>
      <ChooseResults
        page={p}
        params={{ ...emptyParams(), results: true, themes: ["dinosaurs"] }}
        themeLabels={{ dinosaurs: "Dinosaurs" }}
        cardName={null}
        queryString="t=dinosaurs&v=results"
        changeHref="/decks/new/choose?t=dinosaurs"
      />
    </CardDetailProvider>,
  );
}

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
