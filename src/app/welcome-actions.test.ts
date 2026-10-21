import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  lot: vi.fn(),
  dismiss: vi.fn(async () => true),
}));
vi.mock("../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../lib/payments/welcome-read", () => ({ readWelcomeLot: m.lot, dismissWelcomeStrip: m.dismiss }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath, revalidateTag: vi.fn(), updateTag: vi.fn() }));

const { dismissWelcomeStripAction } = await import("./welcome-actions");

const EXPIRES = new Date("2026-11-20T12:00:00Z");

beforeEach(() => {
  m.lot.mockReset();
  m.dismiss.mockClear();
  revalidatePath.mockClear();
});

describe("dismissWelcomeStripAction", () => {
  it("closes the strip for the signed-in reader holding a welcome lot", async () => {
    m.lot.mockResolvedValue({ units: 15, left: 9, expiresAt: EXPIRES, expired: false });
    expect(await dismissWelcomeStripAction()).toEqual({ dismissed: true });
    expect(m.lot).toHaveBeenCalledWith("user_1");
    expect(m.dismiss).toHaveBeenCalledWith("user_1");
  });

  it("closes a used-up lot's strip too: it still draws until the date", async () => {
    m.lot.mockResolvedValue({ units: 15, left: 0, expiresAt: EXPIRES, expired: false });
    expect(await dismissWelcomeStripAction()).toEqual({ dismissed: true });
  });

  it("writes nothing for a reader with no lot, or an expired one: no strip is drawn for them", async () => {
    m.lot.mockResolvedValue(null);
    expect(await dismissWelcomeStripAction()).toEqual({ dismissed: false });
    m.lot.mockResolvedValue({ units: 15, left: 0, expiresAt: EXPIRES, expired: true });
    expect(await dismissWelcomeStripAction()).toEqual({ dismissed: false });
    expect(m.dismiss).not.toHaveBeenCalled();
  });

  it("answers false for a second close, which the writer leaves alone", async () => {
    m.lot.mockResolvedValue({ units: 15, left: 15, expiresAt: EXPIRES, expired: false });
    m.dismiss.mockResolvedValueOnce(false);
    expect(await dismissWelcomeStripAction()).toEqual({ dismissed: false });
  });

  it("revalidates nothing (a Server Action that revalidates ships its caller's page)", async () => {
    m.lot.mockResolvedValue({ units: 15, left: 15, expiresAt: EXPIRES, expired: false });
    await dismissWelcomeStripAction();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
