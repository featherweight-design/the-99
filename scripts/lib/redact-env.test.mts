import { describe, expect, it } from "vitest";
import { looksSecret, REDACTED, redactSecrets } from "./redact-env.mjs";

describe("redactSecrets", () => {
  it("replaces credentials by name and by value, and leaves switches and plumbing alone", () => {
    const env: Record<string, string | undefined> = {
      ANTHROPIC_API_KEY: "sk-live",
      THE_99_CLERK_SECRET_KEY: "sk_live_x",
      CLERK_SECRET_KEY_STAGING: "sk_test_y",
      SENTRY_AUTH_TOKEN: "t",
      E2E_AUDIT_USER_PASSWORD: "p",
      THE_99_NEON_STAGING_DIRECT: "postgres://u:p@h/db",
      DATABASE_URL: "postgres://u:p@h/db",
      SOME_URL: "https://user:pass@example.com/x",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_z",
      DECK_NOTES_ENABLED: "true",
      NODE_ENV: "test",
      PLAIN_URL: "https://example.com/x",
      EMPTY_SECRET: "",
    };
    const replaced = redactSecrets(env);
    expect(replaced.sort()).toEqual([
      "ANTHROPIC_API_KEY", "CLERK_SECRET_KEY_STAGING", "DATABASE_URL", "E2E_AUDIT_USER_PASSWORD",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "SENTRY_AUTH_TOKEN", "SOME_URL", "THE_99_CLERK_SECRET_KEY",
      "THE_99_NEON_STAGING_DIRECT",
    ]);
    expect(env.DECK_NOTES_ENABLED).toBe("true");
    expect(env.NODE_ENV).toBe("test");
    expect(env.PLAIN_URL).toBe("https://example.com/x");
    expect(env.EMPTY_SECRET).toBe("");
    expect(env.ANTHROPIC_API_KEY).toBe(REDACTED);
  });

  it("has run before this file: no variable in the test process still looks like a live credential", () => {
    // Names only, never values: this assertion must not be the thing that prints one.
    const live = Object.entries(process.env)
      .filter(([name, value]) => value && value !== REDACTED && looksSecret(name, value) && name !== "DATABASE_URL")
      .map(([name]) => name);
    expect(live).toEqual([]);
  });
});
