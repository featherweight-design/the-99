// The friends list's rows (R2 P1, PP1; G9): with the wishlist on, a row is a link to the friend's page with a ›
// before its … menu, and drops its since date at phone width; off, it is Round 1's row, with no link.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FriendsList } from "./friends-list";
import { socialCopy } from "../../lib/copy/social";

vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const f = socialCopy.friends;
const COLIN = { publicId: "00000000-0000-4000-8000-000000000002", displayName: "Colin", since: new Date("2026-10-02T12:00:00Z"), commander: null };
const draw = (linkable?: boolean) => render(
  <FriendsList friends={[COLIN]} now={new Date("2026-10-15T12:00:00Z")} timeZone="UTC" fresh={null} removing={null} onRemove={vi.fn()} linkable={linkable} />,
);
afterEach(cleanup);

describe("FriendsList rows", () => {
  it("link to the friend's page with a › before the … menu while the wishlist is on", () => {
    draw(true);
    const row = screen.getByRole("listitem");
    const link = within(row).getByRole("link", { name: f.openAria("Colin") });
    expect(link.getAttribute("href")).toBe(`/friends/${COLIN.publicId}`);
    const menu = within(row).getByRole("button", { name: f.menuAria("Colin") });
    expect(link.contains(menu)).toBe(false);
    const chevron = within(row).getByText("›");
    expect(chevron.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(row).getByText(f.since("Oct 2")).className).toContain("hidden md:inline");
  });

  it("raises an open … menu above the rows after it", async () => {
    draw(true);
    const button = screen.getByRole("button", { name: f.menuAria("Colin") });
    const wrapper = button.parentElement as HTMLElement;
    expect(wrapper.style.zIndex).toBe("");
    fireEvent.click(button);
    expect(wrapper.style.zIndex).toBe("40");
  });

  it("are Round 1's rows, with no link and no ›, while the wishlist is off", () => {
    draw(false);
    const row = screen.getByRole("listitem");
    expect(within(row).queryByRole("link")).toBeNull();
    expect(within(row).queryByText("›")).toBeNull();
    expect(within(row).getByText(f.since("Oct 2")).className).not.toContain("hidden");
    expect(within(row).getByRole("button", { name: f.menuAria("Colin") })).toBeTruthy();
  });
});
