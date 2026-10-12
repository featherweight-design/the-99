import { describe, expect, it } from "vitest";
import {
  assertDeployedBase,
  lookupUserId,
  mintSignInToken,
  perfLinesFromVercel,
  spansForRequest,
  statDelta,
  vercelRequestId,
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
    JSON.stringify({ id: "a-1-x", timestamp: 2000, logs: [{ message: "[perf] / total=310 home=200" }] }),
    JSON.stringify({ id: "b-2-y", timestamp: 1000, message: "[perf] /decks total=120" }),
    JSON.stringify({ id: "c-3-z", timestamp: 3000, logs: ["noise", "[perf] /decks/[id] total=900 a=1\nother"] }),
    "not json",
    JSON.stringify({ timestamp: 4000, logs: ["[perf] / total=1"] }),
    JSON.stringify({ id: "d-4-w", timestamp: 4000, logs: [] }),
  ].join("\n");

  it("keys every line by the request that logged it, in all four shapes", () => {
    const byId = perfLinesFromVercel(jsonl);
    expect([...byId.entries()]).toEqual([
      ["a-1-x", ["/ total=310 home=200"]],
      ["b-2-y", ["/decks total=120"]],
      ["c-3-z", ["/decks/[id] total=900 a=1"]],
    ]);
  });

  it("finds a request's line by its id and pattern, and nothing for another request", () => {
    const byId = perfLinesFromVercel(jsonl);
    expect(spansForRequest(byId, "a-1-x", "/")).toBe("/ total=310 home=200");
    expect(spansForRequest(byId, "a-1-x", "/decks")).toBeNull();
    expect(spansForRequest(byId, "zzz", "/")).toBeNull();
    expect(spansForRequest(byId, null, "/")).toBeNull();
  });
});

describe("vercelRequestId", () => {
  it("is the header's last segment, the id the log entry carries", () => {
    expect(vercelRequestId("sfo1::pdx1::pxmsz-1791830682642-bc0f83b831af")).toBe("pxmsz-1791830682642-bc0f83b831af");
    expect(vercelRequestId(undefined)).toBeNull();
    expect(vercelRequestId("")).toBeNull();
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
