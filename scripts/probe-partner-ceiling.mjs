// #364 task 15: the deck ceiling, derived rather than written down. A Commander
// deck is a hundred cards including its commanders, so a pair's body is 98 and
// its land target is 36 — one fewer land, because the deck draws one fewer card.
//
// Creates a pair deck and a single-commander deck through the picker, seeding
// each with a fill, then reports for both: the header denominator, every
// decklist group's count (the Lands one is the land target), and the tile on
// /decks. A pair reading 99 anywhere, or 37 lands, is the failure.
//
// The handles are structural: the denominator is the text node holding `/ NN`
// in the deck header, and a group's count is the mono span beside its label.
// No class name in either is stable.
//
// Run by hand: `node scripts/probe-partner-ceiling.mjs`.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const PAIRS = "Atreus, Impulsive Son";
const PARTNER = "Kratos, Stoic Father";

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
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

// Builds a deck through the picker and returns its name and URL. `partner` null
// builds the single-commander deck the pair is measured against.
async function createDeck(page, commander, partner, label) {
  await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.fill('input[placeholder*="Search" i], input[type="search"]', commander.split(",")[0]);
  await page.waitForTimeout(350);
  await page.locator(`li button:has-text("${commander}"):visible`).first().click();
  await page.waitForTimeout(250);
  if (partner) {
    await page.locator('button[aria-label^="Add a partner"]:visible').first().click();
    await page.waitForTimeout(350);
    await page.locator(`li button:has-text("${partner}"):visible`).first().click();
    await page.waitForTimeout(300);
  }
  const name = `Probe ceiling ${label} ${Date.now()}`;
  await page.locator('input#picker-deck-name, input[type="text"]:visible').first().fill(name);
  await page.locator("button:visible").filter({ hasText: /create deck/i }).first().click();
  await page.waitForURL(/\/decks\/[0-9a-f-]{8,}/, { timeout: 40_000 });
  await page.waitForTimeout(2500);
  return { name, url: page.url() };
}

// The denominator plus every group count. The Lands group is the land target,
// and the two together are the whole of what task 15 changed on this surface.
async function readDeck(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    const denominator = [...document.querySelectorAll("span, div, p")]
      .map((n) => n.childNodes.length === 1 && n.textContent?.trim())
      .filter((t) => typeof t === "string" && /^\/\s*\d+$/.test(t))[0] ?? "absent";
    // A group header is a label beside a mono count in the same flex row; the
    // label is read off the header's first child so a count with an `auto`
    // clause still reports as its own number.
    const groups = [...document.querySelectorAll("h3, span")]
      .filter((n) => /^(Lands|Ramp|Draw|Removal|Threats|Interaction|Synergy|Other|Utility)$/.test(n.textContent?.trim() ?? ""))
      .map((n) => `${n.textContent.trim()} ${n.parentElement?.lastElementChild?.textContent?.trim()}`);
    return { denominator, groups };
  });
}

// The tile is a link on /decks whose text holds the deck's name; its count is
// the `NN / NN` inside it.
async function readTile(page, name) {
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  return page.evaluate((wanted) => {
    // The tile is an `article` with an absolute-inset link over it, so the link
    // itself holds no text — the count is a span inside the article beside it.
    const tiles = [...document.querySelectorAll("article")].filter((n) => /\d+\s*\/\s*\d+/.test(n.innerText ?? ""));
    const tile = tiles.find((n) => n.textContent?.includes(wanted));
    // /decks paginates and sorts, so a deck can be off this page. Reporting the
    // counts that are drawn makes that visible rather than reading as a defect.
    if (!tile) {
      return `absent — page draws ${tiles.map((n) => n.innerText.match(/\d+\s*\/\s*\d+/)?.[0]).join(", ") || "no counts"}`;
    }
    return tile.innerText.match(/\d+\s*\/\s*\d+/)?.[0] ?? tile.innerText.replace(/\n/g, " · ");
  }, name);
}

const browser = await clerkSetup().then(() => chromium.launch());
const context = await browser.newContext({ viewport: { width: 1300, height: 950 } });
const page = await context.newPage();
page.on("pageerror", (e) => console.log(`  [pageerror] ${String(e).slice(0, 300)}`));

await signIn(page);

for (const [label, partner, wantBody, wantLands] of [
  ["pair", PARTNER, 98, 36],
  ["single", null, 99, 37],
]) {
  const deck = await createDeck(page, PAIRS, partner, label);
  const { denominator, groups } = await readDeck(page, deck.url);
  const tile = await readTile(page, deck.name);
  console.log(`\n${label} — ${deck.name}`);
  console.log(`  header denominator: ${denominator} (want / ${wantBody})`);
  console.log(`  groups: ${groups.join(" · ") || "none drawn"} (want Lands ${wantLands})`);
  console.log(`  /decks tile: ${tile} (want NN / ${wantBody})`);
}

await browser.close();
