import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountMenu } from "./account-menu";

const openUserProfile = vi.fn();
// Clerk's signOut is thenable — the component releases `busy` on rejection.
const signOut = vi.fn(() => Promise.resolve());

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      firstName: "Ana",
      lastName: "Ruiz",
      fullName: "Ana Ruiz",
      primaryEmailAddress: { emailAddress: "ana.ruiz@example.com" },
    },
  }),
  useClerk: () => ({ openUserProfile, signOut }),
}));

function trigger() {
  return screen.getByRole("button", { name: "Account — Ana Ruiz" });
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
  openUserProfile.mockClear();
  signOut.mockClear();
});

describe("AccountMenu trigger", () => {
  it("names the person rather than the initials, and hides the glyphs", () => {
    render(<AccountMenu panel="popover" />);
    const button = trigger();
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    // "AR" must not reach the accessible name.
    expect(button.textContent).toBe("AR");
    expect(button.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("points aria-controls at the panel only while it is open", () => {
    render(<AccountMenu panel="popover" />);
    expect(trigger()).not.toHaveAttribute("aria-controls");
    fireEvent.click(trigger());
    const id = trigger().getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toHaveAttribute("role", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles closed on a second press", () => {
    render(<AccountMenu panel="popover" />);
    fireEvent.click(trigger());
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.click(trigger());
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("AccountMenu popover", () => {
  it("renders the identity header and both items", () => {
    render(<AccountMenu panel="popover" />);
    fireEvent.click(trigger());
    expect(screen.getByText("Ana Ruiz")).toBeTruthy();
    expect(screen.getByText("ana.ruiz@example.com")).toBeTruthy();
    const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["Manage account", "Sign out"]);
  });

  // RD§1 — --fg-faint is 4.42:1 on --surface-raised and fails AA at 11px.
  it("uses --fg-muted for the popover email, not --fg-faint", () => {
    render(<AccountMenu panel="popover" />);
    fireEvent.click(trigger());
    const email = screen.getByText("ana.ruiz@example.com");
    expect(email.getAttribute("style")).toContain("--fg-muted");
    expect(email.getAttribute("style")).not.toContain("--fg-faint");
  });

  it("keeps the identity header out of the menu — it is not a menu item", () => {
    render(<AccountMenu panel="popover" />);
    fireEvent.click(trigger());
    const menu = screen.getByRole("menu");
    expect(within(menu).queryByText("ana.ruiz@example.com")).toBeNull();
    expect(screen.getByText("ana.ruiz@example.com")).toBeTruthy();
  });

  it("shows the open-state diamond only while open", () => {
    const { container } = render(<AccountMenu panel="popover" />);
    const diamond = () => container.querySelector(".rotate-45.h-1");
    expect(diamond()).toBeNull();
    fireEvent.click(trigger());
    expect(diamond()).not.toBeNull();
  });

  it("renders no backdrop — a menu, not a modal", () => {
    const { container } = render(<AccountMenu panel="popover" />);
    fireEvent.click(trigger());
    expect(container.querySelector(".fixed.inset-0")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("closes on an outside press", () => {
    render(<AccountMenu panel="popover" />);
    fireEvent.click(trigger());
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not close on a press inside the panel", () => {
    render(<AccountMenu panel="popover" />);
    fireEvent.click(trigger());
    fireEvent.pointerDown(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(<AccountMenu panel="popover" />);
    press(trigger());
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });
});

describe("AccountMenu sheet", () => {
  it("is a modal dialog containing the menu", () => {
    render(<AccountMenu panel="sheet" />);
    fireEvent.click(trigger());
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // aria-modal is invalid on role=menu, so the menu is nested inside.
    expect(within(dialog).getByRole("menu")).toBeTruthy();
    expect(screen.getByRole("menu")).not.toHaveAttribute("aria-modal");
  });

  it("labels the dialog with the account name", () => {
    render(<AccountMenu panel="sheet" />);
    fireEvent.click(trigger());
    const dialog = screen.getByRole("dialog");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(document.getElementById(labelId!)?.textContent).toBe("Ana Ruiz");
  });

  // RD§5 — every shipped overlay uses rgba(8,6,4,0.72); the handoff's
  // rgba(10,8,6,0.72) appears nowhere in src/.
  it("uses the shipped backdrop value and locks scroll", () => {
    const { container } = render(<AccountMenu panel="sheet" />);
    fireEvent.click(trigger());
    const backdrop = container.querySelector(".fixed.inset-0") as HTMLElement;
    expect(backdrop.style.background).toBe("rgba(8, 6, 4, 0.72)");
    expect(document.body.style.overflow).toBe("hidden");
  });

  // TabBar is z-40 and paints later in the DOM, so an equal layer would leave
  // the tab bar drawn on top of the backdrop.
  it("stacks the backdrop above the tab bar and below the sheet", () => {
    const { container } = render(<AccountMenu panel="sheet" />);
    fireEvent.click(trigger());
    const backdrop = container.querySelector(".fixed.inset-0")!;
    expect(backdrop.className).toContain("z-[45]");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("dialog").className).toContain("z-50");
  });

  // RD§2 — the handoff gives a bare #1E1A15, which is --surface.
  it("draws the sheet on the --surface token, not a raw hex", () => {
    render(<AccountMenu panel="sheet" />);
    fireEvent.click(trigger());
    const style = screen.getByRole("dialog").getAttribute("style") ?? "";
    expect(style).toContain("var(--surface)");
    expect(style).not.toContain("#1E1A15");
  });

  it("closes when the backdrop is tapped", () => {
    const { container } = render(<AccountMenu panel="sheet" />);
    fireEvent.click(trigger());
    fireEvent.click(container.querySelector(".fixed.inset-0")!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("carries no open-state diamond — the sheet is not adjacent to the trigger", () => {
    const { container } = render(<AccountMenu panel="sheet" />);
    fireEvent.click(trigger());
    expect(container.querySelector(".rotate-45.h-1")).toBeNull();
  });
});

describe("AccountMenu items", () => {
  it("focuses Manage account first, with Sign out untabbable", () => {
    render(<AccountMenu panel="popover" />);
    press(trigger());
    const [manage, signOutItem] = screen.getAllByRole("menuitem");
    expect(document.activeElement).toBe(manage);
    expect(manage).toHaveAttribute("tabindex", "0");
    expect(signOutItem).toHaveAttribute("tabindex", "-1");
  });

  it("roves with the arrow keys and wraps in both directions", () => {
    render(<AccountMenu panel="popover" />);
    fireEvent.click(trigger());
    const [manage, signOutItem] = screen.getAllByRole("menuitem");

    fireEvent.keyDown(manage, { key: "ArrowDown" });
    expect(document.activeElement).toBe(signOutItem);

    fireEvent.keyDown(signOutItem, { key: "ArrowDown" });
    expect(document.activeElement).toBe(manage);

    fireEvent.keyDown(manage, { key: "ArrowUp" });
    expect(document.activeElement).toBe(signOutItem);
  });

  it("dismisses the menu before handing the focus trap to Clerk's modal", () => {
    render(<AccountMenu panel="popover" />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Manage account" }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(openUserProfile).toHaveBeenCalledOnce();
  });

  it("disables both items once sign-out is in flight", () => {
    render(<AccountMenu panel="popover" />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
    for (const item of screen.getAllByRole("menuitem")) {
      expect(item).toBeDisabled();
    }
    // A second press cannot double-fire.
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  // A successful sign-out navigates away, so the disabled state is only ever
  // released on failure — without that release the menu stays dead until reload.
  it("re-enables the items when sign-out rejects", async () => {
    signOut.mockRejectedValueOnce(new Error("network"));
    render(<AccountMenu panel="popover" />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeEnabled(),
    );
  });

  it("signals Sign out with words plus a danger marker, never colour alone", () => {
    render(<AccountMenu panel="popover" />);
    fireEvent.click(trigger());
    const item = screen.getByRole("menuitem", { name: "Sign out" });
    // The label keeps --fg; only the aria-hidden diamond carries --danger.
    expect(item.className).toContain("var(--fg)");
    const marker = item.querySelector("[aria-hidden]") as HTMLElement;
    expect(marker.style.background).toBe("var(--danger)");
  });
});
