import { describe, expect, it } from "vitest";
import { attributeAllowed, cleanAttributes, scrubLog } from "./log-scrub";

describe("the log attribute allowlist", () => {
  it("keeps enum strings, numbers and booleans", () => {
    expect(cleanAttributes({ outcome: "sure", ms: 120, filled: true, event_type: "checkout.session.completed" })).toEqual({
      kept: { outcome: "sure", ms: 120, filled: true, event_type: "checkout.session.completed" },
      stripped: [],
    });
  });

  it("refuses an email, a Clerk id, a uuid and a long token", () => {
    expect(attributeAllowed("result", "someone@example.com")).toBe(false);
    expect(attributeAllowed("result", "user_2NNEqL2nrIRdJ194ndJqAHwEfxC")).toBe(false);
    expect(attributeAllowed("result", "3f2a1b4c-0d5e-4f60-8a7b-9c0d1e2f3a4b")).toBe(false);
    expect(attributeAllowed("result", "cus_Q1w2E3r4")).toBe(false);
  });

  it("refuses a string over 64 characters, or one with spaces (a typed name)", () => {
    expect(attributeAllowed("mode", "a-".repeat(32))).toBe(true);
    expect(attributeAllowed("mode", `${"a-".repeat(32)}a`)).toBe(false);
    expect(attributeAllowed("mode", "Kitchen table brew")).toBe(false);
  });

  it("refuses a key naming a person, except the HMAC user tag", () => {
    for (const key of ["user", "user_id", "email", "name", "deck_name", "id", "clerk_id", "ip"]) expect(attributeAllowed(key, "x")).toBe(false);
    expect(attributeAllowed("user_tag", "0123456789abcdef")).toBe(true);
    expect(attributeAllowed("user_tag", "user_2NNEqL2nrIRdJ194")).toBe(false);
    expect(attributeAllowed("Bad-Key", 1)).toBe(false);
    expect(attributeAllowed("ms", Number.NaN)).toBe(false);
    expect(attributeAllowed("obj", { a: 1 })).toBe(false);
  });
});

describe("scrubLog (beforeSendLog)", () => {
  it("drops any log that is not one of the closed events: a raw logger call, a console capture", () => {
    expect(scrubLog({ level: "info", message: "Deck Kitchen table saved", attributes: {} })).toBeNull();
    expect(scrubLog({ level: "info", message: Object.assign(new String("deck.built"), { __sentry_template_string__: "x" }), attributes: {} })).toBeNull();
  });

  it("strips the SDK's user fields and any disallowed attribute, keeping its release and environment", () => {
    const out = scrubLog({
      level: "info",
      message: "deck.built",
      attributes: {
        mode: "direct", cards: 99, "user.id": "user_2NNEqL2nrIRdJ194", "user.email": "a@b.co", "user.name": "Hugh",
        "sentry.release": "abc123", "sentry.environment": "production", "sentry.message.parameter.0": "Sol Ring", deck_name: "Kitchen",
      },
    });
    expect(out?.attributes).toEqual({ mode: "direct", cards: 99, "sentry.release": "abc123", "sentry.environment": "production" });
  });
});
