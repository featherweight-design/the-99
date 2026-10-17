// /friends/table/[id] (Rule 0 PR 3): not found with the switch off, and for a table the reader is not seated at; the
// open table draws the read, and a table whose night has ended draws the expired page (L4, H3).
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TABLES } from "../../../../lib/rule-zero/table-fixtures";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  ruleZeroEnabled: vi.fn(),
  socialGamesEnabled: vi.fn(),
  loadTable: vi.fn(),
  loadClosedTable: vi.fn(),
  howItWorksEnabled: vi.fn(),
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("../../../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../../../../lib/social/flag", () => ({ ruleZeroEnabled: m.ruleZeroEnabled, socialGamesEnabled: m.socialGamesEnabled }));
vi.mock("../../../../lib/social/rule-zero-table", () => ({ loadTable: m.loadTable, loadClosedTable: m.loadClosedTable }));
vi.mock("../../../../lib/about/how-it-works-flag", () => ({ howItWorksEnabled: m.howItWorksEnabled }));

import TablePage from "./page";

const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const page = async () => render(await TablePage({ params: Promise.resolve({ id: ID }) }));

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUserId.mockResolvedValue("user_viewer");
  m.requestSwitchEnv.mockResolvedValue({});
  m.ruleZeroEnabled.mockReturnValue(true);
  m.socialGamesEnabled.mockReturnValue(true);
  m.loadTable.mockResolvedValue(null);
  m.loadClosedTable.mockResolvedValue(null);
  m.howItWorksEnabled.mockReturnValue(false);
});

describe("TablePage", () => {
  it("is not found with RULE_ZERO_ENABLED off, and reads nothing", async () => {
    m.ruleZeroEnabled.mockReturnValue(false);
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

  it("leaves Log this game out with games off", async () => {
    m.loadTable.mockResolvedValue(TABLES.T1);
    m.socialGamesEnabled.mockReturnValue(false);
    await page();
    expect(screen.queryByText("Log this game")).toBeNull();
  });

  it("draws the expired page when the night has ended", async () => {
    m.loadClosedTable.mockResolvedValue({ podName: "Thursday night", setBy: "Colin", faces: [{ name: "Colin", artCropUri: null }] });
    await page();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This table has closed");
    expect(screen.getByText(/Thursday night’s table closed 24 hours after Colin set it/)).toBeInTheDocument();
  });

  it("hands the reader's How it works switch to the read's provenance sheet", async () => {
    m.loadTable.mockResolvedValue(TABLES.T1);
    m.howItWorksEnabled.mockReturnValue(true);
    await page();
    fireEvent.click(screen.getByRole("button", { name: /How we make these decisions/ }));
    const sheet = screen.getByRole("dialog", { name: /How we make these decisions/ });
    expect(sheet.querySelectorAll("[data-method]").length).toBeGreaterThan(0);
  });
});
