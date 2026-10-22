import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { showcaseCopy, writtenForYouCopy } from "../../../lib/copy/discovery";
import { showcaseGroups, writtenForYou, type ShowcaseInput } from "../../../lib/discovery/showcase";
import { TOOLS } from "../../../lib/discovery/tools";
import { ToolCard } from "./tool-card";
import { ToolsTab } from "./tools-tab";

afterEach(cleanup);

const input = (over: Partial<ShowcaseInput> = {}): ShowcaseInput => ({
  isOn: () => true,
  visibleEntryIds: new Set(TOOLS.map((t) => t.entry)),
  fits: {
    "top-off": { decks: [] },
    "proposed-cuts": { decks: [{ id: "d1", name: "HD - Kratos" }] },
    "mana-balance": { decks: [{ id: "d2", name: "Gishath" }, { id: "d3", name: "Atraxa" }] },
    "friend-spares": { decks: [] },
  },
  deckCount: 3,
  hasSyncBase: true,
  place: false,
  ...over,
});

const cardOf = (container: HTMLElement, id: string) => container.querySelector<HTMLElement>(`[data-tool-card="${id}"]`)!;
const shot = { src: "/about/shots/amonkhet/tool-top-off.webp", width: 780, height: 520, halo: { x: 0.1, y: 0.2, w: 0.3, h: 0.1 } };

describe("ToolCard, its five states (STATES 'A tool card')", () => {
  const groups = showcaseGroups(input());
  const model = (id: string) => groups.flatMap((g) => g.cards).find((c) => c.id === id)!;

  it("one deck fits: the whole card is one link, named for the deck, its footer saying where it opens", () => {
    const { container } = render(<ToolCard card={model("proposed-cuts")} shot={null} />);
    const press = screen.getByRole("link", { name: "Try it on HD - Kratos" });
    expect(press.getAttribute("href")).toBe("/decks/d1?tool=proposed-cuts");
    expect(cardOf(container, "proposed-cuts").textContent).toContain("Opens HD - Kratos");
    // The shipped chip, verbatim (R2 gap 4).
    expect(cardOf(container, "proposed-cuts").textContent).toContain(TOOLS.find((t) => t.id === "proposed-cuts")!.credit!);
    // How it works is its own link, above the stretched one.
    expect(screen.getByRole("link", { name: showcaseCopy.howItWorks }).getAttribute("href")).toBe("/about?tab=reference#proposed-cuts");
  });

  it("several fit: the footer counts the others", () => {
    const { container } = render(<ToolCard card={model("mana-balance")} shot={null} />);
    expect(cardOf(container, "mana-balance").textContent).toContain("Opens Gishath · +1");
    expect(screen.getByRole("link", { name: "Try it on Gishath" })).toBeTruthy();
  });

  it("none fits, no door: not a press, one line saying what it needs, and How it works", () => {
    const { container } = render(<ToolCard card={model("top-off")} shot={shot} />);
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual([showcaseCopy.howItWorks]);
    expect(cardOf(container, "top-off").textContent).toContain(showcaseCopy.tools["top-off"].none);
  });

  it("none fits, a door: the line, How it works and the door", () => {
    render(<ToolCard card={model("friend-spares")} shot={null} />);
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual([showcaseCopy.howItWorks, "Open Friends →"]);
    expect(screen.getByRole("link", { name: "Open Friends →" }).getAttribute("href")).toBe("/friends");
  });

  it("needs no deck: the card opens the tool's page, named for it", () => {
    render(<ToolCard card={model("help-me-choose")} shot={null} />);
    expect(screen.getByRole("link", { name: "Open Help me choose" }).getAttribute("href")).toBe("/decks/new/choose?tool=help-me-choose");
  });

  it("draws the capture with its control haloed, and nothing when there is no capture", () => {
    const { container, rerender } = render(<ToolCard card={model("top-off")} shot={shot} />);
    expect(container.querySelector("img")!.getAttribute("src")).toBe(shot.src);
    expect(container.querySelector("img")!.getAttribute("alt")).toBe("Top off, on a real screen of the app");
    expect(screen.getByRole("article", { name: "Top off" })).toBeTruthy();
    const halo = container.querySelector<HTMLElement>("[data-tool-card-halo]")!;
    expect(halo.style.left).toBe("10%");
    expect(halo.style.width).toBe("30%");
    rerender(<ToolCard card={model("top-off")} shot={null} />);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("ToolsTab", () => {
  const written = writtenForYou(
    writtenForYouCopy.rows.map((r) => r.line).join("\n") + "\n" + writtenForYouCopy.historyLine,
  );

  it("draws each group with its cards, and Written for you with its rows and the credits entry", () => {
    const { container } = render(<ToolsTab groups={showcaseGroups(input())} written={written} creditsEntry="credits" allowance="five" theme="amonkhet" />);
    expect([...container.querySelectorAll("[data-tool-group]")].map((s) => s.getAttribute("data-tool-group"))).toEqual([
      "start", "tune", "buy", "own", "play",
    ]);
    expect(container.querySelectorAll("[data-tool-card]")).toHaveLength(14);
    const w = container.querySelector<HTMLElement>("[data-written-for-you]")!;
    expect(w.textContent).toContain(writtenForYouCopy.intro("five"));
    expect(w.querySelectorAll("[data-written-row]")).toHaveLength(5);
    expect(within(w).getByRole("link", { name: writtenForYouCopy.how }).getAttribute("href")).toBe("/about?tab=reference#credits");
    expect(screen.getByRole("link", { name: "Open the Reference →" }).getAttribute("href")).toBe("/about?tab=reference");
  });

  it("each picture is the reader's theme's capture, and an unknown theme reads the default's", () => {
    const { container, rerender } = render(<ToolsTab groups={showcaseGroups(input())} written={null} creditsEntry="credits" allowance="five" theme="kaldheim" />);
    expect(container.querySelector('[data-tool-card="top-off"] img')!.getAttribute("src")).toBe("/about/shots/kaldheim/tool-top-off.webp");
    rerender(<ToolsTab groups={showcaseGroups(input())} written={null} creditsEntry="credits" allowance="five" theme="nonsense" />);
    expect(container.querySelector('[data-tool-card="top-off"] img')!.getAttribute("src")).toBe("/about/shots/amonkhet/tool-top-off.webp");
  });

  // Which switches leave Written for you empty is `writtenForYou`'s rule, tested in showcase.test.ts; here the tab only
  // has to draw nothing for the null it is handed.
  it("with a group's switches off, draws no section for it, and no Written for you when handed none", () => {
    const off = new Set(["SWAP_TOOLS_ENABLED", "SOCIAL_FRIENDS_ENABLED"]);
    const { container } = render(
      <ToolsTab groups={showcaseGroups(input({ isOn: (n) => !off.has(n) }))} written={null} creditsEntry="credits" allowance="five" theme={undefined} />,
    );
    expect(container.querySelector('[data-tool-group="buy"]')).toBeNull();
    expect(container.querySelector("[data-written-for-you]")).toBeNull();
  });
});
