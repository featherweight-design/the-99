// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COUNTER_KEYS } from "@/lib/tracker/engine";
import { CounterIcon, DayNightIcon, InitiativeIcon, MonarchIcon, TaxIcon } from "./icons";

describe("tracker icons", () => {
  it("draws an icon for every counter the engine holds", () => {
    for (const kind of COUNTER_KEYS) expect(renderToStaticMarkup(<CounterIcon kind={kind} />), kind).toMatch(/<(svg|span)/);
  });
  it("points each official counter at a committed symbol file", () => {
    for (const kind of ["poison", "energy", "tickets", "ring"] as const) {
      const file = /url\(\/tracker\/([a-z]+)\.svg\)/.exec(renderToStaticMarkup(<CounterIcon kind={kind} />))?.[1];
      expect(file, kind).toBeDefined();
      expect(readFileSync(join(process.cwd(), "public/tracker", `${file}.svg`), "utf8")).toContain("<svg");
    }
    expect(existsSync(join(process.cwd(), "public/tracker/ring.svg"))).toBe(true);
  });
  it("hides every icon from assistive tech and keeps the drawn line style", () => {
    for (const el of [<MonarchIcon key="m" />, <InitiativeIcon key="i" />, <TaxIcon key="t" />, <DayNightIcon key="d" />]) {
      const html = renderToStaticMarkup(el);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('stroke="currentColor"');
    }
  });
});
