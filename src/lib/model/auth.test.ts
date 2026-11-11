import { describe, expect, it } from "vitest";

import { anthropicAuth, requireAnthropicAuth } from "./auth";

const none = () => false;

describe("how a process reaches Anthropic", () => {
  it("is a key when ANTHROPIC_API_KEY is set, and the key wins over a profile", () => {
    expect(anthropicAuth({ ANTHROPIC_API_KEY: "sk-ant-x", ANTHROPIC_PROFILE: "p" }, () => true)).toBe("key");
  });
  it("ignores an empty key, and agrees with the client in taking any other value as one", () => {
    expect(anthropicAuth({ ANTHROPIC_API_KEY: "" }, none)).toBe("none");
    expect(anthropicAuth({ ANTHROPIC_API_KEY: " " }, none)).toBe("key");
  });
  it("is a profile when ANTHROPIC_PROFILE is set, or the config dir holds active_config", () => {
    expect(anthropicAuth({ ANTHROPIC_PROFILE: "the-99" }, none)).toBe("profile");
    expect(anthropicAuth({}, (p) => p.endsWith("/.config/anthropic/active_config"))).toBe("profile");
  });
  it("looks in ANTHROPIC_CONFIG_DIR, then XDG_CONFIG_HOME, as the SDK does", () => {
    const seen: string[] = [];
    anthropicAuth({ ANTHROPIC_CONFIG_DIR: "/cfg" }, (p) => (seen.push(p), false));
    anthropicAuth({ XDG_CONFIG_HOME: "/xdg" }, (p) => (seen.push(p), false));
    expect(seen).toEqual(["/cfg/active_config", "/xdg/anthropic/active_config"]);
  });
  it("is none with neither", () => {
    expect(anthropicAuth({}, none)).toBe("none");
  });
  it("throws a line that names ant auth login when there is none, and returns how it will authenticate otherwise", () => {
    expect(() => requireAnthropicAuth("the-script", {}, none)).toThrow(/the-script: .*`ant auth login`/);
    expect(requireAnthropicAuth("s", { ANTHROPIC_API_KEY: "k" }, none)).toBe("key");
    expect(requireAnthropicAuth("s", { ANTHROPIC_PROFILE: "p" }, none)).toBe("profile");
  });
});
