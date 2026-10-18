import { describe, expect, it } from "vitest";
import { customerIsViewers, decidePlanChange, portalConfigId } from "./plan-manage-rule";

const mine = { app: "the-99", user_id: "user_a" };
const sub = (o: Partial<{ status: string; metadata: Record<string, string>; cancel_at_period_end: boolean }> = {}) =>
  ({ status: "active", metadata: mine, cancel_at_period_end: false, ...o });

describe("decidePlanChange", () => {
  it("applies a real change and calls a repeat unchanged", () => {
    expect(decidePlanChange(sub(), "user_a", true)).toBe("apply");
    expect(decidePlanChange(sub({ cancel_at_period_end: true }), "user_a", false)).toBe("apply");
    expect(decidePlanChange(sub({ cancel_at_period_end: true }), "user_a", true)).toBe("unchanged");
    expect(decidePlanChange(sub(), "user_a", false)).toBe("unchanged");
  });
  it("refuses another account's or another app's subscription, whatever else is true", () => {
    expect(decidePlanChange(sub({ metadata: { app: "the-99", user_id: "user_b" } }), "user_a", true)).toBe("foreign");
    expect(decidePlanChange(sub({ metadata: { app: "concert-crawl", user_id: "user_a" } }), "user_a", true)).toBe("foreign");
    expect(decidePlanChange(sub({ metadata: { app: "the-99" } }), "user_a", true)).toBe("foreign");
    expect(decidePlanChange(sub({ metadata: {} }), "user_a", true)).toBe("foreign");
  });
  it("refuses an ended subscription", () => {
    expect(decidePlanChange(sub({ status: "canceled" }), "user_a", true)).toBe("ended");
    expect(decidePlanChange(sub({ status: "incomplete_expired" }), "user_a", false)).toBe("ended");
  });
});

describe("customerIsViewers / portalConfigId", () => {
  it("checks the Customer's tags", () => {
    expect(customerIsViewers({ metadata: mine }, "user_a")).toBe(true);
    expect(customerIsViewers({ metadata: { app: "the-99", user_id: "user_b" } }, "user_a")).toBe(false);
    expect(customerIsViewers({ metadata: { user_id: "user_a" } }, "user_a")).toBe(false);
    expect(customerIsViewers({}, "user_a")).toBe(false);
  });
  it("accepts only a bpc_ id", () => {
    expect(portalConfigId(" bpc_1AbC ")).toBe("bpc_1AbC");
    for (const v of [undefined, "", "  ", "bpc_", "cfg_1", "bpc_1 x"]) expect(portalConfigId(v)).toBeNull();
  });
});
