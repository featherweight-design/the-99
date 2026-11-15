import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLERK_OTP, clerkEmailParts } from "./clerk-mail";

describe("clerkEmailParts", () => {
  for (const kind of ["signIn", "reset"] as const) {
    const m = clerkEmailParts(kind, "https://the-99.dev");

    it(`${kind}: puts Clerk's code variable once in the box and once on its own line of the text, unescaped`, () => {
      expect(m.html.match(/\{\{otp_code\}\}/g)).toHaveLength(1);
      expect(m.html).toContain(`>${CLERK_OTP}</p>`);
      expect(m.text.split("\n")).toContain(CLERK_OTP);
      expect(m.subject).toContain(CLERK_OTP);
    });

    it(`${kind}: names the ten-minute window and what to do when it was not asked for`, () => {
      expect(m.html + m.text).toMatch(/expires in 10 minutes/);
      expect(m.html + m.text).toMatch(/ignore this email/);
    });

    it(`${kind}: is the shell, from the origin it is given, with straight quotes in the text and no em dash`, () => {
      expect(m.html).toContain('src="https://the-99.dev/email/mark-112@2x.png"');
      expect(m.text).not.toMatch(/[’‘“”]/);
      expect(m.html + m.text + m.subject).not.toMatch(/—|\bPress\b/);
      expect(clerkEmailParts(kind, "https://staging.example.dev").html).not.toContain("https://the-99.dev");
    });
  }

  it("carries no other brace pair: Clerk parses braces, so one stray pair breaks the template", () => {
    for (const kind of ["signIn", "reset"] as const) {
      const m = clerkEmailParts(kind, "https://the-99.dev");
      for (const part of [m.html, m.text, m.subject]) expect(part.replaceAll(CLERK_OTP, "")).not.toMatch(/\{\{|\}\}/);
    }
  });

  it("is what is committed: the production files equal the builder's output, so a copy or shell edit cannot ship stale templates", () => {
    const files = { signIn: "sign-in-code", reset: "reset-password-code" } as const;
    for (const kind of ["signIn", "reset"] as const) {
      const m = clerkEmailParts(kind, "https://the-99.dev");
      const read = (ext: string) => readFileSync(join(process.cwd(), "docs/clerk-email-templates/production", `${files[kind]}.${ext}`), "utf8");
      expect(read("html"), `${kind}.html (run pnpm gen:clerk-templates)`).toBe(m.html);
      expect(read("txt"), `${kind}.txt`).toBe(m.text);
      expect(read("subject.txt"), `${kind}.subject.txt`).toBe(`${m.subject}\n`);
    }
  });

  it("does not carry its own variable in the document title", () => {
    expect(clerkEmailParts("signIn", "https://the-99.dev").html).toContain("<title>Your sign-in code for The 99</title>");
  });
});
