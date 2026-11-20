import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { landingCopy } from "../../../lib/copy/landing";
import { DemoTabs } from "./demo-tabs";

const t = landingCopy.demo.tabs;

describe("DemoTabs cost chips", () => {
  it("labels each tab with its own cost, the free and the credit ones apart", () => {
    render(
      <DemoTabs tabs={[{ id: "cuts", label: t.cuts, cost: t.cost.cuts }, { id: "topOff", label: t.topOff, cost: t.cost.topOff }]} value="cuts" onChange={() => {}} label={t.aria}>
        <p>panel</p>
      </DemoTabs>,
    );
    expect(within(screen.getByTestId("demo-tab-cuts")).getByText("1 credit")).toBeInTheDocument();
    expect(within(screen.getByTestId("demo-tab-topOff")).getByText("Free")).toBeInTheDocument();
  });

  it("keeps steps 7 and 8 free of chips above the heading, and step 5 says only the Overview's credit", () => {
    const steps = landingCopy.demo.steps;
    expect(steps.find((s) => s.id === "get-to-99")!.tags).toEqual([]);
    expect(steps.find((s) => s.id === "buy")!.tags).toEqual([]);
    expect(steps.find((s) => s.id === "analysis")!.tags).toEqual([{ kind: "credit", label: "1 credit" }]);
  });
});
