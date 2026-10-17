// The commander picker and the Add a friend dialog (Social R1 PR C), with the frames the boards never drew (E15):
// the picker with no decks of your own and with no results, and its search in flight (E16).
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const a = vi.hoisted(() => ({ listDeckCommandersAction: vi.fn(), searchFaceCommandersAction: vi.fn() }));
vi.mock("../../app/friends/actions", () => a);

import { CommanderPicker } from "./commander-picker";
import { SocialModal } from "./social-modal";
import { AddFriendDialog } from "./add-friend-dialog";
import { socialCopy } from "../../lib/copy/social";

const c = socialCopy.commander;
const d = socialCopy.dialog;
const tile = (name: string, colorIdentity: string[] = ["W", "U"]) => ({ oracleId: `o-${name}`, name, artCropUri: `https://x/${name}.jpg`, colorIdentity });
const AANG = tile("Avatar Aang");
const BARAL = tile("Baral, Chief of Compliance", ["U"]);

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function type(value: string) {
  fireEvent.change(screen.getByRole("combobox", { name: c.search }), { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

describe("CommanderPicker", () => {
  it("opens on the search, with your decks' commanders first, and one press picks", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [AANG, BARAL] });
    const onPick = vi.fn();
    render(<CommanderPicker current={null} onPick={onPick} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: c.title })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: c.search })).toHaveFocus();
    expect(await screen.findByRole("heading", { name: c.fromDecks })).toBeTruthy();
    expect(screen.getByText(c.savedNote)).toBeTruthy();
    expect(screen.queryByRole("button", { name: c.clear })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: BARAL.name }));
    expect(onPick).toHaveBeenCalledWith(BARAL);
  });

  it("hides the deck row with no decks of your own, and is the search alone", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
    render(<CommanderPicker current={null} onPick={() => {}} onClose={() => {}} />);
    await act(async () => {});
    expect(screen.queryByRole("heading", { name: c.fromDecks })).toBeNull();
    expect(screen.getByText(c.anyNote)).toBeTruthy();
  });

  it("searches the catalog by name, keeps results standing while the next is in flight, and picks with the keys", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [AANG] });
    a.searchFaceCommandersAction.mockResolvedValueOnce({ ok: true, tiles: [AANG, BARAL] });
    const onPick = vi.fn();
    render(<CommanderPicker current={AANG.oracleId} onPick={onPick} onClose={() => {}} />);
    await type("a");
    expect(a.searchFaceCommandersAction).not.toHaveBeenCalled();
    await type("av");
    expect(a.searchFaceCommandersAction).toHaveBeenCalledWith("av");
    const list = screen.getByRole("listbox");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([`${AANG.name}, White, Blue`, `${BARAL.name}, Blue`]);
    expect(screen.queryByRole("heading", { name: c.fromDecks })).toBeNull();

    let answer!: (v: unknown) => void;
    a.searchFaceCommandersAction.mockReturnValueOnce(new Promise((r) => (answer = r)));
    await type("ava");
    expect(list.getAttribute("aria-busy")).toBe("true");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    await act(async () => answer({ ok: true, tiles: [AANG, BARAL] }));

    const box = screen.getByRole("combobox", { name: c.search });
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith(BARAL);
  });

  it("leaves Enter and the arrows to an IME while it composes: no highlight moves and nothing is picked", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
    a.searchFaceCommandersAction.mockResolvedValue({ ok: true, tiles: [AANG, BARAL] });
    const onPick = vi.fn();
    render(<CommanderPicker current={null} onPick={onPick} onClose={() => {}} />);
    await type("av");
    const box = screen.getByRole("combobox", { name: c.search });
    fireEvent.keyDown(box, { key: "ArrowDown", isComposing: true });
    fireEvent.keyDown(box, { key: "Enter", isComposing: true });
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith(AANG);
  });

  it("says so when nothing matches", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [AANG] });
    a.searchFaceCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
    render(<CommanderPicker current={null} onPick={() => {}} onClose={() => {}} />);
    await type("zzq");
    expect(screen.getByRole("status").textContent).toBe(c.noResults("zzq"));
    // No listbox is drawn, so the combobox claims no popup and names none.
    const box = screen.getByRole("combobox", { name: c.search });
    expect(box.getAttribute("aria-expanded")).toBe("false");
    expect(box.getAttribute("aria-controls")).toBeNull();
  });

  it("says each result's colors in words beside the pips, and colorless for none", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
    const KOZ = { ...AANG, oracleId: "o-koz", name: "Kozilek", colorIdentity: [] };
    a.searchFaceCommandersAction.mockResolvedValue({ ok: true, tiles: [AANG, KOZ] });
    render(<CommanderPicker current={null} onPick={() => {}} onClose={() => {}} />);
    await type("ko");
    const options = screen.getAllByRole("option");
    expect(options[0].textContent).toContain("White, Blue");
    expect(options[1].textContent).toContain(c.colorless);
    expect(screen.getByRole("combobox", { name: c.search }).getAttribute("aria-expanded")).toBe("true");
  });

  it("offers Use initials instead once a commander is set, which picks none", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [AANG] });
    const onPick = vi.fn();
    render(<CommanderPicker current={AANG.oracleId} onPick={onPick} onClose={() => {}} />);
    expect((await screen.findByRole("button", { name: AANG.name })).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: c.clear }));
    expect(onPick).toHaveBeenCalledWith(null);
  });

  it("names a deck tile up to the first comma, keeping the whole name for assistive tech", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [BARAL] });
    render(<CommanderPicker current={null} onPick={() => {}} onClose={() => {}} />);
    const press = await screen.findByRole("button", { name: BARAL.name });
    expect(press.textContent).toBe("Baral");
  });

  it("draws each result's colour identity on its row", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
    a.searchFaceCommandersAction.mockResolvedValue({ ok: true, tiles: [AANG, BARAL] });
    render(<CommanderPicker current={null} onPick={() => {}} onClose={() => {}} />);
    await type("ba");
    const rows = screen.getAllByRole("option");
    expect(rows.map((r) => r.querySelector("[data-identity]")!.getAttribute("data-identity"))).toEqual(["WU", "U"]);
    expect(rows.map((r) => r.querySelectorAll("[data-identity] > span > span").length)).toEqual([2, 1]);
  });

  it("picks nothing with Enter, and highlights no row, while the results are an earlier query's", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
    a.searchFaceCommandersAction.mockResolvedValueOnce({ ok: true, tiles: [AANG, BARAL] });
    const onPick = vi.fn();
    render(<CommanderPicker current={null} onPick={onPick} onClose={() => {}} />);
    await type("av");
    const box = screen.getByRole("combobox", { name: c.search });
    expect(box.getAttribute("aria-activedescendant")).toBeTruthy();

    let answer!: (v: unknown) => void;
    a.searchFaceCommandersAction.mockReturnValueOnce(new Promise((r) => (answer = r)));
    // In the debounce: the field says "bar", the list still answers "av".
    fireEvent.change(box, { target: { value: "bar" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onPick).not.toHaveBeenCalled();
    // In flight: still "av"'s rows.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onPick).not.toHaveBeenCalled();
    expect(box.getAttribute("aria-activedescendant")).toBeNull();
    expect(screen.getAllByRole("option").some((o) => o.getAttribute("aria-selected") === "true")).toBe(false);

    await act(async () => answer({ ok: true, tiles: [BARAL] }));
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith(BARAL);
  });

  it("brings the row the arrow keys reach into view, scrolling the modal's body and never the page", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
    a.searchFaceCommandersAction.mockResolvedValueOnce({ ok: true, tiles: [AANG, BARAL] });
    render(<CommanderPicker current={null} onPick={() => {}} onClose={() => {}} />);
    await type("av");
    const body = document.querySelector<HTMLElement>("[data-social-modal-body]")!;
    expect(body).toBeTruthy();
    const rect = (top: number, height: number) => ({ top, bottom: top + height, height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON() {} }) as DOMRect;
    // The body shows 100..300; the second row sits below its fold, at 320..372.
    body.getBoundingClientRect = () => rect(100, 200);
    const [first, second] = screen.getAllByRole("option");
    first.getBoundingClientRect = () => rect(260, 52);
    second.getBoundingClientRect = () => rect(320, 52);
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    body.scrollTop = 0;
    const box = screen.getByRole("combobox", { name: c.search });
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(body.scrollTop).toBe(72);
    // Back up to a row above the fold: scrolled up exactly as far as it needs.
    first.getBoundingClientRect = () => rect(60, 52);
    fireEvent.keyDown(box, { key: "ArrowUp" });
    expect(body.scrollTop).toBe(32);
    expect(scrollIntoView).not.toHaveBeenCalled();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it("says a search that failed in the list's place, and announces it", async () => {
    a.listDeckCommandersAction.mockResolvedValue({ ok: true, tiles: [] });
    a.searchFaceCommandersAction.mockRejectedValue(new Error("down"));
    render(<CommanderPicker current={null} onPick={() => {}} onClose={() => {}} />);
    await type("krenko");
    expect(screen.getByRole("alert").textContent).toBe(c.searchFailed);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
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
    expect(frame.style.getPropertyValue("--social-vv-top")).toBe("0px");
    expect(frame.style.getPropertyValue("--social-vv-h")).toBe("800px");
    // The keyboard opens: the visual viewport shrinks and pans, the layout viewport does not.
    act(() => {
      Object.assign(vv, { height: 420, offsetTop: 60 });
      vv.dispatchEvent(new Event("resize"));
    });
    expect(frame.style.getPropertyValue("--social-vv-top")).toBe("60px");
    expect(frame.style.getPropertyValue("--social-vv-h")).toBe("420px");
    act(() => {
      Object.assign(vv, { offsetTop: 120 });
      vv.dispatchEvent(new Event("scroll"));
    });
    expect(frame.style.getPropertyValue("--social-vv-top")).toBe("120px");
    // The sheet and the frame read those values at phone width alone; the desktop dialog reads neither.
    expect(frame.className).toContain("max-md:h-[var(--social-vv-h,100%)]");
    expect(screen.getByRole("dialog").className).toContain("max-md:h-[calc(var(--social-vv-h,100vh)*0.86)]");
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
