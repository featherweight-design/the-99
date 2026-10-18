import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("../../db", () => ({ db: {} }));

import { reverseCharge, type DisputeRow, type GrantRow, type ReverseStore, type ReverseTx } from "./reverse";
import type { DisputeStatus } from "./refund-rule";
import type { LedgerRow } from "../model/allowance-rule";

const NOW = new Date("2026-10-17T12:00:00Z");

// An in-memory player: one lot, one payment record, the event ledger, the disputes and the block.
const world = {
  events: new Set<string>(), record: true as boolean, owner: true as boolean,
  grant: { id: "g1", userId: "user_a", units: 40, revokedUnits: 0, unrecoveredUnits: 0, refundedCents: 0 } as GrantRow,
  ledger: [] as LedgerRow[], lotGone: false, disputes: new Map<string, DisputeRow & { pi: string }>(), blocked: false, locks: 0,
};
function reset() {
  Object.assign(world, { record: true, owner: true, ledger: [], blocked: false, locks: 0, lotGone: false });
  world.events = new Set();
  world.disputes = new Map();
  world.grant = { id: "g1", userId: "user_a", units: 40, revokedUnits: 0, unrecoveredUnits: 0, refundedCents: 0 };
}

const tx: ReverseTx = {
  async insertEvent(id) { if (world.events.has(id)) return false; world.events.add(id); return true; },
  async paymentRecord() { return world.record ? { checkoutSessionId: "cs_1" } : null; },
  async grantOwner() { return world.owner ? "user_a" : null; },
  async lockPlayer() { world.locks += 1; },
  async blockPurchases() { world.blocked = true; },
  async lockGrant() { return world.owner && !world.lotGone ? world.grant : null; },
  async ledgerRows() { return world.ledger; },
  async otherDisputes(pi, except) { return [...world.disputes.entries()].filter(([id, d]) => d.pi === pi && id !== except).map(([, d]) => d.status); },
  async dispute(id) { const d = world.disputes.get(id); return d ? { status: d.status, unitsRevoked: d.unitsRevoked } : null; },
  async advanceDispute(id, pi, status, units) {
    const d = world.disputes.get(id);
    if (!d) { world.disputes.set(id, { pi, status, unitsRevoked: units }); return true; }
    if (d.status === "open") d.status = status; // a terminal row stays terminal; units_revoked is kept
    return false;
  },
  async setRevocation(_id, revoked, unrecovered, claim) { world.grant.revokedUnits = revoked; world.grant.unrecoveredUnits = unrecovered; world.grant.refundedCents = Math.max(world.grant.refundedCents, claim); },
};
const store: ReverseStore = {
  async eventSeen(id) { return world.events.has(id); },
  async paymentRecord() { return world.record ? { checkoutSessionId: "cs_1" } : null; },
  async recordEvent(id) { if (world.events.has(id)) return false; world.events.add(id); return true; },
  transaction: (run) => run(tx),
};

const charge = { refunded: 0, created: Math.floor(NOW.getTime() / 1000) - 60 };
const disputeStatus: Record<string, string> = {};
const intentApp = { value: "the-99" as string | undefined };
const stripe = {
  charges: { retrieve: vi.fn(async () => ({ id: "ch_1", payment_intent: "pi_1", amount: 500, amount_refunded: charge.refunded, created: charge.created })) },
  disputes: { retrieve: vi.fn(async (id: string) => ({ id, charge: "ch_1", payment_intent: "pi_1", status: disputeStatus[id] ?? "needs_response" })) },
  paymentIntents: { retrieve: vi.fn(async () => ({ id: "pi_1", metadata: intentApp.value ? { app: intentApp.value } : {} })) },
} as unknown as Stripe;

const refund = (cumulative: number, eventId = `evt_r${cumulative}`) => {
  charge.refunded = cumulative;
  return reverseCharge(stripe, eventId, "charge.refunded", "ch_1", NOW, store);
};
const disp = (type: "charge.dispute.created" | "charge.dispute.closed", status: string, eventId: string, did = "dp_1") => {
  disputeStatus[did] = status;
  return reverseCharge(stripe, eventId, type, did, NOW, store);
};
const spent = (n: number): LedgerRow[] => Array.from({ length: n }, () => ({ status: "spent", createdAt: new Date(NOW.getTime() - 3_600_000) }));

beforeEach(() => { reset(); charge.refunded = 0; charge.created = Math.floor(NOW.getTime() / 1000) - 60; for (const k of Object.keys(disputeStatus)) delete disputeStatus[k]; intentApp.value = "the-99"; });

describe("reverseCharge: refunds", () => {
  it("revokes the whole unspent lot on a full refund, under the player's lock", async () => {
    expect(await refund(500)).toEqual({ outcome: "refund", shortfall: false });
    expect(world.grant.revokedUnits).toBe(40);
    expect(world.locks).toBe(1);
  });

  it("does not claw back what is spent: revokes the rest and records the shortfall", async () => {
    world.ledger = spent(15);
    expect(await refund(500)).toEqual({ outcome: "refund", shortfall: true });
    expect(world.grant).toMatchObject({ revokedUnits: 25, unrecoveredUnits: 15 });
  });

  it("counts an in-flight reservation as held, and an old stranded one as free", async () => {
    world.ledger = [{ status: "reserved", createdAt: new Date(NOW.getTime() - 60_000) }, { status: "reserved", createdAt: new Date(NOW.getTime() - 3_600_000) }];
    await refund(500);
    expect(world.grant.revokedUnits).toBe(39);
  });

  it("converges: a replayed event is a duplicate, and out-of-order partials never double-count", async () => {
    await refund(400, "evt_a");
    expect(world.grant.revokedUnits).toBe(32);
    expect((await refund(400, "evt_a")).outcome).toBe("duplicate");
    await refund(450, "evt_c");
    expect(world.grant.revokedUnits).toBe(36);
  });

  it("never lowers a revocation when a later event reports a smaller cumulative figure", async () => {
    await refund(400, "evt_a");
    await refund(250, "evt_b");
    expect(world.grant.revokedUnits).toBe(32);
  });

  it("is a duplicate for an event already recorded, writing nothing", async () => {
    world.events.add("evt_x");
    expect((await refund(500, "evt_x")).outcome).toBe("duplicate");
    expect(world.grant.revokedUnits).toBe(0);
  });
});

describe("reverseCharge: a delivery that loses the race", () => {
  it("does nothing when the event row conflicts inside the transaction, after the early read missed it", async () => {
    world.events.add("evt_race");
    const racing: ReverseStore = { ...store, eventSeen: async () => false };
    charge.refunded = 500;
    expect((await reverseCharge(stripe, "evt_race", "charge.refunded", "ch_1", NOW, racing)).outcome).toBe("duplicate");
    expect(world.grant.revokedUnits).toBe(0);
    expect(world.locks).toBe(0);
  });
});

describe("reverseCharge: whose charge it is", () => {
  it("ignores another app's charge, and asks Stripe for the intent to know", async () => {
    world.record = false;
    intentApp.value = "concert-crawl";
    expect((await refund(500)).outcome).toBe("ignored");
    expect(world.events.size).toBe(0);
  });

  it("asks for a retry when our own payment has no record yet", async () => {
    world.record = false;
    expect((await refund(500)).outcome).toBe("retry");
    expect(world.grant.revokedUnits).toBe(0);
  });

  it("stops asking for a retry once the charge is older than the grace window, and records the event", async () => {
    world.record = false;
    charge.created = Math.floor(NOW.getTime() / 1000) - (72 * 3600 - 1);
    expect((await refund(500, "evt_young")).outcome).toBe("retry");
    expect(world.events.has("evt_young")).toBe(false);
    charge.created = Math.floor(NOW.getTime() / 1000) - 72 * 3600;
    expect((await refund(500, "evt_old")).outcome).toBe("unmatched");
    expect(world.events.has("evt_old")).toBe(true);
    expect(world.grant.revokedUnits).toBe(0);
  });

  it("keeps an event on an unattributed payment, with no lot to take from", async () => {
    world.owner = false;
    expect((await refund(500)).outcome).toBe("no_grant");
  });
});

describe("reverseCharge: disputes", () => {
  it("revokes all unspent credits, keeps a row, and blocks buying", async () => {
    world.ledger = spent(10);
    expect(await disp("charge.dispute.created", "needs_response", "evt_d1")).toEqual({ outcome: "dispute_opened", shortfall: true });
    expect(world.grant).toMatchObject({ revokedUnits: 30, unrecoveredUnits: 10 });
    expect(world.disputes.get("dp_1")).toMatchObject({ status: "open", unitsRevoked: 30 });
    expect(world.blocked).toBe(true);
  });

  it("a win gives back exactly what the dispute took and leaves the block", async () => {
    world.ledger = spent(10);
    await disp("charge.dispute.created", "needs_response", "evt_d1");
    expect((await disp("charge.dispute.closed", "won", "evt_d2")).outcome).toBe("dispute_won");
    expect(world.grant).toMatchObject({ revokedUnits: 0, unrecoveredUnits: 0 });
    expect(world.disputes.get("dp_1")?.status).toBe("won");
    expect(world.blocked).toBe(true);
  });

  it("a win does not undo an earlier refund", async () => {
    await refund(250, "evt_r");
    await disp("charge.dispute.created", "needs_response", "evt_d1");
    expect(world.grant.revokedUnits).toBe(40);
    await disp("charge.dispute.closed", "won", "evt_d2");
    expect(world.grant.revokedUnits).toBe(20);
  });

  it("a loss keeps the lot revoked", async () => {
    await disp("charge.dispute.created", "needs_response", "evt_d1");
    expect((await disp("charge.dispute.closed", "lost", "evt_d2")).outcome).toBe("dispute_lost");
    expect(world.grant.revokedUnits).toBe(40);
    expect(world.disputes.get("dp_1")?.status).toBe("lost");
  });

  // The dispute's own revoke falls short (10 held), the held rows are then freed (failed runs), and only the
  // standing hold of an open dispute lets a SMALL refund raise the revocation to the whole lot.
  it("a refund while a dispute is open still holds the whole lot", async () => {
    world.ledger = spent(10);
    await disp("charge.dispute.created", "needs_response", "evt_d1");
    expect(world.grant.revokedUnits).toBe(30);
    world.ledger = [];
    await refund(100, "evt_r"); // alone this is 8 units
    expect(world.grant.revokedUnits).toBe(40);
  });

  it("a win after a refund during the dispute keeps the refund's share revoked and nothing else", async () => {
    await disp("charge.dispute.created", "needs_response", "evt_d1");
    await refund(250, "evt_r");
    await disp("charge.dispute.closed", "won", "evt_d2");
    expect(world.grant.revokedUnits).toBe(20);
    expect(world.grant.unrecoveredUnits).toBe(0);
  });

  it("a win leaves the lot revoked while another dispute on the payment is still open", async () => {
    await disp("charge.dispute.created", "needs_response", "evt_d1", "dp_1");
    await disp("charge.dispute.created", "needs_response", "evt_d2", "dp_2");
    await disp("charge.dispute.closed", "won", "evt_d3", "dp_1");
    expect(world.grant.revokedUnits).toBe(40);
    await disp("charge.dispute.closed", "won", "evt_d4", "dp_2");
    expect(world.grant.revokedUnits).toBe(0);
  });

  it("a closed event first, then the created one, never revokes a won dispute", async () => {
    expect((await disp("charge.dispute.closed", "won", "evt_d2")).outcome).toBe("dispute_won");
    expect((await disp("charge.dispute.created", "won", "evt_d1")).outcome).toBe("dispute_unchanged");
    expect(world.grant.revokedUnits).toBe(0);
    expect(world.blocked).toBe(false);
  });

  it("a second created event for one dispute changes nothing", async () => {
    await disp("charge.dispute.created", "needs_response", "evt_d1");
    expect((await disp("charge.dispute.created", "needs_response", "evt_d3")).outcome).toBe("dispute_unchanged");
  });

  it("a dispute on another app's charge is ignored", async () => {
    world.record = false;
    intentApp.value = undefined;
    expect((await disp("charge.dispute.created", "needs_response", "evt_d1")).outcome).toBe("ignored");
    expect(world.blocked).toBe(false);
  });
});

describe("reverseCharge: a lost dispute keeps blocking a win", () => {
  it("lost, then another won: the lot stays revoked", async () => {
    await disp("charge.dispute.created", "needs_response", "evt_1", "dp_1");
    await disp("charge.dispute.created", "needs_response", "evt_2", "dp_2");
    await disp("charge.dispute.closed", "lost", "evt_3", "dp_1");
    await disp("charge.dispute.closed", "won", "evt_4", "dp_2");
    expect(world.grant.revokedUnits).toBe(40);
    expect(world.disputes.get("dp_2")?.status).toBe("won");
  });

  it("won first (the other still open), then lost: the lot stays revoked", async () => {
    await disp("charge.dispute.created", "needs_response", "evt_1", "dp_1");
    await disp("charge.dispute.created", "needs_response", "evt_2", "dp_2");
    await disp("charge.dispute.closed", "won", "evt_3", "dp_2");
    await disp("charge.dispute.closed", "lost", "evt_4", "dp_1");
    expect(world.grant.revokedUnits).toBe(40);
  });

  it("a lost dispute leaves the lot revoked", async () => {
    await disp("charge.dispute.created", "needs_response", "evt_1", "dp_1");
    await disp("charge.dispute.closed", "lost", "evt_2", "dp_1");
    expect(world.grant.revokedUnits).toBe(40);
  });
});

describe("reverseCharge: the refund claim is monotonic under the lock", () => {
  it("an older half-refund snapshot after a full refund lowers neither the revocation nor the shortfall", async () => {
    world.ledger = spent(30);
    await refund(500, "evt_full");
    expect(world.grant).toMatchObject({ revokedUnits: 10, unrecoveredUnits: 30, refundedCents: 500 });
    await refund(250, "evt_old");
    expect(world.grant).toMatchObject({ revokedUnits: 10, unrecoveredUnits: 30, refundedCents: 500 });
  });

  it("a win that fetched amount_refunded = 0 before a half-refund committed still preserves the refunded half (the stored claim)", async () => {
    await disp("charge.dispute.created", "needs_response", "evt_d1");
    await refund(250, "evt_r");
    charge.refunded = 0;
    disputeStatus["dp_1"] = "won";
    await reverseCharge(stripe, "evt_d2", "charge.dispute.closed", "dp_1", NOW, store);
    expect(world.grant.revokedUnits).toBe(20);
  });
});

describe("reverseCharge: a late partial refund after a lost dispute", () => {
  it("keeps the loss's revocation and its shortfall (40 units, 15 spent: 25 revoked, 15 unrecovered)", async () => {
    world.ledger = spent(15);
    await disp("charge.dispute.created", "needs_response", "evt_1");
    await disp("charge.dispute.closed", "lost", "evt_2");
    expect(world.grant).toMatchObject({ revokedUnits: 25, unrecoveredUnits: 15 });
    await refund(250, "evt_r");
    expect(world.grant).toMatchObject({ revokedUnits: 25, unrecoveredUnits: 15 });
  });
});

describe("reverseCharge: a dispute keeps advancing with no lot", () => {
  it("closes after the account was purged (no owner)", async () => {
    await disp("charge.dispute.created", "needs_response", "evt_1");
    world.owner = false;
    expect((await disp("charge.dispute.closed", "won", "evt_2")).outcome).toBe("no_grant");
    expect(world.disputes.get("dp_1")).toMatchObject({ status: "won", unitsRevoked: 40 });
  });

  it("closes when the lot is deleted between the owner read and the lock (the purge race)", async () => {
    await disp("charge.dispute.created", "needs_response", "evt_1");
    world.lotGone = true;
    expect((await disp("charge.dispute.closed", "lost", "evt_2")).outcome).toBe("no_grant");
    expect(world.disputes.get("dp_1")?.status).toBe("lost");
  });

  it("never reopens or rewrites a terminal row, and keeps units_revoked", async () => {
    await disp("charge.dispute.created", "needs_response", "evt_1");
    await disp("charge.dispute.closed", "lost", "evt_2");
    world.owner = false;
    await disp("charge.dispute.closed", "won", "evt_3");
    expect(world.disputes.get("dp_1")).toMatchObject({ status: "lost", unitsRevoked: 40 });
  });
});
