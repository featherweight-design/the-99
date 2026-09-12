import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SetIndexView } from "./set-index-view";
import type { SetIndexRow } from "../../lib/sets/read";

let search = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => { search = ""; });

const set = (over: Partial<SetIndexRow>): SetIndexRow => ({
  code: "eoe", name: "Edge of Eternities", releasedAt: "2026-08-01",
  iconSvgUri: "https://svgs.scryfall.io/sets/eoe.svg", setType: "expansion",
  owned: 62, baseSetSize: 276, extrasOwned: 4, extrasTotal: 123, percent: 22, ...over,
});

const noSearch = () => Promise.resolve([]);

describe("SetIndexView — S1 first run", () => {
  it("points at upload when nothing has been uploaded", () => {
    render(<SetIndexView sets={[]} cardCount={0} onSearch={noSearch} />);
    expect(screen.getByText("Upload your collection and the sets appear")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload a collection" }))
      .toHaveAttribute("href", "/collection/replace");
  });

  it("offers the search the empty state promises", () => {
    // The copy says "or search a set to browse it at 0%". It previously said that with no
    // field on the page.
    render(<SetIndexView sets={[]} cardCount={0} onSearch={noSearch} />);
    expect(screen.getByText(/search a set to browse it at 0%/)).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });
});

describe("SetIndexView — S2 populated", () => {
  it("renders a row per held set with its ratio and percent", () => {
    render(<SetIndexView sets={[set({})]} cardCount={1200} onSearch={noSearch} />);
    expect(screen.getByText("62 / 276 · 22%")).toBeInTheDocument();
  });

  it("links each row to that set's grid", () => {
    render(<SetIndexView sets={[set({})]} cardCount={1200} onSearch={noSearch} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/collection/sets/eoe");
  });

  it("names the ratio for a screen reader rather than leaving it as two numbers", () => {
    render(<SetIndexView sets={[set({})]} cardCount={1200} onSearch={noSearch} />);
    expect(screen.getByRole("link", {
      name: "Edge of Eternities: you have 62 of 276 in the base run",
    })).toBeInTheDocument();
  });

  it("says you have none rather than reading 0 of 276 aloud", () => {
    render(<SetIndexView sets={[set({ owned: 0, percent: 0 })]} cardCount={1} onSearch={noSearch} />);
    expect(screen.getByRole("link", {
      name: "Edge of Eternities: you have none of 276 in the base run",
    })).toBeInTheDocument();
  });

  it("states the collection total at rest", () => {
    render(<SetIndexView sets={[set({})]} cardCount={1200} onSearch={noSearch} />);
    expect(screen.getByText("1 set · 1,200 cards")).toBeInTheDocument();
  });
});

describe("SetIndexView — S5 not indexed", () => {
  it("tags a set with no denominator instead of printing a percentage", () => {
    render(
      <SetIndexView
        sets={[set({ baseSetSize: null, percent: null, owned: 0 })]}
        cardCount={4}
        onSearch={noSearch}
      />,
    );
    expect(screen.getByText("not indexed yet")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText(/0 \/ 0/)).toBeNull();
  });
});

describe("SetIndexView — search rows", () => {
  it("does not call an indexed set 'not indexed' just because search skipped its count", async () => {
    // searchSets deliberately returns no percentage — running placement over every match
    // would cost the whole catalogue — and that is a different fact from a catalog that
    // has not been indexed.
    const onSearch = vi.fn().mockResolvedValue([
      { ...set({ code: "bro", name: "The Brothers' War" }), percent: null, uncounted: true },
    ]);
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={onSearch} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "brothers" } });
    await waitFor(() => expect(screen.getByText("The Brothers' War")).toBeInTheDocument());
    expect(screen.queryByText("not indexed yet")).toBeNull();
  });

  it("names the set in an unindexed row so two of them are not announced alike", () => {
    render(
      <SetIndexView
        sets={[set({ baseSetSize: null, percent: null, owned: 0 })]}
        cardCount={4}
        onSearch={noSearch}
      />,
    );
    expect(screen.getByRole("link", { name: /^Edge of Eternities:/ })).toBeInTheDocument();
  });

  it("ignores a stale response that lands after a newer query", async () => {
    let resolveFirst: (rows: SetIndexRow[]) => void = () => {};
    const onSearch = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce([set({ code: "dsk", name: "Duskmourn" })]);
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={onSearch} />);
    const field = screen.getByRole("searchbox");
    // The first query has to be allowed past the debounce before the second is typed,
    // or it never starts and there is no stale response to ignore.
    fireEvent.change(field, { target: { value: "a" } });
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith("a"));
    fireEvent.change(field, { target: { value: "dusk" } });
    await waitFor(() => expect(screen.getByText("Duskmourn")).toBeInTheDocument());
    resolveFirst([set({ code: "bro", name: "The Brothers' War" })]);
    await waitFor(() => expect(screen.getByText("Duskmourn")).toBeInTheDocument());
    expect(screen.queryByText("The Brothers' War")).toBeNull();
  });
});

describe("SetIndexView — S3 and S4 search", () => {
  it("reaches sets you hold nothing from", async () => {
    const onSearch = vi.fn().mockResolvedValue([
      set({ code: "bro", name: "The Brothers' War", owned: 0, baseSetSize: 287, percent: 0 }),
    ]);
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={onSearch} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "brothers" } });
    await waitFor(() => expect(screen.getByText("The Brothers' War")).toBeInTheDocument());
  });

  it("says how many matches are new to you", async () => {
    const onSearch = vi.fn().mockResolvedValue([
      set({ code: "bro", name: "The Brothers' War" }),
      set({ code: "eoe" }),
    ]);
    render(<SetIndexView sets={[set({ code: "eoe" })]} cardCount={1} onSearch={onSearch} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "war" } });
    await waitFor(() => expect(
      screen.getByText("2 collectible sets match · 1 of them is new to you"),
    ).toBeInTheDocument());
  });

  it("reads an empty result as a spelling rather than a gap in your collection", async () => {
    const onSearch = vi.fn().mockResolvedValue([]);
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={onSearch} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzzz" } });
    await waitFor(() => expect(screen.getByText("No collectible set matches zzzz")).toBeInTheDocument());
    expect(screen.getByText(/a spelling rather than a gap/)).toBeInTheDocument();
  });

  it("returns to your own sets when the search is cleared", async () => {
    const onSearch = vi.fn().mockResolvedValue([]);
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={onSearch} />);
    const field = screen.getByRole("searchbox");
    fireEvent.change(field, { target: { value: "zzzz" } });
    await waitFor(() => expect(screen.getByText("No collectible set matches zzzz")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Clear the search" }));
    await waitFor(() => expect(screen.getByText("Edge of Eternities")).toBeInTheDocument());
  });
});

describe("SetIndexView — completion is exact", () => {
  it("does not give the success treatment to 275 of 276", () => {
    render(
      <SetIndexView
        sets={[set({ owned: 275, baseSetSize: 276, percent: 100 })]}
        cardCount={275}
        onSearch={noSearch}
      />,
    );
    expect(screen.getByText("275 / 276 · 100%")).toHaveStyle({ color: "var(--fg-muted)" });
  });

  it("gives it to a set that is genuinely complete", () => {
    render(
      <SetIndexView
        sets={[set({ owned: 276, baseSetSize: 276, percent: 100 })]}
        cardCount={276}
        onSearch={noSearch}
      />,
    );
    expect(screen.getByText("276 / 276 · 100%")).toHaveStyle({ color: "var(--success)" });
  });
});

describe("SetIndexView — a search in flight", () => {
  it("does not say 'no set called that' before the answer arrives", async () => {
    let resolve: (rows: SetIndexRow[]) => void = () => {};
    const onSearch = vi.fn().mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={onSearch} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dusk" } });
    // Pending is set the moment the reader types, before the debounce lets the query go:
    // the no-match copy must not stand in for an answer nobody has given yet.
    expect(screen.queryByText(/No set called/)).toBeNull();
    expect(screen.getByText("Looking…")).toBeInTheDocument();
    await waitFor(() => expect(onSearch).toHaveBeenCalled());
    resolve([set({ code: "dsk", name: "Duskmourn" })]);
    await waitFor(() => expect(screen.getByText("Duskmourn")).toBeInTheDocument());
  });

  it("does not describe a new search with the previous one's failure", async () => {
    const onSearch = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce(() => new Promise(() => {}));
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={onSearch} />);
    const field = screen.getByRole("searchbox");
    fireEvent.change(field, { target: { value: "a" } });
    await waitFor(() => expect(screen.getByText(/did not get through/)).toBeInTheDocument());
    fireEvent.change(field, { target: { value: "ab" } });
    expect(screen.queryByText(/did not get through/)).toBeNull();
  });
});

describe("SetIndexView — the search is in the URL", () => {
  it("runs a query the link arrived with", async () => {
    search = "q=blood";
    const onSearch = vi.fn().mockResolvedValue([set({ code: "bro", name: "The Brothers' War" })]);
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={onSearch} />);
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith("blood"));
    expect(screen.getByRole("searchbox")).toHaveValue("blood");
  });

  it("writes the query to the URL so it can be shared", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={() => Promise.resolve([])} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dusk" } });
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets?q=dusk");
    replaceState.mockRestore();
  });
});

describe("SetIndexView — the search is debounced", () => {
  it("does not start a query per keystroke", async () => {
    // Every character previously started its own uncancellable server action; `latest`
    // discarded the answers, but the queries had already run.
    const onSearch = vi.fn().mockResolvedValue([]);
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={onSearch} />);
    const field = screen.getByRole("searchbox");
    fireEvent.change(field, { target: { value: "d" } });
    fireEvent.change(field, { target: { value: "du" } });
    fireEvent.change(field, { target: { value: "dusk" } });
    await waitFor(() => expect(onSearch).toHaveBeenCalled());
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("dusk");
  });
});

describe("SetIndexView — a query already searched this visit", () => {
  it("is served locally rather than read again", async () => {
    const onSearch = vi.fn().mockResolvedValue([set({ code: "eoe" })]);
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={onSearch} />);
    const field = screen.getByRole("searchbox");
    fireEvent.change(field, { target: { value: "eoe" } });
    await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
    fireEvent.change(field, { target: { value: "" } });
    fireEvent.change(field, { target: { value: "eoe" } });
    await waitFor(() => expect(screen.getByText("Edge of Eternities")).toBeInTheDocument());
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});

describe("SetIndexView — recovering from a failed search", () => {
  it("offers a retry that reissues the query, not one that clears it", async () => {
    const onSearch = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([set({ code: "dsk", name: "Duskmourn" })]);
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={onSearch} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dusk" } });
    await waitFor(() => expect(screen.getByText(/did not get through/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("Duskmourn")).toBeInTheDocument());
    expect(onSearch).toHaveBeenLastCalledWith("dusk");
  });

  it("does not leave a whitespace query in the URL", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<SetIndexView sets={[set({})]} cardCount={1} onSearch={() => Promise.resolve([])} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "   " } });
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets");
    replaceState.mockRestore();
  });
});
