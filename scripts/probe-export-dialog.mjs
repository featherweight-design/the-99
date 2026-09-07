// Throwaway. Opens the Export dialog on a real deck and reports whether the
// modal fits the viewport and whether its body actually scrolls, on both tabs,
// at desktop and phone widths.
//
// Run by hand: `node scripts/probe-export-dialog.mjs`. Needs a dev server and a
// signed-in session, so it is not part of `pnpm test`.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";

const VIEWPORTS = [
  { label: "narrowest supported · 320x700", width: 320, height: 700 },
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1280x900", width: 1280, height: 900 },
  { label: "short desktop · 1280x700", width: 1280, height: 700 },
  // No local deck has a long shopping list — every fixture deck is fully owned
  // — so squeeze the viewport instead. Content taller than the cap is the same
  // mechanism whichever side of the inequality moved.
  { label: "squat desktop · 1280x360", width: 1280, height: 360 },
];

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });

  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_client_trust") {
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

// The visible panel is whichever of the two subtrees has a box; the other is
// display:none behind `md:hidden` / `hidden md:flex`.
async function measure(page, label) {
  const shot = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"][aria-label="Export deck"]');
    if (!dialog) return { error: "no dialog" };
    const panel = [...dialog.children].find((c) => c.getBoundingClientRect().height > 0);
    if (!panel) return { error: "no visible panel" };
    const r = panel.getBoundingClientRect();
    const body = [...panel.querySelectorAll("div")].find((d) =>
      d.className.includes?.("overflow-y-auto"),
    );
    const b = body?.getBoundingClientRect();
    return {
      panel: {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        height: Math.round(r.height),
        fitsViewport: r.top >= -0.5 && r.bottom <= window.innerHeight + 0.5,
      },
      body: body
        ? {
            height: Math.round(b.height),
            scrollHeight: body.scrollHeight,
            scrollable: body.scrollHeight > body.clientHeight + 1,
          }
        : null,
      viewportHeight: window.innerHeight,
    };
  });
  console.log(`  ${label}: ${JSON.stringify(shot)}`);
}

await clerkSetup();
const browser = await chromium.launch();

for (const { label, width, height } of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await signIn(page);
  console.log(`\n########## ${label}`);

  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  const deckHrefs = await page.evaluate(() => [
    ...new Set(
      [...document.querySelectorAll("a")]
        .map((a) => a.getAttribute("href"))
        .filter((href) => /^\/decks\/[0-9a-f-]{36}$/.test(href ?? "")),
    ),
  ]);
  // The bug needs a long shopping list, so probe the deck that has the longest
  // one rather than whichever deck happens to sort first.
  let deckHref = null;
  let best = -1;
  for (const href of deckHrefs) {
    await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const pill = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((n) =>
        /^Shopping \d+$/.test(n.textContent.trim()),
      );
      return b ? Number(b.textContent.trim().split(" ")[1]) : 0;
    });
    if (pill > best) {
      best = pill;
      deckHref = href;
    }
  }
  console.log(`  deck with the longest shopping list: ${deckHref} (${best})`);
  if (!deckHref) {
    console.log("  no deck on this account");
    await context.close();
    continue;
  }

  await page.goto(`${BASE}${deckHref}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const exportButton = page.getByRole("button", { name: "Export" });
  if ((await exportButton.count()) === 0) {
    console.log("  no Export button on this deck");
    await context.close();
    continue;
  }
  await exportButton.first().click();
  await page.waitForTimeout(400);
  await measure(page, "decklist tab");

  await page.getByRole("button", { name: "Shopping list" }).first().click();
  await page.waitForTimeout(400);
  await measure(page, "shopping tab");

  await context.close();
}

await browser.close();
