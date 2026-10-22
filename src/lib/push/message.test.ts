import { describe, expect, it } from "vitest";

import { collapse, messagesFor, toMessage, type PushItem } from "./message";

const set = (key: string, name: string, batch = "run-1"): PushItem => ({ kind: "new-set", key, batch, name, cards: 281, href: `/collection/sets/${key}` });
const precon = (key: string, name: string, batch = "run-1"): PushItem => ({ kind: "new-precon", key, batch, name, owned: 31, of: 100, href: `/decks/precons/${key}` });
const drop = (key: string, card: string, batch = "run-1"): PushItem => ({ kind: "price-drop", key, batch, oracleId: `o-${key}`, card, wasCents: 840, nowCents: 510, image: `img-${key}` });
const match = (key: string, friend: string, publicId: string, card = "Ghoulcaller Gisa", batch = "w-1"): PushItem => ({ kind: "trade-match", key, batch, friend, publicId, card, image: `img-${key}` });
const ask = (key: string, friend = "Peter"): PushItem => ({ kind: "spare-request", key, batch: key, friend, card: "Lathliss, Dragon Queen", image: null });
const combo = (key: string, batch = "u-1"): PushItem => ({ kind: "combo", key, batch, oracleId: `o-${key}`, a: "Thassa's Oracle", b: "Demonic Consultation", added: "Demonic Consultation", image: `img-${key}` });

describe("one item of each kind (the handoff's table)", () => {
  it("new set: the set's page", () => {
    const m = toMessage([set("eoe", "Edge of Eternities")]);
    expect(m).toMatchObject({ title: "Edge of Eternities is out", body: "281 cards. See the set.", route: "/collection/sets/eoe", tag: "new-set", keys: ["eoe"] });
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
    expect(toMessage([match("m1", "Colin", "p-colin")])).toMatchObject({ title: "Colin has a spare Ghoulcaller Gisa", body: "It’s on your wishlist.", route: "/friends/p-colin" });
  });
  it("spare request: says where to answer, lands on Friends", () => {
    expect(toMessage([ask("r1")])).toMatchObject({ title: "Peter asks for your spare Lathliss, Dragon Queen", body: "A friend wants a card you have spare. Answer in Friends.", route: "/friends", tag: "spare-request" });
  });
  it("combo: names its kind, Home with the first piece open for its combo", () => {
    expect(toMessage([combo("c1")])).toMatchObject({
      title: "You can make a combo", body: "Thassa's Oracle + Demonic Consultation. You added Demonic Consultation.", route: "/", openCard: "o-c1", openCombo: true,
    });
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
    expect(toMessage([match("1", "Colin", "p-colin"), match("2", "Colin", "p-colin"), match("3", "Colin", "p-colin")])).toMatchObject({ title: "Colin has 3 spares you want", route: "/friends/p-colin" });
    expect(toMessage([match("1", "Colin", "p-colin"), match("2", "Peter", "p-peter")])).toMatchObject({ title: "2 spares you want", body: "From Colin and Peter.", route: "/friends" });
  });
  it("combos land on Home with nothing open", () => {
    expect(toMessage([combo("1"), combo("2"), combo("3"), combo("4")])).toMatchObject({ title: "You can make 4 new combos", body: "From the cards you just added.", route: "/", openCard: null, openCombo: false });
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
  it("keeps the order the first item of each group arrived", () => {
    const msgs = messagesFor([combo("x"), drop("a", "A"), combo("y")], "live");
    expect(msgs.map((m) => m.tag)).toEqual(["combo", "price-drop"]);
    expect(msgs[0]?.keys).toEqual(["x", "y"]);
  });
  it("refuses an empty group", () => {
    expect(() => toMessage([])).toThrow();
  });
});
