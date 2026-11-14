// Settings' Devices rows (account settings handoff R1, call 3; G4), from Clerk's `user.getSessions()`. Pure and
// client-safe: the section reads the sessions after paint and draws what this returns.

import { accountCopy } from "../copy/account";

const c = accountCopy.devices;

export type DeviceKind = "phone" | "tablet" | "desktop";

export type DeviceRow = {
  id: string;
  browser: string;
  device: string;
  kind: DeviceKind;
  /** "Oakland, US", the country alone, or null when Clerk knows neither. */
  place: string | null;
  /** How long since this session was last active ("2 days ago"), or null for active now. */
  ago: string | null;
  current: boolean;
};

/** The parts of Clerk's `SessionWithActivitiesResource` the rows read. */
export type SessionLike = {
  id: string;
  status: string;
  lastActiveAt: Date;
  latestActivity?: { browserName?: string; deviceType?: string; city?: string; country?: string; isMobile?: boolean } | null;
};

/** Inside this, a session reads "Active now". */
export const ACTIVE_NOW_MS = 5 * 60_000;

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** "5 minutes ago", "2 days ago", "3 weeks ago": whole units, rounded down, never "0". Null inside `ACTIVE_NOW_MS`. */
export function deviceAgo(nowMs: number, thenMs: number): string | null {
  const age = nowMs - thenMs;
  if (age < ACTIVE_NOW_MS) return null;
  const [n, unit] =
    age < HOUR ? [age / MIN, "minute"] : age < DAY ? [age / HOUR, "hour"] : age < WEEK ? [age / DAY, "day"]
      : age < MONTH ? [age / WEEK, "week"] : age < YEAR ? [age / MONTH, "month"] : [age / YEAR, "year"];
  const whole = Math.max(1, Math.floor(n));
  return `${whole} ${unit}${whole === 1 ? "" : "s"} ago`;
}

/** Clerk's device names as a reader says them: "Macintosh" is a Mac. */
function deviceName(type: string | undefined, mobile: boolean): string {
  const t = type?.trim() ?? "";
  if (/^macintosh$/i.test(t)) return "Mac";
  if (t) return t;
  return mobile ? c.unknownPhone : c.unknownComputer;
}

function kindOf(type: string | undefined, mobile: boolean): DeviceKind {
  if (type && /ipad|tablet/i.test(type)) return "tablet";
  return mobile ? "phone" : "desktop";
}

/**
 * The active sessions as rows: this device first, then the most recently active. A session that is not active (ended,
 * revoked, expired) is not a device anyone is signed in on, so it is left out.
 */
export function deviceRows(sessions: readonly SessionLike[], currentId: string | null, nowMs: number): DeviceRow[] {
  return sessions
    .filter((s) => s.status === "active")
    .map((s) => {
      const a = s.latestActivity ?? {};
      const mobile = Boolean(a.isMobile);
      const place = [a.city, a.country].map((p) => p?.trim()).filter(Boolean).join(", ");
      const current = s.id === currentId;
      return {
        id: s.id,
        browser: a.browserName?.trim() || c.unknownBrowser,
        device: deviceName(a.deviceType, mobile),
        kind: kindOf(a.deviceType, mobile),
        place: place || null,
        ago: current ? null : deviceAgo(nowMs, s.lastActiveAt.getTime()),
        current,
        at: s.lastActiveAt.getTime(),
      };
    })
    .sort((x, y) => Number(y.current) - Number(x.current) || y.at - x.at)
    .map(({ at: _at, ...row }) => row);
}
