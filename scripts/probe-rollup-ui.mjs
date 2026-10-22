// Gate 2 for #43 Task 8: the commitments roll-up (design table §12), driven
// rather than read. The roll-up's bands are retired (deck messages PR 2): the
// over-committed half is the to-do card's spoken-for-twice row and the soft half
// is its foot's `N in other drafts too ▾`. Opens a seeded deck at both widths and
// reports what the card drew for each — title, body and inks — and FAILS (exit 1)
// when a forced state draws neither, so it cannot pass on bands that are gone.
//
// States are forced at the seam, the same way `probe-availability-ui.mjs`
// documents: run the dev server with `AVAIL_FORCE="<over>:<soft>[:anon]"`,
// which rewrites `loadAvailability`'s output so the first N cards read `over`
// and the next M read `soft`. A dev account cannot reach `over` with real
// figures — it needs a second *finished* deck competing for a single copy —
// and seeding one would mutate a shared branch to prove a rendering claim.
// That stub is reverted before the PR opens.
//
// Run by hand: `PROBE_DECK=<id> node scripts/probe-rollup-ui.mjs`. Not part of
// `pnpm test`: it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

// CLERK_SECRET_KEY is asserted but not bound: `clerkSetup()` reads it from the
// environment itself.
const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.PROBE_DECK;
if (!DECK) {
  throw new Error("Set PROBE_DECK.");
}

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

// Lifted verbatim from `scripts/probe-unowned-ui.mjs`, which documents at length
// why the hosted portal cannot be driven unattended and `window.Clerk` can.
async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        // A `+clerk_test` address is Clerk's own fixture account. It has no
        // password we are entitled to know, and it accepts the fixed 424242
        // code, so it takes the email-code path from the start.
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

// Only the visible copy: the card is one mount, but read through `getClientRects`
// so a hidden node never reports.
async function commitments(page) {
  return page.evaluate(() => {
    const visible = (n) => n.getClientRects().length > 0;
    const ink = (n) => getComputedStyle(n).color;
    const row = [...document.querySelectorAll("main p")].find(
      (p) => visible(p) && /spoken for twice$/.test((p.textContent ?? "").trim()),
    );
    const body = row?.nextElementSibling;
    const soft = [...document.querySelectorAll("[data-todo-foot] button")].find(
      (b) => visible(b) && /in (other drafts|another draft) too/.test(b.textContent ?? ""),
    );
    return {
      row: row ? { title: row.textContent.trim(), colour: ink(row), body: body?.textContent?.trim() ?? null } : null,
      soft: soft ? { text: soft.textContent.trim(), colour: ink(soft), expanded: soft.getAttribute("aria-expanded") } : null,
    };
  });
}

function report(label, seen) {
  console.log(`\n--- ${label}`);
  if (seen.row) console.log(`  row  ${seen.row.colour}  ${JSON.stringify(seen.row.title)} / ${JSON.stringify(seen.row.body)}`);
  if (seen.soft) console.log(`  foot ${seen.soft.colour}  ${JSON.stringify(seen.soft.text)} (expanded ${seen.soft.expanded})`);
  if (!seen.row && !seen.soft) {
    console.log("  NOTHING DRAWN: no spoken-for-twice row and no other-drafts segment");
    if (process.env.AVAIL_FORCE) process.exitCode = 1;
  }
}

await clerkSetup();
const browser = await chromium.launch();

for (const { label, width, height } of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await signIn(page);
  console.log(`\n########## ${label}`);
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  report(`forced ${process.env.AVAIL_FORCE ?? "(none)"}`, await commitments(page));
  await context.close();
}

await browser.close();
