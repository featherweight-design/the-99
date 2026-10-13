// Check an account (admin STATES F1): a pick shows the value and its source, and mirrors `?account=`.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Explanation } from "../../lib/admin/switch-page-rule";

const mirror = vi.hoisted(() => vi.fn());
vi.mock("../../lib/url/mirror", () => ({ mirrorUrl: mirror }));

const { CheckAccount } = await import("./check-account");

const EXPLAINED: Explanation[] = [
  { id: "u1", label: "Hugh", on: true, source: "account override", kill: false },
  { id: "u2", label: "Mara", on: false, source: "env var is off", kill: true },
];

describe("CheckAccount", () => {
  it("selects nothing until an account is picked", () => {
    render(<CheckAccount explanations={EXPLAINED} initial={null} />);
    expect(screen.getByRole("combobox", { name: "Check an account" })).toHaveValue("");
    expect(screen.queryByTestId("check-result")).toBeNull();
  });

  it("shows the account named by the URL", () => {
    render(<CheckAccount explanations={EXPLAINED} initial="u1" />);
    expect(screen.getByTestId("check-result").textContent).toBe("On · account override");
  });

  it("shows a pick's value and source, and mirrors it into the URL without navigating", () => {
    render(<CheckAccount explanations={EXPLAINED} initial={null} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "u2" } });
    expect(screen.getByTestId("check-result").textContent).toBe("Off · env var is off");
    expect(screen.getByRole("status")).toContainElement(screen.getByTestId("check-result"));
    expect(String(mirror.mock.calls.at(-1)?.[0])).toMatch(/\?account=u2$/);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
    expect(String(mirror.mock.calls.at(-1)?.[0])).not.toContain("account=");
  });
});
