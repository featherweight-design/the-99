// The gate (admin STATES D2 to D4): the allowlist, the environment label, and `requireAdmin()`
// answering everyone else with the app's own 404, signed out included.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({ auth: () => session() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { adminMetadata, adminUserIds, isAdmin, requireAdmin } = await import("./access");
const { adminEnvironment } = await import("./environment");

const HUGH = "user_3GkZrrTwOJBdqUpq6GambP0BC8w";

beforeEach(() => {
  vi.stubEnv("ADMIN_USER_IDS", ` ${HUGH} , user_other,`);
  vi.stubEnv("ADMIN_ENV_LABEL", "staging");
});
afterEach(() => vi.unstubAllEnvs());

describe("adminEnvironment", () => {
  it("reads the two names, trimmed", () => {
    expect(adminEnvironment("staging")).toBe("staging");
    expect(adminEnvironment(" production ")).toBe("production");
  });

  it("is null for anything else, so an unlabelled database has no admin", () => {
    for (const v of ["", " ", "Production", "preview", "local"]) expect(adminEnvironment(v)).toBeNull();
    vi.stubEnv("ADMIN_ENV_LABEL", undefined);
    expect(adminEnvironment()).toBeNull();
  });
});

describe("adminUserIds", () => {
  it("splits on commas and drops blanks", () => {
    expect([...adminUserIds(` ${HUGH} , user_other,,`)]).toEqual([HUGH, "user_other"]);
    expect(adminUserIds("").size).toBe(0);
  });
});

describe("isAdmin", () => {
  it("is true only for a listed id", () => {
    expect(isAdmin(HUGH)).toBe(true);
    expect(isAdmin("user_friend")).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin("")).toBe(false);
  });

  it("is false for everyone when the list is unset", () => {
    vi.stubEnv("ADMIN_USER_IDS", "");
    expect(isAdmin(HUGH)).toBe(false);
  });

  it("is false for everyone when the environment is not labelled", () => {
    vi.stubEnv("ADMIN_ENV_LABEL", "");
    expect(isAdmin(HUGH)).toBe(false);
  });
});

describe("requireAdmin", () => {
  it("returns the admin and the environment", async () => {
    session.mockResolvedValueOnce({ userId: HUGH });
    await expect(requireAdmin()).resolves.toEqual({ userId: HUGH, env: "staging" });
  });

  it.each([
    ["signed out", null],
    ["a friend", "user_friend"],
  ])("answers %s with notFound", async (_label, userId) => {
    session.mockResolvedValueOnce({ userId });
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("answers the admin with notFound when the environment is unlabelled", async () => {
    vi.stubEnv("ADMIN_ENV_LABEL", "preview");
    session.mockResolvedValueOnce({ userId: HUGH });
    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("adminMetadata", () => {
  const meta = { title: "Costs", robots: { index: false, follow: false } };

  it("gives the admin the route's own metadata", async () => {
    session.mockResolvedValueOnce({ userId: HUGH });
    await expect(adminMetadata(meta)).resolves.toEqual(meta);
  });

  it.each([
    ["signed out", null],
    ["a friend", "user_friend"],
  ])("gives %s nothing, so their 404 carries only the root's, as an unknown path's does", async (_label, userId) => {
    session.mockResolvedValueOnce({ userId });
    await expect(adminMetadata(meta)).resolves.toEqual({});
  });
});
