import { describe, expect, it, vi } from "vitest";
import { looksSecret, REDACTED, redactSecrets } from "./redact-env.mjs";

describe("the Stripe secrets (payments scope §5.2)", () => {
  it("are redacted by name, and the Price ids are not secrets", () => {
    for (const name of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SECRET_PREVIOUS"]) {
      expect(looksSecret(name, "x")).toBe(true);
    }
    expect(looksSecret("STRIPE_PRICE_PACK_40", "price_123")).toBe(false);
  });
});

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
      CACHE_URL: "redis://:hunter2@host:6379",
      LABEL_MAX_TOKENS: "4000",
      DECK_NOTES_ENABLED: "true",
      NODE_ENV: "test",
      PLAIN_URL: "https://example.com/x",
      EMPTY_SECRET: "",
    };
    const replaced = redactSecrets(env);
    expect(replaced.sort()).toEqual([
      "ANTHROPIC_API_KEY", "CACHE_URL", "CLERK_SECRET_KEY_STAGING", "DATABASE_URL", "E2E_AUDIT_USER_PASSWORD",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "SENTRY_AUTH_TOKEN", "SOME_URL", "THE_99_CLERK_SECRET_KEY",
      "THE_99_NEON_STAGING_DIRECT",
    ]);
    expect(env.DECK_NOTES_ENABLED).toBe("true");
    expect(env.NODE_ENV).toBe("test");
    expect(env.LABEL_MAX_TOKENS).toBe("4000");
    expect(env.PLAIN_URL).toBe("https://example.com/x");
    expect(env.EMPTY_SECRET).toBe("");
    expect(env.ANTHROPIC_API_KEY).toBe(REDACTED);
  });

  it("has run before this file: the setup redacted, and no variable still looks like a live credential", () => {
    // The marker is what makes this measure something on a machine with no secrets to redact (CI).
    expect(Array.isArray((globalThis as { __setupRedaction?: string[] }).__setupRedaction)).toBe(true);
    // Names only, never values: this assertion must not be the thing that prints one.
    const live = Object.entries(process.env)
      .filter(([name, value]) => value && value !== REDACTED && looksSecret(name, value) && name !== "DATABASE_URL")
      .map(([name]) => name);
    expect(live).toEqual([]);
  });
});

describe("env.mjs under Vitest", () => {
  it("redacts what it loads from .env, which happens after the setup ran", async () => {
    // A .env load that puts a live-looking secret back, as the real file does on a developer's machine.
    vi.resetModules();
    vi.doMock("dotenv", () => ({
      config: () => {
        process.env.PROBE_LOADED_SECRET_KEY = "sk-live-from-dotenv";
        return { parsed: {} };
      },
    }));
    try {
      await import("./env.mjs");
      expect(process.env.PROBE_LOADED_SECRET_KEY).toBe(REDACTED);
    } finally {
      vi.doUnmock("dotenv");
      delete process.env.PROBE_LOADED_SECRET_KEY;
    }
  });
});
