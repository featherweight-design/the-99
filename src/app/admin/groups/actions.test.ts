// Delete a group's server action: a non-admin is a 404 before anything is written; a landed delete redirects to
// Groups with the name (so the response carries that page, not a re-render of the deleted group's 404); a refusal
// returns its result for the dialog.
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
vi.mock("../../../lib/admin/access", () => ({ requireAdmin: () => requireAdmin() }));
const removeEmptyGroup = vi.fn();
const loadEndedCodeIds = vi.fn<(id: string) => Promise<string[]>>(async () => []);
vi.mock("../../../lib/admin/group-codes", () => ({ loadEndedCodeIds: (id: string) => loadEndedCodeIds(id) }));
vi.mock("../../../lib/admin/group-writes", () => ({ removeEmptyGroup: (...a: unknown[]) => removeEmptyGroup(...a), writeGroup: vi.fn() }));

const { deleteGroup } = await import("./actions");
const T = "11111111-1111-4111-8111-111111111111";

/** Next's redirect throw, matched by prefix on both carriers (Next has moved the target between them). */
const redirectTarget = (error: unknown) => {
  const e = error as { message?: string; digest?: string };
  const carrier = [e.digest, e.message].find((s) => typeof s === "string" && s.startsWith("NEXT_REDIRECT"));
  return carrier ?? null;
};

beforeEach(() => {
  requireAdmin.mockReset();
  removeEmptyGroup.mockReset();
  loadEndedCodeIds.mockReset().mockResolvedValue([]);
});

describe("deleteGroup", () => {
  it("is a 404 for a non-admin, deleting nothing", async () => {
    requireAdmin.mockRejectedValue(Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" }));
    await expect(deleteGroup(T)).rejects.toThrow("404");
    expect(removeEmptyGroup).not.toHaveBeenCalled();
  });

  it("redirects a landed delete to Groups, carrying the encoded name for the toast", async () => {
    requireAdmin.mockResolvedValue({ userId: "u_admin" });
    removeEmptyGroup.mockResolvedValue({ ok: true, name: "early birds" });
    const error = await deleteGroup(T).then(() => null, (e: unknown) => e);
    expect(removeEmptyGroup).toHaveBeenCalledWith("u_admin", T, undefined, []);
    expect(redirectTarget(error)).toContain("/admin/groups?deleted=early%20birds");
  });

  it("hands the delete the codes the flyer trial ended, read before it", async () => {
    requireAdmin.mockResolvedValue({ userId: "u_admin" });
    loadEndedCodeIds.mockResolvedValue(["code-1"]);
    removeEmptyGroup.mockResolvedValue({ ok: true, name: "early birds" });
    await deleteGroup(T).catch(() => null);
    expect(loadEndedCodeIds).toHaveBeenCalledWith(T);
    expect(removeEmptyGroup).toHaveBeenCalledWith("u_admin", T, undefined, ["code-1"]);
  });

  it("deletes nothing when the switch read fails", async () => {
    requireAdmin.mockResolvedValue({ userId: "u_admin" });
    loadEndedCodeIds.mockRejectedValue(new Error("down"));
    expect(await deleteGroup(T)).toEqual({ ok: false, error: "failed" });
    expect(removeEmptyGroup).not.toHaveBeenCalled();
  });

  it("returns a refusal for the dialog, without redirecting", async () => {
    requireAdmin.mockResolvedValue({ userId: "u_admin" });
    removeEmptyGroup.mockResolvedValueOnce({ ok: false, error: "not_empty" }).mockResolvedValueOnce({ ok: false, error: "group" });
    expect(await deleteGroup(T)).toEqual({ ok: false, error: "not_empty" });
    expect(await deleteGroup(T)).toEqual({ ok: false, error: "group" });
  });
});
