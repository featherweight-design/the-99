// `check:mock-factories`'s failure paths, and the shapes it must leave alone. The two #2693 fixed are fed in
// verbatim; the rest are the shapes the first scan reported falsely, or the review found it missed, cut down to what
// made it do so.
import { describe, expect, it } from "vitest";

import { mockFactoryFindings } from "./mock-factories.mjs";
import { CARD_MODAL_WARM_BEFORE_2693, HEALTH_CHECK_BEFORE_2693 } from "./mock-factories.fixtures.mjs";

const ROOT = "/repo";
const scan = (files: Record<string, string>) =>
  mockFactoryFindings(ROOT, new Map(Object.entries(files).map(([path, source]) => [`${ROOT}/${path}`, source])));
/** `path:line name` for each finding, the form the check prints. */
const found = (files: Record<string, string>) => scan(files).findings.map((f) => `${f.path}:${f.line} ${f.name}`);
/** `line name` for each finding in one file. Fixture sources start with a newline, so line 2 is their first line. */
const one = (source: string) => found({ "src/a.test.ts": source }).map((f) => f.replace(/^src\/a\.test\.ts:/, ""));
/** The `why` of each finding in one file. */
const why = (source: string) => scan({ "src/a.test.ts": source }).findings.map((f) => f.why);

describe("the factories #2693 fixed, as they were", () => {
  it("reports the warm test's counter and gate", () => {
    expect(found({ "src/components/cards/card-modal-warm.test.tsx": CARD_MODAL_WARM_BEFORE_2693 })).toEqual([
      "src/components/cards/card-modal-warm.test.tsx:13 loads",
      "src/components/cards/card-modal-warm.test.tsx:14 gate",
    ]);
  });

  it("reports the health check's stub.initThrows, and not the stub.db it hands over by reference", () => {
    expect(found({ "src/lib/health/check.test.ts": HEALTH_CHECK_BEFORE_2693 })).toEqual(["src/lib/health/check.test.ts:6 stub.initThrows"]);
  });

  it("counts every test file it reads, and the ones with vi.mock", () => {
    const result = scan({ "src/a.test.ts": "it(\"a\", () => {});\n", "src/lib/health/check.test.ts": HEALTH_CHECK_BEFORE_2693 });
    expect([result.files, result.mocking]).toEqual([2, 1]);
  });
});

describe("factory-local state is not test-mutable", () => {
  it("leaves a chain the factory builds and assigns to (synergy-read, games-picker)", () => {
    expect(one(`
const m = vi.hoisted(() => ({ rows: vi.fn(), wheres: [] as unknown[] }));
vi.mock("../../db", () => {
  const chain: Record<string, unknown> = {};
  for (const k of ["from", "groupBy"]) chain[k] = () => chain;
  chain.where = (w: unknown) => { m.wheres.push(w); return chain; };
  chain.then = (ok: (v: unknown) => unknown) => Promise.resolve(m.rows()).then(ok);
  return { db: { select: () => chain } };
});
`)).toEqual([]);
  });

  it("leaves a counter the factory declares (hand-off-actions, tokens/detail, verdicts-v2)", () => {
    expect(one(`
const fx = vi.hoisted(() => ({ updates: 0 }));
vi.mock("../../db", () => {
  let call = 0;
  let reads = 0;
  return { db: { select: () => (call++ === 0 ? [] : [reads++]), reset: () => { call = 0; }, update: async () => { fx.updates += 1; } } };
});
`)).toEqual([]);
  });

  it("resolves a local that shadows a reassigned module binding to the local", () => {
    expect(one(`
let call = 0;
vi.mock("../../db", () => {
  let call = 0;
  call += 1;
  return { db: { call } };
});
beforeEach(() => { call = 5; });
`)).toEqual([]);
  });
});

describe("rerun-on-throw", () => {
  const retry = (annotation: string, cases = 1) => `
let failures = 0;
const other = vi.hoisted(() => ({ flag: false }));
${annotation}
vi.mock("./card-modal", async (importOriginal) => {
  if (failures > 0 || other.flag) {
    failures -= 1;
    throw new Error("chunk failed");
  }
  return importOriginal();
});
${Array.from({ length: cases }, (_, i) => `it("retries ${i}", () => { failures = 2; other.flag = true; });`).join("\n")}
`;

  it("reports the retry factory unannotated, at each read", () => {
    expect(one(retry(""))).toEqual(["6 failures", "6 other.flag"]);
  });

  it("covers only the variable it names (card-modal-retry, card-modal-retry-idle)", () => {
    const result = scan({ "src/a.test.ts": retry("// mock-factory: rerun-on-throw failures throws until it succeeds, one case") });
    expect(result.findings.map((f) => `${f.line} ${f.name}`)).toEqual(["6 other.flag"]);
    expect(result.annotated).toBe(1);
  });

  it("is valid only in a file with one test case", () => {
    const two = retry("// mock-factory: rerun-on-throw failures throws until it succeeds\n// mock-factory: rerun-on-throw other reason", 2);
    expect(why(two)).toEqual([
      expect.stringContaining("in a file with 2 test cases"),
      expect.stringContaining("in a file with 2 test cases"),
      expect.stringContaining("Vitest caches its first result"),
      expect.stringContaining("Vitest caches its first result"),
    ]);
  });

  it("reports an annotation with no variable, no reason, or an unknown kind", () => {
    expect(why(retry("// mock-factory: rerun-on-throw"))).toContainEqual(expect.stringContaining("names no variable"));
    expect(why(retry("// mock-factory: rerun-on-throw failures"))).toContainEqual(expect.stringContaining("names no reason"));
    expect(why(retry("// mock-factory: ignore failures because"))).toContainEqual(expect.stringContaining("is not one of"));
  });

  it("reports an annotation on a factory that never throws, and one that covers nothing", () => {
    const never = `let loads = 0;\n// mock-factory: rerun-on-throw loads it says so\nvi.mock("./x", () => { loads += 1; return {}; });\nit("a", () => {});\n`;
    const nothing = `// mock-factory: rerun-on-throw loads it says so\nvi.mock("./x", () => { throw new Error("no"); });\nit("a", () => {});\n`;
    expect(why(never)).toEqual([expect.stringContaining("never throws"), expect.stringContaining("Vitest caches")]);
    expect(why(nothing)).toEqual([expect.stringContaining("does not touch as it runs")]);
  });
});

describe("set-once", () => {
  const file = (writes: string) => `
const cfg = vi.hoisted(() => ({ mode: "a" }));
// mock-factory: set-once cfg.mode written before the module first loads, never per case
vi.mock("./x", () => ({ mode: cfg.mode }));
${writes}
`;

  it("holds when every write is at module scope or in beforeAll", () => {
    expect(one(file(`cfg.mode = "b";\nbeforeAll(() => { cfg.mode = "c"; });\ndescribe("d", () => { cfg.mode = "e"; });`))).toEqual([]);
  });

  it("fails on a write in beforeEach or a case, naming the line", () => {
    expect(why(file(`beforeEach(() => { cfg.mode = "b"; });`))).toEqual([expect.stringContaining("written at line 5 inside beforeEach(…)"), expect.stringContaining("Vitest caches")]);
    expect(why(file(`it("a", () => { Object.assign(cfg, { mode: "b" }); });`))).toEqual([expect.stringContaining("inside it(…)"), expect.stringContaining("Vitest caches")]);
  });
});

describe("what counts as eager", () => {
  it("leaves reads inside the functions the factory returns, and a vi.fn implementation", () => {
    expect(one(`
let mode = "a";
const stub = vi.hoisted(() => ({ value: 1 }));
vi.mock("./x", () => ({ get: () => mode, read: vi.fn(() => stub.value) }));
it("flips", () => { mode = "b"; stub.value = 2; });
`)).toEqual([]);
  });

  it("follows an IIFE, a function the factory calls, a then callback and a Promise executor", () => {
    expect(one(`
const s = vi.hoisted(() => ({ a: 0, b: 0, c: 0, d: 0 }));
function readB() { return s.b; }
vi.mock("./x", async (orig) => {
  const a = (() => s.a)();
  const b = readB();
  const d = await new Promise((resolve) => resolve(s.d));
  return orig().then((m) => ({ ...m, a, b, c: s.c, d }));
});
it("flips", () => { s.a = 1; s.b = 1; s.c = 1; s.d = 1; });
`)).toEqual(["3 s.b", "5 s.a", "7 s.d", "8 s.c"]);
  });

  it("finds a factory through as, satisfies, parentheses, or a name", () => {
    expect(one(`
let n = 0;
const named = () => ({ n });
vi.mock("./a", (() => ({ n })) as never);
vi.mock("./b", (() => ({ n })) satisfies () => unknown);
vi.mock("./c", named);
it("a", () => { n += 1; });
`)).toEqual(["3 n", "4 n", "5 n"]);
  });

  it("maps a const alias and a destructuring back to the module binding", () => {
    expect(one(`
const stub = vi.hoisted(() => ({ x: 0, y: 0, z: { w: 0 } }));
vi.mock("./a", () => {
  const s = stub;
  const { y, z: { w } } = stub;
  return { x: s.x, get: () => [y, w] };
});
it("a", () => { stub.x = 1; stub.y = 1; stub.z.w = 1; });
`)).toEqual(["5 stub.y", "5 stub.z.w", "6 stub.x"]);
  });
});

describe("writes and whole reads", () => {
  it("counts a mutating method as a write to what is inside its receiver", () => {
    expect(one(`
const m = vi.hoisted(() => ({ list: [] as number[], fn: vi.fn(), map: new Map(), keep: vi.fn() }));
vi.mock("./a", () => ({ first: m.list[0], answer: m.fn(), size: m.map.size, keep: m.keep }));
it("a", () => { m.list.push(1); m.fn.mockReturnValue(2); m.map.set("k", 1); m.keep.mockReset(); });
`)).toEqual(["3 m.list.0", "3 m.fn", "3 m.map.size"]);
  });

  it("counts Reflect.set and Object.defineProperty as writes", () => {
    expect(one(`
const m = vi.hoisted(() => ({ a: 0, b: 0 }));
vi.mock("./a", () => ({ a: m.a, b: m.b }));
it("a", () => { Reflect.set(m, "a", 1); Object.defineProperty(m, "b", { value: 1 }); });
`)).toEqual(["3 m.a", "3 m.b"]);
  });

  it("reads a whole object through a spread, Object.entries/keys/values, an Object.assign source, JSON.stringify and structuredClone", () => {
    expect(one(`
const a = vi.hoisted(() => ({ run: { s: 0 } }));
vi.mock("./1", () => ({ ...a.run }));
vi.mock("./2", () => ({ e: Object.entries(a.run) }));
vi.mock("./3", () => ({ k: Object.keys(a.run), v: Object.values(a.run) }));
vi.mock("./4", () => Object.assign({}, a.run));
vi.mock("./5", () => ({ j: JSON.stringify(a.run) }));
vi.mock("./6", () => ({ c: structuredClone(a.run) }));
it("a", () => { a.run.s = 1; });
`)).toEqual(["3 a.run.s", "4 a.run.s", "5 a.run.s", "6 a.run.s", "7 a.run.s", "8 a.run.s"]);
  });

  it("leaves a plain reference to an object whose property a case assigns", () => {
    expect(one(`
const fx = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));
vi.mock("./x", () => ({ db: fx.db }));
it("flips", () => { fx.db.execute = () => 1; });
`)).toEqual([]);
  });
});

describe("process.env", () => {
  const factory = `vi.mock("./x", () => ({ url: process.env.DATABASE_URL }));\n`;

  it("reports an eager read of a key the file stubs or assigns", () => {
    expect(one(`${factory}it("a", () => { vi.stubEnv("DATABASE_URL", ""); });\n`)).toEqual(["1 process.env.DATABASE_URL"]);
    expect(one(`${factory}it("a", () => { process.env.DATABASE_URL = ""; });\n`)).toEqual(["1 process.env.DATABASE_URL"]);
  });

  it("leaves it when the file changes no env, or only other keys", () => {
    expect(one(factory)).toEqual([]);
    expect(one(`${factory}it("a", () => { vi.stubEnv("OTHER", "1"); });\n`)).toEqual([]);
  });
});
