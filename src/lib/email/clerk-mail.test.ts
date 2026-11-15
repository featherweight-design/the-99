import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLERK_OTP, clerkEmailParts } from "./clerk-mail";
import { BRASS, INK } from "./shell";

describe("clerkEmailParts", () => {
  for (const kind of ["signIn", "reset"] as const) {
    const m = clerkEmailParts(kind, "https://the-99.dev");

    it(`${kind}: puts Clerk's code variable once in its own <re-text> (as Clerk's default does) and once on its own line of the text`, () => {
      expect(m.html).toMatch(/<re-text [^>]*>\s*<span [^>]*>\{\{otp_code\}\}<\/span>\s*<\/re-text>/);
      expect(m.html.match(/\{\{otp_code\}\}/g)).toHaveLength(2); // the title carries it too, as Clerk's default does
      expect(m.text.split("\n")).toContain(CLERK_OTP);
      expect(m.subject).toContain(CLERK_OTP);
    });

    it(`${kind}: names the ten-minute window and what to do when it was not asked for`, () => {
      expect(m.html + m.text).toMatch(/expires in 10 minutes/);
      expect(m.html + m.text).toMatch(/ignore this email/);
    });

    it(`${kind}: is Revolvapp markup only, in the shell's palette, with no em dash and straight quotes in the text`, () => {
      // Clerk's editor refuses anything but its own elements: no tables, no <html>, no <img>.
      expect(m.html.startsWith("<re-html>")).toBe(true);
      expect(m.html).not.toMatch(/<(table|td|tr|p|img|div|html|body)[\s>]/i);
      const tags = new Set([...m.html.matchAll(/<(\/?)([a-z][a-z0-9-]*)/g)].map((t) => t[2]));
      for (const tag of tags) expect(["re-html", "re-head", "re-title", "re-body", "re-preheader", "re-header", "re-main", "re-block", "re-heading", "re-text", "re-image", "re-grid", "re-column", "re-footer", "re-divider", "span", "a", "br"], tag).toContain(tag);
      expect(m.html).toContain(`background-color="${INK}"`);
    });

    it(`${kind}: matches the drawn code email: the hosted mark centred, a brass rule, the brass-bordered code box, the diamonds and the flavor line`, () => {
      expect(m.html).toContain('<re-image src="https://the-99.dev/email/mark-112@2x.png"');
      expect(m.html).toContain(`<re-divider background-color="${BRASS}" height="3px">`);
      expect(m.html).toContain(`border="1px solid ${BRASS}" border-radius="10px"`);
      expect(m.html).toContain("&#9670;&#9670;&#9670;");
      expect(m.html).toContain("Search your library for a commander.");
      expect(m.html).not.toContain("app_logo");
      expect(clerkEmailParts(kind, "https://staging.example.dev").html).not.toContain("https://the-99.dev");
      expect(m.text).not.toMatch(/[’‘“”]/);
      expect(m.html + m.text + m.subject).not.toMatch(/—|\bPress\b/);
    });
  }

  it("carries no brace pair but Clerk's code variable: one stray pair breaks the template", () => {
    for (const kind of ["signIn", "reset"] as const) {
      const m = clerkEmailParts(kind, "https://the-99.dev");
      for (const part of [m.html, m.text, m.subject]) {
        expect(part.replaceAll(CLERK_OTP, "")).not.toMatch(/\{\{|\}\}/);
      }
      expect(m.text + m.subject).not.toMatch(/\{\{(?!otp_code)/);
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

  it("titles the document with the subject, as Clerk's default title carries the code", () => {
    expect(clerkEmailParts("signIn", "https://the-99.dev").html).toContain("<re-title>\n        Your sign-in code for The 99: {{otp_code}}");
  });
});
