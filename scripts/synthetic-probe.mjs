// The hourly synthetic sign-up probe (`.github/workflows/synthetic-probe.yml`): can a stranger still reach the front door? It loads the
// signed-out landing, the sign-in page and a join page in a real browser and checks each draws what it should. READ-ONLY: it only
// loads pages and types into the join form's email field; it never presses Send code (nothing is written, no mail is sent, no account
// is made), and it signs in as no one. It is the one probe allowed to point at production (Hugh approved it with the lane brief) because of that.
//
// The join step: with `SYNTHETIC_JOIN_CODE` (a six-character flyer code Hugh keeps live, a repository variable) it opens `/join/<code>`,
// expects the email field and fills it WITHOUT submitting. With none set it opens an invite-token-shaped dead link and expects the
// refusal card (the route renders, answers and says so), which still proves the route and the claim read are up.
//
// On a failure it exits 1 (the Actions job goes red and emails) and, when `SENTRY_DSN` is set, sends one Sentry error with the step
// names (`lib/synthetic-probe-lib.mjs`). Run by hand: `PROBE_BASE=https://staging.the-99.dev node scripts/synthetic-probe.mjs`.
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { envelopeUrl, failureEnvelope, parseDsn } from "./lib/synthetic-probe-lib.mjs";

const BASE = (process.env.PROBE_BASE ?? "https://the-99.dev").replace(/\/$/, "");
if (!/^https:\/\/[a-z0-9.-]+$/i.test(BASE)) throw new Error("PROBE_BASE must be a bare https origin");
const CODE = (process.env.SYNTHETIC_JOIN_CODE ?? "").trim().toUpperCase();
const DEAD_LINK = "A".repeat(43);
const STEP_TIMEOUT = 30_000;

// A live join code must never reach a log (anyone with read access to the run could use it): every message loses it.
const redact = (text) => (CODE ? text.replaceAll(CODE, "<code>").replaceAll(CODE.toLowerCase(), "<code>") : text);

const results = [];
async function step(name, run) {
  const started = Date.now();
  try {
    await run();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}  ${Date.now() - started}ms`);
  } catch (error) {
    results.push({ name, ok: false });
    console.log(`FAIL  ${name}  ${redact(String(error.message).split("\n")[0])}`);
  }
}

async function open(page, path) {
  const label = path.startsWith("/join/") ? "/join/<code>" : path;
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: STEP_TIMEOUT });
  if (!response || response.status() >= 400) throw new Error(`${label} answered ${response?.status() ?? "nothing"}`);
  // Let the page hydrate before looking for the crash screen: a client-side error draws it after the document loads.
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  if (await page.getByText("That didn’t load").first().isVisible().catch(() => false)) throw new Error(`${label} drew the error screen`);
}

let browser = null;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // The probe is not a visitor: nothing it loads reaches product analytics, so it never counts in the funnel.
  await context.route(/posthog\.com|\/_vercel\/(insights|speed-insights)/, (route) => route.abort());
  const page = await context.newPage();

  await step("landing", async () => {
    await open(page, "/");
    await page.waitForSelector("h1, h2", { timeout: STEP_TIMEOUT });
    if (!/The 99/.test(await page.title())) throw new Error("title is not The 99");
  });

  await step("sign-in", async () => {
    await open(page, "/sign-in");
    // Clerk draws its form after hydration: an input must appear.
    await page.locator("input").first().waitFor({ state: "visible", timeout: STEP_TIMEOUT });
  });

  await step(CODE ? "join (live code)" : "join (dead link)", async () => {
    await open(page, `/join/${CODE || DEAD_LINK}`);
    if (CODE) {
      const email = page.locator('input[type="email"]').first();
      await email.waitFor({ state: "visible", timeout: STEP_TIMEOUT });
      await email.fill("synthetic-probe@example.invalid");
      if ((await email.inputValue()) !== "synthetic-probe@example.invalid") throw new Error("the email field did not take input");
      // Never pressed: the Send code button stays unclicked.
    } else {
      // The refusal card names no one: today "This invite QR no longer works", and "This invitation link doesn’t work" for an invite token.
      await page.getByText(/This invite QR no longer works|This invitation link doesn’t work/).first().waitFor({ state: "visible", timeout: STEP_TIMEOUT });
    }
  });
} catch (error) {
  // The browser itself failed (missing, crashed): that is a failed probe too, and it is reported like one.
  results.push({ name: "probe", ok: false });
  console.log(`FAIL  probe  ${redact(String(error.message).split("\n")[0])}`);
} finally {
  await browser?.close();
}

const failed = results.filter((r) => !r.ok).map((r) => r.name);
if (failed.length > 0) {
  const dsn = parseDsn(process.env.SENTRY_DSN);
  if (dsn) {
    try {
      const body = failureEnvelope({ failed, base: BASE, eventId: randomBytes(16).toString("hex"), now: Date.now() });
      const res = await fetch(envelopeUrl(dsn), { method: "POST", body, headers: { "Content-Type": "application/x-sentry-envelope" } });
      console.log(`sentry: ${res.status}`);
    } catch {
      console.log("sentry: could not report");
    }
  }
  process.exit(1);
}
console.log("all steps passed");
