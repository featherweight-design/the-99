import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const readFeedback = vi.hoisted(() => vi.fn());
const env = vi.hoisted(() => ({ FEEDBACK_ENABLED: "true" } as Record<string, string>));
vi.mock("../../../lib/admin/access", () => ({ requireAdmin, adminMetadata: async (m: object) => m }));
vi.mock("../../../lib/admin/feedback", () => ({ readFeedback }));
vi.mock("../../../lib/flags/request", () => ({ requestFlags: async () => env }));
vi.mock("../../../components/admin/feedback-list", () => ({
  FeedbackList: ({ filter }: { filter: string }) => <div data-list={filter} />,
}));
const { default: Page } = await import("./page");
const { feedbackAdminCopy } = await import("../../../lib/copy/admin");

const render = async (filter?: string | string[]) => renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ filter }) }));
const READ = { rows: [], counts: { all: 0, problem: 0, check_in: 0 }, fresh: 0, avg: null, hasMore: false };

describe("the Feedback page", () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue({ userId: "u_admin", env: "local" });
    readFeedback.mockReset().mockResolvedValue(READ);
    env.FEEDBACK_ENABLED = "true";
  });

  it("gates on the admin before it reads anything", async () => {
    requireAdmin.mockRejectedValueOnce(new Error("NEXT_NOT_FOUND"));
    await expect(render()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(readFeedback).not.toHaveBeenCalled();
  });

  it("draws one plain line and reads nothing when the switch is off", async () => {
    env.FEEDBACK_ENABLED = "off";
    expect(await render()).toContain(feedbackAdminCopy.off);
    expect(readFeedback).not.toHaveBeenCalled();
  });

  it("reads the filter from the address, anything unknown reading as all", async () => {
    expect(await render("problem")).toContain('data-list="problem"');
    expect(readFeedback).toHaveBeenLastCalledWith({ filter: "problem" });
    expect(await render("<script>")).toContain('data-list="all"');
    expect(await render(["check_in", "problem"])).toContain('data-list="check_in"');
  });
});
