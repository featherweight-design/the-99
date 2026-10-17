// The masked name, email and initials /admin draws for every person (Admin R3, D1, D2, D4).
import { describe, expect, it } from "vitest";
import { maskEmail, maskInitials, maskName } from "./mask";

const user = (firstName: string | null, lastName: string | null, username: string | null = null, id = "user_2abc9xQe") =>
  ({ id, firstName, lastName, username });

describe("maskName", () => {
  it("is the first name and the last name's initial", () => {
    expect(maskName(user("Colin", "Reyes"))).toEqual({ name: "Colin R.", named: true });
  });

  it("keeps a one-word name whole", () => {
    expect(maskName(user("Cher", null))).toEqual({ name: "Cher", named: true });
  });

  it("takes the first letter of an accented or multi-word last name, never the whole of it", () => {
    expect(maskName(user("José", "Ñúñez")).name).toBe("José Ñ.");
    expect(maskName(user("Ana", "de la Cruz")).name).toBe("Ana D.");
  });

  it("falls to the username when there is no first name, so a last name never shows whole", () => {
    expect(maskName(user(null, "Reyes", "chrisplays"))).toEqual({ name: "chrisplays", named: true });
  });

  it("is the id's last four when Clerk holds neither, and is marked as no name", () => {
    expect(maskName(user(null, null))).toEqual({ name: "Account ·9xQe", named: false });
    expect(maskName(user("  ", " ", " "))).toEqual({ name: "Account ·9xQe", named: false });
  });
});

describe("maskEmail", () => {
  it("keeps the first letters of the mailbox and the domain, and the domain from its last dot", () => {
    expect(maskEmail("colin@gmail.com")).toBe("c•••@g•••.com");
    expect(maskEmail("m@p.me")).toBe("m•••@p•••.me");
    expect(maskEmail("a+x@mail.co.uk")).toBe("a•••@m•••.uk");
  });

  it("case-folds", () => {
    expect(maskEmail("Colin@Gmail.COM")).toBe("c•••@g•••.com");
  });

  it("masks a domain with no dot to its first letter", () => {
    expect(maskEmail("root@localhost")).toBe("r•••@l•••");
  });
});

describe("maskInitials", () => {
  it("comes from the masked name, so it shows no letter the name does not", () => {
    expect(maskInitials("Colin R.", true)).toBe("CR");
    expect(maskInitials("chrisplays", true)).toBe("CH");
  });

  it("is null for an account with no name: the diamond is drawn instead", () => {
    expect(maskInitials("Account ·9xQe", false)).toBeNull();
  });
});
