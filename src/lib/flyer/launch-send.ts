/**
 * The launch email's one-time send (launch email R2c, G3). SERVER-ONLY: it runs inside the deployment, because the
 * unsubscribe token is made with that deployment's `INVITE_CODE_SECRET` and only that deployment can check it.
 *
 * SEND ONCE. Each address is CLAIMED before its mail goes out: `sent_at` is set by an UPDATE that only matches a row whose
 * `sent_at` is still null, so two runs, a retried run or a crash midway can never mail one address twice. A definite
 * refusal (Resend answered and sent nothing, or our own cap or limit refused it first) releases the claim, so a later
 * batch tries that address again. An indeterminate answer (no reply in time: the mail may have gone) keeps the claim:
 * a missed address is better than a doubled one. Resend's `Idempotency-Key` is the address's token, a second guard.
 *
 * BATCHED ACROSS DAYS. A batch sends at most `limit`, and every mail still passes the app's own daily cap
 * (`mailRefusal`), so the launch never spends the day's invites and codes. The next batch picks up where this one
 * stopped. A batch refuses to start while any of the email's images is missing from the deployment.
 *
 * The purge (`launch-purge.ts`) is untouched: it deletes whatever rows are left 30 days after the launch date.
 */
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { launchList } from "../../db/schema";
import { launchEmailParts, LAUNCH_IMAGES } from "../email/launch-mail";
import { mailConfig, mailEnv, sendMail, type MailConfig, type MailEnv, type MailResult } from "../invites/mail";
import { inviteSecret } from "../invites/tokens";
import { readStoredLaunchDate } from "./launch-date";
import { readLaunchDate } from "./launch-purge";
import { unsubscribeToken, unsubscribeUrl } from "./launch-unsubscribe";

/** The most one batch sends: under the free plan's 100 a day with room for the day's invites and codes. */
export const LAUNCH_BATCH_MAX = 40;
/** Resend allows a few requests a second; one every 600ms stays clear of it. */
export const LAUNCH_SEND_GAP_MS = 600;

export type LaunchBatchReport =
  | { ok: false; reason: "no-launch-date" | "before-launch" | "unconfigured" | "images-missing"; missing?: string[] }
  | { ok: true; dryRun: boolean; waiting: number; sent: number; released: number; uncertain: number; stoppedBy: "done" | "limit" | "capped" | null };

export type LaunchBatchDeps = {
  env?: MailEnv;
  send?: (config: MailConfig, mail: Parameters<typeof sendMail>[1]) => Promise<MailResult>;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: Date;
  launchRaw?: string | null;
  store?: LaunchStore;
};

/** The list's three moves, the database's by default (a test hands in its own). */
export type LaunchStore = {
  waiting: () => Promise<number>;
  claimNext: () => Promise<{ email: string; codeId: string | null } | null>;
  release: (email: string) => Promise<void>;
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
  const missing: string[] = [];
  for (const file of LAUNCH_IMAGES) {
    const res = await fetchImpl(`${origin}/email/${file}`, { method: "HEAD" }).catch(() => null);
    if (!res?.ok) missing.push(file);
  }
  return missing;
}

/** Claims the oldest waiting address, or null when none is left. */
async function claimNext(): Promise<{ email: string; codeId: string | null } | null> {
  const [next] = await db.select({ email: launchList.email }).from(launchList).where(isNull(launchList.sentAt)).orderBy(asc(launchList.createdAt)).limit(1);
  if (!next) return null;
  const [claimed] = await db
    .update(launchList)
    .set({ sentAt: sql`now()` })
    .where(and(eq(launchList.email, next.email), isNull(launchList.sentAt)))
    .returning({ email: launchList.email, codeId: launchList.codeId });
  // Another run took it between the read and the claim: try the next one.
  return claimed ?? claimNext();
}

async function release(email: string): Promise<void> {
  await db.update(launchList).set({ sentAt: null }).where(eq(launchList.email, email));
}

const DB_STORE: LaunchStore = { waiting: launchWaiting, claimNext, release };

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
  if (dryRun) return { ok: true, dryRun, waiting, sent: 0, released: 0, uncertain: 0, stoppedBy: null };

  const send = deps.send ?? ((c, m) => sendMail(c, m));
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const cap = Math.max(0, Math.min(Math.floor(limit), LAUNCH_BATCH_MAX));
  let sent = 0;
  let released = 0;
  let uncertain = 0;
  let stoppedBy: "done" | "limit" | "capped" = "limit";
  for (let i = 0; i < cap; i++) {
    const row = await store.claimNext();
    if (!row) {
      stoppedBy = "done";
      break;
    }
    const unsubscribe = unsubscribeUrl(config.origin, secret, row.email);
    const parts = launchEmailParts({ origin: config.origin, source: row.codeId ? "flyer" : "landing", unsubscribeUrl: unsubscribe });
    const result = await send(config, {
      to: row.email,
      ...parts,
      template: "launch",
      listUnsubscribe: `${config.origin}/api/unsubscribe?t=${unsubscribeToken(secret, row.email)}`,
      idempotencyKey: `launch-${unsubscribeToken(secret, row.email)}`,
    });
    if (result.ok) sent++;
    else if (result.reason === "indeterminate") uncertain++;
    else {
      await store.release(row.email);
      released++;
      // The day's cap or this address's limit: the rest wait for the next batch.
      if (result.reason === "capped" || result.reason === "unconfigured") {
        stoppedBy = "capped";
        break;
      }
    }
    await sleep(LAUNCH_SEND_GAP_MS);
  }
  const left = await store.waiting();
  if (stoppedBy === "limit" && left === 0) stoppedBy = "done";
  return { ok: true, dryRun, waiting: left, sent, released, uncertain, stoppedBy };
}
