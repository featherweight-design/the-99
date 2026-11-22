// A friend's Spares tab, searched and filtered (design_handoff_the99_spares_search), at 390x844 and 1300x900. Search
// reads a card's name or type ("zom" finds a Zombie as you type), the result line counts cards (`3 of 25 spares`), the
// filters write the address and a reload draws the same list, a search with no match draws the shared zero state and
// Clear all filters brings every spare back, and the Type filter narrows from the bar (desktop) or the sheet (phone).
// Read-only. SPARES_FRIEND is the public id of a friend who shares spares with the account, offering a Zombie, a Saga
// and an Artifact.
//
//   SPARES_FRIEND=<public id> PROBE_BASE=http://localhost:<port> [PROBE_SHOTS=<dir>] pnpm probe:spares-search
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
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

const FRIEND = process.env.SPARES_FRIEND;
if (!FRIEND) throw new Error("Set SPARES_FRIEND.");
const VIEW = VIEWPORTS;
let failed = 0;
const check = (label, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`); if (!ok) failed++; };
await clerkSetup();
const browser = await chromium.launch();
for (const vp of VIEW) {
  const wide = vp.width >= 1000;
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  await signIn(page);
  const tiles = page.locator("[data-testid='spare-tile']");
  const open = async (qs = "") => {
    await page.goto(`${BASE}/friends/${FRIEND}/spares${qs}`, { waitUntil: "domcontentloaded" });
    await tiles.first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(500);
    // The account's own table-seat notices stack over the page's foot; they are not under test.
    await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none!important}" });
  };
  const search = page.getByRole("searchbox", { name: /Search spares/ });
  const resultLine = () => page.locator("body").innerText().then((t) => (t.match(/\d+ (?:of \d+ )?spares/) ?? [""])[0]);
  const shot = async (name) => { if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/${name}-${vp.width}.png` }); };
  await open();
  const total = await tiles.count();
  check(`${vp.label}: the frame draws over the tiles`, (await search.count()) === 1 && total > 3, `${total} tiles`);
  check(`${vp.label}: the result line says cards`, (await resultLine()) === `${total} spares`, await resultLine());
  await shot("rest");
  await search.fill("zom");
  await page.waitForTimeout(400);
  const zom = await tiles.count();
  check(`${vp.label}: "zom" finds the Zombies as you type`, zom > 0 && zom < total, `${zom} of ${total}`);
  check(`${vp.label}: the line reads "${zom} of ${total} spares"`, (await resultLine()) === `${zom} of ${total} spares`, await resultLine());
  check(`${vp.label}: the search is in the address`, new URL(page.url()).searchParams.get("q") === "zom");
  await open("?q=zom");
  check(`${vp.label}: a reload with ?q= draws the same list`, (await tiles.count()) === zom, `${await tiles.count()}`);
  await shot("zom");
  await search.fill("saga");
  await page.waitForTimeout(400);
  const saga = await tiles.count();
  check(`${vp.label}: "saga" finds the Saga by its type`, saga > 0 && saga < total, `${saga}`);
  await search.fill("xqzvkw");
  await page.waitForTimeout(400);
  check(`${vp.label}: nonsense draws the zero state`, (await tiles.count()) === 0 && (await page.getByText(/No spares match “xqzvkw”\./).count()) === 1);
  await shot("none");
  await page.getByRole("button", { name: "Clear all filters" }).first().click();
  await page.waitForTimeout(400);
  check(`${vp.label}: Clear all filters brings every spare back`, (await tiles.count()) === total && !page.url().includes("q="), `${await tiles.count()}`);
  // Type filter.
  await open();
  if (wide) {
    await page.getByRole("button", { name: /^Type/ }).first().click();
    await page.getByRole("option", { name: /^Artifact/ }).first().click();
    await page.keyboard.press("Escape");
  } else {
    await page.getByRole("button", { name: /^Filter cards/ }).first().click();
    await page.getByRole("dialog", { name: "Filter spares" }).waitFor();
    await shot("sheet");
    await page.getByRole("dialog").getByRole("switch", { name: /^Artifact/ }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: /^Show / }).click();
  }
  await page.waitForTimeout(500);
  const artifact = await tiles.count();
  check(`${vp.label}: the Type filter narrows to the Artifacts`, artifact > 0 && artifact < total, `${artifact}`);
  check(`${vp.label}: the type is in the address`, new URL(page.url()).searchParams.get("types") === "Artifact", page.url());
  await shot("type");
  // Sort by name.
  await open("?sort=name");
  const names = await page.locator("[data-testid='spare-tile'] [data-testid='spare-tile-press'], [data-testid='spare-tile'] button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  check(`${vp.label}: ?sort=name draws the tiles`, names.length === total, `${names.length}`);
  await context.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
