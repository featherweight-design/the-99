import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const record = vi.hoisted(() => vi.fn(async (_area: unknown): Promise<string[]> => ["decks/games/matchups", "rule/lock"]));
vi.mock("../../../app/about/actions", () => ({ recordAboutPageVisit: record }));

const { RecordPageVisit } = await import("./record-page-visit");
const { launchAcknowledged, resetArrivalsAcknowledged } = await import("../../home/arrivals-seen");

beforeEach(() => {
  resetArrivalsAcknowledged();
  record.mockClear();
});

describe("RecordPageVisit (About visual PR 6b)", () => {
  it("writes once the page is open and acknowledges what the write wrote, once it lands", async () => {
    render(<RecordPageVisit area="decks" owed keys={["decks/games/matchups"]} />);
    expect(record).toHaveBeenCalledWith("decks");
    await waitFor(() => expect(launchAcknowledged("rule/lock")).toBe(true));
    expect(launchAcknowledged("decks/games/matchups")).toBe(true);
  });

  it("writes nothing when nothing is owed, and acknowledges this page's keys at once", () => {
    render(<RecordPageVisit area="decks" owed={false} keys={["decks/games/log"]} />);
    expect(record).not.toHaveBeenCalled();
    expect(launchAcknowledged("decks/games/log")).toBe(true);
  });

  it("acknowledges nothing when the write fails, so the banner tells the reader again", async () => {
    record.mockRejectedValueOnce(new Error("offline"));
    render(<RecordPageVisit area="decks" owed keys={["decks/games/matchups"]} />);
    await waitFor(() => expect(record).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(launchAcknowledged("decks/games/matchups")).toBe(false);
  });
});
