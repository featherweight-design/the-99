import { describe, expect, it } from "vitest";

import {
  askRefusal, askShown, askerState, capCopies, daysLeft, declineFloor, expiresAt, isAnswer, openFloor, requestState, shownFloor,
  type PriorAsk,
} from "./spare-request-rules";

const NOW = new Date("2026-10-22T12:00:00Z");
const DAY = 86_400_000;
const ago = (days: number, ms = 0) => new Date(NOW.getTime() - days * DAY - ms);

describe("requestState", () => {
  it("an open ask is open until exactly fourteen days, then expired", () => {
    expect(requestState({ status: "open", createdAt: ago(13, 23 * 3_600_000) }, NOW)).toBe("open");
    expect(requestState({ status: "open", createdAt: new Date(ago(14).getTime() + 1) }, NOW)).toBe("open");
    expect(requestState({ status: "open", createdAt: ago(14) }, NOW)).toBe("expired");
    expect(requestState({ status: "open", createdAt: ago(30) }, NOW)).toBe("expired");
  });

  it("an answer never expires, and a stored expiry stays expired", () => {
    expect(requestState({ status: "yes", createdAt: ago(30) }, NOW)).toBe("yes");
    expect(requestState({ status: "no", createdAt: ago(30) }, NOW)).toBe("no");
    expect(requestState({ status: "expired", createdAt: ago(1) }, NOW)).toBe("expired");
  });

  it("the SQL floor is the same boundary: created at the floor has expired", () => {
    expect(openFloor(NOW).getTime()).toBe(ago(14).getTime());
    expect(expiresAt(ago(14)).getTime()).toBe(NOW.getTime());
  });
});

describe("askRefusal", () => {
  const ask = (holderUserId: string, status: PriorAsk["status"], created: number, answered: number | null = null): PriorAsk =>
    ({ holderUserId, status, createdAt: ago(created), answeredAt: answered === null ? null : ago(answered) });

  it("no prior ask: may ask", () => {
    expect(askRefusal([], "h1", NOW)).toBeNull();
  });

  it("one open ask for the card, to ANY friend, refuses the next (one friend per card)", () => {
    expect(askRefusal([ask("h1", "open", 2)], "h1", NOW)).toBe("asked");
    expect(askRefusal([ask("h1", "open", 2)], "h2", NOW)).toBe("asked");
  });

  it("an open ask past its days does not hold the card: ask again, the same friend included", () => {
    expect(askRefusal([ask("h1", "open", 14)], "h1", NOW)).toBeNull();
    expect(askRefusal([ask("h1", "expired", 20)], "h1", NOW)).toBeNull();
  });

  it("after a No, the next friend may be asked at once, that friend not for fourteen days", () => {
    const no = [ask("h1", "no", 3, 2)];
    expect(askRefusal(no, "h2", NOW)).toBeNull();
    expect(askRefusal(no, "h1", NOW)).toBe("declined");
    expect(askRefusal([ask("h1", "no", 20, 14)], "h1", NOW)).toBeNull();
    expect(askRefusal([{ ...ask("h1", "no", 20), answeredAt: new Date(declineFloor(NOW).getTime() + 1) }], "h1", NOW)).toBe("declined");
  });

  it("after a Yes the card is free to ask again", () => {
    expect(askRefusal([ask("h1", "yes", 3, 2)], "h1", NOW)).toBeNull();
  });
});

describe("askShown", () => {
  it("shows an open ask, a recent answer and a recent expiry; drops the rest", () => {
    expect(askShown({ status: "open", createdAt: ago(1), answeredAt: null }, NOW)).toBe(true);
    expect(askShown({ status: "yes", createdAt: ago(20), answeredAt: ago(13) }, NOW)).toBe(true);
    expect(askShown({ status: "no", createdAt: ago(20), answeredAt: ago(14) }, NOW)).toBe(false);
    // Expired 13 days ago (created 27 days ago): still shown. Expired 14 days ago: gone.
    expect(askShown({ status: "open", createdAt: ago(27), answeredAt: null }, NOW)).toBe(true);
    expect(askShown({ status: "expired", createdAt: ago(28), answeredAt: null }, NOW)).toBe(false);
  });

  it("everything shown was created after shownFloor, the bound the read uses", () => {
    expect(shownFloor(NOW).getTime()).toBe(ago(28).getTime());
    expect(askShown({ status: "expired", createdAt: new Date(shownFloor(NOW).getTime() + 1), answeredAt: null }, NOW)).toBe(true);
    expect(askShown({ status: "expired", createdAt: shownFloor(NOW), answeredAt: null }, NOW)).toBe(false);
  });
});

describe("isAnswer", () => {
  it("is Yes or No and nothing else", () => {
    expect(isAnswer("yes")).toBe(true);
    expect(isAnswer("no")).toBe(true);
    for (const v of ["Yes", "maybe", "", null, undefined, 1]) expect(isAnswer(v)).toBe(false);
  });
});

describe("a withdrawn ask (G1)", () => {
  const ask = (over: Partial<PriorAsk>): PriorAsk => ({ holderUserId: "h1", status: "open", createdAt: ago(1), answeredAt: null, ...over });
  it("holds nothing: no open ask, no cooldown, so the card may be asked of anyone at once", () => {
    expect(askRefusal([ask({ status: "withdrawn" })], "h1", NOW)).toBeNull();
    expect(askRefusal([ask({ status: "withdrawn" })], "h2", NOW)).toBeNull();
  });
  it("is never shown to the asker", () => {
    expect(askShown({ status: "withdrawn", createdAt: ago(1), answeredAt: null }, NOW)).toBe(false);
  });
});

describe("a cleared ask (G1)", () => {
  it("leaves the asker's list", () => {
    expect(askShown({ status: "no", createdAt: ago(3), answeredAt: ago(2), askerClearedAt: ago(1) }, NOW)).toBe(false);
    expect(askShown({ status: "no", createdAt: ago(3), answeredAt: ago(2), askerClearedAt: null }, NOW)).toBe(true);
  });
  it("still holds that holder back when it was a No (the row stays; only its display goes)", () => {
    expect(askRefusal([{ holderUserId: "h1", status: "no", createdAt: ago(3), answeredAt: ago(2) }], "h1", NOW)).toBe("declined");
  });
});

describe("askerState (G3)", () => {
  const live = { offered: true, needed: true };
  it("an open ask the holder no longer offers is unavailable; one no longer needed is unneeded; offered first", () => {
    expect(askerState({ status: "open", createdAt: ago(1) }, NOW, live)).toBe("open");
    expect(askerState({ status: "open", createdAt: ago(1) }, NOW, { offered: false, needed: true })).toBe("unavailable");
    expect(askerState({ status: "open", createdAt: ago(1) }, NOW, { offered: true, needed: false })).toBe("unneeded");
    expect(askerState({ status: "open", createdAt: ago(1) }, NOW, { offered: false, needed: false })).toBe("unavailable");
  });
  it("an answer or an expiry reads as itself, whatever the live facts", () => {
    expect(askerState({ status: "yes", createdAt: ago(1) }, NOW, { offered: false, needed: false })).toBe("yes");
    expect(askerState({ status: "no", createdAt: ago(1) }, NOW, { offered: false, needed: false })).toBe("no");
    expect(askerState({ status: "open", createdAt: ago(14) }, NOW, { offered: false, needed: false })).toBe("expired");
  });
});

describe("daysLeft", () => {
  it("counts whole days up to the expiry, 0 after", () => {
    expect(daysLeft(NOW, NOW)).toBe(14);
    expect(daysLeft(ago(13, 1), NOW)).toBe(1);
    expect(daysLeft(ago(14), NOW)).toBe(0);
    expect(daysLeft(ago(20), NOW)).toBe(0);
  });
});

describe("capCopies (G2)", () => {
  it("is a whole number from 1 to the friend's spare count", () => {
    expect(capCopies(2, 3)).toBe(2);
    expect(capCopies(5, 3)).toBe(3);
    expect(capCopies(0, 3)).toBe(1);
    expect(capCopies(-4, 3)).toBe(1);
    expect(capCopies(2.7, 3)).toBe(2);
  });
  it("mends what is not a number to 1, and never exceeds 99", () => {
    expect(capCopies("3", 3)).toBe(1);
    expect(capCopies(undefined, 3)).toBe(1);
    expect(capCopies(Number.NaN, 3)).toBe(1);
    expect(capCopies(500, 500)).toBe(99);
  });
});
