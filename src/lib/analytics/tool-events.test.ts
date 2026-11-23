// The tool discovery events' guard (plan §6, handoff G21): one case per event, each built as the app builds it, and
// every string value a member of its property's closed set. A prop typed `string` fails the build (below).
import { describe, expect, it } from "vitest";
import { FIND_A_DECK_FROM, TOOL_EVENT_VALUES, type ToolEvents } from "./tool-events";

/** The events whose props admit any string: `never` while every prop is a closed set. */
type OpenProp = {
  [E in keyof ToolEvents]: { [P in keyof ToolEvents[E]]: string extends ToolEvents[E][P] ? E : never }[keyof ToolEvents[E]];
}[keyof ToolEvents];
// Fails typecheck the day a prop widens to `string`.
const noOpenProps: [OpenProp] extends [never] ? true : false = true;

function closed<E extends keyof ToolEvents>(name: E, props: ToolEvents[E]) {
  const sets = TOOL_EVENT_VALUES[name] as Record<string, readonly unknown[]>;
  for (const [key, value] of Object.entries(props)) {
    expect(Object.keys(sets)).toContain(key);
    if (typeof value === "string") expect(sets[key]).toContain(value);
    else throw new Error(`${name}.${key} is not a closed-set string`);
  }
}

describe("tool discovery events", () => {
  it("types no prop as a bare string", () => {
    expect(noOpenProps).toBe(true);
  });

  it("find_a_deck_opened carries only `from`, from its closed set", () => {
    for (const from of FIND_A_DECK_FROM) closed("find_a_deck_opened", { from });
    expect(() => closed("find_a_deck_opened", { from: "Sol Ring" as never })).toThrow();
  });
});
