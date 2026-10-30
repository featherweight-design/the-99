"use client";

import { useId } from "react";

import { preconsCopy } from "../../lib/copy/precons";
import { synopsisCopy } from "../../lib/copy/synopsis";
import { basedOnIds, flatBasedOnIds, type EvidenceKind } from "../../lib/synopsis/based-on";
import { normalizeName } from "../../lib/synopsis/facts";
import type { SynopsisRow } from "../../lib/synopsis/generate";
import type { CheckedSynopsis, SectionId, SectionVerdict } from "../../lib/synopsis/types";
import { ModalChrome, type FindingArt } from "./receipt-modal";
import { RefusedSlot } from "./synopsis-controls";
import { CardName, SynopsisText } from "./synopsis-text";
import { GamePlan, KeyCardGrid, LandLine, OverviewWithCommander, TipCards, WeaknessLine } from "./synopsis-stages";
import { usesStagesShape } from "../../lib/synopsis/stages-view";
import { formatDeckDate } from "../../lib/decks/format";
import { analyzedWhen } from "./verdict-block";
import { CreditsText } from "../ui/credits-text";

/**
 * The full overview, `ModalChrome`'s fourth body (`SYNOPSIS-modal.md`; the `Synopsis Sheet`
 * canvas). 700 wide, no mark, titled "Overview" (Hugh, 2026-09-23). Four peer sections, Overview →
 * Primer → Key cards → Weaknesses, each after the first under a `--border` hairline. A section
 * that failed checking keeps its label and draws the refused slot in its place (§4.3); nothing of
 * it was stored, so no partial sentence can render.
 *
 * A stale overview opens with the banner and stays whole beneath it (6d). Its write control is
 * ruling D's line and button, in place of Re-analyze, and only over a current reading.
 */
export function SynopsisModal({
  synopsis,
  stale,
  deckName,
  commanderId,
  art,
  evidenceNames,
  busy,
  action,
  onRetry,
  retryNote,
  spent,
  onClose,
}: {
  synopsis: SynopsisRow;
  stale: boolean;
  deckName: string;
  /** The deck's commander, for the stages shape's commander image. */
  commanderId?: string | null;
  art: FindingArt;
  evidenceNames: Record<string, string>;
  busy: boolean;
  /** The banner's control: Re-analyze, or ruling D's write with its line and credit note. */
  action: { label: string; line: string | null; note: string | null; disabled: boolean; onPress: () => void } | null;
  onRetry: (() => void) | null;
  retryNote: string | null;
  spent: boolean;
  onClose: () => void;
}) {
  const noteId = useId();
  const aside = synopsisCopy.modal.aside(deckName, analyzedWhen(new Date(synopsis.createdAt), new Date()));
  return (
    <ModalChrome
      title={synopsisCopy.modal.title}
      // DESKTOP ONLY in the header, as the lean's reasoning does it: at 390 the title and a deck's
      // name cannot share the 43px header (the contact sheet drew the title as `OVER…`), so on the
      // phone the aside opens the body instead, whole.
      aside={<span className="hidden md:inline">{aside}</span>}
      closeLabel={synopsisCopy.modal.close}
      onClose={onClose}
      width={700}
    >
      <div className="flex flex-col gap-[18px] px-[16px] pt-[16px] pb-[28px] md:gap-[20px] md:px-[22px] md:pt-[20px] md:pb-[26px]">
        <span className="md:hidden font-mono text-[11px] text-[var(--fg-faint)]" data-testid="synopsis-aside">{aside}</span>
        {stale ? (
          <div
            role="status"
            className="flex flex-col items-stretch gap-[11px] rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-rail)] px-[14px] py-[13px] md:flex-row md:items-center md:gap-[16px] md:py-[12px] md:pl-[16px] md:pr-[14px]"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
              <p className="m-0 text-[13px] leading-[1.5] text-[var(--fg-body)]">
                {synopsisCopy.modal.stale}
                {action?.line ? <> {action.line}</> : null}
              </p>
              {action?.note ? (
                <p id={noteId} className="m-0 font-mono text-[9.5px] leading-[1.55] text-[var(--fg-faint)] md:text-[11px]"><CreditsText text={action.note} /></p>
              ) : null}
            </div>
            {action ? (
              <button
                type="button"
                onClick={action.disabled || busy ? undefined : action.onPress}
                aria-disabled={action.disabled || busy || undefined}
                aria-busy={busy || undefined}
                aria-describedby={action.note ? noteId : undefined}
                className={`inline-flex min-h-[44px] flex-none items-center justify-center whitespace-nowrap rounded-[8px] bg-[var(--fg)] px-[16px] text-[13px] font-semibold text-[var(--bg)] md:min-h-[34px] ${action.disabled || busy ? "cursor-default opacity-60" : "cursor-pointer"}`}
              >
                {action.label}
              </button>
            ) : null}
          </div>
        ) : null}
        <SynopsisSections content={synopsis.content} contractVersion={synopsis.contractVersion} commanderId={commanderId} art={art} evidenceNames={evidenceNames} onRetry={onRetry} busy={busy} note={retryNote} spent={spent} />
      </div>
    </ModalChrome>
  );
}

/**
 * A version's overview (SYNOPSIS-modal.md §4, 6e): the same chrome and sections, read only. The
 * aside names the version and its commit; one record line opens the body; there is no write
 * control and no retry, and it is never stale, since it describes the list that version froze.
 */
export function VersionSynopsisModal({
  versionNumber,
  committedAt,
  content,
  contractVersion,
  commanderId,
  art,
  evidenceNames,
  onClose,
}: {
  versionNumber: number;
  committedAt: Date;
  content: CheckedSynopsis;
  /** The contract the row was written at, which picks the stages shape (13 and later). */
  contractVersion?: number;
  /** The commander, for the stages shape's commander image. */
  commanderId?: string | null;
  art: FindingArt;
  evidenceNames: Record<string, string>;
  onClose: () => void;
}) {
  const aside = synopsisCopy.version.aside(versionNumber, formatDeckDate(committedAt));
  return (
    <ModalChrome
      title={synopsisCopy.modal.title}
      // Desktop only in the header, as the draft's sheet: the phone's 43px header holds the title.
      aside={<span className="hidden md:inline">{aside}</span>}
      closeLabel={synopsisCopy.modal.close}
      onClose={onClose}
      width={700}
    >
      <div className="flex flex-col gap-[18px] px-[16px] pt-[16px] pb-[28px] md:gap-[20px] md:px-[22px] md:pt-[20px] md:pb-[26px]">
        <span className="md:hidden font-mono text-[11px] text-[var(--fg-faint)]" data-testid="synopsis-aside">{aside}</span>
        <p data-testid="synopsis-version-record" className="m-0 border-b border-b-[color:var(--border)] border-[var(--border)] pb-[14px] text-[12.5px] leading-[1.55] text-[var(--fg-muted)]">
          {synopsisCopy.version.record(versionNumber)}
        </p>
        <SynopsisSections content={content} contractVersion={contractVersion} commanderId={commanderId} art={art} evidenceNames={evidenceNames} onRetry={null} busy={false} />
      </div>
    </ModalChrome>
  );
}

/**
 * A precon's pre-written overview, opened from its page (small items 5, `Precon-Overview`): the same
 * chrome and sections, read only. The aside names the precon and that it was written for its list;
 * there is no write control, no retry and no credit, and it is never stale on that page, which shows
 * only an overview current for the precon's list.
 */
export function PreconSynopsisModal({
  preconName,
  content,
  contractVersion,
  commanderId,
  art,
  evidenceNames,
  onClose,
}: {
  preconName: string;
  content: CheckedSynopsis;
  /** The contract the row was written at, which picks the stages shape (13 and later). */
  contractVersion?: number;
  /** The commander, for the stages shape's commander image. */
  commanderId?: string | null;
  art: FindingArt;
  evidenceNames: Record<string, string>;
  onClose: () => void;
}) {
  const aside = preconsCopy.open.overview.modalAside(preconName);
  return (
    <ModalChrome
      title={synopsisCopy.modal.title}
      // Desktop only in the header, as the draft's sheet: the phone's 43px header holds the title.
      aside={<span className="hidden md:inline">{aside}</span>}
      closeLabel={synopsisCopy.modal.close}
      onClose={onClose}
      width={700}
    >
      <div className="flex flex-col gap-[18px] px-[16px] pt-[16px] pb-[28px] md:gap-[20px] md:px-[22px] md:pt-[20px] md:pb-[26px]">
        <span className="md:hidden font-mono text-[11px] text-[var(--fg-faint)]" data-testid="synopsis-aside">{aside}</span>
        <SynopsisSections content={content} contractVersion={contractVersion} commanderId={commanderId} art={art} evidenceNames={evidenceNames} onRetry={null} busy={false} />
      </div>
    </ModalChrome>
  );
}

/** The four sections, shared by the draft's modal and a version's (PR 5). */
export function SynopsisSections({
  content,
  contractVersion,
  commanderId = null,
  art,
  evidenceNames = {},
  onRetry,
  busy,
  note = null,
  spent = false,
}: {
  content: CheckedSynopsis;
  /**
   * The contract the row was written at. 13 and later draws the stages shape (Game plan, the land
   * figure, card images); anything older, or unknown, draws exactly the shape every older row has.
   */
  contractVersion?: number | null;
  /** The commander's oracle id (the first of a pair): the stages shape draws its image beside the Overview paragraph. */
  commanderId?: string | null;
  art: FindingArt;
  /** The names of the cards the claims cite, by oracle id. Empty draws no "Based on" line. */
  evidenceNames?: Record<string, string>;
  onRetry: (() => void) | null;
  busy: boolean;
  /** The retry's credit note, and whether every credit is out (7g's disabled form). */
  note?: string | null;
  spent?: boolean;
}) {
  const verdict = (s: SectionId) => content.verdicts.find((v) => v.section === s)!;
  const refused = (v: SectionVerdict) => (
    <RefusedSlot
      sentence={synopsisCopy.sectionRefused}
      failed={v.failed}
      total={v.total}
      onRetry={onRetry}
      busy={busy}
      note={note}
      spent={spent}
      compact
    />
  );
  const text = (t: string) => <SynopsisText text={t} cards={content.cards} art={art} />;
  const basedOn = (kind: EvidenceKind, index: number, line: string, except?: string) => (
    <BasedOn ids={basedOnIds(content, kind, index, line, except)} names={evidenceNames} art={art} />
  );
  const body = "text-[13px] leading-[1.6] md:text-[13.5px] text-[var(--fg-body)]";
  // Contract 13 and later, holding what the shape needs (three stages, two tips): the stages shape.
  // Anything else draws the shape every older row has, unchanged.
  const stages = usesStagesShape(contractVersion, content);
  const landKeep = stages ? content.landKeep : undefined;
  const flatBasedOn = (kind: "landKeep" | "alternate", line: string) => (
    <BasedOn ids={flatBasedOnIds(content, kind, line)} names={evidenceNames} art={art} />
  );

  return (
    <>
      <Section id="overview" first>
        {content.overview && stages
          ? <OverviewWithCommander content={content} art={art} text={text} commanderId={commanderId} />
          : content.overview
          ? <p className="text-[13.5px] leading-[1.65] md:text-[14.5px] md:leading-[1.7] text-[var(--fg-body)] [text-wrap:pretty]">{text(content.overview)}</p>
          : refused(verdict("overview"))}
      </Section>

      <Section id="primer">
        {content.primer ? (
          <div className="flex flex-col gap-[18px]">
            <Sub title={stages ? synopsisCopy.modal.plan.title : synopsisCopy.modal.primer.strategy}>
              {stages ? <GamePlan content={content} art={art} text={text} basedOn={(i, line) => basedOn("strategy", i, line)} alternateBasedOn={content.alternate ? flatBasedOn("alternate", content.alternate) : null} /> : (
              <ol className="flex list-none flex-col gap-[8px] p-0 m-0">
                {content.primer.strategy.map((step, i) => (
                  <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] items-baseline">
                    <span className="font-mono text-[11px] text-[var(--fg-faint)]">{i + 1}</span>
                    <span className={body}>{text(step)}{basedOn("strategy", i, step)}</span>
                  </li>
                ))}
              </ol>
              )}
            </Sub>
            <Sub title={synopsisCopy.modal.primer.mulligan}>
              {landKeep ? <LandLine line={landKeep} text={text} basedOn={flatBasedOn("landKeep", landKeep)} /> : null}
              <div className="grid grid-cols-1 gap-[8px] md:grid-cols-2 md:gap-[12px]">
                <Hand
                  label={synopsisCopy.modal.keep}
                  glyph="+"
                  fixed={content.lands && !landKeep ? synopsisCopy.modal.lands.keep(content.lands.keep.low, content.lands.keep.high) : null}
                  lines={content.primer.mulligan.keep}
                  render={text}
                  basedOn={(i, line) => basedOn("keep", i, line)}
                />
                <Hand
                  label={synopsisCopy.modal.sendBack}
                  glyph="−"
                  fixed={content.lands && !landKeep
                    ? synopsisCopy.modal.lands.sendBack(content.lands.sendBack.none, content.lands.sendBack.under, content.lands.sendBack.over)
                    : null}
                  lines={content.primer.mulligan.sendBack}
                  render={text}
                  basedOn={(i, line) => basedOn("sendBack", i, line)}
                />
              </div>
            </Sub>
            <Sub title={synopsisCopy.modal.primer.tips}>
              {stages ? <TipCards content={content} art={art} text={text} basedOn={(i, line) => basedOn("tips", i, line)} /> : (
              <div className="flex flex-col gap-[10px]">
                {content.primer.tips.map((tip, i) => (
                  <div key={i} className={`border-l border-[var(--border-strong)] pl-[12px] ${body}`}>
                    <p className="m-0">{text(tip.text)}</p>
                    {basedOn("tips", i, tip.text)}
                  </div>
                ))}
              </div>
              )}
            </Sub>
          </div>
        ) : refused(verdict("primer"))}
      </Section>

      <Section id="keyCards">
        {content.keyCards && stages ? (
          <KeyCardGrid content={content} art={art} text={text} basedOn={(i, line, except) => basedOn("keyCards", i, line, except)} />
        ) : content.keyCards ? (
          <div className="overflow-hidden rounded-[10px] border border-[var(--border)]">
            {content.keyCards.map((k, i) => {
              // The key card's own name is resolved by the contract like any mark, under the same key.
              const card = content.cards[normalizeName(k.card)];
              return (
                <div
                  key={i}
                  className="flex flex-col gap-[3px] border-b border-b-[color:var(--border)] border-[var(--border)] px-[13px] py-[10px] last:border-b-0 md:grid md:grid-cols-[210px_1fr] md:items-baseline md:gap-[16px] md:px-[14px]"
                >
                  <span className="text-[13px]">
                    {card
                      ? <CardName oracleId={card.oracleId} name={k.card} imageUri={art.get(card.oracleId)?.imageUri ?? null} />
                      : <span className="font-semibold text-[var(--fg)]">{k.card}</span>}
                  </span>
                  <span className="text-[13px] leading-[1.5] text-[var(--fg-muted)]">{text(k.job)}{basedOn("keyCards", i, k.job, card?.oracleId)}</span>
                </div>
              );
            })}
          </div>
        ) : refused(verdict("keyCards"))}
      </Section>

      <Section id="weaknesses">
        {content.weaknesses && stages ? (
          <div className="flex flex-col gap-[10px]">
            {content.weaknesses.map((w, i) => (
              <WeaknessLine key={i} line={w} text={text} basedOn={basedOn("weaknesses", i, w)} />
            ))}
          </div>
        ) : content.weaknesses ? (
          <div className="flex flex-col gap-[10px]">
            {content.weaknesses.map((w, i) => (
              <p key={i} className={`m-0 grid grid-cols-[14px_minmax(0,1fr)] items-baseline ${body}`}>
                <span aria-hidden className="mt-[2px] block h-[5px] w-[5px] rotate-45 bg-[var(--fg-faint)]" />
                <span>{text(w)}{basedOn("weaknesses", i, w)}</span>
              </p>
            ))}
          </div>
        ) : refused(verdict("weaknesses"))}
      </Section>
    </>
  );
}

function Section({ id, first = false, children }: { id: SectionId; first?: boolean; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={`synopsis-${id}`}
      className={`flex flex-col gap-[11px] md:gap-[12px] ${first ? "" : "border-t border-[var(--border)] pt-[18px] md:pt-[20px]"}`}
    >
      <h3 id={`synopsis-${id}`} className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-faint)]">
        {synopsisCopy.modal.sections[id]}
      </h3>
      {children}
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[9px]">
      <h4 className="text-[13.5px] font-semibold text-[var(--fg)]">{title}</h4>
      {children}
    </div>
  );
}

function Hand({
  label, glyph, fixed, lines, render, basedOn,
}: {
  label: string;
  glyph: string;
  /** The land range, drawn by the app ahead of the model's lines; null on an overview written
   *  before it existed. The same row as a generated line: it is one more thing to check a hand for. */
  fixed: string | null;
  lines: string[];
  render: (t: string) => React.ReactNode;
  basedOn: (index: number, line: string) => React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[8px] rounded-[9px] border border-[var(--border)] bg-[var(--surface-sunken)] px-[14px] py-[12px]">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--fg-body)]">{label}</span>
      {fixed && (
        <div data-testid="synopsis-land-range" className="grid grid-cols-[14px_minmax(0,1fr)] items-baseline text-[13px] leading-[1.55] text-[var(--fg-body)]">
          <span aria-hidden className="font-mono text-[11px] text-[var(--fg-faint)]">{glyph}</span>
          <span>{fixed}</span>
        </div>
      )}
      {lines.map((line, i) => (
        <div key={i} className="grid grid-cols-[14px_minmax(0,1fr)] items-baseline text-[13px] leading-[1.55] text-[var(--fg-body)]">
          <span aria-hidden className="font-mono text-[11px] text-[var(--fg-faint)]">{glyph}</span>
          <span>{render(line)}{basedOn(i, line)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * The cards a claim is about, under it (Overview accuracy PR 6, Hugh's ruling 2026-10-10): each one
 * the same card-open name a `[[mark]]` draws, so a press opens the details sheet and a hover shows
 * the shared preview. It says what the claim is ABOUT and nothing of whether it is true (plan 3.4),
 * so there is no verified mark. A card with no name read draws nothing; a claim with none, no line.
 */
function BasedOn({ ids, names, art }: { ids: string[]; names: Record<string, string>; art: FindingArt }) {
  const shown = ids.filter((id) => names[id]);
  if (shown.length === 0) return null;
  return (
    <span data-testid="synopsis-based-on" className="mt-[3px] flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px] text-[12px] leading-[1.5]">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--fg-faint)]">{synopsisCopy.modal.basedOn}</span>
      {shown.map((id) => (
        <CardName key={id} oracleId={id} name={names[id]} imageUri={art.get(id)?.imageUri ?? null} />
      ))}
    </span>
  );
}
