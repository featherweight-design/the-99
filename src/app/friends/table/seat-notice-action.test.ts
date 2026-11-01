// The seat toast's read (Rule 0 revisions, item 6): it is the session reader's own, and what leaves carries the table and the two
// branded names only.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ currentUserId: vi.fn(), requireUserId: vi.fn(), unseenSeatNotices: vi.fn(), markSeatNoticeSeen: vi.fn() }));
vi.mock("../../../lib/auth", () => ({ currentUserId: m.currentUserId, requireUserId: m.requireUserId }));
vi.mock("../../../lib/social/rule-zero-notice", () => ({ unseenSeatNotices: m.unseenSeatNotices, markSeatNoticeSeen: m.markSeatNoticeSeen }));
vi.mock("../../../lib/social/rule-zero", () => ({ markSeen: vi.fn(), setSeatDeck: vi.fn() }));
vi.mock("../../../lib/social/rule-zero-table", () => ({ loadDeckChoices: vi.fn(), loadTable: vi.fn() }));

import { named } from "../../../lib/person-name/mint";
import { markSeatNoticeSeenAction, unseenSeatNoticesAction } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUserId.mockResolvedValue("user_reader");
  m.currentUserId.mockResolvedValue("user_reader");
});

describe("unseenSeatNoticesAction", () => {
  it("reads the session reader's notices and sends only the table, the names and when the seat last changed", async () => {
    const host = named("Colin");
    const since = new Date(1_700_000_000_000);
    const podName = named("Thursday night");
    m.unseenSeatNotices.mockResolvedValue([{ tableId: "t1", host, podName, deckName: "Ghalta", since }]);
    expect(await unseenSeatNoticesAction()).toEqual([{ tableId: "t1", host, podName, since: 1_700_000_000_000 }]);
    expect(m.unseenSeatNotices).toHaveBeenCalledWith("user_reader");
  });

  it("answers no notices, and reads nothing, when there is no session", async () => {
    m.currentUserId.mockResolvedValue(null);
    expect(await unseenSeatNoticesAction()).toEqual([]);
    expect(m.unseenSeatNotices).not.toHaveBeenCalled();
  });

  it("marks a notice seen for the session reader, as the session reader and not as an id the caller supplies", async () => {
    m.markSeatNoticeSeen.mockResolvedValue(true);
    await markSeatNoticeSeenAction("t1");
    expect(m.requireUserId).toHaveBeenCalledOnce();
    expect(m.markSeatNoticeSeen).toHaveBeenCalledWith("user_reader", "t1");
  });

  it("hands the lib whatever it is given (the lib validates the id), still scoped to the session reader", async () => {
    m.markSeatNoticeSeen.mockResolvedValue(false);
    expect(await markSeatNoticeSeenAction(42)).toBe(false);
    expect(m.markSeatNoticeSeen).toHaveBeenCalledWith("user_reader", 42);
  });
});
