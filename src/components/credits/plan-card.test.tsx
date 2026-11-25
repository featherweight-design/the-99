// The plan card, every state (K1 to K6): the words, the presses each state draws, which action each press calls and
// with what, the closed outcomes saying something, the wait after a cancel or a keep, and `reduced`.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { planOffer, creditsPageCopy } from "../../lib/copy/credits-page";
import type { PlanCardModel } from "../../lib/payments/page-model";
import type { PlanCardState } from "../../lib/payments/plan-card-rule";

const m = vi.hoisted(() => ({ buyPlan: vi.fn(), cancel: vi.fn(), keep: vi.fn(), card: vi.fn(), refresh: vi.fn() }));
vi.mock("../../app/credits/actions", () => ({ buyPlanAction: m.buyPlan, cancelPlanAction: m.cancel, keepPlanAction: m.keep, manageCardAction: m.card }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: vi.fn() }) }));

import { PlanCard } from "./plan-card";

const plan = (state: PlanCardState, over: Partial<PlanCardModel> = {}): PlanCardModel => ({ state, cancelling: state === "cancelled" || state === "ending", offer: planOffer(), on: "November 16", credits: 74, days: null, ...over });
const FAST = { intervalMs: 10, maxTries: 3 };
const SLOW = { intervalMs: 10, maxTries: 1000 };

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

const buttons = () => screen.queryAllByRole("button").map((b) => b.textContent);
/** Update card opens Stripe in a new tab, so it ends in the link-out icon. */
const updateCardIcon = () => screen.getByRole("button", { name: creditsPageCopy.plan.updateCard }).querySelector("svg[data-link-out]");

describe("the states", () => {
  it("K1: the four fine-print lines come BEFORE the Subscribe press, and the price and the Stripe line are drawn", () => {
    const { container } = render(<PlanCard plan={plan("offer", { on: null, credits: 0 })} onToast={vi.fn()} />);
    expect(screen.getByText("50 credits a month")).toBeTruthy();
    expect(screen.getByText("$5 a month")).toBeTruthy();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    const subscribe = screen.getByRole("button", { name: "Subscribe · $5 a month" });
    for (const li of items) expect(li.compareDocumentPosition(subscribe) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(creditsPageCopy.plan.via)).toBeTruthy();
    expect(buttons()).toEqual(["Subscribe · $5 a month"]);
    expect(container.querySelector("h2")).toBeNull();
  });

  it("K2: renews date, plan credits, Cancel plan leading, what it does, then Update card", () => {
    render(<PlanCard plan={plan("active")} onToast={vi.fn()} />);
    expect(screen.getByRole("heading", { name: creditsPageCopy.plan.heading })).toBeTruthy();
    expect(screen.getByText("Renews November 16 · $5")).toBeTruthy();
    expect(screen.getByText("74 plan credits, rolling over")).toBeTruthy();
    expect(screen.getByText("Canceling keeps your 74 plan credits until November 16, then they expire. Pack credits aren’t affected.")).toBeTruthy();
    expect(buttons()).toEqual([creditsPageCopy.plan.cancel, creditsPageCopy.plan.updateCard]);
    expect(updateCardIcon()!.getAttribute("aria-hidden")).toBe("true");
  });

  it("K3: Ends, the expiry restated, Keep my plan and what it does; no Cancel and no Update card", () => {
    render(<PlanCard plan={plan("cancelled", { days: 20 })} onToast={vi.fn()} />);
    expect(screen.getByText("Ends November 16")).toBeTruthy();
    expect(screen.getByText("Your 74 plan credits expire on November 16. You won’t be charged again.")).toBeTruthy();
    expect(screen.getByText("Keeps your credits and renews on November 16, as before.")).toBeTruthy();
    expect(buttons()).toEqual([creditsPageCopy.plan.keep]);
  });

  it("K4: the words carry the warning (days left), and the border and the words use --warning", () => {
    const { container } = render(<PlanCard plan={plan("ending", { days: 2 })} onToast={vi.fn()} />);
    const says = screen.getByText("Your 74 plan credits expire in 2 days, on November 16.");
    expect(says.className).toContain("var(--warning)");
    expect(screen.getByText("Ends November 16").className).toContain("var(--warning)");
    expect(container.querySelector("[data-plan-state=ending]")?.className).toContain("var(--warning)");
    expect(buttons()).toEqual([creditsPageCopy.plan.keep]);
  });

  it.each([[1, "in 1 day"], [0, "today"]])("K4: %s days left reads %s", (days, words) => {
    render(<PlanCard plan={plan("ending", { days })} onToast={vi.fn()} />);
    expect(screen.getByText(new RegExp(`expire ${words}`))).toBeTruthy();
  });

  it("K5: payment failed, credits still work, Update card leads and Cancel plan is the text button after it", () => {
    const { container } = render(<PlanCard plan={plan("pastDue")} onToast={vi.fn()} />);
    expect(screen.getByText(creditsPageCopy.plan.dueTitle)).toBeTruthy();
    expect(screen.getByText(/Your 74 plan credits still work for now/)).toBeTruthy();
    // Stripe's `unpaid` also lands here: nothing may promise a retry.
    expect(screen.queryByText(/try again/)).toBeNull();
    expect(buttons()).toEqual([creditsPageCopy.plan.updateCard, creditsPageCopy.plan.cancel]);
    expect(container.querySelector("[data-plan-state=pastDue]")?.className).toContain("var(--warning)");
    expect(screen.getByRole("button", { name: /Update card/ }).className).toContain("bg-[color:var(--accent)]");
  });

  it("K6: an ended plan is the K1 offer again", () => {
    render(<PlanCard plan={plan("offer", { on: null, credits: 0 })} onToast={vi.fn()} />);
    expect(buttons()).toEqual(["Subscribe · $5 a month"]);
  });

  it("every press has a 44px hit on a coarse pointer", () => {
    render(<PlanCard plan={plan("active")} onToast={vi.fn()} />);
    for (const b of screen.getAllByRole("button")) expect(b.className).toMatch(/pointer-coarse:(h|min-h)-\[44px\]|\bh-\[44px\]|min-h-\[44px\]/);
  });
});

describe("reduced (payments off for the reader)", () => {
  it("hides Subscribe and Keep my plan, keeps Cancel plan and Update card", () => {
    const { rerender } = render(<PlanCard plan={plan("offer")} reduced onToast={vi.fn()} />);
    expect(buttons()).toEqual([]);
    rerender(<PlanCard plan={plan("cancelled")} reduced onToast={vi.fn()} />);
    expect(buttons()).toEqual([]);
    rerender(<PlanCard plan={plan("ending")} reduced onToast={vi.fn()} />);
    expect(buttons()).toEqual([]);
    rerender(<PlanCard plan={plan("active")} reduced onToast={vi.fn()} />);
    expect(buttons()).toEqual([creditsPageCopy.plan.cancel, creditsPageCopy.plan.updateCard]);
    rerender(<PlanCard plan={plan("pastDue")} reduced onToast={vi.fn()} />);
    expect(buttons()).toEqual([creditsPageCopy.plan.updateCard, creditsPageCopy.plan.cancel]);
  });

  it("is off by default", () => {
    render(<PlanCard plan={plan("cancelled")} onToast={vi.fn()} />);
    expect(buttons()).toEqual([creditsPageCopy.plan.keep]);
  });
});

describe("Subscribe", () => {
  it("mints a uuid per press, calls buyPlanAction with the plan id and sends the reader to Checkout", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    m.buyPlan.mockResolvedValue({ ok: true, url: "https://checkout.stripe.com/c/9" });
    render(<PlanCard plan={plan("offer")} onToast={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^Subscribe/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/9"));
    expect(m.buyPlan).toHaveBeenCalledWith("monthly", expect.stringMatching(/^[0-9a-f-]{36}$/));
    vi.unstubAllGlobals();
  });

  it.each([
    ["off", creditsPageCopy.buy.off],
    ["already", creditsPageCopy.buy.already],
    ["unverified", creditsPageCopy.buy.unverified],
    ["throttled", creditsPageCopy.buy.throttled],
    ["unconfigured", creditsPageCopy.buy.unconfigured],
    ["failed", creditsPageCopy.buy.failed],
    ["blocked", creditsPageCopy.buy.blocked],
  ] as const)("says %s and gives the press back", async (reason, text) => {
    m.buyPlan.mockResolvedValue({ ok: false, reason });
    const onToast = vi.fn();
    render(<PlanCard plan={plan("offer")} onToast={onToast} />);
    fireEvent.click(screen.getByRole("button", { name: /^Subscribe/ }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith(text));
    await waitFor(() => expect((screen.getByRole("button", { name: /^Subscribe/ }) as HTMLButtonElement).disabled).toBe(false));
  });
});

describe("Cancel plan and Keep my plan", () => {
  it("Cancel calls cancelPlanAction with no arguments, then waits and re-reads until the page shows it", async () => {
    m.cancel.mockResolvedValue({ ok: true, unchanged: false });
    const view = render(<PlanCard plan={plan("active")} timing={SLOW} onToast={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: creditsPageCopy.plan.cancel }));
    await waitFor(() => expect(m.cancel).toHaveBeenCalledWith());
    expect((await screen.findByText(creditsPageCopy.plan.working))).toBeTruthy();
    // Held while it waits: no second press can go out.
    expect((screen.getByRole("button", { name: creditsPageCopy.plan.cancel }) as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect(m.refresh.mock.calls.length).toBeGreaterThan(1));
    view.rerender(<PlanCard plan={plan("cancelled", { days: 20 })} timing={SLOW} onToast={vi.fn()} />);
    expect(screen.queryByText(creditsPageCopy.plan.working)).toBeNull();
    expect(screen.getByRole("button", { name: creditsPageCopy.plan.keep })).toBeTruthy();
    expect(document.querySelector("[role=status].sr-only")?.textContent).toBe("Plan canceled. Your 74 plan credits last until November 16.");
    const calls = m.refresh.mock.calls.length;
    await new Promise((r) => setTimeout(r, 60));
    expect(m.refresh.mock.calls.length).toBe(calls);
  });

  it("Keep calls keepPlanAction and waits for ACTIVE, not for any change", async () => {
    m.keep.mockResolvedValue({ ok: true, unchanged: false });
    const view = render(<PlanCard plan={plan("ending", { days: 2 })} timing={SLOW} onToast={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: creditsPageCopy.plan.keep }));
    await waitFor(() => expect(m.keep).toHaveBeenCalledWith());
    expect(m.cancel).not.toHaveBeenCalled();
    await screen.findByText(creditsPageCopy.plan.working);
    view.rerender(<PlanCard plan={plan("cancelled", { days: 20 })} timing={SLOW} onToast={vi.fn()} />);
    expect(screen.getByText(creditsPageCopy.plan.working)).toBeTruthy();
    view.rerender(<PlanCard plan={plan("active")} timing={SLOW} onToast={vi.fn()} />);
    expect(screen.queryByText(creditsPageCopy.plan.working)).toBeNull();
    expect(document.querySelector("[role=status].sr-only")?.textContent).toBe("Plan kept. It renews on November 16.");
  });

  it("gives up after the bound, says so once, and stops re-reading", async () => {
    m.cancel.mockResolvedValue({ ok: true, unchanged: false });
    const onToast = vi.fn();
    render(<PlanCard plan={plan("active")} timing={FAST} onToast={onToast} />);
    fireEvent.click(screen.getByRole("button", { name: creditsPageCopy.plan.cancel }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith(creditsPageCopy.plan.slow));
    expect(screen.queryByText(creditsPageCopy.plan.working)).toBeNull();
    const calls = m.refresh.mock.calls.length;
    await new Promise((r) => setTimeout(r, 60));
    expect(m.refresh.mock.calls.length).toBe(calls);
    expect(onToast).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: creditsPageCopy.plan.cancel }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("stops re-reading when the card unmounts", async () => {
    m.cancel.mockResolvedValue({ ok: true, unchanged: false });
    const view = render(<PlanCard plan={plan("active")} timing={{ intervalMs: 10, maxTries: 1000 }} onToast={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: creditsPageCopy.plan.cancel }));
    await screen.findByText(creditsPageCopy.plan.working);
    view.unmount();
    const calls = m.refresh.mock.calls.length;
    await new Promise((r) => setTimeout(r, 60));
    expect(m.refresh.mock.calls.length).toBe(calls);
  });

  it("unchanged is said out loud, and the card still re-reads", async () => {
    m.cancel.mockResolvedValue({ ok: true, unchanged: true });
    const onToast = vi.fn();
    render(<PlanCard plan={plan("active")} timing={FAST} onToast={onToast} />);
    fireEvent.click(screen.getByRole("button", { name: creditsPageCopy.plan.cancel }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith(creditsPageCopy.plan.outcome.alreadyCancelled));
    expect(m.refresh).toHaveBeenCalled();
  });

  it.each([
    ["unconfigured", creditsPageCopy.plan.outcome.unconfigured],
    ["not_found", creditsPageCopy.plan.outcome.not_found],
    ["failed", creditsPageCopy.plan.outcome.failed],
  ] as const)("a refused cancel (%s) says so, waits for nothing and gives the press back", async (reason, text) => {
    m.cancel.mockResolvedValue({ ok: false, reason });
    const onToast = vi.fn();
    render(<PlanCard plan={plan("active")} timing={FAST} onToast={onToast} />);
    fireEvent.click(screen.getByRole("button", { name: creditsPageCopy.plan.cancel }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith(text));
    expect(screen.queryByText(creditsPageCopy.plan.working)).toBeNull();
    expect(m.refresh).not.toHaveBeenCalled();
    await waitFor(() => expect((screen.getByRole("button", { name: creditsPageCopy.plan.cancel }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("a thrown action is the failed line", async () => {
    m.keep.mockRejectedValue(new Error("boom"));
    const onToast = vi.fn();
    render(<PlanCard plan={plan("cancelled")} onToast={onToast} />);
    fireEvent.click(screen.getByRole("button", { name: creditsPageCopy.plan.keep }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith(creditsPageCopy.plan.outcome.failed));
  });
});

describe("the card update action", () => {
  it("calls manageCardAction and navigates to the returned url", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    m.card.mockResolvedValue({ ok: true, url: "https://billing.stripe.com/p/s/1" });
    render(<PlanCard plan={plan("pastDue")} onToast={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Update card/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://billing.stripe.com/p/s/1"));
    expect(m.card).toHaveBeenCalledWith();
    vi.unstubAllGlobals();
  });

  it("unconfigured takes the press away (absent, not disabled), and says why", async () => {
    m.card.mockResolvedValue({ ok: false, reason: "unconfigured" });
    const onToast = vi.fn();
    render(<PlanCard plan={plan("active")} onToast={onToast} />);
    fireEvent.click(screen.getByRole("button", { name: /Update card/ }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith(creditsPageCopy.plan.outcome.unconfigured));
    expect(screen.queryByRole("button", { name: /Update card/ })).toBeNull();
    expect(screen.getByRole("button", { name: creditsPageCopy.plan.cancel })).toBeTruthy();
  });

  it.each([
    ["not_found", creditsPageCopy.plan.outcome.not_found],
    ["failed", creditsPageCopy.plan.outcome.cardFailed],
  ] as const)("%s says so and gives the press back", async (reason, text) => {
    m.card.mockResolvedValue({ ok: false, reason });
    const onToast = vi.fn();
    render(<PlanCard plan={plan("active")} onToast={onToast} />);
    fireEvent.click(screen.getByRole("button", { name: /Update card/ }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith(text));
    await waitFor(() => expect((screen.getByRole("button", { name: /Update card/ }) as HTMLButtonElement).disabled).toBe(false));
  });
});

describe("words", () => {
  it("never says unlock or membership, and carries no em dash", () => {
    const states: PlanCardState[] = ["offer", "active", "cancelled", "ending", "pastDue"];
    for (const s of states) {
      const { container, unmount } = render(<PlanCard plan={plan(s, { days: 2 })} onToast={vi.fn()} />);
      expect(container.textContent).not.toMatch(/unlock|membership|—/i);
      unmount();
    }
  });
  it("a one-credit plan reads in the singular", () => {
    render(<PlanCard plan={plan("active", { credits: 1 })} onToast={vi.fn()} />);
    expect(screen.getByText("1 plan credit, rolling over")).toBeTruthy();
  });
});

describe("Subscribe off and blocked go to the page's shared Buy handler", () => {
  it.each(["off", "blocked"] as const)("%s is forwarded, not toasted by the card", async (reason) => {
    m.buyPlan.mockResolvedValue({ ok: false, reason });
    const onToast = vi.fn();
    const onFailure = vi.fn();
    render(<PlanCard plan={plan("offer")} onToast={onToast} onFailure={onFailure} />);
    fireEvent.click(screen.getByRole("button", { name: /^Subscribe/ }));
    await waitFor(() => expect(onFailure).toHaveBeenCalledWith(reason));
    expect(onToast).not.toHaveBeenCalled();
  });
  it("another failure is still the card's own toast", async () => {
    m.buyPlan.mockResolvedValue({ ok: false, reason: "throttled" });
    const onToast = vi.fn();
    const onFailure = vi.fn();
    render(<PlanCard plan={plan("offer")} onToast={onToast} onFailure={onFailure} />);
    fireEvent.click(screen.getByRole("button", { name: /^Subscribe/ }));
    await waitFor(() => expect(onToast).toHaveBeenCalled());
    expect(onFailure).not.toHaveBeenCalled();
  });
});

describe("Keep refused for payments, forwarded", () => {
  it.each(["off", "blocked"] as const)("%s goes to the page's shared handler, with no toast of the card's own", async (reason) => {
    m.keep.mockResolvedValue({ ok: false, reason });
    const onToast = vi.fn();
    const onFailure = vi.fn();
    render(<PlanCard plan={plan("cancelled")} onToast={onToast} onFailure={onFailure} />);
    fireEvent.click(screen.getByRole("button", { name: creditsPageCopy.plan.keep }));
    await waitFor(() => expect(onFailure).toHaveBeenCalledWith(reason));
    expect(onToast).not.toHaveBeenCalled();
  });
  it("other Keep failures still toast, and a Cancel's never forward", async () => {
    m.keep.mockResolvedValue({ ok: false, reason: "failed" });
    const onToast = vi.fn();
    const onFailure = vi.fn();
    render(<PlanCard plan={plan("cancelled")} onToast={onToast} onFailure={onFailure} />);
    fireEvent.click(screen.getByRole("button", { name: creditsPageCopy.plan.keep }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith(creditsPageCopy.plan.outcome.failed));
    expect(onFailure).not.toHaveBeenCalled();
  });
});

describe("Keep refused for payments", () => {
  it.each([["off", creditsPageCopy.plan.outcome.off], ["blocked", creditsPageCopy.plan.outcome.blocked]] as const)("%s says so and waits for nothing", async (reason, text) => {
    m.keep.mockResolvedValue({ ok: false, reason });
    const onToast = vi.fn();
    render(<PlanCard plan={plan("cancelled")} onToast={onToast} />);
    fireEvent.click(screen.getByRole("button", { name: creditsPageCopy.plan.keep }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith(text));
    expect(screen.queryByText(creditsPageCopy.plan.working)).toBeNull();
  });
});

describe("K5 while cancelling", () => {
  const due = () => plan("pastDue", { cancelling: true, days: 20, on: "December 4" });
  it("draws the payment warning, the scheduled expiry, Update card first and Keep; no Cancel", () => {
    render(<PlanCard plan={due()} onToast={vi.fn()} />);
    // Stripe is still retrying, so nothing here promises there will be no further charge.
    expect(screen.queryByText(/charged again/)).toBeNull();
    expect(screen.getByText(creditsPageCopy.plan.dueTitle)).toBeTruthy();
    expect(screen.getByText("Your 74 plan credits expire on December 4. The plan will not renew.")).toBeTruthy();
    expect(buttons()).toEqual([creditsPageCopy.plan.updateCard, creditsPageCopy.plan.keep]);
    expect(updateCardIcon()).toBeTruthy();
  });
  it("reduced drops Keep and keeps Update card", () => {
    render(<PlanCard plan={due()} reduced onToast={vi.fn()} />);
    expect(buttons()).toEqual([creditsPageCopy.plan.updateCard]);
  });
  it("a cancel pressed on a past-due plan is reached once the row says cancelling, even though the state stays past due", async () => {
    m.cancel.mockResolvedValue({ ok: true, unchanged: false });
    const view = render(<PlanCard plan={plan("pastDue")} timing={{ intervalMs: 10, maxTries: 1000 }} onToast={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: creditsPageCopy.plan.cancel }));
    await screen.findByText(creditsPageCopy.plan.working);
    view.rerender(<PlanCard plan={due()} timing={{ intervalMs: 10, maxTries: 1000 }} onToast={vi.fn()} />);
    expect(screen.queryByText(creditsPageCopy.plan.working)).toBeNull();
    expect(buttons()).toEqual([creditsPageCopy.plan.updateCard, creditsPageCopy.plan.keep]);
  });
});
