// The Hidden tab's list (hide-commander README §3, the Hidden board's states 4, 5, 6 and 12).
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HiddenRow } from "../../lib/commanders/hidden-row";

// The actions are the boundary: the real ones reach the database through `lib/commanders/hidden`.
const hideCommanderAction = vi.fn<(oracleId: string) => Promise<boolean>>();
const unhideCommanderAction = vi.fn<(oracleId: string) => Promise<boolean>>();
vi.mock("../../app/commanders/actions", () => ({
  hideCommanderAction: (id: string) => hideCommanderAction(id),
  unhideCommanderAction: (id: string) => unhideCommanderAction(id),
}));

const { HiddenList, mergeServed } = await import("./hidden-list");

const row = (over: Partial<HiddenRow> & Pick<HiddenRow, "oracleId" | "name">): HiddenRow => ({
  colorIdentity: ["G"],
  imageUri: null,
  hiddenAt: "2026-10-31T15:00:00.000Z",
  lane: "foryou",
  built: false,
  href: `/commanders/${over.oracleId}`,
  ...over,
});

const GHALTA = row({ oracleId: "g", name: "Ghalta, Primal Hunger", href: "/commanders/ghalta-primal-hunger" });
const ASHLING = row({ oracleId: "a", name: "Ashling the Pilgrim", hiddenAt: "2026-10-29T12:00:00.000Z", lane: "discover" });
const ZADA = row({ oracleId: "z", name: "Zada, Hedron Grinder", hiddenAt: "2026-10-29T09:00:00.000Z", lane: null, built: true, href: "/decks/deck-1" });

const unhideButton = (name: string) => screen.getByRole("button", { name: `Unhide ${name}` });
const undoButton = (name: string) => screen.queryByRole("button", { name: `Undo unhiding ${name}` });

let stale = 0;
const onStale = () => {
  stale += 1;
};

beforeEach(() => {
  stale = 0;
  window.addEventListener("the99:commander-counts-stale", onStale);
  hideCommanderAction.mockReset().mockResolvedValue(true);
  unhideCommanderAction.mockReset().mockResolvedValue(true);
});
afterEach(() => {
  window.removeEventListener("the99:commander-counts-stale", onStale);
  vi.useRealTimers();
  cleanup();
});

const order = () => screen.getAllByRole("listitem").map((li) => li.getAttribute("data-hidden-row"));

describe("the Hidden list", () => {
  it("draws the rows in the order served (newest first), each dated without its year", () => {
    render(<HiddenList rows={[GHALTA, ASHLING, ZADA]} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-hidden-row"))).toEqual(["g", "a", "z"]);
    expect(within(items[0]).getByText("Hidden Oct 31")).toBeInTheDocument();
    expect(within(items[1]).getByText("Hidden Oct 29")).toBeInTheDocument();
    expect(screen.queryByText(/2026/)).toBeNull();
    expect(screen.getByTestId("hidden-count")).toHaveTextContent("3 hidden · newest first");
  });

  it("opens the commander's page from the row, and a built commander's deck instead", () => {
    render(<HiddenList rows={[GHALTA, ZADA]} />);
    expect(screen.getByRole("link", { name: "Ghalta, Primal Hunger" })).toHaveAttribute(
      "href",
      "/commanders/ghalta-primal-hunger",
    );
    // READINESS Y3: a built commander's page 404s, so its row opens the deck and says so.
    expect(screen.getByRole("link", { name: "Open your Zada, Hedron Grinder deck" })).toHaveAttribute("href", "/decks/deck-1");
  });

  it("draws a row neither page resolves for without a link", () => {
    render(<HiddenList rows={[row({ oracleId: "n", name: "Nobody", href: null, lane: null })]} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Nobody")).toBeInTheDocument();
  });

  it("draws the shared zero state, with the glyph's words, when nothing is hidden", () => {
    render(<HiddenList rows={[]} />);
    expect(screen.getByRole("heading", { name: "Nothing hidden" })).toBeInTheDocument();
    expect(document.body.textContent).toContain(
      "Press Hide on a commander in For you or Discover, or on its page, and it waits here until you bring it back.",
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByTestId("hidden-count")).toBeNull();
  });

  describe("Unhide", () => {
    it("turns the row into the Undo row, saying where it went, and refreshes the counts", async () => {
      render(<HiddenList rows={[GHALTA, ASHLING, ZADA]} />);
      await act(async () => {
        fireEvent.click(unhideButton("Ghalta, Primal Hunger"));
      });
      expect(unhideCommanderAction).toHaveBeenCalledWith("g");
      expect(screen.getByText("Ghalta, Primal Hunger back in For you")).toBeInTheDocument();
      expect(undoButton("Ghalta, Primal Hunger")).toHaveFocus();
      expect(screen.getByTestId("hidden-count")).toHaveTextContent("2 hidden · newest first");
      expect(stale).toBe(1);
    });

    it("names the lane by the commander's: Discover for one not owned, a neutral line for neither list", async () => {
      render(<HiddenList rows={[GHALTA, ASHLING, ZADA]} />);
      await act(async () => {
        fireEvent.click(unhideButton("Ashling the Pilgrim"));
      });
      expect(screen.getByText("Ashling the Pilgrim back in Discover")).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(unhideButton("Zada, Hedron Grinder"));
      });
      // READINESS Y3: built, so in neither list.
      expect(screen.getByText("Zada, Hedron Grinder unhidden")).toBeInTheDocument();
    });

    it("keeps the row when the unhide is refused, with the shared toast and Try again", async () => {
      unhideCommanderAction.mockResolvedValue(false);
      render(<HiddenList rows={[GHALTA]} />);
      await act(async () => {
        fireEvent.click(unhideButton("Ghalta, Primal Hunger"));
      });
      expect(undoButton("Ghalta, Primal Hunger")).toBeNull();
      expect(unhideButton("Ghalta, Primal Hunger")).toHaveFocus();
      const toast = screen.getByRole("alert");
      expect(toast).toHaveTextContent("We couldn’t unhide Ghalta, Primal Hunger.");
      expect(stale).toBe(0);

      unhideCommanderAction.mockResolvedValue(true);
      await act(async () => {
        fireEvent.click(within(toast).getByRole("button", { name: "Try again" }));
      });
      expect(unhideCommanderAction).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Ghalta, Primal Hunger back in For you")).toBeInTheDocument();
    });

    // The toast belongs to the row it names: pressing Unhide on another row leaves it, and its Try again, standing.
    it("keeps another row's refusal toast when a different row is unhidden", async () => {
      unhideCommanderAction.mockResolvedValueOnce(false);
      render(<HiddenList rows={[GHALTA, ASHLING]} />);
      await act(async () => {
        fireEvent.click(unhideButton("Ghalta, Primal Hunger"));
      });
      expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t unhide Ghalta, Primal Hunger.");
      await act(async () => {
        fireEvent.click(unhideButton("Ashling the Pilgrim"));
      });
      expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t unhide Ghalta, Primal Hunger.");
    });

    // The counts moved when the write landed, whichever press is now the newest.
    it("refreshes the counts for a write that landed after a later press superseded it", async () => {
      let land: (ok: boolean) => void = () => {};
      unhideCommanderAction.mockImplementationOnce(() => new Promise<boolean>((r) => (land = r)));
      hideCommanderAction.mockImplementationOnce(() => new Promise<boolean>(() => {}));
      render(<HiddenList rows={[GHALTA]} />);
      await act(async () => {
        fireEvent.click(unhideButton("Ghalta, Primal Hunger"));
      });
      await act(async () => {
        fireEvent.click(undoButton("Ghalta, Primal Hunger")!);
      });
      await act(async () => {
        land(true);
      });
      expect(stale).toBe(1);
    });

    it("reads a thrown unhide as a refusal", async () => {
      unhideCommanderAction.mockRejectedValue(new Error("down"));
      render(<HiddenList rows={[GHALTA]} />);
      await act(async () => {
        fireEvent.click(unhideButton("Ghalta, Primal Hunger"));
      });
      expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t unhide Ghalta, Primal Hunger.");
    });
  });

  describe("Undo of an unhide", () => {
    it("hides it again: the row returns, and the counts refresh", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-31T15:00:00Z"));
      render(<HiddenList rows={[GHALTA]} />);
      await act(async () => {
        fireEvent.click(unhideButton("Ghalta, Primal Hunger"));
      });
      await act(async () => {
        fireEvent.click(undoButton("Ghalta, Primal Hunger")!);
      });
      expect(hideCommanderAction).toHaveBeenCalledWith("g");
      expect(unhideButton("Ghalta, Primal Hunger")).toHaveFocus();
      expect(screen.getByText("Hidden Oct 31")).toBeInTheDocument();
      expect(stale).toBe(2);
    });

    // The hide writes a new `hidden_at`: the row is the newest now, at the top and dated today, as the server has it.
    it("moves the re-hidden row to the top, dated today", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
      render(<HiddenList rows={[GHALTA, ASHLING, ZADA]} />);
      await act(async () => {
        fireEvent.click(unhideButton("Ashling the Pilgrim"));
      });
      await act(async () => {
        fireEvent.click(undoButton("Ashling the Pilgrim")!);
      });
      expect(order()).toEqual(["a", "g", "z"]);
      expect(within(screen.getAllByRole("listitem")[0]).getByText("Hidden Nov 1")).toBeInTheDocument();
      expect(unhideButton("Ashling the Pilgrim")).toHaveFocus();
    });

    it("says under the row where to hide it from when the hide is refused", async () => {
      hideCommanderAction.mockResolvedValue(false);
      render(<HiddenList rows={[GHALTA]} />);
      await act(async () => {
        fireEvent.click(unhideButton("Ghalta, Primal Hunger"));
      });
      await act(async () => {
        fireEvent.click(undoButton("Ghalta, Primal Hunger")!);
      });
      expect(screen.getByText("Ghalta, Primal Hunger back in For you")).toBeInTheDocument();
      expect(undoButton("Ghalta, Primal Hunger")).toBeNull();
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t hide that again. Hide it from For you.");
      expect(stale).toBe(1);
    });
  });

  // The unhide's action drops the list cache, and the route's next payload no longer carries the row; the Undo
  // row stands regardless, until the reader leaves the tab.
  it("keeps its Undo rows when the route hands it a new list", async () => {
    const { rerender } = render(<HiddenList rows={[GHALTA, ASHLING]} />);
    await act(async () => {
      fireEvent.click(unhideButton("Ghalta, Primal Hunger"));
    });
    rerender(<HiddenList rows={[ASHLING]} />);
    expect(undoButton("Ghalta, Primal Hunger")).toBeInTheDocument();
    expect(order()).toEqual(["g", "a"]);
  });

  // A soft navigation back, or a back/forward restore, hands a newer list: its rows are taken, not the first one's.
  it("takes a new list's rows from the route, where it has pressed nothing", () => {
    const { rerender } = render(<HiddenList rows={[ASHLING]} />);
    rerender(<HiddenList rows={[GHALTA, ASHLING, ZADA]} />);
    expect(order()).toEqual(["g", "a", "z"]);
    expect(screen.getByTestId("hidden-count")).toHaveTextContent("3 hidden · newest first");
    rerender(<HiddenList rows={[ZADA]} />);
    expect(order()).toEqual(["z"]);
  });
});

describe("mergeServed", () => {
  it("keeps a pressed row the new list lacks, in the server's order, and nothing unpressed", () => {
    const pressed = new Map([["g", "back" as const]]);
    expect(mergeServed([ASHLING, ZADA], [GHALTA, ASHLING, ZADA], pressed).map((r) => r.oracleId)).toEqual(["g", "a", "z"]);
    expect(mergeServed([ZADA], [GHALTA, ASHLING, ZADA], pressed).map((r) => r.oracleId)).toEqual(["g", "z"]);
  });

  it("takes the new list's copy of a row it carries", () => {
    const moved = { ...ASHLING, hiddenAt: "2026-11-01T00:00:00.000Z" };
    const merged = mergeServed([moved, GHALTA], [GHALTA, ASHLING], new Map([["a", "hidden" as const]]));
    expect(merged).toEqual([moved, GHALTA]);
  });
});
