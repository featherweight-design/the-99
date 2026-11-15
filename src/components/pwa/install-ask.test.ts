import { beforeEach, describe, expect, it, vi } from "vitest";
import { INSTALL_ROW_KEY, installAsk, markInstallStopSeen, offerInstallAsk } from "./install-ask";
import { removeRaw, writeRaw } from "../ui/local-store";

beforeEach(() => removeRaw(INSTALL_ROW_KEY));

describe("the Install slot's ask", () => {
  it("is held while offered, and a stale withdrawal never clears a newer offer", () => {
    const a = { kind: "safari" as const, press: vi.fn(), button: () => null };
    const b = { kind: "android" as const, press: vi.fn(), button: () => null };
    const withdrawA = offerInstallAsk(a);
    const withdrawB = offerInstallAsk(b);
    withdrawA();
    expect(installAsk()).toBe(b);
    withdrawB();
    expect(installAsk()).toBeNull();
  });
});

describe("markInstallStopSeen", () => {
  it("marks the fallback row seen, and never over a retired one", () => {
    markInstallStopSeen();
    expect(localStorage.getItem(INSTALL_ROW_KEY)).toBe("seen");
    writeRaw(INSTALL_ROW_KEY, "retired");
    markInstallStopSeen();
    expect(localStorage.getItem(INSTALL_ROW_KEY)).toBe("retired");
  });
});
