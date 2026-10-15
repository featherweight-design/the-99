import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const recordAboutVisit = vi.fn(async (_shown?: readonly string[]) => {});
vi.mock("../../app/about/actions", () => ({ recordAboutVisit }));

const { RecordVisit } = await import("./record-visit");
const { aboutAcknowledged, resetArrivalsAcknowledged } = await import("../home/arrivals-seen");

beforeEach(() => {
  recordAboutVisit.mockClear();
  resetArrivalsAcknowledged();
});

describe("RecordVisit (R6 §O4, audit E2)", () => {
  it("records once after mount when the reader is behind", () => {
    render(<RecordVisit behind shown={["notes"]} />);
    expect(recordAboutVisit).toHaveBeenCalledOnce();
    expect(recordAboutVisit).toHaveBeenCalledWith(["notes"]);
  });

  it("records once under StrictMode's double effect", () => {
    render(
      <StrictMode>
        <RecordVisit behind shown={[]} />
      </StrictMode>,
    );
    expect(recordAboutVisit).toHaveBeenCalledOnce();
  });

  it("records nothing for a reader who is current", () => {
    render(<RecordVisit behind={false} shown={[]} />);
    expect(recordAboutVisit).not.toHaveBeenCalled();
  });

  it("records nothing during a server render, which is all a prefetch is", () => {
    renderToString(<RecordVisit behind shown={[]} />);
    expect(recordAboutVisit).not.toHaveBeenCalled();
  });

  // About on the banner: Back to Home after a visit must not bring About's line back from the router's payload.
  it("tells Home's banner, once the write lands, that every entry the page drew is answered", async () => {
    render(<RecordVisit behind shown={["notes"]} drawn={["browse", "notes"]} />);
    expect(aboutAcknowledged(["notes"])).toBe(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(aboutAcknowledged(["notes"])).toBe(true);
    expect(aboutAcknowledged(["browse", "notes"])).toBe(true);
    expect(aboutAcknowledged(["notes", "lineup"])).toBe(false);
  });

  it("acknowledges nothing when the write fails", async () => {
    recordAboutVisit.mockRejectedValueOnce(new Error("offline"));
    render(<RecordVisit behind shown={["notes"]} drawn={["notes"]} />);
    await Promise.resolve();
    await Promise.resolve();
    expect(aboutAcknowledged(["notes"])).toBe(false);
  });

  it("a late failure of an older visit leaves a later visit's acknowledgement standing", async () => {
    let reject!: (e: Error) => void;
    recordAboutVisit.mockImplementationOnce(() => new Promise<void>((_, r) => { reject = r; }));
    const first = render(<RecordVisit behind shown={["notes"]} drawn={["notes"]} />);
    first.unmount();
    // Another tab marked About seen meanwhile: this tab's next /about mount is current and writes nothing.
    render(<RecordVisit behind={false} shown={[]} drawn={["notes"]} />);
    reject(new Error("offline"));
    await Promise.resolve();
    await Promise.resolve();
    expect(aboutAcknowledged(["notes"])).toBe(true);
  });

  it("a re-run effect while the write is pending leaves nothing acknowledged when it fails", async () => {
    let reject!: (e: Error) => void;
    recordAboutVisit.mockImplementationOnce(() => new Promise<void>((_, r) => { reject = r; }));
    const { rerender } = render(<RecordVisit behind shown={["notes"]} drawn={["notes"]} />);
    rerender(<RecordVisit behind shown={["notes"]} drawn={["notes", "browse"]} />);
    reject(new Error("offline"));
    await Promise.resolve();
    await Promise.resolve();
    expect(aboutAcknowledged(["notes"])).toBe(false);
    expect(recordAboutVisit).toHaveBeenCalledTimes(1);
  });

  it("acknowledges what it drew for a current reader too, with no write: a stale Home in this tab still holds the line", () => {
    render(<RecordVisit behind={false} shown={[]} drawn={["notes"]} />);
    expect(aboutAcknowledged(["notes"])).toBe(true);
    expect(recordAboutVisit).not.toHaveBeenCalled();
  });
});
