// Search follow-ups R12 (Q19, Q20): a tool row's mark is 28px in a 48px tile on the phone and 24px in 40px from md, and a
// press keeps the search up in its Opening state (ring, spinner, `Opening {name}…`, other rows dimmed and inert, the bar
// running) until the page commits, at 390 from the sheet and 1300 from Home's popover. Esc closes it and the page still
// arrives; a page that never commits restores the row and raises the toast.
//
//   PROBE_BASE=http://localhost:3517 pnpm probe:search-opening
//
// Writes no database row (the About gate is marked seen and put back). Fails on main: the tile is 40/30px and a press
// closes the search at once, so no row ever reads `Opening`.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
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

const panel = (page) => page.locator("[data-home-search-panel]");
const homeField = (page) => panel(page).getByRole("combobox");
const sheet = (page) => page.getByRole("dialog", { name: "Search all cards" });
const QUESTION = "How do I make my deck better?";

async function openAndAsk(page, wide) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await panel(page).waitFor({ timeout: 15_000 });
  await homeField(page).click();
  let field;
  let scope;
  if (wide) {
    field = homeField(page);
    scope = page.locator("[data-home-search-field]");
  } else {
    await sheet(page).waitFor({ timeout: 5_000 });
    field = sheet(page).getByRole("combobox");
    scope = sheet(page);
  }
  await field.fill(QUESTION);
  await scope.locator("[data-ask-tool]").first().waitFor({ timeout: 15_000 });
  return scope;
}

/** Holds every client navigation's RSC request off Home until `release()`; returns the controls. */
async function holdNavigation(page) {
  let open;
  const gate = new Promise((r) => (open = r));
  let held = 0;
  await page.route("**/*", async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (req.headers()["rsc"] === "1" && u.pathname !== "/" && !u.pathname.startsWith("/api/")) {
      held += 1;
      await gate;
    }
    await route.continue().catch(() => {});
  });
  return { release: () => open(), held: () => held };
}

async function run(page, wide, tag) {
  const scope = await openAndAsk(page, wide);
  const mark = scope.locator("[data-ask-tool] [data-ask-mark]").first();
  const box = await mark.boundingBox();
  const want = wide ? 40 : 48;
  report(`${tag} tool tile is ${want}px`, !!box && Math.abs(box.width - want) < 0.6 && Math.abs(box.height - want) < 0.6, `${box?.width}x${box?.height}`);
  const glyph = await mark.locator("svg").boundingBox();
  const wantGlyph = wide ? 24 : 28;
  report(`${tag} wrench is ${wantGlyph}px`, !!glyph && Math.abs(glyph.width - wantGlyph) < 0.6, `${glyph?.width}`);

  // A tool that lands on another page.
  const ids = await scope.locator("[data-ask-tool]").evaluateAll((els) => els.map((e) => e.getAttribute("data-ask-tool")));
  const target = ids[0];
  const row = () => scope.locator(`[data-ask-tool="${target}"]`);
  const name = (await row().locator("span.font-semibold").first().innerText()).trim();

  const hold = await holdNavigation(page);
  await row().click();
  await row().waitFor();
  const opening = await page.waitForFunction(
    (id) => document.querySelector(`[data-ask-tool="${id}"]`)?.hasAttribute("data-ask-pending"),
    target,
    { timeout: 3_000 },
  ).then(() => true, () => false);
  report(`${tag} a press keeps the search up with the row Opening`, opening);
  const foot = (await row().locator("span.font-mono").last().innerText()).replace(/\s*›$/, "").trim();
  report(`${tag} the foot reads "Opening ${name}…"`, foot === `Opening ${name}…`, foot);
  report(`${tag} the row's tile is a spinner`, (await row().locator("[data-ask-spin]").count()) === 1);
  const others = await scope.locator("[data-ask-tool]:not([data-ask-pending])").evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
  report(`${tag} the other rows dim to 45%`, others.length === 0 || others.every((o) => Math.abs(Number(o) - 0.45) < 0.02), others.join(","));
  report(`${tag} the listbox is aria-busy`, (await scope.locator('[role="listbox"][aria-busy="true"]').count()) === 1);
  report(`${tag} the progress bar runs`, (await page.locator(".anim-search-progress").count()) >= 1);
  report(`${tag} the navigation is held`, hold.held() >= 1, `${hold.held()} held`);

  // Esc closes the search; the page still arrives.
  await page.keyboard.press("Escape");
  const closed = await page.waitForFunction(() => !document.querySelector("[data-ask-pending]"), null, { timeout: 3_000 }).then(() => true, () => false);
  report(`${tag} Esc closes the search while it opens`, closed);
  hold.release();
  const landed = await page.waitForFunction(() => location.pathname !== "/", null, { timeout: 15_000 }).then(() => true, () => false);
  report(`${tag} the page still arrives`, landed, new URL(page.url()).pathname);
  await page.unroute("**/*");

  // A page that never commits: the row is restored and the toast speaks.
  const scope2 = await openAndAsk(page, wide);
  const hold2 = await holdNavigation(page);
  await scope2.locator(`[data-ask-tool="${target}"]`).click();
  await page.waitForFunction((id) => document.querySelector(`[data-ask-tool="${id}"]`)?.hasAttribute("data-ask-pending"), target, { timeout: 3_000 }).catch(() => {});
  const toast = await page.getByRole("alert").filter({ hasText: "Couldn’t open" }).waitFor({ timeout: 12_000 }).then(() => true, () => false);
  report(`${tag} a page that never commits raises the toast`, toast);
  const restored = await page.locator(`[data-ask-tool="${target}"]`).first().evaluate((e) => !e.hasAttribute("data-ask-pending")).catch(() => false);
  report(`${tag} and the row comes back to rest`, restored);
  hold2.release();
  await page.unroute("**/*");
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
  await run(page, wide, tag);
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
