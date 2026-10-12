// The proxy's resolved switches, carried to the page: decoded exactly, and refused when malformed.
import { describe, expect, it, vi } from "vitest";
import { SWITCH_NAMES } from "./registry";

const requestHeaders = vi.hoisted(() => ({ value: new Headers() }));
vi.mock("next/headers", () => ({ headers: async () => requestHeaders.value }));
const resolveSwitchEnv = vi.hoisted(() => vi.fn(async () => ({ RESOLVED_HERE: "1" }) as unknown as NodeJS.ProcessEnv));
vi.mock("./snapshot", () => ({ resolveSwitchEnv }));

const { envFromSwitchBits, requestSwitchEnv, SWITCHES_HEADER } = await import("./request");
const base = { OTHER: "x" } as unknown as NodeJS.ProcessEnv;

describe("envFromSwitchBits", () => {
  it("sets each switch from its bit and passes every other variable through", () => {
    const bits = SWITCH_NAMES.map((_, i) => (i === 0 ? "1" : "0")).join("");
    const env = envFromSwitchBits(bits, base)!;
    expect(env[SWITCH_NAMES[0]]).toBe("true");
    expect(env[SWITCH_NAMES[1]]).toBe("false");
    expect(env.OTHER).toBe("x");
  });

  it("refuses a header that is absent, the wrong length or not bits", () => {
    expect(envFromSwitchBits(null, base)).toBeNull();
    expect(envFromSwitchBits("1", base)).toBeNull();
    expect(envFromSwitchBits("2".repeat(SWITCH_NAMES.length), base)).toBeNull();
  });
});

describe("requestSwitchEnv", () => {
  it("takes the proxy's decision when it sent one, and resolves here only when it did not", async () => {
    requestHeaders.value = new Headers({ [SWITCHES_HEADER]: "1".repeat(SWITCH_NAMES.length) });
    expect((await requestSwitchEnv("u1", base))[SWITCH_NAMES[0]]).toBe("true");
    expect(resolveSwitchEnv).not.toHaveBeenCalled();
    requestHeaders.value = new Headers();
    expect((await requestSwitchEnv("u1", base)).RESOLVED_HERE).toBe("1");
    expect(resolveSwitchEnv).toHaveBeenCalledWith("u1", base);
  });
});
