// /commanders/hidden hands the list the rows the read returned, in its order, under the shipped page header.
import { describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement } from "react";
import type { HiddenRow } from "../../../../lib/commanders/hidden-row";

const rows: HiddenRow[] = [
  { oracleId: "g", name: "Ghalta", colorIdentity: ["G"], imageUri: null, hiddenAt: "2026-10-31T15:00:00.000Z", lane: "foryou", href: "/commanders/ghalta" },
  { oracleId: "z", name: "Zada", colorIdentity: ["R"], imageUri: null, hiddenAt: "2026-10-29T15:00:00.000Z", lane: null, href: "/decks/d1" },
];
vi.mock("../../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../../lib/switches/request", () => ({ requestSwitchEnv: async () => ({}) as NodeJS.ProcessEnv }));
// The real read reaches the database (`hidden_commanders` and the slug lookup).
const loadHiddenList = vi.hoisted(() => vi.fn(async (_u: string, _e: NodeJS.ProcessEnv) => [] as HiddenRow[]));
vi.mock("../../../../lib/commanders/hidden-list", () => ({ loadHiddenList }));
vi.mock("../../../../components/commanders/hidden-list", () => ({ HiddenList: () => null }));

const { default: HiddenPage } = await import("./page");
const { HiddenList } = await import("../../../../components/commanders/hidden-list");
const { PageHeader } = await import("../../../../components/commanders/page-header");

function children(node: ReactElement<{ children: ReactElement[] }>): ReactElement<Record<string, unknown>>[] {
  return (node.props.children as ReactElement<Record<string, unknown>>[]).filter((c) => isValidElement(c));
}

describe("/commanders/hidden", () => {
  it("draws the Hidden header over the reader's hides, in the order read", async () => {
    loadHiddenList.mockResolvedValueOnce(rows);
    const page = (await HiddenPage()) as ReactElement<{ children: ReactElement[] }>;
    const [header, list] = children(page);
    expect(header.type).toBe(PageHeader);
    expect(header.props.lane).toBe("hidden");
    expect(list.type).toBe(HiddenList);
    expect((list.props.rows as HiddenRow[]).map((r) => r.oracleId)).toEqual(["g", "z"]);
    expect(loadHiddenList).toHaveBeenCalledWith("user_1", {});
  });

  // No collection is needed: the page reads the hides alone, and an empty set is the list's own zero state.
  it("hands an empty list through for the zero state", async () => {
    const page = (await HiddenPage()) as ReactElement<{ children: ReactElement[] }>;
    expect(children(page)[1].props.rows).toEqual([]);
  });
});
