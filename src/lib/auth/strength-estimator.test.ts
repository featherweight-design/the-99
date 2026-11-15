// @vitest-environment node
//
// G3, the estimator's agreement with Clerk (live password strength R1c). CI never calls Clerk: `strength-fixture.json` holds
// the dev instance's recorded answers (`pnpm record:clerk-strength`), and these tests hold the meter to them. Clerk's line is
// `min_zxcvbn_strength` 2. The estimator may err weak (Weak where Clerk accepts) but never the other way.
import { describe, expect, it } from "vitest";
import fixture from "./strength-fixture.json";
import { MIN_PASSWORD, passwordLength } from "./password";
import { estimate, strengthOf, userInputs } from "./strength-estimator";

const Q1 = ["Colin", "colin@example.com"];
const K5 = ["colin@example.com"];
/** A reading as the boards draw it: the meter, then which guides tick (l = length, m = number or symbol, c = common). */
const drawn = (pw: string, inputs: string[]) => {
  const r = estimate(pw, inputs);
  const g = r.guides;
  return `${r.strength} ${g.length ? "l" : ""}${g.numberOrSymbol ? "m" : ""}${g.common ? "c" : ""}`;
};

describe("the fixture", () => {
  it("records Clerk's level 2 and a Clerk answer per row", () => {
    expect(fixture.minZxcvbnStrength).toBe(2);
    for (const row of fixture.rows) expect(row.clerk).toMatch(/^(accepted|form_password_\w+)$/);
  });

  // A `zxcvbn-rule` row is the estimator's own rule standing in for Clerk: counting it as agreement would be circular.
  it("holds only answers from Clerk itself", () => {
    const stand_ins = fixture.rows.filter((r) => r.source !== "clerk-dev").map((r) => r.password);
    expect(stand_ins, "rows not answered by Clerk: run `pnpm record:clerk-strength` again until every row is clerk-dev").toEqual([]);
  });

  it("records exactly the inputs Clerk was sent: the address, and the first name on Q1 rows", () => {
    for (const row of fixture.rows) expect([Q1, K5]).toContainEqual(row.inputs);
  });
});

describe("step boundaries", () => {
  it("draws no word under MIN_PASSWORD characters, and scores from MIN_PASSWORD", () => {
    expect(MIN_PASSWORD).toBe(8);
    expect(estimate("Rk4$wP9", Q1).strength).toBe("short");
    expect(estimate("Rk4$wP9n", Q1).strength).not.toBe("short");
  });

  it("counts what reads as one character, not UTF-16 units or code points", () => {
    expect(estimate("ab🃏🃏🃏🃏🃏1", []).guides.length).toBe(true); // 8 characters, 13 units
    expect(estimate("🃏🃏🃏🃏🃏🃏🃏", []).strength).toBe("short"); // 7 characters, 14 units
    const family = "👨\u200D👩\u200D👧\u200D👦"; // one grapheme: 7 code points, 11 UTF-16 units
    expect(passwordLength(family)).toBe(1);
    expect(passwordLength(`abcdefg${family}`)).toBe(8);
    expect(estimate(`abcdef${family}`, []).strength).toBe("short"); // 7 characters though 13 code points
  });

  it.each([
    [0, "weak"],
    [1, "weak"],
    [2, "good"],
    [3, "good"],
    [4, "strong"],
  ] as const)("score %i is %s", (score, strength) => {
    expect(strengthOf(score)).toBe(strength);
  });

  it.each([
    ["password1", "weak"], // score 0
    ["Rummage#4", "weak"], // score 1
    ["Summer2024!", "good"], // score 2: Clerk's line
    ["tidal-rummage", "good"], // score 3
    ["copper fox casts ninety", "strong"], // score 4
  ] as const)("%s reads %s", (pw, strength) => {
    expect(estimate(pw, Q1).strength).toBe(strength);
  });
});

describe("agreement with Clerk", () => {
  const refused = fixture.rows.filter((r) => r.source === "clerk-dev" && r.clerk === "form_password_not_strong_enough");

  it("has refused passwords to check", () => {
    expect(refused.length).toBeGreaterThan(0);
  });

  it.each(refused.map((r) => [r.password, r.inputs] as const))("%s, refused as weak, never shows Good or Strong", (pw, inputs) => {
    expect(["short", "weak"]).toContain(estimate(pw, [...inputs]).strength);
  });

  it("pins Summer2024! at its real behavior: Good, the third guide open, breached on the press", () => {
    expect(drawn("Summer2024!", Q1)).toBe("good lm");
    expect(fixture.rows.find((r) => r.password === "Summer2024!")?.clerk).toBe("form_password_pwned");
  });
});

describe("the third guide stays open for common patterns", () => {
  it.each([
    ["colinmtg", "the player's name"],
    ["colin@example", "the player's address"],
    ["sunflower", "a dictionary word alone"],
    ["password1", "a common password"],
    ["P@ssw0rd", "a common password in l33t"],
    ["January1994", "a date"],
    ["12/05/1994", "a date"],
    ["colin1994", "a name and a year"],
    ["Summer2024!", "a recent year"],
    ["dragon2020", "a recent year"],
    ["qwertyuiop", "a keyboard run"],
    ["asdfghjkl;", "a keyboard run"],
    ["abcdefgh1", "a sequence"],
    ["aaaaaaaa", "a repeat"],
    ["abcabcabc", "a repeated pattern"],
  ])("%s (%s)", (pw) => {
    expect(estimate(pw, Q1).guides.common).toBe(false);
    expect(estimate(pw, K5).guides.common).toBe(false);
  });

  // Each of these raises no estimator warning and trips only its own check, so deleting that check ticks it. `Rummage` is a
  // diceware word that is not on the common-password list.
  it("holds open on a date alone (Rummage#4/7/12: no warning, no year)", () => {
    expect(drawn("Rummage#4/7/12", Q1)).toBe("good lm");
  });

  it("holds open on a recent year alone (Rummage#x2001: no warning, no date)", () => {
    expect(drawn("Rummage#x2001", Q1)).toBe("good lm");
  });

  it("holds open on a 3-letter name, but not a 2-letter one", () => {
    expect(estimate("Rummage#Bob9", ["Bob", "bob@example.com"]).guides.common).toBe(false);
    expect(estimate("Rummage#Al9", ["Al", "al@example.com"]).guides.common).toBe(true);
  });

  it("holds open on each part of the address's local part", () => {
    expect(userInputs(["colin.smith@example.com"])).toEqual(["colin.smith@example.com", "colin.smith", "colin", "smith"]);
    expect(estimate("smith1990!", ["colin.smith@example.com"]).guides.common).toBe(false);
    expect(estimate("Rummage#smith9", ["colin.smith@example.com"]).guides.common).toBe(false); // the name alone
    expect(estimate("Rummage#smith9", Q1).guides.common).toBe(true);
  });

  // A common password making up half the password, with no warning, no date and no name (orchestrator ruling A, 2026-11-15).
  it.each(["Strawberry!123", "Sweetheart!123", "Christmas!123", "HelloWorld@123", "Chocolate@123", "Pineapple@123"])(
    "holds open on a common password with a suffix: %s",
    (pw) => {
      expect(drawn(pw, Q1)).toBe("good lm");
    },
  );

  it("reads l33t when matching the common-password list", () => {
    expect(estimate("Str4wb3rry!123", Q1).guides.common).toBe(false);
  });

  it("does not hold open for a passphrase of plain words, though copper is a common password", () => {
    expect(estimate("copper fox casts ninety", Q1).guides.common).toBe(true);
    expect(estimate("violet anchor drifts slowly", Q1).guides.common).toBe(true);
  });

  it("reads an address's local part as the player's name on K5", () => {
    expect(userInputs(K5)).toEqual(["colin@example.com", "colin"]);
    expect(userInputs(["colin+clerk_test@example.com"])).toEqual(["colin+clerk_test@example.com", "colin+clerk_test", "colin", "clerk", "test"]);
    expect(drawn("colinmtg", K5)).toBe("weak l");
  });
});

describe("the drawn samples (Main.dc.html, K5.dc.html)", () => {
  it.each([
    ["colin9", "short m"], // U, Q2
    ["colinmtg", "weak l"], // W (Clerk accepts it, so it cannot stand in Q3)
    ["sunflower", "weak l"], // Q3: swapped in for colinmtg, which Clerk accepts; Clerk refuses this as not strong enough
    ["password1", "weak lm"], // W·c
    ["colin1994", "weak lm"], // W·d
    ["Rummage#4", "weak lmc"], // W·all: swapped in for Kq#7mzpa, which scores 2 (Kettle#4 first: kettle is a common password)
    ["tidal-rummage", "good lmc"], // G
    ["copper fox casts ninety", "strong lc"], // S
    ["Strawberry!123", "good lm"], // Q4: breached on the press; no breached sample ticks all three guides
  ])("%s draws %s", (pw, reading) => {
    expect(drawn(pw, Q1)).toBe(reading);
  });

  it("Clerk answers the Q-frame samples as drawn", () => {
    const clerk = (pw: string) => fixture.rows.find((r) => r.password === pw && r.source === "clerk-dev")?.clerk;
    expect(clerk("colin9")).toBe("form_password_length_too_short"); // Q2
    expect(clerk("sunflower")).toBe("form_password_not_strong_enough"); // Q3
    expect(clerk("colinmtg")).toBe("accepted"); // why Q3 swapped
    expect(clerk("Rummage#4")).toBe("form_password_not_strong_enough"); // W·all: weak, and Clerk agrees
    expect(clerk("Strawberry!123")).toBe("form_password_pwned"); // Q4: breached
  });

  it("the swapped-out samples do not reproduce their frames", () => {
    expect(drawn("Kq#7mzpa", Q1)).toBe("good lmc"); // drawn Weak with all three ticked
    expect(drawn("Trombone#47x", Q1)).toBe("good lm"); // drawn Good with all three ticked
    expect(drawn("Kettle#4", Q1)).toBe("weak lm"); // the first W·all swap, before the common-password rule
  });

  it("K5 draws the same", () => {
    for (const pw of ["colin9", "password1", "colin1994", "Rummage#4", "tidal-rummage", "copper fox casts ninety", "Strawberry!123"]) {
      expect(drawn(pw, K5)).toBe(drawn(pw, Q1));
    }
  });
});

describe("errs weak", () => {
  it("an empty password reads short with every guide open", () => {
    expect(estimate("", Q1)).toEqual({ strength: "short", commonOk: false, guides: { length: false, numberOrSymbol: false, common: false } });
  });

  it("commonOk mirrors the third guide", () => {
    for (const pw of ["Rummage#4", "Summer2024!", "copper fox casts ninety"]) {
      const r = estimate(pw, Q1);
      expect(r.commonOk).toBe(r.guides.common);
    }
  });
});
