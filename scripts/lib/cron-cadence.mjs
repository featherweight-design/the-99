// A cron that fires too often keeps the Neon computes awake (they suspend after five idle minutes) and bills a
// Vercel invocation each time; the 5-minute account sweep cost about $30 to $80 a month that way (cost audit
// 2026-10-23). This is the rule `cron-cadence.test.mts` holds `vercel.json` to.

/** No cron may run more often than this, in minutes, unless it is allowlisted with a reason. */
export const MIN_GAP_MINUTES = 15;

/** Crons allowed to run faster than MIN_GAP_MINUTES. By path. Each needs a reason a reader can weigh. */
export const ALLOWLIST = [];

const RANGES = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];

/** One cron field to the set of values it matches. Supports a bare star, a value, a range, a step over either, and comma lists. */
export function expandField(field, [lo, hi]) {
  const out = new Set();
  for (const part of field.split(",")) {
    const m = /^(\*|(\d+)(?:-(\d+))?)(?:\/(\d+))?$/.exec(part);
    if (!m) throw new Error(`unreadable cron field "${field}"`);
    const step = m[4] ? Number(m[4]) : 1;
    if (step < 1) throw new Error(`unreadable cron field "${field}"`);
    const from = m[1] === "*" ? lo : Number(m[2]);
    const to = m[1] === "*" ? hi : m[3] !== undefined ? Number(m[3]) : m[4] ? hi : from;
    if (from < lo || to > hi || from > to) throw new Error(`cron field "${field}" is out of range`);
    for (let v = from; v <= to; v += step) out.add(v);
  }
  return out;
}

/**
 * The shortest gap, in minutes, between two consecutive firings of a 5-field cron. Walks a full 400-year Gregorian
 * cycle of UTC days (146,097, after which every weekday and date alignment repeats), so a month, day-of-month and
 * day-of-week combination that only lines up in some years or on a leap day is still seen. Within a matching day the
 * firings are the cross of the minute and hour sets; between matching days the gap runs from the last firing of one
 * to the first of the next. Day-of-month and day-of-week both restricted fire on either, as in standard cron.
 * Returns Infinity for a cron that fires at most once a cycle.
 */
export function minGapMinutes(expr) {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) throw new Error(`"${expr}" is not a 5-field cron`);
  const [min, hour, dom, mon, dow] = f.map((x, i) => expandField(x, RANGES[i]));
  if (dow.has(7)) dow.add(0);
  const domStar = f[2] === "*", dowStar = f[4] === "*";
  const times = [...hour].sort((a, b) => a - b).flatMap((h) => [...min].sort((a, b) => a - b).map((m) => h * 60 + m));
  let best = Infinity;
  for (let i = 1; i < times.length; i++) best = Math.min(best, times[i] - times[i - 1]);
  const start = Date.UTC(2024, 0, 1);
  let prevDay = null;
  for (let day = 0; day < 146097; day++) {
    const d = new Date(start + day * 86_400_000);
    if (!mon.has(d.getUTCMonth() + 1)) continue;
    const ok = domStar && dowStar ? true
      : domStar ? dow.has(d.getUTCDay())
      : dowStar ? dom.has(d.getUTCDate())
      : dom.has(d.getUTCDate()) || dow.has(d.getUTCDay());
    if (!ok) continue;
    if (prevDay !== null) best = Math.min(best, (day - prevDay) * 1440 + times[0] - times[times.length - 1]);
    prevDay = day;
  }
  return best;
}

/** The crons in a parsed vercel.json running faster than the floor and not allowlisted. */
export function tooFrequent(config, allow = ALLOWLIST) {
  const allowed = new Set(allow.map((a) => a.path));
  return (config.crons ?? [])
    .map((c) => ({ path: c.path, schedule: c.schedule, gap: minGapMinutes(c.schedule) }))
    .filter((c) => c.gap < MIN_GAP_MINUTES && !allowed.has(c.path));
}
