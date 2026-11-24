// The tool discovery events' guard (plan §6, handoff G21): one case per event, each built as the app builds it, and
// every string value a member of its property's closed set. A prop typed `string` fails the build (below).
import { describe, expect, it } from "vitest";
import {
  ASK_CARDS,
  ASK_COUNT,
  ASK_PRESSED_FROM,
  ASK_PICKED,
  ASK_RANK,
  askPicked,
  ASK_TOOL_IDS,
  ASK_WORDS,
  FEED_COUNT_BUCKET,
  FIND_A_DECK_FROM,
  SEARCH_OPENED_FROM,
  TOOL_EVENT_VALUES,
  TUNING_OPENED_FROM,
  TUNING_OPENED_TOOL,
  WELCOME_WHERE_FROM,
  feedCountBucket,
  type ToolEvents,
} from "./tool-events";

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

  it("welcome_where_opened carries only `from`, from its closed set", () => {
    for (const from of WELCOME_WHERE_FROM) closed("welcome_where_opened", { from });
    expect(() => closed("welcome_where_opened", { from: "a card name" as never })).toThrow();
  });

  it("feed_show_all carries a count bucket only", () => {
    for (const count of FEED_COUNT_BUCKET) closed("feed_show_all", { count });
    expect(() => closed("feed_show_all", { count: "12" as never })).toThrow();
    expect([6, 10, 11, 20, 21, 99].map(feedCountBucket)).toEqual(["6_to_10", "6_to_10", "11_to_20", "11_to_20", "21_plus", "21_plus"]);
  });

  it("feed_sheet_filter carries a feed kind, never a label", () => {
    closed("feed_sheet_filter", { kind: "price-drop" });
    expect(() => closed("feed_sheet_filter", { kind: "Price drops" as never })).toThrow();
  });

  it("feed_sheet_clear carries a bucket and whether a chip narrowed it", () => {
    closed("feed_sheet_clear", { count: "6_to_10", filtered: "kind" });
    expect(() => closed("feed_sheet_clear", { count: "6_to_10", filtered: "yes" as never })).toThrow();
  });

  it("tuning_opened carries only `from` and `tool`, each from its closed set", () => {
    for (const from of TUNING_OPENED_FROM) for (const tool of TUNING_OPENED_TOOL) closed("tuning_opened", { from, tool });
    expect(() => closed("tuning_opened", { from: "tab", tool: "Sol Ring" as never })).toThrow();
  });

  it("find_a_deck_opened admits the Ask press", () => {
    expect(FIND_A_DECK_FROM).toContain("ask");
  });

  it("the Ask events carry shapes and ids, never a query", () => {
    for (const from of SEARCH_OPENED_FROM) closed("search_opened", { from });
    for (const words of ASK_WORDS) closed("ask_miss", { words });
    closed("ask_result", { count: ASK_COUNT[2], first: ASK_TOOL_IDS[0], cards: ASK_CARDS[1], words: ASK_WORDS[2] });
    closed("ask_result", { count: "0", first: "none", cards: "none", words: "3+" });
    for (const from of ASK_PRESSED_FROM) closed("ask_tool_pressed", { tool: ASK_TOOL_IDS[0], from, rank: ASK_RANK[0], picked: "none" });
    for (const tool of ASK_TOOL_IDS) closed("ask_tool_pressed", { tool, from: ASK_PRESSED_FROM[1], rank: ASK_RANK[0], picked: "none" });
    for (const picked of ASK_PICKED) closed("ask_tool_pressed", { tool: ASK_TOOL_IDS[2], from: ASK_PRESSED_FROM[0], rank: ASK_RANK[0], picked });
    expect([0, 1, 2, 9].map(askPicked)).toEqual(["1", "2", "3+", "3+"]);
    expect(SEARCH_OPENED_FROM).toEqual(expect.arrayContaining(["home_field", "home_starter"]));
    expect(WELCOME_WHERE_FROM).toContain("panel_foot");
    expect(ASK_PRESSED_FROM).toContain("home_inline");
    expect(() => closed("ask_miss", { words: "where can my spare cards go" as never })).toThrow();
  });
});
