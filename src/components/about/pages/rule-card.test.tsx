import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ABOUT_PAGE_STRINGS, ABOUT_RULES, ABOUT_RULE_IDS } from "../../../lib/copy/about-pages";
import { ruleKey, visibleSections } from "../../../lib/about/pages-visible";
import { SWITCH_NAMES } from "../../../lib/switches/registry";
import { currentCard, GoodToKnow, RuleCard, type RuleCardModel } from "./rule-card";

// Good to know (About visual PR 4; call 2, call 8 and R3): one card per visible rule, each with its own diagram and the
// rule's visible words; no heading at all for a section with no rules; a phone dot per card.
const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const ALL_ON = env(Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"])));
const without = (...off: string[]) => env({ ...(ALL_ON as Record<string, string>), ...Object.fromEntries(off.map((n) => [n, "off"])) });

const rulesOf = (e: NodeJS.ProcessEnv, section: string): RuleCardModel[] =>
  visibleSections(e)
    .find((s) => s.id === section)!
    .rules.map((r) => ({ key: r.key, text: r.text, diagram: r.diagram! }));

describe("RuleCard", () => {
  it("draws every rule's own diagram, from the app's pieces, with the rule's words", () => {
    for (const id of ABOUT_RULE_IDS) {
      const rule = visibleSections(ALL_ON).flatMap((s) => s.rules).find((r) => r.key === ruleKey(id))!;
      const { container, unmount } = render(<RuleCard rule={{ key: rule.key, text: rule.text, diagram: rule.diagram! }} />);
      const card = container.querySelector(`[data-rule="${ruleKey(id)}"]`)!;
      expect(card, id).not.toBeNull();
      expect(card.querySelector("[data-diagram]")!.getAttribute("data-diagram"), id).toBe(ABOUT_RULES[id].diagram.kind);
      expect(card.querySelectorAll("[data-diagram-part]").length, id).toBeGreaterThan(0);
      expect(card.textContent, id).toContain(rule.text);
      unmount();
    }
  });

  it("draws the shipped pieces the diagram names: the bracket mark, the buy tag, the lock, the status pill", () => {
    const one = (id: (typeof ABOUT_RULE_IDS)[number]) => {
      const r = rulesOf(ALL_ON, visibleSections(ALL_ON).find((s) => s.rules.some((x) => x.key === ruleKey(id)))!.id)
        .find((x) => x.key === ruleKey(id))!;
      return render(<RuleCard rule={r} />).container;
    };
    expect(one("intent").querySelectorAll(".bracket-mark")).toHaveLength(2);
    expect(one("lock").querySelector('[data-testid="lock-mark"]')).not.toBeNull();
    expect(one("prices").textContent).toContain("$54.16");
    expect(one("hidden-deck").textContent).toContain("Complete");
  });

  // Small items 3, item 1: a row's name gave way to its tag in a narrow side-by-side column ("Gha…", "Sol R…").
  it("draws every row in a column 250px wide that sits alone, with no part translucent", () => {
    for (const id of ABOUT_RULE_IDS) {
      const rule = visibleSections(ALL_ON).flatMap((s) => s.rules).find((r) => r.key === ruleKey(id))!;
      const { container, unmount } = render(<RuleCard rule={{ key: rule.key, text: rule.text, diagram: rule.diagram! }} />);
      for (const row of container.querySelectorAll('[data-diagram-part="row"]')) {
        const column = row.parentElement as HTMLElement;
        expect(parseFloat(column.style.width), id).toBeGreaterThanOrEqual(250);
        // The column is the diagram's head or foot (a child of the diagram itself), or its one column.
        const holder = column.parentElement!;
        if (!holder.hasAttribute("data-diagram")) expect(holder.children, id).toHaveLength(1);
      }
      expect(container.querySelector('[class*="opacity-"]'), id).toBeNull();
      unmount();
    }
  });

  it("draws a set-back row's edge dashed and strikes a gone row's name, its tag kept whole", () => {
    const rule = visibleSections(ALL_ON).flatMap((s) => s.rules).find((r) => r.key === ruleKey("replace"))!;
    const { container } = render(<RuleCard rule={{ key: rule.key, text: rule.text, diagram: rule.diagram! }} />);
    const gone = [...container.querySelectorAll('[data-diagram-part="row"]')].find((r) => r.textContent!.startsWith("Thrasios"))!;
    expect(gone.querySelector(".line-through")!.textContent).toBe("Thrasios");
    expect(gone.textContent).toContain("not in the file");
    const one = visibleSections(ALL_ON).flatMap((s) => s.rules).find((r) => r.key === ruleKey("one-copy"))!;
    const rows = [...render(<RuleCard rule={{ key: one.key, text: one.text, diagram: one.diagram! }} />).container
      .querySelectorAll('[data-diagram-part="row"]')];
    const draft = rows.find((r) => r.textContent!.startsWith("Zimone"))!;
    expect(draft.classList.contains("border-dashed")).toBe(true);
    // Only the set-back row is dashed: every other row keeps a solid edge.
    const others = rows.filter((r) => r !== draft);
    expect(others.length).toBeGreaterThan(0);
    for (const r of others) expect(r.classList.contains("border-dashed"), r.textContent!).toBe(false);
  });
});

describe("GoodToKnow", () => {
  it("draws no heading and nothing else for a section with no visible rules (call 8)", () => {
    const { container } = render(<GoodToKnow sectionId="notes" rules={[]} />);
    expect(container.innerHTML).toBe("");
    // Friends' three rules are all switched: with Friends off the section keeps its screen and loses Good to know.
    expect(rulesOf(without("SOCIAL_FRIENDS_ENABLED", "FRIEND_DECKS_ENABLED", "SOCIAL_INVITES_ENABLED"), "friends")).toEqual([]);
  });

  it("heads the cards with the mark, the title and its sub-line", () => {
    const { container, getByRole } = render(<GoodToKnow sectionId="your-deck" rules={rulesOf(ALL_ON, "your-deck")} />);
    expect(getByRole("heading", { level: 3 }).textContent).toBe(ABOUT_PAGE_STRINGS.goodToKnow);
    expect(container.textContent).toContain(ABOUT_PAGE_STRINGS.goodToKnowSub);
    expect(container.querySelectorAll("article[data-rule]")).toHaveLength(3);
  });

  it("sits on the sunken panel at every width, its heading unruled with the sub-line stacked under it (R4 board 4)", () => {
    const { container } = render(<GoodToKnow sectionId="your-deck" rules={rulesOf(ALL_ON, "your-deck")} />);
    const panel = container.querySelector<HTMLElement>("[data-good-to-know='your-deck']")!;
    for (const t of ["rounded-[16px]", "bg-[color:var(--surface-sunken)]", "border-[color:var(--border-strong)]", "px-[14px]", "pb-[16px]"]) {
      expect(panel.className).toContain(t);
    }
    // No `md:` variant takes the panel away: it is the block at both widths.
    expect(panel.className).not.toMatch(/md:(bg|border|rounded)/);
    const head = panel.querySelector("h3")!.parentElement!;
    expect(head.className).not.toContain("border-t");
    expect(head.className).toContain("grid-cols-[22px_1fr]");
    expect(head.lastElementChild!.className).toContain("col-start-2");
    // The swipe row bleeds to the panel's edge, not the page's.
    expect(panel.querySelector("ul")!.className).toContain("-mr-[14px]");
  });

  it("keeps the retired tokens sentence and diagram part whatever the env says", () => {
    const draw = (e: NodeJS.ProcessEnv) => render(<GoodToKnow sectionId="deck-shopping" rules={rulesOf(e, "deck-shopping")} />);
    for (const e of [ALL_ON, without("DECK_TOKENS_ENABLED")]) {
      const text = draw(e).container.querySelector('[data-rule="rule/proxy"]')!.textContent!;
      expect(text).toContain("I have one");
      expect(text).toContain("Treasure token");
      expect(text).toContain("A proxy comes off the shopping list and uses no copy.");
    }
  });

  it("puts one phone dot under the row per card, the first lit, and follows the swipe", () => {
    const rules = rulesOf(ALL_ON, "deck-shopping");
    expect(rules).toHaveLength(3);
    const { container } = render(<GoodToKnow sectionId="deck-shopping" rules={rules} />);
    const dots = () => [...container.querySelectorAll("[data-good-to-know-dots] i")];
    expect(dots()).toHaveLength(rules.length);
    expect(dots().map((d) => d.hasAttribute("data-on"))).toEqual([true, false, false]);
    const row = container.querySelector("ul")!;
    // A phone row: 360px wide over three cards, so a step of one card is not the end of the scroll.
    for (const [k, v] of Object.entries({ scrollLeft: 304, scrollWidth: 932, clientWidth: 360 })) {
      Object.defineProperty(row, k, { value: v, configurable: true });
    }
    fireEvent.scroll(row);
    expect(dots().map((d) => d.hasAttribute("data-on"))).toEqual([false, true, false]);
  });

  it("lights the last dot at the end of the scroll, where a wide row stops before the last card reaches the start", () => {
    // Three 292px cards at 12px gaps in a 600px row: the row scrolls 332px at most, which is not a whole card's step.
    const rules = rulesOf(ALL_ON, "deck-shopping");
    const { container } = render(<GoodToKnow sectionId="deck-shopping" rules={rules} />);
    const row = container.querySelector("ul")!;
    for (const [k, v] of Object.entries({ scrollLeft: 332, scrollWidth: 932, clientWidth: 600 })) {
      Object.defineProperty(row, k, { value: v, configurable: true });
    }
    fireEvent.scroll(row);
    expect([...container.querySelectorAll("[data-good-to-know-dots] i")].map((d) => d.hasAttribute("data-on"))).toEqual([false, false, true]);
    expect(currentCard({ scrollLeft: 0, scrollWidth: 932, clientWidth: 600 }, 3)).toBe(0);
    expect(currentCard({ scrollLeft: 150, scrollWidth: 932, clientWidth: 600 }, 3)).toBe(0);
    expect(currentCard({ scrollLeft: 304, scrollWidth: 1300, clientWidth: 360 }, 3)).toBe(1);
    expect(currentCard({ scrollLeft: 0, scrollWidth: 292, clientWidth: 292 }, 1)).toBe(0);
  });

  it("lets the keyboard reach the swipe row, since no card holds a focus target", () => {
    const { getByRole } = render(<GoodToKnow sectionId="deck-shopping" rules={rulesOf(ALL_ON, "deck-shopping")} />);
    expect(getByRole("list").getAttribute("tabindex")).toBe("0");
  });

  it("draws no dots for a single card, as the boards draw Versions", () => {
    const { container } = render(<GoodToKnow sectionId="versions" rules={rulesOf(ALL_ON, "versions")} />);
    expect(container.querySelectorAll("article[data-rule]")).toHaveLength(1);
    expect(container.querySelector("[data-good-to-know-dots]")).toBeNull();
  });
});

describe("GoodToKnow under a landing on a rule (the ?, Addendum A1)", () => {
  it("lights the landed rule's card alone, and on a phone scrolls the swipe row to it", async () => {
    const { LabelLanding } = await import("../../discovery/label-landing");
    window.history.replaceState(null, "", "/about/shopping?from=%2Fcollection%2Fproxies&lit=rule%2Fproxy#deck-shopping");
    const rules = rulesOf(ALL_ON, "deck-shopping");
    const at = rules.findIndex((r) => r.key === "rule/proxy");
    expect(at).toBeGreaterThan(0);
    const scrolled: number[] = [];
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    const had = { scrollTo: proto.scrollTo };
    proto.scrollTo = function (this: HTMLElement, o: ScrollToOptions) {
      scrolled.push(o.left ?? 0);
    };
    const sw = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollWidth");
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get: () => 900 });
    try {
      const { container } = render(
        <LabelLanding landable={{ "rule/proxy": { isNew: false, section: "deck-shopping" } }} initialLit="rule/proxy" cards={[]}>
          <GoodToKnow sectionId="deck-shopping" rules={rules} />
        </LabelLanding>,
      );
      const lit = [...container.querySelectorAll("[data-rule][data-lit]")].map((e) => e.getAttribute("data-rule"));
      expect(lit).toEqual(["rule/proxy"]);
      expect(scrolled.at(-1)).toBe(at * (292 + 12));
    } finally {
      proto.scrollTo = had.scrollTo;
      if (sw) Object.defineProperty(HTMLElement.prototype, "scrollWidth", sw);
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
    }
  });
});
