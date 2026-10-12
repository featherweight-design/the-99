import { describe, expect, it } from "vitest";
import {
  assertDeployedBase,
  lookupUserId,
  mintSignInToken,
  perfLinesFromVercel,
  spansInWindow,
  statDelta,
  windowFloors,
} from "./measure-deployed.mjs";

describe("assertDeployedBase", () => {
  it("allows staging over https", () => {
    expect(() => assertDeployedBase("https://staging.the-99.dev")).not.toThrow();
  });

  it("refuses production, a local server and plain http", () => {
    expect(() => assertDeployedBase("https://the-99.dev")).toThrow(/staging\.the-99\.dev/);
    expect(() => assertDeployedBase("http://localhost:3060")).toThrow();
    expect(() => assertDeployedBase("http://staging.the-99.dev")).toThrow();
  });
});

describe("mintSignInToken", () => {
  it("asks Clerk for a token for the user, with the secret as a bearer", async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const token = await mintSignInToken("sk_live_x", "user_1", async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push([String(url), init]);
      return new Response(JSON.stringify({ token: "tok" }), { status: 200 });
    });
    expect(token).toBe("tok");
    expect(calls[0][0]).toBe("https://api.clerk.com/v1/sign_in_tokens");
    expect((calls[0][1]!.headers as Record<string, string>).Authorization).toBe("Bearer sk_live_x");
    expect(JSON.parse(calls[0][1]!.body as string)).toMatchObject({ user_id: "user_1" });
  });

  it("throws on a refusal rather than signing in as nobody", async () => {
    await expect(mintSignInToken("k", "u", async () => new Response("no", { status: 401 }))).rejects.toThrow(/401/);
  });
});

describe("perfLinesFromVercel", () => {
  const jsonl = [
    JSON.stringify({ timestamp: 2000, requestPath: "/", logs: [{ message: "[perf] / total=310 home=200" }] }),
    JSON.stringify({ timestamp: 1000, message: "[perf] /decks total=120" }),
    JSON.stringify({ timestamp: 3000, logs: ["noise", "[perf] /decks/[id] total=900 a=1\nother"] }),
    "not json",
    JSON.stringify({ timestamp: 4000, logs: [] }),
  ].join("\n");

  it("reads a line from the message and from both shapes of the logs array, oldest first", () => {
    expect(perfLinesFromVercel(jsonl)).toEqual([
      { at: 1000, line: "/decks total=120" },
      { at: 2000, line: "/ total=310 home=200" },
      { at: 3000, line: "/decks/[id] total=900 a=1" },
    ]);
  });

  it("takes the first line of the right pattern inside the window, and none outside it", () => {
    const lines = perfLinesFromVercel(jsonl);
    expect(spansInWindow(lines, 1500, 2500, "/")).toBe("/ total=310 home=200");
    expect(spansInWindow(lines, 2500, 5000, "/decks")).toBeNull();
    expect(spansInWindow(lines, 2500, 5000, "/decks/[id]")).toBe("/decks/[id] total=900 a=1");
    expect(spansInWindow(lines, 9000, 9500, "/")).toBeNull();
  });
});

describe("window floors", () => {
  it("never takes the previous step's line, even inside the skew second", () => {
    // The warm press logs at 5000 and ends at 5400; the next cold press starts at 5500.
    const lines = [
      { at: 5000, line: "getCardDetail total=40" },
      { at: 5700, line: "getCardDetail total=380" },
    ];
    const warm = { from: 4900, to: 5400 };
    const cold = { from: 5500, to: 6200 };
    const floors = windowFloors([cold, warm]);
    expect(spansInWindow(lines, warm.from, warm.to, "getCardDetail", floors.get(warm))).toBe("getCardDetail total=40");
    expect(spansInWindow(lines, cold.from, cold.to, "getCardDetail", floors.get(cold))).toBe("getCardDetail total=380");
    // Without the floor the skew second reaches back to the warm press's line.
    expect(spansInWindow(lines, cold.from, cold.to, "getCardDetail")).toBe("getCardDetail total=40");
  });
});

describe("a cold load then a warm one, same pattern", () => {
  it("gives each its own line", () => {
    const lines = [
      { at: 1200, line: "/ total=900" },
      { at: 2300, line: "/ total=150" },
    ];
    const cold = { from: 1000, to: 2000 };
    const warm = { from: 2050, to: 2600 };
    const floors = windowFloors([warm, cold]);
    expect(spansInWindow(lines, cold.from, cold.to, "/", floors.get(cold))).toBe("/ total=900");
    expect(spansInWindow(lines, warm.from, warm.to, "/", floors.get(warm))).toBe("/ total=150");
  });
});

describe("statDelta", () => {
  it("is the difference between two snapshots, with no reset", () => {
    expect(statDelta({ ms: "100.4", calls: "7" }, { ms: "250.9", calls: "19" })).toEqual({ ms: 151, calls: 12 });
  });
});

describe("lookupUserId", () => {
  it("returns the one user's id for the email", async () => {
    const id = await lookupUserId("k", "a+b@x.dev", async (url: RequestInfo | URL) => {
      expect(String(url)).toContain("email_address=a%2Bb%40x.dev");
      return new Response(JSON.stringify([{ id: "user_9" }]), { status: 200 });
    });
    expect(id).toBe("user_9");
  });

  it("refuses none or several rather than guessing", async () => {
    await expect(lookupUserId("k", "e", async () => new Response("[]", { status: 200 }))).rejects.toThrow(/found 0/);
    await expect(
      lookupUserId("k", "e", async () => new Response(JSON.stringify([{ id: "a" }, { id: "b" }]), { status: 200 })),
    ).rejects.toThrow(/found 2/);
  });
});
