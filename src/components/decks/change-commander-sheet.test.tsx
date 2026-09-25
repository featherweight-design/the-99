import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  key: h.oracleId, halves: [h], fit: { n, of: 62 }, matched: [{ oracleId: "x", name: "Llanowar Elves" }], deckCount: 500,
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
  it("shortens a name at its comma", () => {
    expect(shortName("Korvold, Fae-Cursed King")).toBe("Korvold");
  });

  it("draws Yours whole and the first 8 to buy, then Show more", async () => {
    readChangeCandidates.mockResolvedValue(data());
    mount();
    await screen.findByText("Yours · 1");
    expect(screen.getByText("To buy · 10")).toBeTruthy();
    expect(screen.getAllByTestId("change-commander-row").length).toBe(1 + 8);
    fireEvent.click(screen.getByRole("button", { name: "Show 2 more" }));
    expect(screen.getAllByTestId("change-commander-row").length).toBe(11);
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
