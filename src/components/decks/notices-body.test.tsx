// The Notices sheet's body and the header's tag (deck notices HANDOFF §1, §2, §4). Layout is the
// probe's; what is asserted here is which rows, groups, words and controls each state draws.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

import type { BrowseCard } from "../../lib/collection/browse";
import type { DeckNotices } from "../../lib/notices/read";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../app/decks/actions", () => ({ setCardProxied: vi.fn(async () => ({ ok: true })) }));

const { CardDetailProvider } = await import("../cards/card-detail-provider");
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
const { NoticesBody } = await import("./notices-body");
const { HeaderNoticeTag, headerNotice } = await import("./notice-tag");

const card = (oracleId: string) =>
  ({
    oracleId, name: oracleId, typeLine: "Instant", manaCost: "{U}", cmc: 1, oracleText: null,
    keywords: [], rarity: "rare", colorIdentity: [], imageUri: null, printings: [], owned: [],
    proxiedBy: [],
  }) as unknown as BrowseCard;

const at = new Date("2026-09-21T12:00:00Z");
const notices = (over: Partial<DeckNotices> = {}): DeckNotices => ({
  analyzedAt: new Date("2026-09-20T12:00:00Z"),
  readingStale: false,
  groups: [
    { group: "notLegal", items: [{ kind: "violation", group: "notLegal", card: { oracleId: "ban", name: "Banned Card", imageUri: null }, colors: [] }] },
    { group: "outsideColors", items: [{ kind: "violation", group: "outsideColors", card: { oracleId: "red", name: "Red Card", imageUri: "https://img.test/red.jpg" }, colors: ["R"] }] },
    { group: "gameChangers", items: [{ kind: "data", seq: 3, group: "gameChangers", direction: "added", cards: [{ oracleId: "gc", name: "Big Card", imageUri: null }], detail: {}, publishedAt: at }] },
    { group: "twoCardCombos", items: [{ kind: "data", seq: 4, group: "twoCardCombos", direction: "removed", cards: [{ oracleId: "a", name: "Piece A", imageUri: null }, { oracleId: "b", name: "Piece B", imageUri: null }], detail: { produces: ["Infinite mana"] }, publishedAt: at }] },
    { group: "rules", items: [{ kind: "data", seq: 5, group: "rules", direction: "moved", cards: [], detail: { rule: "A rule", reads: "What it reads now" }, publishedAt: at }] },
  ],
  dataCount: 3,
  dataUnread: 3,
  violationCount: 2,
  violationsUnread: true,
  readMarks: { seq: 5, violations: ["ban", "red"] },
  ...over,
});

const draw = (foot: Parameters<typeof NoticesBody>[0]["foot"], n = notices()) =>
  render(
    <CardDetailProvider fetchCard={async (id) => card(id)}>
      <NoticesBody notices={n} deckName="My Deck" commanders={{ names: ["Ishai", "Bruse Tarl"], identity: ["W", "U"] }} foot={foot} onClose={() => {}} />
    </CardDetailProvider>,
  );

describe("the Notices body", () => {
  it("draws the groups in order under their labels, with the date on data rows only", () => {
    const { container } = draw({ kind: "none" });
    expect([...container.querySelectorAll("[data-notice-group]")].map((g) => g.getAttribute("data-notice-group")))
      .toEqual(["notLegal", "outsideColors", "gameChangers", "twoCardCombos", "rules"]);
    expect(screen.getByText("Not legal in Commander")).toBeTruthy();
    expect(screen.getByText("Not legal in Commander.")).toBeTruthy();
    expect(screen.getByText("Bracket rules")).toBeTruthy();
    expect(screen.getAllByText("21 Sep")).toHaveLength(3);
  });

  it("names both commanders on an outside-colors line, and a combo's result", () => {
    draw({ kind: "none" });
    expect(screen.getByText(/Red, outside Ishai and Bruse Tarl’s colors \(White, Blue\)\./)).toBeTruthy();
    expect(screen.getByText("Spellbook: Infinite mana.")).toBeTruthy();
    expect(screen.getByText("What it reads now")).toBeTruthy();
  });

  it("uses words for the direction, never + or −", () => {
    const { container } = draw({ kind: "none" });
    const dirs = [...container.querySelectorAll("[data-notice-group] li")].map((li) => li.textContent ?? "");
    expect(dirs.some((t) => t.startsWith("added"))).toBe(true);
    expect(dirs.some((t) => t.startsWith("removed"))).toBe(true);
    expect(dirs.join("")).not.toMatch(/[+−](?! Piece)/);
  });

  it("carries the legality foot line when a legality group stands", () => {
    draw({ kind: "none" });
    expect(screen.getByText("These stay until the cards leave the deck. Reading them does not clear them.")).toBeTruthy();
  });

  it("offers Re-analyze when not dirty, and presses it", () => {
    const onPress = vi.fn();
    const { container } = draw({ kind: "reanalyze", busy: false, failed: null, onPress });
    const foot = container.querySelector<HTMLElement>("[data-notices-foot='reanalyze']")!;
    fireEvent.click(within(foot).getByRole("button", { name: "Re-analyze" }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("draws the legality foot line under the LAST legality group, not after the data", () => {
    const { container } = draw({ kind: "none" });
    const line = container.querySelector("[data-notice-legal-foot]");
    expect(line?.closest("[data-notice-group]")?.getAttribute("data-notice-group")).toBe("outsideColors");
  });

  it("turns the foot's sentence into the failure line, beside Try again", () => {
    const { container } = draw({ kind: "reanalyze", busy: false, failed: "That didn’t work.", onPress: () => {} });
    const foot = container.querySelector<HTMLElement>("[data-notices-foot='reanalyze']")!;
    expect(within(foot).getByRole("status").textContent).toBe("That didn’t work.");
    expect(foot.textContent).not.toContain("Your bracket holds");
    expect(within(foot).getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("carries the overview check's note on the foot while a legality entry stands, without See which", () => {
    const note = "Reads the bracket only. The overview waits until every card is legal in this deck.";
    const { container } = draw({ kind: "reanalyze", busy: false, failed: null, note, onPress: () => {} });
    const foot = container.querySelector<HTMLElement>("[data-notices-foot='reanalyze']")!;
    const press = within(foot).getByRole("button", { name: "Re-analyze" });
    expect(document.getElementById(press.getAttribute("aria-describedby")!)?.textContent).toBe(note);
    expect(within(foot).queryByRole("button", { name: /See which/ })).toBeNull();
  });

  it("offers the Analysis tab and no second Re-analyze when dirty", () => {
    const { container } = draw({ kind: "toTab", onPress: () => {} });
    const foot = container.querySelector<HTMLElement>("[data-notices-foot='toTab']")!;
    expect(within(foot).queryByRole("button", { name: "Re-analyze" })).toBeNull();
    expect(within(foot).getByRole("button", { name: /Analysis tab/ })).toBeTruthy();
  });

  it("names the deck in the aside when it has never been analyzed", () => {
    draw({ kind: "none" }, notices({ analyzedAt: null }));
    expect(screen.getByText("My Deck")).toBeTruthy();
  });
});

describe("the header's tag", () => {
  it("reads legality first, then data unread or read", () => {
    expect(headerNotice({ dataCount: 3, dataUnread: 0, violationCount: 1, violationsUnread: false })).toEqual({ kind: "notLegalRead", count: 1 });
    expect(headerNotice({ dataCount: 3, dataUnread: 1, violationCount: 0, violationsUnread: false })).toEqual({ kind: "unread", count: 3 });
    expect(headerNotice({ dataCount: 3, dataUnread: 0, violationCount: 0, violationsUnread: false })).toEqual({ kind: "read", count: 3 });
    expect(headerNotice({ dataCount: 0, dataUnread: 0, violationCount: 0, violationsUnread: false })).toBeNull();
  });

  it("is a button named for its press, quiet and dotless once read", () => {
    const onOpen = vi.fn();
    const { container, unmount } = render(<HeaderNoticeTag notice={{ kind: "unread", count: 3 }} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "3 notices since this deck was analyzed. Open notices" }));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(container.querySelector("[data-notice-dot]")).not.toBeNull();
    unmount();
    const read = render(<HeaderNoticeTag notice={{ kind: "read", count: 3 }} onOpen={() => {}} />);
    const quiet = read.getByRole("button", { name: "3 notices, read. Open notices" });
    expect(quiet.querySelector("[data-notice-dot]")).toBeNull();
    expect(quiet.className).toContain("text-[color:var(--fg-locked)]");
  });
});

describe("the Notices body's hover preview", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({ matches: query === "(hover: hover)", media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }),
    });
  });
  afterEach(() => { vi.useRealTimers(); });

  it("previews the art a notice's card carries, above the sheet", () => {
    draw({ kind: "none" });
    fireEvent.mouseEnter(screen.getByRole("button", { name: /Red Card/ }), { clientX: 10, clientY: 10 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId("hover-preview").getAttribute("style")).toContain("https://img.test/red.jpg");
  });
});
