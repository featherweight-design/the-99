import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// `purgeSocialIn` runs only against a database; the coverage test pins its maps to the schema, not its statements. These
// pin the two friend links statements, after the profile delete they depend on (a mint needs the profile).
const source = readFileSync(join(__dirname, "purge.ts"), "utf8");
const body = source.slice(source.indexOf("export async function purgeSocialIn"));

describe("the account purge's friend links half", () => {
  it("deletes the account's friend requests on both sides", () => {
    expect(body).toMatch(/delete\(friendRequests\)\.where\(or\(eq\(friendRequests\.requesterUserId, userId\), eq\(friendRequests\.ownerUserId, userId\)\)\)/);
  });

  it("unlinks the account's link keys after deleting its profile", () => {
    const profile = body.indexOf("tx.delete(socialProfiles)");
    const unlink = body.indexOf("unlinkLinkKeysIn(tx, userId)");
    expect(profile).toBeGreaterThan(-1);
    expect(unlink).toBeGreaterThan(profile);
  });
});
