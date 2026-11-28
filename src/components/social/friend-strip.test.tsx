// The friend strip's Spares tab (friend trades, Spares S0): an accent diamond, read aloud, while a trade with this
// friend waits on the reader, and the tab drawn for it even when the friend offers no spares.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tradeCopy } from "../../lib/copy/trades";
import { FriendStrip } from "./friend-strip";

vi.mock("next/navigation", () => ({ usePathname: () => "/friends/p-colin" }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
afterEach(cleanup);

describe("FriendStrip's trade diamond", () => {
  it("marks Spares, read aloud, while a trade waits on the reader", () => {
    render(<FriendStrip publicId="p-colin" counts={{ decks: 2, spares: 3 }} tradeWaits />);
    const waits = screen.getByTestId("friend-tab-spares-waits");
    expect(waits.textContent).toContain(tradeCopy.tabWaits);
  });

  it("draws no diamond when nothing waits", () => {
    render(<FriendStrip publicId="p-colin" counts={{ decks: 2, spares: 3 }} />);
    expect(screen.getByTestId("friend-tab-spares")).toBeTruthy();
    expect(screen.queryByTestId("friend-tab-spares-waits")).toBeNull();
  });

  it("draws Spares for a waiting trade even when the friend offers no spares", () => {
    render(<FriendStrip publicId="p-colin" counts={{ decks: 2 }} tradeWaits />);
    expect(screen.getByTestId("friend-tab-spares-waits")).toBeTruthy();
    cleanup();
    render(<FriendStrip publicId="p-colin" counts={{ decks: 2 }} />);
    expect(screen.queryByTestId("friend-tab-spares")).toBeNull();
  });
});
