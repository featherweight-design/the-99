"use client";

import { useId } from "react";

import { synopsisCopy } from "../../lib/copy/synopsis";
import { normalizeName } from "../../lib/synopsis/facts";
import type { SynopsisRow } from "../../lib/synopsis/generate";
import type { CheckedSynopsis, SectionId, SectionVerdict } from "../../lib/synopsis/types";
import { ModalChrome, type FindingArt } from "./receipt-modal";
import { RefusedSlot } from "./synopsis-controls";
import { CardName, SynopsisText } from "./synopsis-text";
import { formatDeckDate } from "../../lib/decks/format";
import { analyzedWhen } from "./verdict-block";

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
  art,
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
  art: FindingArt;
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
                <p id={noteId} className="m-0 font-mono text-[9.5px] leading-[1.55] text-[var(--fg-faint)] md:text-[11px]">{action.note}</p>
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
        <SynopsisSections content={synopsis.content} art={art} onRetry={onRetry} busy={busy} note={retryNote} spent={spent} />
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
  art,
  onClose,
}: {
  versionNumber: number;
  committedAt: Date;
  content: CheckedSynopsis;
  art: FindingArt;
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
        <SynopsisSections content={content} art={art} onRetry={null} busy={false} />
      </div>
    </ModalChrome>
  );
}

/** The four sections, shared by the draft's modal and a version's (PR 5). */
export function SynopsisSections({
  content,
  art,
  onRetry,
  busy,
  note = null,
  spent = false,
}: {
  content: CheckedSynopsis;
  art: FindingArt;
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
  const body = "text-[13px] leading-[1.6] md:text-[13.5px] text-[var(--fg-body)]";

  return (
    <>
      <Section id="overview" first>
        {content.overview
          ? <p className="text-[13.5px] leading-[1.65] md:text-[14.5px] md:leading-[1.7] text-[var(--fg-body)] [text-wrap:pretty]">{text(content.overview)}</p>
          : refused(verdict("overview"))}
      </Section>

      <Section id="primer">
        {content.primer ? (
          <div className="flex flex-col gap-[18px]">
            <Sub title={synopsisCopy.modal.primer.strategy}>
              <ol className="flex list-none flex-col gap-[8px] p-0 m-0">
                {content.primer.strategy.map((step, i) => (
                  <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] items-baseline">
                    <span className="font-mono text-[11px] text-[var(--fg-faint)]">{i + 1}</span>
                    <span className={body}>{text(step)}</span>
                  </li>
                ))}
              </ol>
            </Sub>
            <Sub title={synopsisCopy.modal.primer.mulligan}>
              <div className="grid grid-cols-1 gap-[8px] md:grid-cols-2 md:gap-[12px]">
                <Hand
                  label={synopsisCopy.modal.keep}
                  glyph="+"
                  fixed={content.lands ? synopsisCopy.modal.lands.keep(content.lands.keep.low, content.lands.keep.high) : null}
                  lines={content.primer.mulligan.keep}
                  render={text}
                />
                <Hand
                  label={synopsisCopy.modal.sendBack}
                  glyph="−"
                  fixed={content.lands
                    ? synopsisCopy.modal.lands.sendBack(content.lands.sendBack.none, content.lands.sendBack.under, content.lands.sendBack.over)
                    : null}
                  lines={content.primer.mulligan.sendBack}
                  render={text}
                />
              </div>
            </Sub>
            <Sub title={synopsisCopy.modal.primer.tips}>
              <div className="flex flex-col gap-[10px]">
                {content.primer.tips.map((tip, i) => (
                  <p key={i} className={`border-l border-[var(--border-strong)] pl-[12px] ${body}`}>
                    {text(tip.text)}
                  </p>
                ))}
              </div>
            </Sub>
          </div>
        ) : refused(verdict("primer"))}
      </Section>

      <Section id="keyCards">
        {content.keyCards ? (
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
                  <span className="text-[13px] leading-[1.5] text-[var(--fg-muted)]">{text(k.job)}</span>
                </div>
              );
            })}
          </div>
        ) : refused(verdict("keyCards"))}
      </Section>

      <Section id="weaknesses">
        {content.weaknesses ? (
          <div className="flex flex-col gap-[10px]">
            {content.weaknesses.map((w, i) => (
              <p key={i} className={`m-0 grid grid-cols-[14px_minmax(0,1fr)] items-baseline ${body}`}>
                <span aria-hidden className="mt-[2px] block h-[5px] w-[5px] rotate-45 bg-[var(--fg-faint)]" />
                <span>{text(w)}</span>
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
  label, glyph, fixed, lines, render,
}: {
  label: string;
  glyph: string;
  /** The land range, drawn by the app ahead of the model's lines; null on an overview written
   *  before it existed. The same row as a generated line: it is one more thing to check a hand for. */
  fixed: string | null;
  lines: string[];
  render: (t: string) => React.ReactNode;
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
          <span>{render(line)}</span>
        </div>
      ))}
    </div>
  );
}
