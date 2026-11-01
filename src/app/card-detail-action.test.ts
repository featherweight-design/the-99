// getCardDetail with no session answers null, as for a card not found, and reads nothing: the modal treats both as a read that
// failed, and a throw filed a failed request for a lapsed session token.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ currentUserId: vi.fn(), loadCardDetail: vi.fn(), requestSwitchEnv: vi.fn() }));
vi.mock("../lib/auth", () => ({ currentUserId: m.currentUserId }));
vi.mock("../lib/collection/card-detail", () => ({ loadCardDetail: m.loadCardDetail }));
vi.mock("../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));

import { getCardDetail } from "./card-detail-action";

const ID = "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68";

beforeEach(() => {
  vi.clearAllMocks();
  m.requestSwitchEnv.mockResolvedValue({});
});

describe("getCardDetail", () => {
  it("answers null and reads nothing when there is no session", async () => {
    m.currentUserId.mockResolvedValue(null);
    expect(await getCardDetail(ID)).toBeNull();
    expect(m.loadCardDetail).not.toHaveBeenCalled();
    expect(m.requestSwitchEnv).not.toHaveBeenCalled();
  });

  it("reads the card for the session reader", async () => {
    m.currentUserId.mockResolvedValue("user_reader");
    m.loadCardDetail.mockResolvedValue({ oracleId: ID });
    expect(await getCardDetail(ID)).toEqual({ oracleId: ID });
    expect(m.loadCardDetail.mock.calls[0]![0]).toBe("user_reader");
  });
});
