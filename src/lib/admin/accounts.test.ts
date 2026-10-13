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

describe("listAccounts' deadline", () => {
  it("falls back to the stored ids when Clerk never answers", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const listUsers = vi.fn(() => new Promise<{ data: never[] }>(() => {}));
    const out = await listAccounts({ listUsers, storedUserIds: async () => ["user_a"], ownerIds: new Set(), deadlineMs: 20 });
    expect(out).toEqual({ clerk: "down", accounts: [{ id: "user_a", name: null, email: null }] });
    expect(listUsers).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("holds the deadline across every page, not each one", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const full = Array.from({ length: 500 }, (_, i) => user(`user_${i}`, null));
    // Each page answers within 15ms; three pages pass a 30ms budget though no single page does.
    const listUsers = vi.fn(({ offset }: { limit: number; offset: number }) =>
      new Promise<{ data: typeof full }>((resolve) => setTimeout(() => resolve({ data: offset < 1500 ? full : [] }), 15)));
    const out = await listAccounts({ listUsers, storedUserIds: async () => ["user_a"], ownerIds: new Set(), deadlineMs: 30 });
    expect(out.clerk).toBe("down");
    error.mockRestore();
  });

  it("starts no further page once the deadline has passed", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const full = Array.from({ length: 500 }, (_, i) => user(`user_${i}`, null));
    // The first page lands after the deadline: the loop must not go on to ask for the second.
    const listUsers = vi.fn(() => new Promise<{ data: typeof full }>((resolve) => setTimeout(() => resolve({ data: full }), 30)));
    const out = await listAccounts({ listUsers, storedUserIds: async () => ["user_a"], ownerIds: new Set(), deadlineMs: 10 });
    expect(out.clerk).toBe("down");
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(listUsers).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("uses Clerk's answer when it lands inside the deadline", async () => {
    const out = await listAccounts({ listUsers: async () => ({ data: [user("user_a", "Ana")] }), storedUserIds: async () => [], ownerIds: new Set(), deadlineMs: 1000 });
    expect(out).toEqual({ clerk: "ok", accounts: [{ id: "user_a", name: "Ana", email: null }] });
  });

  it("refuses a read that fills every page, and takes the stored ids, rather than calling it whole", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { MAX_PAGES } = await import("./accounts");
    const full = Array.from({ length: 500 }, (_, i) => user(`user_${i}`, null));
    const listUsers = vi.fn(async () => ({ data: full }));
    const out = await listAccounts({ listUsers, storedUserIds: async () => ["user_a"], ownerIds: new Set() });
    expect(listUsers).toHaveBeenCalledTimes(MAX_PAGES);
    expect(out).toEqual({ clerk: "down", accounts: [{ id: "user_a", name: null, email: null }] });
    error.mockRestore();
  });

  it("stops at the first short page, even an empty one after a full one", async () => {
    const full = Array.from({ length: 500 }, (_, i) => user(`user_${i}`, null));
    const listUsers = vi.fn(async ({ offset }: { limit: number; offset: number }) => ({ data: offset === 0 ? full : [] }));
    const out = await listAccounts({ listUsers, storedUserIds: async () => [], ownerIds: new Set() });
    expect(listUsers).toHaveBeenCalledTimes(2);
    expect(out.clerk).toBe("ok");
    expect(out.accounts).toHaveLength(500);
  });

  it("budgets five seconds by default", async () => {
    const { CLERK_DEADLINE_MS } = await import("./accounts");
    expect(CLERK_DEADLINE_MS).toBe(5_000);
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
