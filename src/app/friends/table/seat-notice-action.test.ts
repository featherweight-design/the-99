// The seat toast's read (Rule 0 revisions, item 6): it is the session reader's own, and what leaves carries the table and the two
// branded names only.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ requireUserId: vi.fn(), unseenSeatNotices: vi.fn(), markSeatNoticeSeen: vi.fn() }));
vi.mock("../../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../../lib/social/rule-zero-notice", () => ({ unseenSeatNotices: m.unseenSeatNotices, markSeatNoticeSeen: m.markSeatNoticeSeen }));
vi.mock("../../../lib/social/rule-zero", () => ({ markSeen: vi.fn(), setSeatDeck: vi.fn() }));
vi.mock("../../../lib/social/rule-zero-table", () => ({ loadDeckChoices: vi.fn(), loadTable: vi.fn() }));

import { named } from "../../../lib/person-name/mint";
import { markSeatNoticeSeenAction, unseenSeatNoticesAction } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  m.requireUserId.mockResolvedValue("user_reader");
});

describe("unseenSeatNoticesAction", () => {
  it("reads the session reader's notices and sends only the table and the names", async () => {
    const host = named("Colin");
    const podName = named("Thursday night");
    m.unseenSeatNotices.mockResolvedValue([{ tableId: "t1", host, podName, deckName: "Ghalta", since: new Date() }]);
    expect(await unseenSeatNoticesAction()).toEqual([{ tableId: "t1", host, podName }]);
    expect(m.unseenSeatNotices).toHaveBeenCalledWith("user_reader");
  });

  it("marks a notice seen for the session reader, whatever table id it is handed", async () => {
    m.markSeatNoticeSeen.mockResolvedValue(true);
    await markSeatNoticeSeenAction("t1");
    expect(m.markSeatNoticeSeen).toHaveBeenCalledWith("user_reader", "t1");
  });
});
