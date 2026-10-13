// The import receipt's page hands its read the reader's resolved switches (admin PR 6f-2): the read's
// claim model decides NEVER_CUT_ENABLED's `locked` key and CHANGE_COMMANDER_ENABLED's pending clause from
// that env, and ADDED_COPY_ENABLED decides whether each line's chooser is read. Every one is the other way
// in the environment here, so a dropped argument would be seen.
import { describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

const UPLOAD = "33333333-3333-4333-8333-333333333333";
const stub = vi.hoisted(() => ({
  env: null as NodeJS.ProcessEnv | null,
  view: vi.fn(async () => null),
}));

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("notFound"); } }));
vi.mock("../../../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../../../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env }));
vi.mock("../../../../../lib/collection/summary-read", () => ({ loadSummaryView: stub.view }));

const { default: ImportSummaryPage } = await import("./page");

describe("the import receipt page", () => {
  it("reads the receipt under the reader's resolved env, by identity, and its switch from that env", async () => {
    for (const k of ["NEVER_CUT_ENABLED", "CHANGE_COMMANDER_ENABLED", "ADDED_COPY_ENABLED", "COLLECTION_EDIT_ENABLED"]) vi.stubEnv(k, "false");
    stub.env = envViewWith({
      NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true", ADDED_COPY_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true",
    });
    try {
      // A null view is a not-found; the read's arguments are what is under test.
      await expect(ImportSummaryPage({ params: Promise.resolve({ uploadId: UPLOAD }) })).rejects.toThrow("notFound");
      const [uploadId, userId, opts] = stub.view.mock.calls[0] as unknown as [string, string, { addedCopy?: boolean; env?: unknown }];
      expect([uploadId, userId, opts.addedCopy]).toEqual([UPLOAD, "user_1", true]);
      expect(opts.env === stub.env).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
