// probe:tuning-tab — tool discovery B2: the Tuning hub is a tab of its own, and Consider is its first tool.
//
// At 390x844, 820x1180 and 1300x900, on a deck of the audit user's, it PRESSES rather than reads a URL:
//  1. the tab row draws a Tuning tab (`#tab-tuning`) and no Consider tab (`#tab-consider`);
//  2. pressing Tuning selects it and draws the hub (`section[data-tuning-hub]`) inside `#panel-tuning`;
//  3. the hub's first tile is Consider, and pressing it draws the Consider panel's tiles in the hub;
//  4. Analysis no longer carries the hub: pressing it draws `#panel-analysis` with no `section[data-tuning-hub]`;
//  5. the retired `?tab=consider` arrives on Tuning with Consider open.
// On main (before B2) step 1 fails: there is no Tuning tab. Screenshots of step 3 land in PROBE_OUT for the contact sheet.
//
// Run by hand against `next dev`: `PROBE_BASE=http://localhost:3258 [PROBE_DECK=<id>] node scripts/probe-tuning-tab.mjs`.
import { mkdirSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const FIXTURE = EMAIL.includes("+clerk_test");
const { E2E_AUDIT_USER_PASSWORD: PASSWORD } = FIXTURE
  ? { E2E_AUDIT_USER_PASSWORD: null }
  : requireEnv(["E2E_AUDIT_USER_PASSWORD"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const OUT = process.env.PROBE_OUT ?? null;

const VIEWPORTS = [
  { label: "phone 390x844", width: 390, height: 844 },
  { label: "iPad 820x1180", width: 820, height: 1180 },
  { label: "desktop 1300x900", width: 1300, height: 900 },
];

// Lifted verbatim from `scripts/probe-discovery-ui.mjs`, which documents at
// length why the hosted portal cannot be driven unattended and `window.Clerk` can.
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
          if (!factor) {
            const offered = (attempt.supportedFirstFactors ?? []).map((f) => f.strategy);
            return `no email_code factor at ${attempt.status}; offered: ${offered.join(", ") || "none"}`;
          }
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
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

let failed = 0;
function report(name, ok, detail = "") {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

/** The deck to probe: PROBE_DECK, else the first deck on /decks. */
async function pickDeck(page) {
  if (process.env.PROBE_DECK) return process.env.PROBE_DECK;
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  const href = await onPage(page, "a[href^='/decks/']").evaluateAll((links) =>
    links.map((a) => a.getAttribute("href")).find((h) => /^\/decks\/[0-9a-f-]{36}$/.test(h ?? "")),
  );
  if (!href) throw new Error("no deck on /decks for the audit user");
  return href.split("/").pop();
}

if (OUT) mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
await clerkSetup();

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const at = (name) => `${viewport.label} · ${name}`;
    await signIn(page);
    const deck = await pickDeck(page);

    await page.goto(`${BASE}/decks/${deck}`, { waitUntil: "domcontentloaded" });
    const tuningTab = onPage(page, "#tab-tuning").first();
    await tuningTab.waitFor({ state: "attached", timeout: 60_000 }).catch(() => {});
    report(at("the row draws a Tuning tab"), (await tuningTab.count()) === 1, `at ${new URL(page.url()).pathname}`);
    report(at("the row draws no Consider tab"), (await onPage(page, "#tab-consider").count()) === 0);
    if ((await tuningTab.count()) === 0) { await context.close(); continue; }

    await tuningTab.click();
    const hub = onPage(page, "#panel-tuning section[data-tuning-hub]").first();
    await hub.waitFor({ timeout: 30_000 }).catch(() => {});
    report(at("pressing Tuning selects it"), (await tuningTab.getAttribute("aria-selected")) === "true");
    report(at("the hub draws in the Tuning panel"), (await hub.count()) === 1);

    const tiles = await hub.locator("[data-tool-tile]").evaluateAll((els) => els.map((e) => e.getAttribute("data-tool-tile")));
    report(at("Consider is the hub's first tile"), tiles[0] === "consider", tiles.join(" · "));
    await hub.locator("button[data-tool-tile='consider']").first().click();
    const considerTiles = onPage(page, "#panel-tuning #panel-consider [data-testid='suggestion-tile']");
    const empty = onPage(page, "#panel-tuning #panel-consider");
    await empty.first().waitFor({ timeout: 30_000 }).catch(() => {});
    report(at("pressing Consider draws its panel in the hub"), (await empty.count()) === 1,
      `${await considerTiles.count()} suggestion tiles`);
    if (OUT) await page.screenshot({ path: `${OUT}/tuning-consider-${viewport.width}.png`, fullPage: false });

    await onPage(page, "#tab-analysis").first().click();
    await onPage(page, "#panel-analysis").first().waitFor({ timeout: 30_000 }).catch(() => {});
    report(at("Analysis carries no hub"),
      (await onPage(page, "#panel-analysis").count()) === 1 && (await onPage(page, "section[data-tuning-hub]").count()) === 0);

    await page.goto(`${BASE}/decks/${deck}?tab=consider`, { waitUntil: "domcontentloaded" });
    await onPage(page, "#panel-tuning #panel-consider").first().waitFor({ timeout: 60_000 }).catch(() => {});
    report(at("?tab=consider arrives on Tuning with Consider open"),
      (await onPage(page, "#tab-tuning").first().getAttribute("aria-selected").catch(() => null)) === "true"
        && (await onPage(page, "#panel-tuning #panel-consider").count()) === 1);
    if (OUT) {
      await page.goto(`${BASE}/decks/${deck}?tab=tuning`, { waitUntil: "domcontentloaded" });
      await onPage(page, "#panel-tuning section[data-tuning-hub]").first().waitFor({ timeout: 60_000 }).catch(() => {});
      await page.waitForTimeout(1_500);
      await page.screenshot({ path: `${OUT}/tuning-tiles-${viewport.width}.png`, fullPage: false });
    }
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
