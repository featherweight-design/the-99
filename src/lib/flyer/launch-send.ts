/**
 * The launch email's one-time send (launch email R2c, G3). SERVER-ONLY: it runs inside the deployment, because the
 * unsubscribe token is made with that deployment's `INVITE_CODE_SECRET` and only that deployment can check it.
 *
 * SEND ONCE. Each address is CLAIMED before its mail goes out: `sent_at` is set by an UPDATE that only matches a row whose
 * `sent_at` is still null, so two runs, a retried run or a crash midway can never mail one address twice. A definite
 * refusal (Resend answered and sent nothing, or our own cap or limit refused it first) releases the claim, so a later
 * batch tries that address again. An indeterminate answer (no reply in time: the mail may have gone) keeps the claim:
 * a missed address is better than a doubled one. A released address waits for the next batch: the batch that released it
 * skips it. Resend's `Idempotency-Key` names the address and the batch, a second guard within one batch.
 *
 * SKIPS ADDRESSES WITH AN ACCOUNT (Q2, Hugh, 2026-11-20). After its claim, each address is looked up in Clerk. One that
 * already has an account keeps its claim and gets no mail, so no later batch mails it either. A lookup that fails or is
 * late sends nothing: the claim is released for the next batch and this batch stops, since Clerk is likely down for the
 * rest too. Fail-closed: a person who already signed up must not get the "we're open" mail because Clerk blinked. The
 * lookups ride the 600ms send gap, far under Clerk's Backend API limit.
 *
 * BATCHED ACROSS DAYS. A batch sends at most `limit`, and every mail still passes the app's own daily cap
 * (`mailRefusal`), so the launch never spends the day's invites and codes. The next batch picks up where this one
 * stopped. A batch refuses to start while any of the email's images is missing from the deployment.
 *
 * The purge (`launch-purge.ts`) is untouched: it deletes whatever rows are left 30 days after the launch date.
 */
import { eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { launchList } from "../../db/schema";
import { emailHasAccount } from "../admin/accounts";
import { launchEmailParts, LAUNCH_IMAGES } from "../email/launch-mail";
import { mailConfig, mailEnv, sendMail, type MailConfig, type MailEnv, type MailResult } from "../invites/mail";
import { inviteSecret } from "../invites/tokens";
import { readStoredLaunchDate } from "./launch-date";
import { readLaunchDate } from "./launch-purge";
import { unsubscribeHash, unsubscribeToken, unsubscribeUrl } from "./launch-unsubscribe";

export { LAUNCH_BATCH_MAX } from "./launch-rule";
import { LAUNCH_BATCH_BUDGET_MS, LAUNCH_BATCH_MAX, LAUNCH_SKIPS_MAX } from "./launch-rule";
/** Resend allows a few requests a second; one every 600ms stays clear of it. */
export const LAUNCH_SEND_GAP_MS = 600;
/** After a skip no mail goes out, so only the next lookup is paced: well under Clerk's Backend API limit. */
export const LAUNCH_SKIP_GAP_MS = 100;

export type LaunchBatchReport =
  | { ok: false; reason: "no-launch-date" | "before-launch" | "unconfigured" | "images-missing"; missing?: string[] }
  | { ok: true; dryRun: boolean; waiting: number; sent: number; released: number; uncertain: number; skipped: number; stoppedBy: "done" | "limit" | "capped" | "lookup" | null };

export type LaunchBatchDeps = {
  env?: MailEnv;
  send?: (config: MailConfig, mail: Parameters<typeof sendMail>[1]) => Promise<MailResult>;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: Date;
  launchRaw?: string | null;
  store?: LaunchStore;
  /** The clock the batch budget reads, `Date.now` by default. */
  clock?: () => number;
  /** Whether an account already holds the address, Clerk's by default; throws when it cannot tell. */
  hasAccount?: (email: string) => Promise<boolean>;
};

/** The list's three moves, the database's by default (a test hands in its own). */
export type LaunchStore = {
  waiting: () => Promise<number>;
  /** The oldest waiting address not in `skip` (the ones this batch already tried), claimed; null when none is left. */
  claimNext: (skip: readonly string[]) => Promise<{ email: string; codeId: string | null } | null>;
  release: (email: string) => Promise<void>;
  /** Writes the hash of the address's unsubscribe token, before its mail goes out, so the link works the moment it lands. */
  linkUnsubscribe: (email: string, hash: string) => Promise<void>;
};

/**
 * The launch date the purge reads (the admin's saved value first, else `FLYER_LAUNCH_DATE`), so the send and the purge agree:
 * no date, or a date still ahead, refuses the send.
 */
async function launchRefusal(deps: LaunchBatchDeps): Promise<"no-launch-date" | "before-launch" | null> {
  const raw = "launchRaw" in deps ? deps.launchRaw : ((await readStoredLaunchDate()) ?? process.env.FLYER_LAUNCH_DATE);
  const launch = readLaunchDate(raw ?? undefined);
  if (!launch) return "no-launch-date";
  return (deps.now ?? new Date()).getTime() < launch.getTime() ? "before-launch" : null;
}

/** How many addresses are still waiting for the email. */
async function launchWaiting(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(launchList).where(isNull(launchList.sentAt));
  return row?.n ?? 0;
}

/** The images the email points at that the deployment does not serve. */
async function missingImages(origin: string, fetchImpl: typeof fetch): Promise<string[]> {
  const found = await Promise.all(
    LAUNCH_IMAGES.map(async (file) => (await fetchImpl(`${origin}/email/${file}`, { method: "HEAD" }).catch(() => null))?.ok === true),
  );
  return LAUNCH_IMAGES.filter((_, i) => !found[i]);
}

/**
 * Claims the oldest waiting address this batch has not tried yet, or null when none is left. One statement: the inner
 * select locks the row it picks and skips any row another run holds, so two batches at once never claim one address and
 * never wait on each other.
 */
async function claimNext(skip: readonly string[]): Promise<{ email: string; codeId: string | null } | null> {
  const notTried = skip.length > 0 ? sql`and email not in (${sql.join(skip.map((e) => sql`${e}`), sql`, `)})` : sql``;
  const { rows } = await db.execute<{ email: string; code_id: string | null }>(sql`
    update launch_list set sent_at = now()
    where email = (
      select email from launch_list where sent_at is null ${notTried}
      order by created_at, email limit 1 for update skip locked
    ) and sent_at is null
    returning email, code_id`);
  const row = rows[0];
  return row ? { email: row.email, codeId: row.code_id } : null;
}

async function release(email: string): Promise<void> {
  await db.update(launchList).set({ sentAt: null }).where(eq(launchList.email, email));
}

async function linkUnsubscribe(email: string, hash: string): Promise<void> {
  await db.update(launchList).set({ unsubscribeHash: hash }).where(eq(launchList.email, email));
}

const DB_STORE: LaunchStore = { waiting: launchWaiting, claimNext, release, linkUnsubscribe };

/**
 * Sends up to `limit` launch emails, or with `dryRun` only counts what is waiting (and checks the configuration and images).
 */
export async function sendLaunchBatch({ dryRun, limit }: { dryRun: boolean; limit: number }, deps: LaunchBatchDeps = {}): Promise<LaunchBatchReport> {
  const env = deps.env ?? mailEnv();
  const config = mailConfig(env);
  const secret = inviteSecret(env);
  const refused = await launchRefusal(deps);
  if (refused) return { ok: false, reason: refused };
  if (!config || !secret) return { ok: false, reason: "unconfigured" };
  const missing = await missingImages(config.origin, deps.fetchImpl ?? fetch);
  if (missing.length > 0) return { ok: false, reason: "images-missing", missing };
  const store = deps.store ?? DB_STORE;
  const waiting = await store.waiting();
  if (dryRun) return { ok: true, dryRun, waiting, sent: 0, released: 0, uncertain: 0, skipped: 0, stoppedBy: null };

  const send = deps.send ?? ((c, m) => sendMail(c, m));
  const hasAccount = deps.hasAccount ?? emailHasAccount;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const cap = Math.max(0, Math.min(Math.floor(limit), LAUNCH_BATCH_MAX));
  let sent = 0;
  let released = 0;
  let uncertain = 0;
  let skipped = 0;
  let stoppedBy: "done" | "limit" | "capped" | "lookup" = "limit";
  // A released address waits for the NEXT batch: this one skips it, so one address that keeps being refused cannot take every turn.
  const tried: string[] = [];
  const claimedAt = Date.now().toString(36);
  const clock = deps.clock ?? Date.now;
  const started = clock();
  // A skip sends nothing, so it does not count toward the batch's mails; `LAUNCH_SKIPS_MAX` and the time budget bound it.
  while (sent + released + uncertain < cap && skipped < LAUNCH_SKIPS_MAX) {
    if (clock() - started > LAUNCH_BATCH_BUDGET_MS) break;
    const row = await store.claimNext(tried);
    if (!row) {
      stoppedBy = "done";
      break;
    }
    tried.push(row.email);
    const held = await hasAccount(row.email.trim().toLocaleLowerCase("en-US")).catch((error: unknown) => {
      // The cause only (a bad key, a rate limit, a timeout), never the address.
      console.error("launch-email: account lookup failed; the batch stops", error instanceof Error ? error.message : error);
      return null;
    });
    if (held === null) {
      await store.release(row.email);
      released++;
      stoppedBy = "lookup";
      break;
    }
    if (held) {
      // Claimed and never mailed: an account holder already knows The 99 is open.
      skipped++;
      await sleep(LAUNCH_SKIP_GAP_MS);
      continue;
    }
    const token = unsubscribeToken(secret, row.email);
    await store.linkUnsubscribe(row.email, unsubscribeHash(token));
    const unsubscribe = unsubscribeUrl(config.origin, secret, row.email);
    const parts = launchEmailParts({ origin: config.origin, source: row.codeId ? "flyer" : "landing", unsubscribeUrl: unsubscribe });
    const result = await send(config, {
      to: row.email,
      ...parts,
      template: "launch",
      listUnsubscribe: `${config.origin}/api/unsubscribe?t=${token}`,
      // Per claim, not per address: a released address retried later the same day is a new send, not Resend's cached refusal.
      idempotencyKey: `launch-${token.slice(0, 22)}-${claimedAt}`,
    });
    if (result.ok) sent++;
    else if (result.reason === "indeterminate") uncertain++;
    else {
      await store.release(row.email);
      released++;
      // The day's cap (an address's own limit releases just that address): the rest wait for the next batch.
      if (result.reason === "capped" || result.reason === "unconfigured") {
        stoppedBy = "capped";
        break;
      }
    }
    await sleep(LAUNCH_SEND_GAP_MS);
  }
  const left = await store.waiting();
  if (stoppedBy === "limit" && left === 0) stoppedBy = "done";
  return { ok: true, dryRun, waiting: left, sent, released, uncertain, skipped, stoppedBy };
}
