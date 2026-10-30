// Rule 0 setup's actions (plan PR 5): each decides SOCIAL_FRIENDS_ENABLED for the READER and, off, reads and writes
// nothing; each maps the library's answer to an outcome the sheet draws, so a refusal never reads as done.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  revalidatePath: vi.fn(),
  podSetup: vi.fn(),
  tableSetup: vi.fn(),
  setTable: vi.fn(),
  reseatTable: vi.fn(),
}));
vi.mock("../../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("../../../lib/social/rule-zero", () => ({ podSetup: m.podSetup, tableSetup: m.tableSetup, setTable: m.setTable, reseatTable: m.reseatTable }));

import { loadPodSetupAction, loadTableSetupAction, reseatTableAction, setTableAction } from "./setup-actions";

const ON = { SOCIAL_FRIENDS_ENABLED: "true" };
const SEATS = [{ member: "a", deck: null }];

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUserId.mockResolvedValue("user_reader");
  m.requestSwitchEnv.mockResolvedValue(ON);
});

describe("off for the reader", () => {
  beforeEach(() => m.requestSwitchEnv.mockResolvedValue({}));

  it("reads nothing and writes nothing", async () => {
    expect(await loadPodSetupAction("p")).toBeNull();
    expect(await loadTableSetupAction("t")).toBeNull();
    expect(await setTableAction("p", SEATS)).toEqual({ ok: false, reason: "off" });
    expect(await reseatTableAction("t", SEATS)).toEqual({ ok: false, reason: "off" });
    for (const f of [m.podSetup, m.tableSetup, m.setTable, m.reseatTable]) expect(f).not.toHaveBeenCalled();
  });
});

describe("on", () => {
  it("reads for the session's reader and says whether the invite row is drawn", async () => {
    m.tableSetup.mockResolvedValue({ tableId: "t" });
    expect(await loadTableSetupAction("t")).toEqual({ setup: { tableId: "t" }, invites: false });
    expect(m.tableSetup).toHaveBeenCalledWith("user_reader", "t");
    m.requestSwitchEnv.mockResolvedValue({ ...ON, SOCIAL_INVITES_ENABLED: "true" });
    m.podSetup.mockResolvedValue({ podId: "p" });
    expect(await loadPodSetupAction("p")).toEqual({ setup: { podId: "p" }, invites: true });
    m.podSetup.mockResolvedValue(null);
    expect(await loadPodSetupAction("p")).toBeNull();
  });

  it("maps setTable: set and open open a table, occupied and a refusal do not", async () => {
    m.setTable.mockResolvedValueOnce({ kind: "set", tableId: "t1" });
    expect(await setTableAction("p", SEATS)).toEqual({ ok: true, tableId: "t1" });
    m.setTable.mockResolvedValueOnce({ kind: "open", tableId: "t2" });
    expect(await setTableAction("p", SEATS)).toEqual({ ok: true, tableId: "t2" });
    m.setTable.mockResolvedValueOnce({ kind: "occupied", setBy: "Colin", closesAt: new Date() });
    expect(await setTableAction("p", SEATS)).toEqual({ ok: false, reason: "occupied" });
    m.setTable.mockResolvedValueOnce({ kind: "refused", reason: "deck" });
    expect(await setTableAction("p", SEATS)).toEqual({ ok: false, reason: "refused" });
    expect(m.setTable).toHaveBeenCalledWith("user_reader", "p", SEATS);
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
