// The copy editor's gate: admin AND staging label AND the staging Vercel project. Each leg is shut on its own with the other
// two open, so a test cannot pass because a different leg did the refusing.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({ auth: () => session() }));

const { copyEditorOpen, copyEditorUser } = await import("./gate");

const ADMIN = "user_admin";

beforeEach(() => {
  vi.stubEnv("ADMIN_USER_IDS", `${ADMIN},user_other`);
  vi.stubEnv("ADMIN_ENV_LABEL", "staging");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "staging.the-99.dev");
  session.mockResolvedValue({ userId: ADMIN });
});
afterEach(() => vi.unstubAllEnvs());

describe("copyEditorOpen", () => {
  it("is open for an admin on staging", () => {
    expect(copyEditorOpen(ADMIN)).toBe(true);
  });

  it("is shut for a player, with the label and the deployment both open", () => {
    expect(copyEditorOpen("user_player")).toBe(false);
    expect(copyEditorOpen(null)).toBe(false);
  });

  it("is shut when the label is not staging, with the admin and the deployment open", () => {
    vi.stubEnv("ADMIN_ENV_LABEL", "production");
    expect(copyEditorOpen(ADMIN)).toBe(false);
    vi.stubEnv("ADMIN_ENV_LABEL", "");
    expect(copyEditorOpen(ADMIN)).toBe(false);
  });

  it("is shut on any project but staging's, with the admin and the label open", () => {
    expect(copyEditorOpen(ADMIN, "the-99.dev")).toBe(false);
    expect(copyEditorOpen(ADMIN, "staging.the-99.dev.evil.test")).toBe(false);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "the-99.dev");
    expect(copyEditorOpen(ADMIN)).toBe(false);
  });

  it("is shut when the project variable is unset or empty, with the admin and the label open", () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(copyEditorOpen(ADMIN)).toBe(false);
    vi.unstubAllEnvs();
    vi.stubEnv("ADMIN_USER_IDS", ADMIN);
    vi.stubEnv("ADMIN_ENV_LABEL", "staging");
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(copyEditorOpen(ADMIN)).toBe(false);
  });

  it("is open on staging's own deployment even though Vercel reports it as production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(copyEditorOpen(ADMIN)).toBe(true);
  });
});

describe("copyEditorUser", () => {
  it("names the admin when open", async () => {
    expect(await copyEditorUser()).toBe(ADMIN);
  });

  it("is null signed out, for a player, off staging and on the production project", async () => {
    session.mockResolvedValue({ userId: null });
    expect(await copyEditorUser()).toBeNull();
    session.mockResolvedValue({ userId: "user_player" });
    expect(await copyEditorUser()).toBeNull();
    session.mockResolvedValue({ userId: ADMIN });
    vi.stubEnv("ADMIN_ENV_LABEL", "production");
    expect(await copyEditorUser()).toBeNull();
    vi.stubEnv("ADMIN_ENV_LABEL", "staging");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "the-99.dev");
    expect(await copyEditorUser()).toBeNull();
  });
});
