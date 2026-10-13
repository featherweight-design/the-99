// The accounts the admin counts: Clerk, paged, owner first; the stored ids when Clerk cannot be read.
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn(), auth: vi.fn() }));
vi.mock("../../db", () => ({ db: {} }));

const { listAccounts, orderAccounts } = await import("./accounts");

const user = (id: string, fullName: string | null, email: string | null = null) => ({
  id,
  fullName,
  username: null,
  primaryEmailAddress: email ? { emailAddress: email } : null,
});

describe("listAccounts", () => {
  it("pages through Clerk until a short page, and puts the owner first", async () => {
    const first = Array.from({ length: 500 }, (_, i) => user(`user_${String(i).padStart(3, "0")}`, `Zed ${i}`));
    const listUsers = vi.fn(async ({ offset }: { limit: number; offset: number }) => ({
      data: offset === 0 ? first : [user("user_owner", "Hugh"), user("user_mara", "Mara", "mara@example.com")],
    }));
    const out = await listAccounts({ listUsers, storedUserIds: async () => [], ownerIds: new Set(["user_owner"]) });
    expect(listUsers).toHaveBeenCalledTimes(2);
    expect(listUsers.mock.calls[1][0]).toEqual({ limit: 500, offset: 500 });
    expect(out.clerk).toBe("ok");
    expect(out.accounts).toHaveLength(502);
    expect(out.accounts.slice(0, 2)).toEqual([
      { id: "user_owner", name: "Hugh", email: null },
      { id: "user_mara", name: "Mara", email: "mara@example.com" },
    ]);
  });

  it("falls back to the stored ids, without system, when Clerk throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await listAccounts({
      listUsers: async () => {
        throw new Error("clerk down");
      },
      storedUserIds: async () => ["user_b", "system", "user_a", "user_b"],
      ownerIds: new Set(["user_b"]),
    });
    expect(out).toEqual({
      clerk: "down",
      accounts: [
        { id: "user_b", name: null, email: null },
        { id: "user_a", name: null, email: null },
      ],
    });
    error.mockRestore();
  });
});

describe("orderAccounts", () => {
  it("sorts by name, then email, then id, case-insensitively", () => {
    const out = orderAccounts(
      [
        { id: "u3", name: null, email: null },
        { id: "u2", name: null, email: "bea@example.com" },
        { id: "u1", name: "alex", email: null },
        { id: "u0", name: "Cleo", email: null },
      ],
      new Set(),
    );
    expect(out.map((a) => a.id)).toEqual(["u1", "u2", "u0", "u3"]);
  });
});
