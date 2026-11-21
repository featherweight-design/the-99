// Our own mail limits on the join page, in a browser, SIGNED OUT, at 390 and 1300. A recipient over its hourly limit and a spent
// daily cap used to read as the resend countdown ("Send a new code in 33:19", as if a code had gone) and as "We couldn't do that.
// Try again."; they now say that no code was sent, and when one can be.
//
//   PROBE_DB_BRANCH=br-… PROBE_BASE=http://localhost:3475 RESEND_DAILY_SEND_CAP=5 pnpm probe:mail-refusals
//
// It WRITES (rate_hits rows under made-up recipient keys, one sender and one reservation of its own per-run ids), so it fails closed:
// `PROBE_DB_BRANCH` must name the branch `DATABASE_URL` reports, and staging, production and local-dev are refused by id.
// The server must run on the SAME database with the mail settings present (RESEND_API_KEY=re_probe, INVITE_EMAIL_FROM, a 64-hex
// INVITE_CODE_SECRET, APP_ORIGIN) and the same RESEND_DAILY_SEND_CAP as this process (5): the refusals come before anything is
// mailed, so no mail is ever sent. The probe also seeds the day's counter to the cap, so it never runs against a shared database.
// The second half signs the dev-instance fixture account (`alpha-test+clerk_test@the99.app`, the email code 424242) in and
// presses Send invitation on /friends?invite=new at both widths, once for each refusal on that form: the recipient's hour
// (limited), the day's cap (capped) and the account's own press rate (paced). It gives that account an invite balance and the
// About gate's seen version on the scratch branch, and puts both back.

import "./lib/env.mjs";
import { mkdir } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { chromium, type Page } from "playwright";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { inviteCopy } from "../src/lib/copy/invites";
import { captureAboutSeen, markEveryEntrySeen, restoreAboutSeen } from "./lib/about-clear.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { joinCopy } from "../src/lib/copy/join";
import { waitPhrase } from "../src/lib/copy/wait-phrase";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const OUT = "contact-sheets/mail-refusals";
let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}


const FIXTURE_EMAIL = process.env.PROBE_SIGNED_IN_EMAIL ?? "alpha-test+clerk_test@the99.app";

async function signIn(page: Page): Promise<string> {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Clerk = (window as any).Clerk;
    try {
      let attempt = await Clerk.client.signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
        if (!factor?.emailAddressId) return "no email_code factor";
        await Clerk.client.signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
        attempt = await Clerk.client.signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (e as any)?.errors?.[0]?.longMessage ?? String(e);
    }
  }, FIXTURE_EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return page.evaluate(() => (window as any).Clerk.user.id as string);
}

// The invite form's three refusals, signed in. Every row it writes is the fixture account's own or a made-up recipient key.
async function signedIn(
  browser: import("playwright").Browser,
  db: typeof import("../src/db").db,
  sql: typeof import("drizzle-orm").sql,
) {
  await clerkSetup();
  const { recipientKey, MAIL_ALL_KEY, mailDailyCap } = await import("../src/lib/invites/mail-limits");
  const { recordHit } = await import("../src/lib/rate/observe");
  const probe = await (await browser.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const userId = await signIn(probe);
  await probe.context().close();
  const keys: string[] = [];
  const was = await db.execute<{ held: number | null }>(sql`select (select held from invite_balances where user_id = ${userId}) as held`);
  const about = await captureAboutSeen(userId);
  try {
    await db.execute(sql`insert into invite_balances (user_id, held) values (${userId}, 5)
      on conflict (user_id) do update set held = 5, updated_at = now()`);
    await markEveryEntrySeen(userId);
    for (const [width, height, w] of [[390, 844, "phone"], [1300, 900, "desktop"]] as const) {
      const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
      await signIn(page);
      const sideways = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      const send = async (address: string) => {
        await page.goto(`${BASE}/friends?invite=new`, { waitUntil: "domcontentloaded", timeout: 120_000 });
        const field = page.getByLabel(inviteCopy.path.emailLabel);
        await field.waitFor({ timeout: 90_000 });
        await page.waitForTimeout(1500);
        await field.fill(address);
        await page.getByRole("button", { name: inviteCopy.path.send }).click();
      };
      const expectLine = async (label: string, shot: string, line: string, notLine: (RegExp | string)[]) => {
        const hit = page.getByText(line, { exact: true });
        await hit.first().waitFor({ timeout: 15_000 }).catch(() => undefined);
        const seen = await hit.count();
        check(`${w}: ${label} says it`, seen > 0, line);
        for (const n of notLine) check(`${w}: ${label} is not ${typeof n === "string" ? n : n.source}`, (await page.getByText(n).count()) === 0);
        check(`${w}: ${label} has no Try again button`, (await page.getByRole("button", { name: inviteCopy.path.retry }).count()) === 0);
        check(`${w}: ${label} no sideways scroll`, !(await sideways()));
        await page.screenshot({ path: `${OUT}/${w}-invite-${shot}.png` });
      };

      // Limited: this recipient is over its hour.
      const limitedAddress = `invlimited-${randomUUID().slice(0, 8)}@example.com`;
      const limitedKey = recipientKey(limitedAddress);
      keys.push(limitedKey);
      for (let i = 0; i < 3; i += 1) await recordHit(limitedKey, "mail-recipient", new Date(), false);
      await send(limitedAddress);
      await page.getByText(/^Too many emails to that address\. Try again in \d+ minutes?\.$/).first().waitFor({ timeout: 15_000 }).catch(() => undefined);
      const limitedText = (await page.getByText(/^Too many emails to that address\./).first().innerText().catch(() => "")) || "";
      const n = Number(/in (\d+) minute/.exec(limitedText)?.[1]);
      await expectLine("limited", "limited", inviteCopy.path.limited(waitPhrase(n * 60_000)), [inviteCopy.path.sendFailed]);

      // Capped: the day's counter is at the cap.
      keys.push(MAIL_ALL_KEY);
      const cap = mailDailyCap();
      const { rows: seen } = await db.execute<{ hits: number }>(sql`select coalesce(max(hits), 0)::int as hits from rate_hits where user_id = ${MAIL_ALL_KEY} and bucket = 'mail-all-day'`);
      for (let i = seen[0]?.hits ?? 0; i < cap; i += 1) await recordHit(MAIL_ALL_KEY, "mail-all-day", new Date(), false);
      const invCapped = `invcapped-${randomUUID().slice(0, 8)}@example.com`;
      keys.push(recipientKey(invCapped));
      await send(invCapped);
      await expectLine("capped", "capped", inviteCopy.path.capped, [inviteCopy.path.sendFailed]);
      await db.execute(sql`delete from rate_hits where user_id = ${MAIL_ALL_KEY} and bucket = 'mail-all-day'`);

      // Paced: the account has pressed 30 times this hour (the invite-email rule), so the 31st is refused.
      keys.push(userId);
      for (let i = 0; i < 30; i += 1) await recordHit(userId, "invite-email", new Date(), false);
      await send(`invpaced-${randomUUID().slice(0, 8)}@example.com`);
      await page.getByText(/^You’ve sent a lot of invitations\./).first().waitFor({ timeout: 15_000 }).catch(() => undefined);
      const pacedText = (await page.getByText(/^You’ve sent a lot of invitations\./).first().innerText().catch(() => "")) || "";
      const pn = Number(/in (\d+) minute/.exec(pacedText)?.[1]);
      await expectLine("paced", "paced", inviteCopy.path.paced(waitPhrase(pn * 60_000)), [inviteCopy.path.sendFailed]);
      await db.execute(sql`delete from rate_hits where user_id = ${userId} and bucket = 'invite-email'`);
      await db.execute(sql`delete from rate_hits where user_id = ${limitedKey}`);
    }
  } finally {
    for (const k of keys) await db.execute(sql`delete from rate_hits where user_id = ${k}`);
    if (was.rows[0]?.held == null) await db.execute(sql`delete from invite_balances where user_id = ${userId}`);
    else await db.execute(sql`update invite_balances set held = ${was.rows[0].held} where user_id = ${userId}`);
    await restoreAboutSeen(about);
  }
}

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:mail-refusals: set PROBE_DB_BRANCH");
  assertScratchBranch(named, "probe:mail-refusals");
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:mail-refusals: database reports ${rows[0]?.b}, not ${named}`);
  const { secretHash } = await import("../src/lib/invites/tokens");
  const { recipientKey, MAIL_ALL_KEY, mailDailyCap } = await import("../src/lib/invites/mail-limits");
  const { recordHit } = await import("../src/lib/rate/observe");

  const SENDER = `probe_mailref_${randomUUID()}`;
  const tokens = { limited: randomBytes(32).toString("base64url"), capped: randomBytes(32).toString("base64url") };
  const ids: string[] = [];
  const keys: string[] = [];
  const limitedAddress = `limited-${randomUUID().slice(0, 8)}@example.com`;
  const cappedAddress = `capped-${randomUUID().slice(0, 8)}@example.com`;
  keys.push(recipientKey(cappedAddress));

  await db.execute(sql`insert into social_profiles (user_id, display_name) values (${SENDER}, 'Ana Sender')`);
  async function seed(tok: string) {
    const id = randomUUID();
    ids.push(id);
    await db.execute(sql`
      insert into invite_reservations (id, user_id, kind, state, qr_token_hash, qr_expires_at)
      values (${id}, ${SENDER}, 'qr', 'qr_open', ${secretHash(tok)}, ${new Date(Date.now() + 10 * 60_000).toISOString()})`);
  }
  try {
    await seed(tokens.limited);
    await seed(tokens.capped);
    // The recipient is over its hour (the limit is 3 an hour, so the 4th hit refuses).
    const limitedKey = recipientKey(limitedAddress);
    keys.push(limitedKey);
    for (let i = 0; i < 3; i += 1) await recordHit(limitedKey, "mail-recipient", new Date(), false);
    await mkdir(OUT, { recursive: true });

    const browser = await chromium.launch();
    try {
      for (const [width, height, w] of [[390, 844, "phone"], [1300, 900, "desktop"]] as const) {
        const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
        const press = async (tok: string, address: string) => {
          await page.goto(`${BASE}/join/${tok}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
          await page.getByLabel(joinCopy.emailLabel).waitFor({ timeout: 60_000 });
          await page.waitForTimeout(1500); // hydrated, so the press reaches the action
          await page.getByLabel(joinCopy.emailLabel).fill(address);
          await page.getByRole("button", { name: joinCopy.sendCode }).click();
        };
        const sideways = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

        // Limited: hitting the recipient window again keeps it refused, so the wait is whatever the hour has left.
        await press(tokens.limited, limitedAddress);
        const line = page.locator("#join-line");
        await line.waitFor({ timeout: 8000 });
        const text = await line.innerText();
        check(`${w}: limited says no code was sent and when`, /^No code was sent: too many emails to that address\. Try again in \d+ minutes?\.$/.test(text), text);
        check(`${w}: limited is not the resend countdown`, (await page.getByRole("button", { name: /Send a new code in/ }).count()) === 0);
        check(`${w}: limited keeps the email step and the draft`, (await page.getByLabel(joinCopy.emailLabel).inputValue()) === limitedAddress);
        check(`${w}: limited no sideways scroll`, !(await sideways()));
        check(`${w}: limited wait is the rest of the hour, in minutes`, (() => { const n = Number(/in (\d+) minute/.exec(text)?.[1]); return n >= 1 && n <= 60 && text === joinCopy.limited(waitPhrase(n * 60_000)); })(), text);
        await page.screenshot({ path: `${OUT}/${w}-limited.png` });

        // Capped: the day's counter is at the cap, so the next fresh recipient is refused for the day.
        keys.push(MAIL_ALL_KEY);
        const cap = mailDailyCap();
        const { rows: seen } = await db.execute<{ hits: number }>(sql`select coalesce(max(hits), 0)::int as hits from rate_hits where user_id = ${MAIL_ALL_KEY} and bucket = 'mail-all-day'`);
        for (let i = seen[0]?.hits ?? 0; i < cap; i += 1) await recordHit(MAIL_ALL_KEY, "mail-all-day", new Date(), false);
        await press(tokens.capped, cappedAddress);
        await line.waitFor({ timeout: 8000 });
        check(`${w}: capped says no code was sent, paused for today`, (await line.innerText()) === joinCopy.capped, await line.innerText());
        check(`${w}: capped is not the failed toast`, (await page.getByText(joinCopy.failed).count()) === 0);
        check(`${w}: capped no sideways scroll`, !(await sideways()));
        await page.screenshot({ path: `${OUT}/${w}-capped.png` });
        // The next width starts from a spent limit window again.
        await db.execute(sql`delete from rate_hits where user_id = ${MAIL_ALL_KEY} and bucket = 'mail-all-day'`);
        await db.execute(sql`delete from rate_hits where user_id = ${limitedKey} and bucket = 'mail-recipient-day'`);
      }
      await signedIn(browser, db, sql);
    } finally {
      await browser.close();
    }
  } finally {
    for (const k of keys) await db.execute(sql`delete from rate_hits where user_id = ${k}`);
    for (const id of ids) await db.execute(sql`delete from invite_reservations where id = ${id}`);
    await db.execute(sql`delete from social_profiles where user_id = ${SENDER}`);
  }
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
