// Gate for #352: the Consider shelves' rendered tile counts, counted rather than
// read off the constant. The issue reports a shelf "reporting 37 and showing 22"
// against a `SHELF_CAP` of 12, so the first question is whether the cap is
// applied at all — and no amount of reading `consider-panel.tsx` answers it,
// because the same file both defines the cap and slices by it.
//
// Reports, per shelf and per width: the heading, the meta line's own numbers,
// and the number of tiles actually on screen. The meta's figures are the shelf
// length and (for a role shelf) the mix target, which are different numbers that
// read alike in a bug report.
//
// Run by hand: `PROBE_BASE=http://localhost:3001 PROBE_DECK=<id> node scripts/probe-consider-shelves.mjs`.
// Not part of `pnpm test`: it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const FIXTURE = EMAIL.includes("+clerk_test");
const { E2E_AUDIT_USER_PASSWORD: PASSWORD } = FIXTURE
  ? { E2E_AUDIT_USER_PASSWORD: null }
  : requireEnv(["E2E_AUDIT_USER_PASSWORD"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.PROBE_DECK ?? "5bf8171c-514e-4973-a463-6ed934cb51c6";

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
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

async function readShelves(page) {
  return page.evaluate(() => {
    const visible = (n) => n.getClientRects().length > 0 && !n.closest(".sr-only");
    const panel = document.querySelector("#panel-consider");
    if (!panel) return { error: "no #panel-consider on the page" };
    return {
      shelves: [...panel.querySelectorAll("section[aria-labelledby^='shelf-']")].map((section) => {
        const heading = section.querySelector("h3");
        const meta = section.querySelector("p");
        const list = section.querySelector("ul");
        return {
          heading: heading?.textContent?.trim() ?? "",
          meta: meta?.textContent?.replace(/\s+/g, " ").trim() ?? "",
          // The rendered tiles, filtered to what is actually on screen: both
          // responsive halves are in the DOM at every width.
          tiles: list ? [...list.querySelectorAll(":scope > li")].filter(visible).length : 0,
          showAll: [...section.querySelectorAll("button")]
            .filter(visible)
            .map((b) => b.textContent?.trim())
            .find((t) => t && /Show all/.test(t)) ?? null,
        };
      }),
      // The heading's distance below the top of the panel, which is the "pushed
      // far below the fold" half of the report.
      topPicksOffset: (() => {
        const h = [...panel.querySelectorAll("h3")].find((n) => /Synergy ·/.test(n.textContent ?? ""));
        if (!h) return null;
        return Math.round(h.getBoundingClientRect().top - panel.getBoundingClientRect().top);
      })(),
      panelHeight: Math.round(panel.getBoundingClientRect().height),
    };
  });
}

const browser = await chromium.launch();
await clerkSetup();

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  await signIn(page);
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded" });
  // By id, not by accessible name: the tab's name is `considerAria`, which
  // carries a count and is not the word "Consider".
  await page.click("#tab-consider");
  await page.waitForSelector("#panel-consider section[aria-labelledby^='shelf-']", {
    timeout: 30_000,
  });
  const result = await readShelves(page);

  console.log(`\n=== ${viewport.label} ===`);
  if (result.error) {
    console.log(result.error);
  } else {
    for (const s of result.shelves) {
      console.log(
        `  ${s.heading.padEnd(22)} tiles=${String(s.tiles).padStart(3)}  showAll=${s.showAll ?? "—"}`,
      );
      console.log(`    meta: ${s.meta}`);
    }
    console.log(`  panel height: ${result.panelHeight}px`);
    console.log(`  synergy heading offset from panel top: ${result.topPicksOffset ?? "—"}px`);
  }
  await context.close();
}

await browser.close();
