// probe:tuning-about — tool discovery B3: the ? on the Tuning tab opens About on Tuning's own section.
//
// At 390x844 and 1300x900, on a deck of the audit user's, it PRESSES rather than reads a URL:
//  1. press the Tuning tab, then the ? (the header's on a phone, the rail's on a desktop);
//  2. About opens on /about/decks scrolled to `#tuning`, the section named Tuning;
//  3. that section draws the Suggested changes, Proposed cuts and Mana Balance labels, which keep their
//     `decks/analysis/*` keys, and the Analysis section draws none of them;
//  4. back on the deck, the ? on the Analysis tab still opens `#analysis`.
// On main (before B3) step 2 fails: Tuning read as Analysis, so the ? landed on `#analysis`, and there is no `#tuning`.
//
// Run by hand against `next dev`: `PROBE_BASE=http://localhost:3258 [PROBE_DECK=<id>] pnpm probe:tuning-about`. Loopback only.
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
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "") {
    throw new Error(`probe:tuning-about refuses PROBE_BASE ${BASE}: a loopback server with a port only.`);
  }
}
const OUT = process.env.PROBE_OUT ?? null;

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
  // The list streams in after the shell: wait for a deck's link before reading them.
  await onPage(page, "a[href^='/decks/']").first().waitFor({ state: "attached", timeout: 30_000 }).catch(() => {});
  const href = await onPage(page, "a[href^='/decks/']").evaluateAll((links) =>
    links.map((a) => a.getAttribute("href")).find((h) => /^\/decks\/[0-9a-f-]{36}$/.test(h ?? "")),
  );
  if (!href) throw new Error(`no deck on /decks for the audit user (at ${new URL(page.url()).pathname})`);
  return href.split("/").pop();
}

const VIEWPORTS = [
  { label: "phone 390x844", width: 390, height: 844, help: "header" },
  { label: "desktop 1300x900", width: 1300, height: 900, help: "rail" },
];
const MOVED = ["decks/analysis/suggested", "decks/analysis/cuts", "decks/analysis/mana"];

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
    console.log(`${viewport.label}: deck ${deck}`);

    /** Opens the deck on `tab` by pressing it, presses the ?, and returns the About address it landed on. */
    const askFrom = async (tab) => {
      await page.goto(`${BASE}/decks/${deck}`, { waitUntil: "domcontentloaded" });
      const button = onPage(page, `#tab-${tab}`).first();
      await button.waitFor({ state: "attached", timeout: 60_000 });
      await button.click();
      await onPage(page, `#panel-${tab}`).first().waitFor({ timeout: 30_000 }).catch(() => {});
      // The header's ? scrolls with the header, so a phone that scrolled to the panel has carried it away: back to the top.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(800);
      await page.locator(`[data-help-button='${viewport.help}']`).first().click();
      await page.waitForURL((u) => u.pathname === "/about/decks", { timeout: 30_000 }).catch(() => {});
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(800);
      return new URL(page.url());
    };

    const fromTuning = await askFrom("tuning");
    report(at("the ? on Tuning opens /about/decks#tuning"),
      fromTuning.pathname === "/about/decks" && fromTuning.hash === "#tuning", `${fromTuning.pathname}${fromTuning.hash}`);
    const name = (await page.locator("#tuning-name").first().textContent().catch(() => null))?.trim() ?? null;
    report(at("the section is named Tuning"), name === "Tuning", String(name));
    for (const key of MOVED) {
      const inTuning = await page.locator(`section#tuning [data-about-label='${key}']`).count();
      const inAnalysis = await page.locator(`section#analysis [data-about-label='${key}']`).count();
      report(at(`${key} draws under Tuning, not Analysis`), inTuning > 0 && inAnalysis === 0, `tuning ${inTuning}, analysis ${inAnalysis}`);
    }
    if (OUT) await page.screenshot({ path: `${OUT}/about-tuning-${viewport.width}.png`, fullPage: false });

    const fromAnalysis = await askFrom("analysis");
    report(at("the ? on Analysis still opens /about/decks#analysis"),
      fromAnalysis.pathname === "/about/decks" && fromAnalysis.hash === "#analysis", `${fromAnalysis.pathname}${fromAnalysis.hash}`);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
