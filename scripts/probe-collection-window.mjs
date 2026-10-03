// probe:collection-window — `/collection` ships whole cards for its URL's first window, and fetches
// the rest in the background (plans/2026-09-28-list-payload-shrink.md, PR 4).
//
// What only a browser can say, at 1300x900 and 390x844, with `/api/collection-fields` HELD so
// nothing arrives in the background while it looks:
//
//   - The SERVER's window is the CLIENT's. The page cuts every card outside its URL's first 200 down
//     to the columns filtering and sorting read, using `lib/collection/window`; the browser draws
//     its first 200 by the same steps. If they disagreed, a card the browser wants on arrival
//     would have no fields and the list would sit busy. So each URL here, with its own view, sort,
//     direction, search and availability, must arrive drawn and not busy while the fields route
//     answers nothing.
//   - Show more with its cards' fields not yet arrived draws nothing new and says so: the list and
//     the control `aria-busy`. Releasing the route draws them.
//
// A card is counted by its own button, which carries `aria-busy="false"` (the modal's pending
// mark) whenever it is drawn. It makes no writes. Point it at `local-dev` or a scratch branch.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

/** Cards drawn: each is a button carrying its own `aria-busy` (the modal's pending mark). */
const drawn = (page) => onPage(page, 'button[aria-busy="false"]').count();
const listBusy = (page) => onPage(page, 'div[aria-busy="true"]').count();

/** Holds every fields request until `release()`, so the background cannot land mid-check. */
async function holdFields(page) {
  const held = [];
  let open = false;
  await page.route("**/api/collection-fields**", (route) => (open ? route.continue() : held.push(route)));
  return {
    count: () => held.length,
    release: async () => {
      open = true;
      for (const r of held.splice(0)) await r.continue();
    },
  };
}

async function walk(browser, width, height) {
  const label = String(width);
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  try {
    await signIn(page);
    const gate = await holdFields(page);
    // `avail=` is the one filter whose input the page holds apart from the list (it joins the
    // reading it loads beside the cached list), so a cut that forgot the join fails it here.
    for (const query of ["?view=grid", "?view=rows", "?view=grid&sort=quantity&dir=asc", "?view=rows&sort=rarity", "?view=grid&q=the", "?view=grid&avail=free"]) {
      await page.goto(`${BASE}/collection${query}`, { waitUntil: "load" });
      if (new URL(page.url()).pathname !== "/collection") throw new Error(`${label}: landed on ${page.url()} (the About gate?)`);
      await onPage(page, 'button[aria-busy="false"]').first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(800);
      const n = await drawn(page);
      const busy = await listBusy(page);
      // NOT BUSY is the property: the list is busy exactly when a card it wants has no fields, and
      // nothing has been fetched, so every wanted card came whole from the server. A search can
      // leave fewer than 200, so the count is 200 only where nothing narrows the list.
      report(`${label} ${query}: the URL's first window arrives drawn`,
        n > 0 && busy === 0 && (query.includes("q=") || query.includes("avail=") || n === 200),
        `${n} drawn, busy lists ${busy}, fields requests held ${gate.count()}`);
    }

    await page.goto(`${BASE}/collection?view=grid`, { waitUntil: "load" });
    await onPage(page, 'button[aria-busy="false"]').first().waitFor({ timeout: 30_000 });
    const before = await drawn(page);
    const more = onPage(page, "button").filter({ hasText: /^Show more/ }).first();
    await more.click();
    await page.waitForTimeout(800);
    const during = await drawn(page);
    const busy = await listBusy(page);
    const buttonBusy = await more.getAttribute("aria-busy");
    await more.click();
    await page.waitForTimeout(300);
    const pressedAgain = await drawn(page);
    report(`${label}: Show more waits for its cards' fields, and says so`,
      during === before && pressedAgain === before && busy === 1 && buttonBusy === "true",
      `${before} then ${during}, then ${pressedAgain} after a second press; busy lists ${busy}, control aria-busy ${buttonBusy}`);
    await gate.release();
    await page.waitForFunction(
      (n) => document.querySelectorAll('main button[aria-busy="false"]').length > n,
      before,
      { timeout: 30_000 },
    ).catch(() => {});
    const after = await drawn(page);
    report(`${label}: the cards draw once their fields arrive`, after === before + 200 && (await listBusy(page)) === 0, `${after} drawn`);
  } finally {
    await context.close();
  }
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    await walk(browser, 1300, 900);
    await walk(browser, 390, 844);
  } finally {
    await browser.close();
  }
}

run()
  .catch((error) => { failures += 1; console.error(error); })
  .finally(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
