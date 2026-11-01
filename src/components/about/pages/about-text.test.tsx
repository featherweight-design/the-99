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

/** The only units F1, F2 and the friend page change: the cart's total (its second bold phrase) and its views (the lead follows By friend), and the friend page's order (Decks, Wishlist, Spares). */
const CHANGED = ["shopping/all-decks/total", "shopping/all-decks/views", "friends/friends/friend"];
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
    // Spare requests are always on (SOCIAL_FRIENDS_ENABLED retired), so both readers name By friend.
    for (const reader of ["on", "cart"]) {
      expect(now[`${reader}|unit:shopping/all-decks/views`], reader).toBe(
        `By card, By deck|${B(", By friend")} read the same cart three ways. By friend lists each friend’s spares.`,
      );
    }
  });

  it("draws text with no marker as the bare string, and each marked phrase in bold", () => {
    expect(render("plain & “quoted”.")).toBe("plain &amp; “quoted”.");
    expect(render("a **b** c **d**")).toBe(`a ${B("b")} c ${B("d")}`);
  });
});

describe("the friend page label follows the page's order: Decks, Wishlist, Spares", () => {
  // Both of its sentence switches are retired (the wishlist's is always on, the decks' follows the label's own), so
  // only one combination can draw today; the label is proven whole in all four anyway, by cutting each sentence the way
  // `resolveText` does, in case either switch is ever live again.
  const label = ABOUT_SECTIONS.flatMap((s) => s.labels).find((l) => l.id === "friend" && l.region === "friends/friends/friend");
  const read = (decks: boolean, wishlist: boolean) => {
    let out = label!.rest;
    for (const [sentence, sw] of Object.entries(label!.sentences ?? {})) {
      if ((sw === "FRIEND_DECKS_ENABLED" && !decks) || (sw === "SOCIAL_WISHLIST_ENABLED" && !wishlist)) out = out.replace(sentence, "");
    }
    return `${label!.lead}${out.trimEnd()}`;
  };
  it("reads whole under every combination of its two switches", () => {
    expect(read(true, true)).toBe(
      "A friend’s page shows what they share. It lists the decks they let you open. It shows their wishlist too. It also shows their spares.",
    );
    expect(read(true, false)).toBe("A friend’s page shows what they share. It lists the decks they let you open. It also shows their spares.");
    expect(read(false, true)).toBe("A friend’s page shows what they share. It shows their wishlist too. It also shows their spares.");
    expect(read(false, false)).toBe("A friend’s page shows what they share. It also shows their spares.");
  });
  it("draws the all-on text the reader sees today", () => {
    const drawn = visibleSections(PROOF_ENVS.on).flatMap((s) => s.labels).find((l) => l.key === "friends/friends/friend");
    expect(`${drawn?.lead}${drawn?.text}`).toBe(read(true, true));
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

  // Spare requests are always on (SOCIAL_FRIENDS_ENABLED retired): every reader gets all three views.
  it.each(Object.keys(PROOF_ENVS))("bolds all three views and says what By friend lists (%s)", (reader) => {
    const l = views(PROOF_ENVS[reader]);
    expect(l.lead).toBe("By card, By deck");
    expect(l.text).toBe("**, By friend** read the same cart three ways. By friend lists each friend’s spares.");
  });
});
