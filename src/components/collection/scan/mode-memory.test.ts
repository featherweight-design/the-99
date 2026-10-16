import { describe, expect, it } from "vitest";
import { MODE_KEY, readScanMode, writeScanMode } from "./mode-memory";

const store = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

describe("scan mode memory", () => {
  it("starts at Fast and remembers Normal", () => {
    const s = store();
    expect(readScanMode(s)).toBe("fast");
    writeScanMode(s, "normal");
    expect(s.m.get(MODE_KEY)).toBe("normal");
    expect(readScanMode(s)).toBe("normal");
  });

  it("reads Fast from storage that throws or is missing, and a write that throws is swallowed", () => {
    const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
    expect(readScanMode(broken)).toBe("fast");
    expect(() => writeScanMode(broken, "normal")).not.toThrow();
    expect(readScanMode(null)).toBe("fast");
    expect(readScanMode({ getItem: () => "garbage" })).toBe("fast");
  });
});
