// `Printed in ▾` on both commander lanes, pressed in a real browser at 390x844 and 1300x900
// (filter-chassis decision 9).
//
// The unit suites prove the rule over hand-built rows and the control over a jsdom that lays
// nothing out. What only a browser answers:
//
// - THE PRESS. The wide form is a popover under a trigger in the rack; the phone form is a row in
//   the filter sheet that opens the set list as a SECOND layer over it (decision 23), portalled
//   out of a sheet that goes inert. The probe reaches both by pressing, never by URL, because a
//   URL sweep cannot see a surface reached by a press.
// - THE ROWS LEFT, checked against the database rather than against the index the page shipped:
//   every row on screen must be a commander with a printing in the chosen set. Checking the page
//   against its own index would only prove the index agrees with itself.
// - THE ZERO STATE's one fix, where Printed in is one candidate beside the pips: the sentence
//   names the control whose removal returns the most rows, and pressing it returns that many.
//
// It picks its set by ASKING THE PANEL: the enabled option with the most rows, so the fixture
// follows the account and the catalog rather than a name that rots.
//
// It writes only the account's About row, through `clearAboutSheet`, captured first and put back
// in a `finally`. Point it at `local-dev`, never production.
//   PROBE_BASE=http://localhost:3000 pnpm probe:printed-in-lanes
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";
import { onPage, openSheet } from "./lib/surface.mjs";
import { requireEnv } from "./lib/env.mjs";

const {
  E2E_AUDIT_USER_EMAIL: EMAIL,
  E2E_AUDIT_USER_PASSWORD: PASSWORD,
  DATABASE_URL,
} = requireEnv(["E2E_AUDIT_USER_EMAIL", "E2E_AUDIT_USER_PASSWORD", "CLERK_SECRET_KEY", "DATABASE_URL"]);

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const VIEWPORTS = [
  { label: "390", width: 390, height: 844, wide: false },
  { label: "1300", width: 1300, height: 900, wide: true },
];
const LANES = ["/commanders", "/discover"];
const LAYER = "Filter by printed-in set";

const sql = neon(DATABASE_URL);
let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
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
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

/** Every name a commander printed in `code` can be drawn under: its own, or any flavor name. */
async function namesPrintedIn(code) {
  const rows = await sql`
    select c.name, p2.flavor_name
    from cards c
    join printings p on p.oracle_id = c.oracle_id and p.set_code = ${code}
    left join printings p2 on p2.oracle_id = c.oracle_id and p2.flavor_name is not null`;
  const names = new Set();
  for (const r of rows) {
    names.add(r.name);
    if (r.flavor_name) names.add(r.flavor_name);
  }
  return names;
}

/** The names on the rows drawn now: the name span inside each row's wash label. */
async function rowNames(page) {
  return onPage(page, "li [data-wash-label] > span:first-child").allInnerTexts();
}

/** The first figure in the rack's result line. */
async function shownCount(page) {
  const text = await onPage(page, "text=/\\d[\\d,]* (of [\\d,]+ commanders match|commanders)/").first().innerText();
  return Number(text.match(/[\d,]+/)[0].replace(/,/g, ""));
}

/** The enabled option with the most rows, from an open list of `[role=option]` or switches. */
async function busiestOption(options) {
  let best = null;
  for (const option of await options.all()) {
    if ((await option.getAttribute("aria-disabled")) === "true") continue;
    const text = (await option.innerText()).trim();
    const count = Number((text.match(/([\d,]+)\s*$/)?.[1] ?? "0").replace(/,/g, ""));
    if (!best || count > best.count) best = { option, text, count };
  }
  return best;
}

/** Ticks the busiest set and returns its promised count. The caller reads WHICH set off `?p=`. */
async function pickSet(page, wide) {
  if (wide) {
    const trigger = onPage(page, '[data-testid="printed-in"] button').first();
    await trigger.click();
    const listbox = onPage(page, '[role="listbox"]').first();
    await listbox.waitFor({ state: "visible", timeout: 5_000 });
    const best = await busiestOption(listbox.locator('[role="option"]'));
    if (!best) return null;
    await best.option.click();
    await page.keyboard.press("Escape");
    return { count: best.count };
  }
  const sheet = await openSheet(page);
  if (!sheet) return null;
  await sheet.locator('[data-testid="printed-in-row"]').click();
  const layer = page.getByRole("dialog", { name: LAYER });
  await layer.waitFor({ state: "visible", timeout: 5_000 });
  const inert = await sheet.evaluate((el) => el.hasAttribute("inert"));
  check("the sheet goes inert under the set list", inert, `inert=${inert}`);
  const best = await busiestOption(layer.getByRole("switch"));
  if (!best) return null;
  await best.option.click();
  await layer.getByRole("button", { name: "Done" }).click();
  await layer.waitFor({ state: "detached", timeout: 5_000 });
  // Done closes the set list alone; the sheet under it takes its focus back and stays.
  const stillOpen = await sheet.isVisible();
  check("Done closes the set list and leaves the sheet up", stillOpen, `sheet visible=${stillOpen}`);
  await sheet.getByRole("button", { name: /^Show / }).click();
  return { count: best.count };
}

async function walk(browser, storage, lane, vp) {
  const context = await browser.newContext({ storageState: storage, viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}${lane}`, { waitUntil: "networkidle" });
    const where = `${lane} @${vp.label}`;
    const picked = await pickSet(page, vp.wide);
    if (!picked) {
      check(`${where}: the control offers a set`, false, "no enabled option");
      return;
    }
    await page.waitForFunction(() => new URLSearchParams(location.search).has("p"), null, { timeout: 5_000 });
    const code = new URLSearchParams(new URL(page.url()).search).get("p");
    check(`${where}: the pick writes ?p=`, !!code, `p=${code}`);
    const chip = onPage(page, `text=Printed in ${code.toUpperCase()}`).first();
    check(`${where}: the chip names the set`, await chip.isVisible(), `Printed in ${code.toUpperCase()}`);

    const shown = await shownCount(page);
    check(`${where}: the list holds the count the option promised`, shown === picked.count, `${shown} shown, option said ${picked.count}`);

    const allowed = await namesPrintedIn(code);
    const names = await rowNames(page);
    const stray = names.filter((n) => !allowed.has(n.trim()));
    check(`${where}: every row is printed in ${code}`, names.length > 0 && stray.length === 0,
      names.length === 0 ? "no rows drawn" : stray.length === 0 ? `${names.length} rows checked` : `not printed there: ${stray.slice(0, 3).join(", ")}`);

    await onPage(page, 'button[aria-label^="Remove filter: Printed in"]:visible').first().click();
    await page.waitForFunction(() => !new URLSearchParams(location.search).has("p"), null, { timeout: 5_000 });
    const after = await shownCount(page);
    check(`${where}: removing the chip gives the rows back`, after > shown, `${shown} then ${after}`);
  } finally {
    await context.close();
  }
}

/**
 * A `goto` the lane's own client navigation can abort: the rack writes the URL by `router.replace`,
 * and one still in flight cancels the document load (net::ERR_ABORTED). Retried once, after the
 * page settles; anything else is thrown.
 */
async function gotoSettled(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle" });
  } catch (err) {
    if (!String(err).includes("ERR_ABORTED")) throw err;
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.goto(url, { waitUntil: "networkidle" });
  }
}

/**
 * The owned lane's one fix, with Printed in as one candidate: find a pip that, with the busiest
 * set, empties the lane, and read the sentence's promise against what its button returns.
 */
async function zeroState(browser, storage, vp) {
  const context = await browser.newContext({ storageState: storage, viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/commanders`, { waitUntil: "networkidle" });
    const picked = await pickSet(page, vp.wide);
    // The tick writes `?p=` by a client navigation. A `goto` fired while it is in flight is
    // aborted by it (net::ERR_ABORTED), so let it land first.
    if (picked) {
      await page.waitForURL(/[?&]p=/, { timeout: 10_000 }).catch(() => {});
      await page.waitForLoadState("networkidle");
    }
    const code = new URLSearchParams(new URL(page.url()).search).get("p");
    if (!picked || !code) {
      check(`zero state @${vp.label}`, false, "no set to start from");
      return;
    }
    let found = false;
    for (const colors of ["w,u,b,r,g", "w,u,b,r", "u,b,r,g", "w,b,r,g", "w,u,r,g", "w,u,b,g"]) {
      await gotoSettled(page, `${BASE}/commanders?c=${colors}&m=exact&p=${code}`);
      const drop = onPage(page, 'button:has-text("Drop ")').first();
      if (!(await drop.isVisible().catch(() => false))) continue;
      found = true;
      const sentence = await onPage(page, "text=/you get .* back/").first().innerText();
      const promised = sentence.includes("one row") ? 1 : Number(sentence.match(/get ([\d,]+) rows/)?.[1].replace(/,/g, ""));
      const control = (await drop.innerText()).replace(/^Drop /, "");
      await drop.click();
      await page.waitForTimeout(300);
      const back = await shownCount(page);
      check(`zero state @${vp.label}: pressing Drop ${control} returns what the sentence promised`, back === promised,
        `promised ${promised}, got ${back}`);
      break;
    }
    check(`zero state @${vp.label}: reached`, found, found ? "a one-fix sentence drew" : "no combination emptied the lane");
  } finally {
    await context.close();
  }
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const userId = await signIn(page);
  const about = await captureAboutSeen(userId);
  try {
    await clearAboutSheet(page, userId);
    const storage = await context.storageState();
    for (const vp of VIEWPORTS) {
      for (const lane of LANES) await walk(browser, storage, lane, vp);
      await zeroState(browser, storage, vp);
    }
  } finally {
    await restoreAboutSeen(about);
    await browser.close();
  }
}

async function main() {
  try {
    await run();
  } catch (error) {
    // Counted, not rethrown past the summary: a throw would otherwise print nothing about the
    // checks that did run.
    console.error(error);
    failures += 1;
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
