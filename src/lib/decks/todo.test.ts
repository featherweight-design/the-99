import { describe, expect, it } from "vitest";
import { deckTodo, type TodoFacts, type TodoKind } from "./todo";

/** A committed, filled deck with cards and nothing to do. */
const QUIET: TodoFacts = { firstRun: false, filled: true, cards: 60, unresolved: 0 };

/** The facts that make each kind present on its own, laid over QUIET. */
const MAKES: Record<TodoKind, Partial<TodoFacts>> = {
  fillFailed: { filled: false, cards: 0 },
  unresolved: { unresolved: 2 },
  over: { over: 1 },
  spokenForTwice: { spokenForTwice: 1 },
  lastN: { openSlots: 12, candidates: 151 },
  ranOut: { openSlots: 12, candidates: 0 },
  pending: { pending: true },
};

const facts = (...kinds: TodoKind[]): TodoFacts =>
  Object.assign({}, QUIET, ...kinds.map((k) => MAKES[k]));
const order = (f: TodoFacts) => deckTodo(f).rows.map((r) => r.kind);

/** The next step's precedence, stated here and not imported, so a reorder in the rule fails. */
const PRECEDENCE: TodoKind[] = ["fillFailed", "unresolved", "over", "lastN", "ranOut", "pending"];
const ALL: TodoKind[] = [...PRECEDENCE, "spokenForTwice"];

/** Two kinds that cannot be present together, by construction. */
const EXCLUSIVE = new Set(["fillFailed+unresolved", "lastN+ranOut"]);

describe("deckTodo", () => {
  it("draws nothing for a deck with nothing to do", () => {
    const todo = deckTodo(QUIET);
    expect(todo.rows).toEqual([]);
    expect(todo.next).toBeNull();
  });

  it.each(ALL)("draws %s alone", (kind) => {
    const todo = deckTodo(facts(kind));
    expect(todo.rows).toEqual([{ kind, next: kind !== "spokenForTwice" }]);
  });

  const pairs = ALL.flatMap((a, i) => ALL.slice(i + 1).map((b) => [a, b] as const))
    .filter(([a, b]) => !EXCLUSIVE.has(`${a}+${b}`) && !EXCLUSIVE.has(`${b}+${a}`));

  it.each(pairs)("%s with %s: the next step leads, and only it is next", (a, b) => {
    const todo = deckTodo(facts(a, b));
    const [first, second] =
      a === "spokenForTwice" ? [b, a]
        : b === "spokenForTwice" ? [a, b]
          : PRECEDENCE.indexOf(a) < PRECEDENCE.indexOf(b) ? [a, b] : [b, a];
    expect(todo.rows).toEqual([{ kind: first, next: true }, { kind: second, next: false }]);
    expect(todo.next).toBe(first);
  });

  it("never makes spoken for twice the next step, even alone", () => {
    expect(deckTodo(facts("spokenForTwice")).next).toBeNull();
  });

  it("puts spoken for twice right after the next step, then warnings, then actions", () => {
    expect(order(facts("pending", "lastN", "spokenForTwice", "over", "unresolved"))).toEqual([
      "unresolved", "spokenForTwice", "over", "lastN", "pending",
    ]);
  });

  // The shipped gates, each reproduced.
  it("is not a failed fill while unresolved lines stand: that import is not a failed fill", () => {
    expect(order({ ...QUIET, filled: false, cards: 0, unresolved: 3 })).toEqual(["unresolved"]);
  });

  it("is not a failed fill on a first run, nor on a deck that holds a card, nor a filled one", () => {
    expect(order({ ...QUIET, filled: false, cards: 0, firstRun: true })).toEqual([]);
    expect(order({ ...QUIET, filled: false, cards: 1 })).toEqual([]);
    expect(order({ ...QUIET, filled: true, cards: 0 })).toEqual([]);
  });

  it("offers the last N only while a slot is open, and ran out when the pool is empty", () => {
    expect(order({ ...QUIET, openSlots: 0, candidates: 10 })).toEqual([]);
    expect(order({ ...QUIET, openSlots: -1, candidates: 0 })).toEqual([]);
    expect(order({ ...QUIET, openSlots: 1, candidates: 0 })).toEqual(["ranOut"]);
  });

  it("carries the first run to the head, whatever is due", () => {
    const todo = deckTodo({ ...QUIET, firstRun: true, cards: 0, filled: false, openSlots: 99, candidates: 140 });
    expect(todo.firstRun).toBe(true);
    expect(todo.rows).toEqual([{ kind: "lastN", next: true }]);
    expect(deckTodo(QUIET).firstRun).toBe(false);
  });

  it.each([
    ["fillFailed", "built"],
    ["unresolved", "complete"],
    ["over", "legal"],
    ["lastN", "complete"],
    ["ranOut", "complete"],
    ["pending", "ready"],
    ["spokenForTwice", "ready"],
  ] as const)("words the head from the next step: %s reads %s", (kind, word) => {
    expect(deckTodo(facts(kind)).word).toBe(word);
  });
});
