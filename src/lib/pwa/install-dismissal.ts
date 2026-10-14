// When the install slot stays away (Concert Crawl's `install-dismissal.ts`): quiet for 30 days after
// the first dismiss, and gone for good after the second. Through `local-store`, which already keeps a
// refused write for the session and never throws.
import { readRaw, writeRaw } from "../../components/ui/local-store";

export const DISMISSAL_KEY = "the99-install-dismissal";
const QUIET_MS = 30 * 24 * 60 * 60 * 1000;

type DismissalRecord = { count: number; firstDismissedAt: string };

function isRecord(value: unknown): value is DismissalRecord {
  if (typeof value !== "object" || value === null) return false;
  if (!("count" in value) || !("firstDismissedAt" in value)) return false;
  const { count, firstDismissedAt } = value;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 0 || count > 2) return false;
  return typeof firstDismissedAt === "string" && !Number.isNaN(new Date(firstDismissedAt).getTime());
}

function readRecord(): DismissalRecord | null {
  const raw = readRaw(DISMISSAL_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export type DismissalState = "active" | "quiet" | "retired";

export function dismissalState(now: Date = new Date()): DismissalState {
  const record = readRecord();
  if (!record || record.count === 0) return "active";
  if (record.count >= 2) return "retired";
  return now.getTime() - new Date(record.firstDismissedAt).getTime() < QUIET_MS ? "quiet" : "active";
}

/** Records one dismiss. The count stops at 2, which a later read takes as retired. */
export function dismissOnce(now: Date = new Date()): void {
  const existing = readRecord();
  const next: DismissalRecord = existing
    ? { count: Math.min(existing.count + 1, 2), firstDismissedAt: existing.firstDismissedAt }
    : { count: 1, firstDismissedAt: now.toISOString() };
  writeRaw(DISMISSAL_KEY, JSON.stringify(next));
}
