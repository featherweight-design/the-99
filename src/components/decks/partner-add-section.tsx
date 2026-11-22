"use client";
// The Add a partner section of the Change commander sheet (#491): the partners a single commander could
// take beside it, then the shipped Replace groups under their own heading. Built from the sheet's own pieces
// (Thumb, Mark, the figure button, the group headings), so a row here is a shipped row.

import { useId, useState, type ReactNode } from "react";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { CostPips } from "../ui/cost-pips";
import { Chevron } from "../ui/chevron";
import { GhostButton } from "../ui/button";
import { SheetGroupHeading, SheetGroupToggle } from "../ui/sheet-group";
import { Mark, Thumb, shortName, GROUP_SHOWN } from "./change-commander-sheet";
import { changeCommanderCopy as cc } from "../../lib/copy/change-commander";
import { partnerAddCopy as copy } from "../../lib/copy/partner-add";
import { guildLabel } from "../../lib/copy/color-labels";
import type { Candidate, ChangeCandidates } from "../../lib/commander-change/candidates";
import type { PartnerOption } from "../../lib/commander-change/partner-add";
import type { PartnerAbility } from "../../lib/decks/partner";

const WUBRG = ["W", "U", "B", "R", "G"];
export const pipsOf = (colors: readonly string[]) => WUBRG.filter((c) => colors.includes(c)).map((c) => `{${c}}`).join("");
/** The deck's identity once a partner's colors join it, in WUBRG order. */
export const widenedIdentity = (identity: readonly string[], opens: readonly string[]) =>
  WUBRG.filter((c) => identity.includes(c) || opens.includes(c));

export function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <h3 className="m-0 font-display text-[18px] font-bold leading-[1.3]" style={{ color: "var(--fg)" }}>{title}</h3>
      {children}
    </div>
  );
}

export function Para({ children, mono = false }: { children: ReactNode; mono?: boolean }) {
  return mono ? (
    <p className="m-0 font-mono text-[10.5px] leading-[1.55] text-pretty" style={{ color: "var(--fg-faint)" }}>{children}</p>
  ) : (
    <p className="m-0 text-[13.5px] leading-[1.55] text-pretty" style={{ color: "var(--fg-body)" }}>{children}</p>
  );
}

/** A caption over a grid of card names, each opening the shared card modal: the figure's list and the confirm's opened cards. */
export function MatchedPlate({
  id, caption, cards,
}: {
  id?: string;
  caption: string;
  cards: { oracleId: string; name: string; imageUri: string | null }[];
}) {
  return (
    <div
      id={id}
      className="mb-[12px] flex flex-col gap-[9px] rounded-[9px] border border-[color:var(--border)] px-[13px] pt-[11px] pb-[13px]"
      style={{ background: "var(--surface-sunken)" }}
    >
      <p className="font-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: "var(--fg-faint)" }}>{caption}</p>
      <div className="grid grid-cols-2 gap-x-[14px] md:grid-cols-3">
        {cards.map((m) => (
          <CardDetailTrigger
            key={m.oracleId}
            oracleId={m.oracleId}
            name={m.name}
            siblings={cards.map((x) => x.oracleId)}
            imageUri={m.imageUri}
            preview
            className="min-w-0 truncate py-[3px] text-left text-[12.5px] leading-[1.35]"
            style={{ color: "var(--fg-body)" }}
          >
            {m.name}
          </CardDetailTrigger>
        ))}
      </div>
    </div>
  );
}

/** One partner: the shipped candidate row's thumb, name, mark, figure and Choose, with the colors it widens to. */
function PartnerRow({
  candidate, partnerId, widens, newestAsOf, open, onToggle, onChoose,
}: {
  candidate: Candidate;
  partnerId: string;
  widens: string[] | null;
  newestAsOf: Date | null;
  open: boolean;
  onToggle: () => void;
  onChoose: () => void;
}) {
  const panelId = useId();
  const h = candidate.halves.find((x) => x.oracleId === partnerId) ?? candidate.halves[candidate.halves.length - 1];
  const name = shortName(h.name);
  return (
    <div data-partner-row="" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-start gap-[12px] py-[11px]">
        <Thumb halves={[h]} />
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-[9px] gap-y-[3px]">
            <CardDetailTrigger
              oracleId={h.oracleId}
              name={h.name}
              siblings={[]}
              imageUri={h.imageUri}
              preview
              className="min-w-0 text-left text-[14px] leading-[1.3] font-semibold"
              style={{ color: "var(--fg)", borderBottom: "1px solid var(--border-strong)" }}
            >
              {h.name}
            </CardDetailTrigger>
            {h.inDeck ? (
              <span className="flex-none font-mono text-[10.5px]" style={{ color: "var(--fg-muted)" }}>
                {copy.section.inDeckMark.split(" · ")[0]}
                <span className="px-[4px]" style={{ color: "var(--border-strong)" }}>·</span>
                {copy.section.inDeckMark.split(" · ")[1]}
              </span>
            ) : (
              <Mark half={h} newestAsOf={newestAsOf} />
            )}
          </div>
          <span className="flex min-h-[16px] flex-wrap items-center gap-x-[8px] gap-y-[3px]">
            <CostPips cost={h.manaCost} size={13} className="flex flex-none items-center gap-[3px]" />
            {widens ? (
              <span className="inline-flex items-center gap-[6px] font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>
                {copy.section.widens}
                <CostPips cost={pipsOf(widens)} size={12} className="flex flex-none items-center gap-[2px]" />
                {guildLabel(widens)}
              </span>
            ) : null}
          </span>
          <div className="mt-[2px] flex flex-wrap items-center justify-between gap-x-[12px] gap-y-[6px]">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={cc.sheet.figureAria(candidate.fit.n, candidate.fit.of, name)}
              onClick={onToggle}
              className="relative inline-flex h-[36px] cursor-pointer items-center gap-[7px] font-mono text-[12px] text-[color:var(--fg-body)] after:absolute after:-inset-y-[4px] after:inset-x-0"
            >
              <span style={{ borderBottom: "1px dotted var(--fg-faint)" }}>{cc.sheet.figure(candidate.fit.n, candidate.fit.of, true)}</span>
              <Chevron kind="disclosure" open={open} style={{ color: "var(--fg-faint)" }} />
            </button>
            <GhostButton
              data-choose=""
              aria-label={copy.section.chooseAria(h.name)}
              onClick={onChoose}
              className="relative ml-auto h-[36px] px-[14px] text-[12.5px] font-semibold after:absolute after:-inset-y-[4px] after:inset-x-0"
            >
              {cc.sheet.choose}
            </GhostButton>
          </div>
        </div>
      </div>
      {open ? <MatchedPlate id={panelId} caption={cc.sheet.expandCaption(candidate.fit.n, name)} cards={candidate.matched} /> : null}
    </div>
  );
}

/**
 * Whether a shipped candidate is a partner already in the 99 beside a commander that stays (the pair-up
 * keep): it belongs in this section, marked as nothing leaving, and not under Replace.
 */
export function isKeptPartner(c: Candidate, current: ChangeCandidates["current"]): boolean {
  return c.halves.length === 2 && current.length === 1
    && c.halves.some((h) => h.oracleId === current[0].oracleId) && c.halves.some((h) => h.inDeck);
}

/** The section's rows: the in-deck partners first (nothing leaves), then the partners from outside. */
export function AddPartnerSection({
  data, ability, short, keptYours, onChoose,
}: {
  data: ChangeCandidates;
  ability: PartnerAbility;
  short: string;
  /** Partners already in the 99, drawn first in Yours with the in-deck mark. */
  keptYours: Candidate[];
  onChoose: (c: Candidate) => void;
}) {
  const add = data.partnerAdd;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [allYours, setAllYours] = useState(false);
  const [allBuy, setAllBuy] = useState(false);
  if (!add) return null;
  const partnerOf = (c: Candidate) => c.halves.find((h) => h.oracleId !== data.current[0].oracleId)?.oracleId ?? c.halves[1].oracleId;
  const yoursAll: { c: Candidate; opens: string[] }[] = [
    ...keptYours.map((c) => ({ c, opens: [] as string[] })),
    ...add.yours.map((o) => ({ c: o as Candidate, opens: o.opens })),
  ];
  const buyAll = add.toBuy.map((o: PartnerOption) => ({ c: o as Candidate, opens: o.opens }));
  const shown = <T,>(rows: T[], all: boolean) => (all ? rows : rows.slice(0, GROUP_SHOWN));
  const row = ({ c, opens }: { c: Candidate; opens: string[] }) => (
    <PartnerRow
      key={c.key}
      candidate={c}
      partnerId={partnerOf(c)}
      widens={opens.length > 0 ? widenedIdentity(data.identity, opens) : null}
      newestAsOf={data.newestAsOf}
      open={openKey === c.key}
      onToggle={() => setOpenKey((k) => (k === c.key ? null : c.key))}
      onChoose={() => onChoose(c)}
    />
  );
  const toggle = (total: number, all: boolean, set: () => void) =>
    total > GROUP_SHOWN ? (
      <SheetGroupToggle all={all} onToggle={set} label={cc.sheet.showAll(total)} fewer={cc.sheet.showFewer} className="pl-[68px]" />
    ) : null;
  return (
    <div data-partner-section="" className="flex flex-col gap-[16px]">
      <SectionHead title={copy.section.title(ability.kind)}>
        <Para>{copy.section.lede(short, add.needsCut)} {copy.section.rule(ability)}</Para>
        <Para mono>{cc.sheet.counted(data.counted)}</Para>
      </SectionHead>
      {yoursAll.length > 0 ? (
        <section className="flex flex-col" aria-label={cc.sheet.groupYours(yoursAll.length)}>
          <SheetGroupHeading as="h3" label={cc.sheet.groupYours(yoursAll.length)} note={cc.sheet.groupNote} />
          {shown(yoursAll, allYours).map(row)}
          {toggle(yoursAll.length, allYours, () => setAllYours((v) => !v))}
        </section>
      ) : (
        <p className="font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>{cc.sheet.ownsNone}</p>
      )}
      {buyAll.length > 0 ? (
        <section className="flex flex-col" aria-label={cc.sheet.groupBuy(buyAll.length)}>
          <SheetGroupHeading as="h3" label={cc.sheet.groupBuy(buyAll.length)} note={cc.sheet.groupNote} />
          {shown(buyAll, allBuy).map(row)}
          {toggle(buyAll.length, allBuy, () => setAllBuy((v) => !v))}
        </section>
      ) : null}
    </div>
  );
}
