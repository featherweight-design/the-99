import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// A pip draws only while its link is pending, so the nav's own tests never see one. Here every
// link reports pending, so each chrome's pip is on screen and its placement can be read.
vi.mock("./pending-report", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./pending-report")>()),
  usePendingReport: () => true,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/collection", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Ana", fullName: "Ana Ruiz", primaryEmailAddress: { emailAddress: "a@example.com" } } }),
  useClerk: () => ({ openUserProfile: vi.fn(), signOut: vi.fn() }),
}));

import { NavRail, TabBar } from "./nav";

describe("the pending pip's placement", () => {
  // The touch rail takes the tab slot's shape, so the rail's pip moves to 1px under
  // `(hover: none)`; the tab bar's never carries that variant (audit E4, E5).
  it("sits 2px up in the rail, 1px on touch", () => {
    const { container } = render(<NavRail locked={false} theme="amonkhet" />);
    const pips = [...container.querySelectorAll("[data-pending]")];
    expect(pips).toHaveLength(5);
    for (const pip of pips) expect(pip.className).toContain("bottom-[2px] touch:bottom-[1px]");
  });

  it("sits 1px up in the tab bar, with no touch variant", () => {
    const { container } = render(<TabBar locked={false} />);
    const pips = [...container.querySelectorAll("[data-pending]")];
    expect(pips).toHaveLength(5);
    for (const pip of pips) {
      expect(pip.className).toContain("bottom-[1px]");
      expect(pip.className).not.toMatch(/touch(-short)?:/);
    }
  });
});
