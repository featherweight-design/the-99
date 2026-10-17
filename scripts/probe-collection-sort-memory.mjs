// /collection remembers the reader's sort across visits, in a browser at 390 and 1300 (Hugh's request, 2026-10-17).
//
//   PROBE_BASE=http://localhost:3480 pnpm probe:collection-sort-memory
//
// Pick Quantity, leave, come back to a bare /collection: the order is restored, the server's own HTML already
// holds it (the first window of 200 is cut by the stored sort, so nothing reorders after hydration), and an
// explicit ?sort= in the URL still wins. The reader's own order is put back at the end (a cookie, no database
// write; the About gate is marked seen and restored, as the card-search probe does).

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
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

/** The first three card names the list draws, in order. */
async function firstNames(page) {
  await onPage(page, 'button[aria-busy="false"]').first().waitFor({ timeout: 30_000 });
  return page.evaluate(() =>
    [...document.querySelectorAll('main button[aria-busy="false"]')].slice(0, 3).map((b) => (b.getAttribute("aria-label") || b.innerText || "").split("\n").map((l) => l.trim()).find((l) => l && !/^×\d+$/.test(l) && !/^\d+$/.test(l)) ?? ""),
  );
}

let aboutPrior = null;

async function leg(browser, wide) {
  const tag = wide ? "1300:" : "390:";
  const context = await browser.newContext(
    wide ? { viewport: { width: 1300, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  );
  const page = await context.newPage();
  await signIn(page);
  const userId = await page.evaluate(() => window.Clerk?.user?.id ?? null);
  if (!userId) throw new Error("Signed in, but Clerk reports no user.");
  aboutPrior ??= await captureAboutSeen(userId);
  await clearAboutSheet(page, userId);
  const open = async (query) => {
    await page.goto(`${BASE}/collection${query}`, { waitUntil: "load" });
    if (new URL(page.url()).pathname !== "/collection") throw new Error(`${tag} landed on ${page.url()}`);
    return firstNames(page);
  };

  await context.clearCookies({ name: "collection_sort" });
  const byName = await open("?view=rows");
  report(`${tag} with nothing remembered, a bare visit draws the default order`, byName.every(Boolean), byName.join(" | "));
  const byNameParam = await open("?view=rows&sort=name");
  report(`${tag} the default order reads the same as ?sort=name`, JSON.stringify(byName) === JSON.stringify(byNameParam));

  // Pick Quantity through the control: that press is what remembers it.
  await onPageRole(page, "button", /^Sort/).first().click();
  await page.locator('li[data-code="quantity"], [role="option"][data-code="quantity"]').first().click();
  // The reorder is a client render: poll until the first cards differ from the default order, up to 10s.
  let picked = byName;
  for (let i = 0; i < 40 && JSON.stringify(picked) === JSON.stringify(byName); i += 1) {
    await page.waitForTimeout(250);
    picked = await firstNames(page);
  }
  report(`${tag} picking Quantity reorders the list`, JSON.stringify(picked) !== JSON.stringify(byName), picked.join(" | "));
  const cookie = (await context.cookies()).find((c) => c.name === "collection_sort");
  report(`${tag} the choice is remembered in a cookie the server can read`, cookie?.value === "quantity.desc" || cookie?.value === "quantity.asc", cookie?.value ?? "none");

  // Leave and come back with no parameter.
  await page.goto(`${BASE}/decks`, { waitUntil: "load" });
  const back = await open("?view=rows");
  report(`${tag} a bare visit restores the remembered order`, JSON.stringify(back) === JSON.stringify(picked), back.join(" | "));
  report(`${tag} …and the address mirrors it through the URL`, new URL(page.url()).searchParams.get("sort") === "quantity", page.url());

  // The window the server cut is the one the browser draws first: no card of it waits for its fields (a list is busy
  // exactly when a wanted card came without them), which a cut by the default order would leave for the top of this one.
  await page.waitForTimeout(800);
  const busy = await onPage(page, 'div[aria-busy="true"]').count();
  const drawn = await onPage(page, 'button[aria-busy="false"]').count();
  report(`${tag} the first window the server cut is the one drawn: whole, not busy`, busy === 0 && drawn === 200, `${drawn} drawn, ${busy} busy lists`);

  // No reorder flash: the server's own HTML lists the first cards in the order they end up in.
  const bare = await context.request.get(`${BASE}/collection?view=rows`);
  const html = await bare.text();
  const at = back.map((n) => html.indexOf(n));
  report(`${tag} the server's first render already holds that order (no reorder after hydration)`,
    at.every((n) => n >= 0) && at[0] < at[1] && at[1] < at[2], at.join(" < "));

  // An explicit ?sort= wins.
  const explicit = await open("?view=rows&sort=name");
  report(`${tag} an explicit ?sort= in the URL beats the remembered one`, JSON.stringify(explicit) === JSON.stringify(byName), explicit.join(" | "));

  // …and keeps it through a reload: the mirror must not strip a `sort=name` that overrides a remembered Quantity.
  report(`${tag} the override stays in the address`, new URL(page.url()).searchParams.get("sort") === "name", page.url());
  await page.reload({ waitUntil: "load" });
  const reloaded = await firstNames(page);
  report(`${tag} a reload keeps the explicit order, not the remembered one`, JSON.stringify(reloaded) === JSON.stringify(byName), reloaded.join(" | "));

  // Put the reader's own order back: the default is a choice too.
  await onPageRole(page, "button", /^Sort/).first().click();
  await page.locator('li[data-code="name"], [role="option"][data-code="name"]').first().click();
  await page.waitForTimeout(400);
  await context.clearCookies({ name: "collection_sort" });
  await context.close();
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    await leg(browser, false);
    await leg(browser, true);
  } finally {
    if (aboutPrior) await restoreAboutSeen(aboutPrior).catch((e) => console.error("could not restore About:", e));
    await browser.close();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
