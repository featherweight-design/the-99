"use client";

import { useState, type ReactNode } from "react";

import { upgradePath, type UpgradeItem, type UpgradePath } from "../../lib/bracket/upgrade";
import {
  heldCount,
  leftInCommandZone,
  minimumCuts,
  nearestReachable,
  overlapCount,
  targetLimit,
  thingsToGo,
  type Target,
} from "../../lib/bracket/upgrade-view";
import type { BracketVerdict } from "../../lib/bracket/types";
import type { DeckProfile } from "../../lib/profile/types";
import type { CardRef } from "../../lib/bracket/types";
import { BRACKET_NAMES, bracketPhrase, deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { upgradePathCopy } from "../../lib/copy/upgrade-path";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { CardFactMark } from "../cards/card-fact-mark";
import { ComboMark } from "../cards/combo-mark";
import { FactTooltip } from "../cards/fact-tooltip";
import { BracketMark } from "./bracket-mark";

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
export function UpgradePathPanel({
  id,
  profile,
  verdict,
  targets,
  onOpenDecklist,
}: {
  id: string;
  profile: DeckProfile;
  verdict: BracketVerdict;
  /** The chips, nearest first. The first is the rung the disclosure opened from. */
  targets: readonly Target[];
  onOpenDecklist?: () => void;
}) {
  const [target, setTarget] = useState<Target>(targets[0]);
  const path = upgradePath(profile, target);
  const satisfied = !path.blocked && path.items.length === 0;
  return (
    <section
      id={id}
      data-testid="upgrade-path"
      className={
        "flex flex-col gap-[11px] rounded-[11px] border border-[color:var(--border)] bg-[color:var(--surface)] md:rounded-xl "
        // The three shapes the package draws at three rhythms: the open path, the blocked one a
        // step tighter, and the satisfied single row with its own padding.
        + (satisfied
          ? "px-[14px] py-[13px] md:px-[17px] md:py-[15px]"
          : path.blocked
            ? "px-[14px] py-[13px] md:gap-3 md:px-[18px] md:py-4"
            : "px-[14px] py-[13px] md:gap-[13px] md:px-[18px] md:py-4")
      }
    >
      {path.blocked ? (
        <Blocked
          path={path}
          profile={profile}
          targets={targets}
          onTarget={setTarget}
        />
      ) : path.items.length === 0 ? (
        <Satisfied target={target} verdict={verdict} />
      ) : (
        <>
          <Head target={target} eyebrow={upgradePathCopy.rungLabel} heading={upgradePathCopy.heading(target, thingsToGo(path))}>
            <Targets targets={targets} selected={target} onSelect={setTarget} />
          </Head>
          <div className="flex flex-col gap-[11px] md:gap-[9px]">
            {path.items.map((item) => (
              <Item key={item.rule} item={item} target={target} profile={profile} />
            ))}
          </div>
          <Foot path={path} onOpenDecklist={onOpenDecklist} />
        </>
      )}
    </section>
  );
}

function Head({
  target,
  eyebrow,
  heading,
  children,
}: {
  target: Target;
  eyebrow: string;
  heading: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[11px] md:flex-row md:items-center md:gap-3">
      <div className="flex items-center gap-[10px] md:flex-auto md:gap-3">
        {/* The TARGET's mark, at the full form's sanctioned 26px; the canvas's 24 is off-set. */}
        <BracketMark bracket={target} px={26} />
        <span className="flex flex-col gap-0.5 md:gap-[3px]">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)] md:text-[9.5px]">
            {eyebrow}
          </span>
          <span className="text-[13.5px] font-semibold text-[color:var(--fg)] md:text-[14px]">
            {heading}
          </span>
        </span>
      </div>
      {children}
    </div>
  );
}

/**
 * The target chips, nearest first. Pressed buttons in a named group: exactly one target is read
 * at a time, `aria-pressed` says which, and each is its own tab stop. The package specifies no
 * keyboard model, and three buttons need no roving focus to be reached.
 */
function Targets({
  targets,
  selected,
  onSelect,
}: {
  targets: readonly Target[];
  selected: Target;
  onSelect: (target: Target) => void;
}) {
  // ONE TARGET STILL DRAWS ITS CHIP: it names the bracket the panel is reading, and a group that
  // vanished at one member would leave the head saying which bracket without the mark for it.
  if (targets.length === 0) return null;
  return (
    <div className="flex items-center gap-[7px] md:flex-none">
      <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-muted)] md:inline">
        {upgradePathCopy.targetLabel}
      </span>
      <div role="group" aria-label={upgradePathCopy.targetsAria} className="flex flex-wrap gap-[7px]">
        {targets.map((t) => {
          const on = t === selected;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(t)}
              className={
                "inline-flex h-11 items-center gap-1.5 rounded-lg border pl-2 pr-[13px] md:h-[30px] md:pl-1.5 md:pr-[11px] "
                + "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] "
                + (on
                  ? "border-[color:var(--accent)] bg-[color:var(--surface-raised)]"
                  : "border-[color:var(--border-strong)]")
              }
            >
              <BracketMark bracket={t} px={22} />
              <span
                className={
                  "text-[13px] md:text-[12.5px] "
                  + (on ? "font-semibold text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]")
                }
              >
                {BRACKET_NAMES[t]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
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
}: {
  item: UpgradeItem;
  target: Target;
  profile: DeckProfile;
}) {
  const label = deckAnalysisCopy.climb.ruleNames[item.rule];
  if (item.rule === "twoCardCombos") {
    return (
      <ItemCard label={label}>
        <p className={sentence}>
          {/* EACH REASON ON THE LIST, ONCE. At Upgraded a loop of extra turns and an assembled
              combo are different rules, and one sentence for both would misdescribe one. */}
          {[...new Set(item.combos.map((c) => c.reason))]
            .map((reason) => upgradePathCopy.comboRule[reason](target))
            .join(" ")}{" "}
          <b className="font-semibold text-[color:var(--fg)]">
            {item.combos.every((c) => c.candidates.length > 1)
              ? upgradePathCopy.comboRule.either
              // One half is in the command zone, so only the other can break it: the rules
              // choose, and the card is named rather than offered as a choice.
              : upgradePathCopy.countRule.forced(
                  item.combos.flatMap((c) => (c.candidates.length === 1 ? [c.candidates[0].name] : [])),
                )}
          </b>
        </p>
        {/* THE SPACER holds the label column's second row so the pairs line up with the sentence. */}
        <span className="hidden md:block" />
        <div className="flex flex-col gap-[7px] md:mt-[5px] md:gap-[5px]">
          {item.combos.map(({ combo, candidates }) => (
            <div key={combo.variantId} className="flex flex-wrap items-center gap-x-[14px] gap-y-1.5">
              {combo.cards.map((card, i) => (
                <span key={card.oracleId} className="inline-flex items-center gap-[14px]">
                  {i > 0 ? <span aria-hidden="true" className="font-mono text-[11px] text-[color:var(--fg-faint)]">+</span> : null}
                  {/* A COMMANDER IS NEVER A CANDIDATE: `upgradePath` filtered it out, and it is
                      drawn as the card that cannot be cut rather than as one to open and cut. */}
                  {candidates.some((c) => c.oracleId === card.oracleId) ? (
                    <Candidate card={card} profile={profile} />
                  ) : (
                    <CommanderChip card={card} profile={profile} />
                  )}
                </span>
              ))}
              {combo.produces[0] ? (
                <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-locked)]">
                  {combo.produces[0]}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </ItemCard>
    );
  }
  const have = heldCount(profile, item.rule);
  const limit = targetLimit(target, item.rule);
  const forced = item.candidates.length === item.removeCount;
  return (
    <ItemCard label={label}>
      <p className={sentence}>
        {upgradePathCopy.countRule.limit(target, limit, have)}{" "}
        <b className="font-semibold text-[color:var(--fg)]">
          {forced ? <Forced cards={item.candidates} profile={profile} /> : upgradePathCopy.countRule.anyOf(item.removeCount, item.candidates.length)}
        </b>
      </p>
      {forced ? null : (
        <>
          <span className="hidden md:block" />
          {/* ONE PER LINE at 390, never a wrapped run: a run of names wraps mid-name there. */}
          <ul className="mt-0.5 flex flex-col items-start gap-[7px] md:mt-[5px] md:flex-row md:flex-wrap md:items-center md:gap-x-[14px] md:gap-y-1.5">
            {item.candidates.map((card) => (
              <li key={card.oracleId}>
                <Candidate card={card} profile={profile} />
              </li>
            ))}
          </ul>
        </>
      )}
    </ItemCard>
  );
}

/**
 * `Rhystic Study and Cyclonic Rift would have to go.` — the rules choosing, not the app. Each
 * name opens its card, inside the sentence the copy module builds, so the joiner stays that
 * module's.
 */
function Forced({ cards, profile }: { cards: readonly CardRef[]; profile: DeckProfile }) {
  const flat = upgradePathCopy.countRule.forced(cards.map((c) => c.name));
  const parts: ReactNode[] = [];
  let rest = flat;
  for (const card of cards) {
    const at = rest.indexOf(card.name);
    parts.push(rest.slice(0, at), <Candidate key={card.oracleId} card={card} profile={profile} inSentence />);
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
  inSentence = false,
}: {
  card: CardRef;
  profile: DeckProfile;
  inSentence?: boolean;
}) {
  const name = (
    <CardDetailTrigger
      oracleId={card.oracleId}
      name={card.name}
      className={
        "border-b border-dotted border-[color:var(--accent)] text-[color:var(--fg)] "
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
        </span>
      </>
    );
  }
  return (
    <span className="inline-flex items-center gap-[5px]">
      {name}
      <Marks card={card} profile={profile} />
    </span>
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

function Foot({ path, onOpenDecklist }: { path: UpgradePath; onOpenDecklist?: () => void }) {
  const overlap = overlapCount(path);
  return (
    <div className="flex flex-col gap-2 border-t border-[color:var(--border)] pt-[11px] md:flex-row md:flex-wrap md:items-start md:gap-4">
      <p className="text-[12px] leading-[1.6] text-[color:var(--fg-faint)] md:min-w-[300px] md:flex-1">
        {overlap > 0 ? <>{upgradePathCopy.overlap(overlap)} </> : null}
        <b className="font-semibold text-[color:var(--fg-body)]">{upgradePathCopy.yours}</b>
      </p>
      {onOpenDecklist ? (
        <button
          type="button"
          onClick={onOpenDecklist}
          className="w-fit flex-none border-b border-dotted border-[color:var(--accent)] font-mono text-[11px] text-[color:var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
        >
          {upgradePathCopy.toDecklist} →
        </button>
      ) : null}
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
 * "impossible". What can come out is still listed, the commander is shown on a dashed edge as the
 * card that cannot, and the nearest target removals do reach is one press away.
 */
function Blocked({
  path,
  profile,
  targets,
  onTarget,
}: {
  path: UpgradePath;
  profile: DeckProfile;
  targets: readonly Target[];
  onTarget: (target: Target) => void;
}) {
  const target = path.target;
  const commanders = new Set(profile.commanderOracleIds);
  const nearest = nearestReachable(profile, targets, target);
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
      <Head target={target} eyebrow={upgradePathCopy.targetLabel} heading={upgradePathCopy.blocked.heading(target)} />
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
            {count.candidates.map((card) => (
              <li key={card.oracleId}>
                <Candidate card={card} profile={profile} />
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
        {nearest ? (
          <button
            type="button"
            onClick={() => onTarget(nearest.target)}
            className="flex w-fit flex-wrap items-center gap-[9px] text-left text-[12.5px] text-[color:var(--fg-body)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
          >
            <BracketMark bracket={nearest.target} px={22} />
            <span className="border-b border-dotted border-[color:var(--accent)] text-[color:var(--accent)]">
              {upgradePathCopy.blocked.nearest(nearest.target, minimumCuts(nearest.path))}
            </span>
          </button>
        ) : null}
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
