// Gate 5 for #43 Task 9: the /collection marker's lifecycle, driven four ways.
// /collection has no mutation of its own — the marker is a read of what the
// decks claim — so the journey has to be run from the deck side and observed
// here: add a card to a deck, watch the row change, take it back out, watch it
// return, then do it again and reload.
//
// The four passes:
//   forward  add the card to a deck            → the row grows a marker
//   reverse  remove it again                   → the row is bare, as it began
//   repeat   add / remove / add                → the marker comes back
//   resume   reload, and a second browser      → the same, from the server
//
// Every mutation is undone by the pass that follows it, so the deck ends where
// it started. Run by hand, and not part of `pnpm test`:
// `PROBE_DECK=<id> node scripts/probe-collection-lifecycle.mjs`
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

// CLERK_SECRET_KEY is asserted but not bound: `clerkSetup()` reads it from the
// environment itself.
const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
let DECK = process.env.PROBE_DECK;
const CARD = process.env.PROBE_CARD ?? "Sol Ring";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
// Named one by one, for the same reason `requireEnv` lists every missing
// variable at once: "sign-in failed" thirty seconds into a browser run is a
// much worse way to learn a value is absent. These two stay here rather than in
// the call above because neither is unconditionally required — PROBE_DECK is
// supplied per run, and a `+clerk_test` fixture address takes the email-code
// path and has no password to supply.
const missing = [
  !DECK && "PROBE_DECK",
  !EMAIL.includes("+clerk_test") && !PASSWORD && "E2E_AUDIT_USER_PASSWORD",
].filter(Boolean);
if (missing.length > 0) throw new Error(`Set ${missing.join(", ")}.`);

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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
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

// What /collection says about one card, read fresh from the server every time.
async function readRow(page, name) {
  await page.goto(`${BASE}/collection?q=${encodeURIComponent(name)}`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(900);
  const rowsBtn = page.getByRole("button", { name: "Rows view" });
  if (await rowsBtn.count()) await rowsBtn.click();
  await page.waitForTimeout(600);
  return page.evaluate((wanted) => {
    for (const b of document.querySelectorAll("button[aria-label]")) {
      const title = b.querySelector("span[title]");
      if (title?.getAttribute("title") !== wanted) continue;
      const marker = [...b.querySelectorAll("span")].find((n) =>
        /^(\d+ free|\d+ in a draft|short \d+)$/.test((n.textContent ?? "").trim()),
      );
      return {
        aria: b.getAttribute("aria-label"),
        marker: marker ? marker.textContent.trim() : null,
        height: Math.round(b.getBoundingClientRect().height),
        border: getComputedStyle(b).borderTopColor,
      };
    }
    return null;
  }, name);
}

// The deck side of the journey. Quick-add is the shipped path in and the
// decklist row's own remove control is the path back out.
async function addToDeck(page, name) {
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const field = page.getByLabel("Add a card to this deck by name").first();
  await field.click();
  await field.fill(name);
  await page.waitForTimeout(2000);
  // The bar's own hint says "↑↓ to move · ↵ to add": Enter commits the ACTIVE
  // result, and nothing is active until the list has been moved into.
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
}

async function removeFromDeck(page, name) {
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: new RegExp(`Remove (one )?${name}`, "i") }).first().click();
  await page.waitForTimeout(1600);
}

function log(pass, seen) {
  console.log(`\n### ${pass}`);
  console.log(`  marker: ${JSON.stringify(seen?.marker ?? null)}  height: ${seen?.height ?? "?"}`);
  console.log(`  aria:   ${JSON.stringify(seen?.aria ?? null)}`);
  console.log(`  border: ${seen?.border ?? "?"}`);
}

await clerkSetup();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
const page = await context.newPage();
await signIn(page);

if (DECK === "auto") {
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  // /decks/import and /decks/new are routes, not decks — only a uuid is a deck.
  const href = await page.evaluate(
    () =>
      [...document.querySelectorAll('a[href^="/decks/"]')]
        .map((a) => a.getAttribute("href"))
        .find((h) => /^\/decks\/[0-9a-f-]{36}$/.test(h ?? "")) ?? null,
  );
  if (!href) throw new Error("no deck to drive");
  DECK = href.split("/").pop();
  console.log(`driving deck ${DECK}`);
}

const before = await readRow(page, CARD);
log("0 · baseline (card not on the deck)", before);

await addToDeck(page, CARD);
const forward = await readRow(page, CARD);
log("1 · FORWARD — added to the deck", forward);

await removeFromDeck(page, CARD);
const reverse = await readRow(page, CARD);
log("2 · REVERSE — removed again", reverse);

await addToDeck(page, CARD);
const repeat = await readRow(page, CARD);
log("3 · REPEAT — added a second time", repeat);

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);
const resumeSame = await readRow(page, CARD);
log("4a · RESUME — same tab, reloaded", resumeSame);

const second = await browser.newContext({ viewport: { width: 1300, height: 900 } });
const page2 = await second.newPage();
await signIn(page2);
log("4b · RESUME — a second, independent session", await readRow(page2, CARD));
await second.close();

// Leave the deck as it was found.
await removeFromDeck(page, CARD);
log("5 · restored", await readRow(page, CARD));

await context.close();
await browser.close();
