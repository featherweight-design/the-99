import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LAUNCH_ATTR, LAUNCH_DETECT, LAUNCH_SEEN_KEY } from "./launch-detect";
import { NUMERAL_PATH } from "../../components/shell/launch-loader";

type Env = { standalone?: boolean; iosStandalone?: boolean; reduced?: boolean; seen?: boolean; storageThrows?: boolean };

function run(env: Env): string | null {
  const attrs = new Map<string, string>();
  const matches = (q: string) => {
    if (q.includes("display-mode: standalone")) return !!env.standalone;
    if (q.includes("prefers-reduced-motion")) return !!env.reduced;
    return false;
  };
  const win = {
    matchMedia: (q: string) => ({ matches: matches(q) }),
    navigator: { standalone: env.iosStandalone },
    sessionStorage: {
      getItem: (k: string) => {
        if (env.storageThrows) throw new Error("blocked");
        return k === LAUNCH_SEEN_KEY && env.seen ? "1" : null;
      },
    },
  };
  const doc = { documentElement: { setAttribute: (k: string, v: string) => attrs.set(k, v) } };
  new Function("window", "document", LAUNCH_DETECT)(win, doc);
  return attrs.get(LAUNCH_ATTR) ?? null;
}

describe("LAUNCH_DETECT", () => {
  it("marks a cold start of the installed app, on any window: no width or pointer decides it", () => {
    expect(run({ standalone: true })).toBe("1");
    expect(run({ iosStandalone: true })).toBe("1");
  });
  it("stays quiet in a browser tab, with reduced motion, or after the session's first load", () => {
    expect(run({})).toBeNull();
    expect(run({ standalone: true, reduced: true })).toBeNull();
    expect(run({ standalone: true, seen: true })).toBeNull();
    expect(run({ iosStandalone: true, reduced: true, seen: true })).toBeNull();
  });
  it("asks about display mode and motion only, never about a pointer or a width", () => {
    expect(LAUNCH_DETECT).not.toMatch(/pointer|max-width|min-width/);
  });
  it("never throws into the page when storage is blocked", () => {
    expect(() => run({ standalone: true, storageThrows: true })).not.toThrow();
    expect(run({ standalone: true, storageThrows: true })).toBeNull();
  });
});

describe("the landing", () => {
  const css = readFileSync(join(__dirname, "../../app/globals.css"), "utf8");
  it("reads its figures from --ll-land-* (phone default, the rail's lockup from 48rem, 4px higher on a short touch screen)", () => {
    expect(css).toMatch(/49\.067%, 100% \{ transform: translate\(var\(--ll-land-x\), var\(--ll-land-y\)\) scale\(var\(--ll-land-s\)\); \}/);
    expect(css).toContain("--ll-land-x: 66.75px;");
    expect(css).toMatch(/@media \(min-width: 48rem\) \{\s*\.launch-loader \{\s*--ll-land-x: calc\(var\(--rail-w\) \/ 2 - 0\.5px\);\s*--ll-land-y: 20px;\s*--ll-land-s: 0\.1897;/);
    expect(css).toMatch(/@media \(min-width: 48rem\) and \(hover: none\) and \(max-height: 459\.98px\) \{\s*\.launch-loader \{ --ll-land-y: 16px; \}/);
  });
  it("turns the numeral settle off from md up, inside the no-preference block after the rule that sets it", () => {
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference) {\n  .launch-loader,"));
    const set = block.indexOf(".ll-num { animation-name: ll-num; }");
    const off = block.indexOf("@media (min-width: 48rem) { .launch-loader .ll-num { animation-name: none; } }");
    expect(set).toBeGreaterThan(-1);
    expect(off).toBeGreaterThan(set);
  });
});

describe("the numeral glyph", () => {
  it("is the one icon.svg draws", () => {
    const icon = readFileSync(join(__dirname, "../../app/icon.svg"), "utf8");
    expect(icon).toContain(`d="${NUMERAL_PATH}"`);
  });
});
