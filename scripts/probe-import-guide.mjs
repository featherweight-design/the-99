// The collection upload names the app a failed file came from and opens THAT app's export guide. Drops a Delver Lens
// file whose header lacks a Quantity column (Delver's custom-columns export, header from a real 2023 file) on the replace
// page's drop zone at 390 and 1180x820, then asserts: the error says it looks like a Delver Lens file, its link opens
// the guides with Delver Lens expanded (and ManaBox not), and a plain header names no app. On main there is no such line,
// so the first assertion fails. Sends nothing to the server: the file never passes the header check. Signs in as the
// audit user; writes nothing.
//
//   PROBE_BASE=http://localhost:3102 SHOTS=/tmp/import node scripts/probe-import-guide.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const SHOTS = process.env.SHOTS;
const SCREENS = [
  { name: "phone-390", viewport: { width: 390, height: 844 } },
  { name: "desktop-1180", viewport: { width: 1180, height: 820 } },
];
const DELVER_NO_QTY = 'Name,Acquired Price,Language,Set Code,TCGPlayer Product ID,Number,Foil\n"Mondrak, Glory Dominus","$26.45","","ONE","478276","23","Foil"\n';
const PLAIN_NO_QTY = "Title,Amount\nSol Ring,1\n";

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
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
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}


await clerkSetup();
const browser = await chromium.launch();
try {
  for (const s of SCREENS) {
    const context = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/collection/replace`, { waitUntil: "networkidle", timeout: 180_000 });
    const input = page.getByLabel("Upload collection CSV");
    await input.setInputFiles({ name: "delver.csv", mimeType: "text/csv", buffer: Buffer.from(DELVER_NO_QTY) });
    const line = page.locator("[data-from-app=delver]");
    await line.waitFor({ timeout: 15_000 }).catch(() => {});
    check(`${s.name}: a Delver header says it looks like a Delver Lens file`, (await line.count()) === 1, (await line.textContent().catch(() => "")) ?? "");
    await page.getByRole("button", { name: "How to export from Delver Lens" }).click({ timeout: 5_000 }).catch(() => {});
    const dialog = page.getByRole("dialog", { name: "How to export your collection" });
    check(`${s.name}: the link opens the guides`, await dialog.isVisible());
    check(`${s.name}: Delver Lens is expanded`, (await dialog.getByRole("button", { name: "Delver Lens" }).getAttribute("aria-expanded").catch(() => null)) === "true");
    check(`${s.name}: ManaBox is not`, (await dialog.getByRole("button", { name: "ManaBox" }).getAttribute("aria-expanded").catch(() => null)) === "false");
    check(`${s.name}: the Delver steps show`, (await dialog.textContent().catch(() => "")).includes("Create CSV file"));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${s.name}-guide.png` });
    await page.keyboard.press("Escape");
    await input.setInputFiles({ name: "plain.csv", mimeType: "text/csv", buffer: Buffer.from(PLAIN_NO_QTY) });
    await page.getByText("This file has no Name column").waitFor({ timeout: 10_000 }).catch(() => {});
    check(`${s.name}: a plain header names no app`, (await page.locator("[data-from-app]").count()) === 0);
    await context.close();
  }
} finally {
  await browser.close();
}
if (failed) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
