// #364 decisions 19, 21 and 23: what Home says about a pair deck. Creates a
// pair deck through the picker so it is the newest one, then reports the resume
// row and the rail row at the width decision 23 was measured at, at `sm`, and
// on a phone.
//
// The handles are structural: the resume row is the link whose meta line
// contains a ` + `, and the rail row is a link inside `[data-rail=...]`. No
// class name in either is stable.
//
// Run by hand: `node scripts/probe-partner-home.mjs`.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const PAIRS = "Atreus, Impulsive Son";
const PARTNER = "Kratos, Stoic Father";

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

// Decision 19's whole claim is that the names give and the count does not, so
// the report is the row's text plus which children are actually clipped.
async function resumeRow(page, label, kind = "pair") {
  const seen = await page.evaluate((wantPair) => {
    // The pair handle is the `sr-only` stand-in, not the joiner: the `+` sits
    // behind a flex gap, so `textContent` reads `Atreus+ Kratos` with no space
    // and any string test on it is a test of the gap's implementation.
    const text = [...document.querySelectorAll("[data-resume-text]")].find(
      (n) =>
        (n.querySelector(".sr-only") !== null) === wantPair && n.getClientRects().length > 0,
    );
    if (!text) return null;
    const meta = text.lastElementChild;
    // The `sr-only` stand-in is 1px of clipped text by construction, so it is
    // excluded from both reports — it would otherwise read as a truncation.
    const drawn = [...meta.querySelectorAll("span")].filter(
      (n) => !n.classList.contains("sr-only") && n.closest(".sr-only") === null,
    );
    return {
      name: text.firstElementChild?.textContent,
      line: [...meta.children]
        .filter((n) => !n.classList.contains("sr-only"))
        .map((n) => n.textContent)
        .join(" | "),
      accessible: text.closest("a")?.textContent,
      // Decision 19 is a claim about WHICH child gives, so drawn and wanted
      // width are both reported: "clipped" alone cannot tell a span that lost
      // one character from one that was crushed to nothing.
      widths: drawn
        .filter((n) => n.scrollWidth > n.clientWidth + 1)
        .map((n) => `${n.textContent} ${n.clientWidth}/${n.scrollWidth}px`),
      metaWidth: Math.round(meta.getBoundingClientRect().width),
      rowWidth: Math.round(text.closest("a").getBoundingClientRect().width),
    };
  }, kind === "pair");
  if (!seen) return console.log(`  ${label}: no ${kind} resume row`);
  console.log(`  ${label}: ${seen.name} — ${seen.line}`);
  console.log(
    `    row ${seen.rowWidth}px · meta ${seen.metaWidth}px · clipped: ${seen.widths.join(", ") || "none"}`,
  );
  console.log(`    accessible: ${seen.accessible}`);
}

// Decision 21: the denominator and nothing else. The partner's name appearing
// anywhere in a rail row is the failure it forbids.
async function railRow(page, variant, deckName) {
  const seen = await page.evaluate(
    ([v, name]) => {
      const rows = [...document.querySelectorAll(`[data-rail="${v}"] a`)];
      const row = rows.find((n) => n.textContent?.includes(name));
      // The rail is a directory in `listDecksWithStats` order and draws four
      // rows on desktop against three on phone, so a deck can be absent from
      // one list and present in the other. Reporting the whole list makes that
      // visible rather than reading as a defect.
      return row
        ? row.innerText.replace(/\n/g, " · ")
        : `absent — list reads ${rows.map((n) => n.innerText.replace(/\n/g, " ")).join(" / ")}`;
    },
    [variant, deckName],
  );
  console.log(`  rail ${variant}: ${seen}`);
}

const browser = await clerkSetup().then(() => chromium.launch());
const context = await browser.newContext({ viewport: { width: 1026, height: 950 } });
const page = await context.newPage();
page.on("pageerror", (e) => console.log(`  [pageerror] ${String(e).slice(0, 300)}`));

await signIn(page);

// Built through the picker, so the probe walks the path a player takes and the
// deck is the newest one — which is what puts it in the two resume rows.
await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.fill('input[placeholder*="Search" i], input[type="search"]', "Atreus");
await page.waitForTimeout(350);
await page.locator(`li button:has-text("${PAIRS}"):visible`).first().click();
await page.waitForTimeout(250);
await page.locator('button[aria-label^="Add a partner"]:visible').first().click();
await page.waitForTimeout(350);
await page.locator(`li button:has-text("${PARTNER}"):visible`).first().click();
await page.waitForTimeout(300);
const name = `Probe home ${Date.now()}`;
await page.locator('input#picker-deck-name, input[type="text"]:visible').first().fill(name);
await page.locator("button:visible").filter({ hasText: /create deck/i }).first().click();
await page.waitForURL(/\/decks\/[0-9a-f-]{8,}/, { timeout: 20_000 });
console.log(`created ${name}`);

// Home sorts by `lastPlayed`, and the rail keeps that order — so a deck nobody
// has played sits below every probe deck ever created and never reaches the
// three rows phone draws. Logging one game is the player action that puts this
// deck at the top of both lists, which is the only way the rail's denominator
// can be read at all.
await page.waitForTimeout(800);
await page.locator('[id^="tab-games"], button:has-text("Games")').first().click();
await page.waitForTimeout(600);
await page
  .locator("button:visible")
  .filter({ hasText: /^Log (a game|your first game)$/ })
  .first()
  .click();
await page.waitForTimeout(400);
await page.locator("button:visible").filter({ hasText: /^Won$/ }).first().click();
await page.locator("button:visible").filter({ hasText: /^Save this game$/ }).first().click();
await page.waitForTimeout(1500);

// 1026 is the width decision 23 measured its 200px meta line at; 640 is `sm`,
// the narrowest width that draws the resume section at all.
for (const width of [1280, 1026, 640]) {
  await page.setViewportSize({ width, height: 950 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  console.log(`\ndesktop ${width}`);
  await resumeRow(page, `resume ${width}`);
  // The other row is a single-commander deck, and decision 19 changes what
  // gives there too: the clause is now the shrinking child, so a long name is
  // no longer the thing that loses characters.
  await resumeRow(page, `single ${width}`, "single");
  await railRow(page, "desktop", name);
}

console.log("\nmobile 390");
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
// The section is `hidden sm:block`, so phone gives the ordering up entirely and
// the rail's row is the whole of what Home says about the pair.
await resumeRow(page, "resume 390");
await railRow(page, "phone", name);

await browser.close();
