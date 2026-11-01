// M11 (Friends after a game) with Friends in the bar (menu and Home audit, erratum 5): the moment anchors on the
// Friends slot, in the rail and in the tab bar, and never on the account button.
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileHeader, NavRail, TabBar } from "./nav";
import { momentsCopy } from "../../lib/copy/moments";

vi.mock("./pending-push", () => ({ usePendingPush: () => ({ go: () => {} }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: () => {} }) }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Ana", fullName: "Ana Ruiz", primaryEmailAddress: { emailAddress: "a@example.com" } } }),
  useClerk: () => ({ redirectToUserProfile: vi.fn(), signOut: vi.fn() }),
}));

type Call = { id: string; eligible: boolean; line: string };
const calls = vi.hoisted(() => [] as Call[]);
vi.mock("../moments/moments-provider", () => ({
  useMomentAnchor: (id: string, o: { eligible: boolean; copy: { line: string } }) => {
    calls.push({ id, eligible: o.eligible, line: o.copy.line });
    return { ref: () => {} };
  },
}));

afterEach(() => {
  calls.length = 0;
  document.body.innerHTML = "";
});

const eligibleAfterGame = () => calls.filter((c) => c.id === "friends-after-game" && c.eligible);

describe("M11 with Friends in the bar", () => {
  it("anchors on the Friends slot in the rail and the tab bar, never the account button", () => {
    render(<NavRail locked={false} theme="amonkhet" friendsMoment />);
    render(<TabBar locked={false} friendsMoment />);
    render(<MobileHeader theme="amonkhet" />);
    const lines = new Set(eligibleAfterGame().map((c) => c.line));
    expect(lines).toEqual(new Set([momentsCopy.friendsAfterGameBar.line]));
    // One eligible anchor per slot: the rail's and the tab bar's (a render may run each hook more than once).
    expect(eligibleAfterGame().length).toBeGreaterThanOrEqual(2);
  });

  it("is eligible nowhere when the reader's condition does not hold", () => {
    render(<NavRail locked={false} theme="amonkhet" />);
    render(<TabBar locked={false} />);
    expect(eligibleAfterGame()).toEqual([]);
  });
});
