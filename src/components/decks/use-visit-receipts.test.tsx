import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mirror = vi.hoisted(() => vi.fn());
vi.mock("../../lib/url/mirror", () => ({ mirrorUrl: mirror }));
import { useVisitReceipts, type VisitReceipts } from "./use-visit-receipts";

const NONE: VisitReceipts = { fromImport: false, printings: null, importAdd: null, precon: null, preconAdd: null, update: null };
const UPDATE_A = { in: 3, out: 1, kept: 0 };
const UPDATE_B = { in: 9, out: 2, kept: 1 };

function Probe({ incoming }: { incoming: VisitReceipts }) {
  const r = useVisitReceipts(incoming);
  return (
    <div>
      <span data-testid="shown">{String(r.shown)}</span>
      <span data-testid="update">{r.held.update ? `${r.held.update === "countless" ? "x" : r.held.update.in}` : "none"}</span>
      <button onClick={r.dismiss}>dismiss</button>
    </div>
  );
}
const shown = () => screen.getByTestId("shown").textContent;

beforeEach(() => {
  mirror.mockReset();
  localStorage.clear();
  window.history.replaceState(null, "", "/decks/d1?updated=3-1-0&imported=1&printings=1-2&from=precon&added=e1&keep=me");
});

describe("useVisitReceipts", () => {
  it("takes every receipt parameter off the address, and nothing else", () => {
    render(<Probe incoming={{ ...NONE, update: UPDATE_A }} />);
    expect(mirror).toHaveBeenCalledTimes(1);
    const url = mirror.mock.calls[0][0] as URL;
    for (const p of ["updated", "imported", "printings", "from", "added"]) expect(url.searchParams.has(p)).toBe(false);
    expect(url.searchParams.get("keep")).toBe("me");
  });

  it("does not touch an address with no receipt parameter", () => {
    window.history.replaceState(null, "", "/decks/d1?tab=analysis");
    render(<Probe incoming={NONE} />);
    expect(mirror).not.toHaveBeenCalled();
    expect(shown()).toBe("false");
  });

  it("hides for the visit on ✕ and stores nothing", () => {
    render(<Probe incoming={{ ...NONE, update: UPDATE_A }} />);
    expect(shown()).toBe("true");
    fireEvent.click(screen.getByText("dismiss"));
    expect(shown()).toBe("false");
    expect(localStorage.length).toBe(0);
  });

  it("holds the receipt through a refresh that arrives with the parameters gone", () => {
    const { rerender } = render(<Probe incoming={{ ...NONE, update: UPDATE_A }} />);
    rerender(<Probe incoming={NONE} />);
    expect(shown()).toBe("true");
    expect(screen.getByTestId("update").textContent).toBe("3");
  });

  it("brings a dismissed receipt back when a new arrival carries different figures", () => {
    const { rerender } = render(<Probe incoming={{ ...NONE, update: UPDATE_A }} />);
    fireEvent.click(screen.getByText("dismiss"));
    act(() => rerender(<Probe incoming={{ ...NONE, update: UPDATE_B }} />));
    expect(shown()).toBe("true");
    expect(screen.getByTestId("update").textContent).toBe("9");
  });
});
