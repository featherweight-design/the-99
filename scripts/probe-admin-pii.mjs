// probe:admin-pii (Admin R3, rulings 1 and 4): no admin page sends a whole name or email before a Show.
//
// Signs in as the audit account, which the server's ADMIN_USER_IDS must name (and ADMIN_ENV_LABEL must be set), then
// loads every admin route, opens each picker (the group editor's members, a switch's Add an account override and
// Check an account), and keeps the body of every same-origin document, RSC and action response. It reads Clerk's own
// users from the instance CLERK_SECRET_KEY names and fails when any response holds one's whole email or last name
// (three letters or more; a first name is the masked name's own first word, D1). Then it presses Show once, on one
// account page (D5 to D8): the whole email reaches the browser in that action's response and nowhere else, one
// `account_revealed` event is written, Hide masks the head, and a reload draws the History line and no email. Then it
// presses Show a second time with the action's request aborted (A6): the toast, nothing revealed, nothing logged. The
// Shows are the probe's only writes, so it refuses any branch but a scratch one (`assertScratchBranch`) before them.
//
//   PROBE_BASE=http://localhost:3313 pnpm probe:admin-pii
//
// Point it at `next start`, never `next dev` (dev overlays add bodies of their own).

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
// Read-only: the waiting invites and the switch with an account override, from the database the server reads.
const sql = neon(DATABASE_URL);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// A local server only: the Show writes, and the branch check below reads the probe's own DATABASE_URL, which says
// nothing about a remote server's database. That server must run on this same scratch branch.
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "" || u.pathname !== "/") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only (http://localhost:3313)`);
  }
}
// Optional: a directory to photograph A6 (the failed Show) into, the one state the contact sheet cannot reach.
const SHOTS = process.env.PROBE_SHOTS;

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

/** One response's body, lower-cased, or null when it cannot be read within `ms`: a stalled body fails its check. */
async function readBody(responseP, ms = 15_000) {
  let timer;
  try {
    const res = await responseP;
    return await Promise.race([res.text().then((t) => t.toLowerCase()), new Promise((r) => (timer = setTimeout(() => r(null), ms)))]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
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
  // From the Show on, responses go here instead, so the needle check above them stays a check of the masked pages.
  let sink = bodies;
  // Each body is read asynchronously, so a check waits for the reads still in flight (`drain`) before it counts.
  const reading = new Map();
  // Bounded: a response that streams without end (a poll held open) must not hold the probe forever. A body still
  // unread after 10 seconds is reported, so a check never silently skips one.
  const drain = async () => {
    // The live set, not a snapshot: a read that settles, or a request that fails, leaves it.
    for (const end = Date.now() + 10_000; reading.size > 0 && Date.now() < end; ) await new Promise((r) => setTimeout(r, 100));
    if (reading.size > 0) report("every response body read before the check", false, [...reading.values()].map((r) => `${r.request.method()} ${new URL(r.url).pathname}${r.request.headers().rsc ? " (rsc)" : ""}`).join(", "));
  };
  page.on("response", (res) => {
    if (!res.url().startsWith(BASE)) return;
    const type = res.headers()["content-type"] ?? "";
    if (!/text\/html|text\/x-component|application\/json|text\/plain/.test(type)) return;
    // The sink as the response arrived: a check that switches it later still files this body where it belongs.
    const into = sink;
    const at = route;
    const read = res
      .text()
      .then((text) => into.push({ route: at, url: res.url(), method: res.request().method(), type, text: text.toLowerCase() }))
      // A redirect or an aborted request has no body to read.
      .catch(() => {})
      .finally(() => reading.delete(read));
    // A route outside /admin (the shell's Home link, prefetched) can stream on past any check; its body is still filed
    // if it ends, but no check waits on it. Every admin body is waited for, and one that never ends is reported.
    if (!new URL(res.url()).pathname.startsWith("/admin")) return;
    reading.set(read, { url: res.url(), request: res.request() });
  });
  // A request cancelled mid-body (a prefetch the router dropped) leaves a read that never settles; it has no body to
  // check, so it leaves the drain.
  page.on("requestfailed", (req) => {
    for (const [read, r] of reading) if (r.request === req) reading.delete(read);
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
    // Absent when the month has no player run: seed:admin-pii-fixture writes one.
    if (!report("Costs draws its per-account table (seed:admin-pii-fixture)", (await table.count()) > 0)) return;
    const cells = (await table.getByRole("row").count()) - 1;
    const text = await table.innerText();
    report("Costs per account lists accounts by masked name, no Clerk id", cells > 0 && !/\buser_[A-Za-z0-9]{6,}/.test(text), `${cells} rows`);
  });
  await visit("/admin/models");

  await drain();
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

  // The one Show (D5 to D8), on the first account page that offers one (not the owner's, not the viewer's own).
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  assertScratchBranch(branch, "probe:admin-pii's Show");
  let target = null;
  for (const href of accounts) {
    await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    if ((await onPageRole(page, "button", /^Show /).count()) > 0) {
      target = href;
      break;
    }
  }
  if (report("an account page offers Show", Boolean(target))) {
    const id = decodeURIComponent(target.split("/").pop());
    const user = await (await fetch(`https://api.clerk.com/v1/users/${id}`, { headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` } })).json();
    const email = (user.email_addresses ?? []).find((e) => e.id === user.primary_email_address_id)?.email_address?.toLowerCase();
    const [{ n: before }] = await sql`select count(*)::int as n from admin_events where kind = 'account_revealed' and user_id = ${id}`;
    const marks = onPage(page, "[data-testid='account-invites-history'] [data-reveal-mark]");
    const markedBefore = await marks.count();
    const shown = [];
    sink = shown;
    route = `${target} Show`;
    // The Show's own answer, read directly: a listener's body read can fail without a trace.
    const showP = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === new URL(`${BASE}${target}`).pathname, { timeout: 15_000 });
    await onPageRole(page, "button", /^Show /).filter({ visible: true }).first().click();
    const showAnswer = await readBody(showP);
    const head = onPage(page, "[data-testid='account-head'][data-revealed]");
    report("Show reveals the head", await head.waitFor({ timeout: 10_000 }).then(() => true, () => false));
    await page.waitForLoadState("networkidle");
    report("the revealed head draws the whole email and the Clerk id", Boolean(email) && (await head.innerText()).toLowerCase().includes(email) && (await head.innerText()).includes(id));
    await drain();
    // Every other response of the Show (the page's refresh among them) must not carry it.
    const others = shown.filter((b) => !(b.method === "POST" && b.text === showAnswer) && email && holds(b.text, email));
    report(
      "the whole email reaches the browser once, in the Show action's response",
      Boolean(email) && showAnswer !== null && holds(showAnswer, email) && others.length === 0,
      showAnswer === null ? "the answer was not read" : others.map((b) => `${b.method} ${new URL(b.url).pathname}`).join(", ") || "the action's answer only",
    );
    const [{ n: after }] = await sql`select count(*)::int as n from admin_events where kind = 'account_revealed' and user_id = ${id}`;
    report("the Show writes one account_revealed event", after === before + 1, `${before} then ${after}`);
    // D8: History draws THIS Show at once (one more marked line than before it), while the head stays revealed through
    // the page's refresh. A list already at its cap could not grow, so that is a fixture to reset, not a pass.
    report("History has room for one more line (reseed the scratch branch if not)", markedBefore < 100, `${markedBefore} marked`);
    let logged = false;
    for (let i = 0; i < 40 && !logged; i++) {
      logged = (await marks.count()) > markedBefore;
      if (!logged) await page.waitForTimeout(250);
    }
    report("History draws the Show's line without a reload, the head still revealed", logged && (await onPage(page, "[data-testid='account-head'][data-revealed]").count()) === 1);
    await onPageRole(page, "button", /^Hide /).filter({ visible: true }).first().click();
    report("Hide masks the head again", (await onPage(page, "[data-testid='account-head'][data-revealed]").count()) === 0 && !(await onPage(page, "[data-testid='account-head']").innerText()).toLowerCase().includes(email));
    const reloaded = [];
    sink = reloaded;
    route = `${target} reload`;
    await page.reload({ waitUntil: "networkidle" });
    report("a reload draws the Show in History with the diamond", (await onPage(page, "[data-testid='account-invites-history'] [data-reveal-mark]").count()) >= 1);
    await drain();
    report("a reload sends no whole email", !reloaded.some((b) => holds(b.text, email)) && !(await page.content()).toLowerCase().includes(email));

    // A6, D13: a Show that fails (here the action's request dies on the way) shows nothing and logs nothing; the
    // toast names the account masked and offers Try again.
    await page.goto(`${BASE}/admin/accounts`, { waitUntil: "networkidle" });
    const [{ n: atFail }] = await sql`select count(*)::int as n from admin_events where kind = 'account_revealed'`;
    await page.route(`${BASE}/admin/accounts`, (r) => (r.request().method() === "POST" ? r.abort() : r.fallback()));
    await onPageRole(page, "button", /^Show /).filter({ visible: true }).first().click();
    const toast = page.getByRole("alert").filter({ hasText: "Nothing was shown." });
    const raised = await toast.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    if (SHOTS) for (const [w, h, tag] of [[1300, 900, "desktop"], [390, 844, "phone"]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.screenshot({ path: `${SHOTS}/masking-reveal-failed-${tag}.png` });
    }
    await page.setViewportSize({ width: 1300, height: 900 });
    await page.unroute(`${BASE}/admin/accounts`);
    const [{ n: afterFail }] = await sql`select count(*)::int as n from admin_events where kind = 'account_revealed'`;
    report(
      "a failed Show raises the toast with Try again, reveals no row and logs nothing",
      raised && (await toast.getByRole("button", { name: "Try again" }).count()) === 1 && (await onPage(page, "li[data-revealed]").count()) === 0 && afterFail === atFail,
    );

    // The exact-email lookup (D10 to D13): a hit answers the account's id and nothing else, writes nothing, and the
    // list narrows to its one masked row (A3); a miss draws no rows (A4); a failure keeps the list and says so (A5).
    await page.goto(`${BASE}/admin/accounts`, { waitUntil: "networkidle" });
    // Let the failed Show's toast run out first, so the A5 check below finds only its own.
    await page.getByRole("alert").waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
    const field = onPageRole(page, "searchbox", /Name, or a whole email/).first();
    const shot = async (name) => {
      if (!SHOTS) return;
      for (const [w, h, tag] of [[1300, 900, "desktop"], [390, 844, "phone"]]) {
        await page.setViewportSize({ width: w, height: h });
        await page.screenshot({ path: `${SHOTS}/${name}-${tag}.png` });
      }
      await page.setViewportSize({ width: 1300, height: 900 });
    };
    const [{ n: atLook }] = await sql`select count(*)::int as n from admin_events`;
    const looked = [];
    sink = looked;
    route = "/admin/accounts lookup";
    await field.fill(email.toUpperCase());
    const listed = await onPage(page, "[data-testid='account-rows'] li").count();
    report("an address waits for Enter, the list whole (A8)", (await onPage(page, "[data-lookup-line='enter']").count()) === 1 && listed === accounts.length, `${listed} of ${accounts.length} rows`);
    // The lookup's own answer, read directly: a listener's body read can fail without a trace.
    const answerP = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/admin/accounts", { timeout: 15_000 });
    await field.press("Enter");
    const answer = await readBody(answerP);
    const hit = await onPage(page, "[data-lookup-line='hit']").waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await page.waitForLoadState("networkidle");
    await shot("masking-lookup-hit");
    const one = onPage(page, "[data-testid='account-rows'] li");
    report("a hit narrows the list to its one masked row, with Show (A3)", hit && (await one.count()) === 1 && (await one.first().getByRole("button", { name: /^Show / }).count()) === 1 && !(await one.first().innerText()).toLowerCase().includes(email));
    await drain();
    report(
      "the lookup's answer carries no name or email, and no response does",
      answer !== null && !find.some((n) => holds(answer, n)) && !looked.some((b) => find.some((n) => holds(b.text, n))),
      answer === null ? "the answer was not read" : `${answer.length} bytes`,
    );
    await field.fill(`nobody-${Date.now()}@pii-probe.example`);
    await field.press("Enter");
    const miss = await onPage(page, "[data-lookup-line='miss']").waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await shot("masking-lookup-miss");
    report("a miss draws no rows and no column head (A4)", miss && (await onPage(page, "[data-testid='account-card']").count()) === 0);
    await page.route(`${BASE}/admin/accounts`, (r) => (r.request().method() === "POST" ? r.abort() : r.fallback()));
    await field.fill(email);
    await field.press("Enter");
    const lookToast = page.getByRole("alert").filter({ hasText: "Couldn’t look up that email." });
    const lookRaised = await lookToast.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await shot("masking-lookup-failed");
    await page.unroute(`${BASE}/admin/accounts`);
    report(
      "a failed lookup keeps the field and the whole list, with the toast and Try again (A5)",
      lookRaised && (await field.inputValue()) === email && (await onPage(page, "[data-testid='account-rows'] li").count()) > 1,
    );
    const [{ n: afterLook }] = await sql`select count(*)::int as n from admin_events`;
    report("the lookup writes nothing (D11)", afterLook === atLook, `${atLook} then ${afterLook}`);
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nprobe:admin-pii passed" : `\nprobe:admin-pii: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
