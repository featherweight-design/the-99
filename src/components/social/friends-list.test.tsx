// The friends list's rows (R2 P1, PP1; G9): with the wishlist on, a row is a link to the friend's page with a ›
// before its … menu, and drops its since date at phone width; off, it is Round 1's row, with no link.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FriendsList } from "./friends-list";
import { socialCopy } from "../../lib/copy/social";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";

vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const f = socialCopy.friends;
const COLIN = { publicId: "00000000-0000-4000-8000-000000000002", displayName: named("Colin"), since: new Date("2026-10-02T12:00:00Z"), commander: null };
const draw = (linkable?: boolean, sparable?: Record<string, number>, wanted?: Record<string, number>) => render(
  <FriendsList friends={[COLIN]} now={new Date("2026-10-15T12:00:00Z")} timeZone="UTC" fresh={null} removing={null} onRemove={vi.fn()} linkable={linkable} sparable={sparable} wanted={wanted} />,
);
afterEach(cleanup);

describe("FriendsList rows", () => {
  it("link to the friend's page with a › before the … menu while the wishlist is on", () => {
    draw(true);
    const row = screen.getByRole("listitem");
    const link = within(row).getByRole("link", { name: plain(f.openAria(named("Colin"))) });
    expect(link.getAttribute("href")).toBe(`/friends/${COLIN.publicId}`);
    // The name is another reader's: the link, its name and the menu button all carry the PostHog opt-out.
    expect(link.className).toContain("ph-no-capture");
    expect(within(link).getByText("Colin").className).toBe("ph-no-capture");
    const menu = within(row).getByRole("button", { name: plain(f.menuAria(named("Colin"))) });
    expect(link.contains(menu)).toBe(false);
    expect(menu.className).toContain("ph-no-capture");
    const chevron = within(row).getByText("›");
    expect(chevron.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(row).getByText(f.since("Oct 2")).className).toContain("hidden md:inline");
  });

  it("draws a You-have-it chip with the count, linking to the friend's wishlist, only when there is a count", () => {
    draw(true, { [COLIN.publicId]: 3 });
    const chip = screen.getByRole("link", { name: plain(f.spareChipAria(named("Colin"), 3)) });
    expect(chip.getAttribute("href")).toBe(`/friends/${COLIN.publicId}/wishlist`);
    // The word is drawn from md; a phone keeps the figure and the panel's key names it.
    expect(chip.textContent).toBe(`3${f.spareChipWord}`);
    expect(within(chip).getByText(f.spareChipWord.trim(), { exact: false }).className).toContain("hidden md:inline");
    expect(chip.className).toContain("ph-no-capture");
    // The chip draws the shared spare glyph (the Wishlist key's), not a gift box of its own.
    expect(chip.querySelector("svg")).not.toBeNull();
    expect(chip.querySelector("svg path[d^='M3.5 19']")).not.toBeNull();
    expect(chip.querySelector("svg path[d^='M20 12v8']")).toBeNull();
    cleanup();
    draw(true, { [COLIN.publicId]: 0 });
    expect(document.querySelector("[data-spare-chip]")).toBeNull();
    cleanup();
    draw(true);
    expect(document.querySelector("[data-spare-chip]")).toBeNull();
  });

  it("draws a you-want chip linking to the friend's Spares filtered to You want, only when there is a count", () => {
    draw(true, undefined, { [COLIN.publicId]: 2 });
    const chip = screen.getByRole("link", { name: plain(f.wantChipAria(named("Colin"), 2)) });
    expect(chip.getAttribute("href")).toBe(`/friends/${COLIN.publicId}/spares?wanted=wishlist,deck`);
    expect(chip.textContent).toBe(`2${f.wantChipWord}`);
    expect(chip.className).toContain("ph-no-capture");
    expect(document.querySelector("[data-spare-chip]")).toBeNull();
    cleanup();
    draw(true, undefined, { [COLIN.publicId]: 0 });
    expect(document.querySelector("[data-want-chip]")).toBeNull();
  });

  it("names the drawn chips once in a phone-only key, only the kinds a row has", () => {
    draw(true, { [COLIN.publicId]: 1 });
    let key = screen.getByTestId("friends-chip-key");
    expect(key.className).toContain("md:hidden");
    expect(key.textContent).toBe(f.keySpare);
    cleanup();
    draw(true, undefined, { [COLIN.publicId]: 1 });
    expect(screen.getByTestId("friends-chip-key").textContent).toBe(f.keyWant);
    cleanup();
    draw(true, { [COLIN.publicId]: 1 }, { [COLIN.publicId]: 1 });
    key = screen.getByTestId("friends-chip-key");
    expect(key.textContent).toContain(f.keyWant);
    expect(key.textContent).toContain(f.keySpare);
    cleanup();
    draw(true);
    expect(screen.queryByTestId("friends-chip-key")).toBeNull();
    cleanup();
    draw(false, { [COLIN.publicId]: 1 }, { [COLIN.publicId]: 1 });
    expect(screen.queryByTestId("friends-chip-key")).toBeNull();
  });

  it("raises an open … menu above the rows after it", async () => {
    draw(true);
    const button = screen.getByRole("button", { name: plain(f.menuAria(named("Colin"))) });
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
    expect(within(row).getByRole("button", { name: plain(f.menuAria(named("Colin"))) })).toBeTruthy();
  });
});
