// savePreferredStore (store preference PR 3a): refused while the switch is off for the reader and for anything but a
// store the app quotes; Settings revalidates only after a write that changed the choice.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ env: {} as Record<string, string>, set: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../lib/flags/request", () => ({ requestFlags: async () => m.env }));
vi.mock("../../lib/stores/preference", async (orig) => ({
  ...(await orig<typeof import("../../lib/stores/preference")>()),
  setPreferredStore: m.set,
}));

import { savePreferredStore } from "./store-actions";

beforeEach(() => {
  vi.clearAllMocks();
  m.env = { STORE_PREFERENCE_ENABLED: "true" };
  m.set.mockResolvedValue(true);
});

describe("savePreferredStore", () => {
  it("writes nothing while the switch is off for the reader", async () => {
    m.env = {};
    expect(await savePreferredStore("tcgplayer")).toEqual({ ok: false, reason: "off" });
    expect(m.set).not.toHaveBeenCalled();
  });

  it("refuses anything but a store the app quotes", async () => {
    for (const v of ["ebay", "", null, 1, { store: "tcgplayer" }]) {
      expect(await savePreferredStore(v)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(m.set).not.toHaveBeenCalled();
  });

  it("saves the reader's store and revalidates Settings only on a change", async () => {
    expect(await savePreferredStore("cardkingdom")).toEqual({ ok: true, changed: true });
    expect(m.set).toHaveBeenCalledWith("u1", "cardkingdom");
    expect(m.revalidatePath).toHaveBeenCalledWith("/settings");
    m.revalidatePath.mockClear();
    m.set.mockResolvedValue(false);
    expect(await savePreferredStore("cardkingdom")).toEqual({ ok: true, changed: false });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});
