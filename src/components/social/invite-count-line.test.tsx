// The invite count line (invites PR 4, C1 to C5): its words for every count, the holding parts as their own spans,
// and Out of invites in --fg-faint.
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InviteCountLine, inviteCountText } from "./invite-count-line";
import type { InviteCount } from "../../lib/invites/rules";

const count = (over: Partial<InviteCount> = {}): InviteCount => ({ left: 3, waiting: 0, liveQr: false, out: false, ...over });
afterEach(cleanup);

describe("the count line", () => {
  it.each<[Partial<InviteCount>, boolean, string]>([
    [{}, false, "3 invites left"],
    [{ left: 1 }, false, "1 invite left"],
    [{ left: 2, waiting: 1 }, false, "2 invites left · 1 waiting"],
    [{ left: 1, waiting: 2 }, false, "1 invite left · 2 waiting"],
    [{ left: 2, liveQr: true }, false, "2 invites left · 1 held by an open QR"],
    [{ left: 2, liveQr: true }, true, "2 invites left · 1 held by this QR"],
    [{ left: 0, out: true }, false, "Out of invites"],
    [{ left: 0, out: true, waiting: 1, liveQr: true }, true, "Out of invites · 1 waiting · 1 held by this QR"],
  ])("reads %j (this QR: %s) as %s", (over, thisQr, text) => {
    expect(inviteCountText(count(over), thisQr)).toBe(text);
    const { container } = render(<InviteCountLine count={count(over)} thisQr={thisQr} />);
    expect(container.textContent).toBe(text);
  });

  it("draws the waiting and held parts as --fg-body spans, and Out of invites in --fg-faint", () => {
    const { container, rerender } = render(<InviteCountLine count={count({ waiting: 1, liveQr: true })} />);
    const parts = container.querySelectorAll("[data-invite-count] > span");
    expect(parts).toHaveLength(2);
    parts.forEach((p) => expect(p.className).toContain("--fg-body"));
    rerender(<InviteCountLine count={count({ left: 0, out: true })} />);
    expect(container.querySelector("[data-invite-count]")?.className).toContain("--fg-faint");
    rerender(<InviteCountLine count={count({ left: 0, out: true })} tone="off" />);
    expect(container.querySelector("[data-invite-count]")?.className).toContain("--fg-muted");
  });
});
