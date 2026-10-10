"use client";

import { useState, type ReactNode } from "react";

import { slotDeck } from "../../lib/bracket/slot";
import { bracketPhrase, deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { synopsisCopy } from "../../lib/copy/synopsis";
import { shownReading, type ProfileState } from "./use-deck-profile";
import { AnalysisBanner } from "./analysis-banner";
import { AnalysisEmpty } from "./analysis-empty";
import { BracketMark } from "./bracket-mark";
import { BracketClimb } from "./bracket-climb";
import type { DeclarationControl } from "./declaration";
import { FindingsBlock } from "./findings-block";
import { LeanLine } from "./lean-line";
import type { FindingArt } from "./receipt-modal";
import type { Bracket } from "../../lib/profile/types";
import { VerdictBlock } from "./verdict-block";

/**
 * The Analysis tab's body (Analysis tab handoff §2): before a first reading, one empty state; with
 * a reading, the bracket box and the climb side by side at 1300 (2fr / 1fr, the climb leading the
 * left column), and the findings full width under them.
 *
 * PRESENTATIONAL ON PURPOSE. The decision about when to fetch belongs to `useDeckProfile` in the
 * shell — a panel that unmounts on every tab switch cannot own a cache — so this component takes
 * the state and renders it, which is also what makes every reading testable without a request.
 *
 * OPENING (§8, 8a): while the stored reading is fetched the tab draws only its loader, because
 * anything else would be a guess at a shape the answer may not take.
 *
 * THE OVERVIEW is handed in by the shell, which holds its state, and drawn only over a reading: it
 * leads the tab on the phone, and at 1300 it heads the left column above the climb while the box
 * spans both rows beside them (synopsis plan, decision 6). One grid item, rendered once, so no
 * width ever mounts a second copy. A current reading carries no re-analyze control either: the
 * handoff offers re-analysis only from the banner a changed deck draws (2i), which holds the
 * reading whole under it; a failed re-read over that reading is 2d.
 */
const NO_LOCKS: ReadonlySet<string> = new Set();

export function AnalysisPanel({
  state,
  onRequest,
  declaration,
  art = EMPTY_ART,
  locked = NO_LOCKS,
  legality,
  tuning,
  cuts,
  opening = "off",
  overview,
  hold = null,
  overviewReady = false,
  pressNote,
  pressSee,
  description = null,
  onSaveDescription,
  tuningEnabled = true,
}: {
  state: ProfileState;
  /**
   * Opening the tab (§8, 8a), timed by `useOpeningGate` in the shell: `wait` holds the block with
   * nothing in it, `loader` draws the loader, and either withholds everything else.
   */
  opening?: "off" | "wait" | "loader";
  /** The body against a whole deck's size, from the shell's own list. Ruling 1: the press is
   *  disabled until they match, and the server refuses it as well. */
  legality?: { built: number; size: number };
  onRequest: () => void;
  /** The player's answer and the control to give one, held by the shell. */
  declaration?: DeclarationControl;
  /**
   * The art and printed name for every card the findings can name, from the deck page's own
   * rows. See `FindingArt` for why it is resolved here rather than carried on the profile.
   */
  art?: FindingArt;
  /**
   * The deck's locked cards, from the deck page's own rows (Locked, D5). Only the climb's sheet
   * reads them, to list a locked candidate last; they never enter the stored profile.
   */
  locked?: ReadonlySet<string>;
  /**
   * Suggested changes, drawn last and only over a reading (placement addendum v2): tuning follows
   * the analysis, and a deck with no reading gets no suggestions. Handed the permits on screen,
   * current or held, so its bracket flag is worded against the reading the reader sees.
   */
  tuning?: (permits: readonly Bracket[]) => ReactNode;
  /** Proposed cuts (Tuning hub R2), drawn after Suggested changes. It does NOT wait for a reading (an
   *  overfull deck has none, and a reading needs a whole deck), so a caller must not gate it on
   *  `held`. Absent with `PROPOSED_CUTS_ENABLED` off. */
  cuts?: ReactNode;
  /** The deck's overview (sub-project 6), drawn beside the verdict and only over a reading. */
  overview?: ReactNode;
  /**
   * A first Analyze that also writes the overview holds the empty state's loader through the write
   * (Hugh, 2026-09-26), its heading naming the stage: the bracket being read, then the overview
   * being written. The shell decides when it lets go; null is no hold.
   */
  hold?: "reading" | "writing" | null;
  /** The overview on hand is written and current, so a held press that lets go says so as well. */
  overviewReady?: boolean;
  /** The credit note beside Analyze (the empty state) and Re-analyze (the banner), when the press
   *  also writes the overview; null where it writes nothing (`synopsis-note.ts`). */
  pressNote?: { analyze: string | null; reanalyze: string | null };
  /** The overview check's *See which →* after that note, opening Notices (deck notices HANDOFF §6);
   *  null when the note is the credit note, which carries none. */
  pressSee?: { label: string; onPress: () => void } | null;
  /** The deck's description (H35), and its save — passed straight to the empty state's field. */
  description?: string | null;
  onSaveDescription?: (value: string) => Promise<import("../../lib/decks/mutation-result").DeckMutationResult>;
  /** `tuningEnabled()`: whether the empty state draws the description field at all (asked only
   *  to feed a Suggested changes run, per its own help text) — defaults true, same as `tuning`
   *  itself being left undrawn is what withholds the panel below a reading. */
  tuningEnabled?: boolean;
}) {
  // SAID ONCE, WHEN A READING LANDS (§E): a press settling, never a stored reading painted on open.
  // Adjusted during render, React's pattern for deriving state from a changed prop.
  // A held first press is still loading as far as the reader can see, so it is announced when it
  // lets go, once, with the overview beside the verdict when that landed too.
  const shownKind = hold ? "loading" : state.kind;
  const [prevKind, setPrevKind] = useState(shownKind);
  const [prevHold, setPrevHold] = useState(hold ?? null);
  const [announced, setAnnounced] = useState("");
  if (prevKind !== shownKind) {
    setPrevKind(shownKind);
    setPrevHold(hold ?? null);
    setAnnounced(
      prevKind === "loading" && state.kind === "ready"
        ? deckAnalysisCopy.panel.settled(bracketPhrase(slotDeck(state.profile).permits))
          + (prevHold && overviewReady ? ` ${synopsisCopy.ready}` : "")
        : "",
    );
  } else if (prevHold !== (hold ?? null)) {
    setPrevHold(hold ?? null);
  }
  // WHILE THE OVERVIEW IS WRITTEN the reading is already in: it mounts behind the loader, hidden,
  // so Suggested changes reads its own state then and everything paints in one frame at release.
  const behind = hold === "writing";
  const held = hold === "reading" ? null : shownReading(state);
  // Ruling 1. The shell's own count decides when it has one, so completing the deck re-enables the
  // press after a refusal; the server's refusal speaks only where no count was handed in.
  const short = legality
    ? legality.built !== legality.size ? legality : null
    : state.kind === "illegal" ? state : null;
  const blocked = short ? deckAnalysisCopy.panel.illegal(short.built, short.size) : null;
  // OPENING: the loader, with the body MOUNTED BEHIND IT and hidden. Suggested changes reads its
  // own state on mount, and the shell holds the loader until that read has settled too (Hugh's
  // staging walk, 2026-09-25: nothing may pop in once the tab has painted). One tree in both
  // phases, so revealing it keeps every read that already landed rather than remounting.
  const gated = opening !== "off";
  return (
    <>
    {gated ? (
      <div className="px-[16px] pt-[18px] pb-[32px] md:px-[30px] md:pt-6 md:pb-10">
        <OpeningLoader drawn={opening === "loader"} />
      </div>
    ) : null}
    <div hidden={gated} className="flex flex-col gap-[22px] px-[16px] pt-[18px] pb-[32px] md:gap-[28px] md:px-[30px] md:pt-6 md:pb-10">
      {held ? (
        <div hidden={behind} className="contents">
          {/* THE BANNER, the one place staleness is said (2i, 2d), over a reading that stays. Only
              over a STALE reading (deck notices readiness F2): a press over a fresh one, which is
              the Notices foot's, shows busy and failure on its own button, and a banner reading
              "your deck has changes" would merge the notices' signal into the player's own. */}
          {state.kind === "illegal" || !held.fresh ? (
            <AnalysisBanner
              mode={state.kind === "failed" || (state.kind === "loading" && state.retry) ? "failed" : "stale"}
              busy={state.kind === "loading"}
              blocked={blocked}
              onRequest={onRequest}
              note={pressNote?.reanalyze ?? null}
              see={pressSee ?? null}
            />
          ) : null}
          {/* THE VERDICT IS DRAWN FROM THE READING THE READER ASKED FOR, current or held. `slotDeck`
              STILL TAKES NO DECLARATION: it is handed to the verdict block at the draw (#797), so
              a player's answer never busts the cached profile and never waits on a rebuild. */}
          <Verdict
            profile={held.profile}
            analyzedAt={held.analyzedAt}
            fresh={held.fresh}
            versionNumber={held.versionNumber}
            art={art}
            locked={locked}
            declaration={declaration}
            overview={overview}
          />
        </div>
      ) : null}
      {!held || behind ? (hold || state.kind === "idle" || state.kind === "loading" || state.kind === "failed" || state.kind === "illegal" ? (
        <AnalysisEmpty
          phase={hold || state.kind === "loading" ? "loading" : state.kind === "failed" ? "failed" : "idle"}
          stage={hold === "writing" ? "writing" : "reading"}
          onRequest={onRequest}
          blocked={blocked}
          note={pressNote?.analyze ?? null}
          see={pressSee ?? null}
          description={description}
          onSaveDescription={onSaveDescription}
          tuningEnabled={tuningEnabled}
        />
      ) : null) : null}
      {/* THE FLAG BEING OFF, OR A DECK THAT CANNOT BE READ, DRAWS NO READING: the tab is hidden by
          the same flag, and the page around it has already answered for a missing deck. */}
      {held && tuning ? (
        <div hidden={behind} className="pt-[18px] md:pt-6" style={{ borderTop: "1px solid var(--border)" }}>
          {tuning(slotDeck(held.profile).permits)}
        </div>
      ) : null}
      {/* PROPOSED CUTS DOES NOT WAIT FOR A READING. A reading is made of a whole deck (the body at its
          size), and the tool exists for a deck that is over it, so the two preconditions exclude each
          other: a deck built long was never read. Its facts come from the profile it builds for itself
          and it draws nothing for a deck that is not over 100. */}
      {cuts ? <div hidden={behind} className="contents">{cuts}</div> : null}
      <p role="status" className="sr-only">{announced}</p>
    </div>
    </>
  );
}

/**
 * The verdict and the climb, from one reading of the rules.
 *
 * `slotDeck` IS CALLED ONCE and its answer handed to both. It is pure and cheap, but two calls
 * are two chances for the two blocks to disagree about the same deck the day it stops being
 * either — and the climb's rungs are derived from the verdict's own `permits`.
 */
function Verdict({
  profile,
  analyzedAt,
  fresh,
  versionNumber,
  art,
  locked,
  declaration,
  overview,
}: {
  profile: import("../../lib/profile/types").DeckProfile;
  analyzedAt: string;
  fresh: boolean;
  versionNumber: number | null;
  art: FindingArt;
  locked: ReadonlySet<string>;
  declaration?: DeclarationControl;
  overview?: ReactNode;
}) {
  const verdict = slotDeck(profile);
  return (
    <>
      {/* DOM order is the phone's reading order: the overview, the box, then the climb. At 1300 the
          grid puts the overview over the climb in the left column and spans the box down the right;
          the second row takes any slack, so a tall box never opens a gap under the overview. */}
      <div className={`flex flex-col gap-[22px] md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-start ${overview ? "md:grid-rows-[auto_1fr] md:gap-x-[30px] md:gap-y-[26px]" : "md:gap-[30px]"}`}>
        {overview ? <div className="min-w-0 md:col-start-1 md:row-start-1">{overview}</div> : null}
        <div data-testid="verdict-cell" className={`min-w-0 md:col-start-2 md:row-start-1 ${overview ? "md:row-span-2" : ""}`}>
          <VerdictBlock
            verdict={verdict}
            profile={profile}
            analyzedAt={analyzedAt}
            fresh={fresh}
            versionNumber={versionNumber}
            declaration={declaration}
            lean={
              // `leanFor` is non-null only on a single bracket, 3 or 4, so the narrowing below is
              // the rule's own guarantee restated for the type system rather than a second rule.
              verdict.lean && (verdict.permits[0] === 3 || verdict.permits[0] === 4) ? (
                <LeanLine
                  lean={verdict.lean}
                  bracket={verdict.permits[0]}
                  art={art}
                  commanderOracleIds={profile.commanderOracleIds}
                />
              ) : null
            }
          />
        </div>
        <div data-testid="climb-cell" className={`flex min-w-0 flex-col md:col-start-1 md:gap-[26px] ${overview ? "md:row-start-2" : "md:row-start-1"}`}>
          <BracketClimb verdict={verdict} profile={profile} locked={locked} declared={declaration?.declared ?? null} />
        </div>
      </div>
      <FindingsBlock profile={profile} art={art} />
    </>
  );
}

const EMPTY_ART: FindingArt = new Map();

/**
 * The opening loader (§8, 8a): the five chip marks in a ROW at 22px under the `at-wave` light, and
 * `Loading…`. A row rather than the ring, since the ring belongs to the empty state and to a real
 * analysis, and showing it here would be the not-analyzed flash this state removes. It holds a
 * 320 / 420px block from the first frame, so the tab does not jump, and is empty until drawn.
 */
function OpeningLoader({ drawn }: { drawn: boolean }) {
  return (
    <div
      role="status"
      data-opening-loader={drawn ? "drawn" : "waiting"}
      className="flex min-h-[320px] flex-col items-center justify-center gap-[12px] md:min-h-[420px] md:gap-[14px]"
    >
      {drawn ? (
        <>
          <span aria-hidden className="flex items-center gap-[10px]">
            {([1, 2, 3, 4, 5] as const).map((bracket, i) => (
              <span key={bracket} className="anim-at-wave at-wave-rest" style={{ animationDelay: `${i * 0.16}s` }}>
                <BracketMark bracket={bracket} px={22} />
              </span>
            ))}
          </span>
          <span className="font-mono text-[10.5px] tracking-[0.06em] text-[color:var(--fg-faint)] md:text-[11px]">
            {deckAnalysisCopy.panel.opening}
          </span>
        </>
      ) : null}
    </div>
  );
}
