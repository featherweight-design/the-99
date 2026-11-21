"use client";
// One contested card: how many copies arrived, and every committed deck that wants one, in the
// order that decides who gets them.
//
// THE ROW IS AN INTERACTIVE CHOOSER. The options are in commit order, each carrying the
// version stamp the order derives from, and each saying what it gets under the default — the
// deck that committed the card first, unless the player says otherwise with `assignCopy`.
//
// MOUNTED ON THE IMPORT SUMMARY alone, as of 2026-10-04 (Hugh, no Design round — a removal).
// It also mounted on `/decks/[id]/changes`, under each contested row; that door was removed
// (`review-changes.tsx` no longer imports this component), and a replacement chooser for that
// surface is going to Design separately. The component itself is untouched, and still supports
// `fromImport: false` for whenever that door returns.
//
// THE ORDER IS THE EXPLANATION, so `this deck` is tagged and never promoted: moving a player's
// own deck to the top would hide why it lost.

import { useEffect, useRef, useState, useTransition } from "react";
import { cardAssignmentsCopy as copy } from "../../lib/copy/card-assignments";
import { addedCopyCopy } from "../../lib/copy/added-copy";
import { previewAllocation } from "../../lib/decks/preview-allocation";
import { foldCount } from "../../lib/decks/placements";
import { assignCopy, type AssignRefusal } from "../../app/decks/assignment-actions";
import type { ContestedCard } from "../../lib/collection/summary-read";
import { formatShortDeckDate } from "../../lib/decks/format";
import { useZone } from "../zone-context";


/**
 * `deck_version_cards.since`, epoch millis, as the stamp draws it.
 *
 * Through `formatShortDeckDate`, which already owns both of this app's date rules — en-US month
 * names because en-GB writes `Sept`, and UTC because the column carries no zone. A second
 * formatter here would drift from the version rail's.
 */
function stampDate(since: number | null, zone: string | null): string {
  return since === null ? "" : formatShortDeckDate(new Date(since), zone);
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
export function AllocationMark({
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

/**
 * A server refusal, or the row's own: `already-has-copy` is decided on the tap and never written.
 */
type RowRefusal = AssignRefusal | "already-has-copy";

/** A deck holding its whole ask, with nothing a reservation could add: not a brew, not a commander-only claim. */
function holdsItsCopy(c: ContestedCard["claimants"][number] | undefined): boolean {
  return c !== undefined && !c.brew && c.commanderCopies < c.quantity && c.allocated >= c.quantity;
}

/** The on-screen sentence for a named refusal — announced verbatim, never summarised. */
function refusalSentence(cause: RowRefusal, card: ContestedCard, deckName: string): string {
  const holder = card.claimants.find((c) => c.allocated > 0)?.deckName ?? "";
  switch (cause) {
    case "already-has-copy":
      return copy.contested.refusedAlreadyHas(deckName, card.cardName);
    case "claimant-no-longer-asks":
      return copy.contested.refusedNotWanted(deckName, card.cardName, holder);
    case "no-supply-left":
      // Reachable on the review page too — a race, or a pick made while another tab took the
      // last copy — and nothing arrived there at all.
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
  /** The deck whose page this row is on, when it is on one. Tagged, never promoted. */
  thisDeckId,
  /**
   * An element naming what this chooser is FOR, when its surface draws one. On the review page
   * the caption above the row is the only thing distinguishing giving a copy away from `Pull it`
   * beside it, and a reader who tabs straight into the group never meets that paragraph.
   */
  describedBy,
  chooser,
  addedCopy = false,
  onCard,
  onWrite,
  onPending,
  onUnknown,
  externalPick = false,
  onBeforePick,
  writesOut = false,
}: {
  card: ContestedCard;
  thisDeckId?: string;
  describedBy?: string;
  /**
   * The all-decks cart's S1b chooser: the row previews a purchase rather than moving a reservation.
   * The pick is the caller's, written with the purchase (`markBoughtForDecks`), so a tap here writes
   * nothing; `card.owned` is the copies being bought, and the marks draw the model's own allocation
   * with the pick moved, exactly as the optimistic preview does.
   */
  chooser?: {
    picked: string | null;
    onPick: (deckId: string | null) => void;
    /** The announcement for a cleared pick: the caller's default order, which may not be commit order. */
    cleared: (holder: string) => string;
    /** The caller's write is in flight: a tap does nothing until it settles. */
    disabled?: boolean;
  };
  /**
   * Where an added copy goes (collection edit on, read by the page): senior decks that keep their
   * copies whatever the pick does fold into one line that is never an option, and a brew reading a loose copy says
   * `can use it` rather than `gets it`. Off, the row is exactly what it was.
   */
  addedCopy?: boolean;
  /**
   * The card a settled pick read back, for a surface that redraws its own line from it. Null when
   * the write settled and the live read found no card (the last copy went in another tab).
   */
  onCard?: (card: ContestedCard | null) => void;
  /**
   * A write that landed, in the order they settle: whether it left a pick on `deckId`. The write is
   * a toggle (a press writes a pick, moves the one standing, or clears it), so `picked` is read off
   * the card it read back, and only without one is it taken from the press. Every landed write is
   * reported, a superseded one included: it changed the stored pick whether or not it is drawn.
   */
  onWrite?: (deckId: string, picked: boolean, createdAt?: string) => void;
  /**
   * Each write as it starts (true) and as it settles (false), one call each, so a caller counting
   * them across row instances (a chooser closed and reopened) knows when none is out. A caller whose
   * own action depends on where the pick ends up (the receipt's Undo) holds until then.
   */
  onPending?: (pending: boolean) => void;
  /**
   * A write that threw: it may have committed, and nothing says which pick it left. A caller whose
   * own action depends on the pick (the receipt's Undo) holds until a later write lands.
   */
  onUnknown?: () => void;
  /**
   * The player has picked a deck in the Other decks group (Move a copy, #2980), so one copy is spoken for there.
   * The listed decks draw as if it were out of the supply, and the pick counts toward the cap.
   *
   * ONE COPY: one choice spans both groups, so none here is checked, and a tap SETS the pick rather than
   * toggling it: a stored reservation that the Other pick left standing must not be undone by the very tap that
   * replaces the Other pick. TWO OR MORE (several picks): it is one pick among the rest, the listed picks stay
   * checked, and a tap adds or unticks as it would without it.
   */
  externalPick?: boolean;
  /** Fired on a tap while `externalPick` stands on a one-copy card, before the write, so the caller can drop its own pick first. */
  onBeforePick?: () => void;
  /**
   * A write from an earlier row (a chooser closed and opened again) is still out, so `card` is not the server's
   * reading: the row then writes every press, never deciding from it that a press changes nothing.
   */
  writesOut?: boolean;
}) {
  const zone = useZone();
  // OPTIMISTIC ON SUCCESS, AUTHORITATIVE ON REFUSAL. A pick moves the words and the marks on the
  // tap — there is no in-flight state, because a spinner on a control whose whole promise is
  // "one tap back" reads as heavier than the act. When the server refuses, its own fresh reading
  // of the row replaces the optimistic one: the refusal means the props are out of date, so
  // redrawing from them would show the player exactly the state that just lost.
  const [card, setCard] = useState(initial);
  const [refusal, setRefusal] = useState<RowRefusal | null>(null);
  // The optimistic picks, for the window between the tap and the server's answer: every deck the
  // player has picked, since a card with two or more copies takes a pick per copy (several picks,
  // 2026-11-21). A one-copy card holds one at most. AUTHORSHIP ITSELF IS NOT STATE — see `chosenIds`.
  const [picked, setPicked] = useState<Set<string> | null>(null);
  // Which deck the player last tapped, kept only so a refusal can name the deck it refused. The
  // reservation set is not that: after a refusal clears the optimistic pick it holds whoever
  // already had one, which is a different deck and the wrong name to print.
  const [attempted, setAttempted] = useState<{ id: string; name: string } | null>(null);
  const [announce, setAnnounce] = useState("");
  const group = useRef<HTMLUListElement>(null);
  // The all-picked line: a select past the cap moves focus here, so the reader hears why nothing moved.
  const full = useRef<HTMLParagraphElement>(null);
  // THE OPTION THAT HAD FOCUS. A write can fold the deck a keyboard reader is on (clearing a
  // holder's pick lets it fold), and removing the focused option drops focus to the document. The
  // effect after the fold below hands it to the group's reachable option instead.
  const focusedDeck = useRef<string | null>(null);
  // WHICH TAP IS STILL THE CURRENT ONE. Next dispatches Server Actions one at a time per client
  // (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, "Sequential dispatch on
  // the client"), so the WRITES cannot race or land out of order. The taps are not serialised
  // though, and neither are they the only thing that can supersede a write: a fresher payload
  // arriving from the server does it too. Both advance this, and a write whose number is stale
  // neither draws its answer nor stands anything down.
  const tap = useRef(0);
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
  // AND THE IN-FLIGHT WRITE LOSES ITS CLAIM ON THIS ROW. Adopting new props supersedes a pending
  // write exactly as a newer tap does: its answer is an older reading, and drawing it would undo
  // the fresher one.
  //
  // IN AN EFFECT, NOT IN THE RENDER ABOVE. The token is a ref, and a ref mutated during render
  // survives a render React abandons — a concurrent update that starts with a new payload and
  // is dropped would retire a write whose props never committed, and that write would then
  // decline to stand its own preview down, leaving the accent stuck on the row for good. An effect runs only after a commit, so an abandoned render moves nothing.
  useEffect(() => {
    tap.current += 1;
  }, [initial]);

  // A commander's copy can never be given away, so a row where every copy is a commander's has
  // nothing to choose — and says so rather than drawing a queue nobody can change. Only a
  // COMMITTED commander holds its copy (not `brew`); a brew led by the card claims it softly and
  // sets no ceiling, exactly as the claim model's `commander_copies_committed` reads it.
  const spare = Math.max(
    card.owned - card.claimants.reduce((n, c) => n + (c.brew ? 0 : c.commanderCopies), 0),
    0,
  );
  const nothingToChoose = spare === 0;
  const folded = card.claimants.some((c) => c.commanderCopies > 0 && c.quantity > c.commanderCopies);
  // Copies that could go to any deck: the supply less what commanders hold, capped at what this
  // import brought. It sets the mark's shape as well as the cap, because both answer the same
  // question — how many copies are actually in play.
  const giveable = Math.min(spare, card.arrived);
  // SEVERAL PICKS, one per copy, once two or more copies can move (addendum, 2026-11-21). One copy
  // is unchanged: one pick, and a select on another deck moves it. The cart's chooser holds one
  // pick of its own whatever the count, so it is never several.
  const multi = giveable >= 2 && !chooser;
  // AUTHORSHIP IS A FACT ABOUT THE DATA, not a fact about this component's lifetime. A deck with
  // a GRANTED reservation is a deck the player chose — seniority grants nothing, it only orders a
  // queue — so reading it off the row survives the revalidation that follows every pick. Held in
  // state instead, the accent vanished the moment the server answered, which
  // is exactly when the player looks for confirmation that their tap landed.
  const chosenIds = chooser
    ? new Set(chooser.picked ? [chooser.picked] : [])
    : picked ?? (externalPick && !multi ? new Set<string>() : new Set(card.claimants.filter((c) => c.granted > 0).map((c) => c.deckId)));
  // Every pick standing, the Other decks one included: it is a pick and counts toward the cap.
  const pickCount = chosenIds.size + (externalPick ? 1 : 0);
  const allPicked = multi && pickCount >= giveable;

  const pick = (deckId: string, deckName: string) => {
    const wasChosen = chosenIds.has(deckId);
    if (chooser) {
      if (chooser.disabled) return;
      // Nothing to write: the caller holds the pick and sends it with the purchase. Announced from
      // the same preview the marks draw, since there is no server answer to wait for.
      const next = wasChosen ? null : deckId;
      chooser.onPick(next);
      const preview = previewAllocation(card.claimants, card.owned, new Set(next ? [next] : []));
      setAnnounce(next === null
        ? chooser.cleared(preview.find((c) => c.allocated > 0)?.deckName ?? "")
        : copy.contested.announcedPick(
            deckName, card.cardName, preview.find((c) => c.deckId !== deckId && c.allocated < c.quantity)?.deckName ?? "",
          ));
      return;
    }
    setRefusal(null);
    setAttempted({ id: deckId, name: deckName });
    // EVERY COPY IS PICKED: a select on an unpicked deck writes nothing. The line under the rows
    // already says so; focus goes to it and it is announced, so a reader who could not see it
    // hears why nothing moved. The server refuses the same select (`all-picked`) if it gets there.
    if (allPicked && !wasChosen) {
      setAnnounce(copy.contested.allPicked(giveable));
      full.current?.focus();
      return;
    }
    // A PICK NAMES WHO GETS A COPY, never who gives one up. A deck that holds its copy now AND
    // would hold it with no reservation at all gains nothing from the one reservation moving onto
    // it. The move only takes the reservation off the deck that holds it, which leaves the same
    // allocation as clearing that pick, and a press on the checked deck already does that. Written
    // anyway, it lit the accent on a deck that changed nothing (Hugh's Fabled Passage, 2026-11-21),
    // so it is said, not written. One copy only: with two or more, a select on a deck that already
    // gets it PINS it (it keeps its copy whatever is picked later), which is a real change.
    // Not while an Other decks pick stands: there the press replaces that pick, which is a real
    // change. Not while a write is in flight, this row's or an earlier row's (`writesOut`): `claimants` is then a
    // preview, or the purchase-time card, not the server's.
    if (!multi && !wasChosen && !externalPick && !writesOut && picked === null) {
      const baseline = previewAllocation(card.claimants, card.owned, new Set());
      if (holdsItsCopy(claimants.find((c) => c.deckId === deckId)) && holdsItsCopy(baseline.find((c) => c.deckId === deckId))) {
        setRefusal("already-has-copy");
        setAnnounce(copy.contested.refusedAlreadyHas(deckName, card.cardName));
        return;
      }
    }
    const replacing = externalPick && !multi;
    // ONE PICK MOVES. The server caps picks at every copy owned, and a receipt row caps them at the
    // copies its import brought, so a one-copy row names the deck it is moving the pick from: the
    // write then moves it, as drawn, instead of adding a second pick this row cannot show.
    const movesFrom = !multi && !wasChosen && chosenIds.size === 1 ? [...chosenIds][0] : undefined;
    if (replacing) onBeforePick?.();
    // What the row drew at the tap, so the announcement can name who lost or regained a copy.
    const before = claimants;
    // THE OPTIMISTIC SET SAYS WHERE THE GRANT WENT, and nothing else. The allocation that
    // follows from it is not guessed: `previewAllocation` runs the model's own `allocate` over
    // these claimants with the grants set, so the marks can move on the tap. What is still never
    // predicted is which pick the server would displace at the cap: with two or more copies the
    // row refuses that select above, and with one the pick simply moves. The returned card
    // replaces all of it the moment it lands.
    if (multi) {
      const next = new Set(chosenIds);
      if (wasChosen) next.delete(deckId);
      else next.add(deckId);
      setPicked(next);
    } else {
      setPicked(wasChosen ? new Set() : new Set([deckId]));
    }
    const mine = ++tap.current;
    onPending?.(true);
    startTransition(async () => {
      // `finally`, not a trailing statement: a thrown action — a dropped connection, an expired
      // session — exits this callback, and the optimistic accent would then stand
      // forever behind a write whose outcome nobody knows. Standing the state down is the one
      // thing that must happen on every path out of here.
      try {
      const result = replacing
        ? await assignCopy(card.oracleId, deckId, "set")
        : movesFrom
          ? await assignCopy(card.oracleId, deckId, undefined, movesFrom)
          : await assignCopy(card.oracleId, deckId);
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
            // The receipt's time is the receipt's too: the live read has none, and the fold needs it after a pick.
            receiptAt: card.receiptAt,
          }
        : null;
      // Including when the live read came back null, which the action's own type allows: the
      // `finally` below is what makes that case, and a thrown one, stand down too.
      if (result.ok) onWrite?.(deckId, fresh ? (fresh.claimants.find((c) => c.deckId === deckId)?.granted ?? 0) > 0 : !wasChosen, result.createdAt);
      // A superseded tap's answer is DISCARDED rather than drawn: the player has since named a
      // different deck, and its own write — already queued behind this one — is the truth now.
      if (mine !== tap.current) return;
      if (fresh) setCard(fresh);
      // A SETTLED NULL IS NEWS TOO when the refusal says the last copy went in another tab
      // (`no-supply-left`, and the live read found no card): a surface redrawing its own line from
      // the read-back card has to hear it, or it keeps naming a destination that no longer exists.
      // Any other null (a read that failed, a deck that is not the player's) says nothing new.
      if (fresh || (!result.ok && result.cause === "no-supply-left")) onCard?.(fresh);
      // ANNOUNCED FROM THE SERVER'S OWN ALLOCATION, once there is one. The trade is the news —
      // "X gets it, Y buys it" — and naming the loser before the server has decided who that is
      // announces a trade that may not have happened.
      if (result.ok && fresh) {
        // Read off the change, not the end state: who held a copy at the tap and does not now,
        // or the reverse. A deck that was already buying it is not news.
        const had = new Set(before.filter((c) => c.allocated > 0).map((c) => c.deckId));
        const holder = fresh.claimants.find((c) => c.deckId === deckId);
        setAnnounce(wasChosen
          ? copy.contested.announcedUntick(
              deckName,
              fresh.claimants.find((c) => c.deckId !== deckId && c.allocated > 0 && !had.has(c.deckId))?.deckName ?? null,
            )
          : copy.contested.announcedPick(
              holder?.deckName ?? deckName,
              fresh.cardName,
              fresh.claimants.find((c) => c.deckId !== deckId && c.allocated === 0 && had.has(c.deckId))?.deckName ?? null,
            ));
      }
      if (!result.ok && result.cause === "all-picked") {
        // Every copy was picked by the time the write landed (another tab): the read-back card
        // draws the all-picked line, and the reader is taken to it exactly as a select at the cap is.
        setAnnounce(copy.contested.allPicked(giveable));
        requestAnimationFrame(() => full.current?.focus());
      } else if (!result.ok) {
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
        onUnknown?.();
      } finally {
        // THE OPTIMISTIC SET ALWAYS STANDS DOWN — but only for the LATEST tap. Authorship is read
        // from data; this state exists only for the window before there is any, and a throw
        // closes that window too. An earlier tap finishing must leave a newer preview where it
        // is, or the row falls back to the props while that newer write is still queued.
        //
        // UNTESTED, deliberately and not quietly: reaching it needs two Server Action promises
        // held open across a React transition, and that shape strands the jsdom teardown however
        // the assertions are written — three spellings of it hung on the harness rather than on
        // the assertion. The sibling guard above IS covered, by the superseded-answer case.
        if (mine === tap.current) setPicked(null);
        onPending?.(false);
      }
    });
  };
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
  // THE MARKS MOVE ON THE TAP, not on the round trip. `picked` is non-null only while a write is
  // in flight, and for that window the row draws the allocation the pick is about to produce —
  // otherwise the deck that is losing the copy stays filled until the server answers, and the
  // reader sees two full marks for a card with one copy. Replaced by the server's own reading
  // the moment it lands, and stood down with `picked` on a refusal or a throw, so a wrong guess
  // could only ever survive one round trip.
  //
  // The Other decks pick holds one copy the listed decks cannot have: the model's own allocation
  // over the rest. On a one-copy card a listed tap replaces that pick, so its preview has it back.
  const outside = externalPick && (multi || !picked) ? 1 : 0;
  const claimants = chooser
    ? previewAllocation(card.claimants, card.owned, chosenIds)
    : picked || outside
      ? previewAllocation(card.claimants, Math.max(card.owned - outside, 0), chosenIds)
      : card.claimants;
  // Capped at `inPlay` rather than `arrived`, or the cap could read `2 of 1` on the review door:
  // the numerator counts every non-commander allocation and the denominator is what can move.
  const givenOut = Math.min(
    // A brew holds only the copy it was given; its soft share of the leftover is not given out.
    claimants.reduce((n, c) => n + (c.brew ? c.granted : Math.max(c.allocated - c.commanderCopies, 0)), 0)
      // The Other decks pick is a copy given out too (not while a listed one-copy tap replaces it).
      + outside,
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
  const payer = claimants.find((c) => c.allocated < c.quantity)?.deckName ?? "";
  const words = surfaceWords(card.fromImport);
  // THE FOLD (added copy, G7): committed decks at the head of the queue that keep their copies
  // whatever this pick does. Read off the SERVER's claimants, never the preview: a pick cannot move
  // them, so they are never options: the chooser lists only the decks that want the copy (Hugh,
  // 2026-10-16: `Show` drew a deck that already had the card as `gets it`, beside the drafts that
  // wanted it). One holder folds as well as twenty, and nothing draws them again.
  // `giveable`, not every arrival: a copy locked as a commander is one no pick can move either.
  // NOT WITH SEVERAL PICKS: picks beat commit order, so with every copy picked the oldest deck can
  // be the one that buys it (P5). No deck keeps its copy whatever is picked, so none folds.
  const foldN = addedCopy && !chooser && !multi && !nothingToChoose ? foldCount(card.claimants, giveable, card.owned, card.receiptAt) : 0;
  const folding = foldN >= 1;
  const foldedIds = new Set(folding ? card.claimants.slice(0, foldN).map((c) => c.deckId) : []);
  useEffect(() => {
    const id = focusedDeck.current;
    const ul = group.current;
    if (id === null || ul === null) return;
    if (ul.querySelector(`[data-deck="${CSS.escape(id)}"]`)) return;
    focusedDeck.current = null;
    // Only when focus really fell to the document: a reader who has moved on keeps their place.
    if (document.activeElement && document.activeElement !== document.body) return;
    ul.querySelector<HTMLElement>('[data-deck][tabindex="0"]')?.focus();
  }, [foldN]);
  const thisDeckName = card.claimants.find((c) => c.deckId === thisDeckId && !foldedIds.has(c.deckId))?.deckName ?? null;
  // A brew reading a loose copy as its own: every brew reads the same copy, so `gets it` on three
  // brews would claim three copies and `buys it` would be false. Only while collection edit is on.
  const canUse = (c: (typeof claimants)[number]) => addedCopy && c.brew === true && c.granted === 0 && c.allocated > 0;
  const canUseCount = claimants.filter(canUse).length;
  // WHO GIVES IT UP FIRST: the newest unpicked deck holding a copy, the one the next pick takes it
  // from. Only while a deck buys it and a pick is left; never a commander-only claim or a soft share.
  const optionable = (c: (typeof claimants)[number]) => !foldedIds.has(c.deckId) && !nothingToChoose && c.commanderCopies < c.quantity;
  const givesUpId = multi && !allPicked && claimants.some((c) => optionable(c) && !canUse(c) && c.allocated < c.quantity)
    ? claimants.filter((c) => optionable(c) && !canUse(c) && !chosenIds.has(c.deckId) && c.allocated > 0 && c.allocated > c.commanderCopies).at(-1)?.deckId ?? null
    : null;

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
            {/* Picks once any stands (several picks); with none, what seniority gave out. */}
            {multi && pickCount > 0 ? copy.contested.capPicked(pickCount, giveable) : copy.contested.cap(givenOut, inPlay)}
          </span>
        ) : null}
      </p>

      <ul
        className="list-none p-0 m-0 flex flex-col gap-[4px]"
        ref={group}
        onFocus={(e) => {
          focusedDeck.current = (e.target as HTMLElement).closest("[data-deck]")?.getAttribute("data-deck") ?? null;
        }}
        onBlur={(e) => {
          // A move out of the group forgets the option. A removal sends no related target, so it is kept.
          const to = e.relatedTarget as Node | null;
          if (to !== null && !e.currentTarget.contains(to)) focusedDeck.current = null;
        }}
        // A CHECKBOX GROUP WITH TWO OR MORE COPIES: several options can be checked at once, which
        // a radiogroup cannot say. One copy is one pick, and stays a radiogroup.
        role={multi ? "group" : "radiogroup"}
        aria-label={words.group(card.cardName, inPlay)}
        aria-describedby={describedBy}
      >
        {folding ? (
          // ONE ROW FOR THE DECKS NO PICK HERE CAN MOVE. Inside the group as a presentation row,
          // not an option: it names who already has theirs, and offers nothing to press.
          <li
            role="presentation"
            className="flex items-center gap-[9px] py-[6px] px-[8px] min-h-[44px]"
            style={{ borderRadius: 7, border: "1px dashed var(--border)" }}
          >
            <span className="font-mono text-[11px] flex-1 min-w-0" style={{ color: "var(--fg-faint)" }}>
              {addedCopyCopy.chooser.fold(foldN, thisDeckName)}
            </span>
          </li>
        ) : null}
        {claimants.filter((c) => !foldedIds.has(c.deckId)).map((c) => {
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
          // The chooser's caller has a write in flight: every option is held, and says so, without
          // the dashed border that means nobody can ever choose it.
          const held = inert || chooser?.disabled === true;
          const first = card.claimants.find((x) => !foldedIds.has(x.deckId) && !(nothingToChoose || x.commanderCopies >= x.quantity))?.deckId === c.deckId;
          const soft = canUse(c);
          const mine = chosenIds.has(c.deckId);
          const outcome = soft
            ? addedCopyCopy.chooser.canUse
            : c.commanderCopies > 0 && c.allocated > 0 && predates
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
              role={multi ? "checkbox" : "radio"}
              aria-checked={chosenIds.has(c.deckId)}
              aria-disabled={held || undefined}
              tabIndex={held ? -1 : chosenIds.has(c.deckId) || (chosenIds.size === 0 && first) ? 0 : -1}
              aria-label={
                c.commanderCopies >= c.quantity
                  ? copy.contested.a11yCommander(c.deckName, card.cardName)
                  : mine
                    ? copy.contested.a11yPicked(c.deckName)
                    : copy.contested.a11yOption(c.deckName, outcome)
              }
              onClick={held ? undefined : () => pick(c.deckId, c.deckName)}
              // A radiogroup is reached by Tab and traversed by ARROWS — every option but one
              // carries `tabIndex={-1}`, so without this a keyboard reader can see the group and
              // never reach the second deck in it. Roving focus, wrapping at both ends, skipping
              // the options nobody can choose.
              onKeyDown={held ? undefined : (e) => {
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
                  (x) => !foldedIds.has(x.deckId) && !(nothingToChoose || x.commanderCopies >= x.quantity),
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
                cursor: held ? "default" : "pointer",
              }}
            >
              <span className="flex items-center gap-[11px] md:gap-[11px] md:flex-1 min-w-0">
                <AllocationMark
                  // A soft share is drawn hollow: the brew reads the copy, it does not hold it.
                  allocated={soft ? 0 : c.allocated}
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
                    {copy.contested.stamp(c.versionNumber, stampDate(c.since, zone))}
                  </span>
                ) : null}
                {mine && !soft ? (
                  // A pick says so in words, not by hue alone: `your pick` in accent text, then
                  // what it gets (addendum call 1).
                  <span className="font-mono text-[10.5px] md:text-[11px]">
                    <span style={{ color: "var(--accent-text)" }}>{copy.contested.yourPick}</span>
                    <span style={{ color: "var(--fg-faint)" }}>{copy.contested.dot}</span>
                    <span style={{ color: c.allocated > 0 ? "var(--success)" : "var(--avail-over-fg)" }}>{outcome}</span>
                  </span>
                ) : (
                  <span
                    // `can use it` is mono 11 at both widths (the design table's soft outcome row).
                    className={soft ? "font-mono text-[11px]" : "font-mono text-[10.5px] md:text-[11px]"}
                    style={{ color: soft ? "var(--fg-muted)" : c.allocated > 0 ? "var(--success)" : "var(--avail-over-fg)" }}
                  >
                    {outcome}
                    {c.deckId === givesUpId ? (
                      <span style={{ color: "var(--fg-muted)" }}>{copy.contested.dot}{copy.contested.givesUpFirst}</span>
                    ) : null}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

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

      {/* Why every brew reads the same copy, once there are two of them reading it. */}
      {canUseCount >= 2 && !nothingToChoose ? (
        <p className="text-[11px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
          {addedCopyCopy.chooser.brewNote(canUseCount)}
        </p>
      ) : null}

      {/* A REFUSAL IS THE ONLY THING THAT SPEAKS HERE NOW. The undo hint that used to share this
          slot was retired: it read `Tap <deck> again to undo this. Back to first committed` even
          when the deck just tapped WAS the first committed, where there is nothing to undo and
          nothing to go back to. The accent row is the authorship, and tapping a chosen deck
          again still clears it — the control was describing a gesture the row already affords. */}
      {refusal ? (
        <p
          className="text-[11.5px] mt-[9px] mb-0 pl-[9px]"
          style={{ color: "var(--fg-body)", borderLeft: "3px solid var(--danger)" }}
        >
          {/* The deck the player TAPPED, not whoever holds a reservation now: after a refusal
              clears the optimistic pick, the latter is a different deck and the wrong name. */}
          {refusalSentence(refusal, card, attempted?.name ?? "")}
        </p>
      ) : null}

      {/* EVERY COPY PICKED, said under the rows as soon as the last pick lands, before anyone
          tries another. Not a refusal, so no rule: the refusal slot's spacing in body text. A
          select at the cap moves focus here. */}
      {allPicked && !nothingToChoose ? (
        <p
          ref={full}
          tabIndex={-1}
          className="text-[11.5px] mt-[9px] mb-0 pl-[9px]"
          style={{ color: "var(--fg-body)" }}
        >
          {copy.contested.allPicked(giveable)}
        </p>
      ) : null}

      {/* One announcement per settled pick and one per refusal, and no more. */}
      <span aria-live="polite" className="sr-only">{announce}</span>

    </div>
  );
}
