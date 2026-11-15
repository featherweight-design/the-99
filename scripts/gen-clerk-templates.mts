// gen:clerk-templates [origin]: writes Clerk's two code emails (sign-in code, password reset code) as files Hugh pastes into Clerk's
// dashboard, into `docs/clerk-email-templates/`: `<kind>.html`, `<kind>.txt` and `<kind>.subject.txt`, with Clerk's `{{otp_code}}`
// where the code goes and every URL built from the origin (default https://the-99.dev; run it again with the staging origin for the
// staging Clerk instance, into its own folder). Pure file work: no network, no database, no `.env`. The words are
// `clerkEmailCopy` in `src/lib/copy/emails.ts`, the markup is the shell's, so the two never drift from our own mails.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { clerkEmailParts, type ClerkTemplateKind } from "../src/lib/email/clerk-mail";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const origin = (process.argv[2] ?? "https://the-99.dev").replace(/\/$/, "");
if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origin)) throw new Error("origin must be a bare https origin");
const outDir = join(ROOT, "docs/clerk-email-templates", process.argv[3] ?? "production");
mkdirSync(outDir, { recursive: true });

const FILES: Record<ClerkTemplateKind, string> = { signIn: "sign-in-code", reset: "reset-password-code" };
for (const kind of Object.keys(FILES) as ClerkTemplateKind[]) {
  const { subject, html, text } = clerkEmailParts(kind, origin);
  writeFileSync(join(outDir, `${FILES[kind]}.html`), html);
  writeFileSync(join(outDir, `${FILES[kind]}.txt`), text);
  writeFileSync(join(outDir, `${FILES[kind]}.subject.txt`), `${subject}\n`);
  console.log(`${FILES[kind]} (${origin})`);
}
