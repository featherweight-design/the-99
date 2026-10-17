// Times the card scanner in desktop Chromium at a phone's width, under a 4x CPU throttle and no network throttle (the
// scan lane's method, 2026-10-16): the frame-to-guess, add, mode and Review waits, read from the scanner's own timing
// row (`src/lib/scan/timing.ts`), which this script catches on its way to `POST /api/card-scan/timing`.
//
// The camera is Chromium's fake one playing a clip that puts a card down and takes it away again, over and over
// (`lib/fake-camera.mjs`). The server's match is answered here after `MEASURE_MATCH_MS` (default 100, about the lab's
// 97ms median) with a fixed answer for the card shown, so the figure measures the device's half and a local database
// needs no scan index. Auto mode adds each card to the sheet's list, which is never saved: the script writes nothing.
//
//   PROBE_BASE=http://localhost:3417 pnpm measure:scan
//
// The server needs CARD_SCAN_ENABLED, COLLECTION_EDIT_ENABLED and ABOUT_SHEET_ENABLED (so /collection does not
// redirect to /about), and a network for the models and the card image. MEASURE_SECONDS (default 60) is how long the
// scanner stays open; MEASURE_CPU (default 4) the throttle; MEASURE_RUNS (default 1) how many sessions.
import path from "node:path";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { fakeCameraArgs, writeFakeClip } from "./lib/fake-camera.mjs";
import { onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SECONDS = Number(process.env.MEASURE_SECONDS ?? 60);
const CPU = Number(process.env.MEASURE_CPU ?? 4);
const MATCH_MS = Number(process.env.MEASURE_MATCH_MS ?? 100);
const RUNS = Number(process.env.MEASURE_RUNS ?? 1);

// Sol Ring, as the catalog holds it: Auto reads its printings for real, so the id must be the catalog's own.
const CARD = { oracleId: "6ad8011d-3471-4369-9d68-b264cc027487", name: "Sol Ring", scryfallId: "04002706-2236-4b79-bdea-4f263e43cb9c" };
const MATCH = {
  index: "measure",
  margin: 0.2,
  guesses: [
    { ...CARD, typeLine: "Artifact", imageUri: null, score: 0.93 },
    { oracleId: "0bc7f093-bef0-4f1a-852c-4b75ebf54838", name: "Arcane Signet", scryfallId: "01b186af-8825-4257-80fd-9c1ecdb21414", typeLine: "Artifact", imageUri: null, score: 0.73 },
  ],
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async ([email, password]) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = email.includes("+clerk_test") ? await signIn.create({ identifier: email }) : await signIn.create({ identifier: email, password });
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
  }, [EMAIL, PASSWORD]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const med = (v) => {
  if (!v.length) return "-";
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const scene = { w: 720, h: 1280 };
const clip = await writeFakeClip(
  [[scene, 60], [{ ...scene, card: CARD.name, share: 0.3, cx: 0.5, cy: 0.45, angle: 4 }, 180]],
  path.resolve("contact-sheets/measure-scan"),
  "clip",
);

await clerkSetup();
const browser = await chromium.launch({ args: fakeCameraArgs(clip) });
const rows = [];
try {
  for (let run = 0; run < RUNS; run++) {
    const context = await browser.newContext({ permissions: ["camera"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await signIn(page);
    await page.evaluate(() => localStorage.setItem("the99.scan.mode", "fast"));
    await page.route("**/api/card-scan/match", async (route) => {
      await new Promise((r) => setTimeout(r, MATCH_MS));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MATCH) });
    });
    let resolveRow;
    const rowPosted = new Promise((r) => (resolveRow = r));
    await page.route("**/api/card-scan/timing", async (route) => {
      resolveRow(JSON.parse(route.request().postData() ?? "null"));
      await route.fulfill({ status: 204 });
    });
    await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });
    await page.locator("main h1").first().waitFor({ timeout: 60_000 });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
    // A press before the page hydrates does nothing, so it is pressed again until the sheet opens.
    for (let i = 0; !(await page.locator("[role=dialog]").first().isVisible()); i++) {
      if (i === 20) throw new Error("the Add cards sheet never opened");
      await onPageRole(page, "button", /^(\+\s*)?Add( cards)?$/).first().click();
      await page.waitForTimeout(1500);
    }
    await onPageRole(page, "button", /^Scan$/).first().click();
    await page.locator("[data-testid=scanner]").waitFor();
    await page.waitForTimeout(SECONDS * 1000);
    // Two mode presses, then Review: each times itself in the row.
    for (const name of [/^Normal$/, /^Auto$/]) {
      await page.locator("[data-testid=scanner]").getByRole("button", { name }).first().click();
      await page.waitForTimeout(4000);
    }
    await page.locator("[data-testid=scanner]").getByRole("button", { name: /review/i }).first().click();
    const row = await Promise.race([rowPosted, new Promise((r) => setTimeout(() => r(null), 30_000))]);
    if (!row) throw new Error("the scanner posted no timing row");
    rows.push(row);
    console.log(JSON.stringify(row));
    await context.close();
  }
} finally {
  await browser.close();
}

const all = (k) => rows.flatMap((r) => r[k]);
console.log(`\n| CPU ${CPU}x, match ${MATCH_MS}ms | median | samples |\n|---|---|---|`);
console.log(`| frame read | ${med(rows.map((r) => r.read).filter((v) => v !== null))} | ${rows.reduce((a, r) => a + r.frames, 0)} frames |`);
for (const k of ["guess", "add", "mode"]) console.log(`| ${k} | ${med(all(k))} | ${all(k).length} |`);
console.log(`| review | ${med(rows.map((r) => r.review).filter((v) => v !== null))} | ${rows.filter((r) => r.review !== null).length} |`);
