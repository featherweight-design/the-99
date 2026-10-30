"use client";

import { useCallback, useState } from "react";

import { synopsisCopy } from "../../lib/copy/synopsis";
import { normalizeName } from "../../lib/synopsis/facts";
import { landFigure, markedCards, splitSeverity } from "../../lib/synopsis/stages-view";
import type { CheckedSynopsis } from "../../lib/synopsis/types";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { NavIcon } from "../shell/nav-icons";
import { usePreviewRow } from "./hover-preview";
import type { FindingArt } from "./receipt-modal";
import { CardName } from "./synopsis-text";

/**
 * The Overview modal's stages shape (lane e7, PR 3; `design_handoff_the99_overview_stages`, option
 * B): the pieces `SynopsisSections` draws for a contract-13 row. Each is ONE tree drawn at both
 * widths (md and up is the desktop sheet); the only duplication is none.
 *
 * Every card image is the shipped card-open, as `CardName` is: a press opens the details sheet and a
 * hover shows the shared preview. The art is `FindingArt`'s. A card with no art draws no image and
 * the line keeps its name; an image that fails to load removes itself, so nothing draws broken.
 */

const IMG = "block flex-none rounded-[4.5%/3.2%] object-cover shadow-[0_3px_10px_rgba(0,0,0,0.5)]";

/**
 * A full card image that opens the card. Draws nothing without art, or when the art fails to load;
 * `onFail` tells the caller, whose layout then drops the image column (`useArtFailures`).
 *
 * `className` sizes the image; `triggerClassName` and `triggerStyle` place the BUTTON, so a caller
 * that positions or tilts the card moves the focusable control itself and the image stays in flow,
 * giving the button its card's bounds (the fanned tip cards).
 */
export function CardImage({
  oracleId, name, art, className, style, triggerClassName = "", triggerStyle, onFail,
}: {
  oracleId: string;
  name: string;
  art: FindingArt;
  className: string;
  style?: React.CSSProperties;
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
  onFail?: (oracleId: string) => void;
}) {
  const imageUri = art.get(oracleId)?.imageUri ?? null;
  const [broken, setBroken] = useState(false);
  const preview = usePreviewRow(imageUri);
  if (!imageUri || broken) return null;
  return (
    // As `CardName`: a press closes the hover box, which would otherwise sit above the card sheet.
    <span {...preview} onClickCapture={preview.onMouseLeave} className="block flex-none" data-testid="synopsis-card-image">
      <CardDetailTrigger oracleId={oracleId} name={name} imageUri={imageUri} className={`block ${triggerClassName}`} style={triggerStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUri} alt="" onError={() => { setBroken(true); onFail?.(oracleId); }} className={`${IMG} ${className}`} style={style} />
      </CardDetailTrigger>
    </span>
  );
}

/**
 * Which cards' art failed to load, held by the layout that sizes a column for the image. A card
 * has art when the map holds a URL for it and that URL has not failed, so the layout switches to
 * its no-art form instead of leaving the text in a column built for an image.
 */
function useArtFailures(art: FindingArt) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const onFail = useCallback((id: string) => setFailed((prev) => (prev.has(id) ? prev : new Set(prev).add(id))), []);
  const has = (id: string) => !!art.get(id)?.imageUri && !failed.has(id);
  return { has, onFail };
}

type Draw = {
  content: CheckedSynopsis;
  art: FindingArt;
  /** A line with its `[[marks]]` live. */
  text: (t: string) => React.ReactNode;
};

/**
 * The commander beside the Overview paragraph, tilted. It is the commander the caller names, never a
 * card read out of the paragraph: with no id, or no art for it, the paragraph draws alone.
 */
export function OverviewWithCommander({ content, art, text, commanderId }: Draw & { commanderId: string | null }) {
  const name = (commanderId && art.get(commanderId)?.name) || (commanderId ? Object.values(content.cards).find((c) => c.oracleId === commanderId)?.name : "") || "Commander";
  const { has, onFail } = useArtFailures(art);
  const show = !!commanderId && has(commanderId);
  return (
    <div className={show ? "grid grid-cols-[72px_minmax(0,1fr)] items-start gap-[14px] md:grid-cols-[96px_minmax(0,1fr)] md:gap-[18px]" : ""} data-testid="synopsis-overview-head">
      {show ? (
        <CardImage oracleId={commanderId} name={name} art={art} onFail={onFail} className="mt-[4px] h-[100px] w-[72px] -rotate-3 md:h-[134px] md:w-[96px]" />
      ) : null}
      <p className="text-[13.5px] leading-[1.65] md:text-[14.5px] md:leading-[1.7] text-[var(--fg-body)] [text-wrap:pretty]">{text(content.overview ?? "")}</p>
    </div>
  );
}

/** Game plan: three stages labeled by position, the timeline from md and the rail below it. */
export function GamePlan({
  content, art, text, basedOn, alternateBasedOn,
}: Draw & { basedOn: (index: number, line: string) => React.ReactNode; alternateBasedOn: React.ReactNode }) {
  const stages = content.primer?.strategy ?? [];
  const { has, onFail } = useArtFailures(art);
  const labels = synopsisCopy.modal.plan.stages;
  const alternate = content.alternate;
  const backup = content.backup;
  const backupLead = backup ? markedCards(backup, content.cards, 1)[0] : undefined;
  const backupImage = !!backupLead && has(backupLead.oracleId);
  return (
    <div className="flex flex-col gap-[9px]">
      <div data-testid="synopsis-plan" className="relative flex flex-col gap-[12px] md:grid md:grid-cols-3 md:gap-[16px]">
        {/* The line the diamonds sit on: a vertical rail on a phone. From md each stage draws its own segment after its label, to the next diamond. */}
        <span aria-hidden className="absolute bottom-[8px] left-[4.5px] top-[8px] w-px bg-[var(--fg-faint)] opacity-[0.55] md:hidden" />
        {stages.map((line, i) => {
          const lead = markedCards(line, content.cards, 1)[0];
          const image = !!lead && has(lead.oracleId);
          const last = i === stages.length - 1;
          return (
            <div key={i} data-testid="synopsis-stage" className="relative pl-[22px] md:flex md:flex-col md:pl-0 md:pt-[23px]">
              <i aria-hidden className={`absolute left-0 top-[4px] block h-[10px] w-[10px] rotate-45 shadow-[0_0_0_4px_var(--surface-raised)] md:top-[1.5px] ${last ? "bg-[var(--accent)]" : "bg-[var(--fg-faint)]"}`} />
              <div className={`relative min-w-0 flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--surface-sunken)] px-[12px] py-[11px] md:p-[12px] ${image ? "grid grid-cols-[52px_minmax(0,1fr)] gap-[12px] md:flex md:flex-col md:gap-[10px]" : ""}`}>
                {image ? <CardImage oracleId={lead.oracleId} name={lead.name} art={art} onFail={onFail} className="h-[72px] w-[52px] md:h-[100px] md:w-[72px]" /> : null}
                <div className="min-w-0">
                  <div className="md:absolute md:left-[18px] md:right-[-14px] md:top-[-24px] md:flex md:items-center md:gap-[8px]">
                    <span className="mb-[5px] block font-mono text-[10px] font-medium uppercase leading-[13px] tracking-[0.14em] text-[var(--fg-body)] md:relative md:z-[1] md:mb-0 md:bg-[var(--surface-raised)] md:pr-[8px]">{labels[i]}</span>
                    {last ? null : <span aria-hidden className="hidden h-px min-w-0 flex-1 bg-[var(--fg-faint)] opacity-[0.55] md:block" />}
                  </div>
                  <p className="m-0 text-[13px] leading-[1.55] text-[var(--fg-body)] [text-wrap:pretty]">{text(line)}{basedOn(i, line)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {backup ? (
        <div data-testid="synopsis-backup" className="relative pl-[22px]">
          <i aria-hidden className="absolute left-0 top-[4px] block h-[10px] w-[10px] rotate-45 border border-[var(--fg-faint)] bg-[var(--surface-raised)] shadow-[0_0_0_4px_var(--surface-raised)]" />
          <div className={`rounded-[10px] border border-[var(--border)] bg-[var(--surface-sunken)] px-[12px] py-[11px] md:p-[12px] ${backupImage ? "grid grid-cols-[52px_minmax(0,1fr)] gap-[12px]" : ""}`}>
            {backupImage ? <CardImage oracleId={backupLead.oracleId} name={backupLead.name} art={art} onFail={onFail} className="h-[72px] w-[52px]" /> : null}
            <div className="min-w-0">
              <span className="relative z-[1] mb-[5px] block font-mono text-[10px] font-medium uppercase leading-[13px] tracking-[0.14em] text-[var(--fg-body)]">{synopsisCopy.modal.plan.backup}</span>
              <p className="m-0 text-[13px] leading-[1.55] text-[var(--fg-body)] [text-wrap:pretty]">{text(backup)}</p>
            </div>
          </div>
        </div>
      ) : null}
      {alternate ? (
        <div data-testid="synopsis-alternate" className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-[12px] rounded-[10px] border border-dashed border-[var(--border-dashed)] px-[14px] py-[12px]">
          <span aria-hidden className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--accent-text)]">
            <NavIcon href="/commanders" />
          </span>
          <div className="min-w-0">
            <span className="mb-[5px] block font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-[var(--fg-body)]">{synopsisCopy.modal.plan.alternate}</span>
            <p className="m-0 text-[13px] leading-[1.55] text-[var(--fg-body)] [text-wrap:pretty]">{text(alternate)}{alternateBasedOn}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The model's land line, led by its number as a figure when the line states exactly one. The number
 * is READ OFF the stored line, because the facts are not in the browser and the line was checked
 * against the app's own number when it was stored; a line that states none, or a range, draws the
 * line alone.
 */
export function LandLine({ line, text, basedOn }: { line: string; text: (t: string) => React.ReactNode; basedOn: React.ReactNode }) {
  const n = landFigure(line);
  return (
    <div data-testid="synopsis-land-line" className={n === null ? "mb-[2px]" : "mb-[2px] grid grid-cols-[auto_minmax(0,1fr)] items-center gap-[14px]"}>
      {n === null ? null : (
        <span data-testid="synopsis-land-figure" className="flex h-[64px] w-[64px] flex-col items-center justify-center rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-sunken)]">
          <b className="font-display text-[26px] font-bold leading-none text-[var(--fg)]">{n}</b>
          <span className="mt-[4px] font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--fg-faint)]">{synopsisCopy.modal.plan.landsUnder}</span>
        </span>
      )}
      <p className="m-0 text-[13px] leading-[1.55] text-[var(--fg-body)] [text-wrap:pretty]">{text(line)}{basedOn}</p>
    </div>
  );
}

/** Key tips: exactly two, each with its first two named cards fanned beside it. One column on a phone. */
export function TipCards({
  content, art, text, basedOn,
}: Draw & { basedOn: (index: number, line: string) => React.ReactNode }) {
  const tips = content.primer?.tips ?? [];
  const { has, onFail } = useArtFailures(art);
  return (
    <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2">
      {tips.map((tip, i) => {
        const fan = markedCards(tip.text, content.cards).filter((c) => has(c.oracleId)).slice(0, 2);
        return (
          <div key={i} data-testid="synopsis-tip" className={`grid items-center gap-[12px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-sunken)] p-[12px] ${fan.length ? "grid-cols-[78px_minmax(0,1fr)]" : ""}`}>
            {fan.length ? (
              <div className="relative h-[86px] w-[78px]">
                {fan.map((c, j) => (
                  <CardImage
                    key={c.oracleId}
                    oracleId={c.oracleId}
                    name={c.name}
                    art={art}
                    onFail={onFail}
                    // The button is what is placed and tilted; the image fills it in normal flow.
                    className="h-full w-full"
                    triggerClassName="h-[72px] w-[52px]"
                    triggerStyle={{ position: "absolute", top: 6, left: j === 0 ? 0 : 24, transform: `rotate(${j === 0 ? -7 : 6}deg)` }}
                  />
                ))}
              </div>
            ) : null}
            <p className="m-0 text-[13px] leading-[1.55] text-[var(--fg-body)] [text-wrap:pretty]">{text(tip.text)}{basedOn(i, tip.text)}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Key cards as full card images, three across: name and job beside on desktop, under on a phone. */
export function KeyCardGrid({
  content, art, text, basedOn,
}: Draw & { basedOn: (index: number, line: string, except?: string) => React.ReactNode }) {
  const { has, onFail } = useArtFailures(art);
  return (
    <div className="grid grid-cols-3 gap-x-[10px] gap-y-[12px] md:gap-[14px]">
      {(content.keyCards ?? []).map((k, i) => {
        // The key card's own name is resolved by the contract like any mark, under the same key.
        const card = content.cards[normalizeName(k.card)];
        const image = !!card && has(card.oracleId);
        return (
          <div key={i} data-testid="synopsis-key-card" className={`min-w-0 ${image ? "flex flex-col gap-[6px] md:grid md:grid-cols-[63px_minmax(0,1fr)] md:items-start md:gap-[11px]" : ""}`}>
            {image ? <CardImage oracleId={card.oracleId} name={k.card} art={art} onFail={onFail} className="aspect-[63/88] w-full md:h-[88px] md:w-[63px]" /> : null}
            <div className="min-w-0">
              <b className="mb-0 block text-[12px] leading-[1.35] [overflow-wrap:anywhere] md:mb-[4px] md:mt-[2px] md:text-[13px]">
                {card
                  ? <CardName oracleId={card.oracleId} name={k.card} imageUri={art.get(card.oracleId)?.imageUri ?? null} />
                  : <span className="font-semibold text-[var(--fg)]">{k.card}</span>}
              </b>
              <span className="text-[11.5px] leading-[1.45] text-[var(--fg-muted)] [text-wrap:pretty] md:text-[12.5px]">{text(k.job)}{basedOn(i, k.job, card?.oracleId)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A weakness with its leading Moderate or Minor drawn as a chip (Moderate in the warning ink). It draws no "Based on" row (Hugh, 2026-10-30): the line says why. */
export function WeaknessLine({ line, text }: { line: string; text: (t: string) => React.ReactNode }) {
  const sev = splitSeverity(line);
  return (
    <p className="m-0 grid grid-cols-1 items-baseline gap-[5px] text-[13px] leading-[1.55] text-[var(--fg-body)] [text-wrap:pretty] md:grid-cols-[82px_minmax(0,1fr)] md:gap-[10px]">
      {sev ? (
        <span
          data-testid="synopsis-severity"
          className={`justify-self-start rounded-full border px-[8px] py-[2px] font-mono text-[10px] font-medium leading-[13px] uppercase tracking-[0.1em] ${sev.tier === "Moderate" ? "border-[color-mix(in_oklab,var(--warning)_45%,transparent)] text-[var(--warning)]" : "border-[var(--border-strong)] text-[var(--fg-muted)]"}`}
        >
          {sev.tier}
        </span>
      ) : null}
      <span className={sev ? "" : "md:col-span-2"}>{text(sev ? sev.rest : line)}</span>
    </p>
  );
}
