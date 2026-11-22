// Proves the admin "Send to me" email-preview button (/admin/invites, Email previews card) at 390 and 1300, with Resend STUBBED.
//
// The dev server is started with `NODE_OPTIONS="--require ./scripts/lib/resend-stub.cjs"`, `RESEND_STUB_LOG=<file>`, a stub
// Resend configuration (`RESEND_API_KEY=re_stub…`, `INVITE_EMAIL_FROM`, `INVITE_CODE_SECRET`, `APP_ORIGIN=http://localhost`) and
// `ADMIN_USER_IDS` naming the audit account (with `ADMIN_ENV_LABEL` set). At each width the probe presses Send to me and checks that
// three mails reach the stub, all to the audit account's own address, every subject starting "[Preview]", one per template
// (invite, code, launch); that the card's line says three of three and names Clerk's own emails as excluded; that a second press at
// once draws the cooldown line and sends nothing more (the cooldown is checked before the first send); and that the button is a 44px
// target with no horizontal scroll. On main the card does not exist, so every step fails.
//
// It writes only the audit account's own `admin-mail-preview` and recipient `rate_hits` rows (cleared before each width and after)
// plus the day's global mail count by its own six sends, so it refuses production and staging (`assertNotSharedBranch`).
//
//   PROBE_BASE=http://localhost:3313 RESEND_STUB_LOG=/path/stub.log pnpm probe:admin-email-preview
import "./lib/env.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const LOG = process.env.RESEND_STUB_LOG;
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only (http://localhost:3313)`);
  }
  if (!LOG) throw new Error("set RESEND_STUB_LOG to the log file the dev server's resend stub appends to");
}
const sql = neon(DATABASE_URL);
const branch = ((await sql`select current_setting('neon.branch_id', true) as b`) as { b: string | null }[])[0]?.b ?? null;
assertNotSharedBranch(branch, "probe:admin-email-preview");

let failures = 0;
function report(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` - ${detail}` : ""}`);
  if (!ok) failures += 1;
}

const lines = () => readFileSync(LOG!, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as { to: string[]; subject: string; template: string | null });

async function adminId(): Promise<string> {
  const res = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(EMAIL)}`, { headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` } });
  const users = (await res.json()) as { id: string }[];
  if (!users[0]?.id) throw new Error("Clerk does not know E2E_AUDIT_USER_EMAIL");
  return users[0].id;
}

async function signIn(page: import("playwright").Page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const clerk = (window as unknown as { Clerk: any }).Clerk;
      let attempt = await clerk.client.signIn.create({ identifier: email });
      const factor = attempt.supportedFirstFactors?.find((f: { strategy: string }) => f.strategy === "email_code");
      if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
      await clerk.client.signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      attempt = await clerk.client.signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error: any) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const { recipientKey } = await import("../src/lib/invites/mail-limits");
const admin = await adminId();
const clear = async () => {
  await sql`delete from rate_hits where (user_id = ${admin} and bucket = 'admin-mail-preview') or (user_id = ${recipientKey(EMAIL)} and bucket in ('mail-recipient', 'mail-recipient-day'))`;
};

writeFileSync(LOG, "");
await clerkSetup();
const browser = await chromium.launch();
try {
  for (const [width, height] of [[390, 844], [1300, 900]] as const) {
    const tag = `${width}`;
    await clear();
    const before = lines().length;
    const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
    try {
      await signIn(page);
      await page.goto(`${BASE}/admin/invites`, { waitUntil: "domcontentloaded" });
      const button = page.locator('[data-testid="email-preview-send"]');
      await button.waitFor({ state: "visible", timeout: 30_000 }).catch(async (e) => { console.log(await page.evaluate(() => document.body.innerText.slice(0, 300)).catch(() => "?")); throw e; });
      const box = await button.boundingBox();
      report(`${tag}: Send to me is a 44px target`, (box?.height ?? 0) >= 44, `${box?.height}`);
      report(`${tag}: no horizontal scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      // A click before hydration does nothing: wait for the page to settle, then press once (a second real press would hit the cooldown).
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(3000);
      await button.click();
      const line = page.locator('[data-testid="email-preview-line"]');
      await line.waitFor({ state: "visible", timeout: 60_000 });
      const text = (await line.textContent()) ?? "";
      report(`${tag}: the line says 3 of 3 and names Clerk's emails as excluded`, /Sent 3 of 3/.test(text) && /Clerk/.test(text), text);
      const sent = lines().slice(before);
      report(`${tag}: three mails reached the stub`, sent.length === 3, `${sent.length}`);
      report(`${tag}: every mail is to the admin's own address`, sent.every((m) => m.to.length === 1 && m.to[0].toLowerCase() === EMAIL.toLowerCase()));
      report(`${tag}: every subject starts [Preview]`, sent.length > 0 && sent.every((m) => m.subject.startsWith("[Preview] ")));
      report(`${tag}: one per template`, ["invite", "code", "launch"].every((t) => sent.some((m) => m.template === t)), sent.map((m) => m.template).join(","));
      await button.click();
      await page.waitForFunction(() => /Try again in/.test(document.querySelector('[data-testid="email-preview-line"]')?.textContent ?? ""), null, { timeout: 30_000 }).catch(() => {});
      const again = (await line.textContent()) ?? "";
      report(`${tag}: a second press draws the cooldown line`, /Try again in/.test(again), again);
      report(`${tag}: the second press sent nothing`, lines().slice(before).length === 3);
    } catch (error) {
      console.log(await page.locator('[data-testid="email-preview-card"]').innerText().catch(() => "no card"));
      report(`${tag}: the card draws and works`, false, error instanceof Error ? error.message.split("\n")[0] : String(error));
    } finally {
      await page.context().close();
    }
  }
} finally {
  await clear();
  await browser.close();
}
console.log(failures === 0 ? "\nall passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
