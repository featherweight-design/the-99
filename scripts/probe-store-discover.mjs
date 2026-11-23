// probe:store-discover — store choice UI-3b-3 (handoff design_handoff_the99_store_choice): a reader on another store
// sees commander discovery priced at THAT store. Pressed in Chromium at 390x844 and 1300x900.
//
// What jsdom cannot prove, and this does: the real /commanders/discover page stamps each priced row with the reader's
// store and speaks "in stock at <store>", and the rows past the first window, whose figures arrive from
// /api/discovery-fields after a press of "Show 25 more commanders", are priced at the same store. Fails on main:
// every row is stamped `manapool` and speaks "in stock at Mana Pool".
//
// FIXTURE (read only): a scratch branch of local-dev, which the dev server reads, where the audit account has a user
// STORE_PREFERENCE_ENABLED override 'on', user_prefs.preferred_store = 'tcgplayer' and printing_store_prices rows
// for tcgplayer.
//
//   PROBE_BASE=http://localhost:3161 pnpm probe:store-discover
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname)) {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback dev server only`);
  }
}

const WIDTHS = [
  { name: "390", width: 390, height: 844 },
  { name: "1300", width: 1300, height: 900 },
];

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test") || !password
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
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

// Each row's price sentence (sr-only) and stamp (aria-hidden), read off the DOM in list order.
const readRows = (page) =>
  page.locator("main li").evaluateAll((items) =>
    items
      .map((li) => {
        const said = [...li.querySelectorAll(".sr-only")].map((n) => n.textContent ?? "")
          .find((t) => /in stock at |has none in stock/.test(t));
        const stamp = [...li.querySelectorAll('span[aria-hidden="true"].font-mono')].map((n) => n.textContent ?? "")
          .find((t) => /^(manapool|tcgplayer|cardkingdom)$/.test(t));
        return said || stamp ? { said: said ?? "", stamp: stamp ?? "" } : null;
      })
      .filter(Boolean));

function judge(label, rows) {
  const mana = rows.filter((r) => /Mana Pool/.test(r.said) || r.stamp === "manapool");
  const tcg = rows.filter((r) => /TCGplayer/.test(r.said) && r.stamp === "tcgplayer");
  check(mana.length === 0, `${label} no row is priced at Mana Pool`, `${mana.length}: ${JSON.stringify(mana.slice(0, 2))}`);
  check(tcg.length > 0, `${label} rows are stamped and spoken at TCGplayer`, `${tcg.length}: ${JSON.stringify(tcg.slice(0, 2))}`);
}

async function run(size) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    await context.route(/^https:\/\/(www\.)?(tcgplayer|manapool|cardkingdom)\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }));
    const page = await context.newPage();
    await signIn(page);

    await page.goto(`${BASE}/commanders/discover`, { waitUntil: "domcontentloaded" });
    const reveal = page.getByRole("button", { name: /^Show \d+ more commanders/ });
    await reveal.first().waitFor({ state: "attached", timeout: 90_000 }).catch(() => {});
    const first = await readRows(page);
    judge(`${size.name} first window`, first);

    // Press the reveal control: the next rows' draw fields, the price among them, come from /api/discovery-fields.
    const fields = page.waitForResponse((r) => r.url().includes("/api/discovery-fields"), { timeout: 60_000 })
      .then((r) => r.status(), () => null);
    let pressed = false;
    if ((await reveal.count()) > 0) {
      await reveal.first().scrollIntoViewIfNeeded();
      await reveal.first().click();
      pressed = true;
    }
    check(pressed, `${size.name} the reveal control is pressed`, pressed ? "pressed" : "no control");
    const status = await fields;
    check(status === 200, `${size.name} the press reads /api/discovery-fields`, String(status));
    await page.waitForFunction(
      (n) => document.querySelectorAll("main li").length > n + 5 && !document.querySelector("main [aria-busy=true]"),
      first.length, { timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const after = await readRows(page);
    const revealed = after.slice(first.length);
    judge(`${size.name} revealed rows`, revealed);
  } finally {
    await browser.close();
  }
}

await clerkSetup();
for (const size of WIDTHS) await run(size);
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
