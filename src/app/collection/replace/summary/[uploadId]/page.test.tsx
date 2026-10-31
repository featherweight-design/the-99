// The import receipt's page: each line's chooser is always read, the stamp's date follows its word, and the
// receipt is handed the upload's mode.
import { describe, expect, it, vi } from "vitest";

const UPLOAD = "33333333-3333-4333-8333-333333333333";
const stub = vi.hoisted(() => ({
  view: vi.fn(async (): Promise<unknown> => null),
}));

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("notFound"); } }));
vi.mock("../../../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../../../lib/collection/summary-read", () => ({ loadSummaryView: stub.view }));

const { default: ImportSummaryPage } = await import("./page");

describe("the import receipt page", () => {
  it("reads the receipt with the choosers", async () => {
    // A null view is a not-found; the read's arguments are what is under test.
    await expect(ImportSummaryPage({ params: Promise.resolve({ uploadId: UPLOAD }) })).rejects.toThrow("notFound");
    const [uploadId, userId, opts] = stub.view.mock.calls[0] as unknown as [string, string, { addedCopy?: boolean }];
    expect([uploadId, userId, opts.addedCopy]).toEqual([UPLOAD, "user_1", true]);
  });

  // The stamp's date follows its word: a Sync says "synced" and is dated by the confirm, which is the
  // day History dates the entry; a Replace says "uploaded" and is dated by the file's arrival. A review
  // left open overnight is the case that tells them apart.
  it("dates a Sync's stamp by the confirm and a Replace's by the upload", async () => {
    const base = {
      uploadId: UPLOAD, filename: "f.csv", summary: null, contested: [], chooser: {},
      createdAt: new Date("2026-10-08T23:30:00Z"), confirmedAt: new Date("2026-10-09T08:00:00Z"),
    };
    const stampOf = async (sync: unknown) => {
      stub.view.mockResolvedValueOnce({ ...base, sync });
      const el = await ImportSummaryPage({ params: Promise.resolve({ uploadId: UPLOAD }) }) as unknown as { props: { children: { props: { stampDate: string } } } };
      return el.props.children.props.stampDate;
    };
    expect(await stampOf({ kept: 0, decided: 0, tokens: 0, cards: 1 })).toBe("Oct 9, 2026");
    expect(await stampOf(null)).toBe("Oct 8, 2026");
  });

  // The receipt's words follow what the upload did, so the page hands the component the view's mode.
  it("hands the receipt the upload's mode", async () => {
    const modeOf = async (mode: "replace" | "add") => {
      stub.view.mockResolvedValueOnce({
        uploadId: UPLOAD, filename: "f.csv", summary: null, contested: [], chooser: {}, sync: null, mode,
        createdAt: new Date("2026-10-08T23:30:00Z"), confirmedAt: new Date("2026-10-09T08:00:00Z"),
      });
      const el = await ImportSummaryPage({ params: Promise.resolve({ uploadId: UPLOAD }) }) as unknown as { props: { children: { props: { mode: string } } } };
      return el.props.children.props.mode;
    };
    expect(await modeOf("add")).toBe("add");
    expect(await modeOf("replace")).toBe("replace");
  });
});
