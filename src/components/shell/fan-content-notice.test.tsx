import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fanContentNotice, FAN_CONTENT_POLICY_URL, policyLinkAria } from "../../lib/copy/fan-content-notice";
import { contrast } from "../../lib/theme/color";
import { parseThemeBlocks } from "../../lib/theme/parse-css";
import { FanContentNotice } from "./fan-content-notice";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const THEMES = parseThemeBlocks(readFileSync(join(SRC, "app", "globals.css"), "utf8"));
// Code only: the file's own comments say "never fixed" and name the tokens.
const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fan-content-notice.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

afterEach(cleanup);

describe("FanContentNotice", () => {
  it("is a footer with the two locked passages, in order, and exactly one link", () => {
    render(<FanContentNotice />);
    const footer = document.querySelector("footer")!;
    const paragraphs = [...footer.querySelectorAll("p")].map((p) => p.textContent!.replace(/\s+↗/, ""));
    expect(paragraphs).toEqual([fanContentNotice.passageOne, fanContentNotice.passageTwo]);
    expect(footer.querySelectorAll("a")).toHaveLength(1);
    expect(footer.querySelectorAll("button, input, [role='button']")).toHaveLength(0);
  });

  it("links Wizards' policy in a new tab, with the accessible name saying so, and hides the arrow from readers", () => {
    render(<FanContentNotice />);
    const link = screen.getByRole("link", { name: policyLinkAria });
    expect(link.getAttribute("href")).toBe(FAN_CONTENT_POLICY_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.querySelector("[aria-hidden='true']")!.textContent.trim()).toBe("↗");
    // The visible words stay the locked ones (the arrow is decoration).
    expect(link.textContent!.replace(/\s*↗/, "")).toBe("Fan Content Policy");
  });

  it("centers on the signed-out pages' axis and starts at the left otherwise", () => {
    render(<FanContentNotice align="center" />);
    expect(document.querySelector("footer div")!.className).toContain("text-center");
    cleanup();
    render(<FanContentNotice />);
    expect(document.querySelector("footer div")!.className).not.toContain("text-center");
  });

  it("renders no element out of flow: no class on any node positions it fixed, sticky or absolute", () => {
    render(<FanContentNotice />);
    const classes = [document.querySelector("footer")!, ...document.querySelectorAll("footer *")].map((n) => n.getAttribute("class") ?? "").join(" ");
    expect(classes).not.toMatch(/(^|\s)(?:[\w:-]+:)?(fixed|sticky|absolute)(\s|$)/);
  });

  it("carries no state or request API in its source", () => {
    expect(SOURCE).not.toMatch(/\b(fixed|sticky)\b/);
    expect(SOURCE).not.toMatch(/useState|useEffect|"use client"|onClick|cookies\(|headers\(|auth\(/);
  });

  it("paints its text in --fg-muted and names no other color token for ink beyond the link's states", () => {
    const tokens = new Set([...SOURCE.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]));
    // Never a token beyond the notice's ink and hairline and the link's own states; an addition is a deliberate diff here.
    const allowed = new Set(["accent", "border", "fg", "fg-faint", "fg-muted"]);
    expect([...tokens].filter((t) => !allowed.has(t))).toEqual([]);
    expect(tokens.has("fg-muted")).toBe(true);
    expect(tokens.has("border")).toBe(true);
    expect(SOURCE).toContain("text-[color:var(--fg-muted)]");
    // The ink of the text is not --fg-faint or --accent (the underline's --fg-faint is `decoration-`, the ring's --accent `outline-`).
    expect(SOURCE).not.toMatch(/(?<![\w-])text-\[color:var\(--(fg-faint|accent)\)\]/);
    expect(SOURCE).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});

// WCAG's floor for text. The handoff measured these in Plex Sans from the theme blocks; the test is the guard.
const MEASURED: Record<string, number> = { amonkhet: 6.91, kamigawa: 6.84, ixalan: 7.35, phyrexia: 6.76, eldraine: 6.61, kaldheim: 7.24 };

describe("the notice's ink on --bg", () => {
  it("is declared in all six themes", () => {
    expect([...THEMES.keys()].sort()).toEqual(Object.keys(MEASURED).sort());
  });

  it.each(Object.entries(MEASURED))("clears 4.5:1 in %s, at the figure the handoff measured (%s)", (name, measured) => {
    const t = THEMES.get(name)!;
    const ratio = contrast(t.get("fg-muted")!, t.get("bg")!);
    expect(ratio, name).toBeGreaterThanOrEqual(4.5);
    expect(ratio, name).toBeCloseTo(measured, 1);
  });

  it("is why --fg-faint is not used for text: it fails in two themes", () => {
    const failing = [...THEMES].filter(([, t]) => contrast(t.get("fg-faint")!, t.get("bg")!) < 4.5).map(([n]) => n).sort();
    expect(failing).toEqual(["kamigawa", "phyrexia"]);
  });
});
