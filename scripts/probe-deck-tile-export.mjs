// probe:deck-tile-export — Export from a /decks tile's ⋯ menu opens the deck page's own export dialog.
//
// At 1300x900 and 390x844: opens the first tile's ⋯ menu, presses Export, and requires the dialog
// (`Export deck`) to open over /decks with its preview naming the deck and counting its cards, drawn above the tile
// (what is painted at the dialog's own title belongs to the dialog), with no navigation away from /decks. Escape closes it and
// focus returns to the tile's ⋯ button. A run that finds no tile FAILS, because it measured nothing.
//
// Its one write is the About row `clearAboutSheet` sets for the account, read first and put back in a `finally`.
// Point it at `local-dev`.
//
//   PROBE_BASE=http://localhost:3044 node scripts/probe-deck-tile-export.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " ok " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

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
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (e) {
        return String(e?.errors?.[0]?.longMessage ?? e);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(failure);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  let capture = null;
  try {
    for (const [label, viewport] of [["1300", { width: 1300, height: 900 }], ["390", { width: 390, height: 844 }]]) {
      const page = await browser.newPage({ viewport });
      const userId = await signIn(page);
      capture ??= await captureAboutSeen(userId);
      await clearAboutSheet(page, userId);
      await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
      const triggers = onPage(page, 'button[aria-label^="Actions for "]');
      if ((await triggers.count()) === 0) {
        report(false, `${label}: a deck tile to open`, "no ⋯ button on /decks");
        await page.close();
        continue;
      }
      const trigger = triggers.first();
      const deckName = (await trigger.getAttribute("aria-label")).replace(/^Actions for /, "");
      await trigger.click();
      await page.getByRole("button", { name: "Export", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Export deck" });
      await dialog.waitFor({ state: "visible", timeout: 20_000 });
      const text = await dialog.innerText();
      report(text.includes(`// ${deckName}`), `${label}: the dialog's preview names the deck`, deckName);
      report(/\d+ cards/.test(text), `${label}: the preview counts the deck's cards`);
      report(new URL(page.url()).pathname === "/decks", `${label}: still on /decks`, page.url());
      // Sampled at the dialog's own title: the positioning wrapper fills the viewport and passes pointer events
      // through, so its centre is the page's on a phone, where the dialog is a bottom sheet. The dialog draws both its
      // layouts and hides one, so the title sampled is the one with a box.
      const onTop = await dialog.evaluate((el) => {
        const title = [...el.querySelectorAll("*")].find((n) => n.children.length === 0 && n.textContent?.trim() === "Export deck" && n.getClientRects().length > 0);
        if (!title) return false;
        const box = title.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return !!hit && el.contains(hit);
      });
      report(onTop, `${label}: the dialog is painted above the tiles`);
      if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/tile-export-${label}.png` });
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached", timeout: 5_000 });
      const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? null);
      report(focused === `Actions for ${deckName}`, `${label}: Escape closes it and focus returns to the ⋯ button`, String(focused));
      await page.close();
    }
  } finally {
    await browser.close();
    if (capture) await restoreAboutSeen(capture).catch((err) => { failures += 1; console.error("About restore failed", err); });
  }
}

run()
  .catch((err) => { failures += 1; console.error(err); })
  .finally(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
    process.exit(failures === 0 ? 0 : 1);
  });
