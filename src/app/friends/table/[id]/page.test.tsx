// /friends/table/[id] (Rule 0 PR 3): not found with the switch off, and for a table the reader is not seated at; the
// open table draws the read, and a table whose night has ended draws the expired page (L4, H3).
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TABLES } from "../../../../lib/social/rule-zero-fixtures";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  socialFriendsEnabled: vi.fn(),
  loadTable: vi.fn(),
  loadClosedTable: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  useRouter: () => ({ refresh: () => {} }),
}));
vi.mock("../actions", () => ({ markTableSeen: async () => true }));
vi.mock("../../../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../../../../lib/social/flag", () => ({ socialFriendsEnabled: m.socialFriendsEnabled }));
vi.mock("../../../../lib/social/rule-zero-table", () => ({ loadTable: m.loadTable, loadClosedTable: m.loadClosedTable }));

import TablePage from "./page";
import { named } from "../../../../lib/person-name/mint";

const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const page = async () => render(await TablePage({ params: Promise.resolve({ id: ID }) }));

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUserId.mockResolvedValue("user_viewer");
  m.requestSwitchEnv.mockResolvedValue({});
  m.socialFriendsEnabled.mockReturnValue(true);
  m.loadTable.mockResolvedValue(null);
  m.loadClosedTable.mockResolvedValue(null);
});

describe("TablePage", () => {
  it("is not found with SOCIAL_FRIENDS_ENABLED off, and reads nothing", async () => {
    m.socialFriendsEnabled.mockReturnValue(false);
    await expect(page()).rejects.toThrow("NOT_FOUND");
    expect(m.loadTable).not.toHaveBeenCalled();
  });

  it("is not found for a table the reader is not seated at, open or closed", async () => {
    await expect(page()).rejects.toThrow("NOT_FOUND");
    expect(m.loadTable).toHaveBeenCalledWith("user_viewer", ID);
    expect(m.loadClosedTable).toHaveBeenCalledWith("user_viewer", ID);
  });

  it("draws the open table's read and seats, and reads no closed table", async () => {
    m.loadTable.mockResolvedValue(TABLES.T2);
    await page();
    expect(screen.getByTestId("table-body")).toBeInTheDocument();
    expect(screen.getAllByTestId("table-seat")).toHaveLength(4);
    expect(m.loadClosedTable).not.toHaveBeenCalled();
  });

  it("draws the expired page when the night has ended", async () => {
    m.loadClosedTable.mockResolvedValue({ podName: named("Thursday night"), setBy: named("Colin"), faces: [{ name: named("Colin"), artCropUri: null }] });
    await page();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This table has closed");
    expect(screen.getByText(/Thursday night’s table closed the morning after Colin set it/)).toBeInTheDocument();
  });

  it("draws the method tags on the read's provenance sheet", async () => {
    m.loadTable.mockResolvedValue(TABLES.T1);
    await page();
    fireEvent.click(screen.getByRole("button", { name: /How we make these decisions/ }));
    const sheet = screen.getByRole("dialog", { name: /How we make these decisions/ });
    expect(sheet.querySelectorAll("[data-method]").length).toBeGreaterThan(0);
  });
});
