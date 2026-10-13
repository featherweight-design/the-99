// The Groups list (admin STATES G1, G5) and the head's group detail mode: the cards, the empty
// state, and a group's page titled with its name and description under `‹ Groups`.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let path = "/admin/groups";
vi.mock("next/navigation", () => ({ usePathname: () => path }));

const { GroupsList } = await import("./groups-list");
const { AdminHead } = await import("./admin-head");

const T = "11111111-1111-4111-8111-111111111111";
const CARD = {
  id: T,
  name: "testers",
  description: "Hugh plus one friend.",
  count: "2 members",
  members: "Hugh, Mara",
  overrides: [{ name: "OVERVIEW_V2_ENABLED" as const, label: "Overview v2", value: "on" as const }],
};

describe("GroupsList", () => {
  it("draws a card per group with its members, its overrides and Edit to its page", () => {
    render(<GroupsList cards={[CARD]} count="1 group" meta="7 accounts · 5 in no group" clerk="ok" />);
    expect(screen.getByText("7 accounts · 5 in no group")).toBeInTheDocument();
    const card = within(screen.getByTestId("group-cards")).getByRole("listitem");
    expect(card).toHaveTextContent("testers");
    expect(card).toHaveTextContent("2 members");
    expect(card).toHaveTextContent("Hugh, Mara");
    expect(card).toHaveTextContent("Overview v2: on");
    expect(within(card).getByRole("link", { name: "Edit testers" })).toHaveAttribute("href", `/admin/groups/${T}`);
    expect(screen.getByRole("link", { name: "New group" })).toHaveAttribute("href", "/admin/groups/new");
  });

  it("says No groups yet. beside New group, and that Clerk is down", () => {
    render(<GroupsList cards={[]} count="0 groups" meta="7 accounts · 7 in no group" clerk="down" />);
    expect(screen.getByText("No groups yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New group" })).toBeInTheDocument();
    expect(screen.getByText("Names didn’t load from Clerk.")).toBeInTheDocument();
  });
});

describe("AdminHead on a group's page", () => {
  const groups = [{ id: T, name: "testers", description: "Hugh plus one friend." }];
  const tabs = () => within(screen.getByRole("navigation", { name: "Admin pages" })).getAllByRole("link").map((t) => [t.textContent, t.getAttribute("aria-current")]);

  it("titles itself with the group's name and description, with Groups selected and a back link", () => {
    path = `/admin/groups/${T}`;
    render(<AdminHead env="staging" groups={groups} />);
    expect(screen.getByRole("heading", { level: 1, name: "testers" })).toBeInTheDocument();
    expect(screen.getByText("Hugh plus one friend.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "‹ Groups" })).toHaveAttribute("href", "/admin/groups");
    expect(tabs()).toEqual([["Costs", null], ["Switches", null], ["Groups", "page"], ["Accounts", null]]);
  });

  it("draws no sub for a group with no description, and New group on the new page", () => {
    path = `/admin/groups/${T}`;
    const { container, unmount } = render(<AdminHead env="staging" groups={[{ ...groups[0], description: null }]} />);
    expect(container.querySelector("header p")).toBeNull();
    unmount();
    path = "/admin/groups/new";
    render(<AdminHead env="staging" groups={groups} />);
    expect(screen.getByRole("heading", { level: 1, name: "New group" })).toBeInTheDocument();
  });

  it("draws the plain Groups head on the list", () => {
    path = "/admin/groups";
    render(<AdminHead env="staging" groups={groups} />);
    expect(screen.getByRole("heading", { level: 1, name: "Groups" })).toBeInTheDocument();
    expect(screen.getByText("Named sets of accounts to switch together. One group per account.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "‹ Groups" })).toBeNull();
  });
});
