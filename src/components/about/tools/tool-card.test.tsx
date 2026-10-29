import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ToolCardModel } from "../../../lib/discovery/showcase";
import { TOOL_DOOR, TOOL_PRESS, ToolCard } from "./tool-card";

// The tool card, one way in (About Addendum R4 board 5): one press per card, the picture inert, the Where line under the
// description; a deck card's button names its deck, a none card's door is a secondary button, no door no button.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("../../shell/pending-reporter", () => ({ PendingReporter: () => null }));

const SHOW_ME = "/about/decks?lit=decks%2Fanalysis%2Fcuts#analysis";
const LINK = { href: SHOW_ME, label: "Show it above ↑" };
const SHOT = { src: "/x.webp", width: 780, height: 520, halo: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } };

const model = (state: ToolCardModel["state"], extra: Partial<ToolCardModel> = {}): ToolCardModel =>
  ({
    id: "proposed-cuts",
    copy: { name: "Proposed cuts", line: "Counts where a deck runs long." },
    credit: null,
    entry: "proposed-cuts",
    note: null,
    state,
    ...extra,
  }) as unknown as ToolCardModel;

const draw = (state: ToolCardModel["state"], extra: Partial<ToolCardModel> = {}) =>
  render(<ToolCard card={model(state, extra)} shot={SHOT as never} link={LINK} />).container;

const presses = (c: HTMLElement) => [...c.querySelectorAll<HTMLAnchorElement>("[data-tool-card-press]")];

describe("ToolCard: one press per card", () => {
  it("a deck card's one button reads Try it on {deck} and goes to its href", () => {
    const c = draw({ kind: "deck", href: "/decks/d1?tool=proposed-cuts", deck: "Kinnan", more: 2 });
    const [btn, ...others] = presses(c);
    expect(others).toHaveLength(0);
    expect(btn.getAttribute("href")).toBe("/decks/d1?tool=proposed-cuts");
    expect(btn.textContent).toBe("Try it on Kinnan→");
    expect(btn.className).toBe(TOOL_PRESS);
    // The +N count is not carried (R4 ruling 1); the old footer caption is gone.
    expect(c.textContent).not.toContain("+2");
    expect(c.textContent).not.toContain("Opens");
  });

  it("a page card's one button carries its press label", () => {
    const c = draw({ kind: "page", href: "/precons?tool=precons", label: "Browse precons" });
    expect(presses(c).map((a) => [a.getAttribute("href"), a.textContent])).toEqual([["/precons?tool=precons", "Browse precons→"]]);
  });

  it("a none card's door is its one button, in the secondary style; no door, no button", () => {
    const door = draw({ kind: "none", line: "Needs a friend with a spare.", door: { href: "/friends", label: "Open Friends →" } });
    const [btn, ...others] = presses(door);
    expect(others).toHaveLength(0);
    expect([btn.getAttribute("href"), btn.textContent]).toEqual(["/friends", "Open Friends →"]);
    expect(btn.className).toBe(TOOL_DOOR);
    expect(btn.className).not.toContain("bg-[color:var(--accent)]");
    expect(door.textContent).toContain("Needs a friend with a spare.");
    const shut = draw({ kind: "none", line: "Needs a deck.", door: null });
    expect(presses(shut)).toHaveLength(0);
    expect(shut.textContent).toContain("Needs a deck.");
  });

  it("only the button and the Where line are links: the picture and the body are no hit area", () => {
    for (const state of [
      { kind: "deck", href: "/decks/d1", deck: "Kinnan", more: 0 },
      { kind: "page", href: "/precons", label: "Browse precons" },
      { kind: "none", line: "x", door: { href: "/friends", label: "Open Friends →" } },
    ] as ToolCardModel["state"][]) {
      const c = draw(state);
      const links = [...c.querySelectorAll("a")];
      expect(links).toHaveLength(2);
      expect(links.every((a) => a.hasAttribute("data-tool-card-press") || a.hasAttribute("data-tool-card-where"))).toBe(true);
      const img = c.querySelector("img")!;
      expect(img.closest("a")).toBeNull();
      expect(img.getAttribute("alt")).not.toBe("");
      expect(c.querySelector("[data-tool-card-halo]")!.closest("a")).toBeNull();
      // No stretched link over the card.
      expect(c.querySelector("a.absolute, a[class*='inset-0']")).toBeNull();
    }
  });

  it("the Where line lights the tool's label (Show me's target) and sits before the button", () => {
    const c = draw({ kind: "deck", href: "/decks/d1", deck: "Kinnan", more: 0 }, { note: "Reads your last commit", credit: "1 credit" });
    const where = c.querySelector<HTMLAnchorElement>("[data-tool-card-where]")!;
    expect(where.getAttribute("href")).toBe(SHOW_ME);
    expect(where.textContent).toBe("Show it above ↑");
    // Shipped order: name and credit chip, line, the mono lines, then Where, then the button.
    const body = where.parentElement!;
    const order = [...body.children].map((e) => e.textContent);
    expect(order).toEqual([
      "Proposed cuts1 credit",
      "Counts where a deck runs long.",
      "Reads your last commit",
      "Show it above ↑",
      "Try it on Kinnan→",
    ]);
    // Review round 1: a coarse pointer gets a real 44px row, never a hit drawn past the line over the inert body.
    expect(where.className).toContain("pointer-coarse:min-h-[44px]");
    expect(where.className).not.toContain("after:content-");
  });

  it("frames the picture apart from the words, and the button sits at the card's foot from md", () => {
    const c = draw({ kind: "page", href: "/p", label: "Go" });
    const pic = c.querySelector("img")!.parentElement!;
    for (const t of ["aspect-[3/2]", "rounded-[9px]", "border-[color:var(--border-strong)]"]) expect(pic.className).toContain(t);
    const card = c.querySelector<HTMLElement>("[data-tool-card]")!;
    expect(card.className).toContain("h-full");
    expect(card.className).toContain("border-[color:var(--border-strong)]");
    expect(presses(c)[0].className).toContain("md:mt-auto");
  });

  it("a lit card keeps the accent border and ring", () => {
    const c = render(<ToolCard card={model({ kind: "page", href: "/p", label: "Go" })} shot={null} link={LINK} lit />).container;
    const card = c.querySelector<HTMLElement>("[data-tool-card]")!;
    expect(card.hasAttribute("data-lit")).toBe(true);
    expect(card.className).toContain("border-[color:var(--accent)]");
  });
});
