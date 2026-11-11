import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { CommanderRowItem } from "../../lib/commanders/rankings";
import { CommandersList } from "./commanders-list";

const item = (slug: string, name: string): CommanderRowItem =>
  ({
    slug, name, oracleId: `o-${slug}`, colorIdentity: ["G"], artCropUri: null, prose: "A line.", gapSlot: { kind: "unplayed", labels: ["Counters Matter"] }, score: 50,
    measurableTotal: 100, fitPool: 10, fitRoles: 20, fitSynergy: 20, deckCount: 1000,
  }) as unknown as CommanderRowItem;

const rows = [item("a", "Alpha"), item("b", "Beta")];
const rankBySlug = new Map([["a", 1], ["b", 2]]);

describe("CommandersList", () => {
  it("draws one list item per row with nothing else wired (the demo's shape: no hide slot, no hide props)", () => {
    render(<CommandersList rows={rows} rankBySlug={rankBySlug} avail="all" />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getAllByText("Alpha").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("lets a slot replace a row, and draws a trailing item after the rows", () => {
    render(
      <CommandersList
        rows={rows}
        rankBySlug={rankBySlug}
        avail="all"
        hideSlot={(r) => (r.slug === "a" ? <p>undo line</p> : null)}
        trailing={<button type="button">reveal</button>}
      />,
    );
    expect(screen.getByText("undo line")).toBeTruthy();
    expect(screen.queryAllByText("Alpha")).toHaveLength(0);
    expect(screen.getAllByText("Beta").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "reveal" })).toBeTruthy();
  });

  it("draws no ref and no tabindex when the list is not windowed", () => {
    const itemRefs = { current: [] as (HTMLLIElement | null)[] };
    render(<CommandersList rows={rows} rankBySlug={rankBySlug} avail="all" itemRefs={itemRefs} />);
    expect(itemRefs.current).toHaveLength(0);
    expect(screen.getAllByRole("listitem")[0]).not.toHaveAttribute("tabindex");
  });

  it("hands a windowed list's rows to the ref array and makes them focusable", () => {
    const itemRefs = { current: [] as (HTMLLIElement | null)[] };
    render(<CommandersList rows={rows} rankBySlug={rankBySlug} avail="all" wasWindowed itemRefs={itemRefs} />);
    expect(itemRefs.current).toHaveLength(2);
    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("tabindex", "-1");
  });

  it("names each row's address from the row itself, and a null address draws no link", () => {
    const { unmount } = render(<CommandersList rows={rows} rankBySlug={rankBySlug} avail="all" hrefFor={(r) => `/public/${r.name}-${r.oracleId}`} />);
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/public/Alpha-o-a", "/public/Beta-o-b"]);
    unmount();
    render(<CommandersList rows={rows} rankBySlug={rankBySlug} avail="all" hrefFor={() => null} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("passes the hide press through to the row", () => {
    const onHide = vi.fn();
    render(<CommandersList rows={rows} rankBySlug={rankBySlug} avail="all" hideProps={() => ({ onHide })} />);
    screen.getByRole("button", { name: "Hide Alpha" }).click();
    expect(onHide).toHaveBeenCalledTimes(1);
  });
});
