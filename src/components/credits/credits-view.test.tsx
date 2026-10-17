// The /credits page as drawn: balance cells, the pack offers (one column, a second pack included), every Buy outcome
// saying something visible, and the O4 page with no offers section.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { packOffers } from "../../lib/copy/credits-page";
import { buildCreditsModel, type AllowanceFacts } from "../../lib/payments/page-model";
import type { CreditHistoryRow } from "../../lib/payments/return";

const m = vi.hoisted(() => ({ buy: vi.fn(), receipt: vi.fn(), readReturn: vi.fn(), refresh: vi.fn() }));
vi.mock("../../app/credits/actions", () => ({ buyPackAction: m.buy, receiptAction: m.receipt, readReturnAction: m.readReturn }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: vi.fn() }) }));

import { CreditsView } from "./credits-view";

const allowance = (over: Partial<AllowanceFacts> = {}): AllowanceFacts => ({ used: 2, limit: 5, nextAt: null, ...over });
const row: CreditHistoryRow = { id: "g1", source: "pack", units: 40, revokedUnits: 0, createdAt: new Date("2026-10-02T12:00:00Z"), externalId: "cs_test_1", amountCents: 531, currency: "usd" };

function model(over: { switchOn?: boolean; allowance?: AllowanceFacts; history?: CreditHistoryRow[]; offers?: ReturnType<typeof packOffers> } = {}) {
  const r = buildCreditsModel({ switchOn: true, allowance: allowance(), history: [], offers: packOffers(), ...over });
  if (!r.sees) throw new Error("not seen");
  return r.model;
}

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("the page", () => {
  it("P2: a reader who never bought sees the Free cell alone, the offer, and an empty history", () => {
    render(<CreditsView model={model()} ret={null} />);
    expect(screen.getAllByRole("listitem").map((li) => li.getAttribute("data-cell"))).toEqual(["free"]);
    expect(screen.queryByText(/Spent in this order/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Buy 40 credits · $5" })).toBeTruthy();
    expect(screen.getByText("Nothing bought yet. Receipts show here once you do.")).toBeTruthy();
    expect(screen.getByTestId("credits-total").textContent).toBe("3");
  });

  it("P4: a pack holder sees Free then Packs in spend order, over the total, with a history row", () => {
    render(<CreditsView model={model({ allowance: allowance({ pack: 40 }), history: [row] })} ret={null} />);
    expect(screen.getAllByRole("listitem").filter((li) => li.hasAttribute("data-cell")).map((li) => li.getAttribute("data-cell"))).toEqual(["free", "pack"]);
    expect(screen.getByText(/Spent in this order/i)).toBeTruthy();
    expect(screen.getByTestId("credits-total").textContent).toBe("43");
    expect(screen.getByText("Oct 2")).toBeTruthy();
    expect(screen.getByText("$5.31")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Receipt/ })).toBeTruthy();
  });

  it("O4: with the switch off a holder keeps balances, history and the refund line, and gets no offers section", () => {
    render(<CreditsView model={model({ switchOn: false, allowance: allowance({ pack: 12 }), history: [row] })} ret={null} />);
    expect(screen.queryByText("Get more credits")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Buy / })).toBeNull();
    expect(screen.getByText("Purchase history")).toBeTruthy();
    expect(screen.getByText(/Refunds: email support@the-99.dev/)).toBeTruthy();
  });

  it("P8: a second pack is one more card in the same column under one heading", () => {
    const offers = [...packOffers(), { id: "pack40" as const, units: 100, price: "$10" }];
    const { container } = render(<CreditsView model={model({ offers })} ret={null} />);
    expect(screen.getAllByText("Get more credits")).toHaveLength(1);
    const buys = screen.getAllByRole("button", { name: /^Buy / });
    expect(buys.map((b) => b.textContent)).toEqual(["Buy 40 credits · $5", "Buy 100 credits · $10"]);
    expect(buys[0].closest("section")).toBe(buys[1].closest("section"));
    expect(container.querySelector("#credits-offers + div")?.className).toContain("flex-col");
  });

  it("a cancelled return draws one quiet line, and a plain visit draws no band", () => {
    const { rerender } = render(<CreditsView model={model()} ret={{ kind: "cancelled" }} />);
    expect(screen.getByText("Checkout closed. Nothing was charged.")).toBeTruthy();
    rerender(<CreditsView model={model()} ret={null} />);
    expect(screen.queryByText(/Checkout closed/)).toBeNull();
  });

  it("R2: an added return marks the Packs cell +40", () => {
    render(<CreditsView model={model({ allowance: allowance({ pack: 40 }), history: [row] })} ret={{ kind: "done", sessionId: "cs_1", initial: { kind: "added", units: 40 } }} />);
    expect(screen.getByText("+40")).toBeTruthy();
    expect(screen.getByText("40 pack credits added")).toBeTruthy();
  });
});

describe("the Buy press", () => {
  const press = () => fireEvent.click(screen.getByRole("button", { name: "Buy 40 credits · $5" }));

  it("mints a uuid per press and sends the reader to Checkout's URL", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    m.buy.mockResolvedValue({ ok: true, url: "https://checkout.stripe.com/c/1" });
    render(<CreditsView model={model()} ret={null} />);
    press();
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/1"));
    expect(m.buy).toHaveBeenCalledWith("pack40", expect.stringMatching(/^[0-9a-f-]{36}$/));
    vi.unstubAllGlobals();
  });

  it("a second press after a failure carries a NEW id", async () => {
    m.buy.mockResolvedValue({ ok: false, reason: "failed" });
    render(<CreditsView model={model()} ret={null} />);
    press();
    await waitFor(() => expect(m.buy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((screen.getByRole("button", { name: "Buy 40 credits · $5" }) as HTMLButtonElement).disabled).toBe(false));
    press();
    await waitFor(() => expect(m.buy).toHaveBeenCalledTimes(2));
    expect(m.buy.mock.calls[0][1]).not.toBe(m.buy.mock.calls[1][1]);
  });

  it.each([
    ["invalid", "That pack isn’t available."],
    ["unverified", "Verify your email address to buy credits."],
    ["throttled", "Too many tries. Wait a little, then try again."],
    ["unconfigured", "Buying credits isn’t set up here yet."],
    ["failed", "Couldn’t start checkout. Try again."],
  ] as const)("says %s out loud and gives the press back", async (reason, text) => {
    m.buy.mockResolvedValue({ ok: false, reason });
    render(<CreditsView model={model()} ret={null} />);
    press();
    expect((await screen.findByRole("alert")).textContent).toBe(text);
    expect((screen.getByRole("button", { name: "Buy 40 credits · $5" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("gives the press back when the page is restored from the back/forward cache after a successful Buy", async () => {
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });
    m.buy.mockResolvedValue({ ok: true, url: "https://checkout.stripe.com/c/1" });
    render(<CreditsView model={model()} ret={null} />);
    press();
    const buy = () => screen.getByRole("button", { name: "Buy 40 credits · $5" }) as HTMLButtonElement;
    await waitFor(() => expect(buy().disabled).toBe(true));
    act(() => { window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: false })); });
    expect(buy().disabled).toBe(true);
    act(() => { window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true })); });
    expect(buy().disabled).toBe(false);
    vi.unstubAllGlobals();
  });

  it("says off, and takes the offer away rather than leaving a disabled press", async () => {
    m.buy.mockResolvedValue({ ok: false, reason: "off" });
    render(<CreditsView model={model()} ret={null} />);
    press();
    expect((await screen.findByRole("alert")).textContent).toBe("Buying credits isn’t available right now.");
    expect(screen.queryByRole("button", { name: /^Buy / })).toBeNull();
    expect(screen.queryByText("Get more credits")).toBeNull();
  });

  it("a thrown action reads as failed", async () => {
    m.buy.mockRejectedValue(new Error("network"));
    render(<CreditsView model={model()} ret={null} />);
    press();
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t start checkout. Try again.");
  });
});

describe("Receipt", () => {
  it("opens the receipt the server returns, and says so when it cannot", async () => {
    const win = { opener: {} as unknown, location: { href: "" }, close: vi.fn() };
    vi.stubGlobal("open", vi.fn(() => win));
    m.receipt.mockResolvedValueOnce({ ok: true, url: "https://pay.stripe.com/receipts/x" });
    render(<CreditsView model={model({ allowance: allowance({ pack: 40 }), history: [row] })} ret={null} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Receipt/ })); });
    expect(m.receipt).toHaveBeenCalledWith("cs_test_1");
    expect(win.location.href).toBe("https://pay.stripe.com/receipts/x");
    expect(win.opener).toBeNull();

    m.receipt.mockResolvedValueOnce({ ok: false, reason: "none" });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Receipt/ })); });
    expect(win.close).toHaveBeenCalled();
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t open that receipt.");
    vi.unstubAllGlobals();
  });

  it("leaves this tab for the receipt when both windows are blocked", async () => {
    const assign = vi.fn();
    vi.stubGlobal("open", vi.fn(() => null));
    vi.stubGlobal("location", { ...window.location, assign });
    m.receipt.mockResolvedValueOnce({ ok: true, url: "https://pay.stripe.com/receipts/x" });
    render(<CreditsView model={model({ allowance: allowance({ pack: 40 }), history: [row] })} ret={null} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Receipt/ })); });
    expect(assign).toHaveBeenCalledWith("https://pay.stripe.com/receipts/x");
    vi.unstubAllGlobals();
  });
});
