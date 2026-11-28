import { describe, expect, it } from "vitest";
import { foldMailbox } from "./fold";

describe("foldMailbox", () => {
  it("drops a +tag everywhere and the dots of a Gmail local part, and folds googlemail.com", () => {
    expect(foldMailbox("Sam+flyer@Example.com")).toBe("sam@example.com");
    expect(foldMailbox("s.a.m+x@googlemail.com")).toBe("sam@gmail.com");
  });
  it("keeps the dots of any other provider", () => {
    expect(foldMailbox("s.a.m@example.com")).toBe("s.a.m@example.com");
  });
  it("is null for anything that is not an address", () => {
    for (const bad of ["", "no-at", "@example.com", "+tag@example.com", "a b@example.com", "a@localhost"]) expect(foldMailbox(bad)).toBeNull();
  });
  it("forgives a trailing dot on the domain and compatibility forms", () => {
    expect(foldMailbox("sam@example.com.")).toBe("sam@example.com");
    expect(foldMailbox("ｓam@example.com")).toBe("sam@example.com");
  });
});
