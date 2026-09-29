// `short X` everywhere except the deck page (Hugh's deck bug batch, 2026-09-28, item 8).
//
// Off the deck page a shortfall always names its count, one included: `short 1`. On the deck page
// (`/decks/[id]` and `/decks/[id]/changes`) one missing copy keeps its bare `short`, the 09-26
// ruling. This reads every drawn availability marker whose text begins `short` on `/collection`
// (the rows view and the grid) and on a deck page, at 390x844 and 1300x900, and asserts which form
// each surface draws. A surface that draws no `short` marker at all reports that it measured nothing
// and FAILS, since the fixture is a real account where contested copies exist.
//
// The deck is named with `PROBE_DECK_NAME` (default `HD - Gishath`) and must belong to the signed-in
// account, so `pull:staging` it into a scratch branch first. Writes only the account's About row
// (captured and restored). Point it at a scratch branch or `local-dev`, never production:
//   PROBE_BASE=http://localhost:3335 pnpm probe:short-count
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL", "E2E_AUDIT_USER_PASSWORD", "CLERK_SECRET_KEY", "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK_NAME = process.env.PROBE_DECK_NAME ?? "HD - Gishath";
const WIDTHS = [
  { label: "390", width: 390, height: 844 },
  { label: "1300", width: 1300, height: 900 },
];

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async ([email, password]) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = email.includes("+clerk_test")
        ? await signIn.create({ identifier: email })
        : await signIn.create({ identifier: email, password });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, [EMAIL, PASSWORD]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

/** Every drawn element inside `<main>` whose own text is a `short` marker, bare or counted. */
const SHORTS = () => {
  const out = [];
  for (const el of document.querySelectorAll("main *")) {
    if (el.children.length > 0) continue;
    const text = (el.textContent ?? "").trim();
    if (!/^short( \d+)?$/.test(text)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    out.push(text);
  }
  return out;
};

async function read(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1_500);
  return page.evaluate(SHORTS);
}

function summarise(texts) {
  const counts = {};
  for (const t of texts) counts[t] = (counts[t] ?? 0) + 1;
  return Object.entries(counts).map(([t, n]) => `${t} ×${n}`).join(", ") || "none";
}

async function main() {
  await clerkSetup();
  const sql = neon(DATABASE_URL);
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const userId = await signIn(page);
  const about = await captureAboutSeen(userId);
  try {
    await clearAboutSheet(page, userId);
    const [deck] = await sql`select id from decks where user_id = ${userId} and name = ${DECK_NAME} limit 1`;
    if (!deck) throw new Error(`The signed-in account holds no deck named ${DECK_NAME}; pull:staging it first.`);
    for (const vp of WIDTHS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const [surface, url] of [["/collection rows", "/collection?view=rows"], ["/collection grid", "/collection?view=grid"]]) {
        const texts = await read(page, `${BASE}${url}`);
        check(`${vp.label} ${surface}: draws a shortfall`, texts.length > 0, texts.length ? `${texts.length} markers` : "none drawn — NOT a pass");
        check(`${vp.label} ${surface}: every one names its count`, texts.length > 0 && texts.every((t) => t !== "short"), summarise(texts));
      }
      const texts = await read(page, `${BASE}/decks/${deck.id}`);
      check(`${vp.label} deck page: draws a shortfall`, texts.length > 0, texts.length ? `${texts.length} markers` : "none drawn — NOT a pass");
      check(`${vp.label} deck page: one missing copy reads a bare \`short\``, texts.length > 0 && !texts.includes("short 1"), summarise(texts));
    }
  } finally {
    await restoreAboutSeen(about);
    await browser.close();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  return failures;
}

main().then(
  (n) => process.exit(n === 0 ? 0 : 1),
  (error) => { console.error(error); process.exit(1); },
);
