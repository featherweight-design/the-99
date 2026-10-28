import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenModel } from "../../lib/about/pins";
import type { Landing, PageCard } from "../../lib/discovery/page-tools";
import { LabelledScreen } from "../about/pages/labelled-screen";
import { TryIt } from "../about/pages/try-it";
import { LabelLanding } from "./label-landing";

// Show me's landing (About visual PR 5, call 7, Ways-In board): the label lit through the labelled screen's own state;
// New, Show me and the tool card only for a label the reader has not been told about (on a phone under the label,
// from md lit in Try it); `?lit=` stripped through `mirrorUrl`, never `history.replaceState`.
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

const draw = (landing: Landing | null, request: string | null = "r1") =>
  render(
    <LabelLanding landing={landing} request={request}>
      <LabelledScreen phone={model("/p.webp")} desktop={model("/d.webp")} />
      <TryIt sectionId="analysis" cards={CARDS} />
    </LabelLanding>,
  );

const width = (c: HTMLElement, w: string) => c.querySelector(`[data-about-width='${w}']`)!;

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  window.history.replaceState(null, "", `/about/decks?lit=${encodeURIComponent(LIT)}&x=1#analysis`);
});
afterEach(() => {
  vi.unstubAllGlobals();
  mirror.mirrorUrl.mockReset();
});

describe("LabelLanding", () => {
  it("lights the landed label, marks it New and draws its card under it on a phone, lit in Try it from md", () => {
    const { container } = draw({ key: LIT, isNew: true, card: CARDS[1] });
    for (const w of ["phone", "desktop"]) {
      const line = width(container, w).querySelector(`[data-about-label='${LIT}'] button[aria-pressed]`)!;
      expect(line.getAttribute("aria-pressed")).toBe("true");
      expect(width(container, w).querySelector(`[data-about-label='${LIT}'] [data-about-new]`)?.textContent).toBe("New");
      expect(width(container, w).querySelector(`[data-about-label='${LIT}'] [data-about-landing-show-me]`)?.textContent).toBe("Show me ›");
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
    expect(container.querySelector("[data-try-it-more]")?.textContent).toBe("1 more below");
  });

  it("lights a label the reader has been told about with no New mark, no Show me and no card", () => {
    const { container } = draw({ key: LIT, isNew: false, card: CARDS[1] });
    expect(width(container, "phone").querySelector(`[data-about-label='${LIT}'] button`)!.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("[data-about-new]")).toBeNull();
    expect(container.querySelector("[data-about-landing-show-me]")).toBeNull();
    expect(container.querySelector("[data-about-landing-card]")).toBeNull();
    expect(container.querySelector("[data-tool-card][data-lit]")).toBeNull();
  });

  it("lands again on a second Show me to the same label after the reader turned it off", () => {
    const landing: Landing = { key: LIT, isNew: false, card: CARDS[1] };
    const tree = (request: string) => (
      <LabelLanding landing={landing} request={request}>
        <LabelledScreen phone={model("/p.webp")} desktop={model("/d.webp")} />
      </LabelLanding>
    );
    const { container, rerender } = render(tree("r1"));
    const line = () => width(container, "phone").querySelector(`[data-about-label='${LIT}'] button[aria-pressed]`)!;
    fireEvent.click(line());
    expect(line().getAttribute("aria-pressed")).toBe("false");
    // Next keeps this state across a search-param change; only the request token is new.
    rerender(tree("r2"));
    expect(line().getAttribute("aria-pressed")).toBe("true");
  });

  it("lights nothing without a landing, and a press still lights a label", () => {
    const { container } = draw(null, null);
    const line = () => width(container, "phone").querySelector(`[data-about-label='${LIT}'] button`)!;
    expect(line().getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(line());
    expect(line().getAttribute("aria-pressed")).toBe("true");
  });

  it("strips `lit` through mirrorUrl, keeping the rest of the address and its hash", () => {
    draw({ key: LIT, isNew: true, card: CARDS[1] });
    expect(mirror.mirrorUrl).toHaveBeenCalledTimes(1);
    const url = mirror.mirrorUrl.mock.calls[0][0] as URL;
    expect(url.pathname).toBe("/about/decks");
    expect(url.searchParams.has("lit")).toBe(false);
    expect(url.searchParams.get("x")).toBe("1");
    expect(url.hash).toBe("#analysis");
  });

  it("brings the address's section into view after the strip, and does nothing with no landing request", () => {
    const section = document.createElement("section");
    section.id = "analysis";
    document.body.appendChild(section);
    draw({ key: LIT, isNew: false, card: CARDS[1] });
    expect(scroll.reveal).toHaveBeenCalledWith(section, "start");
    scroll.reveal.mockClear();
    draw(null, null);
    expect(scroll.reveal).not.toHaveBeenCalled();
    section.remove();
  });

  it("strips a `lit` the page could not land on, and writes nothing when the address has none", () => {
    draw(null, "r1");
    expect(mirror.mirrorUrl).toHaveBeenCalledTimes(1);
    mirror.mirrorUrl.mockReset();
    window.history.replaceState(null, "", "/about/decks#analysis");
    draw(null, "r2");
    expect(mirror.mirrorUrl).not.toHaveBeenCalled();
  });
});

describe("TryIt", () => {
  it("shows a phone reader the first card and N more below, which opens the rest", () => {
    const { container, getByText } = draw(null, null);
    const phone = () => [...container.querySelectorAll("[data-try-it-width='phone'] [data-tool-card]")].map((e) => e.getAttribute("data-tool-card"));
    expect(phone()).toEqual(["suggested-changes"]);
    fireEvent.click(getByText("2 more below"));
    expect(phone()).toEqual(["suggested-changes", "proposed-cuts", "mana-balance"]);
    expect(container.querySelector("[data-try-it-more]")).toBeNull();
  });

  it("draws every card in the desktop row, each footer's link Show me at its label", () => {
    const { container } = draw(null, null);
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
