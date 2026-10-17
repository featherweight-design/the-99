// probe:admin-pii (Admin R3, rulings 1 and 4): no admin page sends a whole name or email before a Show.
//
// Signs in as the audit account, which the server's ADMIN_USER_IDS must name (and ADMIN_ENV_LABEL must be set), then
// loads every admin route, opens each picker (the group editor's members, a switch's Add an account override and
// Check an account), and keeps the body of every same-origin document, RSC and action response. It reads Clerk's own
// users from the instance CLERK_SECRET_KEY names and fails when any response holds one's whole email or last name
// (three letters or more; a first name is the masked name's own first word, D1). Read-only: it presses nothing that
// writes, and it never presses Show.
//
//   PROBE_BASE=http://localhost:3313 pnpm probe:admin-pii
//
// Point it at `next start`, never `next dev` (dev overlays add bodies of their own).

import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

/** What must never reach a page before a Show: every Clerk user's whole email and last name. */
async function needles() {
  const out = new Set();
  for (let offset = 0; ; offset += 500) {
    // Clerk's Backend API directly: the SDKs resolve only inside the Next build.
    const res = await fetch(`https://api.clerk.com/v1/users?limit=500&offset=${offset}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
    });
    if (!res.ok) throw new Error(`Clerk listed no users: ${res.status}`);
    const data = await res.json();
    for (const u of data) {
      for (const e of u.email_addresses ?? []) out.add(e.email_address.toLowerCase());
      if (u.last_name && u.last_name.trim().length >= 3) out.add(u.last_name.trim().toLowerCase());
    }
    if (data.length < 500) return [...out];
  }
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const browser = await chromium.launch();
try {
  const find = await needles();
  report("Clerk listed users to check against", find.length > 0, `${find.length} values`);
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  await signIn(page);

  /** Every same-origin response body on the current route, by route. */
  const bodies = [];
  let route = "";
  page.on("response", async (res) => {
    if (!res.url().startsWith(BASE)) return;
    const type = res.headers()["content-type"] ?? "";
    if (!/text\/html|text\/x-component|application\/json|text\/plain/.test(type)) return;
    try {
      bodies.push({ route, url: res.url(), text: (await res.text()).toLowerCase() });
    } catch {
      // A redirect or an aborted request has no body to read.
    }
  });

  const visit = async (path, open = async () => {}) => {
    route = path;
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    report(`${path} loads`, !page.url().includes("sign-in") && (await page.locator("main").count()) > 0);
    await open();
    await page.waitForLoadState("networkidle");
  };

  await visit("/admin/accounts");
  const account = await onPage(page, "a[href^='/admin/accounts/']").first().getAttribute("href");
  if (report("an account to open", Boolean(account))) await visit(account);
  await visit("/admin/invites");
  await visit("/admin/groups");
  const group = await onPage(page, "a[href^='/admin/groups/']").first().getAttribute("href");
  if (report("a group to open", Boolean(group))) await visit(group);
  await visit("/admin/switches");
  const sw = await onPage(page, "a[href^='/admin/switches/']").first().getAttribute("href");
  if (report("a switch to open", Boolean(sw))) {
    await visit(sw, async () => {
      await onPageRole(page, "button", /Add an account override/).first().click();
      await onPageRole(page, "combobox", /Check an account/).first().click().catch(() => {});
    });
  }
  await visit("/admin/costs");

  for (const n of find) {
    const hits = bodies.filter((b) => b.text.includes(n));
    report(`no response carries ${n.includes("@") ? "an email" : "a last name"} (${n.slice(0, 2)}…)`, hits.length === 0,
      hits.map((h) => `${h.route} ${new URL(h.url).pathname}`).slice(0, 3).join(", "));
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nprobe:admin-pii passed" : `\nprobe:admin-pii: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
