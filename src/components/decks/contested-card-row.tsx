"use client";
// One contested card: how many copies arrived, and every committed deck that wants one, in the
// order that decides who gets them.
//
// IN THIS PR THE ROW STATES THE DEFAULT AND NOTHING ELSE. The options are in commit order,
// each carrying the version stamp the order derives from, and each saying what it gets under
// that default — which is exactly what the section note promises ("the deck that committed the
// card first gets it, unless you say otherwise"). The control that lets a player say otherwise
// is the next PR, and it lands on this component; the reason the row is worth having now is
// that the shortage is real and the summary would otherwise report it without naming it.
//
// ONE COMPONENT, MEANT FOR TWO SURFACES: the summary and `/decks/[id]/changes`. There is no
// deck-page door — that was ruled out on 2026-09-14 and the availability marker stays inert.
//
// THE ORDER IS THE EXPLANATION, so `this deck` is tagged and never promoted: moving a player's
// own deck to the top would hide why it lost.

import { useState, useTransition } from "react";
import { cardAssignmentsCopy as copy } from "../../lib/copy/card-assignments";
import { assignCopy, type AssignRefusal } from "../../app/decks/assignment-actions";
import type { ContestedCard } from "../../lib/collection/summary-read";
import { formatShortDeckDate } from "../../lib/decks/format";

/**
 * The `Still to buy` heading, named without its count. The cross-reference points at the
 * SECTION, so it wants the heading's words and not a figure — building it by trimming
 * `sectionStill(0)` would make the copy depend on the punctuation between the two.
 */
const STILL_SECTION_LABEL = "Still to buy";

/**
 * `deck_version_cards.since`, epoch millis, as the stamp draws it.
 *
 * Through `formatShortDeckDate`, which already owns both of this app's date rules — en-US month
 * names because en-GB writes `Sept`, and UTC because the column carries no zone. A second
 * formatter here would drift from the version rail's.
 */
function stampDate(since: number | null): string {
  return since === null ? "" : formatShortDeckDate(new Date(since));
}

/**
 * The allocation mark: a word is never the only carrier, and a hue never is either.
 *
 * It states ALLOCATION and not authorship — filled means this deck holds a copy under the
 * allocation as it stands, empty means it is buying one. Nothing here is accent: accent means
 * "you chose this", and until the chooser ships nobody has chosen anything.
 *
 * ROUND AT ONE COPY, SQUARE ABOVE IT, taking `filter-panel.tsx`'s rule — the shape is the
 * affordance, and a square tick on a one-of-many list promises you can have two. With two
 * copies arrived a player really can give two decks one each, so the shape says so.
 *
 * A commander's mark is dimmed: that copy cannot be moved, so a mark drawn at full strength
 * would invite a press the next PR will have to refuse.
 */
function AllocationMark({
  allocated,
  copies,
  commander,
  picked,
}: {
  allocated: number;
  copies: number;
  commander: boolean;
  /** The player chose this one. Accent, and only here. */
  picked?: boolean;
}) {
  const filled = allocated > 0 || picked;
  const square = copies > 1;
  const fill = picked
    ? "var(--accent)"
    : commander ? "var(--fg-faint)" : "var(--fg-body)";
  return (
    <span
      aria-hidden
      className="flex-none flex items-center justify-center w-[18px] h-[18px] md:w-[16px] md:h-[16px]"
      style={{
        borderRadius: square ? 4 : 999,
        border: `1px solid ${filled ? fill : "var(--fg-faint)"}`,
        background: filled ? fill : "transparent",
      }}
    >
      {filled ? (
        <span
          className="block w-[7px] h-[7px] md:w-[6px] md:h-[6px]"
          style={{ borderRadius: square ? 1 : 999, background: "var(--bg)" }}
        />
      ) : null}
    </span>
  );
}

/**
 * THE SURFACE'S WORDS, chosen once.
 *
 * Every sentence this row draws about supply exists twice: an arrival form for the import
 * receipt, and a plain form for `/decks/[id]/changes`, where nothing arrived and the copies in
 * question are ones the player already owned. Branching at each call site cost three consecutive
 * review rounds — the visible line, then the refusal, then the accessible group name — each
 * round finding the next sibling that had not been taught. One lookup means a sentence added
 * later cannot be forgotten: it has nowhere else to come from.
 */
function surfaceWords(fromImport: boolean) {
  return fromImport
    ? {
        supply: copy.contested.supply,
        heading: copy.contested.heading,
        group: copy.contested.a11yGroup,
        refusedNoSupply: copy.contested.refusedNoSupply,
      }
    : {
        supply: copy.contested.supplyOwned,
        heading: copy.contested.headingOwned,
        group: copy.contested.a11yGroupOwned,
        refusedNoSupply: copy.contested.refusedNoSupplyOwned,
      };
}

/** The on-screen sentence for a named refusal — announced verbatim, never summarised. */
function refusalSentence(cause: AssignRefusal, card: ContestedCard, deckName: string): string {
  const holder = card.claimants.find((c) => c.allocated > 0)?.deckName ?? "";
  switch (cause) {
    case "claimant-no-longer-asks":
      return copy.contested.refusedNotWanted(deckName, card.cardName, holder);
    case "no-supply-left":
      // Reachable on the review page too — a race, or a pick made while another tab took the
      // last copy — and there nothing arrived at all.
      return surfaceWords(card.fromImport).refusedNoSupply(holder, card.owned, deckName);
    case "target-is-commander":
      return copy.contested.refusedIsCommander(card.cardName, deckName);
    // `not-your-deck` has no sentence by design: a player cannot reach it from their own decks,
    // and drawing a state for a request they cannot make would be drawing an attack.
    default:
      return "";
  }
}

export function ContestedCardRow({
  card: initial,
  alsoAbove,
  /** The deck whose page this row is on, when it is on one. Tagged, never promoted. */
  thisDeckId,
  /**
   * An element naming what this chooser is FOR, when its surface draws one. On the review page
   * the caption above the row is the only thing distinguishing giving a copy away from `Pull it`
   * beside it, and a reader who tabs straight into the group never meets that paragraph.
   */
  describedBy,
}: {
  card: ContestedCard;
  alsoAbove?: boolean;
  thisDeckId?: string;
  describedBy?: string;
}) {
  // OPTIMISTIC ON SUCCESS, AUTHORITATIVE ON REFUSAL. A pick moves the words and the marks on the
  // tap — there is no in-flight state, because a spinner on a control whose whole promise is
  // "one tap back" reads as heavier than the act. When the server refuses, its own fresh reading
  // of the row replaces the optimistic one: the refusal means the props are out of date, so
  // redrawing from them would show the player exactly the state that just lost.
  const [card, setCard] = useState(initial);
  const [refusal, setRefusal] = useState<AssignRefusal | null>(null);
  // The optimistic pick, for the window between the tap and the server's answer. A SET rather
  // than a scalar because the DATA can hold more than one granted row — a reservation written
  // before this rule existed, or by another tab — and the row has to draw what is there rather
  // than the first of it. What this component WRITES is always one: see `pick` below.
  // AUTHORSHIP ITSELF IS NOT STATE — see `chosenIds`.
  const [picked, setPicked] = useState<Set<string> | null>(null);
  // Which deck the player last tapped, kept only so a refusal can name the deck it refused. The
  // reservation set is not that: after a refusal clears the optimistic pick it holds whoever
  // already had one, which is a different deck and the wrong name to print.
  const [attempted, setAttempted] = useState<{ id: string; name: string } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [, startTransition] = useTransition();
  // A fresh server payload always wins, and is filed on its way past. Adjusted during render
  // rather than in an effect, or the previous allocation paints once before being corrected.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setCard(initial);
    setRefusal(null);
    setPicked(null);
  }

  // AUTHORSHIP IS A FACT ABOUT THE DATA, not a fact about this component's lifetime. A deck with
  // a GRANTED reservation is a deck the player chose — seniority grants nothing, it only orders a
  // queue — so reading it off the row survives the revalidation that follows every pick. Held in
  // state instead, the accent and the undo footer vanished the moment the server answered, which
  // is exactly when the player looks for confirmation that their tap landed.
  const chosenIds = picked ?? new Set(card.claimants.filter((c) => c.granted > 0).map((c) => c.deckId));
  const chosenNames = card.claimants.filter((c) => chosenIds.has(c.deckId)).map((c) => c.deckName);

  const pick = (deckId: string, deckName: string) => {
    const wasChosen = chosenIds.has(deckId);
    setRefusal(null);
    setAttempted({ id: deckId, name: deckName });
    // THE OPTIMISTIC SET SAYS ONLY WHAT THIS CLIENT KNOWS: that the deck just tapped is picked,
    // or is no longer. It does NOT predict which reservation the server will evict, and that is a
    // decision rather than an omission — three separate review findings turned out to be three
    // faces of one mistake, a client re-deriving the model's queue. The server resolves
    // reservations on `(created_at, deck_id)`, which is NOT the commit order this row is drawn
    // in, so a prediction made from these claimants is right only by luck. The returned card
    // carries the real allocation, and everything that depends on it waits for that.
    // ONE AUTHORED PICK AT A TIME, which is what the write does and what the group's
    // `aria-checked` promises: a pick moves the reservation rather than adding to it, so at most
    // one option is ever checked. Seniority allocates every other copy.
    setPicked(wasChosen ? new Set() : new Set([deckId]));
    startTransition(async () => {
      // `finally`, not a trailing statement: a thrown action — a dropped connection, an expired
      // session — exits this callback, and the optimistic accent and undo footer would then stand
      // forever behind a write whose outcome nobody knows. Standing the state down is the one
      // thing that must happen on every path out of here.
      try {
      const result = await assignCopy(card.oracleId, deckId);
      // THE LIVE READ CARRIES NO RECEIPT. `arrived` and `ownedBefore` are facts about the import
      // this row came from, and `loadContestedCard` has no import to read — it returns nought for
      // both. Taking its object whole would cost the row its cap, its mark shape and its
      // `keeps it` calculation on the first pick, so only the live half is merged.
      const fresh = result.card
        ? {
            ...result.card,
            // THE RECEIPT'S FIELDS ARE THE RECEIPT'S. An import row's `arrived` and `ownedBefore`
            // are frozen facts the live read cannot know, so they are carried across. The review
            // door has no receipt: there `arrived` was only ever the collection's own supply, and
            // carrying the old one would freeze the heading and the cap at first render while
            // `owned` moved underneath them. It takes the fresh figure instead.
            arrived: card.fromImport ? card.arrived : result.card.owned,
            ownedBefore: card.fromImport ? card.ownedBefore : 0,
            fromImport: card.fromImport,
          }
        : null;
      // Including when the live read came back null, which the action's own type allows: the
      // `finally` below is what makes that case, and a thrown one, stand down too.
      if (fresh) setCard(fresh);
      // ANNOUNCED FROM THE SERVER'S OWN ALLOCATION, once there is one. The trade is the news —
      // "X gets it, Y buys it" — and naming the loser before the server has decided who that is
      // announces a trade that may not have happened.
      if (result.ok && fresh) {
        const holder = fresh.claimants.find((c) => c.deckId === deckId);
        const lost = fresh.claimants.find((c) => c.deckId !== deckId && c.allocated === 0);
        setAnnounce(wasChosen
          ? copy.contested.announcedCleared(
              fresh.cardName,
              fresh.claimants.find((c) => c.allocated > 0)?.deckName ?? "",
            )
          : copy.contested.announcedPick(
              holder?.deckName ?? deckName,
              fresh.cardName,
              lost?.deckName ?? "",
            ));
      }
      if (!result.ok) {
        // `not-your-deck` is the one cause with NO sentence, deliberately — a player cannot reach
        // it from their own decks. Stored anyway it drew an empty red-ruled paragraph, which is
        // the undrawn state drawn. The optimistic pick still stands down; the shipped transport
        // treatment is what speaks for a request that should not have happened.
        setRefusal(result.cause === "not-your-deck" ? null : result.cause);
        // A refusal announces the on-screen sentence verbatim rather than a summary of it.
        // `fresh`, never `result.card`: the live read has no import behind it and so always
        // says `fromImport: false`, which would tell a reader ON THE RECEIPT that nothing
        // arrived. `fresh` is that same live card with this row's receipt facts merged back.
        const said = refusalSentence(result.cause, fresh ?? card, deckName);
        if (said) setAnnounce(said);
      }
      } catch {
        // Swallowed HERE and nowhere else: a thrown action is a transport failure, and the app's
        // shipped treatment for that is not a refusal sentence on this row — the three sentences
        // it owns each name a reason the server gave, and inventing a fourth for "we do not know"
        // would tell the player something the server never said. What matters is that the
        // optimistic state does not outlive the attempt, which the `finally` guarantees.
      } finally {
        // THE OPTIMISTIC SET ALWAYS STANDS DOWN. Authorship is read from data; this state exists
        // only for the window before there is any, and a throw closes that window too.
        setPicked(null);
      }
    });
  };
  // A commander's copy can never be given away, so a row where every copy is a commander's has
  // nothing to choose — and says so rather than drawing a queue nobody can change.
  const spare = Math.max(card.owned - card.claimants.reduce((n, c) => n + c.commanderCopies, 0), 0);
  const nothingToChoose = spare === 0;
  const folded = card.claimants.some((c) => c.commanderCopies > 0 && c.quantity > c.commanderCopies);
  // Copies that could go to any deck: the supply less what commanders hold, capped at what this
  // import brought. It sets the mark's shape as well as the cap, because both answer the same
  // question — how many copies are actually in play.
  const giveable = Math.min(spare, card.arrived);
  // THE NUMBER THIS ROW TALKS ABOUT, derived once.
  //
  // On the receipt it is the arrival: the whole point of that surface is what the import
  // brought, and its cap is deliberately measured against that. On the review door `arrived`
  // carries the total owned, which over-counts the moment a commander holds one of two copies —
  // the heading offered `Give the 2 copies to` while only one could actually move. There the
  // number is what is in play, which is also what the mark and the cap already used.
  //
  // It falls out of the LIVE half of the card — `owned` and the claimants, both replaced on
  // every server read — so the review door's figures track a collection that changes under it,
  // where the frozen `arrived` could not.
  const inPlay = card.fromImport ? card.arrived : giveable;
  // Capped at `inPlay` rather than `arrived`, or the cap could read `2 of 1` on the review door:
  // the numerator counts every non-commander allocation and the denominator is what can move.
  const givenOut = Math.min(
    card.claimants.reduce((n, c) => n + Math.max(c.allocated - c.commanderCopies, 0), 0),
    inPlay,
  );
  // WHICH DECKS HELD A COPY BEFORE THIS IMPORT, per claimant rather than as a fact about the
  // collection. `ownedBefore > 0` is not enough on its own: with one old copy, an earlier list
  // claimant and a later commander claimant, the queue gives the old copy to the list deck and
  // the arriving one to the commander — so the commander did NOT keep anything, however true it
  // is that a copy existed. Re-running the same queue over the pre-import supply answers it.
  //
  // ONE LIMITATION, stated rather than hidden: `ownedBefore` is an aggregate, and the claimants
  // are read LIVE, so a deck that joined the queue after the import can be handed one of the
  // pre-import copies by this reconstruction and read as `keeps it`. Storing the per-deck
  // pre-import holders would fix it and is not done here — `keeps it`'s semantics were ruled a
  // design question at review round 10, and this is the same word. It is wrong only for a deck
  // that both joined after the import and outranks an original holder.
  const heldBefore = new Set<string>();
  {
    let left = card.ownedBefore;
    for (const c of card.claimants) {
      const took = Math.min(c.quantity, left);
      if (took > 0) heldBefore.add(c.deckId);
      left -= took;
    }
  }
  // The deck the shortage actually falls on — the one whose ask is not covered. Naming the
  // first commander claimant instead points at a deck that is keeping its copy, which is the
  // opposite of what the note says about it.
  const payer = card.claimants.find((c) => c.allocated < c.quantity)?.deckName ?? "";
  const words = surfaceWords(card.fromImport);

  return (
    <div
      className="p-[12px_13px]"
      style={{ border: "1px solid var(--border)", borderRadius: 11, background: "var(--surface)" }}
    >
      <div className="flex items-baseline justify-between gap-[10px]">
        <span className="text-[13.5px] font-semibold min-w-0 truncate" style={{ color: "var(--fg)" }}>
          {card.cardName}
        </span>
        <span className="font-mono text-[10.5px] md:text-[11px] flex-none" style={{ color: "var(--fg-faint)" }}>
          {/* `1 new copy` is a fact about an ARRIVAL. On the review page nothing arrived — the
              reader is editing a draft — so the same line states the supply instead. */}
          {words.supply(inPlay, card.claimants.length)}
        </span>
      </div>

      <p
        className="font-mono text-[10px] uppercase tracking-[0.13em] mt-[9px] mb-[7px]"
        style={{ color: "var(--fg-body)" }}
      >
        {nothingToChoose
          ? copy.contested.headingInert
          : folded
            ? copy.contested.headingSpare
            : words.heading(inPlay)}
        {/* The cap, stated beside the heading whenever it is above one — seniority has already
            given every copy away before any pick, so the figure is true in both states. */}
        {!nothingToChoose && inPlay > 1 ? (
          <span className="ml-[8px] normal-case tracking-normal" style={{ color: "var(--fg-faint)" }}>
            {copy.contested.cap(givenOut, inPlay)}
          </span>
        ) : null}
      </p>

      <ul
        className="list-none p-0 m-0 flex flex-col gap-[4px]"
        role="radiogroup"
        aria-label={words.group(card.cardName, inPlay)}
        aria-describedby={describedBy}
      >
        {card.claimants.map((c) => {
          // `keeps it` rather than `gets it` for a commander: it had the card before the import,
          // so the arrival changed nothing for it. A folded claimant that ALSO took a spare copy
          // says both — `keeps it` alone would hide the second copy and contradict the heading,
          // which has just said there is a spare to give.
          const spareToThisDeck = c.allocated - Math.min(c.commanderCopies, c.allocated);
          // `keeps it` says the deck had the card BEFORE the import, so it is only available
          // when a copy predates it. A first arrival landing on a commander's claim is a deck
          // that GETS the card, however protected that copy is from here on.
          const predates = heldBefore.has(c.deckId);
          // An option nobody can choose: a commander-only claimant, or any option on a card with
          // no spare copy at all. A folded claim is NOT inert — its spare is live.
          const inert = nothingToChoose || c.commanderCopies >= c.quantity;
          const first = card.claimants.find((x) => !(nothingToChoose || x.commanderCopies >= x.quantity))?.deckId === c.deckId;
          const outcome = c.commanderCopies > 0 && c.allocated > 0 && predates
            ? (spareToThisDeck > 0
                ? copy.contested.keepsAndGets(Math.min(c.commanderCopies, c.allocated), spareToThisDeck)
                : copy.contested.keeps)
            : c.allocated > 0 ? copy.contested.gets : copy.contested.buys;
          return (
            <li
              key={c.deckId}
              // `aria-checked` is the whole authorship model: checked means YOU chose this.
              // A filled mark on an unchecked option means the deck holds a copy by default,
              // which is a different fact and must not read as a selection.
              role="radio"
              aria-checked={chosenIds.has(c.deckId)}
              aria-disabled={inert || undefined}
              tabIndex={inert ? -1 : chosenIds.has(c.deckId) || (chosenIds.size === 0 && first) ? 0 : -1}
              aria-label={
                c.commanderCopies >= c.quantity
                  ? copy.contested.a11yCommander(c.deckName, card.cardName)
                  : chosenIds.has(c.deckId)
                    ? copy.contested.a11ySelected(c.deckName)
                    : copy.contested.a11yOption(c.deckName, outcome)
              }
              onClick={inert ? undefined : () => pick(c.deckId, c.deckName)}
              // A radiogroup is reached by Tab and traversed by ARROWS — every option but one
              // carries `tabIndex={-1}`, so without this a keyboard reader can see the group and
              // never reach the second deck in it. Roving focus, wrapping at both ends, skipping
              // the options nobody can choose.
              onKeyDown={inert ? undefined : (e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  pick(c.deckId, c.deckName);
                  return;
                }
                const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1
                  : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
                if (step === 0) return;
                e.preventDefault();
                const reachable = card.claimants.filter(
                  (x) => !(nothingToChoose || x.commanderCopies >= x.quantity),
                );
                const here = reachable.findIndex((x) => x.deckId === c.deckId);
                const next = reachable[(here + step + reachable.length) % reachable.length];
                if (!next) return;
                const el = e.currentTarget.parentElement?.querySelector<HTMLElement>(
                  `[data-deck="${next.deckId}"]`,
                );
                el?.focus();
              }}
              data-deck={c.deckId}
              // 52px two-line on a phone, 44px one-line from `md` — the handoff's own targets,
              // stated rather than left to padding. `items-start` and `items-center` were both
              // present, which resolves by utility order rather than by intent.
              className="flex flex-col justify-center md:flex-row md:items-center gap-[1px] md:gap-[11px] py-[6px] px-[8px] min-h-[52px] md:min-h-[44px]"
              style={{
                borderRadius: 7,
                background: "var(--bg)",
                // A dashed border marks an option nobody can choose: a commander-only claimant,
                // or any row on a card with no spare copy at all. NOT a folded claim — that one
                // keeps its commander half and its spare is live, so it stays an ordinary option.
                border: inert
                  ? "1px dashed var(--border)"
                  // Accent ONLY on a pick. Accent means "you chose this" everywhere in this app,
                  // so an option wearing it by default would claim an authorship nobody has.
                  : chosenIds.has(c.deckId)
                    ? "1px solid var(--accent)"
                    : "1px solid transparent",
                cursor: inert ? "default" : "pointer",
              }}
            >
              <span className="flex items-center gap-[11px] md:gap-[11px] md:flex-1 min-w-0">
                <AllocationMark
                  allocated={c.allocated}
                  // The GIVEABLE count, not the arrival count. Two copies can arrive with one
                  // consumed by a commander, leaving one that can actually be assigned — and a
                  // square mark there promises two decks can each have one.
                  copies={giveable}
                  commander={c.commanderCopies > 0}
                  // The accent belongs on the MARK as much as on the border: the mark is the
                  // control, and a pick whose only confirmation is a hairline is the weakest
                  // signal on the row.
                  picked={chosenIds.has(c.deckId)}
                />
                {/* Truncation only from `md`. At phone width this cell is stretched to the row,
                    and a deck name — the shared limit is 120 characters — would be ellipsised
                    rather than taking the second line the design gives it. */}
                <span className="text-[13px] min-w-0 md:truncate" style={{ color: "var(--fg)" }}>
                {c.deckName}
                {c.deckId === thisDeckId ? (
                  <span
                    className="font-mono text-[10px] ml-[6px] px-[5px] py-[1px] align-middle"
                    style={{ borderRadius: 4, background: "var(--surface-inset)", color: "var(--fg-body)" }}
                  >
                    {copy.contested.thisDeck}
                  </span>
                ) : null}
                {c.commanderCopies > 0 ? (
                  <span
                    className="font-mono text-[10px] ml-[6px] px-[5px] py-[1px] align-middle"
                    style={{ borderRadius: 4, background: "var(--surface-inset)", color: "var(--fg-body)" }}
                  >
                    {copy.contested.commanderTag}
                  </span>
                ) : null}
                </span>
              </span>
              <span className="flex items-center gap-[8px] md:flex-none pl-[27px] md:pl-0">
                {c.versionNumber !== null ? (
                  <span className="font-mono text-[10.5px] md:text-[11px]" style={{ color: "var(--fg-faint)" }}>
                    {copy.contested.stamp(c.versionNumber, stampDate(c.since))}
                  </span>
                ) : null}
                <span
                  className="font-mono text-[10.5px] md:text-[11px]"
                  style={{ color: c.allocated > 0 ? "var(--success)" : "var(--avail-over-fg)" }}
                >
                  {outcome}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* A brew is named and excluded in one line. Omitting it silently would make the supply
          count above quietly wrong; listing it as an option would invite a certain refusal. */}
      {card.brewNames.length === 1 ? (
        <p className="text-[11px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
          {copy.contested.brewNote(card.brewNames[0])}
        </p>
      ) : card.brewNames.length > 1 ? (
        <p className="text-[11px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
          {copy.contested.brewNoteMany(card.brewNames.length)}
        </p>
      ) : null}

      {nothingToChoose ? (
        <p className="text-[11px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
          {copy.contested.commanderNote(payer)}
        </p>
      ) : folded ? (
        <p className="text-[11px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
          {copy.contested.commanderNoteFolded(
            card.claimants.find((c) => c.commanderCopies > 0)?.deckName ?? "",
          )}
        </p>
      ) : null}

      {/* THE FOOTER IS REQUIRED WHEREVER THE CHOOSER APPEARS. It is the feature's only non-colour
          carrier of authorship — it NAMES THE DECK, where a plate could only say that something
          was chosen — and in the two themes where accent sits in a neighbouring hue family it is
          the only thing separating a pick from an outcome. A refusal note supersedes it: that
          sentence already names the holder and the way back, and two competing instructions on
          one row is worse than one. */}
      {refusal ? (
        <p
          className="text-[11.5px] mt-[9px] mb-0 pl-[9px]"
          style={{ color: "var(--fg-body)", borderLeft: "3px solid var(--danger)" }}
        >
          {/* The deck the player TAPPED, not whoever holds a reservation now: after a refusal
              clears the optimistic pick, the latter is a different deck and the wrong name. */}
          {refusalSentence(refusal, card, attempted?.name ?? "")}
        </p>
      ) : chosenNames.length > 0 ? (
        <p className="flex flex-col md:flex-row md:items-baseline gap-[2px] md:gap-[10px] text-[11.5px] mt-[9px] mb-0"
           style={{ color: "var(--fg-body)" }}>
          <span>{copy.contested.undoHint(chosenNames.join(" and "))}</span>
          <button
            type="button"
            onClick={() => {
              // Clears every reservation on this card, which is what `Back to first committed`
              // says: one press returns the whole row to the default, not the newest pick only.
              for (const c of card.claimants.filter((x) => chosenIds.has(x.deckId))) {
                pick(c.deckId, c.deckName);
              }
            }}
            // 34px tall inside a 44px target, per the handoff.
            className="font-mono text-[11px] text-left text-[color:var(--accent)] min-h-[44px] md:min-h-0 md:py-[5px]"
          >
            {copy.contested.clear}
          </button>
        </p>
      ) : null}

      {/* One announcement per settled pick and one per refusal, and no more. */}
      <span aria-live="polite" className="sr-only">{announce}</span>

      {alsoAbove ? (
        <p className="text-[11px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
          {copy.summary.alsoAbove(STILL_SECTION_LABEL)}
        </p>
      ) : null}
    </div>
  );
}
