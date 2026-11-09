import { describe, expect, it } from "vitest";
import { landingCopy } from "./landing";

const strings = (v: unknown): string[] => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);

describe("landingCopy", () => {
  it("has no em dash, no straight apostrophe in prose and no British spelling in any string it ships", () => {
    // The phone's fit table is keyed by Scryfall's own card names (straight apostrophes): data, not prose.
    const prose = strings({ ...landingCopy, phone: { label: landingCopy.phone.label } });
    for (const s of prose) {
      expect(s, s).not.toMatch(/—/);
      expect(s, s).not.toMatch(/\w'\w/);
      expect(s, s).not.toMatch(/colour|favour|organis/i);
    }
  });

  it("says the hero line tightened by READINESS-audit, and credits only the two sources the Fan Content passages do not", () => {
    expect(landingCopy.hero.line).toBe("The 99 shows every commander your cards can build, then builds the deck from them. You buy only what’s missing.");
    expect(landingCopy.footer.credit).toBe("Commander data from EDHREC. Combos from Commander Spellbook.");
    expect(landingCopy.footer.credit).not.toMatch(/Scryfall|Mana Pool/);
  });

  it("asks for no card details anywhere (the panel asks for an email and nothing else)", () => {
    expect(strings(landingCopy).join(" ")).not.toMatch(/card number|credit card|payment|expir/i);
  });

  it("the sent body names the address between the shipped words", () => {
    expect(landingCopy.launch.sentBody("a@x.dev")).toEqual(["We’ll email ", { em: "a@x.dev" }, " the day The 99 opens to everyone."]);
  });

  it("keeps the link-preview title and description inside the search-result caps, with no sign-up claim", () => {
    expect(landingCopy.meta.title.length).toBeLessThanOrEqual(60);
    expect(landingCopy.meta.description.length).toBeLessThanOrEqual(155);
    expect(`${landingCopy.meta.title} ${landingCopy.meta.description}`).not.toMatch(/sign up|unlock|free/i);
  });
});
