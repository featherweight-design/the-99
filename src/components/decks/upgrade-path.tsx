"use client";

import { createContext, useContext, type ReactNode } from "react";

import { lockedLast, unreachable, upgradePath, type UpgradeItem, type UpgradePath } from "../../lib/bracket/upgrade";
import {
  heldCount,
  leftInCommandZone,
  overlapCount,
  targetLimit,
  thingsToGo,
  type Target,
} from "../../lib/bracket/upgrade-view";
import type { BracketVerdict } from "../../lib/bracket/types";
import type { DeckProfile } from "../../lib/profile/types";
import type { CardRef } from "../../lib/bracket/types";
import { BRACKET_NAMES, bracketPhrase, deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { upgradePathCopy } from "../../lib/copy/upgrade-path";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { CardFactMark } from "../cards/card-fact-mark";
import { ComboMark } from "../cards/combo-mark";
import { FactTooltip } from "../cards/fact-tooltip";
import { BracketMark } from "./bracket-mark";
import { LockMark } from "./lock-mark";
import { ModalChrome, type FindingArt } from "./receipt-modal";

/**
 * What would have to go to reach a bracket below this deck's reading — as CANDIDATES, never a
 * pick.
 *
 * A COUNT RULE IS DETERMINED IN CARDINALITY AND NOT IN IDENTITY. A deck holding five game
 * changers must lose two to reach Upgraded, and which two is the player's call over five equally
 * valid answers — so every candidate is listed with the count that must come out of them, and
 * the cards are named only when the rules leave no choice. Nothing here ticks, removes or
 * recommends: it READS, and the decklist is where a player acts.
 *
 * EVERY FIGURE COMES FROM A RULE. `upgradePath` states what a target asks for, `upgrade-view`
 * does the arithmetic the surface adds, and the limits are the constants `upgradePath` counts
 * against. This
 * component draws them and derives none.
 */
/** The deck's own art for the cards the path names, so each name previews the printing its card details open. */
const PathArt = createContext<FindingArt>(new Map());

export function UpgradePathSheet({
  profile,
  verdict,
  target,
  locked,
  art,
  onClose,
}: {
  profile: DeckProfile;
  verdict: BracketVerdict;
  /**
   * The deck's locked cards (Locked, D5): a display read handed down from the deck page, never
   * part of the stored profile, so a lock toggled never dirties the analysis. It moves ORDER and
   * adds a sentence; it never changes a count.
   */
  locked: ReadonlySet<string>;
  /** Art for the cards the path names (the deck's rows and commanders); a card missing from it previews nothing. */
  art: FindingArt;
  /**
   * ONE TARGET, the bracket directly below the reading (handoff §3, 3b). No chips choose another,
   * and a blocked target names no nearer one: the targets nest upward, so nothing between this
   * one and the reading exists to be reached instead.
   */
  target: Target;
  onClose: () => void;
}) {
  const path = upgradePath(profile, target);
  const satisfied = !path.blocked && path.items.length === 0;
  // The head moved into the sheet's header, so the header carries what the head said.
  const title = path.blocked
    ? upgradePathCopy.blocked.heading(target)
    : satisfied
      ? deckAnalysisCopy.sheets.upgradePath
      : upgradePathCopy.heading(target, thingsToGo(path));
  return (
    <PathArt.Provider value={art}>
    <ModalChrome
      mark={<BracketMark bracket={target} px={22} />}
      title={title}
      titleClassName="line-clamp-2 text-[14px] leading-[1.15] md:truncate md:text-[16px] md:leading-tight"
      closeLabel={deckAnalysisCopy.sheets.closeUpgradePath}
      onClose={onClose}
      width={700}
      // One wording at both widths (Hugh, 2026-10-05): the bracket name alone read as a place in
      // the climb rather than a way back to this sheet, so both now say the sheet's own name —
      // the same phrase the climb's own link uses to open it.
      backLabel={deckAnalysisCopy.sheets.upgradePath}
    >
      <div
        data-testid="upgrade-path"
        className="flex flex-col gap-[11px] px-[16px] py-[14px] md:gap-[13px] md:px-[18px] md:pt-4 md:pb-[18px]"
      >
        {path.blocked ? (
          <Blocked path={path} profile={profile} locked={locked} />
        ) : satisfied ? (
          <Satisfied target={target} verdict={verdict} />
        ) : (
          <>
            <div className="flex flex-col gap-[11px] md:gap-[13px]">
              {path.items.map((item) => (
                <Item key={item.rule} item={item} target={target} profile={profile} locked={locked} />
              ))}
            </div>
            <Foot path={path} />
          </>
        )}
      </div>
    </ModalChrome>
    </PathArt.Provider>
  );
}

/** The card shell every item shares: stacked at 390, a label column beside the reading above. */
function ItemCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[7px] rounded-[9px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-3 py-[11px] md:grid md:grid-cols-[150px_minmax(0,1fr)] md:items-baseline md:gap-x-[18px] md:gap-y-1 md:px-[13px] md:py-3">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
        {label}
      </span>
      {children}
    </div>
  );
}

const sentence = "text-[12.5px] leading-[1.6] text-[color:var(--fg-body)] md:text-[13px]";

function Item({
  item,
  target,
  profile,
  locked,
}: {
  item: UpgradeItem;
  target: Target;
  profile: DeckProfile;
  locked: ReadonlySet<string>;
}) {
  const label = deckAnalysisCopy.climb.ruleNames[item.rule];
  if (item.rule === "twoCardCombos") {
    const comboOut = (candidates: readonly CardRef[]) => {
      const out = unreachable(candidates, 1, locked);
      return out ? lockedCardsCopy.climb.unreachable(out.locked, out.total, BRACKET_NAMES[target]) : null;
    };
    return (
      <ItemCard label={label}>
        <p className={sentence}>
          {/* EACH REASON ON THE LIST, ONCE. At Upgraded a loop of extra turns and an assembled
              combo are different rules, and one sentence for both would misdescribe one. */}
          {[...new Set(item.combos.map((c) => c.reason))]
            .map((reason) => upgradePathCopy.comboRule[reason](target))
            .join(" ")}{" "}
          {item.combos.length === 1 ? <b className="font-semibold text-[color:var(--fg)]">{comboClause(item.combos[0])}</b> : null}
        </p>
        {/* THE SPACER holds the label column's second row so the pairs line up with the sentence. */}
        <span className="hidden md:block" />
        <div className="flex flex-col gap-[7px] md:mt-[5px] md:gap-[5px]">
          {item.combos.map(({ combo, candidates, reason }) => (
            <div key={combo.variantId} className="flex flex-wrap items-center gap-x-[14px] gap-y-1.5">
              {combo.cards.map((card, i) => (
                <span key={card.oracleId} className="inline-flex items-center gap-[14px]">
                  {i > 0 ? <span aria-hidden="true" className="font-mono text-[11px] text-[color:var(--fg-faint)]">+</span> : null}
                  {/* A COMMANDER IS NEVER A CANDIDATE: `upgradePath` filtered it out, and it is
                      drawn as the card that cannot be cut rather than as one to open and cut. */}
                  {candidates.some((c) => c.oracleId === card.oracleId) ? (
                    <Candidate card={card} profile={profile} locked={locked.has(card.oracleId)} />
                  ) : (
                    <CommanderChip card={card} profile={profile} />
                  )}
                </span>
              ))}
              {/* SEVERAL COMBOS: each row says what breaks IT, because one may lose either half
                  and another only the half outside the command zone. */}
              {item.combos.length > 1 ? (
                <b className="text-[12.5px] font-semibold text-[color:var(--fg)]">
                  {comboClause({ candidates, reason })}
                </b>
              ) : null}
              {combo.produces[0] ? (
                <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-locked)]">
                  {combo.produces[0]}
                </span>
              ) : null}
              {/* SEVERAL COMBOS: the sentence sits on the row of the combo it is about, as the
                  clause beside it does, so "All 2" can never read as the whole list. */}
              {item.combos.length > 1 && comboOut(candidates) ? (
                <p data-testid="climb-lock-note" className={`${sentence} basis-full`}>
                  {comboOut(candidates)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
        {/* A PAIR KEEPS ITS ORDER: the locked piece is marked where it stands, not moved, so
            `listedLast` is a count rule's sentence only. A combo whose every cuttable piece is
            locked cannot be broken while they are (F6c); with one combo the sentence goes under
            the rule, like a count's. */}
        {item.combos.length === 1 && comboOut(item.combos[0].candidates) ? (
          <LockNote>{comboOut(item.combos[0].candidates)}</LockNote>
        ) : null}
      </ItemCard>
    );
  }
  const candidates = lockedLast(item.candidates, locked);
  const out = unreachable(item.candidates, item.removeCount, locked);
  const lockedNames = candidates.filter((c) => locked.has(c.oracleId)).map((c) => c.name);
  const have = heldCount(profile, item.rule);
  const limit = targetLimit(target, item.rule);
  const forced = item.candidates.length === item.removeCount;
  return (
    <ItemCard label={label}>
      <p className={sentence}>
        {upgradePathCopy.countRule.limit(target, limit, have)}{" "}
        <b className="font-semibold text-[color:var(--fg)]">
          {forced ? <Forced cards={candidates} profile={profile} locked={locked} /> : upgradePathCopy.countRule.anyOf(item.removeCount, item.candidates.length)}
        </b>
      </p>
      {forced ? null : (
        <>
          <span className="hidden md:block" />
          {/* ONE PER LINE at 390, never a wrapped run: a run of names wraps mid-name there. */}
          <ul className="mt-0.5 flex flex-col items-start gap-[7px] md:mt-[5px] md:flex-row md:flex-wrap md:items-center md:gap-x-[14px] md:gap-y-1.5">
            {candidates.map((card) => (
              <li key={card.oracleId}>
                <Candidate card={card} profile={profile} locked={locked.has(card.oracleId)} />
              </li>
            ))}
          </ul>
        </>
      )}
      {/* THE NOTE UNDER THE RULE, one sentence. `unreachable` says everything `listedLast` does
          and that the target is out of reach, so it takes the slot (orchestrator, 2026-09-25). */}
      {out ? (
        <LockNote>{lockedCardsCopy.climb.unreachable(out.locked, out.total, BRACKET_NAMES[target])}</LockNote>
      ) : lockedNames.length > 0 ? (
        <LockNote>{lockedCardsCopy.climb.listedLast(lockedNames)}</LockNote>
      ) : null}
    </ItemCard>
  );
}

/**
 * What breaks ONE combo: either half, or — when the other is in the command zone — the one half
 * that can go, named, because the rules chose it.
 */
function comboClause({ candidates }: { candidates: readonly CardRef[]; reason?: string }): string {
  return candidates.length > 1
    ? upgradePathCopy.comboRule.either
    : upgradePathCopy.countRule.forced(candidates.map((c) => c.name));
}

/**
 * `Rhystic Study and Cyclonic Rift would have to go.` — the rules choosing, not the app. Each
 * name opens its card, inside the sentence the copy module builds, so the joiner stays that
 * module's.
 */
function Forced({
  cards,
  profile,
  locked,
}: {
  cards: readonly CardRef[];
  profile: DeckProfile;
  locked: ReadonlySet<string>;
}) {
  const flat = upgradePathCopy.countRule.forced(cards.map((c) => c.name));
  const parts: ReactNode[] = [];
  let rest = flat;
  for (const card of cards) {
    const at = rest.indexOf(card.name);
    parts.push(rest.slice(0, at), <Candidate key={card.oracleId} card={card} profile={profile} locked={locked.has(card.oracleId)} inSentence />);
    rest = rest.slice(at + card.name.length);
  }
  parts.push(rest);
  return <>{parts}</>;
}

/**
 * A card the reader can open, and every fact mark that is true of it.
 *
 * `inSentence` is a forced name inside the bold "…would have to go." sentence: it takes the
 * sentence's weight and size, and its marks sit in their own wrapper nudged to the text's
 * baseline, as the canvas draws them there.
 */
function Candidate({
  card,
  profile,
  locked,
  inSentence = false,
}: {
  card: CardRef;
  profile: DeckProfile;
  /** The player locked it: the mark, and `locked` beside it from `md` (the phone draws the mark alone). */
  locked: boolean;
  inSentence?: boolean;
}) {
  const art = useContext(PathArt);
  const name = (
    <CardDetailTrigger
      oracleId={card.oracleId}
      name={card.name}
      imageUri={art.get(card.oracleId)?.imageUri ?? null}
      preview
      className={
        "border-b border-b-[color:var(--accent)] border-dotted border-[color:var(--accent)] text-[color:var(--fg)] "
        + (inSentence ? "font-semibold" : "text-[12.5px] font-normal")
      }
    >
      {card.name}
    </CardDetailTrigger>
  );
  if (inSentence) {
    return (
      <>
        {name}
        <span className="ml-[5px] inline-flex items-center gap-1 align-[-3px]">
          <Marks card={card} profile={profile} />
          {locked ? <Locked /> : null}
        </span>
      </>
    );
  }
  return (
    <span className="inline-flex items-center gap-[5px]">
      {name}
      <Marks card={card} profile={profile} />
      {locked ? <Locked /> : null}
    </span>
  );
}

/** The climb candidate's lock (handoff R2 table): the mark, and a mono 10.5px word from `md`, with
 *  one name for assistive tech at every width. */
function Locked() {
  return (
    <span data-testid="climb-locked" className="inline-flex items-center gap-1">
      <LockMark title={lockedCardsCopy.mark.title} />
      {/* THE NAME IS ALWAYS READ, AT EVERY WIDTH: the glyph is aria-hidden and the visible word
          is display:none on a phone, so without this a partly locked combo says nothing there. */}
      <span className="sr-only">{lockedCardsCopy.mark.title}</span>
      <span aria-hidden="true" className="hidden font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)] md:inline">
        {lockedCardsCopy.mark.key}
      </span>
    </span>
  );
}

/** One sentence under the rule, in the reading's own column: a fact, never a control. */
function LockNote({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="hidden md:block" />
      <p data-testid="climb-lock-note" className={`${sentence} md:mt-[5px]`}>
        {children}
      </p>
    </>
  );
}

/**
 * Every fact that is true of the card, each with its hover — the same mount every other card
 * surface uses, so a mark explains itself here exactly as it does on the decklist. The combo's
 * names the card's partner in each combo the deck holds.
 */
function Marks({ card, profile }: { card: CardRef; profile: DeckProfile }) {
  const b = profile.brackets;
  const has = (list: readonly CardRef[]) => list.some((c) => c.oracleId === card.oracleId);
  const partners = b.twoCardCombos
    .filter((c) => has(c.cards))
    .flatMap((c) => c.cards.filter((p) => p.oracleId !== card.oracleId).map((p) => p.name));
  const facts = (
    [
      ["gameChanger", has(b.gameChangers)],
      ["massLandDenial", has(b.massLandDenial)],
      ["extraTurns", has(b.extraTurns)],
      // The profile's tutors are `isTutor`'s, the same rule the stored flag is written by, so
      // this row and the card's mark elsewhere agree. Listed last among the facts, as
      // `factsFor` orders them.
      ["tutor", has(b.comboReach.tutors)],
    ] as const
  ).filter(([, on]) => on);
  return (
    <>
      {facts.map(([fact]) => (
        <FactTooltip key={fact} fact={fact}>
          <CardFactMark fact={fact} />
        </FactTooltip>
      ))}
      {partners.length > 0 ? (
        <ComboMark partnerName={partners[0]} otherPartners={partners.length - 1} />
      ) : null}
    </>
  );
}

function Foot({ path }: { path: UpgradePath }) {
  const overlap = overlapCount(path);
  return (
    <div className="flex flex-col gap-2 border-t border-[color:var(--border)] pt-[11px] md:flex-row md:flex-wrap md:items-start md:gap-4">
      <p className="text-[12px] leading-[1.6] text-[color:var(--fg-faint)] md:min-w-[300px] md:flex-1">
        {overlap > 0 ? <>{upgradePathCopy.overlap(overlap)} </> : null}
        <b className="font-semibold text-[color:var(--fg-body)]">{upgradePathCopy.yours}</b>
      </p>
    </div>
  );
}

/** `items: []`: nothing has to go. The declaration is the only thing left that can answer. */
function Satisfied({ target, verdict }: { target: Target; verdict: BracketVerdict }) {
  const flat = upgradePathCopy.satisfied(target, bracketPhrase(verdict.permits));
  const cut = flat.indexOf(".") + 1;
  return (
    <div className="flex items-center gap-[13px]">
      <BracketMark bracket={target} px={26} />
      <p className="text-[12.5px] leading-[1.6] text-[color:var(--fg-body)] md:text-[13px]">
        <b className="font-semibold text-[color:var(--fg)]">{flat.slice(0, cut)}</b>
        {flat.slice(cut)}
      </p>
    </div>
  );
}

/**
 * `blocked`: what removals CANNOT reach, said plainly — no danger ink, no warning glyph, never
 * "impossible". What can come out is still listed, and the commander is shown on a dashed edge
 * as the card that cannot.
 */
function Blocked({
  path,
  profile,
  locked,
}: {
  path: UpgradePath;
  profile: DeckProfile;
  locked: ReadonlySet<string>;
}) {
  const target = path.target;
  const commanders = new Set(profile.commanderOracleIds);
  // The item that blocks: a count whose candidates fall short, or a combo no removal breaks.
  const count = path.items.find(
    (i): i is Extract<UpgradeItem, { removeCount: number }> =>
      i.rule !== "twoCardCombos" && i.candidates.length < i.removeCount,
  );
  const combo = path.items.find(
    (i): i is Extract<UpgradeItem, { rule: "twoCardCombos" }> =>
      i.rule === "twoCardCombos" && i.combos.some((c) => c.candidates.length === 0),
  );
  return (
    <>
      {count ? (
        <ItemCard label={deckAnalysisCopy.climb.ruleNames[count.rule]}>
          <p className={sentence}>
            {upgradePathCopy.countRule.limit(target, targetLimit(target, count.rule), heldCount(profile, count.rule))}{" "}
            {count.candidates.length > 0 ? (
              <b className="font-semibold text-[color:var(--fg)]">
                {upgradePathCopy.countRule.canComeOut(count.candidates.length)}
              </b>
            ) : null}
          </p>
          <span className="hidden md:block" />
          <ul className="mt-0.5 flex flex-col items-start gap-[7px] md:mt-[5px] md:flex-row md:flex-wrap md:items-center md:gap-x-[14px] md:gap-y-1.5">
            {lockedLast(count.candidates, locked).map((card) => (
              <li key={card.oracleId}>
                <Candidate card={card} profile={profile} locked={locked.has(card.oracleId)} />
              </li>
            ))}
            {heldCards(profile, count.rule)
              .filter((c) => commanders.has(c.oracleId))
              .map((card) => (
                <li key={card.oracleId}>
                  <CommanderChip card={card} profile={profile} />
                </li>
              ))}
          </ul>
        </ItemCard>
      ) : combo ? (
        <ItemCard label={deckAnalysisCopy.climb.ruleNames.twoCardCombos}>
          <div className="flex flex-wrap items-center gap-x-[14px] gap-y-1.5">
            {combo.combos
              .find((c) => c.candidates.length === 0)!
              .combo.cards.map((card) => <CommanderChip key={card.oracleId} card={card} profile={profile} />)}
          </div>
        </ItemCard>
      ) : null}
      <div className="flex flex-col gap-[7px] border-l-[3px] border-[color:var(--border-strong)] pl-[13px]">
        <p className="text-[12.5px] leading-[1.65] text-[color:var(--fg-body)] md:text-[13px]">
          {count
            ? upgradePathCopy.blocked.countShortfall(
                target,
                heldCards(profile, count.rule).filter((c) => commanders.has(c.oracleId)).length,
                leftInCommandZone(count),
              )
            : upgradePathCopy.blocked.comboShortfall(target)}
        </p>
      </div>
    </>
  );
}

function heldCards(profile: DeckProfile, rule: "gameChangers" | "massLandDenial" | "extraTurns"): CardRef[] {
  return profile.brackets[rule];
}

/** The card that cannot be cut: on a dashed edge, faint, with the tag that says why. */
function CommanderChip({ card, profile }: { card: CardRef; profile: DeckProfile }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[color:var(--border-dashed)] px-2 py-0.5">
      <span className="text-[12.5px] text-[color:var(--fg-faint)]">{card.name}</span>
      <Marks card={card} profile={profile} />
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--fg-locked)]">
        {upgradePathCopy.blocked.commanderTag}
      </span>
    </span>
  );
}
