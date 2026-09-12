import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilterBar } from "./filter-bar";
import type { SetOption } from "../../lib/collection/set-filter";

const setOption = (code: string): SetOption => ({
  code, label: code, count: 1, disabled: false, releasedAt: "2026-08-01",
});

function bar(
  setOptions: SetOption[],
  filters: Partial<Record<string, unknown>> = {},
  hasCollection = setOptions.length > 0,
) {
  return render(
    <FilterBar
      filters={{ search: "", colors: [], types: [], setCodes: [], availability: [], ...filters } as never}
      sort="name"
      sortDirection="asc"
      view="rows"
      setOptions={setOptions}
      typeOptions={[]}
      availabilityOptions={[]}
      colorOptions={[]}
      chips={[]}
      onClearAll={() => {}}
      resultLine="Showing 0 unique · 0 total"
    availabilityOk
      hasCollection={hasCollection}
      announcement=""
      onAnnounce={() => {}}
      onFiltersChange={() => {}}
      onSortChange={() => {}}
      onViewChange={() => {}}
    />,
  );
}

describe("the By set entry point", () => {
  it("links to the index", () => {
    bar([setOption("EOE")]);
    expect(screen.getByRole("link", { name: "Browse your collection by set" }))
      .toHaveAttribute("href", "/collection/sets");
  });

  it("never carries Set ▾'s current value into the route", () => {
    // Making one control go to two places depending on a filter set ten minutes ago is
    // exactly the state-sharing behind the Commanders/Discover confusion.
    bar([setOption("EOE")], { setCodes: ["EOE"] });
    expect(screen.getByRole("link", { name: "Browse your collection by set" }))
      .toHaveAttribute("href", "/collection/sets");
  });

  it("carries no count — the number of sets you have touched answers nothing", () => {
    bar([setOption("EOE"), setOption("DSK")]);
    expect(screen.getByRole("link", { name: "Browse your collection by set" }).textContent)
      .toBe("By set");
  });

  it("is absent, not disabled, before there is a collection", () => {
    bar([], {}, false);
    expect(screen.queryByRole("link", { name: "Browse your collection by set" })).toBeNull();
  });

  it("survives a filter that leaves no sets — that is not the same as no collection", () => {
    // setOptions is filter-aware, so keying the pill on it removed the entry point after
    // an ordinary type or colour filter excluded everything.
    bar([], {}, true);
    expect(screen.getByRole("link", { name: "Browse your collection by set" }))
      .toBeInTheDocument();
  });
});
