// probe:store-sets — store choice UI-3b-1 (handoff design_handoff_the99_store_choice): a reader on another store sees
// a set page and the proxy list priced at THAT store. Pressed in Chromium at 390x844 and 1300x900.
//
// What jsdom cannot prove, and this does:
//   - The real /collection/sets/<code> page, its cost strip opened by a press on the phone, offers no Mass Entry send
//     (Mana Pool's cart) and names no Mana Pool caveat, and no cell's spoken name says Mana Pool.
//   - Pressing a cell opens card details that buy at TCGplayer.
//   - /collection/proxies draws the proxied card's figure from TCGplayer's rows, not Mana Pool's.
// Fails on main: the strip offers `Send N to Mana Pool`, never-stocked and owned cells say Mana Pool, and the proxy
// figure is a Mana Pool figure.
//
// FIXTURE (read only): a scratch branch of local-dev, which the dev server reads, where the audit account has a user
// STORE_PREFERENCE_ENABLED override 'on', user_prefs.preferred_store = 'tcgplayer', printing_store_prices rows for
// tcgplayer, and one live proxy of PROBE_PROXY_CARD (default `The Ozolith`). PROBE_PROXY_TCG and PROBE_PROXY_MP list
// that card's per-printing figures in cents at each store, read off the same branch.
//
//   PROBE_BASE=http://localhost:3159 PROBE_PROXY_TCG=5711,5903 PROBE_PROXY_MP=6564,6785 pnpm probe:store-sets
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SET = process.env.PROBE_SET ?? "cmm";
const PROXY = process.env.PROBE_PROXY_CARD ?? "The Ozolith";
const dollars = (v) => (v ?? "").split(",").filter(Boolean)
  .map((c) => `$${(Number(c) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const PROXY_TCG = dollars(process.env.PROBE_PROXY_TCG);
const PROXY_MP = dollars(process.env.PROBE_PROXY_MP);
if (PROXY_TCG.length === 0 || PROXY_MP.length === 0) throw new Error("set PROBE_PROXY_TCG and PROBE_PROXY_MP");
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname)) {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback dev server only`);
  }
}

const WIDTHS = [
  { name: "390", width: 390, height: 844 },
  { name: "1300", width: 1300, height: 900 },
];

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test") || !password
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
}

const painted = (locator) => locator.evaluateAll((nodes) => nodes.filter((n) => n.getBoundingClientRect().width > 0).length);

async function run(size) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    // Answer every store request locally: the probe never reaches a store.
    await context.route(/^https:\/\/(www\.)?(tcgplayer|manapool|cardkingdom)\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }));
    const page = await context.newPage();
    await signIn(page);

    // The set page.
    await page.goto(`${BASE}/collection/sets/${SET}`, { waitUntil: "domcontentloaded" });
    const strip = page.locator("[data-set-cost]").first();
    await strip.waitFor({ timeout: 60_000 });
    if (size.width < 768) {
      // The phone's strip is one row until pressed; the press is what draws the send and the caveats.
      const open = strip.locator('[data-set-cost-toggle][aria-expanded="true"]');
      for (let attempt = 0; attempt < 3 && (await open.count()) === 0; attempt += 1) {
        await strip.locator("[data-set-cost-toggle]").filter({ visible: true }).first().click();
        await page.waitForTimeout(1000);
      }
      check((await open.count()) === 1, `${size.name} the strip opens on a press`, `${await open.count()} expanded`);
    }
    const stripText = (await strip.innerText()).replace(/\s+/g, " ");
    const send = await painted(strip.getByRole("link"));
    check(send === 0, `${size.name} the strip offers no Mana Pool send`, `${send} link(s); ${JSON.stringify(stripText)}`);
    check(!/Mana Pool|never been stocked/.test(stripText), `${size.name} the strip names no Mana Pool caveat`, JSON.stringify(stripText));

    const labels = await page.locator("button[aria-label]").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label")));
    const mana = labels.filter((l) => /Mana Pool/.test(l));
    const tcg = labels.filter((l) => /TCGplayer/.test(l));
    check(mana.length === 0, `${size.name} no cell speaks Mana Pool`, `${mana.length}: ${JSON.stringify(mana.slice(0, 2))}`);
    check(tcg.length > 0, `${size.name} cells speak TCGplayer`, `${tcg.length}: ${JSON.stringify(tcg.slice(0, 2))}`);

    // Press a priced cell: card details buys at the reader's store.
    const cell = page.locator("button[aria-label]").filter({ hasText: /\$/ }).filter({ visible: true }).first();
    await cell.scrollIntoViewIfNeeded();
    let opened = false;
    for (let attempt = 0; attempt < 3 && !opened; attempt += 1) {
      await cell.click();
      opened = await page.waitForSelector('[role="dialog"]', { timeout: 10_000 }).then(() => true, () => false);
    }
    check(opened, `${size.name} pressing a cell opens card details`, opened ? "dialog" : "none");
    if (opened) {
      const dialog = page.locator('[role="dialog"]').first();
      if (size.width < 768) {
        await dialog.locator("button", { hasText: "All details" }).filter({ visible: true }).first().click({ timeout: 20_000 });
        await page.waitForTimeout(800);
      }
      const buy = dialog.getByRole("link", { name: /^Buy any printing at TCGplayer/ });
      await buy.first().waitFor({ state: "attached", timeout: 20_000 }).catch(() => {});
      const shown = await painted(buy);
      check(shown > 0, `${size.name} the cell's card details buys at TCGplayer`, `${shown} painted`);
    }

    // The proxy list.
    await page.goto(`${BASE}/collection/proxies`, { waitUntil: "domcontentloaded" });
    await page.getByText(PROXY, { exact: true }).filter({ visible: true }).first().waitFor({ timeout: 60_000 });
    // The proxied card's own row, so another card at the same figure can neither pass nor fail the check.
    const proxyRow = page.locator("main li").filter({ hasText: PROXY }).filter({ visible: true }).first();
    const text = (await proxyRow.innerText()).replace(/\s+/g, " ");
    const atTcg = PROXY_TCG.filter((f) => text.includes(f));
    const atMp = PROXY_MP.filter((f) => text.includes(f));
    check(atTcg.length > 0 && atMp.length === 0, `${size.name} the proxy figure is TCGplayer's`, `tcg ${JSON.stringify(atTcg)} mp ${JSON.stringify(atMp)}`);
  } finally {
    await browser.close();
  }
}

await clerkSetup();
for (const size of WIDTHS) await run(size);
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
