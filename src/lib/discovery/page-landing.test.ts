import { describe, expect, it } from "vitest";
import { SWITCH_NAMES } from "../switches/registry";
import { pageLanding } from "./page-landing";
import { TOOLS, pageToolLanding, type ToolId } from "./tools";

// Every page a Try it lands on (discovery R2·3), with the tool it reads `?tool=` for and the target it haloes.
const PAGES: { tool: ToolId; route: string; target: string }[] = [
  { tool: "help-me-choose", route: "/commanders/choose", target: "help-me-choose" },
  { tool: "precons", route: "/decks/precons", target: "precons" },
  { tool: "find-a-deck", route: "/collection?avail=free", target: "find-a-deck" },
  { tool: "wishlist", route: "/collection/wishlist", target: "wishlist" },
  { tool: "collection-sync", route: "/collection/replace", target: "collection-sync" },
  { tool: "lineup", route: "/decks?view=stats", target: "lineup" },
  { tool: "friends", route: "/friends", target: "friends" },
];

const ALL_ON = Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"])) as NodeJS.ProcessEnv;

describe("pageLanding", () => {
  it("covers every tool with a page of its own, and only those", () => {
    expect(PAGES.map((p) => p.tool).sort()).toEqual(TOOLS.filter((t) => t.lands.kind === "route").map((t) => t.id).sort());
    for (const p of PAGES) {
      const tool = TOOLS.find((t) => t.id === p.tool)!;
      expect(tool.lands, p.tool).toEqual({ kind: "route", href: p.route });
    }
  });

  it.each(PAGES)("lands $tool on its own page, on its own target, with a fresh token per render", ({ tool, target }) => {
    const a = pageLanding(tool, ALL_ON, tool);
    expect(a.landing).toMatchObject({ tool, target, lands: { kind: "route" } });
    expect(a.request).toMatch(/^[0-9a-f-]{36}$/);
    expect(pageLanding(tool, ALL_ON, tool).request).not.toBe(a.request);
  });

  it.each(PAGES)("strips a stale id on $tool's page: unknown, repeated, another page's tool or a deck tool", ({ tool }) => {
    const other = PAGES.find((p) => p.tool !== tool)!.tool;
    for (const asked of ["nope", [tool, tool], other, "top-off", "tour:banner"]) {
      const r = pageLanding(asked, ALL_ON, tool);
      expect(r.landing, String(asked)).toBeNull();
      // A token still, so the mount re-runs and strips it.
      expect(r.request).not.toBeNull();
    }
  });

  it.each(PAGES)("lands nowhere on $tool's page with its switch off for the reader", ({ tool }) => {
    const name = TOOLS.find((t) => t.id === tool)!.switch!;
    expect(pageLanding(tool, { ...ALL_ON, [name]: "" }, tool).landing).toBeNull();
  });

  it("follows a compound switch's parent: Collection Sync is off with collection editing off", () => {
    expect(pageLanding("collection-sync", { ...ALL_ON, COLLECTION_EDIT_ENABLED: "" }, "collection-sync").landing).toBeNull();
  });

  it("reads nothing on a render with no parameter", () => {
    expect(pageLanding(undefined, ALL_ON, "friends")).toEqual({ landing: null, request: null });
  });

  it("is the registry's own reading, never a looser one", () => {
    expect(pageToolLanding("friends", () => true, "friends")?.moment).toBeNull();
    expect(pageToolLanding("lineup", () => true, "lineup")?.moment).toBe("lineup");
    expect(pageToolLanding("top-off", () => true, "top-off" as ToolId)).toBeNull();
  });
});
