import { afterEach, describe, expect, it, vi } from "vitest";

// The limit reads the environment and nothing else; the database is never reached.
vi.mock("../../db", () => ({ db: {} }));

import { dailyLimitFor } from "./allowance";
import { MODEL_FRIEND_DAILY_ALLOWANCE, MODEL_OWNER_DAILY_ALLOWANCE } from "./allowance-rule";

describe("dailyLimitFor", () => {
  const before = process.env.MODEL_OWNER_USER_ID;
  afterEach(() => {
    if (before === undefined) delete process.env.MODEL_OWNER_USER_ID;
    else process.env.MODEL_OWNER_USER_ID = before;
  });

  it("gives the owner ten and everyone else three", () => {
    process.env.MODEL_OWNER_USER_ID = "user_owner";
    expect([MODEL_OWNER_DAILY_ALLOWANCE, MODEL_FRIEND_DAILY_ALLOWANCE]).toEqual([10, 3]);
    expect(dailyLimitFor("user_owner")).toBe(10);
    expect(dailyLimitFor("user_friend")).toBe(3);
  });

  it("fails closed: unset or empty, no account is the owner", () => {
    delete process.env.MODEL_OWNER_USER_ID;
    expect(dailyLimitFor("user_owner")).toBe(3);
    expect(dailyLimitFor("")).toBe(3);
    process.env.MODEL_OWNER_USER_ID = "   ";
    expect(dailyLimitFor("")).toBe(3);
    expect(dailyLimitFor("   ")).toBe(3);
  });
});
