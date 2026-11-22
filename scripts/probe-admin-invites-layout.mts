// Proves the /admin/invites sections share one column and one gap at 390 and 1300: the Launch email and Email previews cards sit
// on the same left and right edges as the Flyer codes table (or, with the flyer switch off, the invite tree's padded column), and
// the two cards are 12px apart, not touching. Before the fix the cards were bare siblings of the padded sections: they ran to
// the column's outer edges (28px wider each side on desktop) and touched.
//
// Signs in as the audit account, which must be named in `ADMIN_USER_IDS` with `ADMIN_ENV_LABEL=staging` on the
// dev server. Writes nothing.
//
//   PROBE_BASE=http://localhost:3313 pnpm probe:admin-invites-layout
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only (http://localhost:3313)`);
  }
}

type Edge = { l: number; r: number; t: number; b: number };
let failures = 0;
function report(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` - ${detail}` : ""}`);
  if (!ok) failures += 1;
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

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const [width, height] of [[390, 844], [1300, 900]] as const) {
    const tag = `${width}`;
    const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
    try {
      await signIn(page);
      await page.goto(`${BASE}/admin/invites`, { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="launch-email-card"]').waitFor({ state: "visible", timeout: 60_000 });
      await page.locator('[data-testid="email-preview-card"]').waitFor({ state: "visible", timeout: 30_000 });
      // A string, not a function: tsx's keepNames wraps inner arrows in `__name`, which does not exist in the page.
      const m = (await page.evaluate(`(() => {
        const edges = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) };
        };
        const launch = document.querySelector('[data-testid="launch-email-card"]');
        const preview = document.querySelector('[data-testid="email-preview-card"]');
        let ref = document.querySelector('[data-testid="launch-list-card"]');
        let refName = "the Flyer codes table";
        let refEdges = edges(ref);
        if (!ref) {
          // With the flyer switch off the reference is the invite tree's padded column: its root's content box.
          const root = document.querySelector('[data-testid="invite-tree-counts"]')?.closest("div.flex-col");
          if (root) {
            const r = root.getBoundingClientRect();
            const cs = getComputedStyle(root);
            refEdges = { l: Math.round(r.left + parseFloat(cs.paddingLeft)), r: Math.round(r.right - parseFloat(cs.paddingRight)), t: 0, b: 0 };
          }
          refName = "the invite tree's column";
        }
        return { launch: edges(launch), preview: edges(preview), ref: refEdges, refName, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth };
      })()`)) as { launch: Edge | null; preview: Edge | null; ref: Edge | null; refName: string; scrollW: number; innerW: number };
      const { launch, preview, ref } = m;
      report(`${tag}: no horizontal scroll`, m.scrollW <= m.innerW);
      if (ref) {
        report(`${tag}: Launch email shares ${m.refName}'s left and right edge`, launch?.l === ref.l && launch?.r === ref.r, `${launch?.l}..${launch?.r} vs ${ref.l}..${ref.r}`);
        report(`${tag}: Email previews shares ${m.refName}'s left and right edge`, preview?.l === ref.l && preview?.r === ref.r, `${preview?.l}..${preview?.r} vs ${ref.l}..${ref.r}`);
      } else {
        report(`${tag}: a reference card is on the page`, false, "neither the Flyer codes table nor a tree row drew");
      }
      const gap = launch && preview ? preview.t - launch.b : -1;
      report(`${tag}: the two cards are 12px apart`, gap === 12, `${gap}px`);
    } catch (error) {
      report(`${tag}: the page draws`, false, error instanceof Error ? error.message.split("\n")[0] : String(error));
    } finally {
      await page.context().close();
    }
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nall passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
