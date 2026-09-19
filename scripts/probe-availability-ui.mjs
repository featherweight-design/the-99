// Gate 2 for #43: the availability marker's four states, driven rather than
// read. Signs in as the audit user, opens a seeded deck at both widths and
// reports what each of the four mount sites actually rendered — the decklist
// row, the Add panel's search rows, the Consider tile, and the resolution
// expander — with the drawn text, its computed colour, and the sentence a
// screen reader would get.
//
// States are forced at the seam rather than in the data: run the dev server
// with AVAIL_FORCE=1, which makes `loadAvailability` bucket every oracle id by
// hash across free/soft/hard/over. Real figures cannot reach `hard` or `over`
// on a dev account without a second finished deck competing for a single copy,
// and seeding one would mutate a shared branch to prove a rendering claim.
//
// Run by hand: `node scripts/probe-availability-ui.mjs`. Not part of `pnpm
// test` — it needs a browser and a signed-in session.
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

// Every marker on screen, with the two things a snapshot cannot assert: whether
// the drawn half is hidden from assistive tech, and what colour it actually
// resolved to once the cascade ran.
async function markers(page) {
  return page.evaluate(() => {
    const seen = [];
    for (const node of document.querySelectorAll("span, p")) {
      const text = (node.textContent ?? "").trim();
      if (!/^\d+ free|free$|in use|short|in a draft|decks? wants? it/i.test(text)) continue;
      if (node.querySelector("span, p")) continue;
      const s = getComputedStyle(node);
      seen.push({
        text,
        colour: s.color,
        size: s.fontSize,
        hidden: node.closest("[aria-hidden='true']") !== null,
        srOnly: s.width === "1px" && s.position === "absolute",
      });
    }
    return seen;
  });
}

async function prose(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("span.sr-only")]
      .map((n) => (n.textContent ?? "").trim())
      .filter((t) => /free|copies|brew|includes this card|too few|short/i.test(t)),
  );
}

function report(label, drawn, spoken) {
  console.log(`\n--- ${label}`);
  if (drawn.length === 0) console.log("  no marker drawn");
  for (const m of drawn) {
    console.log(
      `  ${JSON.stringify(m.text).padEnd(34)} ${m.colour} ${m.size}` +
        `${m.hidden ? " aria-hidden" : ""}${m.srOnly ? " sr-only" : ""}`,
    );
  }
  for (const p of spoken) console.log(`  spoken: ${JSON.stringify(p)}`);
}

async function sweep(page, label) {
  report(label, await markers(page), await prose(page));
}

await clerkSetup();
const browser = await chromium.launch();

for (const { label, width, height } of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await signIn(page);
  console.log(`\n########## ${label}`);

  // 1. The decklist. Self-excluded, so `0 free` is silence here by design and
  //    only soft and over should be able to draw.
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await sweep(page, "decklist rows");

  const ringed = await page.evaluate(
    () =>
      [...document.querySelectorAll("div")].filter((n) =>
        getComputedStyle(n).boxShadow.includes("inset"),
      ).length,
  );
  console.log(`  rows wearing the over inset ring: ${ringed}`);

  // 2. The resolution expander, which is the only surface whose marker sits on
  //    a row the player has not yet committed to.
  const expander = page.getByRole("button", { name: /^Unmatched line:/ });
  if ((await expander.count()) > 0) {
    await expander.first().click();
    await page.waitForTimeout(900);
    const box = page.getByRole("combobox").last();
    await box.click();
    await box.fill("co");
    await page.waitForTimeout(1400);
    await sweep(page, "resolution expander · 'co'");
    const rowAria = await page.evaluate(() =>
      [...document.querySelectorAll("[role='option']")]
        .slice(0, 5)
        .map((n) => n.getAttribute("aria-label")),
    );
    for (const a of rowAria) console.log(`  option label: ${JSON.stringify(a)}`);
    await page.keyboard.press("Escape");
  } else {
    console.log("\n--- resolution expander: no trigger found");
  }

  // 3. The Add panel's search rows, drawn at both widths in the same markup.
  //    Two queries: "co" reaches the hard bucket, "l" reaches the over one.
  for (const term of ["co", "l"]) {
    const search = page.getByRole("combobox").first();
    if ((await search.count()) === 0) {
      console.log("\n--- search rows: no combobox found");
      break;
    }
    await search.click();
    await search.fill(term);
    await page.waitForTimeout(1400);
    await sweep(page, `search rows · '${term}'`);
    const optionAria = await page.evaluate(() =>
      [...document.querySelectorAll("[role='option']")]
        .slice(0, 5)
        .map((n) => n.getAttribute("aria-label")),
    );
    for (const a of optionAria) console.log(`  option label: ${JSON.stringify(a)}`);
    await page.keyboard.press("Escape");
  }

  // 4. Consider tiles, where the chip is count-only and the caption carries the
  //    whole difference between "in use" and "over-committed".
  const tab = page.getByRole("tab", { name: /consider/i });
  if ((await tab.count()) > 0) {
    await tab.first().click();
    await page.waitForTimeout(2500);
    await sweep(page, "consider tiles");
  } else {
    console.log("\n--- consider: no tab found");
  }

  await context.close();
}

await browser.close();
