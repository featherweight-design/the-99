// probe:store-draft — store UI-3c-2: the review-changes page (a draft against its last version) prices the draft's
// adds at the reader's store, not Mana Pool. Pressed in Chromium at 390x844 and 1300x900.
//
// What jsdom cannot prove, and this does: on the real /decks/<id>/changes page, read on a TCGplayer reader's request
// switches, the figure the page draws for the draft is the one `loadDraftState` quotes for TCGplayer, and Mana Pool's
// figure for the same adds is nowhere on the page.
// Fails on main: `loadDraftState` priced from Mana Pool whatever the store, so the page draws Mana Pool's figure.
//
// FIXTURE (read only): a scratch branch of local-dev with TCGplayer store prices, where the audit account has a user
// STORE_PREFERENCE_ENABLED override 'on' and user_prefs.preferred_store = 'tcgplayer', and PROBE_DECK is its deck with
// draft adds (scratch-58-store-cards: "HD - Soldiers"). DATABASE_URL is that branch's, for the dev server and this script.
//
//   PROBE_BASE=http://localhost:3158 PROBE_DECK=<deck uuid> PROBE_USER=<clerk user id> pnpm probe:store-draft
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";

// env.mjs loads .env with override, which would swap the scratch DATABASE_URL for the worktree's: keep ours.
const scratchDb = process.env.DATABASE_URL;
const { requireEnv } = await import("./lib/env.mjs");
process.env.DATABASE_URL = scratchDb;
const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname)) {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback dev server only`);
  }
}
const DECK = process.env.PROBE_DECK;
const USER = process.env.PROBE_USER;
if (!DECK || !USER) throw new Error("Set PROBE_DECK and PROBE_USER (the audit account's deck with draft adds).");

const { loadDraftState } = await import("../src/lib/decks/draft-state");

let failures = 0;
const check = (ok: boolean, label: string, saw: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};

const tcg = await loadDraftState(DECK, USER, "tcgplayer");
const mana = await loadDraftState(DECK, USER, "manapool");
check(!!tcg.total && !!mana.total && tcg.total !== mana.total, "fixture: the two stores quote the draft differently", `tcgplayer ${tcg.total} vs manapool ${mana.total}`);

const tcgTags = [...new Set(tcg.prices.values())];
const manaOnly = [...new Set(mana.prices.values())].filter((t) => !tcgTags.includes(t));

check(manaOnly.length > 0 && tcgTags.length > 0, "fixture: the two stores tag the adds differently", `${manaOnly.length} Mana Pool-only tags`);

async function signIn(page: import("playwright").Page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async ([email, password]) => {
    try {
      const w = window as unknown as { Clerk: any };
      const signIn = w.Clerk.client.signIn;
      let attempt = email!.includes("+clerk_test") || !password
        ? await signIn.create({ identifier: email })
        : await signIn.create({ identifier: email, password });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await w.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error: any) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, [EMAIL, PASSWORD]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

await clerkSetup();
for (const size of [{ name: "390", width: 390, height: 844 }, { name: "1300", width: 1300, height: 900 }]) {
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ viewport: { width: size.width, height: size.height } })).newPage();
    await signIn(page);
    await page.goto(`${BASE}/decks/${DECK}/changes`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction((t) => document.body.innerText.includes(t), tcg.total!, { timeout: 30_000 }).catch(() => {});
    const text = await page.evaluate(() => document.body.innerText);
    // The to-buy total rides on a desktop-only chip; the per-row tags draw at every width.
    if (size.width >= 768) {
      check(text.includes(tcg.total!), `${size.name}: the draft total is TCGplayer's`, `looking for ${tcg.total}`);
      check(!text.includes(mana.total!), `${size.name}: Mana Pool's total is nowhere on the page`, `looking for ${mana.total}`);
    }
    check(tcgTags.some((t) => text.includes(t)), `${size.name}: a row carries TCGplayer's tag`, `one of ${tcgTags.join(" ")}`);
    check(manaOnly.every((t) => !text.includes(t)), `${size.name}: no row carries a Mana Pool-only tag`, `none of ${manaOnly.join(" ")}`);
  } finally {
    await browser.close();
  }
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
