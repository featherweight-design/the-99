import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { slotDeck } from "../../lib/bracket/slot";
import type { BrowseCard } from "../../lib/collection/browse";
import type { ComboRef } from "../../lib/profile/types";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { upgradePathCopy } from "../../lib/copy/upgrade-path";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { COMMANDER, deckProfile, profileCard } from "./__fixtures__/deck-profile";
import { BracketClimb } from "./bracket-climb";
import { HoverPreviewProvider } from "./hover-preview";
import { UpgradePathSheet } from "./upgrade-path";

/**
 * The upgrade path, drawn through the REAL verdict and the REAL climb from REAL profiles: the
 * readings are functions of `upgradePath`, and a hand-built path could hold a shape the rule
 * never returns.
 */

const combo = (a: string, b: string): ComboRef => ({
  variantId: `${a}-${b}`,
  cards: [{ oracleId: a, name: a }, { oracleId: b, name: b }],
  produces: ["Infinite mana"],
  bracketTag: "casual",
  usesCommander: false,
  manaValueNeeded: null,
  manaNeeded: null,
  steps: null,
  notablePrerequisites: null,
});

const gcs = (names: string[]) => names.map((n) => profileCard(n, n));

const NONE: ReadonlySet<string> = new Set();

function draw(profile: ReturnType<typeof deckProfile>, locked: ReadonlySet<string> = NONE) {
  const verdict = slotDeck(profile);
  render(
    <CardDetailProvider fetchCard={async () => null}>
      <BracketClimb verdict={verdict} profile={profile} locked={locked} art={new Map()} />
    </CardDetailProvider>,
  );
  return verdict;
}

const trigger = () => screen.getByRole("button", { name: new RegExp(upgradePathCopy.open) });
const panel = () => screen.getByTestId("upgrade-path");
/** The sheet's header carries the head: the target's mark and the sentence naming what goes. */
const sheet = () => screen.getByRole("dialog");

describe("the opener", () => {
  // ON THE LOWER RUNG, and nothing opens until it is pressed. It opens a SHEET (3b), never in place.
  it("sits on the lower rung and opens the path as a sheet", () => {
    draw(deckProfile({ cards: [COMMANDER, ...gcs(["A", "B", "C", "D", "E"])], gameChangerIds: new Set(["A", "B", "C", "D", "E"]) }));
    const below = screen.getAllByTestId("climb-rung").find((r) => r.dataset.role === "below")!;
    expect(within(below).getByText(upgradePathCopy.rungLabel)).toBeTruthy();
    expect(trigger().getAttribute("aria-haspopup")).toBe("dialog");
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(trigger());
    expect(within(sheet()).getByRole("heading", { name: upgradePathCopy.heading(3, 2) })).toBeTruthy();
    expect(within(sheet()).getByTestId("upgrade-path")).toBeTruthy();
    fireEvent.click(within(sheet()).getByRole("button", { name: "Close what would have to go" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // A deck already at the bottom of the ladder has no rung below, and no path to open.
  it("is absent where there is no rung below", () => {
    draw(deckProfile());
    expect(screen.queryByRole("button", { name: new RegExp(upgradePathCopy.open) })).toBeNull();
  });
});

describe("a count rule", () => {
  // u2: more candidates than must go. ANY N OF THESE M, and every one listed; none picked.
  it("lists every candidate and the count, and picks none", () => {
    draw(deckProfile({ cards: [COMMANDER, ...gcs(["A", "B", "C", "D", "E"])], gameChangerIds: new Set(["A", "B", "C", "D", "E"]) }));
    fireEvent.click(trigger());
    expect(within(sheet()).getByRole("heading", { name: upgradePathCopy.heading(3, 2) })).toBeTruthy();
    expect(within(panel()).getByText(upgradePathCopy.countRule.anyOf(2, 5))).toBeTruthy();
    for (const n of ["A", "B", "C", "D", "E"]) {
      expect(within(panel()).getByRole("button", { name: new RegExp(`\\b${n}$`) })).toBeTruthy();
    }
    expect(panel().textContent).not.toMatch(/\bremove\b/i);
  });

  // u3: exactly as many as must go. The cards are NAMED, and there is no "any". Two game
  // changers read [3], and Core, the bracket directly below, allows none.
  it("names the cards when the rules leave no choice", () => {
    draw(deckProfile({ cards: [COMMANDER, ...gcs(["A", "B"])], gameChangerIds: new Set(["A", "B"]) }));
    fireEvent.click(trigger());
    expect(panel().textContent).toContain(upgradePathCopy.countRule.forced(["A", "B"]));
    expect(panel().textContent).not.toMatch(/Any \d/);
  });

  // ONE TARGET (3b): the bracket directly below, with no chips offering the others.
  it("reads the bracket directly below and offers no other", () => {
    draw(deckProfile({ cards: [COMMANDER, ...gcs(["A", "B", "C", "D"])], gameChangerIds: new Set(["A", "B", "C", "D"]) }));
    fireEvent.click(trigger());
    expect(within(sheet()).getByRole("heading").textContent).toMatch(/^Upgraded, /);
    expect(within(sheet()).queryByRole("group")).toBeNull();
    expect(within(sheet()).queryByRole("button", { name: /Core|Exhibition/ })).toBeNull();
  });
});

// A candidate wears every mark true of it, the tutor included (§C2's prose row). The row built
// its marks from a hand-listed three, so a game changer that is also a tutor drew one mark here
// and two everywhere else.
describe("a candidate's marks", () => {
  it("draws the tutor mark on a candidate the profile counts as a tutor", () => {
    draw(deckProfile({
      cards: [COMMANDER, ...gcs(["A", "B", "C", "D", "E"])],
      gameChangerIds: new Set(["A", "B", "C", "D", "E"]),
      tutorIds: new Set(["A"]),
    }));
    fireEvent.click(trigger());
    expect(within(panel()).getAllByTestId("card-fact-tutor")).toHaveLength(1);
    expect(within(panel()).getAllByTestId("card-fact-gameChanger").length).toBeGreaterThan(1);
  });
});

describe("a combo", () => {
  // u4 at a target where combos are forbidden: either half breaks it, and it never says remove.
  it("states the combo's rule and draws the pair", () => {
    draw(deckProfile({
      cards: [COMMANDER, profileCard("x", "Thassa's Oracle"), profileCard("y", "Demonic Consultation"), ...gcs(["A"])],
      gameChangerIds: new Set(["A"]),
      twoCardCombos: [combo("x", "y")],
    }));
    fireEvent.click(trigger());
    expect(panel().textContent).toContain(upgradePathCopy.comboRule.forbidden(2));
    expect(panel().textContent).toContain(upgradePathCopy.comboRule.either);
  });

  // u5: a game changer that is also half the combo is said ONCE, in the foot.
  it("says the overlap once in the foot", () => {
    draw(deckProfile({
      cards: [COMMANDER, profileCard("x", "x"), profileCard("y", "y")],
      gameChangerIds: new Set(["x"]),
      twoCardCombos: [combo("x", "y")],
    }));
    fireEvent.click(trigger());
    const text = panel().textContent ?? "";
    expect(text.split(upgradePathCopy.overlap(1)).length - 1).toBe(1);
    expect(panel().textContent).toContain(upgradePathCopy.yours);
  });
});

describe("blocked", () => {
  // u7: the commander is a game changer, so Core, directly below this [3] deck, cannot be
  // reached by removals. Stated plainly, with the commander on a dashed edge.
  it("says what removals cannot reach", () => {
    draw(deckProfile({
      cards: [COMMANDER, ...gcs(["A"])],
      gameChangerIds: new Set([COMMANDER.oracleId, "A"]),
    }));
    fireEvent.click(trigger());
    expect(within(sheet()).getByRole("heading", { name: upgradePathCopy.blocked.heading(2) })).toBeTruthy();
    expect(panel().textContent).toContain(upgradePathCopy.blocked.commanderTag);
    expect(panel().textContent).toContain(upgradePathCopy.blocked.countShortfall(2, 1, 1));
    expect(panel().textContent).not.toMatch(/impossible|sorry/i);
    // Nothing between Core and the reading exists to be reached instead, so nothing is offered.
    expect(within(panel()).queryByRole("button", { name: /reachable/ })).toBeNull();
  });

  // u8: both halves in the command zone — no removal breaks it.
  it("says so when both halves of a combo are the commanders", () => {
    const PARTNER = profileCard("cmd2", "Tymna the Weaver");
    const profileOf = () =>
      deckProfile({
        cards: [COMMANDER, PARTNER],
        commanderOracleIds: [COMMANDER.oracleId, PARTNER.oracleId],
        twoCardCombos: [combo(COMMANDER.oracleId, PARTNER.oracleId)],
      });
    draw(profileOf());
    // The pair in the command zone ASSEMBLES — no tutor needed — so the deck reads [4] and the
    // default target is Upgraded, the nearest bracket below.
    expect(slotDeck(profileOf()).permits).toEqual([4]);
    fireEvent.click(trigger());
    expect(panel().textContent).toContain(upgradePathCopy.blocked.comboShortfall(3));
  });
});

describe("the command zone", () => {
  // A COMMANDER IS NEVER A CANDIDATE, on a combo either: its half is drawn as the card that
  // cannot be cut, and the sentence names the other half rather than offering "either".
  it("names the only half that can go when the commander is the other", () => {
    draw(deckProfile({
      cards: [COMMANDER, profileCard("y", "Exquisite Blood"), ...gcs(["A"])],
      gameChangerIds: new Set(["A"]),
      twoCardCombos: [combo(COMMANDER.oracleId, "y")],
    }));
    fireEvent.click(trigger());
    // The combo fixture names its pieces by id, so the forced half reads "y".
    expect(panel().textContent).toContain(upgradePathCopy.countRule.forced(["y"]));
    expect(panel().textContent).not.toContain(upgradePathCopy.comboRule.either);
    expect(within(panel()).queryByRole("button", { name: new RegExp(COMMANDER.name) })).toBeNull();
    expect(panel().textContent).toContain(upgradePathCopy.blocked.commanderTag);
  });

  // PARTNERS BOTH GAME CHANGERS: two are left in the command zone at Core, and the sentence says
  // two, and "commanders".
  it("counts what the command zone keeps rather than assuming one", () => {
    const PARTNER = profileCard("cmd2", "Tymna the Weaver");
    draw(deckProfile({
      cards: [COMMANDER, PARTNER, ...gcs(["A"])],
      commanderOracleIds: [COMMANDER.oracleId, PARTNER.oracleId],
      gameChangerIds: new Set([COMMANDER.oracleId, PARTNER.oracleId, "A"]),
    }));
    fireEvent.click(trigger());
    expect(panel().textContent).toContain(upgradePathCopy.blocked.countShortfall(2, 2, 2));
    expect(upgradePathCopy.blocked.countShortfall(2, 2, 2)).toMatch(/are your commanders.*leaves two/);
  });
});

describe("the satisfied path", () => {
  // u6 cannot be reached from the rung, whose targets all sit below the reading's floor; it is
  // drawn when the panel is asked about a bracket the deck already sits inside.
  it("says nothing would have to go and hands the question to the declaration", () => {
    const profile = deckProfile();
    const verdict = slotDeck(profile);
    render(
      <CardDetailProvider fetchCard={async () => null}>
        <UpgradePathSheet profile={profile} verdict={verdict} target={2} locked={NONE} art={new Map()} onClose={() => {}} />
      </CardDetailProvider>,
    );
    expect(screen.getByTestId("upgrade-path").textContent).toContain(
      upgradePathCopy.satisfied(2, "Exhibition or Core"),
    );
  });
});

describe("more of the rules", () => {
  // A LOOP OF EXTRA TURNS is on Upgraded's list whether or not the tutors can find it, and it is
  // explained as a loop, never as an assembled combo.
  it("explains a loop of extra turns as a loop", () => {
    const loop = { ...combo("x", "y"), produces: ["Infinite turns"] };
    draw(deckProfile({
      cards: [COMMANDER, profileCard("x", "x"), profileCard("y", "y"), ...gcs(["A", "B", "C", "D"])],
      gameChangerIds: new Set(["A", "B", "C", "D"]),
      twoCardCombos: [loop],
    }));
    fireEvent.click(trigger());
    expect(panel().textContent).toContain(upgradePathCopy.comboRule.loop(3));
    expect(panel().textContent).not.toContain(upgradePathCopy.comboRule.assembled(3));
  });

  // A [2] deck can only go to Exhibition, and the header names it.
  it("names Exhibition as the target of a Core deck", () => {
    draw(deckProfile({
      cards: [COMMANDER, profileCard("time-warp", "Time Warp")],
      extraTurnFlags: new Map([["time-warp", ["oracle_rule"] as never]]),
    }));
    fireEvent.click(trigger());
    expect(within(sheet()).getByRole("heading", { name: upgradePathCopy.heading(1, 1) })).toBeTruthy();
  });

  // SEVERAL COMBOS, DIFFERENT CUTS: one breaks on either half, the other only on the half outside
  // the command zone. Each row says its own.
  it("says what breaks each combo on its own row", () => {
    draw(deckProfile({
      cards: [COMMANDER, profileCard("x", "x"), profileCard("y", "y"), profileCard("z", "z"), ...gcs(["A"])],
      gameChangerIds: new Set(["A"]),
      twoCardCombos: [combo("x", "y"), combo(COMMANDER.oracleId, "z")],
    }));
    fireEvent.click(trigger());
    const text = panel().textContent ?? "";
    expect(text).toContain(upgradePathCopy.comboRule.either);
    expect(text).toContain(upgradePathCopy.countRule.forced(["z"]));
  });
});


// Locked, F6: the player's locks move ORDER and add one sentence under the rule. They never change
// a count, and they never enter the stored profile (the set arrives as a prop).
describe("locked candidates", () => {
  const five = () => deckProfile({ cards: [COMMANDER, ...gcs(["A", "B", "C", "D", "E"])], gameChangerIds: new Set(["A", "B", "C", "D", "E"]) });
  const order = () =>
    within(panel()).getAllByRole("listitem").map((li) => li.textContent?.match(/^[A-E]/)?.[0]);

  it("lists a locked candidate last, marked, and says so while the count holds", () => {
    draw(five(), new Set(["B"]));
    fireEvent.click(trigger());
    expect(order()).toEqual(["A", "C", "D", "E", "B"]);
    const lock = within(panel()).getByTestId("climb-locked");
    // One accessible name at every width: the glyph and the desktop word are both hidden from it.
    expect(within(lock).getByText(lockedCardsCopy.mark.title).className).toContain("sr-only");
    expect(within(lock).getByText(lockedCardsCopy.mark.key).getAttribute("aria-hidden")).toBe("true");
    expect(within(panel()).getByText(upgradePathCopy.countRule.anyOf(2, 5))).toBeTruthy();
    expect(screen.getByTestId("climb-lock-note").textContent).toBe(lockedCardsCopy.climb.listedLast(["B"]));
  });

  it("draws nothing for a deck with no locks", () => {
    draw(five());
    fireEvent.click(trigger());
    expect(order()).toEqual(["A", "B", "C", "D", "E"]);
    expect(screen.queryByTestId("climb-locked")).toBeNull();
    expect(screen.queryByTestId("climb-lock-note")).toBeNull();
  });

  // Two must go from five: three unlocked is reachable, two is not. The unreachable sentence takes
  // listedLast's slot, and the heading keeps the count.
  it("holds the boundary: removeCount unlocked is reachable, one fewer is not", () => {
    draw(five(), new Set(["A", "B"]));
    fireEvent.click(trigger());
    expect(screen.getByTestId("climb-lock-note").textContent).toBe(lockedCardsCopy.climb.listedLast(["A", "B"]));
    cleanupSheet();
    draw(five(), new Set(["A", "B", "C", "D"]));
    fireEvent.click(trigger());
    expect(screen.getByTestId("climb-lock-note").textContent).toBe(lockedCardsCopy.climb.unreachable(4, 5, "Upgraded"));
    expect(within(sheet()).getByRole("heading", { name: upgradePathCopy.heading(3, 2) })).toBeTruthy();
  });

  it("puts the Forced state out of reach with one lock", () => {
    draw(deckProfile({ cards: [COMMANDER, ...gcs(["A", "B"])], gameChangerIds: new Set(["A", "B"]) }), new Set(["B"]));
    fireEvent.click(trigger());
    expect(screen.getByTestId("climb-lock-note").textContent).toMatch(/^1 of these is locked\. .+ can\u2019t be reached while it is\.$/);
  });

  it("keeps a combo's pair in order and marks the locked piece; every piece locked is out of reach", () => {
    const withCombo = () => deckProfile({
      cards: [COMMANDER, profileCard("x", "Thassa's Oracle"), profileCard("y", "Demonic Consultation"), ...gcs(["A"])],
      gameChangerIds: new Set(["A"]),
      twoCardCombos: [combo("x", "y")],
    });
    draw(withCombo(), new Set(["x"]));
    fireEvent.click(trigger());
    expect(within(panel()).getAllByTestId("climb-locked")).toHaveLength(1);
    // x is locked and still drawn first: its lock sits beside x, ahead of y.
    const [x, y] = [/\bx$/, /\by$/].map((n) => within(panel()).getByRole("button", { name: n }));
    expect(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(x.parentElement!.contains(within(panel()).getByTestId("climb-locked"))).toBe(true);
    expect(screen.queryByTestId("climb-lock-note")).toBeNull();
    cleanupSheet();
    draw(withCombo(), new Set(["x", "y"]));
    fireEvent.click(trigger());
    expect(screen.getByTestId("climb-lock-note").textContent).toMatch(/^All 2 are locked\. .+ can\u2019t be reached while they are\.$/);
  });

  // Two combos each wholly locked: each sentence sits on its own combo's row, never twice under
  // the rule where "All 2" would read as the whole list.
  it("puts a combo's sentence on its own row when there are several", () => {
    draw(deckProfile({
      cards: [COMMANDER, ...["w", "x", "y", "z"].map((id) => profileCard(id, id)), ...gcs(["A"])],
      gameChangerIds: new Set(["A"]),
      twoCardCombos: [combo("w", "x"), combo("y", "z")],
    }), new Set(["w", "x", "y"]));
    fireEvent.click(trigger());
    const notes = screen.getAllByTestId("climb-lock-note");
    expect(notes).toHaveLength(1);
    expect(notes[0].textContent).toMatch(/^All 2 are locked\./);
    expect(notes[0].parentElement!.contains(within(panel()).getByRole("button", { name: /\bw$/ }))).toBe(true);
    expect(notes[0].parentElement!.contains(within(panel()).getByRole("button", { name: /\by$/ }))).toBe(false);
  });
});

function cleanupSheet() {
  cleanup();
}

// One wording at both widths (Hugh, 2026-10-05): the bracket name alone read as a place in the
// climb rather than a way back to this sheet, so a card opened from here names the sheet itself
// no matter which pill a width draws — proof against #1270 round 4's "reverts silently" finding.
describe("the card opened from here", () => {
  const CARD: BrowseCard = {
    oracleId: "A", name: "A", typeLine: "Creature", manaCost: "{1}", cmc: 1, oracleText: null,
    keywords: [], rarity: "common", colorIdentity: [], imageUri: null, printedName: null, quantity: 1,
    printings: [], setCodes: [], primarySetCode: "", preferredPrinting: null, commanderLegal: false, hasDecks: false,
  };

  it("names the sheet on its way back, at both widths", async () => {
    const profile = deckProfile({ cards: [COMMANDER, ...gcs(["A", "B"])], gameChangerIds: new Set(["A", "B"]) });
    const verdict = slotDeck(profile);
    render(
      <CardDetailProvider fetchCard={async () => CARD}>
        <BracketClimb verdict={verdict} profile={profile} locked={NONE} art={new Map()} />
      </CardDetailProvider>,
    );
    fireEvent.click(trigger());
    await act(async () => {
      fireEvent.click(within(panel()).getByRole("button", { name: /\bA$/ }));
    });
    expect(screen.getByTestId("card-modal-back").textContent).toContain(deckAnalysisCopy.sheets.upgradePath);
    expect(screen.getByTestId("card-modal-back-mobile").textContent).toContain(deckAnalysisCopy.sheets.upgradePath);
  });
});

describe("a candidate's hover preview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({ matches: query === "(hover: hover)", media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }),
    });
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("previews the deck's art for the name, and nothing for a card the art map lacks", () => {
    const profile = deckProfile({ cards: [COMMANDER, ...gcs(["A", "B", "C", "D", "E"])], gameChangerIds: new Set(["A", "B", "C", "D", "E"]) });
    const verdict = slotDeck(profile);
    const art = new Map([["A", { name: "A", imageUri: "https://img.test/a.jpg" }]]);
    render(
      <CardDetailProvider fetchCard={async () => null}>
        <HoverPreviewProvider>
          <BracketClimb verdict={verdict} profile={profile} locked={NONE} art={art} />
        </HoverPreviewProvider>
      </CardDetailProvider>,
    );
    fireEvent.click(trigger());
    const names = within(panel());
    fireEvent.mouseEnter(names.getByText("A").closest("button")!, { clientX: 10, clientY: 10 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId("hover-preview").getAttribute("style")).toContain("https://img.test/a.jpg");
    fireEvent.mouseLeave(names.getByText("A").closest("button")!);
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.mouseEnter(names.getByText("B").closest("button")!, { clientX: 10, clientY: 10 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByTestId("hover-preview")).toBeNull();
  });
});
