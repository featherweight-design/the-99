import { describe, expect, it } from "vitest";
import { reservationIdFrom } from "./spend";

const ID = "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68";

describe("reservationIdFrom (the invitation's public metadata, R8)", () => {
  it("reads the reservation id our invitation carries", () => {
    expect(reservationIdFrom({ inviteReservation: ID })).toBe(ID);
    expect(reservationIdFrom({ inviteReservation: ID.toUpperCase() })).toBe(ID.toUpperCase());
  });
  it("reads nothing from an account with no invitation, or anything that is not an id", () => {
    for (const meta of [undefined, null, "x", 7, {}, { inviteReservation: "" }, { inviteReservation: 42 }, { inviteReservation: `${ID} ` }, { inviteReservation: "not-a-uuid" }, { other: ID }]) {
      expect(reservationIdFrom(meta)).toBeNull();
    }
  });
});
