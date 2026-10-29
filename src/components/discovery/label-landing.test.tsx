import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenModel } from "../../lib/about/pins";
import type { Landable, PageCard } from "../../lib/discovery/page-tools";
import { LabelledScreen } from "../about/pages/labelled-screen";
import { TryIt } from "../about/pages/try-it";
import { LabelLanding } from "./label-landing";

// Show me's landing (About visual PR 5, call 7, Ways-In board): the label lit through the labelled screen's own state;
// New, Show me and the tool card only for a label the reader has not been told about (on a phone under the label,
// from md lit in Try it); `?lit=` read from the LIVE address, so every arrival lands, and stripped through `mirrorUrl`,
// never `history.replaceState`.
const mirror = vi.hoisted(() => ({ mirrorUrl: vi.fn() }));
vi.mock("../../lib/url/mirror", () => mirror);
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));
const scroll = vi.hoisted(() => ({ reveal: vi.fn(() => () => {}) }));
vi.mock("../../lib/ui/reveal", () => scroll);

const LIT = "decks/analysis/cuts";
const model = (src: string): ScreenModel => ({
  shots: [{ shot: { src, w: 780, h: 1688 }, pins: [{ key: LIT, n: 1, box: [0.1, 0.1, 0.3, 0.1] }] }],
  labels: [
    { key: "decks/analysis/analyze", n: 1, lead: "Analyze", text: " reads the bracket.", region: "x", shot: 0 },
    { key: LIT, n: 2, lead: "Proposed cuts", text: " counts where a deck runs long.", region: LIT, shot: 0 },
  ],
});
const card = (id: string, label: string): PageCard => ({
  card: {
    id: id as PageCard["card"]["id"],
    copy: { name: id, line: `${id} line` } as PageCard["card"]["copy"],
    credit: null,
    entry: id,
    state: { kind: "page", href: `/x?tool=${id}`, label: "Open" },
    note: null,
    label,
    showMe: `/about/decks?lit=${encodeURIComponent(label)}#analysis`,
  },
  phone: null,
  desktop: null,
});
const CARDS = [card("suggested-changes", "decks/analysis/suggested"), card("proposed-cuts", LIT), card("mana-balance", "decks/analysis/mana")];

const landable = (isNew: boolean): Landable => ({ "decks/analysis/analyze": { isNew: false, section: "analysis" }, [LIT]: { isNew, section: "analysis" } });
const NEW = landable(true);
const TOLD = landable(false);
const at = (address: string) => window.history.replaceState(null, "", address);
const LANDED = `/about/decks?lit=${encodeURIComponent(LIT)}&x=1#analysis`;

const draw = (land: Landable = NEW, initialLit: string | null = LIT) =>
  render(
    <LabelLanding landable={land} initialLit={initialLit} cards={CARDS}>
      <LabelledScreen phone={model("/p.webp")} desktop={model("/d.webp")} />
      <TryIt sectionId="analysis" cards={CARDS} />
    </LabelLanding>,
  );

const width = (c: HTMLElement, w: string) => c.querySelector(`[data-about-width='${w}']`)!;

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  at(LANDED);
});
afterEach(() => {
  vi.unstubAllGlobals();
  mirror.mirrorUrl.mockReset();
  scroll.reveal.mockClear();
});

describe("LabelLanding", () => {
  it("lights the landed label, marks it New and draws its card under it on a phone, lit in Try it from md", () => {
    const { container } = draw(NEW);
    for (const w of ["phone", "desktop"]) {
      const line = width(container, w).querySelector(`[data-about-label='${LIT}'] button[aria-pressed]`)!;
      expect(line.getAttribute("aria-pressed")).toBe("true");
      expect(width(container, w).querySelector(`[data-about-label='${LIT}'] [data-about-new]`)?.textContent).toBe("New");
      expect(width(container, w).querySelector(`[data-about-label='${LIT}'] [data-about-landing-show-me]`)?.textContent).toBe("Show me ›");
      // A coarse pointer gives Show me its own 44px row, so its touch target cannot cover the label above.
      const row = width(container, w).querySelector(`[data-about-label='${LIT}'] [data-about-landing-show-me]`)!.parentElement!;
      expect(row.className).toMatch(/pointer-coarse:min-h-\[44px\]/);
      expect(row.className).toMatch(/pointer-coarse:mt-0/);
      // No other label is marked.
      expect(width(container, w).querySelectorAll("[data-about-new]")).toHaveLength(1);
    }
    // Phone: the card directly under the label.
    const under = width(container, "phone").querySelector(`[data-about-label='${LIT}'] [data-about-landing-card]`);
    expect(under?.getAttribute("data-about-landing-card")).toBe("proposed-cuts");
    expect(width(container, "desktop").querySelector("[data-about-landing-card]")).toBeNull();
    // Desktop: the card lit in Try it's row, and only that one.
    const lit = container.querySelectorAll("[data-try-it-width='desktop'] [data-tool-card][data-lit]");
    expect([...lit].map((e) => e.getAttribute("data-tool-card"))).toEqual(["proposed-cuts"]);
    // Phone: the landed card has moved under its label, so Try it counts the rest without it.
    const phoneTry = [...container.querySelectorAll("[data-try-it-width='phone'] [data-tool-card]")].map((e) => e.getAttribute("data-tool-card"));
    expect(phoneTry).toEqual(["suggested-changes"]);
    expect(container.querySelector("[data-try-it-more]")?.textContent).toBe("1 more below ▾");
  });

  it("lands the ?'s landing (with from) as the halo alone: lit, never New, no card, and keeps from on the strip", () => {
    at(`/about/decks?from=${encodeURIComponent("/decks/new")}&lit=${encodeURIComponent(LIT)}#analysis`);
    const { container } = draw(NEW);
    expect(width(container, "phone").querySelector(`[data-about-label='${LIT}'] button`)!.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("[data-about-new]")).toBeNull();
    expect(container.querySelector("[data-about-landing-card]")).toBeNull();
    expect(container.querySelector("[data-tool-card][data-lit]")).toBeNull();
    const stripped = new URL(String(mirror.mirrorUrl.mock.calls.at(-1)![0]), "https://x.test");
    expect(stripped.searchParams.get("from")).toBe("/decks/new");
    expect(stripped.searchParams.has("lit")).toBe(false);
  });

  it("lights a label the reader has been told about with no New mark, no Show me and no card", () => {
    const { container } = draw(TOLD);
    expect(width(container, "phone").querySelector(`[data-about-label='${LIT}'] button`)!.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("[data-about-new]")).toBeNull();
    expect(container.querySelector("[data-about-landing-show-me]")).toBeNull();
    expect(container.querySelector("[data-about-landing-card]")).toBeNull();
    expect(container.querySelector("[data-tool-card][data-lit]")).toBeNull();
  });

  it("lands again when the live address carries the same label after the reader turned it off", () => {
    // A second Show me to the page the reader is on renders nothing on the server (Next serves its cached tree), so
    // the only signal is the address itself: same component, same props, a new `lit`.
    const { container } = draw(NEW);
    const line = () => width(container, "desktop").querySelector(`[data-about-label='${LIT}'] button[aria-pressed]`)!;
    expect(line().getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(line());
    expect(line().getAttribute("aria-pressed")).toBe("false");
    // The strip (mocked here), then Show me's push, twice over.
    for (let i = 0; i < 2; i += 1) {
      act(() => window.history.pushState(null, "", "/about/decks#analysis"));
      expect(line().getAttribute("aria-pressed")).toBe("false");
      act(() => window.history.pushState(null, "", `/about/decks?lit=${encodeURIComponent(LIT)}#analysis#analysis`));
      expect(line().getAttribute("aria-pressed")).toBe("true");
      expect(width(container, "desktop").querySelectorAll("[data-about-new]")).toHaveLength(1);
      fireEvent.click(line());
    }
    // Each arrival strips again, writing the hash once.
    expect(mirror.mirrorUrl).toHaveBeenCalledTimes(3);
    const url = mirror.mirrorUrl.mock.calls[2][0] as URL;
    expect(url.searchParams.has("lit")).toBe(false);
    expect(url.hash).toBe("#analysis");
  });

  it("lands a label first named by the live address after the page rendered with none", () => {
    at("/about/decks#analysis");
    const { container } = draw(NEW, null);
    const line = () => width(container, "phone").querySelector(`[data-about-label='${LIT}'] button[aria-pressed]`)!;
    expect(line().getAttribute("aria-pressed")).toBe("false");
    expect(mirror.mirrorUrl).not.toHaveBeenCalled();
    act(() => window.history.pushState(null, "", `/about/decks?lit=${encodeURIComponent(LIT)}#analysis`));
    expect(line().getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("[data-about-landing-card]")?.getAttribute("data-about-landing-card")).toBe("proposed-cuts");
    expect(mirror.mirrorUrl).toHaveBeenCalledTimes(1);
  });

  it("lights nothing without a landing, and a press still lights a label", () => {
    at("/about/decks#analysis");
    const { container } = draw(NEW, null);
    const line = () => width(container, "phone").querySelector(`[data-about-label='${LIT}'] button`)!;
    expect(line().getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(line());
    expect(line().getAttribute("aria-pressed")).toBe("true");
  });

  it("strips `lit` through mirrorUrl, keeping the rest of the address and its hash", () => {
    draw(NEW);
    expect(mirror.mirrorUrl).toHaveBeenCalledTimes(1);
    const url = mirror.mirrorUrl.mock.calls[0][0] as URL;
    // No history state: Next adopts a replace only when the state lacks its own `__NA` mark.
    expect(mirror.mirrorUrl.mock.calls[0]).toHaveLength(1);
    expect(url.pathname).toBe("/about/decks");
    expect(url.searchParams.has("lit")).toBe(false);
    expect(url.searchParams.get("x")).toBe("1");
    expect(url.hash).toBe("#analysis");
  });

  it("brings the landed label's section into view by its key, whatever the hash says, and nothing with no `lit`", () => {
    const section = document.createElement("section");
    section.id = "analysis";
    document.body.appendChild(section);
    at(`/about/decks?lit=${encodeURIComponent(LIT)}#analysis#analysis`);
    draw(TOLD);
    expect(scroll.reveal).toHaveBeenCalledWith(section, "start");
    // The doubled hash Next can write is put back as the section's.
    expect((mirror.mirrorUrl.mock.calls[0][0] as URL).hash).toBe("#analysis");
    scroll.reveal.mockClear();
    at("/about/decks#analysis");
    draw(NEW, null);
    expect(scroll.reveal).not.toHaveBeenCalled();
    section.remove();
  });

  it("cancels the landing's pending scroll when the page goes away (a Back mid-scroll)", () => {
    const section = document.createElement("section");
    section.id = "analysis";
    document.body.appendChild(section);
    const cancel = vi.fn();
    scroll.reveal.mockImplementationOnce(() => cancel);
    at(`/about/decks?lit=${encodeURIComponent(LIT)}#analysis`);
    const { unmount } = draw(TOLD);
    expect(cancel).not.toHaveBeenCalled();
    unmount();
    expect(cancel).toHaveBeenCalledTimes(1);
    section.remove();
  });

  it("lands with a malformed fragment instead of throwing", () => {
    at(`/about/decks?lit=${encodeURIComponent(LIT)}#%E0`);
    const { container } = draw(TOLD);
    expect(width(container, "phone").querySelector(`[data-about-label='${LIT}'] button`)!.getAttribute("aria-pressed")).toBe("true");
    expect(mirror.mirrorUrl).toHaveBeenCalledTimes(1);
  });

  it("strips a `lit` the page cannot land on and lights nothing; a malformed fragment then scrolls nowhere", () => {
    at(`/about/decks?lit=${encodeURIComponent("friends/friends/add")}#%E0`);
    const { container } = draw(NEW, null);
    expect(mirror.mirrorUrl).toHaveBeenCalledTimes(1);
    expect((mirror.mirrorUrl.mock.calls[0][0] as URL).searchParams.has("lit")).toBe(false);
    expect(container.querySelector("button[aria-pressed='true']")).toBeNull();
    expect(container.querySelector("[data-about-new]")).toBeNull();
    expect(scroll.reveal).not.toHaveBeenCalled();
  });

  it("writes nothing when the address has no `lit`", () => {
    at("/about/decks#analysis");
    draw(NEW, null);
    expect(mirror.mirrorUrl).not.toHaveBeenCalled();
  });
});

describe("TryIt", () => {
  it("shows a phone reader the first card and N more below, which opens the rest", () => {
    at("/about/decks");
    const { container, getByText } = draw(NEW, null);
    const phone = () => [...container.querySelectorAll("[data-try-it-width='phone'] [data-tool-card]")].map((e) => e.getAttribute("data-tool-card"));
    expect(phone()).toEqual(["suggested-changes"]);
    const more = container.querySelector<HTMLButtonElement>("[data-try-it-more]")!;
    expect(more.getAttribute("aria-expanded")).toBe("false");
    expect(more.getAttribute("aria-controls")).toBe(container.querySelector("[data-try-it-width='phone']")!.id);
    fireEvent.click(getByText("2 more below"));
    expect(phone()).toEqual(["suggested-changes", "proposed-cuts", "mana-balance"]);
    expect(container.querySelector("[data-try-it-more]")).toBeNull();
    // Focus moves to the first card it added (Small items 2, item 2).
    const second = container.querySelectorAll("[data-try-it-width='phone'] li")[1];
    expect(document.activeElement).toBe(second.querySelector("a[aria-label]"));
    expect(document.activeElement?.textContent).not.toBe("Show me ›");
  });

  it("folds back with Show fewer, focus on the restored press", () => {
    at("/about/decks");
    const { container, getByText } = draw(NEW, null);
    fireEvent.click(getByText("2 more below"));
    const fewer = container.querySelector<HTMLButtonElement>("[data-try-it-fewer]")!;
    expect(fewer.textContent).toBe("Show fewer ▴");
    expect(fewer.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(fewer);
    expect(container.querySelectorAll("[data-try-it-width='phone'] [data-tool-card]")).toHaveLength(1);
    expect(document.activeElement).toBe(container.querySelector("[data-try-it-more]"));
  });

  it("draws every card in the desktop row, each footer's link Show me at its label", () => {
    at("/about/decks");
    const { container } = draw(NEW, null);
    const desk = container.querySelectorAll("[data-try-it-width='desktop'] [data-tool-card]");
    expect(desk).toHaveLength(3);
    const links = [...container.querySelectorAll("[data-try-it-width='desktop'] a")].filter((a) => a.textContent === "Show me ›");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(CARDS.map((c) => c.card.showMe));
  });

  it("draws nothing, heading included, for a section with no cards", () => {
    const { container } = render(<TryIt sectionId="notes" cards={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
