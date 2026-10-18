import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountMenu } from "./account-menu";
import { Report } from "./pending-report";
import type { ChipState } from "../../lib/payments/chip-rule";

const redirectToUserProfile = vi.fn();
// Clerk's signOut is thenable — the component releases `busy` on rejection.
const signOut = vi.fn(() => Promise.resolve());

const chipAction = vi.hoisted(() => vi.fn());
vi.mock("../../app/credits/actions", () => ({ chipAction }));
const heldPaidAction = vi.hoisted(() => vi.fn());
vi.mock("../../app/account/delete-warning-actions", () => ({ heldPaidAction }));

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
  chipAction.mockReset();
  chipAction.mockResolvedValue(null);
  heldPaidAction.mockReset();
  heldPaidAction.mockResolvedValue({ plan: 0, pack: 0 });
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
    render(<AccountMenu panel="sheet" theme="amonkhet" />);
    fireEvent.click(trigger());
    const backdrop = document.body.querySelector(".fixed.inset-0") as HTMLElement;
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
    const backdrop = document.body.querySelector(".fixed.inset-0")!;
    // Portalled to the body: inside the phone header, a returned (fixed, translated) header would be the backdrop's
    // containing block and trap both under the tab bar (card search plan PR B, Copilot round 1).
    expect(container.contains(backdrop)).toBe(false);
    expect(container.contains(screen.getByRole("dialog"))).toBe(false);
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
    render(<AccountMenu panel="sheet" theme="amonkhet" />);
    fireEvent.click(trigger());
    fireEvent.click(document.body.querySelector(".fixed.inset-0")!);
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

  it("dismisses the menu and sends the reader to Clerk's hosted account page", async () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Manage account" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(redirectToUserProfile).toHaveBeenCalledOnce();
  });

  describe("the deletion warning (plan E6, D1/D2)", () => {
    const manage = async () => {
      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("menuitem", { name: "Manage account" }));
      await act(async () => {});
    };

    it("opens first while paid credits are held, splitting them by source, and Continue goes on to Clerk", async () => {
      heldPaidAction.mockResolvedValue({ plan: 74, pack: 40 });
      render(<AccountMenu panel="popover" theme="amonkhet" />);
      await manage();
      const dialog = await screen.findByRole("dialog", { name: "You have 114 paid credits" });
      expect(redirectToUserProfile).not.toHaveBeenCalled();
      expect([...dialog.querySelectorAll("[data-held]")].map((n) => n.getAttribute("data-held"))).toEqual(["plan", "pack"]);
      expect(dialog).toHaveTextContent("Deleting your account forfeits them: 74 plan credits and 40 pack credits.");
      expect(within(dialog).getByRole("link", { name: "support@the-99.dev" })).toHaveAttribute("href", "mailto:support@the-99.dev");
      fireEvent.click(within(dialog).getByRole("button", { name: "Continue to Manage account" }));
      expect(redirectToUserProfile).toHaveBeenCalledOnce();
      expect(screen.queryByRole("dialog", { name: "You have 114 paid credits" })).toBeNull();
    });

    it("draws only what is held (D2: packs only), and ✕ stays", async () => {
      heldPaidAction.mockResolvedValue({ plan: 0, pack: 40 });
      render(<AccountMenu panel="sheet" theme="amonkhet" />);
      await manage();
      const dialog = await screen.findByRole("dialog", { name: "You have 40 paid credits" });
      expect([...dialog.querySelectorAll("[data-held]")].map((n) => n.getAttribute("data-held"))).toEqual(["pack"]);
      expect(dialog).toHaveTextContent("Deleting your account forfeits them. Nothing else in Manage account touches them.");
      fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("dialog", { name: "You have 40 paid credits" })).toBeNull();
      expect(redirectToUserProfile).not.toHaveBeenCalled();
    });

    it("never opens without paid credits, nor when the read fails", async () => {
      for (const answer of [{ plan: 0, pack: 0 }, null]) {
        heldPaidAction.mockResolvedValue(answer);
        redirectToUserProfile.mockClear();
        const { unmount } = render(<AccountMenu panel="popover" theme="amonkhet" />);
        await manage();
        await waitFor(() => expect(redirectToUserProfile).toHaveBeenCalledOnce());
        expect(screen.queryByRole("dialog")).toBeNull();
        unmount();
      }
    });

    it("reads afresh on each open, never deciding on a previous open's answer", async () => {
      heldPaidAction.mockResolvedValueOnce({ plan: 0, pack: 3 });
      render(<AccountMenu panel="popover" theme="amonkhet" />);
      fireEvent.click(trigger());
      await act(async () => {});
      fireEvent.click(trigger()); // closed
      let answer: (v: unknown) => void = () => {};
      heldPaidAction.mockReturnValue(new Promise((r) => { answer = r; }));
      fireEvent.click(trigger()); // reopened: the last read (3 credits) must not decide this press
      fireEvent.click(screen.getByRole("menuitem", { name: "Manage account" }));
      expect(screen.queryByRole("dialog", { name: "You have 3 paid credits" })).toBeNull();
      await act(async () => answer({ plan: 0, pack: 0 }));
      await waitFor(() => expect(redirectToUserProfile).toHaveBeenCalledOnce());
      expect(screen.queryByRole("dialog", { name: /paid credit/ })).toBeNull();
    });

    it("does nothing when the menu was dismissed before the read landed", async () => {
      let answer: (v: unknown) => void = () => {};
      heldPaidAction.mockReturnValue(new Promise((r) => { answer = r; }));
      render(<AccountMenu panel="popover" theme="amonkhet" />);
      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("menuitem", { name: "Manage account" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "Manage account" })); // a second press while pending
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
      await act(async () => answer({ plan: 0, pack: 0 }));
      await act(async () => {});
      expect(redirectToUserProfile).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog", { name: /paid credit/ })).toBeNull();
    });

    it("drops a press from a dismissed opening even after the menu reopens, and the new opening presses for itself", async () => {
      let first: (v: unknown) => void = () => {};
      heldPaidAction.mockReturnValueOnce(new Promise((r) => { first = r; }));
      render(<AccountMenu panel="popover" theme="amonkhet" />);
      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("menuitem", { name: "Manage account" }));
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
      let second: (v: unknown) => void = () => {};
      heldPaidAction.mockReturnValueOnce(new Promise((r) => { second = r; }));
      fireEvent.click(trigger()); // reopened before the first read landed
      await act(async () => first({ plan: 3, pack: 0 }));
      await act(async () => {});
      expect(screen.queryByRole("dialog", { name: /paid credit/ })).toBeNull();
      expect(redirectToUserProfile).not.toHaveBeenCalled();
      expect(screen.queryByRole("menu")).not.toBeNull();
      fireEvent.click(screen.getByRole("menuitem", { name: "Manage account" }));
      await act(async () => second({ plan: 0, pack: 0 }));
      await waitFor(() => expect(redirectToUserProfile).toHaveBeenCalledOnce());
      expect(heldPaidAction).toHaveBeenCalledTimes(2); // one read per opening
    });

    it("waits for the opening's own read still in flight before deciding, asking only once", async () => {
      let answer: (v: unknown) => void = () => {};
      // Any second request would answer "none held" and go straight on to Clerk.
      heldPaidAction.mockReturnValueOnce(new Promise((r) => { answer = r; }));
      render(<AccountMenu panel="popover" theme="amonkhet" />);
      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("menuitem", { name: "Manage account" }));
      expect(redirectToUserProfile).not.toHaveBeenCalled();
      await act(async () => answer({ plan: 3, pack: 0 }));
      expect(await screen.findByRole("dialog", { name: "You have 3 paid credits" })).toBeInTheDocument();
      expect(redirectToUserProfile).not.toHaveBeenCalled();
      expect(heldPaidAction).toHaveBeenCalledOnce();
    });
  });

  it("from the phone sheet, leaves the sheet's history entry alone so the redirect is not cancelled", async () => {
    // Earlier tests' sheets release their own entries a task after unmounting; let them settle first.
    await act(async () => new Promise((r) => setTimeout(r, 20)));
    render(<AccountMenu panel="sheet" theme="amonkhet" />);
    fireEvent.click(trigger());
    const back = vi.spyOn(window.history, "back");
    try {
      fireEvent.click(screen.getByRole("menuitem", { name: "Manage account" }));
      // The sheet releases its entry one task after it unmounts.
      await act(async () => new Promise((r) => setTimeout(r, 20)));
      await waitFor(() => expect(redirectToUserProfile).toHaveBeenCalledOnce());
      expect(back).not.toHaveBeenCalled();
    } finally {
      back.mockRestore();
    }
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

describe("AccountMenu Friends row (Social R1 placement)", () => {
  it("draws no Friends row with the switch off", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" adminDoor adminEnv="staging" />);
    fireEvent.click(trigger());
    expect(screen.queryByRole("menuitem", { name: "Friends" })).toBeNull();
  });

  it.each(["popover", "sheet"] as const)("puts Friends second, under About and before Admin, in the %s", (panel) => {
    render(<AccountMenu panel={panel} theme="amonkhet" adminDoor adminEnv="production" friends />);
    fireEvent.click(trigger());
    const items = screen.getAllByRole("menuitem");
    expect(items.map((i) => i.getAttribute("href") ?? i.textContent)).toEqual(["/about", "/friends", "/admin", "Manage account", "Sign out"]);
  });

  it("roves through every row it draws, sized from the rows (E9)", () => {
    for (const admin of [false, true]) {
      const { unmount } = render(<AccountMenu panel="popover" theme="amonkhet" adminDoor={admin} adminEnv="staging" friends />);
      fireEvent.click(trigger());
      const items = screen.getAllByRole("menuitem");
      expect(items).toHaveLength(admin ? 5 : 4);
      for (let i = 0; i < items.length; i++) {
        fireEvent.keyDown(items[i], { key: "ArrowDown" });
        expect(document.activeElement).toBe(items[(i + 1) % items.length]);
      }
      fireEvent.keyDown(items[0], { key: "ArrowUp" });
      expect(document.activeElement).toBe(items[items.length - 1]);
      unmount();
    }
  });

  it("hands the Friends navigation to the provider and closes the menu", () => {
    window.history.replaceState(null, "", "/");
    const providerPush = vi.fn();
    render(
      <Report.Provider value={{ report: () => {}, pathname: "/", push: providerPush, registerContentScope: () => {} }}>
        <AccountMenu panel="sheet" theme="amonkhet" friends />
      </Report.Provider>,
    );
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Friends" }));
    expect(providerPush).toHaveBeenCalledWith("/friends");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});


describe("AccountMenu credit chip (M1b)", () => {
  const chip = (over: Partial<ChipState> = {}): ChipState => ({ kind: "credits", label: "117 credits", line: null, hollow: false, ...over });

  it("draws nothing for a reader who does not see credits", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" credits={null} />);
    press(trigger());
    expect(screen.queryByTestId("credit-chip")).toBeNull();
  });

  it.each(["popover", "sheet"] as const)("%s: one link to /credits under the email, no new menu row", (panel) => {
    render(<AccountMenu panel={panel} theme="amonkhet" credits={chip()} />);
    press(trigger());
    const link = screen.getByTestId("credit-chip");
    expect(link).toHaveAttribute("href", "/credits");
    expect(link).toHaveTextContent("117 credits");
    expect(within(screen.getByRole("menu")).queryByTestId("credit-chip")).toBeNull();
  });

  it("re-reads the chip each time the menu opens", async () => {
    chipAction.mockResolvedValue(chip({ label: "93 credits" }));
    render(<AccountMenu panel="popover" theme="amonkhet" credits={chip()} />);
    press(trigger());
    await waitFor(() => expect(screen.getByTestId("credit-chip")).toHaveTextContent("93 credits"));
    expect(chipAction).toHaveBeenCalledTimes(1);
    // Close it and open it again: a second open is a second read.
    press(trigger());
    chipAction.mockResolvedValue(chip({ label: "92 credits" }));
    press(trigger());
    await waitFor(() => expect(chipAction).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId("credit-chip")).toHaveTextContent("92 credits"));
  });

  it("keeps what is drawn when the re-read fails", async () => {
    chipAction.mockRejectedValue(new Error("down"));
    render(<AccountMenu panel="popover" theme="amonkhet" credits={chip()} />);
    press(trigger());
    await waitFor(() => expect(chipAction).toHaveBeenCalled());
    expect(screen.getByTestId("credit-chip")).toHaveTextContent("117 credits");
  });

  it("the expiring state carries its words on a line under the chip, in --warning", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" credits={chip({ kind: "expiring", line: "74 plan credits expire Nov 16" })} />);
    press(trigger());
    expect(screen.getByTestId("credit-chip")).toHaveAttribute("data-kind", "expiring");
    expect(screen.getByTestId("credit-chip-line")).toHaveTextContent("74 plan credits expire Nov 16");
  });

  it("the out state offers Get more credits with a hollow diamond", () => {
    render(<AccountMenu panel="sheet" theme="amonkhet" credits={chip({ kind: "out", label: "Get more credits", hollow: true })} />);
    press(trigger());
    expect(screen.getByTestId("credit-chip")).toHaveTextContent("Get more credits");
  });
});

describe("AccountMenu Take the tour row (discovery R3·2)", () => {
  it("draws no Take the tour row with the switch off", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" friends />);
    fireEvent.click(trigger());
    expect(screen.queryByRole("menuitem", { name: "Take the tour" })).toBeNull();
  });

  it.each(["popover", "sheet"] as const)("puts Take the tour directly under About in the %s, drawn as that row is", (panel) => {
    render(<AccountMenu panel={panel} theme="amonkhet" adminDoor adminEnv="production" friends tour />);
    fireEvent.click(trigger());
    const items = screen.getAllByRole("menuitem");
    expect(items.map((i) => i.getAttribute("href") ?? i.textContent)).toEqual(["/about", "/?tour=1", "/friends", "/admin", "Manage account", "Sign out"]);
    const [about, tour] = items;
    expect(tour.tagName).toBe(about.tagName);
    expect(tour.getAttribute("class")?.replace(/border-t.*?\]/, "")).toBe(about.getAttribute("class")?.replace(/border-t.*?\]/, ""));
  });

  it("hands the navigation to Home's tour parameter to the provider, even from Home, and closes the menu", () => {
    window.history.replaceState(null, "", "/");
    const providerPush = vi.fn();
    render(
      <Report.Provider value={{ report: () => {}, pathname: "/", push: providerPush, registerContentScope: () => {} }}>
        <AccountMenu panel="sheet" theme="amonkhet" tour />
      </Report.Provider>,
    );
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Take the tour" }));
    expect(providerPush).toHaveBeenCalledWith("/?tour=1");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
