import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { slotDeck } from "../../lib/bracket/slot";
import type { ComboRef } from "../../lib/profile/types";
import { upgradePathCopy } from "../../lib/copy/upgrade-path";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { COMMANDER, deckProfile, profileCard } from "./__fixtures__/deck-profile";
import { BracketClimb } from "./bracket-climb";
import { UpgradePathPanel } from "./upgrade-path";

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

function draw(profile: ReturnType<typeof deckProfile>) {
  const verdict = slotDeck(profile);
  render(
    <CardDetailProvider fetchCard={async () => null}>
      <BracketClimb verdict={verdict} profile={profile} />
    </CardDetailProvider>,
  );
  return verdict;
}

const trigger = () => screen.getByRole("button", { name: new RegExp(upgradePathCopy.open) });
const panel = () => screen.getByTestId("upgrade-path");

describe("the disclosure", () => {
  // ON THE LOWER RUNG, closed, and nothing opens until it is pressed.
  it("sits on the lower rung, closed, and opens the path in place", () => {
    draw(deckProfile({ cards: [COMMANDER, ...gcs(["A", "B", "C", "D", "E"])], gameChangerIds: new Set(["A", "B", "C", "D", "E"]) }));
    const below = screen.getAllByTestId("climb-rung").find((r) => r.dataset.role === "below")!;
    expect(within(below).getByText(upgradePathCopy.rungLabel)).toBeTruthy();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("upgrade-path")).toBeNull();
    fireEvent.click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(panel().id).toBe(trigger().getAttribute("aria-controls"));
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
    expect(within(panel()).getByText(upgradePathCopy.heading(3, 2))).toBeTruthy();
    expect(within(panel()).getByText(upgradePathCopy.countRule.anyOf(2, 5))).toBeTruthy();
    for (const n of ["A", "B", "C", "D", "E"]) {
      expect(within(panel()).getByRole("button", { name: new RegExp(`\\b${n}$`) })).toBeTruthy();
    }
    expect(panel().textContent).not.toMatch(/\bremove\b/i);
  });

  // u3: exactly as many as must go. The cards are NAMED, and there is no "any".
  it("names the cards when the rules leave no choice", () => {
    draw(deckProfile({ cards: [COMMANDER, ...gcs(["A", "B", "C", "D"])], gameChangerIds: new Set(["A", "B", "C", "D"]) }));
    fireEvent.click(trigger());
    // Target 3 asks one of four; switch to Core, where all four must go.
    fireEvent.click(within(panel()).getByRole("button", { name: /Core/ }));
    expect(panel().textContent).toContain(upgradePathCopy.countRule.forced(["A", "B", "C", "D"]));
    expect(panel().textContent).not.toMatch(/Any \d/);
  });

  // The chips are the brackets below, nearest first, and never 4 or 5.
  it("offers the brackets below as pressed buttons, nearest first", () => {
    draw(deckProfile({ cards: [COMMANDER, ...gcs(["A", "B", "C", "D"])], gameChangerIds: new Set(["A", "B", "C", "D"]) }));
    fireEvent.click(trigger());
    const chips = within(screen.getByRole("group", { name: upgradePathCopy.targetsAria })).getAllByRole("button");
    expect(chips.map((c) => c.textContent)).toEqual(["Upgraded", "Core", "Exhibition"]);
    expect(chips.map((c) => c.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
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
  // u7: the commander is a game changer, so Core cannot be reached by removals. Stated plainly,
  // the commander on a dashed edge, and the nearest reachable target one press away.
  it("says what removals cannot reach and offers the nearest target that they can", () => {
    draw(deckProfile({
      cards: [COMMANDER, ...gcs(["A", "B", "C", "D"])],
      gameChangerIds: new Set([COMMANDER.oracleId, "A", "B", "C", "D"]),
    }));
    fireEvent.click(trigger());
    fireEvent.click(within(panel()).getByRole("button", { name: /Core/ }));
    expect(within(panel()).getByText(upgradePathCopy.blocked.heading(2))).toBeTruthy();
    expect(panel().textContent).toContain(upgradePathCopy.blocked.commanderTag);
    expect(panel().textContent).toContain(upgradePathCopy.blocked.countShortfall(2, 1, 1));
    expect(panel().textContent).not.toMatch(/impossible|sorry/i);
    const nearest = within(panel()).getByRole("button", { name: upgradePathCopy.blocked.nearest(3, 2) });
    fireEvent.click(nearest);
    expect(within(panel()).getByText(upgradePathCopy.heading(3, 2))).toBeTruthy();
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
      cards: [COMMANDER, PARTNER, ...gcs(["A", "B", "C", "D"])],
      commanderOracleIds: [COMMANDER.oracleId, PARTNER.oracleId],
      gameChangerIds: new Set([COMMANDER.oracleId, PARTNER.oracleId, "A", "B", "C", "D"]),
    }));
    fireEvent.click(trigger());
    fireEvent.click(within(panel()).getByRole("button", { name: /Core/ }));
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
        <UpgradePathPanel id="p" profile={profile} verdict={verdict} targets={[2]} />
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

  // ONE TARGET STILL DRAWS ITS CHIP: a [2] deck can only go to Exhibition.
  it("draws the chip when there is one target", () => {
    draw(deckProfile({
      cards: [COMMANDER, profileCard("time-warp", "Time Warp")],
      extraTurnFlags: new Map([["time-warp", ["oracle_rule"] as never]]),
    }));
    fireEvent.click(trigger());
    const chips = within(screen.getByRole("group", { name: upgradePathCopy.targetsAria })).getAllByRole("button");
    expect(chips.map((c) => c.textContent)).toEqual(["Exhibition"]);
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

