// Undo of an Unhide restores the original `hidden_at` (ruling R1), from a token only the server can mint.
import { describe, expect, it } from "vitest";
import { RESTORE_TTL_MS, readRestoreToken, restoreToken } from "./hidden-restore";

const ENV = { CLERK_SECRET_KEY: "sk_test_0123456789abcdef0123456789abcdef" };
const ID = "0f6a3b8e-5c1d-4e2f-9a7b-1c2d3e4f5a6b";
const OTHER = "0f6a3b8e-5c1d-4e2f-9a7b-1c2d3e4f5a6c";
const hidden = new Date("2026-10-29T12:00:00.123Z");
const issued = new Date("2026-11-01T09:00:00.000Z");

describe("the restore token", () => {
  const token = restoreToken("user_1", ID, hidden, issued, ENV)!;

  it("gives back the row's original time, to the millisecond", () => {
    expect(readRestoreToken("user_1", ID, token, new Date(issued.getTime() + 5_000), ENV)).toEqual(hidden);
  });

  it("is bound to the reader and the commander it was issued for", () => {
    expect(readRestoreToken("user_2", ID, token, issued, ENV)).toBeNull();
    expect(readRestoreToken("user_1", OTHER, token, issued, ENV)).toBeNull();
  });

  // A client-chosen time is never taken: change the time the token names and its signature no longer holds.
  it("refuses a token whose time was changed, or that the server did not sign", () => {
    const [, at, sig] = token.split(".");
    expect(readRestoreToken("user_1", ID, `${hidden.getTime() - 86_400_000}.${at}.${sig}`, issued, ENV)).toBeNull();
    expect(readRestoreToken("user_1", ID, token, issued, { CLERK_SECRET_KEY: "sk_test_another_key_entirely_000000" })).toBeNull();
    for (const bad of [undefined, null, 1, "", "2026-10-29T12:00:00Z", { token }, `${token}x`]) {
      expect(readRestoreToken("user_1", ID, bad, issued, ENV)).toBeNull();
    }
  });

  it("expires", () => {
    expect(readRestoreToken("user_1", ID, token, new Date(issued.getTime() + RESTORE_TTL_MS + 1), ENV)).toBeNull();
  });

  it("is not minted, and reads nothing, without a key", () => {
    expect(restoreToken("user_1", ID, hidden, issued, {})).toBeNull();
    expect(readRestoreToken("user_1", ID, token, issued, {})).toBeNull();
  });
});
