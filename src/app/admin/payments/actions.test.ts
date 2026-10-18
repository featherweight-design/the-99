// Grant credits' server action: a non-admin is answered with the app's 404 before anything is read or written, and an
// admin's grant is written as the gate's own user, never an id the form sends.
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
vi.mock("../../../lib/admin/access", () => ({ requireAdmin: () => requireAdmin() }));
const grantGift = vi.fn();
vi.mock("../../../lib/admin/gift", () => ({ grantGift: (...a: unknown[]) => grantGift(...a) }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));

const { grantCredits } = await import("./actions");
const input = { accountId: "u_mara", units: 10, note: "why", actionId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b" };

beforeEach(() => {
  requireAdmin.mockReset();
  grantGift.mockReset();
  revalidatePath.mockReset();
});

describe("grantCredits", () => {
  it("is a 404 for a non-admin, granting nothing", async () => {
    requireAdmin.mockRejectedValue(Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" }));
    await expect(grantCredits(input)).rejects.toThrow("404");
    expect(grantGift).not.toHaveBeenCalled();
  });

  it("grants as the admin the gate names, and refreshes the tab only on success", async () => {
    requireAdmin.mockResolvedValue({ userId: "u_admin" });
    grantGift.mockResolvedValueOnce({ ok: true, id: "lot-1", repeated: false }).mockResolvedValueOnce({ ok: false, error: "unknown" });
    expect(await grantCredits(input)).toEqual({ ok: true, id: "lot-1", repeated: false });
    expect(grantGift).toHaveBeenCalledWith("u_admin", input);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/payments");
    revalidatePath.mockReset();
    expect(await grantCredits(input)).toEqual({ ok: false, error: "unknown" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
