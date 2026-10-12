// A card's hover preview and its card details draw ONE printing, on every surface a deck page has a
// hover preview for, walked in a real browser at 1300x900 (hover) and 390x844 (details).
//
// The rule is `chainArt`'s and `deckPickFor`'s, unit tested; this proves a reader who owns a card in
// a non-default printing sees that printing under the pointer and in the dialog they open next. The
// bug it guards: a loader that took the catalog's representative art for the hover while card
// details resolved the owned or deck-picked printing, so the two disagreed on the same card.
//
// READ-ONLY. It writes nothing, so it may point at any database the server it names reads; it
// signs in as `E2E_AUDIT_USER_EMAIL`. It cannot choose a fixture for you: name a deck and cards
// that the account owns in a printing other than the catalog's default, or the run proves nothing.
//
//   PROBE_BASE=http://localhost:3197 PROBE_DECK=<deck uuid> \
//   PROBE_CARDS="Elite Scaleguard,Glory Seeker" node scripts/probe-hover-printing.mjs
//
// Surfaces: the decklist row (`/decks/<id>`, Your deck tab) and Review changes
// (`/decks/<id>/changes`). A card must be PRESENT on a surface to be measured there; a name found on
// neither fails the run, and so does a surface that measured nothing.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.PROBE_DECK;
const CARDS = (process.env.PROBE_CARDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!DECK || CARDS.length === 0) throw new Error("Set PROBE_DECK and PROBE_CARDS.");
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}: ${detail}`);
  if (!ok) failures += 1;
}
/** The Scryfall id in an image URL, shortened: the printing, not the cache-busting query. */
const printing = (u) => (u ?? "").match(/([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[1] ?? null;

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
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

/** The image the open dialog draws: its first `<img>` or a url() background. */
async function dialogArt(page) {
  const dialog = page.locator('[role="dialog"]').last();
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(800);
  return dialog.evaluate((el) => {
    const img = el.querySelector("img");
    if (img) return img.currentSrc || img.src;
    const bg = [...el.querySelectorAll("[style*='url(']")].map((n) => n.getAttribute("style"))[0];
    return bg ?? null;
  });
}

async function openDeck(page, tab) {
  await page.goto(`${BASE}/decks/${DECK}${tab === "changes" ? "/changes" : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
}

await clerkSetup();
const browser = await chromium.launch();
const seen = new Map();
try {
  // ---- 1300: hover, then details, per surface ----
  const wide = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await wide.newPage();
  await signIn(page);
  for (const surface of ["deck", "changes"]) {
    await openDeck(page, surface);
    let measured = 0;
    for (const name of CARDS) {
      const row = onPage(page, "*").getByText(name, { exact: true }).first();
      if (!(await row.count())) continue;
      await row.scrollIntoViewIfNeeded();
      const box = await row.boundingBox();
      await page.mouse.move(box.x + 5, box.y + 5);
      await page.mouse.move(box.x + 8, box.y + 8);
      await page.waitForTimeout(900);
      const hovered = await page.evaluate(() => document.querySelector('[data-testid="hover-preview"]')?.style.background ?? null);
      await page.mouse.move(5, 5);
      await row.click();
      const details = printing(await dialogArt(page));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      measured += 1;
      if (surface === "deck") seen.set(name, details);
      report(`${surface} · ${name} (1300)`, printing(hovered) !== null && printing(hovered) === details, `hover ${printing(hovered)}, details ${details}`);
    }
    report(`${surface} measured at least one card`, measured > 0, `${measured} of ${CARDS.length}`);
  }
  await wide.close();

  // ---- 390: no hover on a phone; the dialog must still open on the same printing ----
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const small = await phone.newPage();
  await signIn(small);
  await openDeck(small, "deck");
  for (const name of CARDS) {
    if (!seen.has(name)) continue;
    const row = onPage(small, "*").getByText(name, { exact: true }).first();
    if (!(await row.count())) { report(`deck · ${name} (390)`, false, "not on the page"); continue; }
    await row.click();
    const details = printing(await dialogArt(small));
    await small.keyboard.press("Escape");
    await small.waitForTimeout(400);
    report(`deck · ${name} (390)`, details === seen.get(name), `details ${details}, 1300 details ${seen.get(name)}`);
  }
  await phone.close();
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nPASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
