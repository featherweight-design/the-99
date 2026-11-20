import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountMenu } from "./account-menu";
import { Report } from "./pending-report";
import type { ChipState } from "../../lib/payments/chip-rule";

// Clerk's signOut is thenable — the component releases `busy` on rejection.
const signOut = vi.fn(() => Promise.resolve());
const forgetThisDevice = vi.hoisted(() => vi.fn(() => Promise.resolve()));

const chipAction = vi.hoisted(() => vi.fn());
vi.mock("../../app/credits/actions", () => ({ chipAction }));
vi.mock("../../lib/push/forget-device", () => ({ forgetThisDevice }));

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
const setCommanderAction = vi.hoisted(() => vi.fn());
vi.mock("../../app/friends/actions", () => ({ setCommanderAction }));
vi.mock("../social/signature-picker", () => ({
  SignaturePicker: ({ onSave, onClose }: { onSave: (p: { oracleId: string; printingId: null } | null) => Promise<boolean>; onClose: () => void }) => (
    <div role="dialog" aria-label="picker">
      <button type="button" onClick={() => void onSave({ oracleId: "o1", printingId: null })}>save pick</button>
      <button type="button" onClick={onClose}>close picker</button>
    </div>
  ),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      firstName: "Ana",
      lastName: "Ruiz",
      fullName: "Ana Ruiz",
      primaryEmailAddress: { emailAddress: "ana.ruiz@example.com" },
    },
  }),
  useClerk: () => ({ signOut }),
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

  // Friends link G9: the player's own display name and signature card, when the shell hands them over.
  it("draws the signature card's art in both frames and names the display name", () => {
    const face = { name: "Wren Calloway", art: "https://cards.scryfall.io/art_crop/w.jpg", commander: null };
    for (const panel of ["popover", "sheet"] as const) {
      const { unmount } = render(<AccountMenu panel={panel} theme="amonkhet" face={face} />);
      const button = screen.getByRole("button", { name: "Account: Wren Calloway" });
      const box = button.firstElementChild as HTMLElement;
      expect(box).toHaveAttribute("data-face", "art");
      expect(box.querySelector("img")?.getAttribute("src")).toBe(face.art);
      // Clipped one pixel inside the frame, so the hairline stays whole: the rail's circle, the header's 12px square.
      expect((box.firstElementChild as HTMLElement).style.borderRadius).toBe(panel === "popover" ? "9999px" : "11px");
      expect(button.textContent).toBe("");
      fireEvent.click(button);
      // The head draws the same art, one pixel inside its own frame (44/12 in the popover, 48/14 in the sheet).
      const head = screen.getByRole("menu").ownerDocument.querySelectorAll('[data-face="art"]');
      const headBox = [...head].find((el) => el !== box) as HTMLElement;
      expect(headBox.querySelector("img")?.getAttribute("src")).toBe(face.art);
      expect((headBox.firstElementChild as HTMLElement).style.borderRadius).toBe(panel === "popover" ? "11px" : "13px");
      expect(screen.getAllByText("Wren Calloway").length).toBeGreaterThan(0);
      expect(screen.getByText("ana.ruiz@example.com")).toBeTruthy();
      unmount();
    }
  });

  it("makes the head's face the press that opens the signature picker over the menu, with no new menu row", async () => {
    setCommanderAction.mockResolvedValue({ ok: true });
    for (const panel of ["popover", "sheet"] as const) {
      const { unmount } = render(<AccountMenu panel={panel} theme="amonkhet" face={{ name: "Wren Calloway", art: null, commander: null }} />);
      fireEvent.click(screen.getByRole("button", { name: "Account: Wren Calloway" }));
      const rows = screen.getAllByRole("menuitem").length;
      const face = document.querySelector<HTMLElement>("[data-face-button]")!;
      expect(face.getAttribute("aria-label")).toBeTruthy();
      fireEvent.click(face);
      expect(screen.getByRole("dialog", { name: "picker" })).toBeTruthy();
      // The menu is still up beneath it, and a press inside the picker did not dismiss it.
      expect(screen.getAllByRole("menuitem").length).toBe(rows);
      fireEvent.click(screen.getByText("close picker"));
      expect(screen.queryByRole("dialog", { name: "picker" })).toBeNull();
      expect(document.querySelector("[data-face-button]")).toBeTruthy();
      fireEvent.click(face);
      fireEvent.click(screen.getByText("save pick"));
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "picker" })).toBeNull());
      expect(setCommanderAction).toHaveBeenLastCalledWith("o1", null);
      expect(refresh).toHaveBeenCalled();
      unmount();
    }
  });

  it("draws the display name's initials when no signature card is chosen", () => {
    render(<AccountMenu panel="sheet" theme="amonkhet" face={{ name: "Wren Calloway", art: null, commander: null }} />);
    const button = screen.getByRole("button", { name: "Account: Wren Calloway" });
    expect(button.firstElementChild).toHaveAttribute("data-face", "initials");
    expect(button.textContent).toBe("WC");
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
  it("renders the identity header and all four items", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    expect(screen.getByText("Ana Ruiz")).toBeTruthy();
    expect(screen.getByText("ana.ruiz@example.com")).toBeTruthy();
    const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual([
      "About The 99",
      "Take the tour",
      "Settings",
      "Sign out",
    ]);
  });

  // RD§1 — --fg-faint was 4.42:1 on --surface-raised and failed AA at 11px when this was ruled.
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
  // from there reaches About, so nothing is stranded; starting instead at
  // Sign out would put the caret at the end of the panel and leave
  // the picker reachable only by tabbing backwards.
  it("opens onto the current theme, with the menu items roving behind it", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    press(trigger());
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "Low Sun, Amonkhet" }),
    );
    const [about, tour, , signOutItem] = screen.getAllByRole("menuitem");
    expect(about).toHaveAttribute("tabindex", "0");
    expect(tour).toHaveAttribute("tabindex", "-1");
    expect(signOutItem).toHaveAttribute("tabindex", "-1");
  });

  it("roves with the arrow keys and wraps in both directions", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    const [about, tour, settings, signOutItem] = screen.getAllByRole("menuitem");

    fireEvent.keyDown(about, { key: "ArrowDown" });
    expect(document.activeElement).toBe(tour);

    fireEvent.keyDown(tour, { key: "ArrowDown" });
    expect(document.activeElement).toBe(settings);

    fireEvent.keyDown(settings, { key: "ArrowDown" });
    expect(document.activeElement).toBe(signOutItem);

    // The wrap from the last row back to the first. (A hard-coded `% 2` is caught by the steps above: from the tour it would
    // land on About, not Settings.)
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

  it("disables Sign out once sign-out is in flight", async () => {
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    // About is a link and carries no disabled state — leaving the menu for a
    // reference page cannot double-fire a sign-out, and a link that pretended
    // to be disabled would still navigate.
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeDisabled();
    // A second press cannot double-fire.
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("takes this browser's push subscription out BEFORE the session ends", async () => {
    signOut.mockClear();
    forgetThisDevice.mockClear();
    let finish!: () => void;
    forgetThisDevice.mockImplementationOnce(() => new Promise<void>((done) => { finish = done; }));
    render(<AccountMenu panel="popover" theme="amonkhet" />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    await waitFor(() => expect(forgetThisDevice).toHaveBeenCalledOnce());
    // Cleanup is still pending: the session must not have ended.
    await new Promise((r) => setTimeout(r, 20));
    expect(signOut).not.toHaveBeenCalled();
    finish();
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
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
    expect(screen.getAllByRole("menuitem")).toHaveLength(4);
  });

  it.each(["popover", "sheet"] as const)("puts Admin after Settings and before Sign out in the %s", (panel) => {
    render(<AccountMenu panel={panel} theme="amonkhet" adminDoor adminEnv="production" />);
    fireEvent.click(trigger());
    const items = screen.getAllByRole("menuitem");
    expect(items.map((i) => i.getAttribute("href") ?? i.textContent)).toEqual(["/about", "/?tour=1", "/settings", "/admin", "Sign out"]);
    // The environment rides at the row's end, hidden from its name: the page head says it.
    const admin = screen.getByRole("menuitem", { name: "Admin" });
    const env = within(admin).getByText("production");
    expect(env).toHaveAttribute("aria-hidden", "true");
  });

  it("roves through five rows and wraps", () => {
    render(<AccountMenu panel="popover" theme="amonkhet" adminDoor adminEnv="staging" />);
    fireEvent.click(trigger());
    const [about, tour, settings, admin, signOutItem] = screen.getAllByRole("menuitem");
    fireEvent.keyDown(about, { key: "ArrowDown" });
    expect(document.activeElement).toBe(tour);
    fireEvent.keyDown(tour, { key: "ArrowDown" });
    expect(document.activeElement).toBe(settings);
    fireEvent.keyDown(settings, { key: "ArrowDown" });
    expect(document.activeElement).toBe(admin);
    fireEvent.keyDown(admin, { key: "ArrowDown" });
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

// Menu and Home handoff, R1 Menu 3: Friends is in the bar, so Settings takes its row in the same place, and the menu
// draws no Friends row.
describe("AccountMenu Settings row (menu and Home)", () => {
  it.each(["popover", "sheet"] as const)("draws Settings where Friends was, and no Friends row, in the %s", (panel) => {
    render(<AccountMenu panel={panel} theme="amonkhet" adminDoor adminEnv="production" />);
    fireEvent.click(trigger());
    const items = screen.getAllByRole("menuitem");
    expect(items.map((i) => i.getAttribute("href") ?? i.textContent)).toEqual(["/about", "/?tour=1", "/settings", "/admin", "Sign out"]);
    expect(screen.getByRole("menuitem", { name: "Settings" })).toHaveAttribute("href", "/settings");
    expect(screen.queryByRole("menuitem", { name: "Friends" })).toBeNull();
  });

  it("roves through every row it draws, sized from the rows (E9)", () => {
    for (const admin of [false, true]) {
      const { unmount } = render(<AccountMenu panel="popover" theme="amonkhet" adminDoor={admin} adminEnv="staging" />);
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

  it("hands the Settings navigation to the provider and closes the menu", () => {
    window.history.replaceState(null, "", "/");
    const providerPush = vi.fn();
    render(
      <Report.Provider value={{ report: () => {}, pathname: "/", push: providerPush, registerContentScope: () => {} }}>
        <AccountMenu panel="sheet" theme="amonkhet" />
      </Report.Provider>,
    );
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Settings" }));
    expect(providerPush).toHaveBeenCalledWith("/settings");
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

  it("the welcome lot's expiring line is worded on the client, in the reader's own day (welcome credits G4)", () => {
    const at = new Date("2026-11-20T12:00:00Z");
    render(<AccountMenu panel="popover" theme="amonkhet" credits={chip({ kind: "expiring", label: "10 credits", welcomeExpiring: { n: 9, atMs: at.getTime() } })} />);
    press(trigger());
    const day = at.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    expect(screen.getByTestId("credit-chip-line")).toHaveTextContent(`9 welcome credits expire ${day}`);
    expect(screen.getByTestId("credit-chip-line").className).toContain("text-[color:var(--warning)]");
  });

  it("the out state offers Get more credits with a hollow diamond", () => {
    render(<AccountMenu panel="sheet" theme="amonkhet" credits={chip({ kind: "out", label: "Get more credits", hollow: true })} />);
    press(trigger());
    expect(screen.getByTestId("credit-chip")).toHaveTextContent("Get more credits");
  });
});

describe("AccountMenu Take the tour row (discovery R3·2)", () => {
  it.each(["popover", "sheet"] as const)("puts Take the tour directly under About in the %s, drawn as that row is", (panel) => {
    render(<AccountMenu panel={panel} theme="amonkhet" adminDoor adminEnv="production" />);
    fireEvent.click(trigger());
    const items = screen.getAllByRole("menuitem");
    expect(items.map((i) => i.getAttribute("href") ?? i.textContent)).toEqual(["/about", "/?tour=1", "/settings", "/admin", "Sign out"]);
    const [about, tour] = items;
    expect(tour.tagName).toBe(about.tagName);
    expect(tour.getAttribute("class")?.replace(/border-t.*?\]/, "")).toBe(about.getAttribute("class")?.replace(/border-t.*?\]/, ""));
  });

  it("hands the navigation to Home's tour parameter to the provider, even from Home, and closes the menu", () => {
    window.history.replaceState(null, "", "/");
    const providerPush = vi.fn();
    render(
      <Report.Provider value={{ report: () => {}, pathname: "/", push: providerPush, registerContentScope: () => {} }}>
        <AccountMenu panel="sheet" theme="amonkhet" />
      </Report.Provider>,
    );
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "Take the tour" }));
    expect(providerPush).toHaveBeenCalledWith("/?tour=1");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
