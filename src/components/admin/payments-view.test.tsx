// The Payments tab's view (admin plan A2b): the month it names, the tiles per currency (never added together), and the
// lots and gifts named masked.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../app/admin/payments/actions", () => ({ grantCredits: vi.fn() }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));

const { PaymentsView } = await import("./payments-view");

const OCT = { year: 2026, month: 9 };
const payments = {
  revenue: [
    { currency: "usd", payments: 2, grossCents: 2_000, taxCents: 150, unattributed: 1, netCents: 1_850 },
    { currency: "eur", payments: 1, grossCents: 500, taxCents: 0, unattributed: 0, netCents: 500 },
  ],
  grants: [{ id: "g1", userId: "u_mara", source: "gift" as const, units: 3, revokedUnits: 1, createdAt: new Date("2026-10-18T12:00:00Z") }],
  grantsTotal: 1,
  gifts: [{ at: new Date("2026-10-18T12:00:00Z"), actorId: "u_hugh", userId: "u_mara", units: 3, note: "a failed run" }],
};
const view = (month = OCT) =>
  render(<PaymentsView month={month} current={OCT} payments={payments} spendMicro={28_000} names={{ u_mara: "Mara K.", u_hugh: "Hugh H." }} accounts={[]} clerk="ok" />);

describe("PaymentsView", () => {
  it("names the month it reads (MonthKey months count from 0), and steps back but not past now", () => {
    view();
    expect(screen.getByTestId("payments-month")).toHaveTextContent("October 2026");
    expect(screen.getByRole("link", { name: "Previous month" })).toHaveAttribute("href", "/admin/payments?month=2026-09");
    expect(screen.queryByRole("link", { name: "Next month" })).toBeNull();
  });

  it("draws USD's paid, tax and net beside model spend, and another currency apart, never added in", () => {
    view();
    const tiles = within(screen.getByTestId("payments-tiles")).getAllByText(/^\$/).map((e) => e.textContent);
    expect(tiles).toEqual(["$20.00", "$1.50", "$18.50", "$0.028"]);
    expect(screen.getByText("2 payments · 1 unattributed")).toBeInTheDocument();
    expect(screen.getByText("In EUR")).toBeInTheDocument();
    expect(screen.getAllByText("5.00 EUR")).toHaveLength(2); // paid and net; no tax
  });

  it("names lots and gifts masked, with what was taken back and why", () => {
    view();
    expect(screen.getAllByText("3 · 1 taken back").length).toBeGreaterThan(0);
    expect(screen.getByText("Hugh H. gave Mara K. 3 credits")).toBeInTheDocument();
    expect(screen.getByText("“a failed run”")).toBeInTheDocument();
  });
});
