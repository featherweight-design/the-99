// probe:help-panel — the ? and its panel and sheet (discovery R2·8, plan `2026-10-16-discovery-r2-r3.md`, "Browser
// probes"; design table `docs/superpowers/design-tables/discovery-r2-8-help.md`), in a real browser at 390x844 and
// 1300x900.
//
// What jsdom cannot see, and the unit tests therefore do not prove: the ? in the real shell (the rail's foot from `md`,
// the header's right below it), the entries fetched from `GET /api/about/entries` under the reader's own switches, the
// panel's focus in a real document, and Show me reaching a control the page actually draws. It presses the ?, a row,
// an Elsewhere chip and Show me, and searches, asserting:
//   - the ? holds `aria-expanded` while open, and the panel is `aria-modal` false at 1300, true (over a scrim) at 390;
//   - focus moves into the panel on open, and back to the ? on close, by Escape and by ✕;
//   - a row opens in place, and an Elsewhere chip swaps the list (the section head names the chosen place);
//   - a search draws hits or the none line, and the list comes back when it is cleared;
//   - Show me closes the panel and lands its halo (`data-target-halo`) on a drawn control, pressing nothing. The pages
//     are tried in turn until one draws a Show me; none drawing one is SKIP, never PASS.
// Card details under the panel is R2·9's, not here.
//
// IT WRITES NOTHING: no database connection, and every press is a read (the panel, its search, Show me's halo). So it
// needs no scratch branch. The deck it opens is the account's first on `/decks`.
//
// The server: `next start` with `HELP_PANEL_ENABLED=true` (and, for Show me, the tools' switches on).
//
//   PROBE_BASE=http://localhost:3311 pnpm probe:help-panel
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "" || u.pathname !== "/") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only (http://localhost:3311)`);
  }
}
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");

const WIDTHS = [
  { name: "390", width: 390, height: 844, phone: true, place: "header" },
  { name: "1300", width: 1300, height: 900, phone: false, place: "rail" },
];
const PANEL = 'section[role="dialog"][aria-label="About this screen"]';
/** A body the panel has filled: the section head, G21's line, or a search's answer. */
const FILLED = `${PANEL} [data-help-here], ${PANEL} [data-help-empty]`;
/** A query no entry holds, for the none line. */
const NOWHERE = "zqxjvkw";

let failures = 0;
let skips = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};
const skip = (label, why) => {
  skips += 1;
  console.log(`SKIP  ${label}  (${why})`);
};

async function signIn(page, email, password) {
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
          if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
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
    [email, password ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

/** The ? for this width: a shell control, outside `<main>`, so it is reached by its own data attribute. */
const helpButton = (page, w) => page.locator(`[data-help-button="${w.place}"]`);

/** Whether focus is inside the panel, and whether it is on the ?. */
const focusState = (page, w) =>
  page.evaluate(([panel, place]) => {
    const a = document.activeElement;
    return { inPanel: a?.closest(panel) !== null && a !== null, onButton: a?.getAttribute("data-help-button") === place };
  }, [PANEL, w.place]);

async function open(page, w) {
  await helpButton(page, w).click();
  await page.waitForSelector(FILLED, { timeout: 15_000 });
}

async function visit(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.locator("main").first().waitFor({ timeout: 30_000 });
  // Past hydration: the ? is a client control.
  await page.waitForFunction(() => document.querySelector("[data-help-button]") !== null, null, { timeout: 15_000 }).catch(() => {});
}

async function walk(browser, w, deckPath) {
  console.log(`\n── ${w.name}`);
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone });
  const page = await context.newPage();
  try {
    await signIn(page, EMAIL, PASSWORD);

    // Collection · Cards: the plain screen (H3).
    await visit(page, "/collection");
    const button = helpButton(page, w);
    check((await button.count()) === 1, `${w.name} the ? is drawn in the ${w.place}`, `${await button.count()}`);
    check((await button.getAttribute("aria-expanded")) === "false", `${w.name} the ? reads closed`, `${await button.getAttribute("aria-expanded")}`);
    await open(page, w);
    check((await button.getAttribute("aria-expanded")) === "true", `${w.name} the ? reads open`, `${await button.getAttribute("aria-expanded")}`);
    const modal = await page.locator(PANEL).getAttribute("aria-modal");
    check(modal === (w.phone ? "true" : "false"), `${w.name} the panel is ${w.phone ? "a modal sheet" : "non-modal"}`, `aria-modal ${modal}`);
    const scrim = await page.locator("[data-help-scrim]").count();
    check(scrim === (w.phone ? 1 : 0), `${w.name} a scrim ${w.phone ? "under the sheet" : "is not drawn"}`, `${scrim}`);
    const f1 = await focusState(page, w);
    check(f1.inPanel, `${w.name} focus moves into the panel`, JSON.stringify(f1));

    // A row opens in place.
    const row = page.locator(`${PANEL} [data-help-row] button[aria-expanded]`).first();
    if ((await row.count()) === 0) {
      skip(`${w.name} a row`, "Collection lists no entry for this reader");
    } else {
      await row.click();
      check((await row.getAttribute("aria-expanded")) === "true", `${w.name} a row opens`, `${await row.getAttribute("aria-expanded")}`);
      const read = await page.locator(`${PANEL} [data-help-open] a`).first().getAttribute("href").catch(() => null);
      check(read?.startsWith("/about?tab=reference#") === true, `${w.name} the open row links to its Reference entry`, `${read}`);
    }

    // An Elsewhere chip swaps the list.
    const before = await page.locator(`${PANEL} [data-help-here]`).textContent();
    const chip = page.locator(`${PANEL} [data-help-chip]`).first();
    if ((await chip.count()) === 0) {
      skip(`${w.name} an Elsewhere chip`, "no other place in Collection holds an entry");
    } else {
      const label = (await chip.textContent())?.replace(/\s*\d+$/, "").trim();
      await chip.click();
      const after = await page.locator(`${PANEL} [data-help-here]`).textContent();
      check(after !== before && after?.toLowerCase().includes(label.toLowerCase()), `${w.name} a chip swaps the list in place`, `${before} → ${after}`);
    }

    // Search: hits for a word every About has, the none line for one it never holds, the list back on clear.
    const field = page.locator(`${PANEL} input[type="search"]`);
    await field.fill("deck");
    await page.waitForSelector(`${PANEL} [data-help-hits], ${PANEL} [data-help-none]`, { timeout: 5_000 }).catch(() => {});
    check((await page.locator(`${PANEL} [data-help-hit]`).count()) > 0, `${w.name} a search draws hits`, `${await page.locator(`${PANEL} [data-help-hit]`).count()} hits`);
    await field.fill(NOWHERE);
    check((await page.locator(`${PANEL} [data-help-none]`).count()) === 1, `${w.name} a search with no match draws the none line`, NOWHERE);
    await field.fill("");
    check((await page.locator(`${PANEL} [data-help-here]`).count()) === 1, `${w.name} clearing the search brings the list back`, "section head");

    // Escape closes, and focus goes back to the ?.
    await page.keyboard.press("Escape");
    await page.waitForSelector(PANEL, { state: "detached", timeout: 5_000 }).catch(() => {});
    check((await page.locator(PANEL).count()) === 0, `${w.name} Escape closes the panel`, `${await page.locator(PANEL).count()} open`);
    const f2 = await focusState(page, w);
    check(f2.onButton, `${w.name} focus goes back to the ? after Escape`, JSON.stringify(f2));

    // ✕ closes, and focus goes back to the ?.
    await open(page, w);
    await page.locator(`${PANEL} button[aria-label="Close"]`).click();
    await page.waitForSelector(PANEL, { state: "detached", timeout: 5_000 }).catch(() => {});
    const f3 = await focusState(page, w);
    check((await page.locator(PANEL).count()) === 0 && f3.onButton, `${w.name} ✕ closes and focus goes back to the ?`, JSON.stringify(f3));

    // The deck page reads the builder's view (H1): its title names the view, and Elsewhere is the deck's.
    if (deckPath === null) {
      skip(`${w.name} the deck page`, "the account holds no deck");
    } else {
      await visit(page, deckPath);
      await open(page, w);
      const title = await page.locator(`${PANEL} h2`).textContent();
      check(/^A deck · /.test(title ?? ""), `${w.name} the deck page's title names its view`, `${title}`);
      await page.keyboard.press("Escape");
    }

    // Show me, on the first page that draws one.
    const pages = [deckPath, deckPath && `${deckPath}?tab=analysis`, "/decks", "/collection", "/collection/wishlist", "/collection/replace", "/decks/new", "/friends"].filter(Boolean);
    let shown = false;
    for (const path of pages) {
      await visit(page, path);
      await open(page, w);
      const press = page.locator(`${PANEL} [data-help-show-me]`).first();
      if ((await press.count()) === 0) {
        await page.keyboard.press("Escape");
        continue;
      }
      const entry = await press.getAttribute("data-help-show-me");
      await press.click();
      await page.waitForSelector(PANEL, { state: "detached", timeout: 5_000 }).catch(() => {});
      check((await page.locator(PANEL).count()) === 0, `${w.name} Show me (${entry} on ${path}) closes the panel first`, "closed");
      const halo = await page.waitForSelector("[data-target-halo]", { timeout: 4_000 }).then(() => true).catch(() => false);
      check(halo, `${w.name} Show me lands its halo`, `data-target-halo ${halo}`);
      const pressed = await page.evaluate(() => document.querySelector('[aria-modal="true"]') !== null);
      check(!pressed, `${w.name} Show me presses nothing`, `a modal open: ${pressed}`);
      const bubble = await onPage(page, "[data-moment-bubble]").count();
      check(bubble === 0, `${w.name} Show me draws no bubble`, `${bubble}`);
      shown = true;
      break;
    }
    if (!shown) skip(`${w.name} Show me`, `none of ${pages.length} pages drew a control an entry names`);
  } finally {
    await context.close();
  }
}

await clerkSetup();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  await signIn(page, EMAIL, PASSWORD);
  // The account's first deck, read off its own decks list: the probe holds no database connection.
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.locator("main").first().waitFor({ timeout: 30_000 });
  const deckPath = await page
    .evaluate(() =>
      [...document.querySelectorAll("main a[href^='/decks/']")]
        .map((a) => a.getAttribute("href"))
        .find((h) => /^\/decks\/[0-9a-f-]{36}$/.test(h ?? "")) ?? null,
    )
    .catch(() => null);
  await page.close();
  console.log(`deck: ${deckPath ?? "none"}`);
  for (const w of WIDTHS) await walk(browser, w, deckPath);
} finally {
  await browser.close();
}
console.log(failures === 0 ? `\nALL PASS${skips ? ` (${skips} skipped)` : ""}` : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
