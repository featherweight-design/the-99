import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ log: [] as string[], answered: true, undone: true }));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => h.log.push(p) }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "me" }));
vi.mock("../../lib/flags/request", () => ({ requestFlags: async () => ({ FRIEND_LINKS_ENABLED: "true" }) }));
vi.mock("../../lib/social/friend-requests", () => ({
  answerFriendRequest: async () => h.answered,
  undoDecline: async () => h.undone,
}));

import { answerFriendRequestAction, undoDeclineAction } from "./friend-request-actions";

beforeEach(() => {
  h.log = [];
  h.answered = true;
  h.undone = true;
});

describe("friend request actions", () => {
  it("refreshes /friends on a Decline, and Home too on an Accept", async () => {
    await answerFriendRequestAction("p", "decline");
    expect(h.log).toEqual(["/friends"]);
    h.log = [];
    await answerFriendRequestAction("p", "accept");
    expect(h.log).toEqual(["/friends", "/"]);
  });

  it("answers nothing for an answer that is neither, and refreshes nothing when nothing was waiting", async () => {
    expect(await answerFriendRequestAction("p", "maybe" as never)).toBe(false);
    h.answered = false;
    expect(await answerFriendRequestAction("p", "accept")).toBe(false);
    expect(h.log).toEqual([]);
  });

  it("refreshes /friends only when Put back undid the decline", async () => {
    h.undone = false;
    expect(await undoDeclineAction("p")).toBe(false);
    expect(h.log).toEqual([]);
    h.undone = true;
    expect(await undoDeclineAction("p")).toBe(true);
    expect(h.log).toEqual(["/friends"]);
  });
});
