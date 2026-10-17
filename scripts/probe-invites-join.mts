// The newcomer's pages in a browser, SIGNED OUT, at 390 and at 1300 (invites R1 PR 5; boards N1 to N12, I1).
//
//   PROBE_DB_BRANCH=br-… PROBE_BASE=http://localhost:3475 pnpm probe:invites-join
//
// The contact sheet cannot photograph these routes: it signs in, and a signed-in reader is sent Home. So this
// seeds one sender and one reservation per state (its own per-run ids), opens each link with no session and
// photographs it into `contact-sheets/invites-join/`. A claim's browser is stood in for by setting the claim cookie
// to a secret whose hash the row holds. Needs a server on the SAME database with SOCIAL_FRIENDS_ENABLED and
// SOCIAL_INVITES_ENABLED true and no INVITE_CODE_SECRET (so Send code answers `unconfigured`, which is R14's toast).
// It WRITES, so it fails closed: `PROBE_DB_BRANCH` must name the branch `DATABASE_URL` reports, and staging,
// production and local-dev are refused by id.

import "./lib/env.mjs";
import { mkdir } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { joinCopy, inviteOnlyCopy } from "../src/lib/copy/join";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const OUT = "contact-sheets/invites-join";
let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:invites-join: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:invites-join: ${named} is staging, production or local-dev; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:invites-join: database reports ${rows[0]?.b}, not ${named}`);
  const { secretHash } = await import("../src/lib/invites/tokens");

  const SENDER = `probe_join_${randomUUID()}`;
  const COOKIE = randomBytes(24).toString("hex");
  const token = () => randomBytes(32).toString("base64url");
  const T = { open: token(), expired: token(), ended: token(), code: token(), proven: token() };
  const ids: string[] = [];
  const iso = (ms: number) => new Date(Date.now() + ms).toISOString();

  await db.execute(sql`insert into social_profiles (user_id, display_name) values (${SENDER}, 'Ana Sender')`);
  async function seed(tok: string, cols: { state: string; qrMs: number; claimed?: { proven: boolean } }) {
    const id = randomUUID();
    ids.push(id);
    const claimed = cols.claimed;
    await db.execute(sql`
      insert into invite_reservations (id, user_id, kind, state, qr_token_hash, qr_expires_at, holds_until, email, claim_secret_hash,
        code_hmac, code_expires_at, code_sent_at, proven_at, resolved_at)
      values (${id}, ${SENDER}, 'qr', ${cols.state}, ${secretHash(tok)}, ${iso(cols.qrMs)},
        ${claimed ? iso(6 * 864e5) : null}, ${claimed ? "new@example.com" : null}, ${claimed ? secretHash(COOKIE) : null},
        ${claimed && !claimed.proven ? "x" : null}, ${claimed && !claimed.proven ? iso(9 * 60_000) : null},
        ${claimed ? iso(-5_000) : null}, ${claimed?.proven ? iso(-1_000) : null}, ${cols.state === "revoked" ? iso(-1_000) : null})`);
  }
  try {
    await seed(T.open, { state: "qr_open", qrMs: 10 * 60_000 });
    await seed(T.expired, { state: "qr_open", qrMs: -60_000 });
    await seed(T.ended, { state: "revoked", qrMs: 10 * 60_000 });
    await seed(T.code, { state: "claimed", qrMs: 10 * 60_000, claimed: { proven: false } });
    await seed(T.proven, { state: "claimed", qrMs: 10 * 60_000, claimed: { proven: true } });
    await mkdir(OUT, { recursive: true });

    const browser = await chromium.launch();
    try {
      for (const [width, height, w] of [[390, 844, "phone"], [1300, 900, "desktop"]] as const) {
        const ctx = await browser.newContext({ viewport: { width, height } });
        const url = new URL(BASE);
        for (const tok of [T.code, T.proven]) {
          await ctx.addCookies([{ name: "invite_claim", value: COOKIE, domain: url.hostname, path: `/join/${tok}`, httpOnly: true, sameSite: "Lax" }]);
        }
        const page = await ctx.newPage();
        const open = async (path: string, shot: string) => {
          const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
          await page.waitForSelector("main h1");
          await page.waitForTimeout(900);
          await page.screenshot({ path: `${OUT}/${w}-${shot}.png` });
          return res;
        };
        const heading = () => page.locator("main h1").first().innerText();
        const sideways = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

        let r = await open(`/join/${T.open}`, "n1-email");
        check(`${w}: N1 public (no redirect to sign-in), sender named`, r?.url().includes("/join/") === true && (await heading()) === joinCopy.title("Ana Sender"), await heading());
        check(`${w}: N1 no sideways scroll`, !(await sideways()));
        await page.getByLabel(joinCopy.emailLabel).fill("nope");
        await page.getByRole("button", { name: joinCopy.sendCode }).click();
        check(`${w}: N1 shape error, nothing sent`, (await page.locator("#join-line").innerText()) === joinCopy.notAnEmail);
        await page.getByLabel(joinCopy.emailLabel).fill("new@example.com");
        await page.getByRole("button", { name: joinCopy.sendCode }).click();
        await page.getByText(joinCopy.failed).waitFor({ timeout: 8000 });
        check(`${w}: R14 toast with Try again, field keeps its text`, (await page.getByLabel(joinCopy.emailLabel).inputValue()) === "new@example.com"
          && (await page.getByRole("button", { name: joinCopy.retry }).count()) === 1);
        await page.screenshot({ path: `${OUT}/${w}-r14-toast.png` });

        await open(`/join/${T.code}`, "n3-code");
        check(`${w}: N3 reopen redraws the code step for the claiming browser`, (await heading()) === joinCopy.codeTitle);
        await page.getByLabel(joinCopy.codeAria).fill("123456");
        await page.screenshot({ path: `${OUT}/${w}-n3-code-typed.png` });

        await open(`/join/${T.proven}`, "n6-proven");
        check(`${w}: N6 reopen redraws the hand-over`, (await heading()) === joinCopy.okTitle && (await page.getByRole("button", { name: joinCopy.toSignUp }).count()) === 1);

        await open(`/join/${T.expired}`, "n11-expired");
        check(`${w}: N11 expired names nobody`, (await heading()) === joinCopy.expiredTitle && !(await page.content()).includes("Ana Sender"));
        await open(`/join/${T.ended}`, "n12-ended");
        check(`${w}: N12 ended names nobody`, (await heading()) === joinCopy.endedTitle && !(await page.content()).includes("Ana Sender"));
        await open(`/join/${token()}`, "n12-unknown");
        check(`${w}: an unknown token reads as ended`, (await heading()) === joinCopy.endedTitle);

        // A claim's cookie is path-scoped: the same row opened WITHOUT it is ended, not the code step.
        const bare = await browser.newContext({ viewport: { width, height } });
        const bp = await bare.newPage();
        await bp.goto(`${BASE}/join/${T.code}`, { waitUntil: "networkidle" });
        check(`${w}: a claimed link in another browser is ended`, (await bp.locator("main h1").first().innerText()) === joinCopy.endedTitle);
        await bare.close();

        r = await open("/sign-up", "i1-invite-only");
        check(`${w}: I1 /sign-up public and invite-only`, (await heading()) === inviteOnlyCopy.title && (await page.getByRole("button", { name: inviteOnlyCopy.signIn }).count()) === 1);
        check(`${w}: I1 no sideways scroll`, !(await sideways()));
        await ctx.close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    await db.execute(sql`delete from invite_reservations where user_id = ${SENDER}`);
    await db.execute(sql`delete from social_profiles where user_id = ${SENDER}`);
  }
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
