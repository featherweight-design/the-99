import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ABOUT_PAGE_STRINGS, ABOUT_RULES, ABOUT_RULE_IDS } from "../../../lib/copy/about-pages";
import { ruleKey, visibleSections } from "../../../lib/about/pages-visible";
import { SWITCH_NAMES } from "../../../lib/switches/registry";
import { GoodToKnow, RuleCard, type RuleCardModel } from "./rule-card";

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

  it("drops a switched sentence and its diagram part while the switch is off, and keeps them while it is on", () => {
    const draw = (e: NodeJS.ProcessEnv) => render(<GoodToKnow sectionId="deck-shopping" rules={rulesOf(e, "deck-shopping")} />);
    const on = draw(ALL_ON).container.querySelector('[data-rule="rule/proxy"]')!.textContent!;
    expect(on).toContain("I have one");
    expect(on).toContain("Treasure token");
    const off = draw(without("DECK_TOKENS_ENABLED")).container.querySelector('[data-rule="rule/proxy"]')!.textContent!;
    expect(off).not.toContain("I have one");
    expect(off).not.toContain("Treasure token");
    expect(off).toContain("A proxy comes off the shopping list and uses no copy.");
  });

  it("puts one phone dot under the row per card, the first lit, and follows the swipe", () => {
    const rules = rulesOf(ALL_ON, "deck-shopping");
    expect(rules).toHaveLength(3);
    const { container } = render(<GoodToKnow sectionId="deck-shopping" rules={rules} />);
    const dots = () => [...container.querySelectorAll("[data-good-to-know-dots] i")];
    expect(dots()).toHaveLength(rules.length);
    expect(dots().map((d) => d.hasAttribute("data-on"))).toEqual([true, false, false]);
    const row = container.querySelector("ul")!;
    Object.defineProperty(row, "scrollLeft", { value: 304, configurable: true });
    fireEvent.scroll(row);
    expect(dots().map((d) => d.hasAttribute("data-on"))).toEqual([false, true, false]);
  });

  it("draws no dots for a single card, as the boards draw Versions", () => {
    const { container } = render(<GoodToKnow sectionId="versions" rules={rulesOf(ALL_ON, "versions")} />);
    expect(container.querySelectorAll("article[data-rule]")).toHaveLength(1);
    expect(container.querySelector("[data-good-to-know-dots]")).toBeNull();
  });
});
