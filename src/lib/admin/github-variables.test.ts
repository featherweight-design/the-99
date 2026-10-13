// @vitest-environment node
// The job switches' reader (admin STATES M1, M2): the token goes in one header and nowhere else, any
// failure draws M2 with one fixed log line, and only the six listed variables come back.
import { afterEach, describe, expect, it, vi } from "vitest";
import { GITHUB_VARIABLES_URL, pickJobValues, readJobValues, UNREAD_LOG, type GithubDeps } from "./github-variables";
import { JOB_VARIABLE_NAMES } from "./models";

const TOKEN = "github_pat_SECRET_fixture_0123456789";

const BODY = {
  total_count: 4,
  variables: [
    { name: "CATALOG_REFRESH_ENABLED", value: "true" },
    { name: "PROSE_MAX_USD", value: "0" },
    { name: "SOME_OTHER_VARIABLE", value: "leak-me" },
    { name: "ANOTHER_UNLISTED", value: 7 },
  ],
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function deps(over: Partial<GithubDeps> = {}) {
  const log = vi.fn<(line: string) => void>();
  const fetch = vi.fn<typeof globalThis.fetch>(async () => json(BODY));
  return { log, fetch, d: { token: TOKEN, fetch, log, ...over } as GithubDeps };
}

const consoleSpies = () => (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));

afterEach(() => vi.restoreAllMocks());

describe("readJobValues", () => {
  it("reads the listed variables with the token in the Authorization header only, uncached", async () => {
    const { d, fetch, log } = deps();
    const out = await readJobValues(d);
    expect(out.values).toEqual({
      CATALOG_REFRESH_ENABLED: "true", COMBO_REFRESH_ENABLED: null, COMMANDER_INDEX_ENABLED: null,
      CARD_LABELS_ENABLED: null, TUNING_CHECK_ENABLED: null, PROSE_MAX_USD: "0",
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(GITHUB_VARIABLES_URL);
    expect(String(url)).not.toContain(TOKEN);
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(init?.cache).toBe("no-store");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(log).not.toHaveBeenCalled();
  });

  it("returns only the six listed names, never another variable or the token", async () => {
    const out = await readJobValues(deps().d);
    expect(Object.keys(out.values!).sort()).toEqual([...JOB_VARIABLE_NAMES].sort());
    const text = JSON.stringify(out);
    expect(text).not.toContain("leak-me");
    expect(text).not.toContain("SOME_OTHER_VARIABLE");
    expect(text).not.toContain(TOKEN);
  });

  it("makes no request, logs nothing and draws M2 without a token (the token is optional)", async () => {
    for (const token of [undefined, "", "   "]) {
      const { d, fetch, log } = deps({ token });
      expect(await readJobValues(d)).toEqual({ values: null });
      expect(fetch).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    }
  });

  const failures: [string, () => Promise<Response>][] = [
    ["a 401", async () => json({ message: `Bad credentials ${TOKEN}` }, 401)],
    ["a 500", async () => new Response(`upstream ${TOKEN}`, { status: 500 })],
    ["a throw", async () => { throw new Error(`network ${TOKEN}`); }],
    ["a timeout", async () => { throw new DOMException(`timed out ${TOKEN}`, "TimeoutError"); }],
    ["bad JSON", async () => new Response("not json", { status: 200 })],
    ["the wrong shape", async () => json({ variables: "nope" })],
    ["a listed variable with a malformed value", async () => json({ variables: [{ name: "PROSE_MAX_USD", value: 0 }] })],
  ];
  for (const [what, respond] of failures) {
    it(`draws M2 on ${what}, with one fixed log line that carries nothing of the token or the response`, async () => {
      const spies = consoleSpies();
      const log = vi.fn<(line: string) => void>();
      const out = await readJobValues({ token: TOKEN, fetch: vi.fn(respond) as unknown as typeof fetch, log });
      expect(out).toEqual({ values: null });
      expect(log.mock.calls).toEqual([[UNREAD_LOG]]);
      for (const s of spies) expect(s).not.toHaveBeenCalled();
    });
  }

  it("never writes the token to the console through its default logger", async () => {
    vi.stubEnv("ADMIN_GITHUB_TOKEN", TOKEN);
    const spies = consoleSpies();
    vi.stubGlobal("fetch", vi.fn(async () => json({ message: TOKEN }, 403)));
    try {
      expect(await readJobValues()).toEqual({ values: null });
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
    const said = spies.flatMap((s) => s.mock.calls.flat().map(String));
    expect(said).toEqual([UNREAD_LOG]);
    expect(said.join(" ")).not.toContain(TOKEN);
  });
});

describe("pickJobValues", () => {
  it("refuses a body that is not the documented shape", () => {
    expect(pickJobValues(null)).toBeNull();
    expect(pickJobValues([])).toBeNull();
    expect(pickJobValues({})).toBeNull();
  });
  it("rejects the whole body when a LISTED variable's value is not a string, and ignores a malformed unlisted one", () => {
    for (const value of [7, null, true, { v: "true" }, undefined]) {
      expect(pickJobValues({ variables: [{ name: "CATALOG_REFRESH_ENABLED", value: "true" }, { name: "CARD_LABELS_ENABLED", value }] })).toBeNull();
    }
    expect(pickJobValues({ variables: [{ name: "UNLISTED", value: 7 }, { name: "CARD_LABELS_ENABLED", value: "true" }] })!.CARD_LABELS_ENABLED).toBe("true");
  });

  it("cuts a long value", () => {
    expect(pickJobValues({ variables: [{ name: "PROSE_MAX_USD", value: "9".repeat(200) }] })!.PROSE_MAX_USD).toHaveLength(64);
  });
});
