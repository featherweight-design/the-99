import { Fragment, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { aboutTextSnapshot } from "./about-text.fixture";
import before from "./about-text.snapshot.json";

/** The renderer About's labels, sub lines and banner launches use. */
const render = (text: string) => renderToStaticMarkup(createElement(Fragment, null, text));

describe("About's words, rendered (Small items 7, item 6, F1)", () => {
  it("draws every sub line, label, rule and launch exactly as the snapshot taken before the change", () => {
    const now = aboutTextSnapshot(render);
    expect(Object.keys(now).sort()).toEqual(Object.keys(before).sort());
    for (const [key, markup] of Object.entries(before as Record<string, string>)) expect(now[key], key).toBe(markup);
  });
});
