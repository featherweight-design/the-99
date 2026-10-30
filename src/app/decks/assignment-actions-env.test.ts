// The chooser's pick reads the card back under the reader's resolved switches (admin PR 6f-2), which the
// read's claim model takes. The env is checked by identity, so a dropped argument would be seen.
import { describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

const stub = vi.hoisted(() => ({
  env: null as NodeJS.ProcessEnv | null,
  card: vi.fn(async () => null),
}));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env }));
vi.mock("../../lib/decks/assign", () => ({ assignCopyFor: async () => null }));
vi.mock("../../lib/decks/revalidate-claims", () => ({ revalidateClaims: () => undefined }));
vi.mock("../../lib/collection/summary-read", () => ({ loadContestedCard: stub.card }));

const { assignCopy } = await import("./assignment-actions");

describe("assignCopy", () => {
  it("reads the card back under the reader's resolved env, by identity", async () => {
    stub.env = envViewWith({});
    try {
      expect(await assignCopy("o1", "d1")).toEqual({ ok: true, card: null });
      const [oracleId, userId, opts] = stub.card.mock.calls[0] as unknown as [string, string, { env?: unknown }];
      expect([oracleId, userId]).toEqual(["o1", "user_1"]);
      expect(opts.env === stub.env).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
