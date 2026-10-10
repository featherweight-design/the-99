import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";

/**
 * The running spend, kept on disk so it survives every run and every process.
 *
 * THE CAP IS CHECKED BEFORE A BATCH IS SENT, against that batch's worst case (`worstCaseUsd`),
 * never after. A batch is billed whether or not anyone reads its results, so a guard that only
 * looked at recorded spend would learn it had crossed $25 after the money was gone.
 *
 * Two thresholds, from the lane brief: $25 is the hard stop; $15 reached before the run plan is
 * half done is a stop-and-ask. The second needs the plan's progress, which the caller supplies.
 */
export const HARD_CAP_USD = 25;
export const ASK_AT_USD = 15;

/**
 * A ledger's two thresholds. The original campaign's file keeps `DEFAULT_LIMITS`; the Overview
 * accuracy line (plan 2026-10-10, Hugh's $15 cap) has its own file and `CAMPAIGN_LIMITS`, because
 * the original holds $23.72 of settled spend and could not carry a second campaign.
 */
export type Limits = { hardCapUsd: number; askAtUsd: number };
export const DEFAULT_LIMITS: Limits = { hardCapUsd: HARD_CAP_USD, askAtUsd: ASK_AT_USD };
export const OVERVIEW_ACCURACY_LIMITS: Limits = { hardCapUsd: 15, askAtUsd: 11 };

/**
 * An entry is either SETTLED (what a batch actually cost, from its usage meters) or PENDING (a
 * batch's worst case, written BEFORE it is submitted). A settled entry names the pending one it
 * closes. So a process that dies after paying for a batch and before settling it leaves its
 * pending entry standing, and every later run counts that worst case as spent: the cap stays hard
 * across a crash rather than best-effort.
 */
export type LedgerEntry = {
  at: string;
  runId: string;
  /** The batch id, or `realtime:<n>` for a real-time call. */
  source: string;
  usd: number;
  requests: number;
  /** Present on a pending entry: its id, which the settling entry names in `settles`. */
  pending?: string;
  settles?: string;
  /** Free text for a human reading the file; no rule reads it. */
  note?: string;
};

export type Ledger = { entries: LedgerEntry[] };

/**
 * One JSON line per entry, APPENDED: two runs finishing together each add their line, where a
 * read-modify-write of one document could drop whichever wrote first.
 */
export function readLedger(path: string): Ledger {
  if (!existsSync(path)) return { entries: [] };
  return { entries: readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as LedgerEntry) };
}

/** Settled spend, plus the worst case of every pending entry no settled entry has closed. */
export function spent(ledger: Ledger): number {
  const settled = new Set(ledger.entries.flatMap((e) => (e.settles ? [e.settles] : [])));
  return ledger.entries.reduce((n, e) => n + (e.pending && settled.has(e.pending) ? 0 : e.usd), 0);
}

export function record(path: string, entry: LedgerEntry): Ledger {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(entry)}\n`);
  return readLedger(path);
}

/**
 * ONE RUN AT A TIME. The cap is checked before sending, and the spend is recorded after, so two runs
 * started together would each pass the check against the same total and could cross the cap
 * between them. The lock is a file created exclusively beside the ledger and removed when the
 * process exits; a second run refuses to start while it exists. A lock left by a killed run names
 * its pid, and is removed by hand once that pid is gone.
 */
export function acquireRunLock(ledgerPath: string): void {
  const lockPath = `${ledgerPath}.lock`;
  mkdirSync(dirname(lockPath), { recursive: true });
  let fd: number;
  try {
    fd = openSync(lockPath, "wx");
  } catch {
    const holder = existsSync(lockPath) ? readFileSync(lockPath, "utf8").trim() : "unknown";
    throw new Error(`eval: another run holds the ledger lock (${lockPath}, ${holder}). Wait for it, or delete the file if that process is gone.`);
  }
  appendFileSync(fd, `pid ${process.pid}, started ${new Date().toISOString()}\n`);
  closeSync(fd);
  process.on("exit", () => {
    try { unlinkSync(lockPath); } catch { /* already gone */ }
  });
}

/**
 * Whether a batch whose worst case is `worstUsd` may be sent. `planDone` is the share of the
 * approved run plan already complete, 0 to 1. Returns a reason to stop, or null to proceed.
 */
export function refusal(ledger: Ledger, worstUsd: number, planDone: number, limits: Limits = DEFAULT_LIMITS): string | null {
  const now = spent(ledger);
  if (now + worstUsd > limits.hardCapUsd) {
    return `spent $${now.toFixed(2)}; this batch could cost up to $${worstUsd.toFixed(2)}, which would cross the $${limits.hardCapUsd} cap`;
  }
  if (now >= limits.askAtUsd && planDone < 0.5) {
    return `spent $${now.toFixed(2)} with the run plan ${(planDone * 100).toFixed(0)}% done: stop and ask the orchestrator`;
  }
  return null;
}
