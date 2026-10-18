// The plan card, every state (K1 to K6): the words, the presses each state draws, which action each press calls and
// with what, the closed outcomes saying something, the wait after a cancel or a keep, and `reduced`.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { planOffer } from "../../lib/copy/credits-page";
import type { PlanCardModel } from "../../lib/payments/page-model";
import type { PlanCardState } from "../../lib/payments/plan-card-rule";

const m = vi.hoisted(() => ({ buyPlan: vi.fn(), cancel: vi.fn(), keep: vi.fn(), card: vi.fn(), refresh: vi.fn() }));
vi.mock("../../app/credits/actions", () => ({ buyPlanAction: m.buyPlan, cancelPlanAction: m.cancel, keepPlanAction: m.keep, manageCardAction: m.card }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: vi.fn() }) }));

import { PlanCard } from "./plan-card";

const plan = (state: PlanCardState, over: Partial<PlanCardModel> = {}): PlanCardModel => ({ state, offer: planOffer(), on: "November 16", credits: 74, days: null, ...over });
const FAST = { intervalMs: 10, maxTries: 3 };
const SLOW = { intervalMs: 10, maxTries: 1000 };

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

const buttons = () => screen.queryAllByRole("button").map((b) => b.textContent);

describe("the states", () => {
  it("K1: the four fine-print lines come BEFORE the Subscribe press, and the price and the Stripe line are drawn", () => {
    const { container } = render(<PlanCard plan={plan("offer", { on: null, credits: 0 })} onToast={vi.fn()} />);
    expect(screen.getByText("60 credits a month")).toBeTruthy();
    expect(screen.getByText("$5 a month")).toBeTruthy();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    const subscribe = screen.getByRole("button", { name: "Subscribe · $5 a month" });
    for (const li of items) expect(li.compareDocumentPosition(subscribe) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Checkout on Stripe · US cards")).toBeTruthy();
    expect(buttons()).toEqual(["Subscribe · $5 a month"]);
    expect(container.querySelector("h2")).toBeNull();
  });

  it("K2: renews date, plan credits, Cancel plan leading, what it does, then Update card", () => {
    render(<PlanCard plan={plan("active")} onToast={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Your plan" })).toBeTruthy();
    expect(screen.getByText("Renews November 16 · $5")).toBeTruthy();
    expect(screen.getByText("74 plan credits, rolling over")).toBeTruthy();
    expect(screen.getByText("Canceling keeps your 74 plan credits until November 16, then they expire. Pack credits aren’t affected.")).toBeTruthy();
    expect(buttons()).toEqual(["Cancel plan", "Update card↗"]);
  });

  it("K3: Ends, the expiry restated, Keep my plan and what it does; no Cancel and no Update card", () => {
    render(<PlanCard plan={plan("cancelled", { days: 20 })} onToast={vi.fn()} />);
    expect(screen.getByText("Ends November 16")).toBeTruthy();
    expect(screen.getByText("Your 74 plan credits expire on November 16. You won’t be charged again.")).toBeTruthy();
    expect(screen.getByText("Keeps your credits and renews on November 16, as before.")).toBeTruthy();
    expect(buttons()).toEqual(["Keep my plan"]);
  });

  it("K4: the words carry the warning (days left), and the border and the words use --warning", () => {
    const { container } = render(<PlanCard plan={plan("ending", { days: 2 })} onToast={vi.fn()} />);
    const says = screen.getByText("Your 74 plan credits expire in 2 days, on November 16.");
    expect(says.className).toContain("var(--warning)");
    expect(screen.getByText("Ends November 16").className).toContain("var(--warning)");
    expect(container.querySelector("[data-plan-state=ending]")?.className).toContain("var(--warning)");
    expect(buttons()).toEqual(["Keep my plan"]);
  });

  it.each([[1, "in 1 day"], [0, "today"]])("K4: %s days left reads %s", (days, words) => {
    render(<PlanCard plan={plan("ending", { days })} onToast={vi.fn()} />);
    expect(screen.getByText(new RegExp(`expire ${words}`))).toBeTruthy();
  });

  it("K5: payment failed, credits still work, Update card leads and Cancel plan is the text button after it", () => {
    const { container } = render(<PlanCard plan={plan("pastDue")} onToast={vi.fn()} />);
    expect(screen.getByText("Your November 16 payment didn’t go through")).toBeTruthy();
    expect(screen.getByText(/your 74 plan credits still work meanwhile/)).toBeTruthy();
    expect(buttons()).toEqual(["Update card↗", "Cancel plan"]);
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
    expect(buttons()).toEqual(["Cancel plan", "Update card↗"]);
    rerender(<PlanCard plan={plan("pastDue")} reduced onToast={vi.fn()} />);
    expect(buttons()).toEqual(["Update card↗", "Cancel plan"]);
  });

  it("is off by default", () => {
    render(<PlanCard plan={plan("cancelled")} onToast={vi.fn()} />);
    expect(buttons()).toEqual(["Keep my plan"]);
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
    expect(m.buyPlan).toHaveBeenCalledWith("plan60", expect.stringMatching(/^[0-9a-f-]{36}$/));
    vi.unstubAllGlobals();
  });

  it.each([
    ["off", "Buying credits isn’t available right now."],
    ["already", "You already have a plan."],
    ["unverified", "Verify your email address to buy credits."],
    ["throttled", "Too many tries. Wait a little, then try again."],
    ["unconfigured", "Buying credits isn’t set up here yet."],
    ["failed", "Couldn’t start checkout. Try again."],
    ["blocked", "Buying is paused on this account. Email support@the-99.dev and we’ll sort it out. Your free credits and everything else work as usual."],
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
    fireEvent.click(screen.getByRole("button", { name: "Cancel plan" }));
    await waitFor(() => expect(m.cancel).toHaveBeenCalledWith());
    expect((await screen.findByText("Updating your plan"))).toBeTruthy();
    // Held while it waits: no second press can go out.
    expect((screen.getByRole("button", { name: "Cancel plan" }) as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect(m.refresh.mock.calls.length).toBeGreaterThan(1));
    view.rerender(<PlanCard plan={plan("cancelled", { days: 20 })} timing={SLOW} onToast={vi.fn()} />);
    expect(screen.queryByText("Updating your plan")).toBeNull();
    expect(screen.getByRole("button", { name: "Keep my plan" })).toBeTruthy();
    expect(document.querySelector("[role=status].sr-only")?.textContent).toBe("Plan canceled. Your 74 plan credits last until November 16.");
    const calls = m.refresh.mock.calls.length;
    await new Promise((r) => setTimeout(r, 60));
    expect(m.refresh.mock.calls.length).toBe(calls);
  });

  it("Keep calls keepPlanAction and waits for ACTIVE, not for any change", async () => {
    m.keep.mockResolvedValue({ ok: true, unchanged: false });
    const view = render(<PlanCard plan={plan("ending", { days: 2 })} timing={SLOW} onToast={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Keep my plan" }));
    await waitFor(() => expect(m.keep).toHaveBeenCalledWith());
    expect(m.cancel).not.toHaveBeenCalled();
    await screen.findByText("Updating your plan");
    view.rerender(<PlanCard plan={plan("cancelled", { days: 20 })} timing={SLOW} onToast={vi.fn()} />);
    expect(screen.getByText("Updating your plan")).toBeTruthy();
    view.rerender(<PlanCard plan={plan("active")} timing={SLOW} onToast={vi.fn()} />);
    expect(screen.queryByText("Updating your plan")).toBeNull();
    expect(document.querySelector("[role=status].sr-only")?.textContent).toBe("Plan kept. It renews on November 16.");
  });

  it("gives up after the bound, says so once, and stops re-reading", async () => {
    m.cancel.mockResolvedValue({ ok: true, unchanged: false });
    const onToast = vi.fn();
    render(<PlanCard plan={plan("active")} timing={FAST} onToast={onToast} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel plan" }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith("Still updating your plan. Reload in a moment to see it."));
    expect(screen.queryByText("Updating your plan")).toBeNull();
    const calls = m.refresh.mock.calls.length;
    await new Promise((r) => setTimeout(r, 60));
    expect(m.refresh.mock.calls.length).toBe(calls);
    expect(onToast).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: "Cancel plan" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("stops re-reading when the card unmounts", async () => {
    m.cancel.mockResolvedValue({ ok: true, unchanged: false });
    const view = render(<PlanCard plan={plan("active")} timing={{ intervalMs: 10, maxTries: 1000 }} onToast={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel plan" }));
    await screen.findByText("Updating your plan");
    view.unmount();
    const calls = m.refresh.mock.calls.length;
    await new Promise((r) => setTimeout(r, 60));
    expect(m.refresh.mock.calls.length).toBe(calls);
  });

  it("unchanged is said out loud, and the card still re-reads", async () => {
    m.cancel.mockResolvedValue({ ok: true, unchanged: true });
    const onToast = vi.fn();
    render(<PlanCard plan={plan("active")} timing={FAST} onToast={onToast} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel plan" }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith("Your plan was already canceled."));
    expect(m.refresh).toHaveBeenCalled();
  });

  it.each([
    ["off", "Plan changes aren’t available right now."],
    ["unconfigured", "Plan changes aren’t set up here yet."],
    ["not_found", "We couldn’t find a plan on your account."],
    ["failed", "Couldn’t update your plan. Try again."],
  ] as const)("a refused cancel (%s) says so, waits for nothing and gives the press back", async (reason, text) => {
    m.cancel.mockResolvedValue({ ok: false, reason });
    const onToast = vi.fn();
    render(<PlanCard plan={plan("active")} timing={FAST} onToast={onToast} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel plan" }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith(text));
    expect(screen.queryByText("Updating your plan")).toBeNull();
    expect(m.refresh).not.toHaveBeenCalled();
    await waitFor(() => expect((screen.getByRole("button", { name: "Cancel plan" }) as HTMLButtonElement).disabled).toBe(false));
  });

  it("a thrown action is the failed line", async () => {
    m.keep.mockRejectedValue(new Error("boom"));
    const onToast = vi.fn();
    render(<PlanCard plan={plan("cancelled")} onToast={onToast} />);
    fireEvent.click(screen.getByRole("button", { name: "Keep my plan" }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith("Couldn’t update your plan. Try again."));
  });
});

describe("Update card", () => {
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
    await waitFor(() => expect(onToast).toHaveBeenCalledWith("Plan changes aren’t set up here yet."));
    expect(screen.queryByRole("button", { name: /Update card/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel plan" })).toBeTruthy();
  });

  it.each([
    ["off", "Plan changes aren’t available right now."],
    ["not_found", "We couldn’t find a plan on your account."],
    ["failed", "Couldn’t open the card page. Try again."],
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
