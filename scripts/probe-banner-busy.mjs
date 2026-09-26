// probe:banner-busy — the stale banner's re-analyze button, while the analysis runs, at 390 and 1300.
//
// The button draws `deckAnalysisCopy.panel.loading.heading` beside a pulse while the press is in
// flight. That heading moved from "Reading your deck…" to "Working out your bracket…" (Hugh,
// 2026-09-27), which is longer, and the button is `flex-none whitespace-nowrap`: it grows rather
// than wraps. So what can go wrong is a label cut off, a second line, or a button pushed past the
// banner's edge. jsdom lays nothing out; this reads all three off the page.
//
// It reaches the busy state honestly: the deck's stored reading is marked `dirty` (what an edit's
// `touchDeck` does), the page draws the stale banner, and the probe presses the button while
// holding the server action's request for a few seconds, so the busy label is on screen long
// enough to measure. The fixture is the first legal, whole deck the account owns with a stored
// reading; that row is held ON DISK first (`profile-hold.mjs`) and put back in a `finally`, since
// the press rewrites it. A press with a credit left also writes an overview and spends that credit,
// so any overview the run added is deleted in the same `finally` with its ledger unit, which hands
// the credit back. Needs a server with ANALYSIS_TAB_ENABLED=true. Point it at `local-dev`,
// never production.
//
//   PROBE_BASE=http://localhost:3018 node scripts/probe-banner-busy.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { holdProfile } from "./lib/profile-hold.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// A `+clerk_test` account signs in by email code and needs no password; any other needs one.
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const BUSY = "Working out your bracket…";
const HOLD_MS = 6_000;

const sql = neon(DATABASE_URL);
let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " ok " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}
async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (e) {
        return String(e?.errors?.[0]?.longMessage ?? e);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(failure);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

/** The first legal, whole deck the account owns that has a stored reading. */
async function pickDeck(userId) {
  const [deck] = await sql`
    select d.id, d.name from decks d where d.user_id = ${userId}
      and exists (select 1 from deck_profiles p where p.deck_id = d.id)
      and (select coalesce(sum(quantity), 0) from deck_cards c where c.deck_id = d.id)
        = case when d.partner_oracle_id is null then 99 else 98 end
      and not exists (
        select 1 from cards cm
        where cm.oracle_id in (d.commander_oracle_id, d.partner_oracle_id) and not cm.commander_legal
      )
      and not exists (
        select 1 from deck_cards c join cards k on k.oracle_id = c.oracle_id
        where c.deck_id = d.id
          and (not k.commander_legal or not (k.color_identity <@ (
            select coalesce(array_agg(distinct ci), '{}') from cards cm, unnest(cm.color_identity) ci
            where cm.oracle_id in (d.commander_oracle_id, d.partner_oracle_id)
          )))
      )
    order by d.name limit 1`;
  return deck ?? null;
}

/** The banner's button, its label and the banner itself, from the laid-out page. */
const readButton = (banner) =>
  banner.evaluate((box) => {
    const button = box.querySelector("button");
    const label = [...button.querySelectorAll("span")].find((s) => s.children.length === 0 && s.textContent.trim());
    const b = button.getBoundingClientRect();
    const r = box.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(label).lineHeight) || 20;
    return {
      text: label?.textContent ?? "",
      lines: Math.round(label.getBoundingClientRect().height / lineHeight),
      clipped: label.scrollWidth > label.clientWidth || button.scrollWidth > button.clientWidth,
      inside: b.left >= r.left - 0.5 && b.right <= r.right + 0.5,
      width: b.width,
    };
  });

async function walk(page, deck, width) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await sql`update deck_profiles set dirty = true where deck_id = ${deck.id}::uuid`;
  await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "networkidle" });
  await onPageRole(page, "tab", /Analysis/).first().click();
  const banner = onPage(page, "[data-testid='analysis-banner']").first();
  try {
    await banner.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    report(false, `${width}: the stale banner draws on ${deck.name}`);
    return;
  }
  // Hold the press's own request, so the busy label stays up long enough to measure.
  let held = false;
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"] && !held) {
      held = true;
      await new Promise((r) => setTimeout(r, HOLD_MS));
    }
    await route.continue().catch(() => {});
  });
  await banner.locator("button").first().click();
  const busy = await page
    .waitForFunction(
      (text) => document.querySelector("[data-testid='analysis-banner'] button")?.textContent?.includes(text),
      BUSY,
      { timeout: 5_000 },
    )
    .then(() => true, () => false);
  report(busy, `${width}: the button reads "${BUSY}" while the press runs`);
  if (busy) {
    const b = await readButton(banner);
    report(b.lines === 1 && !b.clipped, `${width}: the busy label is whole, on one line`, `${b.lines} line(s), clipped ${b.clipped}, ${b.width.toFixed(0)}px`);
    report(b.inside, `${width}: the button stays inside the banner`);
  }
  await page.waitForTimeout(HOLD_MS + 1_000);
  await page.unroute("**/*");
}

await clerkSetup();
const browser = await chromium.launch();
let restoreProfile = null;
// The deck, and the overview rows it held before the run: anything else on it afterwards is ours.
let ours = null;
try {
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const userId = await signIn(page);
  await clearAboutSheet(page, userId);
  const deck = await pickDeck(userId);
  if (!deck) throw new Error("The account owns no legal, whole deck with a stored reading.");
  console.log(`fixture ${deck.name}`);
  ours = { id: deck.id, before: (await sql`select id from deck_synopses where deck_id = ${deck.id}`).map((r) => r.id) };
  restoreProfile = await holdProfile(sql, deck.id);
  for (const width of [1300, 390]) await walk(page, deck, width);
} catch (e) {
  failures += 1;
  console.log(`FAIL  run aborted — ${e?.stack ?? e}`);
} finally {
  await browser.close();
  if (ours) {
    try {
      const calls = (await sql`
        delete from deck_synopses where deck_id = ${ours.id} and not (id = any(${ours.before}::uuid[]))
        returning model_call_id`).map((r) => r.model_call_id).filter(Boolean);
      if (calls.length > 0) await sql`delete from model_calls where id = any(${calls}::uuid[])`;
    } catch (error) {
      failures += 1;
      console.log(`FAIL  cleanup: the overview on ${ours.id} was left behind — ${error.message}`);
    }
  }
  if (restoreProfile) {
    try {
      await restoreProfile();
    } catch (error) {
      failures += 1;
      console.log(`FAIL  cleanup — ${error.message}`);
    }
  }
}
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
