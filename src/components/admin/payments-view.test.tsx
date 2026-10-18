// The Payments tab's view (admin plan A2b): the month it names, the tiles per currency (never added together), and the
// lots and gifts named masked.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../app/admin/payments/actions", () => ({ grantCredits: vi.fn(), clearBlock: vi.fn() }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));

const { PaymentsView } = await import("./payments-view");
type PaymentsMonth = import("../../lib/payments/admin-read").PaymentsMonth;

const OCT = { year: 2026, month: 9 };
const payments = {
  revenue: [
    { currency: "usd", payments: 2, grossCents: 2_000, taxCents: 150, unattributed: 1, refundedCents: 0, refundedTaxCents: 0, netCents: 1_850 },
    { currency: "eur", payments: 1, grossCents: 500, taxCents: 0, unattributed: 0, refundedCents: 0, refundedTaxCents: 0, netCents: 500 },
  ],
  grants: [{ id: "g1", userId: "u_mara", source: "gift" as const, units: 3, revokedUnits: 1, createdAt: new Date("2026-10-18T12:00:00Z") }],
  grantsTotal: 1,
  gifts: [{ at: new Date("2026-10-18T12:00:00Z"), actorId: "u_hugh", userId: "u_mara", units: 3, note: "a failed run" }],
  disputes: [] as PaymentsMonth["disputes"],
  blocked: [] as PaymentsMonth["blocked"],
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

  it("draws USD in the main tiles even when another currency took in more", () => {
    const eurBigger = { ...payments, revenue: [
      { currency: "eur", payments: 1, grossCents: 50_000, taxCents: 0, unattributed: 0, refundedCents: 0, refundedTaxCents: 0, netCents: 50_000 },
      { currency: "usd", payments: 1, grossCents: 400, taxCents: 0, unattributed: 0, refundedCents: 0, refundedTaxCents: 0, netCents: 400 },
    ] };
    render(<PaymentsView month={OCT} current={OCT} payments={eurBigger} spendMicro={0} names={{}} accounts={[]} clerk="ok" />);
    expect(within(screen.getByTestId("payments-tiles")).getAllByText("$4.00")).toHaveLength(2);
    expect(screen.getByText("In EUR")).toBeInTheDocument();
    expect(screen.queryByText("In USD")).toBeNull();
  });

  it("says what was refunded on Paid, and lists disputes and paused accounts with the open count each leaves", () => {
    const withDisputes = {
      ...payments,
      revenue: [{ ...payments.revenue[0], refundedCents: 540, refundedTaxCents: 40 }],
      disputes: [
        { disputeId: "dp_1", status: "open" as const, unitsRevoked: 40, createdAt: new Date("2026-10-15T00:00:00Z"), closedAt: null, amountCents: 1_080, currency: "usd", userId: "u_mara" },
        { disputeId: "dp_2", status: "won" as const, unitsRevoked: 0, createdAt: new Date("2026-09-02T00:00:00Z"), closedAt: new Date("2026-10-03T00:00:00Z"), amountCents: 500, currency: "usd", userId: null },
      ],
      blocked: [{ userId: "u_mara", at: new Date("2026-10-15T00:00:00Z") }],
    };
    render(<PaymentsView month={OCT} current={OCT} payments={withDisputes} spendMicro={0} names={{ u_mara: "Mara K." }} accounts={[]} clerk="ok" />);
    expect(screen.getByText("2 payments · 1 unattributed · $5.40 refunded")).toBeInTheDocument();
    const disputes = within(screen.getByTestId("payments-disputes")).getAllByRole("listitem").map((li) => li.textContent);
    expect(disputes).toEqual([
      "Mara K. disputed $10.80Open · 40 credits taken back · opened Oct 15",
      "A deleted account disputed $5.00Won · 0 credits taken back · opened Sep 2 · closed Oct 3",
    ]);
    expect(within(screen.getByTestId("payments-blocked")).getByText("Mara K. · since Oct 15")).toBeInTheDocument();
  });

  it("names lots and gifts masked, with what was taken back and why", () => {
    view();
    expect(screen.getAllByText("3 · 1 taken back").length).toBeGreaterThan(0);
    expect(screen.getByText("Hugh H. gave Mara K. 3 credits")).toBeInTheDocument();
    expect(screen.getByText("“a failed run”")).toBeInTheDocument();
  });
});
