// `check:mock-factories`'s failure paths, and the shapes it must leave alone. The two #2693 fixed are fed in
// verbatim; the rest are the shapes the first scan reported falsely, cut down to what made it report them.
import { describe, expect, it } from "vitest";

import { mockFactoryFindings } from "./mock-factories.mjs";
import { CARD_MODAL_WARM_BEFORE_2693, HEALTH_CHECK_BEFORE_2693 } from "./mock-factories.fixtures.mjs";

const ROOT = "/repo";
const scan = (files: Record<string, string>) =>
  mockFactoryFindings(ROOT, new Map(Object.entries(files).map(([path, source]) => [`${ROOT}/${path}`, source])));
/** `path:line name` for each finding, the form the check prints. */
const found = (files: Record<string, string>) => scan(files).findings.map((f) => `${f.path}:${f.line} ${f.name}`);
const one = (source: string) => found({ "src/a.test.ts": source }).map((f) => f.replace(/^src\/a\.test\.ts:/, ""));

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
  const retry = (annotation: string) => `
let failures = 0;
${annotation}
vi.mock("./card-modal", async (importOriginal) => {
  if (failures > 0) {
    failures -= 1;
    throw new Error("chunk failed");
  }
  return importOriginal();
});
it("retries", () => { failures = 2; });
`;

  it("reports the retry factory unannotated, at the read", () => {
    expect(one(retry(""))).toEqual(["5 failures"]);
  });

  it("honours the annotation with a reason (card-modal-retry, card-modal-retry-idle)", () => {
    const result = scan({ "src/a.test.ts": retry("// mock-factory: rerun-on-throw throws until it succeeds, one case") });
    expect(result.findings).toEqual([]);
    expect(result.annotated).toBe(1);
  });

  it("reports an annotation with no reason", () => {
    expect(scan({ "src/a.test.ts": retry("// mock-factory: rerun-on-throw") }).findings.map((f) => f.why)).toEqual([
      expect.stringContaining("names no reason"),
    ]);
  });

  it("reports an annotation on a factory that never throws, and one that suppresses nothing", () => {
    const never = `let loads = 0;\n// mock-factory: rerun-on-throw it says so\nvi.mock("./x", () => { loads += 1; return {}; });\n`;
    const nothing = `// mock-factory: rerun-on-throw it says so\nvi.mock("./x", () => { throw new Error("no"); });\n`;
    expect(scan({ "src/a.test.ts": never }).findings.map((f) => f.why)).toEqual([expect.stringContaining("never throws")]);
    expect(scan({ "src/a.test.ts": nothing }).findings.map((f) => f.why)).toEqual([expect.stringContaining("suppresses nothing")]);
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

  it("follows an IIFE, a function the factory calls, and a then callback", () => {
    expect(one(`
const s = vi.hoisted(() => ({ a: 0, b: 0, c: 0 }));
function readB() { return s.b; }
vi.mock("./x", async (orig) => {
  const a = (() => s.a)();
  const b = readB();
  return orig().then((m) => ({ ...m, a, b, c: s.c }));
});
it("flips", () => { s.a = 1; s.b = 1; s.c = 1; });
`)).toEqual(["3 s.b", "5 s.a", "7 s.c"]);
  });

  it("reports a spread of an object whose property a case assigns, not a plain reference to it", () => {
    expect(one(`
const fx = vi.hoisted(() => ({ run: { status: "ok" }, db: {} as Record<string, unknown> }));
vi.mock("./x", () => ({ db: fx.db, run: { ...fx.run } }));
it("flips", () => { fx.run.status = "pending"; fx.db.execute = () => 1; });
`)).toEqual(["3 fx.run.status"]);
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
