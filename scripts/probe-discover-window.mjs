// probe:discover-window — `/discover` ships whole rows for its URL's first window, and fetches the
// rest in the background (plans/2026-09-28-list-payload-shrink.md, PR 3).
//
// What only a browser can say, at 1300x900 and 390x844, with `/api/discovery-fields` HELD so
// nothing arrives in the background while it looks:
//
//   - The SERVER's window is the CLIENT's. The page cuts every row outside its URL's first 25 down
//     to the list columns, using `lib/discovery/window`; the view draws its first 25 by the same
//     steps. If they disagreed, a row the view wants on arrival would have no fields and nothing
//     would draw. So each URL here, with its own order, colour and search, must draw 25 rows on
//     arrival while the fields route answers nothing.
//   - Show more with its rows' fields not yet arrived draws nothing new and says so: the list and
//     the control `aria-busy`. Releasing the route draws them.
//
// It makes no writes. Point it at `local-dev` or a scratch branch.
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

const LIST = "ul[class*='list-none']";
/** Rows drawn: a row is drawn when its link to the commander is on screen. */
const drawn = (page) => onPage(page, `${LIST} > li a[href^='/commanders/']`).count();

/** Holds every fields request until `release()`, so the background cannot land mid-check. */
async function holdFields(page) {
  const held = [];
  let open = false;
  await page.route("**/api/discovery-fields**", (route) => (open ? route.continue() : held.push(route)));
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
    for (const query of ["", "?o=name", "?o=recent&c=g", "?q=dragon", "?o=popularity"]) {
      await page.goto(`${BASE}/discover${query}`, { waitUntil: "load" });
      if (new URL(page.url()).pathname !== "/discover") throw new Error(`${label}: landed on ${page.url()} (the About gate?)`);
      await onPage(page, LIST).first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(800);
      const n = await drawn(page);
      // NOT BUSY is the property: the list is busy exactly when a row it wants has no fields, and
      // nothing has been fetched, so every wanted row came whole from the server. A search can
      // leave fewer than 25, so the count is 25 only where nothing narrows the list.
      const busy = await onPage(page, LIST).first().getAttribute("aria-busy");
      report(`${label} ${query || "(default)"}: the URL's first window arrives drawn`,
        n > 0 && busy === null && (query.includes("q=") || query.includes("c=") || n === 25),
        `${n} drawn, list aria-busy ${busy}, fields requests held ${gate.count()}`);
    }

    await page.goto(`${BASE}/discover`, { waitUntil: "load" });
    await onPage(page, LIST).first().waitFor({ timeout: 30_000 });
    const before = await drawn(page);
    const more = onPage(page, "button").filter({ hasText: /^Show 25 more/ }).first();
    await more.click();
    await page.waitForTimeout(800);
    const during = await drawn(page);
    const busy = await onPage(page, LIST).first().getAttribute("aria-busy");
    const buttonBusy = await more.getAttribute("aria-busy");
    report(`${label}: Show more waits for its rows' fields, and says so`,
      during === before && busy === "true" && buttonBusy === "true",
      `${before} then ${during} drawn, list aria-busy ${busy}, control aria-busy ${buttonBusy}`);
    await gate.release();
    await page.waitForFunction((sel) => document.querySelectorAll(`main ${sel} > li a[href^='/commanders/']`).length >= 50, LIST, { timeout: 30_000 }).catch(() => {});
    const after = await drawn(page);
    report(`${label}: the rows draw once their fields arrive`, after === before + 25, `${after} drawn`);
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
