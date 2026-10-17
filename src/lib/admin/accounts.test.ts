// The accounts the admin counts: Clerk, paged, owner first; the stored ids when Clerk cannot be read.
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn(), auth: vi.fn() }));
vi.mock("../../db", () => ({ db: {} }));

const { findAccountIdByEmail, listAccounts, orderAccounts, readIdentity } = await import("./accounts");

/** A Clerk user: `name` is split on its first space into first and last name, as Clerk stores them. */
const user = (id: string, name: string | null, email: string | null = null) => {
  const [firstName, ...rest] = name ? name.split(" ") : [null];
  return { id, firstName, lastName: rest.length ? rest.join(" ") : null, username: null, primaryEmailAddress: email ? { emailAddress: email } : null };
};
const tail = (id: string) => `Account ·${id.slice(-4)}`;

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
      { id: "user_owner", name: "Hugh", email: null, named: true },
      { id: "user_mara", name: "Mara", email: "m•••@e•••.com", named: true },
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
        { id: "user_b", name: tail("user_b"), email: null, named: false },
        { id: "user_a", name: tail("user_a"), email: null, named: false },
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
    expect(out).toEqual({ clerk: "down", accounts: [{ id: "user_a", name: tail("user_a"), email: null, named: false }] });
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
    expect(out).toEqual({ clerk: "ok", accounts: [{ id: "user_a", name: "Ana", email: null, named: true }] });
  });

  it("refuses a read that fills every page, and takes the stored ids, rather than calling it whole", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { MAX_PAGES } = await import("./accounts");
    const full = Array.from({ length: 500 }, (_, i) => user(`user_${i}`, null));
    const listUsers = vi.fn(async () => ({ data: full }));
    const out = await listAccounts({ listUsers, storedUserIds: async () => ["user_a"], ownerIds: new Set() });
    expect(listUsers).toHaveBeenCalledTimes(MAX_PAGES);
    expect(out).toEqual({ clerk: "down", accounts: [{ id: "user_a", name: tail("user_a"), email: null, named: false }] });
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

describe("listAccounts masks on the server", () => {
  it("lists a masked name and email, and the payload carries neither whole", async () => {
    const out = await listAccounts({
      listUsers: async () => ({ data: [user("user_colin", "Colin Reyes", "colin@gmail.com")] }),
      storedUserIds: async () => [],
      ownerIds: new Set(),
    });
    expect(out.accounts).toEqual([{ id: "user_colin", name: "Colin R.", email: "c•••@g•••.com", named: true }]);
    const payload = JSON.stringify(out);
    expect(payload).not.toContain("Reyes");
    expect(payload).not.toContain("colin@gmail.com");
  });
});

describe("readIdentity", () => {
  const deps = (getUser: (id: string) => Promise<unknown>) => ({ getUser, findByEmail: async () => [] }) as never;

  it("answers the whole name and email of one account", async () => {
    const out = await readIdentity("user_colin", deps(async () => user("user_colin", "Colin Reyes", "colin@gmail.com")));
    expect(out).toEqual({ id: "user_colin", fullName: "Colin Reyes", email: "colin@gmail.com" });
  });

  it("is null for a user Clerk does not hold, and throws when Clerk fails", async () => {
    expect(await readIdentity("user_x", deps(async () => null))).toBeNull();
    await expect(readIdentity("user_x", deps(async () => { throw new Error("down"); }))).rejects.toThrow("down");
  });
});

describe("findAccountIdByEmail", () => {
  const deps = (users: { id: string; addresses: string[] }[]) =>
    ({ getUser: async () => null, findByEmail: async () => users.map((u) => ({ id: u.id, emailAddresses: u.addresses.map((emailAddress) => ({ emailAddress })) })) }) as never;

  it("answers the one account whose address equals the input exactly, whatever case Clerk stored", async () => {
    expect(await findAccountIdByEmail("colin@gmail.com", deps([{ id: "user_colin", addresses: ["Colin@Gmail.com"] }]))).toBe("user_colin");
  });

  it("is null when Clerk's answer does not hold the address exactly, or two accounts hold it", async () => {
    expect(await findAccountIdByEmail("colin@gmail.com", deps([{ id: "user_c", addresses: ["colin@gmail.co"] }]))).toBeNull();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await findAccountIdByEmail("a@b.com", deps([{ id: "u1", addresses: ["a@b.com"] }, { id: "u2", addresses: ["a@b.com"] }]))).toBeNull();
    error.mockRestore();
  });
});

describe("orderAccounts", () => {
  it("sorts by masked name case-insensitively, the accounts with no name last, then by id", () => {
    const out = orderAccounts(
      [
        { id: "u3", name: "Account ·u3", email: null, named: false },
        { id: "u1", name: "alex", email: null, named: true },
        { id: "u0", name: "Cleo", email: null, named: true },
      ],
      new Set(),
    );
    expect(out.map((a) => a.id)).toEqual(["u1", "u0", "u3"]);
  });
});
