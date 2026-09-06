// #337: a false validation error is reported to flash on the new-deck save.
// Drives /decks/new with a name that is certainly free and records every
// danger-coloured line that appears between the click and the navigation.
//
// Run by hand: `node scripts/probe-new-deck.mjs`.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

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

const browser = await clerkSetup().then(() => chromium.launch());
const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") console.log(`  [console ${m.type()}] ${m.text().slice(0, 300)}`);
});
page.on("pageerror", (e) => console.log(`  [pageerror] ${String(e).slice(0, 300)}`));

await signIn(page);
await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// The first commander row in the picker.
await page.locator('button:has-text("Select"), [role="radio"], li button').first().click();
await page.waitForTimeout(300);

const name = `Probe ${Date.now()}`;
await page.fill("#picker-deck-name", name);
await page.waitForTimeout(200);

// Polled from Node rather than watched in the page: the flash may outlive the
// navigation that clears it, and an in-page observer dies with the document.
const dangerColour = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--danger").trim(),
);
console.log(`--danger resolves to ${dangerColour}`);

console.log(`creating deck "${name}"`);
const seen = [];
const deadline = Date.now() + 25_000;
const clicked = page.locator('button:has-text("Create deck")').first().click();
while (Date.now() < deadline) {
  const lines = await page
    .evaluate(() => {
      const out = [];
      for (const n of document.querySelectorAll("p, span, div, li")) {
        if (n.children.length > 0) continue;
        const t = (n.textContent ?? "").trim();
        if (!t || n.getClientRects().length === 0) continue;
        out.push(`${getComputedStyle(n).color} :: ${t}`);
      }
      return out;
    })
    .catch(() => []);
  for (const l of lines) if (!seen.includes(l)) seen.push(l);
  if (/\/decks\/[0-9a-f-]{36}/.test(page.url())) break;
  await page.waitForTimeout(40);
}
await clicked.catch(() => {});
console.log(`landed on ${page.url()}`);
const suspicious = seen.filter(
  (s) =>
    s.startsWith(dangerColour) ||
    /taken|already|exists|fail|invalid|error|must be/i.test(s),
);
console.log(suspicious.length ? "error-ish lines seen during the save:" : "none seen");
for (const s of suspicious) console.log(`  ${s}`);

await browser.close();
