import { describe, expect, it } from "vitest";
import { isEmailShape } from "../invites/rules";
import { looksLikeEmail } from "./email-shape";

describe("looksLikeEmail", () => {
  it("agrees with the server's isEmailShape on every address in the table", () => {
    const table = ["name@example.com", " name@example.com ", "a@b.c", "a@b", "@b.com", "a@.com", "a b@c.com", "", "x".repeat(250) + "@a.bc", "a@@b.com", "sam@example"];
    for (const t of table) expect(looksLikeEmail(t), JSON.stringify(t)).toBe(isEmailShape(t));
  });
});
