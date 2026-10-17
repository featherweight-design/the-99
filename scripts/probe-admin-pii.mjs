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

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
// Read-only: the waiting invites and the switch with an account override, from the database the server reads.
const sql = neon(DATABASE_URL);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

/**
 * Whether `text` holds the value `n` as a whole word: a last name inside markup (`king` in `tracking-[0.16em]`,
 * `white` in `whitespace-nowrap`) is not a leak, and a letter on either side means it is part of another word.
 */
function holds(text, n) {
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}_-])${escaped}(?![\\p{L}\\p{N}_-])`, "u").test(text);
}
// The matcher's own regression cases, checked before anything is trusted to it.
for (const [text, n, want] of [
  ["class=\"tracking-[0.16em]\"", "king", false],
  ["whitespace-nowrap", "white", false],
  ["\"name\":\"colin king\"", "king", true],
  ["mailto:colin@gmail.com\"", "colin@gmail.com", true],
  ["xcolin@gmail.com", "colin@gmail.com", false],
]) {
  if (holds(text, n) !== want) throw new Error(`probe:admin-pii: the matcher answers ${!want} for ${n} in ${text}`);
}

/** What must never reach a page before a Show: every Clerk user's whole email and last name, and every waiting invite's address. */
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
    if (data.length < 500) break;
  }
  // A waiting invite's recipient is masked always and never revealable (D9, G2).
  for (const r of await sql`select email from invite_reservations where state in ('claimed', 'reserved') and email is not null`) {
    out.add(r.email.toLowerCase());
  }
  return [...out];
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

await clerkSetup();
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
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    report(`${path} loads`, Boolean(res?.ok()) && !page.url().includes("sign-in") && (await page.locator("main").count()) > 0, String(res?.status()));
    await open();
    await page.waitForLoadState("networkidle");
    // What the page drew, pickers opened, as well as what it was sent.
    bodies.push({ route, url: page.url(), text: (await page.content()).toLowerCase() });
    // The route's RSC flight as a client navigation fetches it, which a document load only inlines.
    const flight = await page.request.get(`${BASE}${path}`, { headers: { RSC: "1" } });
    const type = flight.headers()["content-type"] ?? "";
    report(`${path} answers an RSC flight`, flight.ok() && type.includes("text/x-component"), `${flight.status()} ${type}`);
    bodies.push({ route, url: `${BASE}${path}?rsc`, text: (await flight.text()).toLowerCase() });
  };

  await visit("/admin/accounts");
  // Every account page: each head, Invites and History names someone different.
  const accounts = [...new Set(await onPage(page, "a[href^='/admin/accounts/']").evaluateAll((as) => as.map((a) => a.getAttribute("href"))))];
  report("accounts to open", accounts.length > 1, String(accounts.length));
  for (const href of accounts) await visit(href);
  await visit("/admin/invites");
  await visit("/admin/groups");
  // A saved group (members, pending and history) and a new one: the editor's member picker is drawn open in both.
  const group = await onPage(page, "a[href^='/admin/groups/']:not([href='/admin/groups/new'])").first().getAttribute("href");
  for (const href of [group, "/admin/groups/new"]) {
    if (!report(`a group to open (${href})`, Boolean(href))) continue;
    await visit(href, async () => {
      report("the group editor lists its member picker", (await onPage(page, "[data-testid='group-members'] button").count()) > 0);
    });
  }
  await visit("/admin/switches");
  // The switch carrying an account override, so its override row, sub and history are drawn.
  // ALL_FEATURES is an account override but not a switch page (its route is a 404), so it is never the one opened.
  const [held] = await sql`select switch from flag_overrides where scope = 'user' and switch <> 'ALL_FEATURES' order by switch limit 1`;
  report("a switch carries an account override (seed:admin-pii-fixture)", Boolean(held));
  const sw = held ? `/admin/switches/${held.switch}` : await onPage(page, "a[href^='/admin/switches/']").first().getAttribute("href");
  if (report("a switch to open", Boolean(sw))) {
    await visit(sw, async () => {
      await onPageRole(page, "button", /Add an account override/).first().click();
      report("the override picker opens", await onPageRole(page, "searchbox", /Find an account by name/).first().isVisible());
      // Check an account is a native select: its choices are already in the page; picking one reads, never writes.
      const check = onPageRole(page, "combobox", /Check an account/).first();
      report("Check an account offers accounts", (await check.locator("option").count()) > 1);
      await check.selectOption({ index: 1 });
    });
  }
  // Costs: the month view at /admin, the per-model view at /admin/models.
  await visit("/admin", async () => {
    // Costs per account names each account masked, never by its Clerk id (Admin R3, C5).
    const table = onPageRole(page, "table", /Per account/).first();
    const cells = await table.locator("tbody tr").count();
    const text = await table.innerText();
    report("Costs per account lists accounts by masked name, no Clerk id", cells > 0 && !/\buser_[A-Za-z0-9]{6,}/.test(text), `${cells} rows`);
  });
  await visit("/admin/models");

  for (const n of find) {
    // The shell's account menu names the signed-in reader to themself on every page (`shell.ts` triggerLabel). That
    // one label is the reader's own identity, not a listed account; anywhere else, the owner row included, it counts.
    const own = `account: ${EMAIL.toLowerCase()}`;
    const hits = bodies.filter((b) => holds(n === EMAIL.toLowerCase() ? b.text.replaceAll(own, "") : b.text, n));
    report(`no response carries ${n.includes("@") ? "an email" : "a last name"} (${n.slice(0, 2)}…)`, hits.length === 0,
      hits.map((h) => `${h.route} ${new URL(h.url).pathname}`).slice(0, 3).join(", "));
    // Where the first hit sits, the value itself blanked, so a failure says what drew it without printing it.
    if (hits.length) {
      const text = n === EMAIL.toLowerCase() ? hits[0].text.replaceAll(own, "") : hits[0].text;
      const at = text.indexOf(n);
      console.log(`       near: ${text.slice(Math.max(0, at - 160), at + n.length + 80).replaceAll(n, "[value]")}`);
    }
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nprobe:admin-pii passed" : `\nprobe:admin-pii: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
