import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { visibleSections } from "../../../lib/about/pages-visible";
import { ABOUT_RULES, ABOUT_SECTIONS } from "../../../lib/copy/about-pages";
import { AboutText } from "./about-text";
import { PROOF_ENVS, aboutTextSnapshot } from "./about-text.fixture";
import before from "./about-text.snapshot.json";

/** The renderer About's labels and sub lines use. */
const render = (text: string) => renderToStaticMarkup(createElement(AboutText, { text }));
const B = (s: string) => `<b class="font-semibold text-[color:var(--fg)]">${s}</b>`;

/** The only units F1 and F2 change: the cart's total (its second bold phrase) and its views (the lead follows By friend). */
const CHANGED = ["shopping/all-decks/total", "shopping/all-decks/views"];
const changed = (key: string) => CHANGED.some((c) => key.endsWith(`:${c}`));

describe("About's words, rendered (Small items 7, item 6, F1)", () => {
  it("draws every other sub line, label and rule exactly as the snapshot taken before the change", () => {
    const now = aboutTextSnapshot(render);
    expect(Object.keys(now).sort()).toEqual(Object.keys(before).sort());
    for (const [key, markup] of Object.entries(before as Record<string, string>)) {
      if (!changed(key)) expect(now[key], key).toBe(markup);
    }
  });

  it("changes the two cart units exactly as intended", () => {
    const now = aboutTextSnapshot(render);
    const total = ` is the selected decks’ missing cards at single-copy prices. ${B("Buy these at Mana Pool")} sends them there.`;
    expect(now["on|unit:shopping/all-decks/total"]).toBe(`The total|${total}`);
    expect(now["cart|unit:shopping/all-decks/total"]).toBe(`The total|${total}`);
    expect(now["on|unit:shopping/all-decks/views"]).toBe(
      `By card, By deck|${B(", By friend")} read the same cart three ways. By friend lists each friend’s spares.`,
    );
    expect(now["cart|unit:shopping/all-decks/views"]).toBe("By card, By deck| read the same cart two ways.");
  });

  it("draws text with no marker as the bare string, and each marked phrase in bold", () => {
    expect(render("plain & “quoted”.")).toBe("plain &amp; “quoted”.");
    expect(render("a **b** c **d**")).toBe(`a ${B("b")} c ${B("d")}`);
  });
});

describe("About's bold markers", () => {
  it("open and close in pairs around a phrase, in every sub line, label and rule", () => {
    // An odd count would bold the rest of the line, and `****` would draw an empty bold.
    const texts = [
      ...ABOUT_SECTIONS.flatMap((s) => [s.sub, ...s.labels.map((l) => l.rest)]),
      ...Object.values(ABOUT_RULES).map((r) => r.text),
    ];
    for (const t of texts) {
      expect(t.split("**").length % 2, t).toBe(1);
      expect(t, t).not.toContain("****");
    }
  });
});

describe("the cart's views label follows By friend (F2)", () => {
  const views = (e: NodeJS.ProcessEnv) =>
    visibleSections(e).find((s) => s.id === "all-decks")!.labels.find((l) => l.key === "shopping/all-decks/views")!;

  it("with spare requests on, bolds all three views and says what By friend lists", () => {
    const l = views(PROOF_ENVS.on);
    expect(l.lead).toBe("By card, By deck");
    expect(l.text).toBe("**, By friend** read the same cart three ways. By friend lists each friend’s spares.");
  });

  it("with them off, bolds By card and By deck alone and never names By friend", () => {
    const l = views(PROOF_ENVS.cart);
    expect(l.lead).toBe("By card, By deck");
    expect(l.text).toBe(" read the same cart two ways.");
    expect(`${l.lead}${l.text}`).not.toContain("friend");
  });
});
