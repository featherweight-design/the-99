import { describe, expect, it } from "vitest";

import { collapse, messagesFor, toMessage, type PushItem } from "./message";
import { feedCopy } from "../copy/feed";
import { pushCopy } from "../copy/push";

const set = (key: string, name: string, batch = "run-1"): PushItem => ({ kind: "new-set", key, batch, name, cards: 281, href: `/collection/sets/${key}` });
const precon = (key: string, name: string, batch = "run-1"): PushItem => ({ kind: "new-precon", key, batch, name, owned: 31, of: 100, href: `/decks/precons/${key}` });
const drop = (key: string, card: string, batch = "run-1"): PushItem => ({ kind: "price-drop", key, batch, oracleId: `o-${key}`, card, wasCents: 840, nowCents: 510, image: `img-${key}` });
const match = (key: string, friend: string, publicId: string, card = "Ghoulcaller Gisa", batch = "w-1"): PushItem => ({ kind: "trade-match", key, batch, friend, publicId, oracleId: `o-${key}`, card, image: `img-${key}`, askable: false });
const ask = (key: string, friend = "Peter"): PushItem => ({ kind: "spare-request", key, batch: key, friend, card: "Lathliss, Dragon Queen", image: null });
const answer = (key: string, friend: string, said: "yes" | "no"): PushItem => ({ kind: "spare-request", key, batch: key, friend, card: "Lathliss, Dragon Queen", image: null, answer: said });
const post = (key: string, title: string, kind: "secret-lair" | "commander-decklists" | "wizards-news" = "secret-lair", over: Partial<{ excerpt: string | null; image: string | null }> = {}): PushItem =>
  ({ kind, key: `post:${key}`, batch: `${kind}:2026-10-29`, title, excerpt: "A drop of five.", image: "https://images.ctfassets.net/h.jpg", href: `/out/wizards/${key}`, ...over });
const combo = (key: string, batch = "u-1"): PushItem => ({ kind: "combo", key, batch, oracleId: `o-${key}`, variantId: "1-2", a: "Thassa's Oracle", b: "Demonic Consultation", added: "Demonic Consultation", image: `img-${key}` });

describe("one item of each kind (the handoff's table)", () => {
  it("tells an offer and its answer in their own words, never as an ask", () => {
    const card = "Lathliss, Dragon Queen";
    const offer = (key: string, friend: string, said?: "yes" | "no"): PushItem => ({ kind: "spare-request", key, batch: key, friend, card, image: null, offer: true, ...(said ? { answer: said } : {}) });
    expect(toMessage([offer("o1", "Max")])).toMatchObject({ title: "Max is offering you Lathliss, Dragon Queen", body: pushCopy.one.spareOffer.body, route: "/friends", tag: "spare-request:o1" });
    expect(toMessage([offer("o2", "Colin", "yes")])).toMatchObject({ title: "Colin said yes to Lathliss, Dragon Queen" });
    expect(toMessage([offer("o3", "Chris", "no")])).toMatchObject({ title: "Chris passed on Lathliss, Dragon Queen" });
  });

  it("new set: the set's page", () => {
    const m = toMessage([set("eoe", "Edge of Eternities")]);
    expect(m).toMatchObject({ title: "Edge of Eternities is out", body: "281 cards. See the set.", route: "/collection/sets/eoe", tag: "new-set", keys: ["eoe"] });
  });
  it("new set with no card count yet: still goes, without the figure", () => {
    const m = toMessage([{ ...set("eoe", "Edge of Eternities"), cards: null } as PushItem]);
    expect(m).toMatchObject({ title: "Edge of Eternities is out", body: "See the set.", route: "/collection/sets/eoe" });
  });
  it("new precon: the precon's page", () => {
    expect(toMessage([precon("ci", "Counter Intelligence")])).toMatchObject({ title: "Counter Intelligence precon is out", body: "You own 31 of its 100 cards.", route: "/decks/precons/ci" });
  });
  it("price drop: was and now, Home with the card open, the card image", () => {
    expect(toMessage([drop("a", "Jace, Multiverse Architect")])).toMatchObject({
      title: "Jace, Multiverse Architect is cheaper", body: "Was $8.40, now $5.10 at the cheapest printing.", route: "/", openCard: "o-a", openCombo: false, image: "img-a",
    });
  });
  it("trade match: the friend's page", () => {
    expect(toMessage([match("m1", "Colin", "p-colin")])).toMatchObject({ title: "Colin has a spare Ghoulcaller Gisa", body: feedCopy.home.line.tradeMatch, route: "/friends/p-colin/spares?spare=o-m1" });
  });
  it("trade match with spare requests on: the body says to ask, and the tap opens the card's sheet", () => {
    expect(toMessage([{ ...match("m1", "Colin", "p-colin"), askable: true } as PushItem])).toMatchObject({
      body: "It’s on your wishlist. Ask Colin for it.", route: "/friends/p-colin/spares?spare=o-m1",
    });
  });
  it("spare request: says where to answer, lands on Friends", () => {
    expect(toMessage([ask("r1")])).toMatchObject({ title: "Peter asks for your spare Lathliss, Dragon Queen", body: pushCopy.one.spareOffer.body, route: "/friends", tag: "spare-request:r1" });
  });
  it("an answer to the reader's own ask: who spares or keeps it, lands on Your requests, never replaces another", () => {
    expect(toMessage([answer("a1", "Colin", "yes")])).toMatchObject({ title: "Colin can spare Lathliss, Dragon Queen", body: pushCopy.one.spareOfferAnswer.yes.body, route: "/friends", tag: "spare-request:a1" });
    expect(toMessage([answer("a2", "Chris", "no")])).toMatchObject({ title: "Chris is keeping Lathliss, Dragon Queen", body: pushCopy.one.spareAnswer.no.body, route: "/friends", tag: "spare-request:a2" });
    expect(messagesFor([answer("a1", "Peter", "yes"), answer("a2", "Peter", "no")], "release")).toHaveLength(2);
  });
  it("combo: names its kind, Home with the first piece open for its combo", () => {
    expect(toMessage([combo("c1")])).toMatchObject({
      title: pushCopy.one.combo.title, body: "Thassa's Oracle + Demonic Consultation. You added Demonic Consultation.", route: "/", openCard: "o-c1", openCombo: true, openVariant: "1-2",
    });
  });
});

describe("a Wizards post (Announcements UI 3b)", () => {
  it("one post: its title and summary, the hero, tagged by its kind, landing on its out route", () => {
    expect(toMessage([post("abc", "Secret Lair x Jaws")])).toEqual({
      title: "Secret Lair x Jaws", body: "A drop of five.", route: "/out/wizards/abc", tag: "secret-lair", keys: ["post:abc"],
      openCard: null, openCombo: false, openVariant: null, image: "https://images.ctfassets.net/h.jpg",
    });
  });
  it("a post with no summary says where a tap goes; a hero not on https is never sent", () => {
    expect(toMessage([post("n1", "Release schedule", "wizards-news", { excerpt: null, image: "http://x.example/h.jpg" })])).toMatchObject({
      body: "Read it on Wizards.", image: null, tag: "wizards-news", route: "/out/wizards/n1",
    });
  });
  it("several posts of one kind: the kind by its kicker, the titles, landing on Home", () => {
    expect(toMessage([post("a", "Alpha", "commander-decklists"), post("b", "Beta", "commander-decklists"), post("c", "Gamma", "commander-decklists")])).toMatchObject({
      title: "Commander decklists: 3 new posts", body: "Alpha, Beta and 1 more.", route: "/", tag: "commander-decklists", image: null, keys: ["post:a", "post:b", "post:c"],
    });
  });
  it("collapses only within a kind", () => {
    expect(messagesFor([post("a", "A"), post("b", "B", "wizards-news"), post("c", "C")], "live").map((m) => [m.tag, m.keys])).toEqual([
      ["secret-lair", ["post:a", "post:c"]], ["wizards-news", ["post:b"]],
    ]);
  });
});

describe("several of one kind, as one", () => {
  it("precons go to the precons list", () => {
    expect(toMessage([precon("a", "Alpha"), precon("b", "Beta")])).toMatchObject({ title: "2 new precons are out", body: "Alpha and Beta.", route: "/decks/precons", keys: ["a", "b"] });
  });
  it("sets go to the sets list", () => {
    expect(toMessage([set("a", "Alpha"), set("b", "Beta")])).toMatchObject({ title: "2 new sets are out", route: "/collection/sets" });
  });
  it("price drops: the first two names, then the count, landing on Home", () => {
    expect(toMessage([drop("a", "Jace"), drop("b", "Dina"), drop("c", "Gisa")])).toMatchObject({
      title: "3 cards on your wishlist got cheaper", body: "Jace, Dina and 1 more.", route: "/", openCard: null,
    });
  });
  it("trade matches from one friend land on that friend; from several, on Friends", () => {
    expect(toMessage([match("1", "Colin", "p-colin"), match("2", "Colin", "p-colin"), match("3", "Colin", "p-colin")])).toMatchObject({ title: "Colin has 3 spares you want", route: "/friends/p-colin/spares" });
    expect(toMessage([match("1", "Colin", "p-colin"), match("2", "Peter", "p-peter")])).toMatchObject({ title: "2 spares you want", body: "From Colin and Peter.", route: "/friends" });
  });
  it("combos land on Home with nothing open", () => {
    expect(toMessage([combo("1"), combo("2"), combo("3"), combo("4")])).toMatchObject({ title: "You can make 4 new combos", body: pushCopy.many.combo.body, route: "/", openCard: null, openCombo: false });
  });
});

describe("collapse", () => {
  it("live: one per (kind, batch)", () => {
    const groups = collapse([drop("a", "A", "run-1"), drop("b", "B", "run-1"), drop("c", "C", "run-2"), combo("x", "u-1")], "live");
    expect(groups.map((g) => g.map((i) => i.key))).toEqual([["a", "b"], ["c"], ["x"]]);
  });
  it("release: one per kind, whatever the batch", () => {
    const groups = collapse([drop("a", "A", "run-1"), drop("c", "C", "run-2"), combo("x", "u-1")], "release");
    expect(groups.map((g) => g.map((i) => i.key))).toEqual([["a", "c"], ["x"]]);
  });
  it("a spare request is never collapsed, live or on release", () => {
    for (const mode of ["live", "release"] as const) {
      expect(messagesFor([ask("r1"), ask("r2"), ask("r3", "Colin")], mode)).toHaveLength(3);
    }
  });
  it("tags each spare request by its own key, so two asks never replace each other on the device; every other kind by its kind", () => {
    expect(messagesFor([ask("r1"), ask("r2")], "live").map((m) => m.tag)).toEqual(["spare-request:r1", "spare-request:r2"]);
    expect(toMessage([drop("a", "A")]).tag).toBe("price-drop");
  });

  it("keeps the order the first item of each group arrived", () => {
    const msgs = messagesFor([combo("x"), drop("a", "A"), combo("y")], "live");
    expect(msgs.map((m) => m.tag)).toEqual(["combo", "price-drop"]);
    expect(msgs[0]?.keys).toEqual(["x", "y"]);
  });
  it("refuses an empty group", () => {
    expect(() => toMessage([])).toThrow();
  });
});

describe("a seat notice (Rule 0 revisions, item 6)", () => {
  const T1 = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
  const T2 = "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
  const seat = (tableId: string, deck: string | null = null): PushItem => ({ kind: "rule_zero_seat", key: `table:${tableId}`, batch: `table:${tableId}`, tableId, host: "Colin", pod: "Thursday night", deck });

  it("says who seated you, lands on the table, and carries no image", () => {
    expect(toMessage([seat(T1)])).toEqual({
      title: "Colin seated you", body: "At Thursday night’s table. Pick your deck there.", route: `/friends/table/${T1}`,
      tag: `rule_zero_seat:table:${T1}`, keys: [`table:${T1}`], openCard: null, openCombo: false, openVariant: null, image: null,
    });
  });
  it("names the deck the seat already holds", () => {
    expect(toMessage([seat(T1, "Atraxa")]).body).toBe("At Thursday night’s table, with Atraxa.");
  });
  describe("past 40 characters (Rule 0 defaults)", () => {
    const wide = (host: string, pod: string, deck: string | null = null) => toMessage([{ ...seat(T1, deck), host, pod } as PushItem]);
    const len = (t: string) => Array.from(t).length;
    it("keeps the shipped title at exactly 40", () => {
      const m = wide("Colin", "x".repeat(12));
      expect(len(m.title)).toBe(40);
      expect(m.title).toBe(`Colin seated you at ${"x".repeat(12)}’s table`);
      expect(m.body).toBe("Pick your deck at the table.");
    });
    it("splits at 41: the pod and deck move to the body", () => {
      const m = wide("Colin", "x".repeat(13), "Atraxa");
      expect(m.title).toBe("Colin seated you");
      expect(m.body).toBe(`At ${"x".repeat(13)}’s table, with Atraxa.`);
    });
    it("names no deck in the split body when none is held", () => {
      expect(wide("Colin", "x".repeat(13)).body).toBe(`At ${"x".repeat(13)}’s table. Pick your deck there.`);
    });
    it("cuts a lone long host with an ellipsis, to exactly 40", () => {
      const m = wide("H".repeat(60), "Pod");
      expect(len(m.title)).toBe(40);
      expect(m.title).toBe(`${"H".repeat(28)}… seated you`);
      expect(m.body).toBe("At Pod’s table. Pick your deck there.");
    });
    it("leaves a host whose split title is exactly 40 uncut", () => {
      const host = "H".repeat(29);
      expect(wide(host, "Pod").title).toBe(`${host} seated you`);
    });
    it("counts an emoji host by code point and never splits a surrogate pair", () => {
      const m = wide("😀".repeat(40), "Pod");
      expect(len(m.title)).toBe(40);
      expect(m.title).toBe(`${"😀".repeat(28)}… seated you`);
    });
  });
  it("is never collapsed, live or in the morning: two tables are two pushes", () => {
    expect(messagesFor([seat(T1), seat(T2)], "live")).toHaveLength(2);
    expect(messagesFor([seat(T1), seat(T2)], "release")).toHaveLength(2);
  });
});

describe("a game to log (log reminder, PR 3)", () => {
  const T1 = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
  const T2 = "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
  const len = (t: string) => Array.from(t).length;
  const log = (tableId: string, gameMs: number, over: Partial<Extract<PushItem, { kind: "rule_zero_log" }>> = {}): PushItem => ({
    kind: "rule_zero_log", key: `game:${tableId}:${gameMs}`, batch: tableId, tableId, gameMs, deckId: "d1", deck: "Atraxa", pod: "Thursday night", result: { kind: "won", winner: "Colin" }, ...over,
  });

  it("names the winner and the pod, opens the game's Log form, and carries no image", () => {
    expect(toMessage([log(T1, 1000)])).toEqual({
      title: "Colin won at Thursday night’s table", body: "Log your game: Atraxa and every seat are filled in.",
      route: `/decks/d1?tab=games&table=${T1}&game=1000`, tag: `rule_zero_log:${T1}`, keys: [`game:${T1}:1000`], openCard: null, openCombo: false, openVariant: null, image: null,
    });
  });
  it("words a draw, a win of the reader's, and an undrawn winner", () => {
    expect(toMessage([log(T1, 1, { result: { kind: "draw" } })]).title).toBe("A draw at Thursday night’s table");
    expect(toMessage([log(T1, 1, { result: { kind: "you", winner: "You" } })]).title).toBe("You won at Thursday night’s table");
    expect(toMessage([log(T1, 1, { result: { kind: "unknown" } })]).title).toBe("Your game at Thursday night’s table");
  });
  it("splits past 40 characters: the pod moves to the body", () => {
    const m = toMessage([log(T1, 1, { pod: "The Friday night pod at the shop" })]);
    expect(m.title).toBe("Colin won. Log your game");
    expect(m.body).toBe("From The Friday night pod at the shop’s table. Atraxa and every seat are filled in.");
  });
  it("cuts a winner only when the split title is itself too long", () => {
    const m = toMessage([log(T1, 1, { pod: "The Friday night pod at the shop", result: { kind: "won", winner: "W".repeat(60) } })]);
    expect(len(m.title)).toBeLessThanOrEqual(40);
    expect(m.title).toMatch(/^W+… won\. Log your game$/);
  });
  it("merges one table's games into one push that opens Home, oldest first, in both modes", () => {
    const m = messagesFor([log(T1, 2000, { result: { kind: "won", winner: "Sam" } }), log(T1, 1000)], "live");
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ title: "2 games at Thursday night’s table", body: "Colin won, then Sam did. Log both: every seat is filled in.", route: "/", tag: `rule_zero_log:${T1}` });
    expect(messagesFor([log(T1, 2000), log(T1, 1000)], "release")).toHaveLength(1);
  });
  it("keeps two tables as two pushes, each with its own tag", () => {
    const m = messagesFor([log(T1, 1000), log(T2, 1000)], "live");
    expect(m.map((x) => x.tag).sort()).toEqual([`rule_zero_log:${T1}`, `rule_zero_log:${T2}`].sort());
  });
  it("names no winners for three or more games", () => {
    const m = toMessage([log(T1, 1), log(T1, 2), log(T1, 3)]);
    expect(m.title).toBe("3 games at Thursday night’s table");
    expect(m.body).toBe("Log them: every seat is filled in.");
  });
});
