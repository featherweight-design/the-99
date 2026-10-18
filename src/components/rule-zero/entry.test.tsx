// Rule 0's way in (plan PR 6; boards E1 to E3, F1 to F3): the pod card's last row and Home's table card.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), loadPodSetupAction: vi.fn(), setTableAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push, refresh: m.refresh }) }));
vi.mock("../../app/friends/table/setup-actions", () => ({ loadPodSetupAction: m.loadPodSetupAction, setTableAction: m.setTableAction }));

import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import type { OpenTable } from "../../lib/social/rule-zero";
import { closesWhen } from "../../lib/social/when";
import { HomeTableCard } from "./home-table-card";
import { PodRuleZeroRow } from "./pod-row";

const e = ruleZeroCopy.entry;
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const NOW = new Date("2026-10-16T21:40:00Z");
const face = (displayName: string, you = false, art: string | null = null) => ({ displayName, you, commander: art ? { oracleId: "o", name: "c", artCropUri: art } : null });
const TABLE: OpenTable = {
  tableId: "t1",
  podId: "p1",
  podName: "Thursday night",
  closesAt: new Date("2026-10-17T21:40:00Z"),
  setByYou: false,
  setterName: "Colin",
  yourDeck: "Ghalta Stompy",
  seats: [face("Hugh", true, "a.jpg"), face("Colin", false, "b.jpg"), face("Peter"), face("Max"), face("Chris"), face("Dee")],
};
// After hydration the close is in the reader's own zone, as the table page draws it.
const CLOSES = closesWhen(TABLE.closesAt, NOW);

describe("the pod row (E1, E2, F1, F2)", () => {
  it("is Rule 0 check with no open table, and opens setup for this pod", async () => {
    m.loadPodSetupAction.mockResolvedValue({ setup: { podId: "p1", podName: "Thursday night", owner: null, members: [] }, invites: false });
    render(<PodRuleZeroRow podId="p1" table={null} now={NOW} />);
    const row = screen.getByTestId("pod-rule-zero");
    expect(row.tagName).toBe("BUTTON");
    expect(row.textContent).toContain(e.row);
    expect(row.textContent).toContain(e.rowSub);
    fireEvent.click(row);
    await waitFor(() => expect(screen.getByRole("dialog", { name: ruleZeroCopy.setup.whoTitle })).toBeTruthy());
    expect(m.loadPodSetupAction).toHaveBeenCalledWith("p1");
  });

  it("refreshes rather than opening anything when setup cannot be read", async () => {
    m.loadPodSetupAction.mockResolvedValue(null);
    render(<PodRuleZeroRow podId="p1" table={null} now={NOW} />);
    fireEvent.click(screen.getByTestId("pod-rule-zero"));
    await waitFor(() => expect(m.refresh).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is Tonight's table with an open one: a link to it, its count and close, at most four faces", () => {
    render(<PodRuleZeroRow podId="p1" table={TABLE} now={NOW} />);
    const row = screen.getByTestId("pod-rule-zero");
    expect(row.getAttribute("href")).toBe("/friends/table/t1");
    expect(row.textContent).toContain(e.open);
    expect(row.textContent).toContain(e.openSub(6, CLOSES));
    expect(row.querySelectorAll("[data-face]")).toHaveLength(4);
  });
});

describe("Home's table card (E3, F3)", () => {
  it("names the setter, your deck in bold, and opens the table", () => {
    render(<HomeTableCard table={TABLE} now={NOW} />);
    const card = screen.getByRole("region", { name: e.homeKicker });
    expect(within(card).getByRole("heading", { name: "Thursday night" })).toBeTruthy();
    expect(card.querySelector("p")?.textContent).toBe(e.homeBody("Colin", "Ghalta Stompy", 6, CLOSES));
    expect(within(card).getByText("Ghalta Stompy").tagName).toBe("B");
    expect(card.querySelectorAll("[data-face]")).toHaveLength(6);
    expect(within(card).getByRole("link", { name: e.homeOpen }).getAttribute("href")).toBe("/friends/table/t1");
  });

  it("says you're seated when you set it, and where to pick when your seat waits", () => {
    render(<HomeTableCard table={{ ...TABLE, setByYou: true }} now={NOW} />);
    expect(screen.getByRole("region").querySelector("p")?.textContent).toBe(e.homeBodyOwn("Ghalta Stompy", 6, CLOSES));
    cleanup();
    render(<HomeTableCard table={{ ...TABLE, yourDeck: null }} now={NOW} />);
    expect(screen.getByRole("region").querySelector("p")?.textContent).toBe(e.homeBodyWaiting("Colin", 6, CLOSES));
  });
});
