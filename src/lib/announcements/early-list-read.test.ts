import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { assembleEarlyList, commanderPrintingsQuery, earlyListRowQuery, isBasicName, pickReleasePrecon, releaseCandidatesQuery } from "./early-list-read";
import type { EarlyCardFacts } from "./early-list";

describe("releaseCandidatesQuery", () => {
  it("aliases and qualifies its correlated subquery (AGENTS.md), and reads the precon's first-seen stamp", () => {
    const { sql, params } = releaseCandidatesQuery("cmd-1", db).toSQL();
    // An unqualified `file_name = file_name` would compare the subquery's row with itself: always true, any precon.
    expect(sql).toContain('exists (select 1 from "precon_cards" pc where pc.file_name = "precons".file_name and pc.is_commander and pc.oracle_id = $');
    expect(sql).toContain('left join "catalog_first_seen" on ("catalog_first_seen"."kind" = $');
    expect(sql).toContain('"catalog_first_seen"."key" = "precons"."file_name"');
    expect(sql).toContain('"precons"."twin_of" is null');
    // No set filter: a release list in any set, of any type or release date, is a candidate.
    expect(sql).not.toContain('"sets"');
    expect(params).toEqual(["precon", "cmd-1"]);
  });
});

describe("pickReleasePrecon", () => {
  const posted = new Date("2026-10-29T16:00:00Z");
  const c = (fileName: string, setCode: string, firstSeenAt: string | null, baseline: boolean | null = firstSeenAt ? false : null) =>
    ({ fileName, setCode, firstSeenAt: firstSeenAt ? new Date(firstSeenAt) : null, baseline });

  it("matches a new deck in a long-running set by its first-seen stamp, whatever the set's release date (SLD)", () => {
    // The post's lists resolve to no set (SLD released in 2019, outside the window), and the redirect still finds it.
    expect(pickReleasePrecon([c("OddsAndEnds_SLD", "SLD", "2026-11-02T08:00:00Z")], posted, null)).toBe("OddsAndEnds_SLD");
  });

  it("never matches an older precon with the same commander, stamped before the post", () => {
    expect(pickReleasePrecon([c("Angels_C23", "C23", "2025-03-01T00:00:00Z")], posted, null)).toBeNull();
    // Not even in the resolved set: a stamped precon from before the post is never the release list.
    expect(pickReleasePrecon([c("Angels_FDC_old", "FDC", "2025-03-01T00:00:00Z")], posted, "fdc")).toBeNull();
  });

  it("takes the new one when an older precon shares the commander", () => {
    const both = [c("Angels_C23", "C23", "2025-03-01T00:00:00Z"), c("Angels_FDC", "FDC", "2026-11-12T00:00:00Z")];
    expect(pickReleasePrecon(both, posted, "fdc")).toBe("Angels_FDC");
  });

  it("allows a few days of skew before the post", () => {
    expect(pickReleasePrecon([c("A", "FDC", "2026-10-27T00:00:00Z")], posted, null)).toBe("A");
    expect(pickReleasePrecon([c("A", "FDC", "2026-10-25T00:00:00Z")], posted, null)).toBeNull();
  });

  it("falls back to the resolved set for a precon with no usable stamp", () => {
    expect(pickReleasePrecon([c("A_CMM", "CMM", null)], posted, "cmm")).toBe("A_CMM");
    expect(pickReleasePrecon([c("A_CMM", "CMM", "2020-01-01T00:00:00Z", true)], posted, "cmm")).toBe("A_CMM");
    expect(pickReleasePrecon([c("A_CMM", "CMM", null)], posted, "fdc")).toBeNull();
    expect(pickReleasePrecon([c("A_CMM", "CMM", null)], posted, null)).toBeNull();
  });

  it("prefers the resolved set's release over a later product elsewhere sharing the commander", () => {
    const resolved = c("Angels_FDC", "FDC", "2020-01-01T00:00:00Z", true);
    const later = c("Angels_SLD", "SLD", "2026-12-01T00:00:00Z");
    expect(pickReleasePrecon([later, resolved], posted, "fdc")).toBe("Angels_FDC");
    // With no release in the resolved set yet, the later stamped product is the only match.
    expect(pickReleasePrecon([later], posted, "fdc")).toBe("Angels_SLD");
  });
});

describe("earlyListRowQuery", () => {
  it("reads one list by its post's Contentful id and its position", () => {
    const { sql, params } = earlyListRowQuery("abc", 2, db).toSQL();
    expect(sql).toContain('inner join "wizards_announcements" on "wizards_announcements"."id" = "wizards_announcement_decklists"."announcement_id"');
    expect(params).toEqual(["abc", 2, "commander-decklists"]);
  });

  it("opens only a Commander decklists post's lists that declare a commander, by its stored name", () => {
    const { sql } = earlyListRowQuery("abc", 2, db).toSQL();
    // A Welcome Deck (40 cards, no commander) or any other kind of post is not an early precon: notFound.
    expect(sql).toContain('"wizards_announcements"."kind" = $');
    expect(sql).toContain('"wizards_announcement_decklists"."commander_name" is not null');
    expect(sql).not.toContain('"commander_card_id" is not null');
  });
});

describe("commanderPrintingsQuery", () => {
  it("reads only paper Commander sets in the window around the post's day", () => {
    const { sql, params } = commanderPrintingsQuery(["a"], new Date("2026-10-29T15:00:00Z"), db).toSQL();
    expect(sql).toContain('"sets"."set_type" = $');
    expect(sql).toContain('"sets"."digital" = $');
    expect(params).toEqual(expect.arrayContaining(["commander", false, "2026-08-30", "2027-04-27"]));
  });

  it("also takes any set that holds precons, whatever its type (Commander Masters is CMM, a masters set)", () => {
    const { sql } = commanderPrintingsQuery(["a"], new Date("2026-10-29T15:00:00Z"), db).toSQL();
    expect(sql).toMatch(/\("sets"\."set_type" = \$\d+ or exists \(select 1 from "precons" p where lower\(p\.set_code\) = "sets"\.code\)\)/);
  });
});

describe("isBasicName", () => {
  it.each(["Plains", "island", "Snow-Covered Forest", "Wastes", "Snow-Covered Wastes"])("knows %j", (name) => expect(isBasicName(name)).toBe(true));
  it.each(["Plains Walker", "Sol Ring", "Snow-Covered Sol Ring"])("refuses %j", (name) => expect(isBasicName(name)).toBe(false));
});

describe("assembleEarlyList", () => {
  const facts = (oracleId: string, name: string, typeLine = "Creature — Angel"): EarlyCardFacts => ({
    oracleId, name, typeLine, manaCost: "{W}", layout: "normal", colorIdentity: ["W"], imageUri: `img:${oracleId}`, legal: true,
  });
  const base = {
    contentfulId: "post1",
    position: 0,
    list: {
      postTitle: "Foundations Commander decklists",
      url: "https://magic.wizards.com/en/news/announcements/x",
      publishedAt: "2026-10-29T16:00:00.000Z",
      title: "Calling All Angels",
      commanderCardId: "giada",
      commanderName: "Giada, Font of Hope",
      partnerCardId: null,
      partnerName: null,
      partnerRole: null,
      cards: [
        { name: "Giada, Font of Hope", count: 1, cardId: "giada" },
        { name: "Sol Ring", count: 1, cardId: "sol" },
        { name: "Plains", count: 10, cardId: "plains" },
        { name: "Seraph of the Dawnfire", count: 1, cardId: null },
        { name: "Choir of the First Light", count: 1, cardId: null },
      ],
    },
    facts: new Map([
      ["giada", facts("giada", "Giada, Font of Hope", "Legendary Creature — Angel")],
      ["sol", facts("sol", "Sol Ring", "Artifact")],
      ["plains", facts("plains", "Plains", "Basic Land — Plains")],
    ]),
    owned: new Set(["sol", "plains"]),
    hasCollection: true,
    set: { code: "fdc", name: "Foundations Commander", releaseDate: "2026-11-13" },
    today: "2026-10-30",
  };

  it("counts unmatched lines toward M and never toward owned (G3)", () => {
    const page = assembleEarlyList(base);
    // Giada and Sol Ring (the basic is not counted), plus the two unmatched names.
    expect(page.precon.row.of).toBe(4);
    expect(page.precon.row.owned).toBe(1);
    expect(page.precon.row.unmapped).toBe(2);
    expect(page.unmatched).toEqual([{ name: "Seraph of the Dawnfire", count: 1 }, { name: "Choir of the First Light", count: 1 }]);
  });

  it("names the list, its commander and its set, with no printing on any card", () => {
    const page = assembleEarlyList(base);
    expect(page.precon.row.name).toBe("Calling All Angels");
    expect(page.precon.row.commanders.map((c) => c.name)).toEqual(["Giada, Font of Hope"]);
    expect(page.precon.row.setCode).toBe("FDC");
    expect(page.precon.setName).toBe("Foundations Commander");
    expect(page.precon.cards.every((c) => c.printing === null)).toBe(true);
    expect(page.precon.cards.find((c) => c.oracleId === "sol")?.owned).toBe(true);
  });

  it("counts M in distinct non-basic names and unmapped in copies, as the precon page does", () => {
    const page = assembleEarlyList({
      ...base,
      list: {
        ...base.list,
        cards: [
          ...base.list.cards,
          // An "any number" card the catalog cannot match: one card toward M, 7 copies toward unmapped.
          { name: "Seraph Swarm", count: 7, cardId: null },
          // An unmatched basic: listed, never counted toward M (as a matched basic is not), its copies still unmapped.
          { name: "Snow-Covered Plains", count: 3, cardId: null },
        ],
      },
    });
    // Giada and Sol Ring, plus Seraph of the Dawnfire, Choir of the First Light and Seraph Swarm.
    expect(page.precon.row.of).toBe(5);
    expect(page.precon.row.owned).toBe(1);
    // 1 + 1 + 7 + 3 copies.
    expect(page.precon.row.unmapped).toBe(12);
    expect(page.unmatched.map((u) => u.name)).toEqual([
      "Seraph of the Dawnfire", "Choir of the First Light", "Seraph Swarm", "Snow-Covered Plains",
    ]);
  });

  it("keeps a commander the catalog cannot match yet in the head, by its stored name, with no art (pre-catalog)", () => {
    const page = assembleEarlyList({
      ...base,
      list: {
        ...base.list,
        commanderCardId: null,
        commanderName: "Tana, the Bloodsower",
        partnerCardId: null,
        partnerName: "Tymna the Weaver",
        partnerRole: "co-commander",
        cards: [
          { name: "Tana, the Bloodsower", count: 1, cardId: null },
          { name: "Tymna the Weaver", count: 1, cardId: null },
          { name: "Sol Ring", count: 1, cardId: "sol" },
        ],
      },
    });
    expect(page.precon.row.commanders).toEqual([
      { oracleId: "unmatched:Tana, the Bloodsower", name: "Tana, the Bloodsower", imageUri: null, colorIdentity: [] },
      { oracleId: "unmatched:Tymna the Weaver", name: "Tymna the Weaver", imageUri: null, colorIdentity: [] },
    ]);
    expect(page.unknownCommanders).toEqual(["unmatched:Tana, the Bloodsower", "unmatched:Tymna the Weaver"]);
    expect(page.precon.cards.some((c) => c.isCommander)).toBe(false);
  });

  it("names nothing extra when the commander matched", () => {
    const page = assembleEarlyList(base);
    expect(page.unknownCommanders).toEqual([]);
    expect(page.precon.row.commanders.map((c) => c.oracleId)).toEqual(["giada"]);
  });

  it("makes a co-commander a commander, and leaves an alternate in the list", () => {
    const pair = { ...base, list: { ...base.list, partnerCardId: "sol", partnerRole: "co-commander" } };
    expect(assembleEarlyList(pair).precon.cards.filter((c) => c.isCommander).map((c) => c.oracleId)).toEqual(["giada", "sol"]);
    const alt = { ...base, list: { ...base.list, partnerCardId: "sol", partnerRole: "alternate" } };
    expect(assembleEarlyList(alt).precon.cards.filter((c) => c.isCommander).map((c) => c.oracleId)).toEqual(["giada"]);
  });

  it("says released only once the set's day has come (STATES 3.5)", () => {
    expect(assembleEarlyList(base).releasedOn).toBeNull();
    expect(assembleEarlyList({ ...base, today: "2026-11-13" }).releasedOn).toBe("2026-11-13");
  });

  it("draws a post whose set did not resolve with no set and no date", () => {
    const page = assembleEarlyList({ ...base, set: null });
    expect(page.precon.row.setCode).toBe("");
    expect(page.precon.row.releaseDate).toBe("");
    expect(page.releasedOn).toBeNull();
  });
});
