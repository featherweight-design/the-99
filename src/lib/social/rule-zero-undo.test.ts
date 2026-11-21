import { beforeEach, describe, expect, it, vi } from "vitest";
import { sealRoster } from "./rule-zero-roster";

// Undo's decisions and the log's share lock, against a recorded query chain (the real database proof is
// `pnpm probe:tracker-undo`). Each awaited query takes the next queued result; every builder call is logged.
const log: string[] = [];
const results: (unknown[] | Error)[] = [];
function chain(kind: string): unknown {
  log.push(kind);
  const proxy: unknown = new Proxy(() => {}, {
    get(_t, prop) {
      if (prop === "then") return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        const next = results.shift();
        return next instanceof Error ? reject(next) : resolve(next ?? []);
      };
      return (...args: unknown[]) => {
        if (prop === "for") log.push(`for:${String(args[0])}`);
        return proxy;
      };
    },
  });
  return proxy;
}
const tx = { select: () => chain("select"), delete: () => chain("delete") };

vi.mock("../../db", () => ({
  db: {
    transaction: async (fn: (t: unknown) => unknown) => fn(tx),
    select: () => chain("select"),
  },
}));

const { undoTableResult, gameLogged } = await import("./rule-zero-result");
const { resolveTableSeatsIn } = await import("./rule-zero-log");

const SECRET = "ab".repeat(32);
const TABLE = "7a0e0000-0000-4000-8000-000000000001";
const SEATS = [
  { seat: 1, userId: "user_a", deckId: null },
  { seat: 2, userId: "user_b", deckId: null },
];
const roster = sealRoster(SECRET, TABLE, SEATS, Date.parse("2026-11-21T03:00:00.000Z"));

beforeEach(() => {
  log.length = 0;
  results.length = 0;
});

describe("undoTableResult", () => {
  it("refuses once anyone seated has logged the game, and deletes nothing", async () => {
    results.push([{ id: TABLE }], SEATS, [{ seat: 2 }]);
    expect(await undoTableResult("user_a", TABLE, roster, SECRET)).toBe("logged");
    expect(log).toEqual(["select", "for:update", "select", "select"]);
  });

  it("takes the game's result back when nobody has logged it", async () => {
    results.push([{ id: TABLE }], SEATS, []);
    expect(await undoTableResult("user_a", TABLE, roster, SECRET)).toBe("undone");
    expect(log).toEqual(["select", "for:update", "select", "select", "delete"]);
  });

  it("refuses a table past its night, a player not seated now, and a roster that does not open", async () => {
    results.push([]);
    expect(await undoTableResult("user_a", TABLE, roster, SECRET)).toBe("refused");
    results.push([{ id: TABLE }], [SEATS[1]]);
    expect(await undoTableResult("user_a", TABLE, roster, SECRET)).toBe("refused");
    expect(await undoTableResult("user_a", TABLE, `${roster}x`.slice(1), SECRET)).toBe("refused");
    expect(log).not.toContain("delete");
  });
});

describe("the log's share lock (the race against Undo)", () => {
  it("locks the table row for share before it reads a seat", async () => {
    results.push([], new Error("stop after the lock"));
    await expect(resolveTableSeatsIn(tx as never, "user_a", { id: TABLE, seating: "x" }, [2])).rejects.toThrow("stop after the lock");
    expect(log.slice(0, 2)).toEqual(["select", "for:share"]);
  });
});

describe("gameLogged (the U3 note)", () => {
  const at = Date.parse("2026-11-21T03:10:00.000Z");
  it("reads You for the viewer's own log, with no name", async () => {
    results.push([{ seat: 1, userId: "user_a", publicId: "p-a", displayName: "Ava", at }]);
    expect(await gameLogged("user_a", TABLE, roster, SECRET)).toEqual({ seat: 1, at: new Date(at), you: true });
  });

  it("names another seat's logger by public id, never an account id", async () => {
    results.push([{ seat: 2, userId: "user_b", publicId: "p-b", displayName: "Bo", at }]);
    const seen = await gameLogged("user_a", TABLE, roster, SECRET);
    expect(seen).toMatchObject({ seat: 2, you: false, publicId: "p-b" });
    expect(JSON.stringify(seen)).not.toContain("user_b");
  });

  it("still reads the game as logged, unnamed, once the logger has left the pod", async () => {
    results.push([{ seat: 2, userId: "user_b", publicId: null, displayName: null, at }]);
    expect(await gameLogged("user_a", TABLE, roster, SECRET)).toEqual({ seat: 2, at: new Date(at), you: false, publicId: null, name: null });
  });

  it("is null when nobody has logged it or the roster does not open", async () => {
    results.push([]);
    expect(await gameLogged("user_a", TABLE, roster, SECRET)).toBeNull();
    expect(await gameLogged("user_a", TABLE, "nope", SECRET)).toBeNull();
  });
});
