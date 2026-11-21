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
// The invite form's toasts (the signed-in half of the same fix) are pinned in friends-view-invites.test.tsx.

import "./lib/env.mjs";
import { mkdir } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { joinCopy } from "../src/lib/copy/join";
import { waitPhrase } from "../src/lib/copy/wait-phrase";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const OUT = "contact-sheets/mail-refusals";
let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:mail-refusals: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:mail-refusals: ${named} is staging, production or local-dev; it writes`);
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
