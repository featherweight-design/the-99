// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertDisposableAccount, ONBOARD_PROBE_EMAIL } from "./probe-account.mjs";

const sqlWith = (decks: number) => (async () => [{ decks }]) as unknown as Parameters<typeof assertDisposableAccount>[0];
const ARGS = { userId: "user_x", what: "probe:x" };

describe("assertDisposableAccount", () => {
  it("lets the dedicated empty account through", async () => {
    await expect(assertDisposableAccount(sqlWith(0), { ...ARGS, email: ONBOARD_PROBE_EMAIL })).resolves.toBeUndefined();
  });

  it("refuses any other email, even with no decks", async () => {
    await expect(assertDisposableAccount(sqlWith(0), { ...ARGS, email: "e2e+clerk_test@the99.app" })).rejects.toThrow(/only .* may be wiped/);
  });

  it("refuses the dedicated email when the account owns a deck", async () => {
    await expect(assertDisposableAccount(sqlWith(2), { ...ARGS, email: ONBOARD_PROBE_EMAIL })).rejects.toThrow(/owns 2 deck/);
  });
});

describe("the wipers", () => {
  it.each(["probe-onboarding.mjs", "probe-locked-nav.mjs", "probe-issues-sheet.mjs"])("%s guards its cleanup", (file) => {
    const src = readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), "utf8");
    const body = src.slice(src.indexOf("async function cleanup(userId)"));
    expect(body.slice(0, body.indexOf("\n}\n"))).toMatch(/assertDisposableAccount\(sql, \{ email: EMAIL, userId/);
    expect(src).toMatch(/import \{ assertDisposableAccount \} from "\.\/lib\/probe-account\.mjs"/);
  });
});
