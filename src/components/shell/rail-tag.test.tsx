import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NavRail } from "./nav";
import { CLOSE_DELAY_MS, FOLLOW_GRACE_MS, OPEN_DELAY_MS } from "./rail-tag";

let pathname = "/collection";
vi.mock("./pending-push", () => ({ usePendingPush: () => ({ go: () => {} }) }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Ana", fullName: "Ana Ruiz", primaryEmailAddress: { emailAddress: "a@example.com" } } }),
  useClerk: () => ({ openUserProfile: vi.fn(), signOut: vi.fn() }),
}));

/** A primary input: `(hover: hover)` answers `hover`, every other query false. */
function primaryInput(hover: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query === "(hover: hover)" ? hover : false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

const tag = () => document.querySelector<HTMLElement>("[data-rail-tag]");
const slot = (name: string) => within(document.querySelector("aside")!).getByRole("link", { name });
const enter = (el: Element, pointerType = "mouse") => fireEvent.pointerEnter(el, { pointerType });
const leave = (el: Element, pointerType = "mouse") => fireEvent.pointerLeave(el, { pointerType });
const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  pathname = "/collection";
  document.body.innerHTML = "";
});

describe("the pointer rail's name tag", () => {
  it("drops the native tooltip and keeps the slot's name", () => {
    primaryInput(true);
    render(<NavRail locked={false} theme="amonkhet" />);
    for (const name of ["Home", "Collection", "Commanders", "Discover", "Decks"]) {
      expect(slot(name)).not.toHaveAttribute("title");
      expect(slot(name)).toHaveAttribute("aria-label", name);
    }
  });

  it("is not mounted on a touch screen, where the rail prints every name", () => {
    primaryInput(false);
    render(<NavRail locked={false} theme="amonkhet" />);
    enter(slot("Commanders"));
    wait(OPEN_DELAY_MS * 2);
    expect(tag()).toBeNull();
  });

  it("opens after 400ms on a mouse, aria-hidden, naming the slot", () => {
    primaryInput(true);
    render(<NavRail locked={false} theme="amonkhet" />);
    enter(slot("Commanders"));
    wait(OPEN_DELAY_MS - 1);
    expect(tag()).toBeNull();
    wait(1);
    expect(tag()).toHaveTextContent("Commanders");
    expect(tag()).toHaveAttribute("aria-hidden", "true");
    expect(tag()!.className).toContain("anim-rail-tag");
  });

  it("ignores a touch pointer on a hover-capable screen (audit E7)", () => {
    primaryInput(true);
    render(<NavRail locked={false} theme="amonkhet" />);
    enter(slot("Commanders"), "touch");
    wait(OPEN_DELAY_MS * 2);
    expect(tag()).toBeNull();
  });

  it("closes 100ms after the pointer leaves, and holds while it rests on the tag", () => {
    primaryInput(true);
    render(<NavRail locked={false} theme="amonkhet" />);
    enter(slot("Decks"));
    wait(OPEN_DELAY_MS);
    leave(slot("Decks"));
    wait(CLOSE_DELAY_MS - 1);
    expect(tag()).not.toBeNull();
    wait(1);
    expect(tag()).toBeNull();

    enter(slot("Decks"));
    wait(OPEN_DELAY_MS);
    leave(slot("Decks"));
    wait(CLOSE_DELAY_MS / 2);
    enter(tag()!);
    wait(CLOSE_DELAY_MS * 3);
    expect(tag()).toHaveTextContent("Decks");
    leave(tag()!);
    wait(CLOSE_DELAY_MS);
    expect(tag()).toBeNull();
  });

  it("follows the pointer at once while open and for 300ms after closing, then waits again", () => {
    primaryInput(true);
    render(<NavRail locked={false} theme="amonkhet" />);
    enter(slot("Home"));
    wait(OPEN_DELAY_MS);
    // Straight from one slot to the next: no delay.
    leave(slot("Home"));
    enter(slot("Collection"));
    expect(tag()).toHaveTextContent("Collection");

    // Closed, then back inside the grace: at once.
    leave(slot("Collection"));
    wait(CLOSE_DELAY_MS);
    expect(tag()).toBeNull();
    wait(FOLLOW_GRACE_MS - 50);
    enter(slot("Commanders"));
    expect(tag()).toHaveTextContent("Commanders");

    // Closed, and back after the grace: the full delay again.
    leave(slot("Commanders"));
    wait(CLOSE_DELAY_MS + FOLLOW_GRACE_MS + 50);
    enter(slot("Discover"));
    expect(tag()).toBeNull();
    wait(OPEN_DELAY_MS);
    expect(tag()).toHaveTextContent("Discover");
  });

  it("closes on a press, and a press cancels a tag waiting to open", () => {
    primaryInput(true);
    render(<NavRail locked={false} theme="amonkhet" />);
    enter(slot("Home"));
    wait(OPEN_DELAY_MS);
    fireEvent.pointerDown(document.body);
    expect(tag()).toBeNull();

    // Past the grace, so the next enter waits the full delay: the press lands on a pending open.
    wait(FOLLOW_GRACE_MS + 10);
    enter(slot("Decks"));
    wait(OPEN_DELAY_MS / 2);
    expect(tag()).toBeNull();
    fireEvent.pointerDown(slot("Decks"));
    wait(OPEN_DELAY_MS * 2);
    expect(tag()).toBeNull();
  });

  it("closes on the slot's click, which Enter fires too (audit E1)", () => {
    primaryInput(true);
    render(<NavRail locked={false} theme="amonkhet" />);
    enter(slot("Home"));
    wait(OPEN_DELAY_MS);
    fireEvent.click(slot("Home"));
    expect(tag()).toBeNull();
  });

  it("is retired by a route change", () => {
    primaryInput(true);
    const { rerender } = render(<NavRail locked={false} theme="amonkhet" />);
    enter(slot("Home"));
    wait(OPEN_DELAY_MS);
    pathname = "/decks";
    rerender(<NavRail locked={false} theme="amonkhet" />);
    expect(tag()).toBeNull();
    // Back to the route it opened on: forgotten, not redrawn.
    pathname = "/collection";
    rerender(<NavRail locked={false} theme="amonkhet" />);
    expect(tag()).toBeNull();
  });

  it("closes on Escape and stays closed on that slot until another is entered", () => {
    primaryInput(true);
    render(<NavRail locked={false} theme="amonkhet" />);
    enter(slot("Home"));
    wait(OPEN_DELAY_MS);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(tag()).toBeNull();
    leave(slot("Home"));
    enter(slot("Home"));
    wait(OPEN_DELAY_MS * 2);
    expect(tag()).toBeNull();
    leave(slot("Home"));
    enter(slot("Decks"));
    wait(OPEN_DELAY_MS);
    expect(tag()).toHaveTextContent("Decks");
  });

  it("leaves an Escape that something else already handled", () => {
    primaryInput(true);
    render(<NavRail locked={false} theme="amonkhet" />);
    enter(slot("Home"));
    wait(OPEN_DELAY_MS);
    const e = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    e.preventDefault();
    act(() => { document.dispatchEvent(e); });
    expect(tag()).not.toBeNull();
  });

  it("leaves an Escape pressed on another rail control to that control (audit E9)", () => {
    primaryInput(true);
    render(<NavRail locked={false} theme="amonkhet" />);
    enter(slot("Home"));
    wait(OPEN_DELAY_MS);
    const account = document.querySelector<HTMLElement>("aside button")!;
    expect(account.closest("[data-rail-nav]")).toBeNull();
    act(() => account.focus());
    fireEvent.keyDown(account, { key: "Escape" });
    expect(tag()).toHaveTextContent("Home");
  });

  it("goes the moment a locked slot opens its note, not 100ms later (audit E2)", () => {
    primaryInput(true);
    render(<NavRail locked theme="amonkhet" />);
    enter(slot("Home"));
    wait(OPEN_DELAY_MS);
    expect(tag()).toHaveTextContent("Home");
    const locked = screen.getByRole("button", { name: /^Collection/ });
    leave(slot("Home"));
    fireEvent.pointerOver(locked, { pointerType: "mouse" });
    enter(locked);
    expect(document.querySelector('[data-lock-note="open"]')).not.toBeNull();
    expect(tag()).toBeNull();
  });

  it("closes on scroll, and a scroll or resize cancels a tag waiting to open", () => {
    primaryInput(true);
    render(<NavRail locked={false} theme="amonkhet" />);
    enter(slot("Home"));
    wait(OPEN_DELAY_MS);
    act(() => { document.dispatchEvent(new Event("scroll")); });
    expect(tag()).toBeNull();

    leave(slot("Home"));
    wait(CLOSE_DELAY_MS + FOLLOW_GRACE_MS + 10);
    enter(slot("Decks"));
    wait(OPEN_DELAY_MS / 2);
    act(() => { document.dispatchEvent(new Event("scroll")); });
    wait(OPEN_DELAY_MS);
    expect(tag()).toBeNull();

    leave(slot("Decks"));
    wait(CLOSE_DELAY_MS + FOLLOW_GRACE_MS + 10);
    enter(slot("Decks"));
    wait(OPEN_DELAY_MS / 2);
    act(() => { window.dispatchEvent(new Event("resize")); });
    wait(OPEN_DELAY_MS);
    expect(tag()).toBeNull();
  });

  it("is not held off by a lock note outside the rail", () => {
    primaryInput(true);
    render(<NavRail locked={false} theme="amonkhet" />);
    const stray = document.createElement("div");
    stray.setAttribute("data-lock-note", "open");
    document.body.append(stray);
    enter(slot("Home"));
    wait(OPEN_DELAY_MS);
    expect(tag()).toHaveTextContent("Home");
  });

  it("never opens while a lock note is open, and a locked slot raises none (audit E2)", () => {
    primaryInput(true);
    render(<NavRail locked theme="amonkhet" />);
    const locked = screen.getByRole("button", { name: /^Collection/ });
    enter(locked);
    wait(OPEN_DELAY_MS * 2);
    expect(tag()).toBeNull();
    expect(document.querySelector('[data-lock-note="open"]')).not.toBeNull();
    enter(slot("Home"));
    wait(OPEN_DELAY_MS * 2);
    expect(tag()).toBeNull();
  });
});
