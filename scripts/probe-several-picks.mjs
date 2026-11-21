// probe:several-picks — Move a copy, several picks (addendum, 2026-11-21), at 390 and 1300.
//
// Claims: with three copies of a card and four committed decks listing it, the chooser behind card
// details' Change door is a group of four CHECKBOXES (one copy would be a radio group); pressing three
// decks leaves three ticked and three reservations written, so a pick ADDS rather than moves; a fourth
// press at the cap ticks nothing, writes nothing and shows the all-picked line; pressing a ticked deck
// unticks that one alone. On main the chooser is a radio group whose second press moves the first
// pick, so the "three ticked" and "three rows" checks fail there.
//
// It seeds its own fixture for the signed-in account (three `probe` copies of a card the account owns
// none of, four decks named `Probe several N`) and deletes all of it in a finally. It adds rows to a
// shared account, so it runs on a scratch branch made from local-dev only (assertScratchBranch), and
// never production. PROBE_KEEP=1 keeps the desktop pass's fixture for a contact sheet; delete it after
// (decks named `Probe several %`, the card's `probe` copies, its card_assignments rows).
//
//   PROBE_BASE=http://localhost:<port> node scripts/probe-several-picks.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " ok " : "FAIL"}  ${label}${detail !== undefined ? ` — ${detail}` : ""}`);
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
          if (!factor?.emailAddressId) return "no email_code first factor";
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
  await page.waitForFunction(() => window.Clerk?.user?.id, null, { timeout: 15_000 });
  return page.evaluate(() => window.Clerk.user.id);
}

neonConfig.webSocketConstructor = ws;
const client = new Pool({ connectionString: DATABASE_URL });
const { rows: [{ branch }] } = await client.query("select current_setting('neon.branch_id', true) as branch");
assertScratchBranch(branch, "probe:several-picks");

async function seed(userId) {
  // A non-legendary card the account owns none of, and a legend to lead the decks.
  const { rows: [card] } = await client.query(
    `select c.oracle_id, c.name from cards c
     where c.type_line !~ 'Legendary' and c.type_line !~ '\\mBasic\\M' and c.name !~ '//'
       and not exists (select 1 from collection_items ci where ci.user_id = $1 and ci.oracle_id = c.oracle_id)
     order by c.oracle_id limit 1`, [userId]);
  const { rows: [cmd] } = await client.query(
    `select oracle_id from cards where type_line ~ 'Legendary Creature' order by oracle_id limit 1`);
  await client.query(`insert into collection_items (user_id, oracle_id, quantity, set_code) values ($1, $2, 3, 'probe')`,
    [userId, card.oracle_id]);
  const decks = [];
  for (let i = 1; i <= 4; i += 1) {
    const ago = 70 - i * 10;
    const { rows: [d] } = await client.query(
      `insert into decks (user_id, name, commander_oracle_id) values ($1, $2, $3) returning id, name`,
      [userId, `Probe several ${i}`, cmd.oracle_id]);
    const { rows: [v] } = await client.query(
      `insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
       values ($1, 1, now() - ($2 * interval '1 minute'), $3, now() - ($2 * interval '1 minute')) returning id`,
      [d.id, ago, cmd.oracle_id]);
    await client.query(
      `insert into deck_version_cards (version_id, oracle_id, quantity, since) values ($1, $2, 1, now() - ($3 * interval '1 minute'))`,
      [v.id, card.oracle_id, ago]);
    await client.query(`insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1)`, [d.id, card.oracle_id]);
    decks.push(d);
  }
  return { card, decks };
}

async function cleanup(userId, card) {
  if (!card) return;
  await client.query(`delete from card_assignments where user_id = $1 and oracle_id = $2`, [userId, card.oracle_id]);
  await client.query(`delete from pending_assignments where user_id = $1 and oracle_id = $2`, [userId, card.oracle_id]);
  await client.query(`delete from decks where user_id = $1 and name like 'Probe several %'`, [userId]);
  await client.query(`delete from collection_items where user_id = $1 and oracle_id = $2 and set_code = 'probe'`,
    [userId, card.oracle_id]);
}

const reservations = async (userId, card) =>
  (await client.query(`select count(*)::int as n from card_assignments where user_id = $1 and oracle_id = $2`,
    [userId, card.oracle_id])).rows[0].n;

await clerkSetup();
const browser = await chromium.launch();
let userId = null;
let fixture = null;
try {
  for (const [tag, width, height] of [["phone", 390, 844], ["desktop", 1300, 900]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, serviceWorkers: "block" });
    const page = await ctx.newPage();
    userId = await signIn(page);
    fixture = await seed(userId);
    const { card, decks } = fixture;
    const last = decks[3];

    await page.goto(`${BASE}/decks/${last.id}`, { waitUntil: "domcontentloaded" });
    // A press before hydration opens nothing, so press until the card's details are up.
    const trigger = page.locator(`button[aria-label="View details for ${card.name}"]`).filter({ visible: true }).first();
    for (let i = 0; i < 6; i += 1) {
      await trigger.click({ timeout: 30_000 });
      if (await page.locator('[role="dialog"]').first().waitFor({ timeout: 4_000 }).then(() => true, () => false)) break;
    }
    // On the phone the sheet opens as a teaser; the details column (and its Change door) is in the full sheet.
    await page.waitForTimeout(800);
    if (tag === "phone") {
      await page.locator("button", { hasText: "All details" }).filter({ visible: true }).first().click({ timeout: 20_000 });
    }
    // The card's details draw a phone sheet and a desktop panel; only one is visible at a width.
    const door = page.locator(`button[aria-label="Change where ${card.name} goes"]`).filter({ visible: true }).first();
    await door.waitFor({ timeout: 20_000 }).catch(async (e) => {
      if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/several-picks-${tag}-no-door.png` });
      const why = await page.evaluate((label) => [...document.querySelectorAll(`button[aria-label="${label}"]`)].map((b) => {
        const hid = [];
        for (let n = b; n; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.display === "none" || cs.visibility === "hidden" || n.hidden) hid.push(`${n.tagName}.${String(n.className).slice(0, 60)}`);
        }
        return hid.join(" < ");
      }), `Change where ${card.name} goes`);
      throw new Error(`${tag}: no visible Change door (${why.join(" | ")}): ${e.message.split("\n")[0]}`);
    });
    await door.click();

    const options = page.locator('[role="checkbox"], [role="radio"]').filter({ hasText: /Probe several/, visible: true });
    await options.first().waitFor({ timeout: 20_000 });
    const boxes = page.locator('[role="checkbox"]').filter({ hasText: /Probe several/, visible: true });
    report((await boxes.count()) === 4, `${tag}: four decks drawn as checkboxes`,
      `checkbox=${await boxes.count()} all=${await options.count()}`);
    report((await page.locator('[role="group"]').count()) > 0, `${tag}: the options sit in a group, not a radiogroup`);

    const option = (deck) => options.filter({ hasText: deck.name }).first();
    const ticked = async () => {
      const out = [];
      for (const d of decks) if ((await option(d).getAttribute("aria-checked")) === "true") out.push(d.name);
      return out;
    };
    const settle = async (n) => {
      await page.waitForFunction(
        (want) => document.querySelectorAll('[aria-checked="true"]').length === want, n, { timeout: 8_000 },
      ).catch(() => {});
      await page.waitForTimeout(600);
    };

    report((await ticked()).length === 0, `${tag}: nothing ticked before a press`, (await ticked()).join(", "));
    for (const [i, d] of [decks[3], decks[0], decks[1]].entries()) {
      await option(d).click();
      await settle(i + 1);
    }
    const three = await ticked();
    report(three.length === 3, `${tag}: three presses leave three ticked (a pick adds)`, three.join(", "));
    report((await reservations(userId, card)) === 3, `${tag}: and three reservations are written`,
      `${await reservations(userId, card)}`);

    await option(decks[2]).click();
    await page.waitForTimeout(800);
    report((await ticked()).length === 3 && (await option(decks[2]).getAttribute("aria-checked")) !== "true",
      `${tag}: a press at the cap ticks nothing`, (await ticked()).join(", "));
    report((await reservations(userId, card)) === 3, `${tag}: and writes nothing`, `${await reservations(userId, card)}`);
    const line = await page.getByText(/All 3 copies are picked/i).count();
    report(line > 0, `${tag}: the all-picked line shows`);

    await option(decks[0]).click();
    await settle(2);
    const two = await ticked();
    report(two.length === 2 && !two.includes(decks[0].name), `${tag}: pressing a ticked deck unticks that one alone`,
      two.join(", "));
    report((await reservations(userId, card)) === 2, `${tag}: leaving two reservations`, `${await reservations(userId, card)}`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    report(overflow <= 0, `${tag}: no sideways scroll`, `overflow=${overflow}`);
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/several-picks-${tag}.png` });

    // PROBE_KEEP=1 leaves the last width's fixture standing (two picks) for the contact sheet, and prints it.
    if (process.env.PROBE_KEEP && tag === "desktop") {
      console.log(`kept: card "${card.name}" (${card.oracle_id}), decks ${decks.map((d) => `${d.name}=${d.id}`).join(" ")}`);
    } else {
      await cleanup(userId, card);
    }
    fixture = null;
    await ctx.close();
  }
} finally {
  if (fixture) await cleanup(userId, fixture.card);
  await browser.close();
  await client.end();
}

console.log(failures === 0 ? "\nSeveral picks hold at both widths." : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
