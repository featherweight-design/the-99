// The offer's mark: the plan's carries the crown (three small diamonds above the large one), a pack's does not.
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { planOffer } from "../../lib/copy/credits-page";
import type { PlanCardState } from "../../lib/payments/plan-card-rule";

vi.mock("../../app/credits/actions", () => ({ buyPlanAction: vi.fn(), cancelPlanAction: vi.fn(), keepPlanAction: vi.fn(), manageCardAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { OfferArt } from "./offer-art";
import { PlanCard } from "./plan-card";

afterEach(cleanup);

describe("OfferArt", () => {
  it("draws the crown above the diamond when asked, with three small diamonds", () => {
    const { container } = render(<OfferArt count={60} crown />);
    const crown = container.querySelector("svg[data-offer-crown]");
    expect(crown).toBeTruthy();
    expect(crown?.querySelectorAll("path")).toHaveLength(3);
    expect(crown?.nextElementSibling?.textContent).toBe("60");
  });

  it("draws no crown by default (a pack)", () => {
    const { container } = render(<OfferArt count={40} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("the plan card's mark", () => {
  for (const state of ["offer", "active", "cancelled"] as PlanCardState[]) {
    it(`carries the crown in the ${state} state`, () => {
      const { container } = render(
        <PlanCard plan={{ state, cancelling: state === "cancelled", offer: planOffer(), on: "November 16", credits: 74, days: null }} onToast={() => {}} />,
      );
      expect(container.querySelector("svg[data-offer-crown]")).toBeTruthy();
    });
  }
});
