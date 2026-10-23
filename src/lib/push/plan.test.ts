import { describe, expect, it } from "vitest";

import type { PushItem } from "./message";
import { planDevice, type Device, type OutboxRow } from "./plan";

const at = (iso: string) => new Date(iso);
// New York is UTC-4 in October: 21:00 is 01:00Z, 09:00 is 13:00Z.
const device: Device = { id: "d1", createdAt: at("2026-10-01T00:00:00Z"), timeZone: "America/New_York" };
const row = (id: string, created: string): OutboxRow => ({ id, itemKey: `item:${id}`, createdAt: at(created) });
const drop = (id: string, batch = "b1"): PushItem => ({ kind: "price-drop", key: `item:${id}`, batch, oracleId: `o-${id}`, card: `Card ${id}`, wasCents: 800, nowCents: 500, image: null });
const combo = (id: string, batch = "b1"): PushItem => ({ kind: "combo", key: `item:${id}`, batch, oracleId: `o-${id}`, a: "A", b: "B", added: "B", image: null });
const ask = (id: string): PushItem => ({ kind: "spare-request", key: `item:${id}`, batch: id, friend: "Peter", card: "Lathliss", image: null });
const items = (...xs: PushItem[]) => new Map(xs.map((x) => [x.key.slice(5), x]));
const NOON = at("2026-10-22T16:00:00Z"); // 12:00 in New York

describe("planDevice", () => {
  it("holds everything inside the device's held hours and covers nothing", () => {
    const night = at("2026-10-22T03:00:00Z"); // 23:00 local
    const plan = planDevice([row("1", "2026-10-22T02:00:00Z")], items(drop("1")), device, night);
    expect(plan).toEqual({ sends: [], covered: [], held: true });
  });

  it("sends what arrived in the daytime as ONE live push per kind and batch, and covers its rows", () => {
    const rows = [row("1", "2026-10-22T14:00:00Z"), row("2", "2026-10-22T14:01:00Z"), row("3", "2026-10-22T14:02:00Z")];
    const plan = planDevice(rows, items(drop("1"), drop("2"), combo("3")), device, NOON);
    expect(plan.held).toBe(false);
    expect(plan.sends.map((s) => s.message.tag)).toEqual(["price-drop", "combo"]);
    expect(plan.sends[0]?.rowIds).toEqual(["1", "2"]);
    expect(plan.sends[0]?.message.title).toBe("2 cards on your wishlist got cheaper");
    expect([...plan.covered].sort()).toEqual(["1", "2", "3"]);
  });

  it("sends what arrived overnight as ONE push per kind at the release, whatever the batch", () => {
    // Both arrived between 21:00 and 09:00 local (01:00Z to 13:00Z), in different batches.
    const rows = [row("1", "2026-10-22T03:00:00Z"), row("2", "2026-10-22T09:00:00Z")];
    const plan = planDevice(rows, items(drop("1", "a"), drop("2", "b")), device, at("2026-10-22T13:05:00Z"));
    expect(plan.sends).toHaveLength(1);
    expect(plan.sends[0]?.rowIds).toEqual(["1", "2"]);
  });

  it("keeps live and overnight arrivals of one kind as two pushes, same tag", () => {
    const rows = [row("1", "2026-10-22T03:00:00Z"), row("2", "2026-10-22T13:30:00Z")];
    const plan = planDevice(rows, items(drop("1"), drop("2")), device, NOON);
    expect(plan.sends).toHaveLength(2);
    expect(new Set(plan.sends.map((s) => s.message.tag))).toEqual(new Set(["price-drop"]));
  });

  it("sends in the order the news happened, so the newest is last and wins the tag on the device", () => {
    // A daytime drop from yesterday afternoon (live), the overnight one (release), a drop from this morning after 09:00 (live).
    const rows = [row("1", "2026-10-22T13:30:00Z"), row("2", "2026-10-22T03:00:00Z"), row("3", "2026-10-21T18:00:00Z")];
    const plan = planDevice(rows, items(drop("1", "late"), drop("2", "night"), drop("3", "early")), device, at("2026-10-22T14:00:00Z"));
    const order = plan.sends.map((s) => s.rowIds.join());
    expect(order).toEqual(["3", "2", "1"]);
  });

  it("never merges spare requests, live or on release, and sends them in the morning after a night's hold", () => {
    const rows = [row("1", "2026-10-22T03:00:00Z"), row("2", "2026-10-22T04:00:00Z")];
    expect(planDevice(rows, items(ask("1"), ask("2")), device, at("2026-10-22T13:05:00Z")).sends).toHaveLength(2);
  });

  it("covers, without sending, a row from before the device existed", () => {
    const young: Device = { ...device, createdAt: at("2026-10-22T15:00:00Z") };
    const plan = planDevice([row("1", "2026-10-22T14:00:00Z")], items(drop("1")), young, NOON);
    expect(plan.sends).toEqual([]);
    expect(plan.covered).toEqual(["1"]);
  });

  it("leaves a row with no resolved item alone: neither sent nor covered", () => {
    const plan = planDevice([row("1", "2026-10-22T14:00:00Z")], new Map(), device, NOON);
    expect(plan).toEqual({ sends: [], covered: [], held: false });
  });

  it("judges each device in its own zone", () => {
    const tokyo: Device = { ...device, id: "d2", timeZone: "Asia/Tokyo" };
    const r = [row("1", "2026-10-22T14:00:00Z")];
    // 16:00Z is 12:00 in New York (not held) and 01:00 the next day in Tokyo (held).
    expect(planDevice(r, items(drop("1")), device, NOON).held).toBe(false);
    expect(planDevice(r, items(drop("1")), tokyo, NOON).held).toBe(true);
  });
});
