import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LAUNCH_ATTR, LAUNCH_DETECT, LAUNCH_SEEN_KEY } from "./launch-detect";
import { NUMERAL_PATH } from "../../components/shell/launch-loader";

type Env = { width?: number; standalone?: boolean; iosStandalone?: boolean; phone?: boolean; reduced?: boolean; seen?: boolean; storageThrows?: boolean };

function run(env: Env): string | null {
  const attrs = new Map<string, string>();
  const matches = (q: string) => {
    if (q.includes("display-mode: standalone")) return !!env.standalone;
    if (q.includes("pointer: coarse")) return !!env.phone && (env.width ?? 390) <= 767 === q.includes("max-width: 767px");
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
  it("marks a cold start of the installed app on a phone", () => {
    expect(run({ standalone: true, phone: true })).toBe("1");
    expect(run({ iosStandalone: true, phone: true })).toBe("1");
  });
  it("stays quiet in a browser tab, on desktop or tablet, with reduced motion, or after the session's first load", () => {
    expect(run({ phone: true })).toBeNull();
    expect(run({ standalone: true })).toBeNull();
    // A coarse pointer alone is not a phone: a tablet at 768px and up draws the rail, not the header the loader lands on.
    expect(run({ standalone: true, phone: true, width: 820 })).toBeNull();
    expect(run({ standalone: true, phone: true, reduced: true })).toBeNull();
    expect(run({ standalone: true, phone: true, seen: true })).toBeNull();
  });
  it("never throws into the page when storage is blocked", () => {
    expect(() => run({ standalone: true, phone: true, storageThrows: true })).not.toThrow();
    expect(run({ standalone: true, phone: true, storageThrows: true })).toBeNull();
  });
});

describe("the numeral glyph", () => {
  it("is the one icon.svg draws", () => {
    const icon = readFileSync(join(__dirname, "../../app/icon.svg"), "utf8");
    expect(icon).toContain(`d="${NUMERAL_PATH}"`);
  });
});
