// Rule 0 setup's actions (plan PR 5): each reads and writes for the session's reader, and each maps the library's answer to an outcome the sheet draws, so a refusal never reads as done.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  revalidatePath: vi.fn(),
  podSetup: vi.fn(),
  tableSetup: vi.fn(),
  setTable: vi.fn(),
  reseatTable: vi.fn(),
  closeTable: vi.fn(),
}));
vi.mock("../../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
const ip = vi.hoisted(() => ({ zone: null as string | null }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(ip.zone ? { "x-vercel-ip-timezone": ip.zone } : {}) }));
vi.mock("../../../lib/social/rule-zero", () => ({ podSetup: m.podSetup, tableSetup: m.tableSetup, setTable: m.setTable, reseatTable: m.reseatTable, closeTable: m.closeTable }));

import { closeTableAction, loadPodSetupAction, loadTableSetupAction, reseatTableAction, setTableAction } from "./setup-actions";
import { named } from "../../../lib/person-name/mint";

const SEATS = [{ member: "a", deck: null }];

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUserId.mockResolvedValue("user_reader");
});

describe("setup actions", () => {
  it("reads for the session's reader and draws the invite row", async () => {
    m.tableSetup.mockResolvedValue({ tableId: "t" });
    expect(await loadTableSetupAction("t")).toEqual({ setup: { tableId: "t" }, invites: true });
    expect(m.tableSetup).toHaveBeenCalledWith("user_reader", "t");
    m.podSetup.mockResolvedValue({ podId: "p" });
    expect(await loadPodSetupAction("p")).toEqual({ setup: { podId: "p" }, invites: true });
    m.podSetup.mockResolvedValue(null);
    expect(await loadPodSetupAction("p")).toBeNull();
  });

  it("closes the table in the setter's browser zone, else the IP's, else UTC", async () => {
    m.setTable.mockResolvedValue({ kind: "set", tableId: "t1" });
    ip.zone = "America/New_York";
    await setTableAction("p", SEATS, "America/Los_Angeles");
    expect(m.setTable).toHaveBeenLastCalledWith("user_reader", "p", SEATS, "America/Los_Angeles");
    await setTableAction("p", SEATS, "not a zone");
    expect(m.setTable).toHaveBeenLastCalledWith("user_reader", "p", SEATS, "America/New_York");
    ip.zone = null;
    await setTableAction("p", SEATS);
    expect(m.setTable).toHaveBeenLastCalledWith("user_reader", "p", SEATS, "UTC");
  });

  it("maps setTable: set and open open a table, occupied and a refusal do not", async () => {
    m.setTable.mockResolvedValueOnce({ kind: "set", tableId: "t1" });
    expect(await setTableAction("p", SEATS)).toEqual({ ok: true, tableId: "t1" });
    m.setTable.mockResolvedValueOnce({ kind: "open", tableId: "t2" });
    expect(await setTableAction("p", SEATS)).toEqual({ ok: true, tableId: "t2" });
    m.setTable.mockResolvedValueOnce({ kind: "occupied", setBy: named("Colin"), closesAt: new Date() });
    expect(await setTableAction("p", SEATS)).toEqual({ ok: false, reason: "occupied" });
    m.setTable.mockResolvedValueOnce({ kind: "refused", reason: "deck" });
    expect(await setTableAction("p", SEATS)).toEqual({ ok: false, reason: "refused" });
    expect(m.setTable).toHaveBeenCalledWith("user_reader", "p", SEATS, "UTC");
  });

  it("maps reseatTable, and revalidates only a reseat that landed", async () => {
    m.reseatTable.mockResolvedValueOnce({ kind: "refused", reason: "notFound" });
    expect(await reseatTableAction("t", SEATS)).toEqual({ ok: false, reason: "refused" });
    expect(m.revalidatePath).not.toHaveBeenCalled();
    m.reseatTable.mockResolvedValueOnce({ kind: "reseated" });
    expect(await reseatTableAction("t", SEATS)).toEqual({ ok: true, tableId: "t" });
    expect(m.revalidatePath).toHaveBeenCalledWith("/friends/table/[id]", "page");
  });
});

describe("closeTableAction", () => {
  it("closes for the session's reader and redraws the pod row, Home and the table page", async () => {
    m.closeTable.mockResolvedValue(true);
    expect(await closeTableAction("t")).toEqual({ ok: true });
    expect(m.closeTable).toHaveBeenCalledWith("user_reader", "t");
    expect(m.revalidatePath).toHaveBeenCalledWith("/friends");
    expect(m.revalidatePath).toHaveBeenCalledWith("/friends/table/[id]", "page");
  });

  it("answers a stranger, an unknown id and a table already closed alike, and revalidates nothing", async () => {
    m.closeTable.mockResolvedValue(false);
    expect(await closeTableAction("t")).toEqual({ ok: false });
    expect(await closeTableAction("t")).toEqual({ ok: false });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});
