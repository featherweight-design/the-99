// The model confirm (admin STATES F3) draws the server's preview as given and computes nothing.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModelConfirm } from "./model-confirm";

describe("ModelConfirm", () => {
  it("renders the server's preview verbatim: who, cost, mean, credits, What's new and when", () => {
    render(
      <ModelConfirm
        preview={{ names: ["Mara", "Theo"], count: 2, costs: [{ key: "synopsis", reserveMicroUsd: 240_000, meanMicroUsd: 12_000 }, { key: "tuning", reserveMicroUsd: 500_000, meanMicroUsd: null }], credits: [5, 10], whatsNew: 0 }}
        context={{ switchLabel: "Analysis tab", op: "set", scope: "group", groupName: "friends" }}
        pending={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole("heading").textContent).toBe("Turn Analysis tab on for 2 more accounts?");
    expect(screen.getByText("Turning friends on reaches its members without an account override. It turns on Overview and Suggested changes, which spends money.")).toBeInTheDocument();
    const facts = [...document.querySelectorAll("dd")].map((d) => d.textContent);
    expect(facts).toEqual([
      "Mara, Theo",
      "Overview: each run reserves up to $0.240. Priced runs so far average $0.012. Suggested changes: each run reserves up to $0.500. No run has been priced yet, so there is no mean to go on. Each run uses one of the account’s 5 or 10 credits in a rolling 24 hours.",
      "No What’s new entry changes.",
      "Within 30 seconds, on every server.",
    ]);
    expect(screen.getByRole("button", { name: "Turn on for 2" })).toBeInTheDocument();
  });
});
