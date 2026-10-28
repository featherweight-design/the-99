// The pod card's edit state (small items item 7, board `Pod-Edit`): at rest no seat carries a control; the owner's
// Edit shows every seat's ✕ but their own, the card's edge goes accent and Done replaces Edit and the `…`; Done,
// Escape or being left alone ends it; focus moves Edit → first ✕, Done → Edit, and after a removal to the next ✕.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { PodCard } from "./pod-card";
import { socialCopy } from "../../lib/copy/social";
import type { Pod, PodMember } from "../../lib/social/access";

const P = socialCopy.pods;
const member = (over: Partial<PodMember> & { displayName: string }): PodMember => ({
  publicId: `p-${over.displayName}`, joinedAt: new Date("2026-10-01"), isOwner: false, isYou: false, isFriend: true, commander: null, ...over,
});
const ME = member({ displayName: "Hugh", isYou: true, isOwner: true });
const DAVE = member({ displayName: "Dave" });
const PRIYA = member({ displayName: "Priya" });
const pod = (over: Partial<Pod> = {}): Pod => ({ id: "pod-1", name: "Thursday", isOwner: true, members: [ME, DAVE, PRIYA], nextOwner: null, ...over });

function draw(p: Pod, onRemove = vi.fn()) {
  const props = { shared: false, onRemove, onAdd: vi.fn(), onShare: vi.fn(), onRename: vi.fn(), onLeave: vi.fn(), onDelete: vi.fn() };
  const out = render(<PodCard pod={p} {...props} />);
  return { ...out, onRemove, redraw: (next: Pod) => out.rerender(<PodCard pod={next} {...props} />) };
}
const removes = () => screen.queryAllByRole("button", { name: /^Remove / });
const cardEl = () => screen.getByTestId("pod-card");

afterEach(cleanup);

describe("the pod card's edit state", () => {
  it("draws no seat control at rest, and Edit only for the owner of a pod with someone else in it", () => {
    draw(pod());
    expect(removes()).toHaveLength(0);
    expect(screen.getByRole("button", { name: P.edit })).toBeInTheDocument();
    cleanup();
    draw(pod({ isOwner: false, members: [{ ...ME, isOwner: false }, { ...DAVE, isOwner: true }] }));
    expect(screen.queryByRole("button", { name: P.edit })).toBeNull();
    cleanup();
    draw(pod({ members: [ME] }));
    expect(screen.queryByRole("button", { name: P.edit })).toBeNull();
  });

  it("Edit shows every ✕ but yours, edges the card in the accent, swaps in Done and moves focus to the first ✕", () => {
    draw(pod());
    fireEvent.click(screen.getByRole("button", { name: P.edit }));
    expect(removes().map((b) => b.getAttribute("aria-label"))).toEqual([P.removeMemberAria("Dave", "Thursday"), P.removeMemberAria("Priya", "Thursday")]);
    expect(cardEl().className).toContain("shadow-[inset_0_0_0_1px_var(--accent)]");
    expect(screen.queryByRole("button", { name: P.edit })).toBeNull();
    expect(screen.queryByRole("button", { name: /More|…|···/ })).toBeNull();
    expect(screen.getByRole("button", { name: P.done })).toBeInTheDocument();
    expect(document.activeElement).toBe(removes()[0]);
  });

  it("Done and Escape each end it, focus back on Edit", () => {
    draw(pod());
    fireEvent.click(screen.getByRole("button", { name: P.edit }));
    fireEvent.click(screen.getByRole("button", { name: P.done }));
    expect(removes()).toHaveLength(0);
    expect(cardEl().className).not.toContain("--accent)]");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: P.edit }));
    fireEvent.click(screen.getByRole("button", { name: P.edit }));
    fireEvent.keyDown(removes()[0], { key: "Escape" });
    expect(removes()).toHaveLength(0);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: P.edit }));
  });

  it("removes at once through onRemove, focus on the next ✕, and ends once you are the only member left", () => {
    const { onRemove, redraw } = draw(pod());
    fireEvent.click(screen.getByRole("button", { name: P.edit }));
    fireEvent.click(removes()[0]);
    expect(onRemove).toHaveBeenCalledWith(DAVE);
    act(() => redraw(pod({ members: [ME, PRIYA] })));
    expect(document.activeElement).toBe(within(cardEl()).getByRole("button", { name: P.removeMemberAria("Priya", "Thursday") }));
    fireEvent.click(removes()[0]);
    act(() => redraw(pod({ members: [ME] })));
    expect(removes()).toHaveLength(0);
    expect(screen.queryByRole("button", { name: P.done })).toBeNull();
  });
});
