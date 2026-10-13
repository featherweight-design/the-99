import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Candidate, CandidateHalf, ChangeCandidates } from "../../lib/commander-change/candidates";
import type { BrowseCard } from "../../lib/collection/browse";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const readChangeCandidates = vi.fn();
const changeCommander = vi.fn();
vi.mock("../../lib/commander-change/actions", () => ({
  readChangeCandidates: (...a: unknown[]) => readChangeCandidates(...a),
  changeCommander: (...a: unknown[]) => changeCommander(...a),
}));

const { ChangeCommanderSheet, shortName } = await import("./change-commander-sheet");
const { CardDetailProvider } = await import("../cards/card-detail-provider");

const half = (name: string, over: Partial<CandidateHalf> = {}): CandidateHalf => ({
  oracleId: name.toLowerCase(), name, manaCost: "{2}{G}", cmc: 3, artCropUri: null, imageUri: null,
  inDeck: false, owned: true, availability: { owned: 1, hard: 0, soft: 0, free: 1, claims: [] },
  price: null, ...over,
});
const cand = (h: CandidateHalf, n: number): Candidate => ({
  key: h.oracleId, halves: [h], fit: { n, of: 62 }, matched: [{ oracleId: "x", name: "Llanowar Elves", imageUri: "https://img.test/elves.jpg" }], deckCount: 500,
});
const data = (over: Partial<ChangeCandidates> = {}): ChangeCandidates => ({
  current: [{ oracleId: "korvold", name: "Korvold, Fae-Cursed King", cmc: 5, manaCost: "{2}{B}{R}{G}", imageUri: null }],
  identity: ["B", "G", "R"], counted: 62,
  yours: [cand(half("Prosper"), 41)],
  toBuy: Array.from({ length: 10 }, (_, i) => cand(half(`Buy ${i}`, { owned: false, availability: null }), 10 - i)),
  claimsKnown: true, newestAsOf: null, ...over,
});

const mount = (pair = false, hasVersion = true) => render(
  <CardDetailProvider fetchCard={async () => null}>
    <ChangeCommanderSheet deckId="d1" deckName="Jund" pair={pair} hasVersion={hasVersion} onClose={() => {}} />
  </CardDetailProvider>,
);

beforeEach(() => { readChangeCandidates.mockReset(); changeCommander.mockReset(); refresh.mockReset(); });

describe("ChangeCommanderSheet", () => {
  it("breathes its four loading rows on one wrapper while the candidates are read", async () => {
    readChangeCandidates.mockReturnValue(new Promise(() => {}));
    mount();
    const status = await screen.findByRole("status");
    const breathing = status.querySelectorAll(".anim-skeleton");
    expect(breathing).toHaveLength(1);
    expect(breathing[0].querySelectorAll(":scope > [aria-hidden=true]")).toHaveLength(4);
  });

  it("shortens a name at its comma", () => {
    expect(shortName("Korvold, Fae-Cursed King")).toBe("Korvold");
  });

  // A half pictures the owned copy, so a renamed printing's caption reads the name printed on it.
  it("captions an owned renamed printing with its printed name", async () => {
    readChangeCandidates.mockResolvedValue(data({ yours: [cand(half("Prosper", { printedName: "Ghostly Prosper" }), 41)] }));
    mount();
    expect(await screen.findAllByText("Ghostly Prosper")).not.toHaveLength(0);
    expect(screen.queryByText("Prosper", { exact: true })).toBeNull();
  });

  it("draws each group's first 5, then Show all and Show fewer on the swap sheet's toggle", async () => {
    const yours = Array.from({ length: 7 }, (_, i) => cand(half(`Own ${i}`), 40 - i));
    readChangeCandidates.mockResolvedValue(data({ yours }));
    mount();
    await screen.findByText("Yours · 7");
    expect(screen.getAllByTestId("change-commander-row").length).toBe(5 + 5);
    const own = screen.getByRole("button", { name: "Show all 7" });
    const buy = screen.getByRole("button", { name: "Show all 10" });
    expect(own.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(own);
    expect(screen.getAllByTestId("change-commander-row").length).toBe(7 + 5);
    expect(own.getAttribute("aria-expanded")).toBe("true");
    expect(own.textContent).toContain("Show fewer");
    fireEvent.click(buy);
    expect(screen.getAllByTestId("change-commander-row").length).toBe(7 + 10);
    fireEvent.click(own);
    expect(screen.getAllByTestId("change-commander-row").length).toBe(5 + 10);
  });

  it("pages the card modal across every candidate, folded or not", async () => {
    const yours = Array.from({ length: 7 }, (_, i) => cand(half(`Own ${i}`), 40 - i));
    readChangeCandidates.mockResolvedValue(data({ yours }));
    const asCard = (id: string) => ({
      oracleId: id, name: id, typeLine: "Creature", manaCost: "{2}", cmc: 2, oracleText: null, keywords: [],
      rarity: "common", colorIdentity: [], imageUri: null, printedName: null, quantity: 0, printings: [],
      setCodes: [], primarySetCode: "", preferredPrinting: null,
    }) as BrowseCard;
    const fetchCard = vi.fn(async (id: string) => asCard(id));
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <ChangeCommanderSheet deckId="d1" deckName="Jund" pair={false} hasVersion onClose={() => {}} />
      </CardDetailProvider>,
    );
    await screen.findByText("Yours · 7");
    // The last drawn row of a folded group: its Next is the first row Show all would add.
    fireEvent.click(screen.getByText("Own 4").closest("button")!);
    await screen.findByRole("dialog", { name: "own 4" });
    fireEvent.click(screen.getByRole("button", { name: "Next card" }));
    await waitFor(() => expect(fetchCard).toHaveBeenLastCalledWith("own 5", undefined));
  });

  it("draws no toggle under a group of 5 or fewer", async () => {
    readChangeCandidates.mockResolvedValue(data({ toBuy: data().toBuy.slice(0, 5) }));
    mount();
    await screen.findByText("To buy · 5");
    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();
  });

  it("names the figure and opens the cards it counts", async () => {
    readChangeCandidates.mockResolvedValue(data());
    mount();
    const figure = await screen.findByRole("button", { name: /41 of 62 cards in this deck are in Prosper's decks/ });
    expect(figure.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(figure);
    expect(screen.getByText("Llanowar Elves")).toBeTruthy();
  });

  it("says who owns none", async () => {
    readChangeCandidates.mockResolvedValue(data({ yours: [] }));
    mount();
    expect(await screen.findByText("You own none of them yet.")).toBeTruthy();
  });

  it("names the identity when no commander qualifies", async () => {
    readChangeCandidates.mockResolvedValue(data({ yours: [], toBuy: [] }));
    mount();
    expect(await screen.findByText("No other commander leads a Jund deck yet.")).toBeTruthy();
  });

  it("offers Try again when the read fails", async () => {
    readChangeCandidates.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce(data());
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Yours · 1")).toBeTruthy();
  });

  it("confirms a swap, writes it, and refreshes", async () => {
    readChangeCandidates.mockResolvedValue(data());
    changeCommander.mockResolvedValue({ ok: true });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Choose Prosper" }));
    expect(screen.getByText("Prosper takes the command zone. Korvold leaves the deck, and the 99 stay exactly as they are.")).toBeTruthy();
    expect(screen.getByText("Lands in your pending changes, not yet a version. Discard puts Korvold back.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Make Prosper commander" }));
    await waitFor(() => expect(changeCommander).toHaveBeenCalledWith("d1", { commanderOracleId: "prosper", partnerOracleId: null }));
    // No client refresh: the action revalidates, so its reply already carries the new page.
    expect(refresh).not.toHaveBeenCalled();
  });

  it("describes a trade when the candidate is in the 99", async () => {
    readChangeCandidates.mockResolvedValue(data({ yours: [cand(half("Prosper", { inDeck: true, availability: null }), 41)] }));
    mount();
    const mark = await screen.findByText("trades places", { exact: false });
    expect(mark.textContent).toBe("in this deck·trades places");
    fireEvent.click(screen.getByRole("button", { name: "Choose Prosper" }));
    expect(screen.getByText(/The two trade places\. Prosper leaves the 99 for the command zone/)).toBeTruthy();
  });

  it("keeps the confirm and says who still leads when the write fails", async () => {
    readChangeCandidates.mockResolvedValue(data());
    changeCommander.mockResolvedValue({ ok: false, reason: "mismatch" });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Choose Prosper" }));
    fireEvent.click(screen.getByRole("button", { name: "Make Prosper commander" }));
    expect(await screen.findByText("We couldn't change the commander. Korvold still leads this deck.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("tells a brew that only another change undoes it", async () => {
    readChangeCandidates.mockResolvedValue(data());
    mount(false, false);
    fireEvent.click(await screen.findByRole("button", { name: "Choose Prosper" }));
    expect(screen.getByText(/This deck has no version yet/)).toBeTruthy();
  });
});

describe("ChangeCommanderSheet for a pair", () => {
  const pairOf = (a: CandidateHalf, b: CandidateHalf, n: number): Candidate => ({
    key: `${a.oracleId}+${b.oracleId}`, halves: [a, b], fit: { n, of: 62 }, matched: [], deckCount: 500,
  });
  const pairData = (): ChangeCandidates => data({
    current: [
      { oracleId: "tymna", name: "Tymna the Weaver", cmc: 3, manaCost: "{1}{W}{B}", imageUri: null },
      { oracleId: "thrasios", name: "Thrasios, Triton Hero", cmc: 2, manaCost: "{G}{U}", imageUri: null },
    ],
    yours: [pairOf(half("Kraum, Ludevic's Opus"), half("Tana, the Bloodsower"), 30)],
    toBuy: [],
  });

  // The half-trade (addendum): Reyhan comes out of the 98 while both old halves leave.
  const halfTradeData = () => data({
    ...pairData(),
    yours: [pairOf(half("Ishai"), half("Reyhan", { inDeck: true, availability: null }), 30)],
  });

  it("confirms a half-trade: its labels, each card's fate, and the choice defaulting to the first commander", async () => {
    readChangeCandidates.mockResolvedValue(halfTradeData());
    mount(true);
    fireEvent.click(await screen.findByRole("button", { name: "Choose Ishai and Reyhan" }));
    expect(screen.getByText("Leave the command zone")).toBeTruthy();
    expect(screen.getByText("Lead the deck")).toBeTruthy();
    expect(screen.queryByText("Moves to the command zone")).toBeNull();
    const [outFates, inFates] = screen.getAllByTestId("half-trade-fates");
    expect(outFates.textContent).toBe("into the 98leaves the deck");
    expect(inFates.textContent).toBe("freefrom the 98");
    const group = screen.getByRole("radiogroup", { name: "Which one stays in the 98?" });
    expect(group).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Tymna the Weaver" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(
      "Reyhan leaves the 98 for the command zone, and Ishai joins it there. Tymna the Weaver takes Reyhan's slot, and Thrasios leaves the deck. The deck stays at 98.",
    )).toBeTruthy();
    expect(screen.getByText("Lands in your pending changes, not yet a version. Discard undoes the whole swap.")).toBeTruthy();
  });

  it("rewrites the sentence and the fates when the choice flips, by press or by arrow key, and writes it", async () => {
    readChangeCandidates.mockResolvedValue(halfTradeData());
    changeCommander.mockResolvedValue({ ok: true });
    mount(true);
    fireEvent.click(await screen.findByRole("button", { name: "Choose Ishai and Reyhan" }));
    fireEvent.click(screen.getByRole("radio", { name: "Thrasios" }));
    expect(screen.getByRole("radio", { name: "Thrasios" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(/Thrasios takes Reyhan's slot, and Tymna the Weaver leaves the deck\./)).toBeTruthy();
    expect(screen.getAllByTestId("half-trade-fates")[0].textContent).toBe("leaves the deckinto the 98");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Thrasios" }), { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "Tymna the Weaver" }).getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Tymna the Weaver" }));
    fireEvent.keyDown(screen.getByRole("radio", { name: "Tymna the Weaver" }), { key: "ArrowRight" });
    fireEvent.click(screen.getByRole("button", { name: "Make Ishai and Reyhan commanders" }));
    await waitFor(() => expect(changeCommander).toHaveBeenCalledWith(
      "d1", { commanderOracleId: "ishai", partnerOracleId: "reyhan" }, "thrasios",
    ));
  });

  it("keeps the choice across Back and Choose again", async () => {
    readChangeCandidates.mockResolvedValue(halfTradeData());
    mount(true);
    fireEvent.click(await screen.findByRole("button", { name: "Choose Ishai and Reyhan" }));
    fireEvent.click(screen.getByRole("radio", { name: "Thrasios" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to the list" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Ishai and Reyhan" }));
    expect(screen.getByRole("radio", { name: "Thrasios" }).getAttribute("aria-checked")).toBe("true");
  });

  it("confirms both halves in and both out, and writes the pair", async () => {
    readChangeCandidates.mockResolvedValue(pairData());
    changeCommander.mockResolvedValue({ ok: true });
    mount(true);
    fireEvent.click(await screen.findByRole("button", { name: "Choose Kraum and Tana" }));
    expect(screen.getByText(
      "Kraum and Tana take the command zone. Tymna the Weaver and Thrasios leave the deck, and the 98 stay exactly as they are.",
    )).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Make Kraum and Tana commanders" }));
    await waitFor(() => expect(changeCommander).toHaveBeenCalledWith(
      "d1", { commanderOracleId: "kraum, ludevic's opus", partnerOracleId: "tana, the bloodsower" },
    ));
  });

  it("gives every candidate's figure its own panel, across both groups", async () => {
    readChangeCandidates.mockResolvedValue(data({
      current: pairData().current,
      yours: [pairOf(half("Kraum"), half("Tana"), 30)],
      toBuy: [pairOf(half("Kraum"), half("Ishai", { owned: false, availability: null }), 20)],
    }));
    mount(true);
    await screen.findByRole("button", { name: "Choose Kraum and Tana" });
    const controls = screen.getAllByRole("button", { expanded: false })
      .map((b) => b.getAttribute("aria-controls")).filter((c): c is string => c !== null);
    expect(controls.length).toBe(2);
    expect(new Set(controls).size).toBe(2);
  });

  it("says who still leads in the plural when the write fails", async () => {
    readChangeCandidates.mockResolvedValue(pairData());
    changeCommander.mockResolvedValue({ ok: false, reason: "mismatch" });
    mount(true);
    fireEvent.click(await screen.findByRole("button", { name: "Choose Kraum and Tana" }));
    fireEvent.click(screen.getByRole("button", { name: "Make Kraum and Tana commanders" }));
    expect(await screen.findByText("We couldn't change the commanders. Tymna the Weaver and Thrasios still lead this deck."))
      .toBeTruthy();
  });

  it("names the way back from a stacked card Change commander, not the pair's title", async () => {
    readChangeCandidates.mockResolvedValue(pairData());
    render(
      <CardDetailProvider fetchCard={async (id) => ({
        oracleId: id, name: id, typeLine: "Legendary Creature", manaCost: "{U}", cmc: 1, oracleText: null,
        keywords: [], rarity: "rare", colorIdentity: [], imageUri: null, printings: [], owned: [], proxiedBy: [],
      }) as unknown as BrowseCard}>
        <ChangeCommanderSheet deckId="d1" deckName="Jund" pair hasVersion onClose={() => {}} />
      </CardDetailProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /Kraum, Ludevic's Opus/ }));
    const back = await screen.findByTestId("card-modal-back");
    expect(back.getAttribute("aria-label")).toBe("Back to Change commander");
  });
});

describe("summedPrice", () => {
  const at = new Date("2026-09-22T00:00:00Z");
  const priced = (cents: number | null, asOf = at): CandidateHalf => half(`H${cents}`, {
    owned: false, availability: null, price: { cents, foilCents: null, etchedCents: null, asOf },
  });

  it("sums a pair's two live prices into one figure", async () => {
    const { summedPrice } = await import("./change-commander-sheet");
    expect(summedPrice([priced(150), priced(275)], at)).toEqual({ cents: 425, foilCents: null, etchedCents: null, asOf: at });
  });

  it("does not sum over a half with no normal price, or one that is sold out", async () => {
    const { summedPrice } = await import("./change-commander-sheet");
    expect(summedPrice([priced(150), priced(null)], at)).toBeNull();
    expect(summedPrice([priced(150), priced(275, new Date("2026-09-01T00:00:00Z"))], at)).toBeNull();
  });

  it("leaves a single half to its own tag", async () => {
    const { summedPrice } = await import("./change-commander-sheet");
    expect(summedPrice([priced(150)], at)).toBeNull();
  });
});

// E2 (About launch entries): the row and the group heading are exported so the About figure can
// mount them without the sheet's read. The export is only honest while a standalone mount draws
// what the sheet draws, so both are compared against the sheet's own markup.
describe("CandidateRow and CandidateGroupHeading, mounted alone", () => {
  it("draw the same markup as the sheet's first Yours row and its heading", async () => {
    const { CandidateRow, CandidateGroupHeading } = await import("./change-commander-sheet");
    const d = data({ toBuy: [] });
    readChangeCandidates.mockResolvedValue(d);
    const sheet = mount();
    const heading = await screen.findByText("Yours · 1");
    const sheetHeading = heading.parentElement!.outerHTML;
    const sheetRow = screen.getByTestId("change-commander-row").outerHTML;
    sheet.unmount();

    const alone = render(
      <CardDetailProvider fetchCard={async () => null}>
        <CandidateGroupHeading label="Yours · 1" note="by figure" />
        <CandidateRow
          candidate={d.yours[0]}
          pair={false}
          current={{ cmc: 5, name: "Korvold" }}
          newestAsOf={null}
          siblings={[d.yours[0].halves[0].oracleId]}
          open={false}
          onToggle={() => {}}
          onChoose={() => {}}
        />
      </CardDetailProvider>,
    );
    expect(alone.getByTestId("change-commander-row").outerHTML).toBe(sheetRow);
    expect(alone.getByText("Yours · 1").parentElement!.outerHTML).toBe(sheetHeading);
  });
});

describe("ChangeCommanderSheet hover preview", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({ matches: query === "(hover: hover)", media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }),
    });
  });
  afterEach(() => { vi.useRealTimers(); });

  // The sheet opens under the pointer that pressed its door, so a preview waits for a MOVE.
  const hover = (el: HTMLElement) => {
    fireEvent.mouseEnter(el, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(el, { clientX: 60, clientY: 60 });
    act(() => { vi.advanceTimersByTime(1000); });
  };

  it("previews a candidate's own art and a matched card's, above the sheet", async () => {
    readChangeCandidates.mockResolvedValue(data({ yours: [cand(half("Prosper", { imageUri: "https://img.test/prosper.jpg" }), 41)] }));
    mount();
    const figure = await screen.findByRole("button", { name: /41 of 62 cards in this deck are in Prosper's decks/ });
    hover(screen.getAllByRole("button", { name: /Prosper/ }).find((b) => b.tagName === "BUTTON" && b.textContent === "Prosper")!);
    expect(screen.getByTestId("hover-preview").getAttribute("style")).toContain("https://img.test/prosper.jpg");
    fireEvent.mouseLeave(screen.getAllByRole("button", { name: /Prosper/ })[0]);
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.click(figure);
    hover(screen.getByText("Llanowar Elves").closest("button")!);
    expect(screen.getByTestId("hover-preview").getAttribute("style")).toContain("https://img.test/elves.jpg");
  });
});
