// Friend requests in Waiting on you (friend links R1, F1 to F4): a request row with Accept and Decline, drawn first; an
// answer turns it into its receipt in place; a Decline offers Put back, which takes the receipt away again.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WaitingOnYou } from "./waiting-on-you";
import type { FriendRequestRow } from "../../lib/social/waiting";
import { named } from "../../lib/person-name/mint";
import { friendLinkCopy } from "../../lib/copy/friend-links";

const a = vi.hoisted(() => ({ answer: vi.fn(), undo: vi.fn() }));
vi.mock("../../app/friends/spare-actions", () => ({ answerSpareAction: vi.fn() }));
vi.mock("../../app/friends/friend-request-actions", () => ({ answerFriendRequestAction: a.answer, undoDeclineAction: a.undo }));

const NOW = new Date("2026-11-12T12:00:00Z");
const row = (unseen: boolean): FriendRequestRow => ({
  key: "friend:p-colin", kind: "friend-request", createdAt: new Date(NOW.getTime() - 2 * 3_600_000), unseen,
  request: {
    requester: { publicId: "p-colin", displayName: named("Colin"), commander: null },
    via: "code", sentAt: new Date(NOW.getTime() - 2 * 3_600_000), noticedAt: NOW, unseen,
  },
});

beforeEach(() => {
  a.answer.mockReset().mockResolvedValue(true);
  a.undo.mockReset().mockResolvedValue(true);
});
afterEach(cleanup);

describe("friend requests in Waiting on you", () => {
  it("draws the request with how it came, Accept and Decline, and the diamond only while unseen", () => {
    const { container, rerender } = render(<WaitingOnYou rows={[row(true)]} now={NOW} />);
    expect(screen.getByText(friendLinkCopy.request.kind)).toBeInTheDocument();
    expect(screen.getByText(/Entered your code\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: friendLinkCopy.request.accept })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: friendLinkCopy.request.decline })).toBeInTheDocument();
    expect(container.querySelector('[data-kind="friend-request"][data-unseen]')).not.toBeNull();
    rerender(<WaitingOnYou rows={[row(false)]} now={NOW} />);
    expect(container.querySelector('[data-kind="friend-request"][data-unseen]')).toBeNull();
  });

  it("turns an Accept into the FRIENDS receipt in place", async () => {
    render(<WaitingOnYou rows={[row(true)]} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: friendLinkCopy.request.accept })));
    expect(a.answer).toHaveBeenCalledWith("p-colin", "accept");
    expect(document.querySelector('[data-receipt="friend:p-colin"][data-answer="accept"]')).not.toBeNull();
  });

  it("offers Put back on a Decline, which takes the receipt away and asks the server to undo it", async () => {
    render(<WaitingOnYou rows={[row(true)]} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: friendLinkCopy.request.decline })));
    expect(document.querySelector('[data-receipt="friend:p-colin"][data-answer="decline"]')).not.toBeNull();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: friendLinkCopy.request.putBack })));
    expect(a.undo).toHaveBeenCalledWith("p-colin");
    expect(document.querySelector('[data-receipt="friend:p-colin"]')).toBeNull();
  });

  it("keeps the row and says so when the answer fails", async () => {
    a.answer.mockResolvedValue(false);
    render(<WaitingOnYou rows={[row(true)]} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: friendLinkCopy.request.accept })));
    expect(document.querySelector('[data-kind="friend-request"]')).not.toBeNull();
    expect(screen.getByText(friendLinkCopy.request.failed)).toBeInTheDocument();
  });
});
