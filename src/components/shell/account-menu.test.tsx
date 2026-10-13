import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountMenu } from "./account-menu";
import { Report } from "./pending-report";

const redirectToUserProfile = vi.fn();
// Clerk's signOut is thenable — the component releases `busy` on rejection.
const signOut = vi.fn(() => Promise.resolve());

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      firstName: "Ana",
      lastName: "Ruiz",
      fullName: "Ana Ruiz",
      primaryEmailAddress: { emailAddress: "ana.ruiz@example.com" },
    },
  }),
  useClerk: () => ({ redirectToUserProfile, signOut }),
}));

function trigger() {
  return screen.getByRole("button", { name: "Account: Ana Ruiz" });
}

/** A real pointer press focuses the button; fireEvent.click does not. */
function press(el: HTMLElement) {
  el.focus();
  fireEvent.click(el);
}

// useDialogA11y skips elements with no client rects so a display:none branch
// can't take focus. jsdom gives everything zero rects, which would disable the
// focus trap entirely. Installed once — this config has no restoreMocks, so a
// per-test spy would stack.
const rects = vi
  .spyOn(HTMLElement.prototype, "getClientRects")
  .mockReturnValue({ length: 1, item: () => null } as unknown as DOMRectList);

afterAll(() => rects.mockRestore());

beforeEach(() => {
  redirectToUserProfile.mockClear();
  signOut.mockClear();
});

describe("AccountMenu trigger", () => {
  it("names the person rather than the initials, and hides the glyphs", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    const button = trigger();
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    // "AR" must not reach the accessible name.
    expect(button.textContent).toBe("AR");
    expect(button.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("points aria-controls at the panel only while it is open", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    expect(trigger()).not.toHaveAttribute("aria-controls");
    fireEvent.click(trigger());
    const id = trigger().getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toHaveAttribute("role", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  // The 2026-09-07 chrome refresh redraws the rail's trigger and leaves the
  // mobile header's alone, so the two shapes have to be able to differ.
  it("wears a 30px --surface circle in the rail", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    const box = trigger().firstElementChild as HTMLElement;
    expect(box.className).toContain("h-[30px]");
    expect(box.className).toContain("rounded-full");
    expect(box.className).toContain("bg-[color:var(--surface)]");
    expect(box.className).toContain("border-[color:var(--border-strong)]");
  });

  it("keeps the 38px accent square in the mobile header", () => {
    render(<AccountMenu panel="sheet" theme="amonkhet" />);
    const box = trigger().firstElementChild as HTMLElement;
    expect(box.className).toContain("h-[38px]");
    expect(box.className).toContain("rounded-[12px]");
    expect(box.className).toContain("border-[color:var(--accent)]");
  });

  it("toggles closed on a second press", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.click(trigger());
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("AccountMenu popover", () => {
  it("renders the identity header and all three items", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    expect(screen.getByText("Ana Ruiz")).toBeTruthy();
    expect(screen.getByText("ana.ruiz@example.com")).toBeTruthy();
    const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual([
      "About The 99",
      "Manage account",
      "Sign out",
    ]);
  });

  // RD§1 — --fg-faint is 4.42:1 on --surface-raised and fails AA at 11px.
  it("uses --fg-muted for the popover email, not --fg-faint", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    const email = screen.getByText("ana.ruiz@example.com");
    expect(email.getAttribute("style")).toContain("--fg-muted");
    expect(email.getAttribute("style")).not.toContain("--fg-faint");
  });

  it("keeps the identity header out of the menu — it is not a menu item", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    const menu = screen.getByRole("menu");
    expect(within(menu).queryByText("ana.ruiz@example.com")).toBeNull();
    expect(screen.getByText("ana.ruiz@example.com")).toBeTruthy();
  });

  it("shows the open-state diamond only while open", () => {
    const { container } = render(<AccountMenu panel="popover" theme="amonkhet" />);
    const diamond = () => container.querySelector(".rotate-45.h-1");
    expect(diamond()).toBeNull();
    fireEvent.click(trigger());
    expect(diamond()).not.toBeNull();
  });

  it("renders no backdrop — a menu, not a modal", () => {
    const { container } = render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    expect(container.querySelector(".fixed.inset-0")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("closes on an outside press", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not close on a press inside the panel", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    fireEvent.pointerDown(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  // Named rather than left to DOM order: the picker's retirement notice puts a
  // ✕ above the chips, and the first-focusable fallback would open the menu one
  // Enter away from dismissing a notice the user had not read.
  it("opens with the checked theme focused", () => {
    render(<AccountMenu panel="popover" theme="kaldheim" />);
    fireEvent.click(trigger());
    expect(screen.getByRole("radio", { name: "First Frost, Kaldheim" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    press(trigger());
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });
});

describe("AccountMenu sheet", () => {
  it("is a modal dialog containing the menu", () => {
    render(<AccountMenu panel="sheet" theme="amonkhet" />);
    fireEvent.click(trigger());
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // aria-modal is invalid on role=menu, so the menu is nested inside.
    expect(within(dialog).getByRole("menu")).toBeTruthy();
    expect(screen.getByRole("menu")).not.toHaveAttribute("aria-modal");
  });

  it("labels the dialog with the account name", () => {
    render(<AccountMenu panel="sheet" theme="amonkhet" />);
    fireEvent.click(trigger());
    const dialog = screen.getByRole("dialog");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(document.getElementById(labelId!)?.textContent).toBe("Ana Ruiz");
  });

  // RD§5 gives the backdrop as a fixed near-black at 0.72. Every shipped overlay
  // now mixes the canvas at that alpha instead, so the dim tracks the theme.
  // Read off the attribute, not `style.background`: jsdom's CSS parser drops a
  // declaration whose value it cannot parse, and it cannot parse color-mix().
  it("dims with the canvas at the shipped alpha and locks scroll", () => {
    const { container } = render(<AccountMenu panel="sheet" theme="amonkhet" />);
    fireEvent.click(trigger());
    const backdrop = container.querySelector(".fixed.inset-0") as HTMLElement;
    expect(backdrop.getAttribute("style")).toContain(
      "color-mix(in oklab, var(--bg) 72%, transparent)",
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  // TabBar is z-40 and paints later in the DOM, so an equal layer would leave
  // the tab bar drawn on top of the backdrop.
  it("stacks the backdrop above the tab bar and below the sheet", () => {
    const { container } = render(<AccountMenu panel="sheet" theme="amonkhet" />);
    fireEvent.click(trigger());
    const backdrop = container.querySelector(".fixed.inset-0")!;
    expect(backdrop.className).toContain("z-[45]");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("dialog").className).toContain("z-50");
  });

  // RD§2 — the handoff gives a bare surface hex, which is --surface.
  it("draws the sheet on the --surface token, not a raw hex", () => {
    render(<AccountMenu panel="sheet" theme="amonkhet" />);
    fireEvent.click(trigger());
    const style = screen.getByRole("dialog").getAttribute("style") ?? "";
    expect(style).toContain("var(--surface)");
    expect(style).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });

  it("closes when the backdrop is tapped", () => {
    const { container } = render(<AccountMenu panel="sheet" theme="amonkhet" />);
    fireEvent.click(trigger());
    fireEvent.click(container.querySelector(".fixed.inset-0")!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("carries no open-state diamond — the sheet is not adjacent to the trigger", () => {
    const { container } = render(<AccountMenu panel="sheet" theme="amonkhet" />);
    fireEvent.click(trigger());
    expect(container.querySelector(".rotate-45.h-1")).toBeNull();
  });
});

describe("AccountMenu items", () => {
  // Focus lands on the first control in the panel, which since the picker moved
  // in is the chip for the theme in force — not the first menu item. Tabbing on
  // from there reaches Manage account, so nothing is stranded; starting instead
  // at Manage account would put the caret in the middle of the panel and leave
  // the picker reachable only by tabbing backwards.
  it("opens onto the current theme, with the menu items roving behind it", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    press(trigger());
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "Low Sun, Amonkhet" }),
    );
    const [about, manage, signOutItem] = screen.getAllByRole("menuitem");
    expect(about).toHaveAttribute("tabindex", "0");
    expect(manage).toHaveAttribute("tabindex", "-1");
    expect(signOutItem).toHaveAttribute("tabindex", "-1");
  });

  it("roves with the arrow keys and wraps in both directions", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    const [about, manage, signOutItem] = screen.getAllByRole("menuitem");

    fireEvent.keyDown(about, { key: "ArrowDown" });
    expect(document.activeElement).toBe(manage);

    fireEvent.keyDown(manage, { key: "ArrowDown" });
    expect(document.activeElement).toBe(signOutItem);

    // The wrap is the half a hard-coded modulo gets wrong when a row is added:
    // with `% 2` still in place this lands on Manage account.
    fireEvent.keyDown(signOutItem, { key: "ArrowDown" });
    expect(document.activeElement).toBe(about);

    fireEvent.keyDown(about, { key: "ArrowUp" });
    expect(document.activeElement).toBe(signOutItem);
  });

  it("dismisses the menu on the way to About", () => {
    // The row navigates client-side, so nothing unmounts the panel for us: a
    // popover left open lands on top of /about, and the sheet takes its
    // backdrop and focus trap with it.
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "About The 99" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("hands the About navigation to the provider, which outlives the menu and its row", () => {
    // The press unmounts the row and its link with it, so the navigation cannot be the row's to
    // report: it goes to the navigation-pending provider, which reports it and outlives both.
    push.mockClear();
    const providerPush = vi.fn();
    render(
      <Report.Provider value={{ report: () => {}, pathname: "/", push: providerPush, registerContentScope: () => {} }}>
        <AccountMenu panel="popover" theme="amonkhet" />
      </Report.Provider>,
    );
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "About The 99" }));
    expect(providerPush).toHaveBeenCalledWith("/about");
    expect(push).not.toHaveBeenCalled();
  });

  it("only closes the menu when About is pressed on /about", () => {
    push.mockClear();
    window.history.replaceState(null, "", "/about");
    try {
      render(<AccountMenu panel="popover" theme="amonkhet" />);
      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("menuitem", { name: "About The 99" }));
      expect(screen.queryByRole("menu")).toBeNull();
      expect(push).not.toHaveBeenCalled();
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });

  it("says the About row is unavailable while sign-out is in flight, and means it", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    const about = screen.getByRole("menuitem", { name: "About The 99" });
    expect(about).toHaveAttribute("aria-disabled", "true");

    // Announcing it is not enforcing it: an anchor has no `disabled`, so
    // without the preventDefault the row navigates anyway and races the
    // sign-out it claims to be waiting for. The menu staying open is how that
    // shows up here — the press is refused, so nothing closes.
    fireEvent.click(about);
    expect(screen.queryByRole("menu")).not.toBeNull();
  });

  it("dismisses the menu and sends the reader to Clerk's hosted account page", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Manage account" }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(redirectToUserProfile).toHaveBeenCalledOnce();
  });

  it("disables both buttons once sign-out is in flight", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
    // About is a link and carries no disabled state — leaving the menu for a
    // reference page cannot double-fire a sign-out, and a link that pretended
    // to be disabled would still navigate.
    expect(screen.getByRole("menuitem", { name: "Manage account" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeDisabled();
    // A second press cannot double-fire.
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  // A successful sign-out navigates away, so the disabled state is only ever
  // released on failure — without that release the menu stays dead until reload.
  it("re-enables the items when sign-out rejects", async () => {
    signOut.mockRejectedValueOnce(new Error("network"));
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeEnabled(),
    );
  });

  it("signals Sign out with words plus a danger marker, never colour alone", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    const item = screen.getByRole("menuitem", { name: "Sign out" });
    // The label keeps --fg; only the aria-hidden diamond carries --danger.
    expect(item.className).toContain("var(--fg)");
    const marker = item.querySelector("[aria-hidden]") as HTMLElement;
    expect(marker.style.background).toBe("var(--danger)");
  });
});

describe("AccountMenu admin door (admin STATES D1, D2)", () => {
  it("draws no Admin row without the door", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    expect(screen.queryByRole("menuitem", { name: "Admin" })).toBeNull();
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  });

  it.each(["popover", "sheet"] as const)("puts Admin after About and before Manage account in the %s", (panel) => {
    render(<AccountMenu panel={panel} theme="amonkhet" adminDoor adminEnv="production" />);
    fireEvent.click(trigger());
    const items = screen.getAllByRole("menuitem");
    expect(items.map((i) => i.getAttribute("href") ?? i.textContent)).toEqual(["/about", "/admin", "Manage account", "Sign out"]);
    // The environment rides at the row's end, hidden from its name: the page head says it.
    const admin = screen.getByRole("menuitem", { name: "Admin" });
    const env = within(admin).getByText("production");
    expect(env).toHaveAttribute("aria-hidden", "true");
  });

  it("roves through four rows and wraps", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" adminDoor adminEnv="staging" />);
    fireEvent.click(trigger());
    const [about, admin, manage, signOutItem] = screen.getAllByRole("menuitem");
    fireEvent.keyDown(about, { key: "ArrowDown" });
    expect(document.activeElement).toBe(admin);
    fireEvent.keyDown(admin, { key: "ArrowDown" });
    expect(document.activeElement).toBe(manage);
    fireEvent.keyDown(manage, { key: "ArrowDown" });
    expect(document.activeElement).toBe(signOutItem);
    fireEvent.keyDown(signOutItem, { key: "ArrowDown" });
    expect(document.activeElement).toBe(about);
    fireEvent.keyDown(about, { key: "ArrowUp" });
    expect(document.activeElement).toBe(signOutItem);
  });

  it("hands the Admin navigation to the provider and closes the menu", () => {
    push.mockClear();
    window.history.replaceState(null, "", "/");
    const providerPush = vi.fn();
    render(
      <Report.Provider value={{ report: () => {}, pathname: "/", push: providerPush, registerContentScope: () => {} }}>
        <AccountMenu panel="popover" theme="amonkhet" adminDoor adminEnv="staging" />
      </Report.Provider>,
    );
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Admin" }));
    expect(providerPush).toHaveBeenCalledWith("/admin");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
