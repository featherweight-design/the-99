import { fireEvent, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, useRef } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { leaveDialogsForNavigation, useBackDismiss, useDialogA11y } from "./dialog";

// The trap roots below are appended by hand rather than rendered, so Testing
// Library's automatic cleanup does not know about them.
const appended: HTMLElement[] = [];

afterEach(() => {
  document.body.style.overflow = "";
  vi.restoreAllMocks();
  while (appended.length) appended.pop()?.remove();
});

// Scroll locking only. The hook takes a ref, so the harness supplies an empty
// one — nothing is attached, which leaves the focus trap inert and keeps these
// cases isolated to the lock.
function renderDialog(options?: Parameters<typeof useDialogA11y>[2]) {
  return renderHook(
    ({ opts }: { opts?: Parameters<typeof useDialogA11y>[2] }) => {
      const ref = useRef<HTMLDivElement | null>(null);
      useDialogA11y(ref, vi.fn(), opts);
      return ref;
    },
    { initialProps: { opts: options } },
  );
}

// Escape is wired to a window listener but no-ops unless the ref holds an
// element, so these cases attach a real one.
describe("useDialogA11y closeOnEscape", () => {
  function renderWithElement(options?: Parameters<typeof useDialogA11y>[2]) {
    const onClose = vi.fn();
    const el = document.createElement("div");
    document.body.appendChild(el);
    appended.push(el);
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useDialogA11y(ref, onClose, options);
    });
    return { onClose };
  }

  function pressEscape() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  }

  it("closes on Escape by default", () => {
    const { onClose } = renderWithElement();
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape when closeOnEscape is false", () => {
    const { onClose } = renderWithElement({ closeOnEscape: false });
    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("useDialogA11y focus trap with nothing to focus", () => {
  // The replace confirm disables both of its buttons while it writes (#1110). With no focusable
  // left, a Tab must not walk out of the aria-modal dialog.
  it("holds Tab inside a dialog whose every control is disabled", () => {
    const el = document.createElement("div");
    el.tabIndex = -1;
    const button = document.createElement("button");
    button.disabled = true;
    el.appendChild(button);
    document.body.appendChild(el);
    appended.push(el);
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useDialogA11y(ref, vi.fn());
    });
    el.focus();
    const tab = new KeyboardEvent("keydown", { key: "Tab", cancelable: true, bubbles: true });
    el.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
  });
});

describe("useDialogA11y scroll lock", () => {
  it("locks body scroll by default", () => {
    renderDialog();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("locks body scroll when asked", () => {
    renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("leaves body scroll alone when a consumer opts out", () => {
    renderDialog({ lockScroll: false });
    expect(document.body.style.overflow).toBe("");
  });

  it("restores the previous overflow on unmount", () => {
    document.body.style.overflow = "scroll";
    const { unmount } = renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  // lockScroll is a plain option, so a caller may flip it on a mounted dialog
  // rather than unmounting. The lock has to follow the flag either way.
  it("releases the lock when the flag goes false without unmounting", () => {
    const { rerender } = renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");
    rerender({ opts: { lockScroll: false } });
    expect(document.body.style.overflow).toBe("");
    rerender({ opts: { lockScroll: true } });
    expect(document.body.style.overflow).toBe("hidden");
  });

  // The deck builder's add sheet and export dialog are independent flags, so
  // both can be up at once and either may close first.
  it("holds the lock until the last of two dialogs releases it", () => {
    document.body.style.overflow = "scroll";
    const first = renderDialog({ lockScroll: true });
    const second = renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");

    first.unmount();
    expect(document.body.style.overflow).toBe("hidden");

    second.unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  // `overflow: hidden` on `body` alone does not hold the page in every engine — Firefox
  // chains a wheel event past a fixed, non-scrollable sheet overlay to the page's real
  // scroll regardless (reported on `/collection`, Hugh, desktop Firefox, a narrow window).
  // Two fixes that looked right were dropped after they broke `position: sticky` in
  // Firefox instead (see the module doc comment); this is the one that didn't: block the
  // wheel/touchmove directly, and leave `overflow`/`position` exactly as they already were.
  function wheelAt(target: EventTarget, deltaY = 100) {
    const event = new WheelEvent("wheel", { deltaY, cancelable: true, bubbles: true });
    target.dispatchEvent(event);
    return event;
  }

  it("blocks a wheel event whose target has no scrollable ancestor", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    appended.push(el);
    renderDialog({ lockScroll: true });

    const event = wheelAt(el);
    expect(event.defaultPrevented).toBe(true);
  });

  it("lets a wheel event through when its target sits inside a genuinely scrollable region", () => {
    const list = document.createElement("ul");
    list.style.overflowY = "auto";
    Object.defineProperty(list, "scrollHeight", { value: 400, configurable: true });
    Object.defineProperty(list, "clientHeight", { value: 100, configurable: true });
    const row = document.createElement("li");
    list.appendChild(row);
    document.body.appendChild(list);
    appended.push(list);
    renderDialog({ lockScroll: true });

    const event = wheelAt(row);
    expect(event.defaultPrevented).toBe(false);
  });

  // The same rule, for touch — iOS Safari's rubber-band failure of `overflow: hidden`
  // is the same underlying weakness as Firefox's wheel-chaining, by a different input.
  it("blocks a touchmove the same way", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    appended.push(el);
    renderDialog({ lockScroll: true });

    const event = new Event("touchmove", { cancelable: true, bubbles: true });
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  // Found by Copilot's round-3 review: a trackpad pinch synthesises a `wheel` with
  // `ctrlKey` set, and a touch pinch carries two or more touch points — neither is a
  // scroll, and blocking either made zoom unreachable over any non-scrolling part of an
  // open dialog, card art included.
  it("lets a Ctrl+wheel (trackpad pinch-zoom) through even with no scrollable ancestor", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    appended.push(el);
    renderDialog({ lockScroll: true });

    const event = new WheelEvent("wheel", { deltaY: 100, ctrlKey: true, cancelable: true, bubbles: true });
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("lets a multi-touch touchmove (pinch-zoom) through even with no scrollable ancestor", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    appended.push(el);
    renderDialog({ lockScroll: true });

    const event = new Event("touchmove", { cancelable: true, bubbles: true });
    Object.defineProperty(event, "touches", { value: [{}, {}] });
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("stops blocking once the lock releases", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    appended.push(el);
    const { unmount } = renderDialog({ lockScroll: true });
    unmount();

    const event = wheelAt(el);
    expect(event.defaultPrevented).toBe(false);
  });

  // Counted exactly as `overflow` is: the listener goes on when the first dialog opens
  // and comes off only when the last one closes — never mid-stack, where a second
  // dialog's own unmount would remove it out from under the first.
  it("keeps blocking until the last of two dialogs releases it", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    appended.push(el);
    const first = renderDialog({ lockScroll: true });
    const second = renderDialog({ lockScroll: true });

    first.unmount();
    expect(wheelAt(el).defaultPrevented).toBe(true); // still held by the second

    second.unmount();
    expect(wheelAt(el).defaultPrevented).toBe(false);
  });
});

// A dialog that covers part of itself — the card modal's zoom is the first — leaves
// the covered controls mounted for layout and marks them `inert`. The browser will
// not focus them; `querySelectorAll` still finds them, so the trap has to.
describe("useDialogA11y and inert subtrees", () => {
  function renderTrap(markInert: boolean) {
    const el = document.createElement("div");
    el.innerHTML = `
      <div ${markInert ? "inert" : ""}><button id="covered">covered</button></div>
      <div><button id="live">live</button></div>
    `;
    document.body.appendChild(el);
    appended.push(el);
    // jsdom gives every element a zero rect, which the trap reads as "not visible";
    // the real filter under test is the inert one, so rects are stubbed present.
    for (const node of el.querySelectorAll("button")) {
      node.getClientRects = () => [{ width: 10, height: 10 }] as unknown as DOMRectList;
    }
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useDialogA11y(ref, vi.fn());
    });
    return el;
  }

  function tabFrom(el: HTMLElement, id: string, shift = false) {
    (el.querySelector(`#${id}`) as HTMLElement).focus();
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: shift, bubbles: true }));
  }

  it("wraps Tab past an inert control rather than onto it", () => {
    const el = renderTrap(true);

    tabFrom(el, "live");

    // Only the live control is in the cycle, so Tab from it wraps back to itself
    // rather than landing on a control the browser refuses to focus.
    expect(document.activeElement?.id).toBe("live");
  });

  it("still cycles through a control that is not inert", () => {
    const el = renderTrap(false);

    tabFrom(el, "live");

    expect(document.activeElement?.id).toBe("covered");
  });

  // The root carries `tabIndex={-1}` so it is excluded from the focusable list —
  // it is neither `first` nor `last`, so both wrap branches missed and the first
  // Shift+Tab after opening left an `aria-modal` surface for the page behind it.
  // `/collection`'s filter sheet and the deck sheet both take initial focus this
  // way, to avoid raising the phone keyboard.
  function renderRootFocused() {
    const el = document.createElement("div");
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.tabIndex = -1;
    el.innerHTML = `<button id="first">first</button><button id="last">last</button>`;
    document.body.appendChild(el);
    appended.push(el);
    // jsdom gives every element a zero rect, which the trap reads as "not visible".
    for (const node of el.querySelectorAll("button")) {
      node.getClientRects = () => [{ width: 10, height: 10 }] as unknown as DOMRectList;
    }
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useDialogA11y(ref, vi.fn(), { initialFocusRef: ref });
    });
    return el;
  }

  it("wraps Shift+Tab to the last control when the root holds focus", () => {
    const el = renderRootFocused();
    expect(document.activeElement).toBe(el);
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(el.querySelector("#last"));
  });

  it("enters at the first control when the root holds focus and Tab goes forward", () => {
    const el = renderRootFocused();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(el.querySelector("#first"));
  });

  // A child focused by script (a stand-in's taken row, landed on once a take replaced the row the
  // reader was on) is outside the list too, but in the MIDDLE: Tab goes on to the next control in
  // document order, its own Undo, rather than back to the dialog's first.
  it("moves on from a script-focused child to the controls either side of it", () => {
    const el = renderRootFocused();
    const row = document.createElement("div");
    row.tabIndex = -1;
    row.innerHTML = `<button id="undo">undo</button>`;
    el.insertBefore(row, el.querySelector("#last"));
    el.querySelector<HTMLElement>("#undo")!.getClientRects = () => [{ width: 10, height: 10 }] as unknown as DOMRectList;
    row.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(el.querySelector("#undo"));
    row.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(el.querySelector("#first"));
  });


  it("leaves another dialog's Tab alone when two are mounted", () => {
    // The listener is on `window`, so every mounted hook sees every Tab, and
    // the hook explicitly supports two dialogs at once. Focus inside a sibling
    // modal reads as "not in this trap", so the background dialog would pull
    // focus into itself the moment the foreground one was Tabbed.
    const background = renderRootFocused();
    const foreground = document.createElement("div");
    foreground.setAttribute("role", "dialog");
    foreground.setAttribute("aria-modal", "true");
    foreground.innerHTML = `<button id="fg">fg</button>`;
    document.body.appendChild(foreground);
    appended.push(foreground);
    const fg = foreground.querySelector<HTMLElement>("#fg")!;
    fg.getClientRects = () => [{ width: 10, height: 10 }] as unknown as DOMRectList;
    fg.focus();

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(fg);
    expect(background.contains(document.activeElement)).toBe(false);
  });


  it("does not close a background dialog on the foreground's Escape", () => {
    // The guard has to cover Escape as much as Tab: every mounted hook sees the
    // key, so an Escape meant for the dialog in front closed the one behind it.
    const onClose = vi.fn();
    const background = document.createElement("div");
    background.setAttribute("role", "dialog");
    document.body.appendChild(background);
    appended.push(background);
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(background);
      useDialogA11y(ref, onClose);
    });

    const foreground = document.createElement("div");
    foreground.setAttribute("role", "dialog");
    foreground.innerHTML = `<button id="fg">fg</button>`;
    document.body.appendChild(foreground);
    appended.push(foreground);
    foreground.querySelector<HTMLElement>("#fg")!.focus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes only the topmost dialog on Escape when focus is on neither dialog's subtree", () => {
    // The desktop carousel's neighbor plates are siblings of the dialog, not descendants
    // (H23 PR 2, pre-open review round 2) — focus there satisfies neither dialog's
    // `closest('[role="dialog"]')`, which used to read as "mine" for every mounted hook.
    const backgroundClose = vi.fn();
    const background = document.createElement("div");
    background.setAttribute("role", "dialog");
    document.body.appendChild(background);
    appended.push(background);
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(background);
      useDialogA11y(ref, backgroundClose);
    });

    const foregroundClose = vi.fn();
    const foreground = document.createElement("div");
    foreground.setAttribute("role", "dialog");
    document.body.appendChild(foreground);
    appended.push(foreground);
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(foreground);
      useDialogA11y(ref, foregroundClose);
    });

    // Neither dialog, and neither root — the plate stand-in.
    const plate = document.createElement("button");
    document.body.appendChild(plate);
    appended.push(plate);
    plate.focus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(foregroundClose).toHaveBeenCalledTimes(1);
    expect(backgroundClose).not.toHaveBeenCalled();
  });

});

// A dialog opened from a control that the SAME commit marks `inert`.
describe("useDialogA11y return focus", () => {
  function mountWith(returnFocusRef?: { current: HTMLElement | null }) {
    const root = document.createElement("div");
    root.setAttribute("role", "dialog");
    document.body.appendChild(root);
    appended.push(root);
    return renderHook(() => {
      const ref = useRef<HTMLElement | null>(root);
      useDialogA11y(ref, vi.fn(), { returnFocusRef: returnFocusRef as never });
    });
  }

  it("returns focus to what was active when nothing else is named", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    appended.push(opener);
    opener.focus();

    mountWith().unmount();

    expect(document.activeElement).toBe(opener);
  });

  it("prefers the named target over its own capture", () => {
    // The capture runs in the dialog's mount effect, which is AFTER the commit
    // that rendered it — so a dialog opened from a control the same commit
    // marks `inert` records `body` instead, and closing drops the reader at the
    // top of the document. `/collection`'s set panel is exactly that shape:
    // pressing the Set row opens the panel and makes the sheet around the row
    // inert in one render. jsdom implements no `inert`, so the condition is
    // reproduced here by focusing something else entirely.
    const captured = document.createElement("button");
    const wanted = document.createElement("button");
    for (const el of [captured, wanted]) {
      document.body.appendChild(el);
      appended.push(el);
    }
    captured.focus();

    mountWith({ current: wanted }).unmount();

    expect(document.activeElement).toBe(wanted);
    expect(document.activeElement).not.toBe(captured);
  });

  it("falls back to the capture when the named target went away", () => {
    // A return target can unmount with the surface that opened it. Focusing
    // nothing would leave the reader at the top of the document, which is the
    // state this whole mechanism exists to prevent.
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    appended.push(opener);
    opener.focus();

    mountWith({ current: null }).unmount();

    expect(document.activeElement).toBe(opener);
  });
});

// #155. jsdom keeps a real session history — pushState, back() and an async
// popstate — so these run against the same mechanism a browser uses. Each case
// waits for history to settle before the next, because back() is queued, not
// immediate, and a leftover pop would be read by the following case.
describe("useBackDismiss", () => {
  const settle = () => new Promise((r) => setTimeout(r, 20));
  // The cases above unmount dialogs without waiting for them. Each one's self-pop is
  // a back() jsdom may answer with nothing, and the count it leaves expires after a
  // second — which is the rule, so it is waited out rather than reset.
  beforeAll(() => new Promise((r) => setTimeout(r, 1_100)));
  // Every dialog a case opens is unmounted HERE, and its self-pop allowed to land,
  // before the next case starts. A dialog still up at the end of a case holds an
  // entry, and the back() its unmount issues would otherwise be counted by the
  // next case's spy.
  const mounted: { unmount: () => void }[] = [];
  afterEach(async () => {
    // An unmount queues a self-pop, and the `popstate` that answers it starts a
    // scroll-pin loop of up to 30 frames. Under load that pop can land well after a
    // fixed wait, and the loop then runs into the NEXT case, calling its mocked
    // `scrollTo` with this case's offset (0), which is how the delayed-disturbance
    // case read `scrollY` 0. So wait for the pop itself (capped, since jsdom may
    // answer a back() with nothing), then cancel any loop it started through the
    // loop's own cancel rule: a wheel.
    const hadDialogs = mounted.length > 0;
    const popped = new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        window.removeEventListener("popstate", done);
        resolve();
      };
      window.addEventListener("popstate", done);
      const timer = setTimeout(done, hadDialogs ? 500 : 0);
    });
    while (mounted.length) mounted.pop()?.unmount();
    await popped;
    await new Promise((r) => setTimeout(r, 60));
    window.dispatchEvent(new WheelEvent("wheel"));
    window.history.replaceState(null, "", "/");
  });
  const track = <T extends { unmount: () => void }>(hook: T): T => {
    let done = false;
    const unmount = hook.unmount;
    hook.unmount = () => {
      if (done) return;
      done = true;
      unmount();
    };
    mounted.push(hook);
    return hook;
  };

  function open(onClose = vi.fn(), canClose?: () => boolean) {
    const hook = track(renderHook(
      ({ isOpen }: { isOpen: boolean }) => useBackDismiss(isOpen, onClose, canClose),
      { initialProps: { isOpen: true } },
    ));
    return { onClose, hook };
  }

  // Counted as calls, never as history.length: a push truncates whatever forward
  // entries an earlier case left, so the length can stay put or even fall.
  it("puts one entry under an open dialog, and Back closes the dialog rather than leaving", async () => {
    const push = vi.spyOn(window.history, "pushState");
    const { onClose } = open();
    expect(push).toHaveBeenCalledTimes(1);
    push.mockRestore();
    window.history.back();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("takes its own entry back off when the dialog closes some other way", async () => {
    const start = window.history.length;
    const { onClose, hook } = open();
    const back = vi.spyOn(window.history, "back");
    hook.unmount();
    await settle();
    // The half that fails without the self-pop: nothing else here can tell a
    // removed entry from a stranded one, because both land on the same path.
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
    // Back again now has nothing of ours to step over: the next pop is the
    // reader's own navigation, and it closes nothing.
    expect(onClose).not.toHaveBeenCalled();
    const spy = vi.fn();
    window.addEventListener("popstate", spy);
    window.history.pushState(null, "", "/next");
    window.history.back();
    await waitFor(() => expect(spy).toHaveBeenCalled());
    window.removeEventListener("popstate", spy);
    expect(window.location.pathname).toBe("/");
    expect(window.history.length).toBeGreaterThanOrEqual(start);
  });

  // Hugh, Firefox, phone width, 2026-10-03: a filter edit made while the sheet was
  // open re-homes the page (decision 6), and the self-pop this hook issues to clean
  // up its history entry then runs the browser's own scroll restoration against an
  // offset that no longer describes the shorter list — landing mid-list instead of
  // where the edit left the reader.
  //
  // `disturbLater` stands in for that restoration landing OUTSIDE the task the
  // self-pop's `popstate` runs in — ten `requestAnimationFrame`s after `unmount`,
  // well after `pinScrollY`'s own first (also RAF-scheduled, never synchronous)
  // reassertion has already come and gone. Found by Copilot's round-1 review: an
  // earlier version of this test moved `scrollY` from a capture-phase `popstate`
  // listener instead, landing the disturbance inside that same task — which only
  // exercised `pinScrollY`'s first reassertion, so the test still passed with the
  // 30-frame loop (the actual fix for Firefox's delayed restoration) deleted.
  it("pins the pre-close scroll offset back after its self-pop, even against a delayed disturbance", async () => {
    window.scrollY = 900;
    const { hook } = open();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation((_x, y) => {
      window.scrollY = y as number;
    });
    let frame = 0;
    function disturbLater() {
      frame += 1;
      if (frame < 10) {
        requestAnimationFrame(disturbLater);
        return;
      }
      window.scrollY = 300;
    }
    requestAnimationFrame(disturbLater);
    hook.unmount();
    await new Promise((r) => setTimeout(r, 700));
    expect(window.scrollY).toBe(900);
    scrollTo.mockRestore();
  });

  // Found alongside the above: closing a dialog does not stop the reader from
  // scrolling in the following half-second, so the reassert loop has to let a
  // real wheel/touch/key win rather than fight it for the rest of its 30 frames —
  // the same rule, and the same reason, `filter-bar.tsx`'s own loop cancels.
  it("lets a real scroll cancel the reassert loop rather than fight it", async () => {
    window.scrollY = 900;
    const { hook } = open();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation((_x, y) => {
      window.scrollY = y as number;
    });
    hook.unmount();
    await new Promise((r) => setTimeout(r, 50));
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 10 }));
    window.scrollY = 300;
    await new Promise((r) => setTimeout(r, 700));
    expect(window.scrollY).toBe(300);
    scrollTo.mockRestore();
  });

  // Found by Copilot's round-2 review: a link click commits a new route without
  // firing any of the three cancel events above, so an uncancelled loop would
  // keep stamping the OLD route's offset onto the page the click just navigated
  // to for the rest of its ~500ms.
  it("stops reasserting once the URL changes under it", async () => {
    window.scrollY = 900;
    const { hook } = open();
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation((_x, y) => {
      window.scrollY = y as number;
    });
    hook.unmount();
    await new Promise((r) => setTimeout(r, 50));
    window.history.pushState(null, "", "/decks");
    window.scrollY = 50;
    await new Promise((r) => setTimeout(r, 700));
    expect(window.scrollY).toBe(50);
    scrollTo.mockRestore();
  });

  it("closes only the top dialog on each Back", async () => {
    const under = open();
    const over = open();
    window.history.back();
    await waitFor(() => expect(over.onClose).toHaveBeenCalledTimes(1));
    expect(under.onClose).not.toHaveBeenCalled();
    // The top dialog re-armed after its rung, so closing it takes that entry off by a
    // self-pop, which lands before the reader's next press.
    over.hook.unmount();
    await settle();
    window.history.back();
    await waitFor(() => expect(under.onClose).toHaveBeenCalledTimes(1));
  });

  // Two presses, because one proves nothing: the entry before the dialog's is at
  // the same URL. Without the entry going back on, the second press would leave.
  it("keeps the dialog, and its entry, while it refuses to close", async () => {
    window.history.pushState(null, "", "/route");
    const { onClose } = open(vi.fn(), () => false);
    window.history.back();
    await settle();
    window.history.back();
    await settle();
    expect(onClose).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/route");
  });

  it("does not step back over a navigation the dialog made", async () => {
    const { hook } = open();
    window.history.pushState(null, "", "/elsewhere");
    hook.unmount();
    await settle();
    expect(window.location.pathname).toBe("/elsewhere");
  });

  it("leaves its entry, and steps nothing back, when its close is a navigation still loading", async () => {
    // The press that closes the dialog is navigating, but the route commits only when its payload
    // lands: the path has not moved when the release runs. Without the mark, that reads as a
    // close "some other way", and the self-pop cancels the navigation.
    const { hook } = open();
    const back = vi.spyOn(window.history, "back");
    leaveDialogsForNavigation();
    hook.unmount();
    await settle();
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();
  });

  it("keeps a URL the dialog wrote while open", async () => {
    const { hook } = open();
    window.history.replaceState(null, "", "/?set=abc");
    hook.unmount();
    await settle();
    expect(window.location.pathname + window.location.search).toBe("/?set=abc");
  });

  it("keeps a URL the dialog wrote while open when Back closes it", async () => {
    // jsdom has no Navigation API, so this is the fallback: the URL the pop lands
    // on is the predecessor's. Only a back() this module issues knows what it
    // left, which is the case above; this one records what the fallback costs.
    const { onClose } = open();
    window.history.replaceState(null, "", "/?set=abc");
    window.history.back();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(window.location.search).toBe("");
  });

  // The card modal's Escape closes the zoom, then the printing region, then the
  // dialog. Back does the same, so a dialog still up after its close is given a
  // fresh entry, or the next Back would leave the route with it open.
  it("steps down one rung per Back, like Escape", async () => {
    const onClose = vi.fn();
    track(renderHook(() => useBackDismiss(true, onClose)));
    const push = vi.spyOn(window.history, "pushState");
    window.history.back();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1), { timeout: 1_000 });
    window.history.back();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
    push.mockRestore();
  });

  it("takes its entry off on a later close after refusing a Back", async () => {
    let refusing = true;
    const hook = track(renderHook(() => useBackDismiss(true, vi.fn(), () => !refusing)));
    window.history.back();
    await settle();
    refusing = false;
    const back = vi.spyOn(window.history, "back");
    hook.unmount();
    await settle();
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
  });

  // The release is scheduled BY the unmount, so it outlives the component on
  // purpose — and at the end of a test file it outlives the document as well, when
  // the environment is torn down with the timer still queued. It must then do
  // nothing rather than throw an unhandled ReferenceError into the run.
  it("does nothing when its release fires after the window has gone", () => {
    vi.useFakeTimers();
    try {
      const hook = renderHook(() => useBackDismiss(true, vi.fn()));
      hook.unmount();
      vi.stubGlobal("window", undefined);
      expect(() => vi.runOnlyPendingTimers()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it("pushes once under StrictMode's remount, and steps back not at all", async () => {
    const push = vi.spyOn(window.history, "pushState");
    const back = vi.spyOn(window.history, "back");
    const hook = track(renderHook(() => useBackDismiss(true, vi.fn()), { wrapper: StrictMode }));
    await settle();
    expect(push).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
    push.mockRestore();
    back.mockRestore();
    hook.unmount();
  });
});
