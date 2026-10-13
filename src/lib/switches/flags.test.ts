// The flag map and the registry's `needs` must say what the flag functions decide (admin PR 8a).
// Every env here is a small sentinel object built from the registry, never the process environment.
import { describe, expect, it } from "vitest";
import { MODEL_CAPABILITIES, SWITCH_FLAGS } from "./flags";
import { SWITCH_NAMES, switchKind, switchParent, type SwitchName } from "./registry";

const all = (value: string, over: Partial<Record<SwitchName, string>> = {}): NodeJS.ProcessEnv =>
  ({ ...Object.fromEntries(SWITCH_NAMES.map((n) => [n, value])), ...over }) as unknown as NodeJS.ProcessEnv;

/** The chain of parents above a switch, nearest first. */
const ancestors = (name: SwitchName): SwitchName[] => {
  const out: SwitchName[] = [];
  for (let p = switchParent(name); p; p = switchParent(p)) out.push(p);
  return out;
};

describe("SWITCH_FLAGS", () => {
  it("maps every registry switch to a flag function", () => {
    expect(Object.keys(SWITCH_FLAGS).sort()).toEqual([...SWITCH_NAMES].sort());
  });

  it("reads each switch's own variable", () => {
    for (const name of SWITCH_NAMES) {
      expect(SWITCH_FLAGS[name](all("true")), name).toBe(true);
      expect(SWITCH_FLAGS[name](all("true", { [name]: "false" })), name).toBe(false);
    }
  });
});

describe("the registry's needs", () => {
  it("names exactly the parent each flag function checks", () => {
    for (const name of SWITCH_NAMES) {
      const parents = ancestors(name);
      // Off with its declared parent off, everything else on.
      for (const p of parents) expect(SWITCH_FLAGS[name](all("true", { [p]: "false" })), `${name} needs ${p}`).toBe(false);
      // On with only itself and its declared parents on: it needs nothing undeclared.
      const own = Object.fromEntries([name, ...parents].map((n) => [n, "true"]));
      expect(SWITCH_FLAGS[name](all("false", own)), `${name} needs only ${parents.join(", ") || "itself"}`).toBe(true);
    }
  });

  it("names a parent that is a registry switch and never itself", () => {
    for (const name of SWITCH_NAMES) {
      const p = switchParent(name);
      if (p) {
        expect(SWITCH_NAMES).toContain(p);
        expect(p).not.toBe(name);
      }
    }
  });
});

describe("MODEL_CAPABILITIES", () => {
  // A switch is tagged `model` exactly when turning it on, with every other switch on, lets a reader
  // press something that spends: so a parent of a spending switch is tagged, and nothing else is.
  const raisedBy = (name: SwitchName) =>
    MODEL_CAPABILITIES.filter((c) => !c.on(all("true", { [name]: "false" })) && c.on(all("true"))).map((c) => c.key);

  it("is raised by every model switch", () => {
    for (const name of SWITCH_NAMES.filter((n) => switchKind(n) === "model")) expect(raisedBy(name).length, name).toBeGreaterThan(0);
  });

  it("is raised by no switch that is not a model switch", () => {
    for (const name of SWITCH_NAMES.filter((n) => switchKind(n) !== "model")) expect(raisedBy(name), name).toEqual([]);
  });
});
