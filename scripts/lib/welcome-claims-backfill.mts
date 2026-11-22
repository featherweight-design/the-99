// The pure half of `scripts/backfill-welcome-claims.ts`: argument parsing, the target check, and turning Clerk's users into
// the claim hashes `grantWelcome` would have written. No database, no network, so the tests run it as is.
//
// The claim is exactly the webhook's: `primaryVerifiedEmail` over Clerk's raw user JSON (the same snake_case shape as a
// `user.created` payload), then `welcomeEmailHash` (the same fold, the same key precedence). No crypto of its own.
import { primaryVerifiedEmail, welcomeEmailHash } from "../../src/lib/payments/canonical-email";
import { LOCAL_DEV_BRANCH, PRODUCTION_BRANCH, STAGING_BRANCH } from "./scratch-branch.mjs";

export type Args = { apply: boolean; target: string | null; keyCheck: boolean };

/** `--dry-run` is the default and may be written out; `--apply` writes. Anything unrecognised refuses. */
export function parseArgs(argv: readonly string[]): Args {
  const args: Args = { apply: false, target: null, keyCheck: true };
  let dryRun = false;
  for (const a of argv) {
    if (a === "--apply") args.apply = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--no-key-check") args.keyCheck = false;
    else if (a.startsWith("--target=") && a.length > "--target=".length) {
      if (args.target !== null) throw new Error("--target given twice: pass it once");
      args.target = a.slice("--target=".length);
    }
    else throw new Error(`unknown argument ${JSON.stringify(a)}: use --dry-run (default), --apply, --target=<name|branch id>, --no-key-check`);
  }
  if (args.apply && dryRun) throw new Error("--apply and --dry-run together: pick one");
  return args;
}

const NAMED: Record<string, string> = { production: PRODUCTION_BRANCH, staging: STAGING_BRANCH, "local-dev": LOCAL_DEV_BRANCH };

/**
 * Which database this run may touch, from the database's own `neon.branch_id`. With no `--target` only production passes:
 * staging, local-dev and any other branch refuse. With `--target` (a name above or a `br-…` id) the branch must be that one.
 * An unknown branch (no `neon.branch_id`) always refuses.
 */
export function resolveTarget(branch: string | null, target: string | null): { ok: true; name: string } | { ok: false; reason: string } {
  if (!branch) return { ok: false, reason: "the database reports no neon.branch_id" };
  const nameOf = (id: string) => Object.keys(NAMED).find((k) => NAMED[k] === id) ?? id;
  if (target === null) {
    return branch === PRODUCTION_BRANCH
      ? { ok: true, name: "production" }
      : { ok: false, reason: `DATABASE_URL is ${nameOf(branch)}, not production: pass --target=${nameOf(branch)} to run there` };
  }
  const want = NAMED[target] ?? (target.startsWith("br-") ? target : null);
  if (!want) return { ok: false, reason: `--target=${target} is neither production, staging, local-dev nor a br- id` };
  if (want !== branch) return { ok: false, reason: `--target=${target} but DATABASE_URL is ${nameOf(branch)}` };
  return { ok: true, name: nameOf(branch) };
}

/** A production run must use the production Clerk instance: a development key finds none of production's accounts. */
export function clerkKeyFits(targetName: string, secretKey: string): boolean {
  return targetName !== "production" || secretKey.startsWith("sk_live_");
}

type KeyEnv = Parameters<typeof welcomeEmailHash>[1];
export type ClerkUser = { id: string; raw: { email_addresses?: unknown; primary_email_address_id?: unknown } | null };

/**
 * One page of Clerk's `getUserList`, checked. A short page would count real accounts as gone, and a user with no raw JSON
 * as unclaimable, so the backfill would silently skip them: both refuse instead.
 */
export function clerkPage(page: { data: readonly { id: string; raw: ClerkUser["raw"] }[]; totalCount: number }):
  { ok: true; users: ClerkUser[] } | { ok: false; reason: string } {
  if (page.totalCount > page.data.length) return { ok: false, reason: `Clerk returned ${page.data.length} of ${page.totalCount} users for one page` };
  if (page.data.some((u) => !u.raw)) return { ok: false, reason: "Clerk returned a user without its raw JSON: the SDK's shape has changed, so no claim can be read" };
  return { ok: true, users: page.data.map((u) => ({ id: u.id, raw: u.raw })) };
}

export type Plan = {
  accounts: number;
  notInClerk: number;
  unclaimable: number;
  hashes: string[];
  sharedMailbox: number;
};

/** The claims for the welcomed accounts: one per account's verified primary address, deduplicated by mailbox. */
export function planClaims(accountIds: readonly string[], users: readonly ClerkUser[], keys: KeyEnv): Plan {
  const byId = new Map(users.map((u) => [u.id, u]));
  const hashes = new Set<string>();
  let notInClerk = 0, unclaimable = 0, claimable = 0;
  for (const id of new Set(accountIds)) {
    const u = byId.get(id);
    if (!u) { notInClerk += 1; continue; }
    const email = u.raw ? primaryVerifiedEmail(u.raw) : null;
    const hash = email ? welcomeEmailHash(email, keys) : null;
    if (!hash) { unclaimable += 1; continue; }
    claimable += 1;
    hashes.add(hash);
  }
  return { accounts: new Set(accountIds).size, notInClerk, unclaimable, hashes: [...hashes], sharedMailbox: claimable - hashes.size };
}

export type KeyCheck = "ok" | "wrong" | "unverifiable";

/**
 * The key check. Claims written since migration 0260 used production's key, so a right key matches at least one of them.
 * `wrong`: the table holds claims and not one of ours matches, so this run's claims would block nobody. `unverifiable`: the
 * table is empty, so nothing can confirm the key. `--apply` refuses both unless `--no-key-check`.
 */
export function keyCheck(existingClaims: number, matched: number, planned: number): KeyCheck {
  if (planned === 0 || matched > 0) return "ok";
  return existingClaims > 0 ? "wrong" : "unverifiable";
}

export function chunks<T>(xs: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}
