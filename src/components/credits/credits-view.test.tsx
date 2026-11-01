// The /credits page as drawn: balance cells, the pack offers (one column, a second pack included), every Buy outcome
// saying something visible, and the O4 page with no offers section.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { packOffers } from "../../lib/copy/credits-page";
import { buildCreditsModel, type AllowanceFacts } from "../../lib/payments/page-model";
import type { CreditHistoryRow } from "../../lib/payments/return";

const m = vi.hoisted(() => ({ buyPlan: vi.fn(), buy: vi.fn(), receipt: vi.fn(), readReturn: vi.fn(), refresh: vi.fn() }));
vi.mock("../../app/credits/actions", () => ({ buyPackAction: m.buy, buyPlanAction: m.buyPlan, cancelPlanAction: vi.fn(), keepPlanAction: vi.fn(), manageCardAction: vi.fn(), receiptAction: m.receipt, readReturnAction: m.readReturn }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: vi.fn() }) }));

import { CreditsView } from "./credits-view";

const allowance = (over: Partial<AllowanceFacts> = {}): AllowanceFacts => ({ used: 2, limit: 5, nextAt: null, ...over });
const row: CreditHistoryRow = { id: "g1", source: "pack", units: 40, revokedUnits: 0, createdAt: new Date("2026-10-02T12:00:00Z"), externalId: "cs_test_1", amountCents: 531, currency: "usd" };

function model(over: { switchOn?: boolean; allowance?: AllowanceFacts; history?: CreditHistoryRow[]; offers?: ReturnType<typeof packOffers>; blocked?: boolean; subscription?: { status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: Date | null } } = {}) {
  const r = buildCreditsModel({ switchOn: true, allowance: allowance(), history: [], offers: packOffers(), now: new Date("2026-11-14T12:00:00Z"), ...over });
  if (!r.sees) throw new Error("not seen");
  return r.model;
}

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("the page", () => {
  it("P2: a reader who never bought sees the Free cell alone, the offer, and an empty history", () => {
    render(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    expect(screen.getAllByRole("listitem").filter((li) => li.hasAttribute("data-cell")).map((li) => li.getAttribute("data-cell"))).toEqual(["free"]);
    expect(screen.queryByText(/Spent in this order/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Buy pack: 40 credits · $5" })).toBeTruthy();
    expect(screen.getByText("Nothing bought yet. Receipts show here once you do.")).toBeTruthy();
    expect(screen.getByTestId("credits-total").textContent).toBe("3");
  });

  it("P4: a pack holder sees Free then Packs in spend order, over the total, with a history row", () => {
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ pack: 40 }), history: [row] })} ret={null} />);
    expect(screen.getAllByRole("listitem").filter((li) => li.hasAttribute("data-cell")).map((li) => li.getAttribute("data-cell"))).toEqual(["free", "pack"]);
    expect(screen.getByText(/Spent in this order/i)).toBeTruthy();
    expect(screen.getByTestId("credits-total").textContent).toBe("43");
    expect(screen.getByText("Oct 2")).toBeTruthy();
    expect(screen.getByText("$5.31")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Receipt/ })).toBeTruthy();
  });

  it("the sub follows the reader's Suggested changes v2 switch (a v2 run over 10 changes uses 2 credits)", () => {
    render(<CreditsView suggestedV2 model={model()} ret={null} />);
    expect(screen.getByText(/^Most runs use 1 credit/)).toBeTruthy();
    expect(screen.queryByText(/any tool/)).toBeNull();
    cleanup();
    render(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    expect(screen.getByText(/^1 credit is 1 run of any tool/)).toBeTruthy();
    expect(screen.queryByText(/Most runs use 1 credit/)).toBeNull();
  });

  it("D1: a welcome lot sits second, and does not inherit the packs' \"never expire\" subtitle", () => {
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ welcome: 15, pack: 40 }) })} ret={null} />);
    const cells = screen.getAllByRole("listitem").filter((li) => li.hasAttribute("data-cell"));
    expect(cells.map((li) => li.getAttribute("data-cell"))).toEqual(["free", "welcome", "pack"]);
    const welcome = cells[1];
    expect(welcome.textContent).toContain("15");
    expect(welcome.textContent).not.toMatch(/never expire/i);
    expect(cells[2].textContent).toMatch(/never expire/i);
  });

  it("O4: with the switch off a holder keeps balances, history and the refund line, and gets no offers section", () => {
    render(<CreditsView suggestedV2={false} model={model({ switchOn: false, allowance: allowance({ pack: 12 }), history: [row] })} ret={null} />);
    expect(screen.queryByText("Get more credits")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Buy / })).toBeNull();
    expect(screen.getByText("Purchase history")).toBeTruthy();
    expect(screen.getByText(/^Refunds: email/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "support@the-99.dev" }).getAttribute("href")).toBe("mailto:support@the-99.dev");
  });

  it("B1: a paused reader keeps balances and history, and the band stands where the offers were, with the address", () => {
    const { container } = render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ pack: 12 }), history: [row], blocked: true })} ret={null} />);
    expect(screen.queryByText("Get more credits")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Buy / })).toBeNull();
    const band = container.querySelector("[data-pause-band]")!;
    expect(band.textContent).toBe("Buying is pausedEmail support@the-99.dev and we’ll sort it out. Your free credits and everything else work as usual.");
    expect(band.querySelector("a")?.getAttribute("href")).toBe("mailto:support@the-99.dev");
    // Between the balance and the history, as the offers sit.
    expect(band.previousElementSibling?.querySelector("[data-cell]")).not.toBeNull();
    expect(screen.getByText("Purchase history")).toBeTruthy();
    expect(screen.getByTestId("credits-total").textContent).toBe("15");
  });

  it("O2 to O4 with a pause: the switch off draws no band, there being nothing to buy", () => {
    const { container } = render(<CreditsView suggestedV2={false} model={model({ switchOn: false, allowance: allowance({ pack: 12 }), history: [row], blocked: true })} ret={null} />);
    expect(container.querySelector("[data-pause-band]")).toBeNull();
    expect(screen.queryByText("Get more credits")).toBeNull();
  });

  it("P8: a second pack is one more card in the same column under one heading", () => {
    const offers = [...packOffers(), { id: "pack40" as const, units: 100, price: "$10" }];
    const { container } = render(<CreditsView suggestedV2={false} model={model({ offers })} ret={null} />);
    expect(screen.getAllByText("Get more credits")).toHaveLength(1);
    const buys = screen.getAllByRole("button", { name: /^Buy / });
    expect(buys.map((b) => b.getAttribute("aria-label"))).toEqual(["Buy pack: 40 credits · $5", "Buy pack: 100 credits · $10"]);
    // The card says the count and the price; the button does not say them again.
    expect(buys.map((b) => b.textContent)).toEqual(["Buy pack", "Buy pack"]);
    expect(buys[0].closest("section")).toBe(buys[1].closest("section"));
    expect(container.querySelector("#credits-offers + div")?.className).toContain("flex-col");
  });

  it("a cancelled return draws one quiet line, and a plain visit draws no band", () => {
    const { rerender } = render(<CreditsView suggestedV2={false} model={model()} ret={{ kind: "cancelled" }} />);
    expect(screen.getByText("Checkout closed. Nothing was charged.")).toBeTruthy();
    rerender(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    expect(screen.queryByText(/Checkout closed/)).toBeNull();
  });

  it("R2: an added return marks the Packs cell +40 when the cell holds more than the purchase", () => {
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ pack: 80 }), history: [row] })} ret={{ kind: "done", sessionId: "cs_1", initial: { kind: "added", units: 40 } }} />);
    expect(screen.getByText("+40")).toBeTruthy();
    expect(screen.getByText("40 pack credits added")).toBeTruthy();
  });

  it("a first purchase draws no +40: the delta would be the whole balance and the band says it", () => {
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ pack: 40 }), history: [row] })} ret={{ kind: "done", sessionId: "cs_1", initial: { kind: "added", units: 40 } }} />);
    expect(screen.queryByText("+40")).toBeNull();
    expect(screen.getByText("40 pack credits added")).toBeTruthy();
  });
});

describe("the Buy press", () => {
  const press = () => fireEvent.click(screen.getByRole("button", { name: "Buy pack: 40 credits · $5" }));

  it("mints a uuid per press and sends the reader to Checkout's URL", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    m.buy.mockResolvedValue({ ok: true, url: "https://checkout.stripe.com/c/1" });
    render(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    press();
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/1"));
    expect(m.buy).toHaveBeenCalledWith("pack40", expect.stringMatching(/^[0-9a-f-]{36}$/));
    vi.unstubAllGlobals();
  });

  it("a second press after a failure carries a NEW id", async () => {
    m.buy.mockResolvedValue({ ok: false, reason: "failed" });
    render(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    press();
    await waitFor(() => expect(m.buy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((screen.getByRole("button", { name: "Buy pack: 40 credits · $5" }) as HTMLButtonElement).disabled).toBe(false));
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
    render(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    press();
    expect((await screen.findByRole("alert")).textContent).toBe(text);
    expect((screen.getByRole("button", { name: "Buy pack: 40 credits · $5" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("gives the press back when the page is restored from the back/forward cache after a successful Buy", async () => {
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });
    m.buy.mockResolvedValue({ ok: true, url: "https://checkout.stripe.com/c/1" });
    render(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    press();
    const buy = () => screen.getByRole("button", { name: "Buy pack: 40 credits · $5" }) as HTMLButtonElement;
    await waitFor(() => expect(buy().disabled).toBe(true));
    act(() => { window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: false })); });
    expect(buy().disabled).toBe(true);
    act(() => { window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true })); });
    expect(buy().disabled).toBe(false);
    vi.unstubAllGlobals();
  });

  it("says off, and takes the offer away rather than leaving a disabled press", async () => {
    m.buy.mockResolvedValue({ ok: false, reason: "off" });
    render(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    press();
    expect((await screen.findByRole("alert")).textContent).toBe("Buying credits isn’t available right now.");
    expect(screen.queryByRole("button", { name: /^Buy / })).toBeNull();
    expect(screen.queryByText("Get more credits")).toBeNull();
  });

  it("a pause set after the page was read: says so, and puts the pause band where the offer was", async () => {
    m.buy.mockResolvedValue({ ok: false, reason: "blocked" });
    const { container } = render(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    press();
    expect((await screen.findByRole("alert")).textContent).toMatch(/^Buying is paused on this account/);
    expect(screen.queryByRole("button", { name: /^Buy / })).toBeNull();
    expect(container.querySelector("[data-pause-band]")).not.toBeNull();
  });

  it("a press's answer stands only until the server's next read: a refresh with the pause cleared draws the offers again", async () => {
    m.buy.mockResolvedValue({ ok: false, reason: "blocked" });
    const { container, rerender } = render(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    press();
    await screen.findByRole("alert");
    expect(container.querySelector("[data-pause-band]")).not.toBeNull();
    rerender(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    expect(container.querySelector("[data-pause-band]")).toBeNull();
    expect(screen.queryAllByRole("button", { name: /^Buy / }).length).toBeGreaterThan(0);
    // ...and one with the switch gone off draws neither.
    rerender(<CreditsView suggestedV2={false} model={model({ switchOn: false, allowance: allowance({ pack: 12 }), history: [row] })} ret={null} />);
    expect(container.querySelector("[data-pause-band]")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Buy / })).toBeNull();
  });

  it("a thrown action reads as failed", async () => {
    m.buy.mockRejectedValue(new Error("network"));
    render(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    press();
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t start checkout. Try again.");
  });
});

describe("Receipt", () => {
  it("opens the receipt the server returns, and says so when it cannot", async () => {
    const win = { opener: {} as unknown, location: { href: "" }, close: vi.fn() };
    vi.stubGlobal("open", vi.fn(() => win));
    m.receipt.mockResolvedValueOnce({ ok: true, url: "https://pay.stripe.com/receipts/x" });
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ pack: 40 }), history: [row] })} ret={null} />);
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

  it("leaves this tab for the receipt when the first window is blocked, without a second open", async () => {
    const assign = vi.fn();
    const open = vi.fn(() => null);
    vi.stubGlobal("open", open);
    vi.stubGlobal("location", { ...window.location, assign });
    m.receipt.mockResolvedValueOnce({ ok: true, url: "https://pay.stripe.com/receipts/x" });
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ pack: 40 }), history: [row] })} ret={null} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Receipt/ })); });
    expect(assign).toHaveBeenCalledWith("https://pay.stripe.com/receipts/x");
    expect(open).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe("the daily paid line (P5, P5b)", () => {
  const held = { plan: 34, pack: 40 };
  it("is absent below 15 paid runs", () => {
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ ...held, paidUsedToday: 14, paidLimit: 20 }) })} ret={null} />);
    expect(screen.queryByTestId("paid-today")).toBeNull();
  });

  it("P5: from 15, a neutral meter and the near line", () => {
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ ...held, paidUsedToday: 17, paidLimit: 20, paidBackAt: new Date("2026-10-18T08:01:00Z") }) })} ret={null} />);
    const line = screen.getByTestId("paid-today");
    expect(line).toHaveAttribute("data-at-limit", "false");
    expect(line).toHaveTextContent(/17 of 20 banked credits used today/);
    expect(line).toHaveTextContent(/Free credits still run\./);
    expect(screen.getByTestId("paid-today-fill")).toHaveStyle({ width: "85%", background: "var(--fg-muted)" });
  });

  it("P5b: at the limit, the warning meter and nothing banked is lost, never --danger", () => {
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ ...held, paidUsedToday: 20, paidLimit: 20 }) })} ret={null} />);
    const line = screen.getByTestId("paid-today");
    expect(line).toHaveAttribute("data-at-limit", "true");
    expect(line).toHaveTextContent(/nothing banked is lost/);
    expect(screen.getByTestId("paid-today-fill")).toHaveStyle({ width: "100%", background: "var(--warning)" });
    expect(line.innerHTML).not.toContain("--danger");
  });
});

describe("the plan on the page", () => {
  const sub = (cancel: boolean, days: number, status = "active") => ({ status, cancelAtPeriodEnd: cancel, currentPeriodEnd: new Date(Date.parse("2026-11-14T12:00:00Z") + days * 86_400_000) });
  const planRow: CreditHistoryRow = { id: "p1", source: "plan", units: 50, revokedUnits: 0, createdAt: new Date("2026-10-16T12:00:00Z"), externalId: "in_1", billingReason: "subscription_create", amountCents: 500, currency: "usd" };

  it("K1: the plan offer sits under the one Get more credits heading, AFTER the pack (L6: the pack leads)", () => {
    render(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    expect(screen.getAllByText("Get more credits")).toHaveLength(1);
    const subscribe = screen.getByRole("button", { name: /^Subscribe/ });
    const buy = screen.getByRole("button", { name: /^Buy pack/ });
    expect(subscribe.closest("section")).toBe(buy.closest("section"));
    expect(buy.compareDocumentPosition(subscribe) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("K2: a subscribed reader gets Your plan above the pack offer, and no Subscribe", () => {
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ plan: 74 }), subscription: sub(false, 2), history: [planRow] })} ret={null} />);
    const plan = screen.getByRole("heading", { name: "Your plan" });
    const packs = screen.getByRole("heading", { name: "Get more credits" });
    expect(plan.compareDocumentPosition(packs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Subscribe/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel plan" })).toBeTruthy();
    expect(screen.getByText("Monthly plan, first month")).toBeTruthy();
  });

  it("O2: the switch off keeps a held plan with Cancel and Update card, and no offers", () => {
    render(<CreditsView suggestedV2={false} model={model({ switchOn: false, allowance: allowance({ plan: 74 }), subscription: sub(false, 20), history: [planRow] })} ret={null} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Cancel plan", "Update card", "Receipt"]);
    for (const name of ["Update card", "Receipt"]) expect(screen.getByRole("button", { name }).querySelector("svg[data-link-out]")).toBeTruthy();
    expect(screen.queryByText("Get more credits")).toBeNull();
  });

  it("O3: the switch off and a cancelled plan loses Keep my plan", () => {
    render(<CreditsView suggestedV2={false} model={model({ switchOn: false, allowance: allowance({ plan: 74 }), subscription: sub(true, 20), history: [planRow] })} ret={null} />);
    expect(screen.queryByRole("button", { name: "Keep my plan" })).toBeNull();
    expect(screen.getByText("Ends December 4")).toBeTruthy();
  });

  it("O1: the switch off, nothing held, nothing bought draws no plan offer", () => {
    render(<CreditsView suggestedV2={false} model={model({ switchOn: false, allowance: allowance({ pack: 3 }) })} ret={null} />);
    expect(screen.queryByRole("button", { name: /^Subscribe/ })).toBeNull();
  });

  it("a plan month's Receipt is fetched by its invoice id", async () => {
    m.receipt.mockResolvedValue({ ok: false, reason: "none" });
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ plan: 74 }), subscription: sub(false, 2), history: [planRow] })} ret={null} />);
    fireEvent.click(screen.getByRole("button", { name: /Receipt/ }));
    await waitFor(() => expect(m.receipt).toHaveBeenCalledWith("in_1"));
  });

  it("R3: a plan return says Plan started with the count the grant landed, and when it renews, with Cancel plan below", () => {
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ plan: 50 }), subscription: sub(false, 2), history: [planRow] })} ret={{ kind: "done", sessionId: "cs_1", initial: { kind: "added", units: 50, plan: true } }} />);
    expect(screen.getByText("Plan started: 50 credits added")).toBeTruthy();
    expect(screen.getByText("Renews November 16. Cancel any time below.")).toBeTruthy();
    expect(screen.queryByText(/pack credits added/)).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel plan" })).toBeTruthy();
  });

  it("R3 then a cancel on the page: the renew line goes, the band keeps its count", () => {
    render(<CreditsView suggestedV2={false} model={model({ allowance: allowance({ plan: 50 }), subscription: sub(true, 20), history: [planRow] })} ret={{ kind: "done", sessionId: "cs_1", initial: { kind: "added", units: 50, plan: true } }} />);
    expect(screen.getByText("Plan started: 50 credits added")).toBeTruthy();
    expect(screen.queryByText(/Renews .*Cancel any time below/)).toBeNull();
  });

  it.each([["off", "Buying credits isn’t available right now."], ["blocked", "Buying is paused on this account."]] as const)("a Subscribe answered %s takes the offers away like Buy pack", async (reason, text) => {
    m.buyPlan.mockResolvedValue({ ok: false, reason });
    render(<CreditsView suggestedV2={false} model={model()} ret={null} />);
    fireEvent.click(screen.getByRole("button", { name: /^Subscribe/ }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /^Subscribe/ })).toBeNull());
    expect(screen.queryByRole("button", { name: /^Buy pack/ })).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain(text);
  });
});
