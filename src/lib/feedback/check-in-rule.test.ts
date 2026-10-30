// The check-in's rules (flyer trial PR 6): visit days count once per UTC day, due needs 14 days AND 5 days, Not now
// snoozes three times then the fourth ends it, Send/✕ end it for good, and an answer is validated as the boards allow.
import { describe, expect, it } from "vitest";
import {
  MAX_SNOOZES,
  NOTE_MAX,
  SNOOZE_DAYS,
  countVisit,
  end,
  isDue,
  parseCheckIn,
  snooze,
  utcDay,
  type CheckInState,
} from "./check-in-rule";

const at = (iso: string) => new Date(iso);
const DAY = 86_400_000;
const base = (over: Partial<CheckInState> = {}): CheckInState => ({
  firstSeenAt: at("2026-10-01T10:00:00Z"),
  visitDays: 5,
  lastVisitDay: "2026-10-14",
  snoozes: 0,
  snoozedUntil: null,
  endedAt: null,
  ...over,
});

describe("utcDay", () => {
  it("is the UTC calendar day, not the local one", () => {
    expect(utcDay(at("2026-10-14T23:59:59Z"))).toBe("2026-10-14");
    expect(utcDay(at("2026-10-15T00:00:00Z"))).toBe("2026-10-15");
    expect(utcDay(at("2026-10-14T23:30:00-05:00"))).toBe("2026-10-15");
  });
});

describe("countVisit", () => {
  it("counts a new UTC day once, however many loads it holds", () => {
    const first = countVisit(base({ visitDays: 0, lastVisitDay: null }), at("2026-10-02T08:00:00Z"));
    expect(first.visitDays).toBe(1);
    const again = countVisit(first, at("2026-10-02T22:00:00Z"));
    expect(again).toBe(first);
    expect(countVisit(again, at("2026-10-03T00:00:01Z")).visitDays).toBe(2);
  });

  it("counts nothing once the check-in has ended", () => {
    const ended = base({ endedAt: at("2026-10-10T00:00:00Z") });
    expect(countVisit(ended, at("2026-10-20T00:00:00Z"))).toBe(ended);
  });
});

describe("isDue", () => {
  const now = at("2026-10-15T10:00:00Z");

  it("needs 14 days since the first load AND 5 distinct days", () => {
    expect(isDue(base(), now)).toBe(true);
    expect(isDue(base({ visitDays: 4 }), now)).toBe(false);
    expect(isDue(base(), at("2026-10-15T09:59:59Z"))).toBe(false);
    expect(isDue(base({ firstSeenAt: at("2026-10-02T10:00:00Z") }), now)).toBe(false);
  });

  it("is not due while snoozed, and is again when the snooze lapses", () => {
    const snoozed = base({ snoozes: 1, snoozedUntil: new Date(now.getTime() + DAY) });
    expect(isDue(snoozed, now)).toBe(false);
    expect(isDue(snoozed, new Date(now.getTime() + DAY))).toBe(true);
  });

  it("is never due once ended", () => {
    expect(isDue(base({ endedAt: at("2026-10-15T00:00:00Z") }), now)).toBe(false);
  });
});

describe("snooze and end", () => {
  const now = at("2026-10-15T10:00:00Z");

  it("snoozes three days for each of the first three Not nows", () => {
    let s = base();
    for (let n = 1; n <= MAX_SNOOZES; n++) {
      s = snooze(s, now);
      expect(s.snoozes).toBe(n);
      expect(s.endedAt).toBeNull();
      expect(s.snoozedUntil).toEqual(new Date(now.getTime() + SNOOZE_DAYS * DAY));
    }
  });

  it("ends the check-in on the Not now after the third snooze", () => {
    const s = snooze(base({ snoozes: MAX_SNOOZES }), now);
    expect(s.endedAt).toEqual(now);
    expect(s.snoozedUntil).toBeNull();
    expect(isDue(s, new Date(now.getTime() + 30 * DAY))).toBe(false);
  });

  it("ends for good on Send or the ✕, and keeps the first end time", () => {
    const ended = end(base({ snoozes: 2, snoozedUntil: now }), now);
    expect(ended.endedAt).toEqual(now);
    expect(ended.snoozedUntil).toBeNull();
    expect(end(ended, at("2026-11-01T00:00:00Z"))).toBe(ended);
    expect(snooze(ended, at("2026-11-01T00:00:00Z"))).toBe(ended);
  });
});

describe("parseCheckIn", () => {
  const ok = { rating: 4, uses: ["Shopping", "Decks"], pod: "Maybe", note: "  Love it  " };

  it("keeps a good answer, uses in the boards' order and the note trimmed", () => {
    expect(parseCheckIn(ok)).toEqual({ rating: 4, uses: ["Decks", "Shopping"], pod: "Maybe", note: "Love it" });
  });

  it("takes the optional answers as nothing", () => {
    expect(parseCheckIn({ rating: 1, uses: [], pod: null, note: null })).toEqual({ rating: 1, uses: [], pod: null, note: null });
    expect(parseCheckIn({ ...ok, note: "   " })?.note).toBeNull();
  });

  it("folds a repeated use", () => {
    expect(parseCheckIn({ ...ok, uses: ["Decks", "Decks"] })?.uses).toEqual(["Decks"]);
  });

  it("refuses a rating that is not a whole 1 to 5", () => {
    for (const rating of [0, 6, 2.5, "3", null, undefined, NaN]) expect(parseCheckIn({ ...ok, rating })).toBeNull();
  });

  it("refuses a use or a pod answer outside the lists", () => {
    expect(parseCheckIn({ ...ok, uses: ["Decks", "Admin"] })).toBeNull();
    expect(parseCheckIn({ ...ok, uses: "Decks" })).toBeNull();
    expect(parseCheckIn({ ...ok, pod: "No" })).toBeNull();
    expect(parseCheckIn({ ...ok, pod: undefined })).toBeNull();
  });

  it("refuses a note over the cap once trimmed, or one that is not a string", () => {
    expect(parseCheckIn({ ...ok, note: "x".repeat(NOTE_MAX) })).not.toBeNull();
    expect(parseCheckIn({ ...ok, note: "x".repeat(NOTE_MAX + 1) })).toBeNull();
    expect(parseCheckIn({ ...ok, note: ` ${"x".repeat(NOTE_MAX)} ` })).not.toBeNull();
    expect(parseCheckIn({ ...ok, note: 7 })).toBeNull();
  });
});
