// Opponent Background picker (Social R3 addendum), at 390x844 and 1300x900. On a deck's Games tab it opens
// the log form's "Add opponent" picker, searches a commander that chooses a Background, and checks the hit's
// second line, the Background step, the single Seat button naming the pair, and the seat drawn as a pair.
// It saves nothing. Needs a local dev server whose account has opponents on (SOCIAL_FRIENDS_ENABLED) and
// a Lae'zel, Vlaakith's Champion and a Raised by Giants in the catalog.
//
//   PROBE_BASE=http://localhost:<port> [WALK_DECK=<deck id>] [PROBE_SHOTS=<dir>] pnpm probe:opponent-background
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.WALK_DECK ?? "47eb032a-4a19-43c9-86be-c45203365ed1";
const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async ([email, password]) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = email.includes("+clerk_test")
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
  }, [EMAIL, PASSWORD ?? ""]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}


const report = {};
let failed = 0;
const check = (label, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`); if (!ok) failed++; };
await clerkSetup();
const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  await signIn(page);
  let deck = process.env.WALK_DECK;
  if (!deck) {
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    deck = await page.evaluate(() => [...document.querySelectorAll("a[href^='/decks/']")].map((a) => a.getAttribute("href").split("/")[2]).find((id) => /^[0-9a-f-]{36}$/.test(id)));
  }
  await page.goto(`${BASE}/decks/${deck}`, { waitUntil: "networkidle" });
  const tab = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map((t) => t.getAttribute("aria-label")).find((t) => t?.startsWith("Games")));
  await page.locator(`[role="tab"][aria-label="${tab}"]`).dispatchEvent("click");
  await page.getByRole("button", { name: /log a game|log another/i }).first().dispatchEvent("click");
  await page.getByRole("button", { name: /add opponent/i }).first().dispatchEvent("click");
  await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none!important}" });
  const shot = async (n) => { if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/${n}-${vp.width}.png` }); };
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("searchbox").fill("lae");
  const hit = dialog.getByRole("button", { name: /Lae.zel/ }).first();
  await hit.waitFor({ timeout: 15000 });
  console.log(JSON.stringify(await hit.innerText()));
  await shot("1-hits");
  check(`${vp.label}: hit shows "chooses a Background"`, (await hit.innerText()).toLowerCase().includes("chooses a background"));
  await hit.dispatchEvent("click");
  const field = dialog.getByPlaceholder(/background/i);
  await field.waitFor({ timeout: 5000 });
  check(`${vp.label}: Background step opens`, true);
  await shot("2-step");
  await field.fill("raised");
  await dialog.getByRole("button", { name: /Raised by Giants/ }).first().dispatchEvent("click");
  const seatBtn = dialog.getByRole("button", { name: /^Seat .* \+ Raised by Giants/ });
  await seatBtn.waitFor({ timeout: 5000 });
  await shot("3-chosen");
  check(`${vp.label}: one Seat button names the pair`, true);
  await seatBtn.dispatchEvent("click");
  await page.getByText(/Lae.zel \+ Raised by Giants/).first().waitFor({ timeout: 5000 });
  check(`${vp.label}: seat drawn as pair`, true);
  await page.getByText(/Lae.zel \+ Raised by Giants/).first().scrollIntoViewIfNeeded();
  await shot("4-seated");
  await context.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
