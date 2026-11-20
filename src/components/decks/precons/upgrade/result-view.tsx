"use client";

// Results (handoff Results.dc, R1 and R2): the run as four facts, then the commander when the run changed who leads, then the swaps. The date
// sits on the title line. A short run (under 12 at the chosen bracket) is counted, refunded and still startable.
// A3 (calls 7 to 11): the commander pair carries the deck row's bracket marks right after each name, and the key under the facts glosses only
// the marks this result draws.
// Fresh start R2 (#2985, calls 9 to 11): the swaps are the shipped Suggested changes results (`SuggestedChangesRun`), adds and cuts picked
// separately, with the flow's own press in its bar; the commander pair stays above them with no Pick, because who leads is a step.
import { useMemo, type ReactNode } from "react";
import type { Bracket } from "../../../../lib/profile/types";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import { dollars } from "../../../../lib/copy/credits-page";
import { WUBRG_COLOR, inWubrgOrder } from "../../../../lib/cards/colors";
import type { OfferedCommander, PanelCard, PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import type { SwapCombo } from "../../../../lib/precons/upgrade/validate";
import { CARD_FACTS, cardMarkCopy } from "../../../../lib/copy/card-mark";
import { comboAwarenessCopy } from "../../../../lib/copy/combo-awareness";
import { ComboGlyph } from "../../../cards/combo-glyph";
import { FactTooltip } from "../../../cards/fact-tooltip";
import { FoldedMarks, type FoldMark } from "../../../cards/folded-marks";
import { MarkKey } from "../../mark-key";
import { factComboEntries } from "../../mark-key-entries";
import { StrategyIcon } from "../../strategy-icon";
import { CardDetailTrigger, useCardDetailIfAny } from "../../../cards/card-detail-context";
import type { StrategyKey } from "@/lib/strategy/score";
import { pickUpgradeLineAction, upgradeSetBracketAction } from "../../../../lib/precons/upgrade/actions";
import { SuggestedChangesRun, type SuggestedChangesPress } from "../../suggested-changes-run";
import { figuresOf, upgradeActions, upgradeAsk, upgradeLines, upgradePermits, type UpgradeActionDeps } from "./upgrade-lines";

const copy = preconUpgradeCopy.results;

/** The day as `Nov 10`, in the reader's own zone (this draws only after the reader opens the flow). */
export const runDay = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** The commander option a run was made under: its key leads the run's stored key. */
export function leadOf(panel: UpgradePanel, run: PanelRun): OfferedCommander | null {
  return panel.commanders.find((c) => run.strategyKey.startsWith(`${c.key}/`)) ?? null;
}

/** One card's facts for a commander option: a partner pair draws the union of its colors and owns only what the reader owns of both; its mana value is no one number, so none is drawn.
 *  Its bracket facts are the union of both cards' in the shipped `CARD_FACTS` order (readiness clarification 2), absent when neither carries one. */
export function combined(ids: string[], cards: Record<string, PanelCard>): PanelCard | undefined {
  const all = ids.map((id) => cards[id]);
  if (all.length === 0 || all.some((c) => !c)) return undefined;
  if (all.length === 1) return all[0];
  const facts = CARD_FACTS.filter((f) => all.some((c) => c.facts?.includes(f)));
  return { owned: all.every((c) => c.owned), identity: [...new Set(all.flatMap((c) => c.identity ?? []))], ...(facts.length ? { facts } : {}) };
}

/** A mark a side draws after its name: a bracket fact, or the combo mark with its hover sentence. */
type Mark = FoldMark;

/** The swap's combo mark: the glyph is silent, so its sentence is spoken from an `sr-only` span, as the deck row's description speaks it. */
function SwapCombo({ sentence }: { sentence: string }) {
  return (
    <>
      <FactTooltip sentence={sentence}>
        <ComboGlyph />
      </FactTooltip>
      <span className="sr-only">{sentence}</span>
    </>
  );
}

/**
 * The combo mark's sentence on a swap, which is not applied yet (A3 call 10): an add's partner is in the deck after the swaps,
 * and a cut's partner stays, so the cut breaks the combo. The deck row's `Both are in this deck.` would be false on either.
 */
export function swapComboSentence(side: "cut" | "add", combo: SwapCombo): string {
  const t = comboAwarenessCopy.swapTooltip;
  const more = combo.otherPartners ?? 0;
  if (side === "add") return more > 0 ? t.addMore(combo.name, more) : t.add(combo.name);
  return more > 0 ? t.cutMore(combo.name, more) : t.cut(combo.name);
}

/** A side's marks in the deck row's order: its facts (CARD_FACTS order, as read), then the combo mark. A run stored before
 *  partners were kept has no `cutCombo`/`addCombo`, so it draws facts alone (absence is the design). */
export function marksOf(card: PanelCard | undefined, combo: { side: "cut" | "add"; partner: SwapCombo | null | undefined } | null): Mark[] {
  return [
    ...(card?.facts ?? []).map((fact) => ({ kind: "fact" as const, fact })),
    ...(combo?.partner ? [(() => {
      const sentence = swapComboSentence(combo.side, combo.partner);
      return { kind: "combo" as const, sentence, glyph: <SwapCombo sentence={sentence} /> };
    })()] : []),
  ];
}

/**
 * The marks right after the name, 16px bare, each in its shipped `FactTooltip` (pointer-fine only). Below `md` (the phone drawer)
 * they fold by the deck row's own rule (`FoldedMarks`), by the SIDE's width, a container query on `Side`: a phone side is the
 * tight tier (under 360) and keeps one mark, the middle (360 to 479) keeps two, the wide (480 and up) four. A tier that would fold
 * exactly one mark folds none, so two marks never fold and a `+N` always counts two or more. From `md` up nothing folds: the
 * desktop board draws every mark (A3 R1 at 1300), and the name truncates first.
 */
function Marks({ marks }: { marks: Mark[] }) {
  if (marks.length === 0) return null;
  return (
    <span className="flex flex-none items-center gap-[4px]">
      <FoldedMarks marks={marks} unfoldFromMd />
    </span>
  );
}

function Pips({ card }: { card: PanelCard | undefined }) {
  // A card the catalog does not hold has no facts: its row draws no mana value and no colors rather than a false 0.
  if (!card || (card.cmc === undefined && !card.identity?.length)) return null;
  return (
    <span className="flex flex-none items-center gap-[3px]" aria-hidden>
      {card.cmc !== undefined && <span className="flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[color:var(--elevated)] px-[3px] font-mono text-[9px] text-[color:var(--fg)]">{card.cmc}</span>}
      {inWubrgOrder(card.identity ?? []).map((c) => <span key={c} className="h-[10px] w-[10px] rounded-full" style={{ background: WUBRG_COLOR[c] }} />)}
    </span>
  );
}

/** The name, as a card details press where the page has card details and the side is one card (Hugh, 2026-11-12: names in
 *  the swaps did not open). The box's own commander pair, two cards on one side, stays text. */
function Name({ name, oracleId }: { name: string; oracleId: string | null }) {
  const detail = useCardDetailIfAny();
  if (!detail || !oracleId) return <span className="min-w-0 truncate">{name}</span>;
  return (
    <CardDetailTrigger oracleId={oracleId} name={name} title={name} preview className="min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left font-sans text-[13px] text-[color:var(--fg)] underline-offset-2 hover:underline">
      {name}
    </CardDetailTrigger>
  );
}

/** One side of a swap: `−` or `+`, the owned dot (filled: a copy is yours), the name and its marks, then what it carries.
 *  The name and the marks share one `min-w-0 flex-1` box (readiness clarification 5): the name truncates and gives up room
 *  first, the marks are `flex-none` right after it, and the pips stay at the row's end. */
function Side({ sign, name, oracleId, owned, card, marks, end }: { sign: "−" | "+"; name: string; oracleId: string | null; owned: boolean | null; card: PanelCard | undefined; marks: Mark[]; end: ReactNode }) {
  return (
    // `@container`: below `md` the marks fold by this side's own width, as the deck row's fold by the row's (`FoldedMarks`).
    <span className="@container flex min-w-0 flex-1 items-center gap-[8px] rounded-[8px] bg-[color:var(--surface-sunken)] px-[10px] py-[8px] text-[13px] text-[color:var(--fg)]">
      <span aria-hidden className={sign === "+" ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-faint)]"}>{sign}</span>
      {owned !== null && (
        <span aria-hidden className={"h-[8px] w-[8px] flex-none rounded-full " + (owned ? "bg-[color:var(--success)]" : "border border-dashed border-[color:var(--fg-faint)]")} />
      )}
      <span className="flex min-w-0 flex-1 items-center gap-[6px]" data-name-box="">
        <Name name={name} oracleId={oracleId} />
        <Marks marks={marks} />
      </span>
      <Pips card={card} />
      {end}
    </span>
  );
}

function Swap({ cutName, cutId = null, cutCard, cutMarks, addName, addId = null, addCard, addMarks, aside, reason }: {
  cutName: string; cutId?: string | null; cutCard: PanelCard | undefined; cutMarks: Mark[]; addName: string; addId?: string | null; addCard: PanelCard | undefined; addMarks: Mark[]; aside: [ReactNode, ReactNode]; reason: string | null;
}) {
  return (
    <li className="m-0 flex list-none flex-col gap-[6px] border-x-0 border-b border-t-0 border-solid border-b-[color:var(--border)] py-[10px] last:border-b-0">
      <span className="flex flex-col gap-[6px] md:flex-row md:items-center md:gap-[10px]">
        <Side sign="−" name={cutName} oracleId={cutId} owned={cutCard ? cutCard.owned : null} card={cutCard} marks={cutMarks} end={aside[0]} />
        <span aria-hidden className="hidden text-[color:var(--fg-faint)] md:block">→</span>
        <Side sign="+" name={addName} oracleId={addId} owned={addCard ? addCard.owned : null} card={addCard} marks={addMarks} end={aside[1]} />
      </span>
      {reason && <span className="text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{reason}</span>}
    </li>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px] rounded-[7px] px-[12px] py-[8px]">
      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[color:var(--fg-faint)]">{label}</span>
      <span className="flex items-baseline gap-[6px] text-[14px] font-semibold text-[color:var(--fg)]">{children}</span>
    </div>
  );
}

/** The run's own pick store and set bracket read; a test hands in its own. Read at the call, so a result never picked reaches no pick. */
const LIVE_LINE_ACTIONS: UpgradeActionDeps = {
  pick: (runId, lineId, picked) => pickUpgradeLineAction(runId, lineId, picked),
  setBracket: (fileName, runId, adds, cuts) => upgradeSetBracketAction(fileName, runId, adds, cuts),
};
const noop = () => {};
/** No press handed in: the bar's place stays, off. */
const PRESS_OFF: SuggestedChangesPress = { label: () => "", onPress: noop, off: true };

/**
 * The landing demo's line actions (A5b): a pick is held on screen and stored nowhere, and the set bracket is the stored run's
 * own read for the whole set (`seed`), so the tally drops its bracket half once a pick changes. No server call.
 */
export function demoLineActions(run: PanelRun, seed: number[] | null): UpgradeActionDeps {
  const unpicked = new Set(run.unpicked);
  const whole = run.pairs.length;
  return {
    pick: async (_runId, lineId, picked) => {
      if (picked) unpicked.delete(lineId);
      else unpicked.add(lineId);
      return { ok: true, unpicked: [...unpicked] };
    },
    setBracket: async (_file, _runId, adds, cuts) => (seed && adds.length === whole && cuts.length === whole ? { permits: seed } : null),
  };
}

export function ResultView({ panel, run, fileName = "", press = null, after = null, onPicked, lineActions = LIVE_LINE_ACTIONS, demo = false }: {
  panel: UpgradePanel;
  run: PanelRun;
  /** The precon file the run belongs to: the set bracket read is keyed by it. */
  fileName?: string;
  /** The flow's Start or Apply, in the lists' bar (call 11). Absent, the bar's press is off. */
  press?: SuggestedChangesPress | null;
  /** What follows the lists: Try another strategy (call 6). */
  after?: ReactNode;
  /** A pick was stored: the run's unpicked lines now, so the run reopened shows them (G28). */
  onPicked?: (runId: string, unpicked: string[]) => void;
  lineActions?: UpgradeActionDeps;
  /** The landing demo (A5b): no You asked, no Apply place, and picks through `lineActions` (`demoLineActions`), stored nowhere. */
  demo?: boolean;
}) {
  const lead = leadOf(panel, run);
  const leadName = lead ? lead.cards.map((c) => c.name).join(" + ") : "";
  const box = panel.commanders.find((c) => c.isFace) ?? null;
  const changed = lead !== null && box !== null && lead.key !== box.key;
  const key = run.strategyKey.split("/")[2] ?? "";
  const boxCard = box ? combined(box.cards.map((c) => c.oracleId), panel.cards) : undefined;
  const leadCard = lead ? combined(lead.cards.map((c) => c.oracleId), panel.cards) : undefined;
  // The key is the result's closed set (A3 call 9): the pick lines draw no bracket marks, so only the commander pair's are
  // glossed, and only when its group shows.
  const keyEntries = factComboEntries(
    (changed ? [boxCard, leadCard] : []).filter((c): c is PanelCard => c !== undefined),
    { combo: false },
  );
  // Read once per run and panel: the component holds the picks made on screen over these.
  const lines = useMemo(() => upgradeLines(panel, run), [panel, run]);
  const actions = useMemo(() => upgradeActions(fileName, run.id, lineActions, onPicked ?? noop), [fileName, run.id, lineActions, onPicked]);
  return (
    // The lists' bar pins to the sheet's own foot, never lifted over the app's tab bar or the deck page's dock (fresh start R2).
    <div className="flex flex-col gap-[16px]" style={{ ["--tabbar-h" as string]: "0px", ["--deck-foot-h" as string]: "0px" }}>
      <div className="flex items-center gap-[10px]">
        <span className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full border border-solid border-[color:var(--accent)] text-[color:var(--accent-text)]">
          <StrategyIcon strategy={key as StrategyKey} size={18} />
        </span>
        <h3 className="m-0 min-w-0 flex-1 font-display text-[16px] font-normal uppercase text-[color:var(--fg)]">{copy.title(run.pairs.length, run.strategyLabel)}</h3>
        <span className="flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]">{runDay(run.createdAt)}</span>
      </div>
      {/* The four facts as the run found them (call 9): the picks below move the bar's tally, not these. */}
      <div className="grid grid-cols-2 gap-[2px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[3px] md:grid-cols-4">
        <Fact label={copy.facts.ledBy}>{leadName}</Fact>
        <Fact label={copy.facts.bracket}>
          <span className="text-[color:var(--accent-text)]">{run.bracketBefore ?? "?"} → {run.bracketAfter ?? run.bracketTarget ?? "?"}</span>
        </Fact>
        <Fact label={copy.facts.toBuy}>{run.toBuy.cards} <span className="font-mono text-[12px] font-normal text-[color:var(--fg-body)]">{dollars(run.toBuy.cents)}</span></Fact>
        <Fact label={copy.facts.yours}>{run.owned}</Fact>
      </div>
      {keyEntries.length > 0 && <MarkKey marks={keyEntries} regionAria={cardMarkCopy.keyRegionAria} />}
      {run.refunded && <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.short(run.bracketTarget ?? run.bracketAfter ?? 0, run.pairs.length)}</p>}
      {changed && box && lead && (
        <section className="flex flex-col gap-[8px]">
          <h4 className="m-0 flex items-baseline gap-[8px] text-[14px] font-semibold text-[color:var(--fg)]">
            {copy.commanderGroup} <span className="font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)]">{copy.commanderAside}</span>
          </h4>
          <ul className="m-0 flex list-none flex-col p-0">
            <Swap
              cutName={box.cards.map((c) => c.name).join(" + ")} cutId={box.cards.length === 1 ? box.cards[0].oracleId : null} cutCard={boxCard} cutMarks={marksOf(boxCard, null)}
              addName={leadName} addId={lead.cards.length === 1 ? lead.cards[0].oracleId : null} addCard={leadCard} addMarks={marksOf(leadCard, null)}
              aside={[<span key="a" className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">{copy.toThe99}</span>, <span key="b" className="font-mono text-[10.5px] text-[color:var(--accent-text)]">{copy.leads}</span>]}
              reason={copy.commanderWhy(leadName, box.cards.map((c) => c.name).join(" + "))}
            />
          </ul>
        </section>
      )}
      {/* One component, one pick line, one bar (must-not): the shipped results, with the flow's press and no You asked (call 11). */}
      <SuggestedChangesRun
        runId={run.id}
        ask={upgradeAsk(panel, run)}
        lines={lines}
        live={null}
        startedAt={null}
        report={null}
        permits={upgradePermits(panel, run) as Bracket[]}
        newestPriceAsOf={new Date(run.createdAt)}
        figures={figuresOf(panel, run)}
        drift={null}
        actions={actions}
        // Picks are saved as they are made (`actions.pick`); nothing here applies, so there is nothing to read again.
        onChanged={async () => null}
        onAnnounce={noop}
        onNewRun={noop}
        press={demo ? null : (press ?? PRESS_OFF)}
        youAsked={false}
        demo={demo}
      />
      {after}
    </div>
  );
}
