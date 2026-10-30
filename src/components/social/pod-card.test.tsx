// The pod card's edit state (small items item 7, board `Pod-Edit`): at rest no seat carries a control; the owner's
// Edit shows every seat's ✕ but their own, the card's edge goes accent and Done replaces Edit and the `…`; Done,
// Escape or being left alone ends it; focus moves Edit → first ✕, Done → Edit, and after a removal to the next ✕.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { PodCard } from "./pod-card";
import { socialCopy } from "../../lib/copy/social";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";
import type { Pod, PodMember } from "../../lib/social/access";

const P = socialCopy.pods;
const member = (over: Partial<Omit<PodMember, "displayName">> & { displayName: string }): PodMember => ({
  publicId: `p-${over.displayName}`, joinedAt: new Date("2026-10-01"), isOwner: false, isYou: false, isFriend: true, commander: null, ...over, displayName: named(over.displayName),
});
const ME = member({ displayName: "Hugh", isYou: true, isOwner: true });
const DAVE = member({ displayName: "Dave" });
const PRIYA = member({ displayName: "Priya" });
const pod = (over: Partial<Pod> = {}): Pod => ({ id: "pod-1", name: named("Thursday"), isOwner: true, members: [ME, DAVE, PRIYA], nextOwner: null, ...over });

function draw(p: Pod, onRemove = vi.fn()) {
  const props = { shared: false, onRemove, onAdd: vi.fn(), onShare: vi.fn(), onRename: vi.fn(), onLeave: vi.fn(), onDelete: vi.fn() };
  const out = render(<PodCard pod={p} {...props} />);
  return { ...out, onRemove, redraw: (next: Pod) => out.rerender(<PodCard pod={next} {...props} />) };
}
const removes = () => screen.queryAllByRole("button", { name: /^Remove / });
const cardEl = () => screen.getByTestId("pod-card");

afterEach(cleanup);

describe("the pod card marks every name it draws (PersonName plan)", () => {
  it("opts the pod name, each other member, the ✕ and the menu out of autocapture, and leaves yours plain", () => {
    draw(pod());
    fireEvent.click(screen.getByRole("button", { name: P.edit }));
    expect(within(screen.getByTestId("pod-name")).getByText("Thursday").className).toBe("ph-no-capture");
    const names = screen.getAllByTestId("pod-seat-name");
    expect(names.map((n) => n.textContent)).toEqual([P.you, "Dave", "Priya"]);
    expect(names[0].querySelector(".ph-no-capture")).toBeNull();
    expect(names[1].querySelector(".ph-no-capture")?.textContent).toBe("Dave");
    for (const b of removes()) expect(b.className).toContain("ph-no-capture");
    expect(screen.getByRole("list", { name: "Thursday" }).className).toContain("ph-no-capture");
  });
});

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
    expect(removes().map((b) => b.getAttribute("aria-label"))).toEqual([plain(P.removeMemberAria(named("Dave"), named("Thursday"))), plain(P.removeMemberAria(named("Priya"), named("Thursday")))]);
    expect(cardEl().className).toContain("shadow-[inset_0_0_0_1px_var(--accent)]");
    expect(screen.queryByRole("button", { name: P.edit })).toBeNull();
    expect(screen.queryByRole("button", { name: plain(P.menuAria(named("Thursday"))) })).toBeNull();
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

  it("after removing the last ✕ in the row, focus goes to Done, not back to an earlier ✕", () => {
    const { redraw } = draw(pod());
    fireEvent.click(screen.getByRole("button", { name: P.edit }));
    fireEvent.click(removes()[1]);
    act(() => redraw(pod({ members: [ME, DAVE] })));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: P.done }));
  });

  it("removes at once through onRemove, focus on the next ✕, and ends once you are the only member left", () => {
    const { onRemove, redraw } = draw(pod());
    fireEvent.click(screen.getByRole("button", { name: P.edit }));
    fireEvent.click(removes()[0]);
    expect(onRemove).toHaveBeenCalledWith(DAVE);
    act(() => redraw(pod({ members: [ME, PRIYA] })));
    expect(document.activeElement).toBe(within(cardEl()).getByRole("button", { name: plain(P.removeMemberAria(named("Priya"), named("Thursday"))) }));
    fireEvent.click(removes()[0]);
    act(() => redraw(pod({ members: [ME] })));
    expect(removes()).toHaveLength(0);
    expect(screen.queryByRole("button", { name: P.done })).toBeNull();
    // Left alone: focus goes to the card's menu, and a friend added later does not reopen the edit state.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: plain(P.menuAria(named("Thursday"))) }));
    act(() => redraw(pod({ members: [ME, DAVE] })));
    expect(removes()).toHaveLength(0);
    expect(screen.getByRole("button", { name: P.edit })).toBeInTheDocument();
  });

  it("ends editing on its own when the last other member leaves on a redraw, with focus on the menu, not the page", () => {
    const { redraw } = draw(pod({ members: [ME, DAVE] }));
    fireEvent.click(screen.getByRole("button", { name: P.edit }));
    expect(document.activeElement).toBe(removes()[0]);
    act(() => redraw(pod({ members: [ME] })));
    expect(removes()).toHaveLength(0);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: plain(P.menuAria(named("Thursday"))) }));
  });

  it("leaves an Escape from outside the card (a sheet portaled over the page) to that sheet", () => {
    draw(pod());
    fireEvent.click(screen.getByRole("button", { name: P.edit }));
    // A portal's keydown reaches the card's handler through the React tree while its target sits outside the card's
    // DOM: call the handler as React would, with such a target.
    const sheet = document.createElement("div");
    document.body.appendChild(sheet);
    const props = (cardEl() as unknown as Record<string, { onKeyDown?: (e: unknown) => void }>)[Object.keys(cardEl()).find((k) => k.startsWith("__reactProps"))!];
    const stop = vi.fn();
    act(() => props.onKeyDown?.({ key: "Escape", target: sheet, stopPropagation: stop }));
    sheet.remove();
    expect(stop).not.toHaveBeenCalled();
    expect(removes()).toHaveLength(2);
    // From inside the card it still ends editing.
    fireEvent.keyDown(removes()[0], { key: "Escape" });
    expect(removes()).toHaveLength(0);
  });

  it("holds Edit while a Leave or Delete is in flight", async () => {
    let land!: (v: boolean) => void;
    const onLeave = vi.fn(() => new Promise<boolean>((r) => { land = r; }));
    render(<PodCard pod={pod()} shared={false} onRemove={vi.fn()} onAdd={vi.fn()} onShare={vi.fn()} onRename={vi.fn()} onLeave={onLeave} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: plain(P.menuAria(named("Thursday"))) }));
    fireEvent.click(screen.getByRole("menuitem", { name: P.leave }));
    const confirm = screen.getAllByRole("button").find((b) => b.textContent === P.leave && b.getAttribute("role") !== "menuitem");
    await act(async () => { fireEvent.click(confirm!); });
    expect(onLeave).toHaveBeenCalled();
    expect((screen.getByRole("button", { name: P.edit }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { land(false); });
    expect((screen.getByRole("button", { name: P.edit }) as HTMLButtonElement).disabled).toBe(false);
  });
});
