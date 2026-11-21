import { describe, expect, it } from "vitest";
import { bareSwaps } from "./steady-labels.mjs";

const button = (child: string) => `<button type="submit">\n  ${child}\n</button>`;

describe("bareSwaps", () => {
  it("flags a pending ternary of two copy strings left bare as a button's child", () => {
    expect(bareSwaps(button("{busy ? copy.saving : copy.save}"))).toEqual([2]);
  });

  it("flags the one-line form and a *Button component", () => {
    expect(bareSwaps("<button>{pending ? c.sending : c.send}</button>")).toEqual([1]);
    expect(bareSwaps("<PrimaryButton>\n{saving ? c.saving : phase === \"failed\" ? c.retry : c.save}\n</PrimaryButton>")).toEqual([2]);
  });

  it("flags a label held in a const and drawn bare, and an inline button closed before the line ends", () => {
    expect(bareSwaps("const label = pending ? a.saving : a.save;\n<button>\n  {label}\n</button>")).toEqual([3]);
    expect(bareSwaps("<div a={<button>{busy ? a.going : a.go}</button>}")).toEqual([1]);
    expect(bareSwaps("const label = tab === 1 ? a : b;\n<button>\n  {label}\n</button>")).toEqual([]);
  });

  it("flags a camelCase flag and a pending word in a later branch", () => {
    expect(bareSwaps(button("{isPending ? a.saving : a.save}"))).toEqual([2]);
    expect(bareSwaps(button("{resumeAt !== null ? c.carryOn(1) : load === \"loading\" ? c.loading : c.start}"))).toEqual([2]);
  });

  it("passes the same swap drawn through SteadyLabel", () => {
    expect(bareSwaps(button("<SteadyLabel hold={[copy.saving, copy.save]}>{busy ? copy.saving : copy.save}</SteadyLabel>"))).toEqual([]);
  });

  it("does not flag a branch that draws an element, a ternary on something that is not pending, or a ternary outside a button", () => {
    expect(bareSwaps(button("{pending ? <PendingMark /> : <Chevron />}"))).toEqual([]);
    expect(bareSwaps(button("{open ? copy.hide : copy.show}"))).toEqual([]);
    expect(bareSwaps("<p>\n{busy ? copy.saving : copy.save}\n</p>")).toEqual([]);
  });
});
