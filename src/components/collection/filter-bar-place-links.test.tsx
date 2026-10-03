import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { FilterBar } from "./filter-bar";
import type { SetOption } from "../../lib/collection/set-filter";

const setOption = (code: string): SetOption => ({
  code, label: code, count: 1, disabled: false, releasedAt: "2026-08-01",
});

function bar(setOptions: SetOption[], filters: Partial<Record<string, unknown>> = {}) {
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
      shown={0}
      total={0}
      chips={[]}
      onClearAll={() => {}}
      resultLine="Showing 0 unique · 0 total"
      availabilityOk
      hasCollection
      announcement=""
      onAnnounce={() => {}}
      onFiltersChange={() => {}}
      onSortChange={() => {}}
      onViewChange={() => {}}
    />,
  );
}

// The place links left the rack when the place head's strip arrived (collection surfaces
// Call 4): Sets and Proxies are tabs above the filter frame now, and a second way to the same
// routes inside the frame is the duplication the strip exists to retire.
describe("the rack's trailing slot", () => {
  it("carries no link to another route, with or without a set filter on", () => {
    const { container } = bar([setOption("EOE")], { setCodes: ["EOE"] });
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs.filter((h) => h?.startsWith("/collection"))).toEqual([]);
  });
});
