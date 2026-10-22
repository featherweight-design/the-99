import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: { execute: vi.fn(), transaction: vi.fn(), select: vi.fn() } }));

import {
  answerQuery, answerSpareRequest, askForSpare, expireStaleQuery, incomingAsksQuery, loadIncomingAsks, loadMyAsks,
  lockFriendshipQuery, myAsksQuery,
} from "./spare-requests";
import { openFloor, shownFloor } from "./spare-request-rules";

const NOW = new Date("2026-10-22T12:00:00Z");
const CARD = "0b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const REQ = "1b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const ON = { SPARE_REQUESTS_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const render = (q: SQL) => {
  const { sql, params } = new PgDialect().sqlToQuery(q);
  return { q: sql.replace(/\s+/g, " "), params };
};

describe("the switch", () => {
  it("off, or on without friends, nothing is read or written", async () => {
    const { db } = await import("../../db");
    for (const env of [{}, { SPARE_REQUESTS_ENABLED: "true" }, { SOCIAL_FRIENDS_ENABLED: "true" }] as unknown as NodeJS.ProcessEnv[]) {
      expect(await askForSpare("a", REQ, CARD, env, NOW)).toEqual({ ok: false, reason: "off" });
      expect(await answerSpareRequest("h", REQ, "yes", env, NOW)).toEqual({ ok: false, reason: "off" });
      expect(await loadIncomingAsks("h", env, NOW)).toEqual([]);
      expect(await loadMyAsks("a", env, NOW)).toEqual([]);
    }
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("a malformed request id or answer changes nothing", async () => {
    const { db } = await import("../../db");
    expect(await answerSpareRequest("h", "nope", "yes", ON, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(await answerSpareRequest("h", REQ, "maybe", ON, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(db.execute).not.toHaveBeenCalled();
  });
});

describe("lockFriendshipQuery", () => {
  const { q } = render(lockFriendshipQuery("a", "b"));
  it("locks both directed rows for share, in the purge's (user_id, friend_user_id) order", () => {
    expect(q).toMatch(/\(sfl\.user_id = \$1 and sfl\.friend_user_id = \$2\) or \(sfl\.user_id = \$3 and sfl\.friend_user_id = \$4\)/);
    expect(q).toMatch(/order by sfl\.user_id, sfl\.friend_user_id for share$/);
  });
});

describe("expireStaleQuery", () => {
  const { q, params } = render(expireStaleQuery("a", CARD, NOW));
  it("writes expired over the asker's open asks for the card at or before the floor, nothing else", () => {
    expect(q).toMatch(/update "spare_requests" xsr set status = 'expired' where xsr\.asker_user_id = \$1 and xsr\.oracle_id = \$2 and xsr\.status = 'open' and \(xsr\.created_at <= \$3::timestamptz/);
  });
  it("... and over one to someone no longer a friend, read on the row's own two ids", () => {
    expect(q).toMatch(/or not exists \(select 1 from "friend_links" xfl where xfl\.user_id = xsr\.asker_user_id and xfl\.friend_user_id = xsr\.holder_user_id\)\)$/);
    expect(params).toEqual(["a", CARD, openFloor(NOW).toISOString()]);
  });
});

describe("answerQuery", () => {
  const { q, params } = render(answerQuery("h", REQ, "no", NOW));
  it("answers only the holder's own open, unexpired ask", () => {
    expect(q).toMatch(/where asr\.id = \$3 and asr\.holder_user_id = \$4 and asr\.status = 'open' and asr\.created_at > \$5::timestamptz/);
    expect(params.slice(0, 5)).toEqual(["no", NOW.toISOString(), REQ, "h", openFloor(NOW).toISOString()]);
  });
  it("only while the holder still holds the friendship, read on the row's own two ids", () => {
    expect(q).toMatch(/exists \(select 1 from "friend_links" afl where afl\.user_id = asr\.holder_user_id and afl\.friend_user_id = asr\.asker_user_id for share\)/);
    expect(q).toMatch(/returning asr\.id$/);
  });
});

describe("incomingAsksQuery", () => {
  const { q, params } = render(incomingAsksQuery("h", NOW));
  it("the holder's open, unexpired asks, joined to the live friendship, never a Clerk id out", () => {
    expect(q).toMatch(/join "friend_links" ifl on ifl\.user_id = isr\.holder_user_id and ifl\.friend_user_id = isr\.asker_user_id/);
    expect(q).toMatch(/where isr\.holder_user_id = \$1 and isr\.status = 'open' and isr\.created_at > \$2::timestamptz/);
    expect(q).toMatch(/^select isr\.id, isr\.oracle_id, isr\.created_at, isp\.public_id::text as public_id, isp\.display_name from/);
    expect(params).toEqual(["h", openFloor(NOW).toISOString()]);
  });
});

describe("myAsksQuery", () => {
  const { q, params } = render(myAsksQuery("a", NOW));
  it("the asker's asks to current friends since the shown floor, naming the holder by public id", () => {
    expect(q).toMatch(/join "friend_links" mfl on mfl\.user_id = msr\.asker_user_id and mfl\.friend_user_id = msr\.holder_user_id/);
    expect(q).toMatch(/where msr\.asker_user_id = \$1 and msr\.created_at > \$2::timestamptz/);
    expect(q).not.toMatch(/asker_user_id,|holder_user_id,|holder_user_id as/);
    expect(params).toEqual(["a", shownFloor(NOW).toISOString()]);
  });
});

describe("loadMyAsks", () => {
  it("derives each ask's state and drops what the list no longer shows", async () => {
    const { db } = await import("../../db");
    vi.mocked(db.execute).mockResolvedValueOnce({
      rows: [
        { id: "r1", oracle_id: CARD, status: "open", created_at: "2026-10-20T12:00:00Z", answered_at: null, public_id: "p1", display_name: "Fay" },
        { id: "r2", oracle_id: CARD, status: "open", created_at: "2026-10-01T12:00:00Z", answered_at: null, public_id: "p1", display_name: "Fay" },
        { id: "r3", oracle_id: CARD, status: "no", created_at: "2026-09-26T12:00:00Z", answered_at: "2026-10-01T12:00:00Z", public_id: "p2", display_name: "Gus" },
      ],
    } as never);
    const asks = await loadMyAsks("a", ON, NOW);
    expect(asks.map((x) => [x.id, x.state])).toEqual([["r1", "open"], ["r2", "expired"]]);
    expect(asks[0].holder).toEqual({ publicId: "p1", displayName: "Fay" });
  });
});
