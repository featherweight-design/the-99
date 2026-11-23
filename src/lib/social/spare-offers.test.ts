import { PgDialect } from "drizzle-orm/pg-core";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { spareRequests } from "../../db/schema";
import { answerOfferQuery, offerCopies, offererQuery, withdrawOfferQuery } from "./spare-offers";
import {
  answerAskerQuery, answerQuery, clearQuery, incomingAsksQuery, myAsksQuery, waitingAsksCountQuery, withdrawQuery,
  unseenAnswersCountQuery, markAnswerSeenQuery,
} from "./spare-requests";

const NOW = new Date("2026-11-22T12:00:00Z");
const ID = "44444444-4444-4444-8444-444444444444";
const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => new PgDialect().sqlToQuery(q).sql;

describe("offerCopies", () => {
  it("is min(spare, still wanted), at least 1", () => {
    expect(offerCopies(3, 2)).toBe(2);
    expect(offerCopies(1, 4)).toBe(1);
    expect(offerCopies(5, 0)).toBe(1);
  });
});

describe("the offer statements", () => {
  it("name the holder-initiated direction and qualify their aliases", () => {
    for (const q of [withdrawOfferQuery("o", ID, NOW), offererQuery("w", ID), answerOfferQuery("w", ID, "yes", NOW)]) {
      expect(render(q)).toContain("initiated_by = 'holder'");
    }
    expect(render(withdrawOfferQuery("o", ID, NOW))).toContain("wor.holder_user_id = $");
    expect(render(answerOfferQuery("w", ID, "no", NOW))).toContain("aor.asker_user_id = $");
  });
});

describe("every ask statement leaves offers alone", () => {
  it("filters initiated_by = 'asker'", () => {
    const asks = [
      answerAskerQuery("h", ID), answerQuery("h", ID, "yes", NOW), incomingAsksQuery("h", NOW), waitingAsksCountQuery("h", NOW),
      myAsksQuery("a", NOW), withdrawQuery("a", ID, NOW), clearQuery("a", ID, NOW), unseenAnswersCountQuery("a", NOW),
      markAnswerSeenQuery("a", ID, NOW),
    ];
    for (const q of asks) expect(render(q)).toContain("initiated_by = 'asker'");
  });
});

describe("E1: the one-open index spans both directions", () => {
  it("stays (asker, card) where open, so an offer collides with the wanter's own ask", () => {
    const idx = getTableConfig(spareRequests).indexes.find((i) => i.config.name === "spare_requests_one_open");
    expect(idx?.config.unique).toBe(true);
    expect(idx?.config.columns.map((c) => ("name" in c ? c.name : ""))).toEqual(["asker_user_id", "oracle_id"]);
    expect(idx?.config.where).toBeDefined();
  });
});
