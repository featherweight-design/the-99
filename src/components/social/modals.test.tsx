// The Add a friend dialog (Social R1 PR C) and the SocialModal shell they share.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SocialModal } from "./social-modal";
import { AddFriendDialog } from "./add-friend-dialog";
import { socialCopy } from "../../lib/copy/social";

const d = socialCopy.dialog;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SocialModal on a phone with a keyboard up", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("holds its frame to the visual viewport, follows it as the keyboard moves it, and lets go on close", () => {
    const vv = Object.assign(new EventTarget(), { offsetTop: 0, height: 800, offsetLeft: 0, width: 390 });
    const remove = vi.spyOn(vv, "removeEventListener");
    vi.stubGlobal("visualViewport", vv);
    const { unmount } = render(
      <SocialModal title="T" closeLabel="Close" onClose={() => {}} tall>
        <p>body</p>
      </SocialModal>,
    );
    const frame = document.querySelector<HTMLElement>("[data-social-modal-frame]")!;
    expect(frame.style.getPropertyValue("--vv-top")).toBe("0px");
    expect(frame.style.getPropertyValue("--vv-h")).toBe("800px");
    // The keyboard opens: the visual viewport shrinks and pans, the layout viewport does not.
    act(() => {
      Object.assign(vv, { height: 420, offsetTop: 60 });
      vv.dispatchEvent(new Event("resize"));
    });
    expect(frame.style.getPropertyValue("--vv-top")).toBe("60px");
    expect(frame.style.getPropertyValue("--vv-h")).toBe("420px");
    act(() => {
      Object.assign(vv, { offsetTop: 120 });
      vv.dispatchEvent(new Event("scroll"));
    });
    expect(frame.style.getPropertyValue("--vv-top")).toBe("120px");
    // The sheet and the frame read those values at phone width alone; the desktop dialog reads neither.
    expect(frame.className).toContain("max-md:h-[var(--vv-h,100%)]");
    expect(frame.className).toContain("max-md:top-[var(--vv-top,0px)]");
    expect(screen.getByRole("dialog").className).toContain("max-md:h-[calc(var(--vv-h,100dvh)*0.86)]");
    expect(screen.getByRole("dialog").className).not.toMatch(/(^|\s)h-\[86vh\]/);
    unmount();
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});

describe("AddFriendDialog", () => {
  const NOW = new Date("2026-10-15T21:41:00Z");
  const URL_ = "https://the-99.dev/friend/AbCdEfGhIjKlMnOpQrStUv";

  it("leads with the QR code, then the link, Copy link and the two rules; focus opens on ✕", () => {
    render(<AddFriendDialog url={URL_} expiresAt={new Date("2026-10-22T21:41:00Z")} now={NOW} timeZone="UTC" onClose={() => {}} />);
    expect(screen.getByText(d.sub)).toBeTruthy();
    const qr = screen.getByRole("img", { name: d.qrAria });
    // The dark module follows the theme's --bg rather than one theme's hex (Invites PR 4 gap 9).
    expect(qr.querySelector("path")?.getAttribute("class")).toContain("fill-[color:var(--bg)]");
    expect(qr.querySelector("path")!.getAttribute("d")!.length).toBeGreaterThan(100);
    expect((screen.getByRole("textbox", { name: d.linkAria }) as HTMLInputElement).value).toBe(URL_);
    expect(screen.getByText(d.meta("Thu, Oct 22"))).toBeTruthy();
    expect(screen.getByRole("button", { name: d.close })).toHaveFocus();
    expect(screen.queryByRole("button", { name: d.share })).toBeNull();
  });

  it("says Copied for two seconds, out loud", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<AddFriendDialog url={URL_} expiresAt={new Date("2026-10-22T21:41:00Z")} now={NOW} timeZone="UTC" onClose={() => {}} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: d.copy })));
    expect(writeText).toHaveBeenCalledWith(URL_);
    expect(screen.getByRole("button", { name: d.copied })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(d.copied);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(screen.getByRole("button", { name: d.copy })).toBeTruthy();
  });

  it("offers Share link where the phone has a share sheet, with the link and the line", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<AddFriendDialog url={URL_} expiresAt={new Date("2026-10-16T21:12:00Z")} now={NOW} timeZone="UTC" onClose={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: d.share }));
    expect(share).toHaveBeenCalledWith({ url: URL_, text: d.shareText });
    // The press carries the 18px share icon (Invites PR 4 gap 8).
    expect(screen.getByRole("button", { name: d.share }).querySelector("svg")?.getAttribute("width")).toBe("18");
    expect(screen.getByText(d.soon, { exact: false }).className).toContain("--warning");
    // Share is drawn at phone only, so Copy link is still the filled press at desktop.
    expect(screen.getByRole("button", { name: d.copy }).className).toContain("md:bg-[color:var(--accent)]");
    delete (navigator as { share?: unknown }).share;
  });

  it("shows and selects the link field at phone when the clipboard refuses, even where Share hides it", async () => {
    Object.defineProperty(navigator, "share", { value: vi.fn(), configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
    render(<AddFriendDialog url={URL_} expiresAt={new Date("2026-10-22T21:41:00Z")} now={NOW} timeZone="UTC" onClose={() => {}} />);
    await screen.findByRole("button", { name: d.share });
    const input = screen.getByRole("textbox", { name: d.linkAria });
    expect(input.className).toContain("max-md:hidden");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: d.copy })));
    expect(input.className).not.toContain("max-md:hidden");
    expect(input).toHaveFocus();
    delete (navigator as { share?: unknown }).share;
  });
});

describe("SocialModal shell against the invites handoff (Dialog / sheet shell)", () => {
  it("draws the header gap 4, centred, the handle's 4px margin below and the phone body's 24px", () => {
    render(
      <SocialModal title="T" closeLabel="Close" onClose={() => {}} onBack={() => {}} backLabel="Back">
        <p>body</p>
      </SocialModal>,
    );
    const head = screen.getByRole("heading", { name: "T" }).parentElement!;
    expect(head.className).toContain("items-center");
    expect(head.className).toContain("gap-[4px]");
    expect(head.className).not.toMatch(/(^|\s)pt-\[/);
    expect(screen.getByRole("heading", { name: "T" }).className).not.toMatch(/pt-\[/);
    expect(screen.getByRole("dialog").querySelector("span.rounded-full")!.className).toContain("mb-[4px]");
    expect(document.querySelector("[data-social-modal-body]")!.className).toContain("pb-[24px]");
  });
});

// Hugh's modal rule: the box fits the viewport. At the desktop the box hangs under the frame's top pad, so the pad
// plus the box's cap must stay within 100dvh, or the footer sits under the fold of a frame that cannot scroll
// (92vh under 10vh was 102vh: Rule 0 setup's footer lost its bottom 18px at 900px tall).
describe("SocialModal at the desktop fits the viewport", () => {
  /** A length class's value in px at viewport height `h`: `10dvh`, `80vh`, `calc(90dvh-24px)`. */
  const px = (value: string, h: number) =>
    [...value.replace(/^calc\((.*)\)$/, "$1").matchAll(/([+-]?)\s*(\d+(?:\.\d+)?)(dvh|vh|px)/g)].reduce(
      (sum, [, sign, n, unit]) => sum + (sign === "-" ? -1 : 1) * (unit === "px" ? Number(n) : (Number(n) * h) / 100),
      0,
    );
  const md = (className: string, prop: string) => {
    const m = className.match(new RegExp(`(?:^|\\s)md:${prop}-\\[([^\\]]+)\\]`));
    expect(m, `md:${prop} on ${className}`).not.toBeNull();
    return m![1];
  };

  it.each([false, true])("keeps the frame's top pad plus the box's cap at or under 100dvh (tall %s)", (tall) => {
    render(
      <SocialModal title="T" closeLabel="Close" onClose={() => {}} tall={tall} footer={<button type="button">Go</button>}>
        <p>body</p>
      </SocialModal>,
    );
    const pad = md(document.querySelector("[data-social-modal-frame]")!.className, "pt");
    const cap = md(screen.getByRole("dialog").className, "max-h");
    for (const h of [600, 768, 900, 1200]) expect(px(pad, h) + px(cap, h)).toBeLessThanOrEqual(h);
    // The footer is the box's own child, outside the scrolling body.
    const footer = document.querySelector("[data-social-modal-footer]")!;
    expect(footer.parentElement).toBe(screen.getByRole("dialog"));
    expect(document.querySelector("[data-social-modal-body]")!.contains(footer)).toBe(false);
  });
});
