import { render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const record = vi.hoisted(() => vi.fn(async (_area: unknown, _claimed?: unknown): Promise<string[]> => ["decks/games/matchups", "rule/lock"]));
vi.mock("../../../app/about/actions", () => ({ recordAboutPageVisit: record }));

const { RecordPageVisit } = await import("./record-page-visit");
const { aboutFirstRunOver, launchAcknowledged, resetArrivalsAcknowledged } = await import("../../home/arrivals-seen");

beforeEach(() => {
  resetArrivalsAcknowledged();
  record.mockClear();
});

describe("RecordPageVisit (About visual PR 6b)", () => {
  it("writes once the page is open and acknowledges what the write wrote, once it lands", async () => {
    // `keys` is every key of the page; `claimed` only those this render named for the write.
    render(<RecordPageVisit area="decks" owed keys={["decks/games/log", "decks/games/matchups"]} claimed={["decks/games/matchups"]} />);
    // The keys this render named for the write go with it: the server writes only those it still draws.
    expect(record).toHaveBeenCalledWith("decks", ["decks/games/matchups"]);
    await waitFor(() => expect(launchAcknowledged("rule/lock")).toBe(true));
    expect(launchAcknowledged("decks/games/matchups")).toBe(true);
  });

  // Review round 4: a refresh in place (a switch turned on, then `ThemeRefresh`) draws new keys to write.
  it("records again when a re-render in place claims new keys, and not for the same claim re-sent", async () => {
    const { rerender } = render(<RecordPageVisit area="decks" owed keys={["decks/games/matchups"]} claimed={["decks/games/matchups"]} />);
    await waitFor(() => expect(launchAcknowledged("rule/lock")).toBe(true));
    rerender(<RecordPageVisit area="decks" owed keys={["decks/games/matchups"]} claimed={["decks/games/matchups"]} />);
    expect(record).toHaveBeenCalledTimes(1);
    rerender(<RecordPageVisit area="decks" owed keys={["decks/games/matchups", "decks/your-deck/lock"]} claimed={["decks/your-deck/lock"]} />);
    expect(record).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenLastCalledWith("decks", ["decks/your-deck/lock"]);
    // The same keys in a new array, in another order, are the same visit.
    rerender(<RecordPageVisit area="decks" owed keys={["decks/your-deck/lock", "decks/games/matchups"]} claimed={["decks/your-deck/lock"]} />);
    expect(record).toHaveBeenCalledTimes(2);
  });

  it("writes once under StrictMode's double effect", () => {
    render(<StrictMode><RecordPageVisit area="decks" owed keys={["decks/games/log"]} claimed={["decks/games/log"]} /></StrictMode>);
    expect(record).toHaveBeenCalledTimes(1);
  });

  it("writes nothing when nothing is owed, and acknowledges this page's keys at once", () => {
    render(<RecordPageVisit area="decks" owed={false} keys={["decks/games/log"]} claimed={[]} />);
    expect(record).not.toHaveBeenCalled();
    expect(launchAcknowledged("decks/games/log")).toBe(true);
  });

  // Review round 2: Lock on when Home rendered, off before the first visit. The baseline omits Lock's key, so the
  // first-run line's ids are never all acknowledged, yet the reader is past their first run.
  it("ends the first run in this document once the write confirms held keys, though the line's ids are not all written", async () => {
    record.mockResolvedValueOnce(["home/home/ready"]);
    render(<RecordPageVisit area="home" owed keys={["home/home/ready"]} claimed={["home/home/ready", "decks/your-deck/lock"]} />);
    await waitFor(() => expect(aboutFirstRunOver()).toBe(true));
    expect(launchAcknowledged("decks/your-deck/lock")).toBe(false);
  });

  it("ends the first run on the already-current path too: holding this page's keys is past it", () => {
    render(<RecordPageVisit area="decks" owed={false} keys={["decks/games/log"]} claimed={[]} />);
    expect(aboutFirstRunOver()).toBe(true);
  });

  it("ends nothing for an empty set, or a write that failed", async () => {
    render(<RecordPageVisit area="decks" owed={false} keys={[]} claimed={[]} />);
    expect(aboutFirstRunOver()).toBe(false);
    record.mockRejectedValueOnce(new Error("offline"));
    render(<RecordPageVisit area="home" owed keys={[]} claimed={["home/home/ready"]} />);
    await waitFor(() => expect(record).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(aboutFirstRunOver()).toBe(false);
  });

  it("acknowledges nothing when the write fails, so the banner tells the reader again", async () => {
    record.mockRejectedValueOnce(new Error("offline"));
    render(<RecordPageVisit area="decks" owed keys={["decks/games/matchups"]} claimed={["decks/games/matchups"]} />);
    await waitFor(() => expect(record).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(launchAcknowledged("decks/games/matchups")).toBe(false);
  });
});
