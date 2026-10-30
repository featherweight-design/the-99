import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaggedBox } from "./tagged-box";

function box(props: Partial<React.ComponentProps<typeof TaggedBox>> = {}) {
  return render(
    <TaggedBox onInsert={() => {}} count={0} max={240} {...props}>
      <textarea aria-label="field" />
    </TaggedBox>,
  );
}
const key = () => screen.getByRole("button", { name: "Insert a card tag" });

describe("TaggedBox", () => {
  it("draws the counter from 0 / N and the shared words by default", () => {
    box();
    expect(screen.getByText("0 / 240")).toBeInTheDocument();
    expect(screen.getByText("tag a card")).toHaveAttribute("aria-hidden", "true");
  });

  it("takes other words, or none", () => {
    const { unmount } = box({ words: "name a card" });
    expect(screen.getByText("name a card")).toBeInTheDocument();
    unmount();
    box({ words: "" });
    expect(screen.queryByText("tag a card")).toBeNull();
  });

  it("lights the key only while open", () => {
    const { rerender } = box();
    expect(key().className).not.toContain("bg-[color:var(--elevated)]");
    rerender(<TaggedBox onInsert={() => {}} count={0} max={240} open><textarea aria-label="field" /></TaggedBox>);
    expect(key().className).toContain("bg-[color:var(--elevated)]");
    expect(key().className).toContain("text-[color:var(--fg)]");
  });

  it("colors the counter faint, then warning from warnAt, then danger past the cap", () => {
    const { rerender } = box({ count: 219, warnAt: 220 });
    expect(screen.getByText("219 / 240")).toHaveStyle({ color: "var(--fg-faint)" });
    rerender(<TaggedBox onInsert={() => {}} count={220} max={240} warnAt={220}><textarea aria-label="field" /></TaggedBox>);
    expect(screen.getByText("220 / 240")).toHaveStyle({ color: "var(--warning)" });
    rerender(<TaggedBox onInsert={() => {}} count={241} max={240} warnAt={220}><textarea aria-label="field" /></TaggedBox>);
    expect(screen.getByText("241 / 240")).toHaveStyle({ color: "var(--danger)" });
  });

  it("never warns without warnAt, and an explicit over wins", () => {
    const { rerender } = box({ count: 239 });
    expect(screen.getByText("239 / 240")).toHaveStyle({ color: "var(--fg-faint)" });
    rerender(<TaggedBox onInsert={() => {}} count={10} max={240} over><textarea aria-label="field" /></TaggedBox>);
    expect(screen.getByText("10 / 240")).toHaveStyle({ color: "var(--danger)" });
  });

  it("puts the counter id on the counter", () => {
    box({ counterId: "c-1" });
    expect(screen.getByText("0 / 240")).toHaveAttribute("id", "c-1");
  });

  it("draws the frame dashed and sunken when asked, solid and on the surface otherwise", () => {
    const { unmount } = box();
    const plain = document.querySelector("[data-framed-box]")!;
    expect(plain.className).toContain("border-solid");
    expect(plain.className).toContain("bg-[color:var(--surface)]");
    unmount();
    box({ dashed: true, fill: "sunken" });
    const dashed = document.querySelector("[data-framed-box]")!;
    expect(dashed.className).toContain("border-dashed");
    expect(dashed.className).toContain("bg-[color:var(--surface-sunken)]");
  });

  it("takes the accent edge on focus, or always, and the danger edge on error", () => {
    const { unmount } = box();
    expect(document.querySelector("[data-framed-box]")!.className).toContain("focus-within:border-[color:var(--accent)]");
    unmount();
    const always = box({ accent: "always" });
    const cls = document.querySelector("[data-framed-box]")!.className;
    expect(cls).toContain("border-[color:var(--accent)]");
    expect(cls).not.toContain("focus-within");
    always.unmount();
    box({ error: true });
    expect(document.querySelector("[data-framed-box]")!.className).toContain("border-[color:var(--danger)]");
  });

  it("gives the standard focus ring to a frame already accent or danger, and none to the normal state", () => {
    const ring = ["has-[:focus-visible]:outline-2", "has-[:focus-visible]:outline-offset-2", "has-[:focus-visible]:outline-[color:var(--accent)]"];
    const cls = () => document.querySelector("[data-framed-box]")!.className;
    const normal = box();
    for (const c of ring) expect(cls()).not.toContain(c);
    normal.unmount();
    const always = box({ accent: "always" });
    for (const c of ring) expect(cls()).toContain(c);
    always.unmount();
    const danger = box({ error: true });
    for (const c of ring) expect(cls()).toContain(c);
    danger.unmount();
    box({ count: 241 });
    for (const c of ring) expect(cls()).toContain(c);
  });

  it("accent none draws no focus-within accent on the frame and adds no ring class; the foot takes pointer events", () => {
    box({ accent: "none" });
    const frame = document.querySelector("[data-framed-box]")!;
    expect(frame.className).not.toContain("focus-within");
    expect(frame.className).not.toContain("has-[:focus-visible]");
    expect(frame.className).toContain("border-[color:var(--border-strong)]");
    expect(screen.getByText("0 / 240").parentElement!.className).toContain("pointer-events-auto");
  });

  it("draws the danger frame past the cap on its own, and an explicit error=false or true wins", () => {
    const { rerender } = box({ count: 241, accent: "always" });
    const cls = () => document.querySelector("[data-framed-box]")!.className;
    expect(cls()).toContain("border-[color:var(--danger)]");
    expect(cls()).not.toContain("border-[color:var(--accent)]");
    rerender(<TaggedBox onInsert={() => {}} count={241} max={240} error={false}><textarea aria-label="field" /></TaggedBox>);
    expect(cls()).not.toContain("border-[color:var(--danger)]");
    rerender(<TaggedBox onInsert={() => {}} count={3} max={240}><textarea aria-label="field" /></TaggedBox>);
    expect(cls()).not.toContain("border-[color:var(--danger)]");
  });

  it("keeps the field's focus on a press of the foot's padding or counter, and spreads footProps on the foot", () => {
    box({ footProps: { "data-lock-hide": "" } });
    const foot = screen.getByText("0 / 240").parentElement!;
    expect(foot).toHaveAttribute("data-lock-hide");
    expect(fireEvent.mouseDown(foot)).toBe(false);
    expect(fireEvent.mouseDown(screen.getByText("0 / 240"))).toBe(false);
  });

  it("spreads keyProps on the key and keeps the field's focus on a press", () => {
    const onInsert = vi.fn();
    box({ onInsert, keyProps: { "data-lock-hide": "" } });
    expect(key()).toHaveAttribute("data-lock-hide");
    expect(fireEvent.mouseDown(key())).toBe(false); // default prevented
    fireEvent.click(key());
    expect(onInsert).toHaveBeenCalledOnce();
  });

  it("keeps the key 24 high with a hit box that grows on touch, and a compact foot", () => {
    box({ footPad: "compact" });
    expect(key().className).toContain("h-[24px]");
    expect(key().className).toContain("pointer-coarse:after:-inset-y-[10px]");
    expect(key().className).toContain("pointer-coarse:after:-inset-x-[8px]");
    expect(key().className).toContain("shrink-0");
    expect(key().parentElement!.className).toContain("pb-[7px]");
  });
});
