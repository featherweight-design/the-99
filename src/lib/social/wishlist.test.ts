import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { friendsWantedPairsQuery, friendWantedGapQuery, friendWishlistQuery } from "./wishlist";

const render = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => new PgDialect().sqlToQuery(q);
const flat = (s: string) => s.replace(/\s+/g, " ");
const FRIEND = "00000000-0000-0000-0000-000000000001";
const CARD = "00000000-0000-0000-0000-0000000000aa";

const reads = {
  friendWishlistQuery: render(friendWishlistQuery("viewer", FRIEND)),
  friendWantedGapQuery: render(friendWantedGapQuery("viewer", FRIEND, [CARD])),
  friendsWantedPairsQuery: render(friendsWantedPairsQuery("viewer")),
};

describe.each(Object.entries(reads))("%s", (_, { sql, params }) => {
  const q = flat(sql);

  it("reads both sides only for owners the viewer's own friendship rows grant, in the same statement", () => {
    expect(q).toContain(`hw.user_id in (select fl.friend_user_id from "friend_links" fl`);
    expect(q).toContain(`sw.user_id in (select fl.friend_user_id from "friend_links" fl`);
    expect(q).toContain(`where fl.user_id = $`);
    expect(params).toContain("viewer");
  });

  it("counts a synced line's deck only when the friend can see it (H1, friendCanSeeDeck's defaults)", () => {
    expect(q).toContain(`left join "decks" sdk on sdk.id = sd.deck_id and sdk.user_id = sw.user_id`);
    expect(q).toContain(`left join "user_prefs" sup on sup.user_id = sw.user_id`);
    expect(q).toContain(`coalesce(sdk.id is not null and not sdk.hidden_from_friends and coalesce(sup.friends_see_decks, true) and (coalesce(sup.friends_see_unfinished, false) or not sd.unfinished), false)`);
  });

  it("drops a line whose every deck is hidden, and a hidden deck's copies from the want", () => {
    expect(q).toContain(`having bool_or(coalesce(sdk.id is not null`);
    expect(q).toContain(`least(99, sw.held + coalesce(sum(sd.quantity) filter (where coalesce(sdk.id is not null`);
  });

  it("never hands the friend's deck ids on", () => {
    expect(q).toContain(`null::text[] as deck_ids from "wishlist_synced" sw`);
    expect(q).not.toContain(`array_agg(sd.deck_id`);
  });
});

describe("friendWishlistQuery", () => {
  const q = flat(reads.friendWishlistQuery.sql);

  it("narrows to the friend named by public id", () => {
    expect(q).toContain(`fsp.public_id = $`);
    expect(reads.friendWishlistQuery.params).toContain(FRIEND);
  });

  it("returns the card and the wanted count, never an owned count, a gap or a printing", () => {
    expect(q).toMatch(/^select fu\.oracle_id, fu\.quantity, fc\.name, fc\.image_uri, fc\.layout, fc\.back_image_uri from/);
  });

  it("joins the card from the catalog", () => {
    expect(q).toContain(`join "cards" fc on fc.oracle_id = fu.oracle_id`);
  });
});

describe("friendWantedGapQuery", () => {
  it("reads the union's gap for the named cards only, narrowed inside each side", () => {
    const q = flat(reads.friendWantedGapQuery.sql);
    expect(q).toMatch(/^select fg\.oracle_id, fg\.gap::int as gap from/);
    expect(q).toContain(`and hw.oracle_id in ($`);
    expect(q).toContain(`and sw.oracle_id in ($`);
    expect(q).not.toContain(`where fg.oracle_id in`);
    expect(reads.friendWantedGapQuery.params.filter((p) => p === CARD)).toHaveLength(2);
  });
});

describe("friendsWantedPairsQuery", () => {
  it("names a friend and a card only", () => {
    expect(flat(reads.friendsWantedPairsQuery.sql)).toMatch(/^select distinct fsp\.public_id::text as public_id, fp\.oracle_id from/);
  });
});

describe("an empty card list", () => {
  it("narrows each side to nothing rather than rendering an invalid in ()", () => {
    const q = flat(render(friendWantedGapQuery("viewer", FRIEND, [])).sql);
    expect(q.match(/\) and false/g)).toHaveLength(2);
    expect(q).not.toContain(`in ()`);
  });
});
