"use client";
// Add a partner to an existing deck (#491, proposal). Built from the shipped Change commander sheet's
// pieces (Thumb, Mark, Plate, the figure button, the group headings) and Suggested changes' Pick line
// for the card that leaves. Nothing here is a new pattern: each part is a shipped row or block.

import type { ReactNode } from "react";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { CostPips } from "../ui/cost-pips";
import { Chevron } from "../ui/chevron";
import { GhostButton, PrimaryButton } from "../ui/button";
import { SheetGroupHeading, SheetGroupToggle } from "../ui/sheet-group";
import { BuyTag } from "./buy-tag";
import { Mark, Plate, Thumb, shortName } from "./change-commander-sheet";
import { SuggestedChangesPickLine } from "./suggested-changes-pick-line";
import { DeckSearchField } from "./deck-filter-column";
import { changeCommanderCopy as cc } from "../../lib/copy/change-commander";
import { partnerAddCopy as copy, type PairKind } from "../../lib/copy/partner-add";
import { guildLabel } from "../../lib/copy/color-labels";
import type { CandidateHalf } from "../../lib/commander-change/candidates";
import type { LineItem } from "../../lib/tuning/state";

const WUBRG = ["W", "U", "B", "R", "G"];
const pips = (colors: string[]) => WUBRG.filter((c) => colors.includes(c)).map((c) => `{${c}}`).join("");

export type PartnerCandidate = {
  key: string;
  half: CandidateHalf;
  /** The pair's identity, when it is wider than the deck's; null when it adds no color. */
  widens: string[] | null;
  fit: { n: number; of: number };
};

/** The commander's card details on its own deck page (deck-scoped, single commander, the ability printed). */
export function PartnerDoorBox({ kind, short, other }: { kind: PairKind; short: string; other?: string }) {
  const body = kind === "with" ? copy.door.body.with(short, other ?? "") : copy.door.body[kind](short);
  return (
    <div
      data-partner-door=""
      className="mt-[16px] flex flex-col gap-[12px] rounded-[10px] p-[14px_16px] md:mt-[22px] md:flex-row md:items-center md:justify-between md:gap-[16px] md:p-[18px_20px]"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <div className="flex min-w-0 flex-col gap-[6px]">
        <h3 className="m-0 font-mono text-[9.5px] uppercase tracking-[0.14em] md:text-[10px]" style={{ color: "var(--fg-faint)" }}>
          {copy.door.heading}
        </h3>
        <p className="m-0 text-[13.5px] leading-[1.55] md:text-[15px]" style={{ color: "var(--fg-body)" }}>{body}</p>
      </div>
      <GhostButton className="h-[44px] flex-none self-stretch px-[16px] text-[13.5px] font-semibold md:h-[36px] md:self-auto md:text-[12.5px]">
        {copy.door.cta[kind]}
      </GhostButton>
    </div>
  );
}

function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <h3 className="m-0 font-display text-[18px] font-bold leading-[1.3]" style={{ color: "var(--fg)" }}>{title}</h3>
      {children}
    </div>
  );
}

function Para({ children, mono = false }: { children: ReactNode; mono?: boolean }) {
  return mono ? (
    <p className="m-0 font-mono text-[10.5px] leading-[1.55] text-pretty" style={{ color: "var(--fg-faint)" }}>{children}</p>
  ) : (
    <p className="m-0 text-[13.5px] leading-[1.55] text-pretty" style={{ color: "var(--fg-body)" }}>{children}</p>
  );
}

/** One partner: the shipped candidate row's thumb, name, mark, figure and Choose, with the identity it widens to. */
export function PartnerRow({ c, open = false, matched = [] }: { c: PartnerCandidate; open?: boolean; matched?: string[] }) {
  const h = c.half;
  return (
    <div data-partner-row="" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-start gap-[12px] py-[11px]">
        <Thumb halves={[h]} />
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-[9px] gap-y-[3px]">
            <CardDetailTrigger oracleId={h.oracleId} name={h.name} siblings={[]} imageUri={h.imageUri} preview className="min-w-0 text-left text-[14px] font-semibold leading-[1.3]" style={{ color: "var(--fg)", borderBottom: "1px solid var(--border-strong)" }}>
              {h.name}
            </CardDetailTrigger>
            {h.inDeck ? (
              <span className="flex-none font-mono text-[10.5px]" style={{ color: "var(--fg-muted)" }}>
                {copy.section.inDeckMark.split(" · ")[0]}
                <span className="px-[4px]" style={{ color: "var(--border-strong)" }}>·</span>
                {copy.section.inDeckMark.split(" · ")[1]}
              </span>
            ) : (
              <Mark half={h} newestAsOf={h.price?.asOf ?? null} />
            )}
          </div>
          <span className="flex min-h-[16px] flex-wrap items-center gap-x-[8px] gap-y-[3px]">
            <CostPips cost={h.manaCost} size={13} className="flex flex-none items-center gap-[3px]" />
            {c.widens ? (
              <span className="inline-flex items-center gap-[6px] font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>
                {copy.section.widens}
                <CostPips cost={pips(c.widens)} size={12} className="flex flex-none items-center gap-[2px]" />
                {guildLabel(c.widens)}
              </span>
            ) : null}
          </span>
          <div className="mt-[2px] flex flex-wrap items-center justify-between gap-x-[12px] gap-y-[6px]">
            <button type="button" aria-expanded={open} className="relative inline-flex h-[36px] cursor-pointer items-center gap-[7px] font-mono text-[12px] text-[color:var(--fg-body)]">
              <span style={{ borderBottom: "1px dotted var(--fg-faint)" }}>{cc.sheet.figure(c.fit.n, c.fit.of, true)}</span>
              <Chevron kind="disclosure" open={open} style={{ color: "var(--fg-faint)" }} />
            </button>
            <GhostButton className="relative ml-auto h-[36px] px-[14px] text-[12.5px] font-semibold">{cc.sheet.choose}</GhostButton>
          </div>
        </div>
      </div>
      {open ? <MatchedPlate caption={cc.sheet.expandCaption(c.fit.n, shortName(h.name))} names={matched} /> : null}
    </div>
  );
}

function MatchedPlate({ caption, names, indent = true }: { caption: string; names: string[]; indent?: boolean }) {
  return (
    <div className={`mb-[12px] flex flex-col gap-[9px] rounded-[9px] border border-[color:var(--border)] px-[13px] pb-[13px] pt-[11px]`} style={{ background: "var(--surface-sunken)" }}>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--fg-faint)" }}>{caption}</p>
      <div className="grid grid-cols-2 gap-x-[14px] md:grid-cols-3">
        {names.map((n) => (
          <span key={n} className="min-w-0 truncate py-[3px] text-left text-[12.5px] leading-[1.35]" style={{ color: "var(--fg-body)" }}>{n}</span>
        ))}
      </div>
    </div>
  );
}

/** The sheet's list for a single commander that can pair: Add a partner first, then the shipped Replace groups. */
export function AddPartnerSection({
  kind, short, other, counted, yours, toBuy, openKey, matched, toBuyTotal, replace,
}: {
  kind: PairKind; short: string; other?: string; counted: number;
  yours: PartnerCandidate[]; toBuy: PartnerCandidate[]; openKey?: string; matched?: string[]; toBuyTotal?: number;
  /** The shipped list's own groups, drawn under the Replace heading. */
  replace?: ReactNode;
}) {
  const rule = kind === "with" ? copy.section.rule.with(other ?? "") : copy.section.rule[kind];
  return (
    <div className="flex flex-col gap-[16px]">
      <SectionHead title={copy.section.title[kind]}>
        <Para>{copy.section.lede(short)} {rule}</Para>
        <Para mono>{cc.sheet.counted(counted)}</Para>
      </SectionHead>
      {yours.length > 0 ? (
        <section className="flex flex-col">
          <SheetGroupHeading as="h3" label={cc.sheet.groupYours(yours.length)} note={cc.sheet.groupNote} />
          {yours.map((c) => <PartnerRow key={c.key} c={c} open={openKey === c.key} matched={matched} />)}
        </section>
      ) : (
        <p className="font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>{cc.sheet.ownsNone}</p>
      )}
      {toBuy.length > 0 ? (
        <section className="flex flex-col">
          <SheetGroupHeading as="h3" label={cc.sheet.groupBuy(toBuyTotal ?? toBuy.length)} note={cc.sheet.groupNote} />
          {toBuy.map((c) => <PartnerRow key={c.key} c={c} open={openKey === c.key} matched={matched} />)}
          {(toBuyTotal ?? 0) > toBuy.length ? (
            <SheetGroupToggle all={false} onToggle={() => {}} label={cc.sheet.showAll(toBuyTotal!)} fewer={cc.sheet.showFewer} className="pl-[68px]" />
          ) : null}
        </section>
      ) : null}
      {replace ? (
        <div className="mt-[10px] flex flex-col gap-[16px]">
          <SectionHead title={copy.section.replaceTitle(short)}>
            <Para>{cc.sheet.lede.single}</Para>
          </SectionHead>
          {replace}
        </div>
      ) : null}
    </div>
  );
}

type PlateCard = { oracleId: string; name: string; imageUri: string | null; manaCost: string | null };

/** The confirm for a partner from outside the deck: Change commander's confirm, with the card that leaves. */
export function PartnerConfirm({
  commander, partner, cut, cuts, pickedId, widens, opens, opensOpen, opensNames, query, results, room, hasVersion, failed,
}: {
  commander: PlateCard; partner: CandidateHalf; cut: PlateCard | null;
  cuts: LineItem[]; pickedId: string | null;
  widens: string[] | null; opens?: { n: number; colors: string }; opensOpen?: boolean; opensNames?: string[];
  query?: string; results?: LineItem[]; room?: number; hasVersion: boolean; failed?: boolean;
}) {
  const cShort = shortName(commander.name);
  const pShort = shortName(partner.name);
  const fate = partner.owned ? <>{cc.sheet.free}</> : <BuyTag variant="row" price={partner.price} newestAsOf={partner.price?.asOf ?? null} />;
  const sentence = cut ? copy.confirm.sentence(pShort, cShort, cut.name) : copy.confirm.sentenceRoom(pShort, cShort, room ?? 0);
  return (
    <div className="flex min-h-full flex-col gap-[16px]">
      <button type="button" className="inline-flex min-h-[44px] items-center gap-[7px] self-start font-mono text-[11px] text-[color:var(--fg-faint)]">
        {cc.confirm.back}
      </button>
      <div className="flex items-start justify-center gap-[14px] pb-[2px] pt-[4px]">
        {cut ? (
          <>
            <Plate cards={[cut]} label={cc.confirm.out} tone="out" pair={false} />
            <span aria-hidden="true" className="mt-[-30px] flex-none self-center font-mono text-[18px]" style={{ color: "var(--fg-faint)" }}>→</span>
          </>
        ) : null}
        <Plate
          cards={[commander, { oracleId: partner.oracleId, name: partner.name, imageUri: partner.imageUri, manaCost: partner.manaCost }]}
          label={cc.confirm.inPair}
          tone="in"
          pair
          fates={[<>{copy.confirm.stays}</>, fate]}
        />
      </div>
      <div className="flex flex-col gap-[9px] pt-[12px]" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-[14px] leading-[1.6] text-pretty" style={{ color: "var(--fg)" }}>{sentence}</p>
        {!partner.owned ? (
          <div className="flex flex-wrap items-center gap-[8px] text-[13px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
            <span>{cc.confirm.buy(pShort)}</span>
            <BuyTag variant="row" price={partner.price} newestAsOf={partner.price?.asOf ?? null} />
          </div>
        ) : null}
        {widens ? (
          <div className="flex flex-col gap-[2px]">
            <span className="inline-flex flex-wrap items-center gap-[8px] text-[13px] leading-[1.55]" style={{ color: "var(--fg-body)" }}>
              <CostPips cost={pips(widens)} size={13} className="flex flex-none items-center gap-[3px]" />
              {copy.confirm.widens(guildLabel(widens))}
            </span>
            {opens ? (
              <button type="button" aria-expanded={!!opensOpen} className="relative inline-flex h-[36px] cursor-pointer items-center gap-[7px] self-start font-mono text-[12px] text-[color:var(--fg-body)]">
                <span style={{ borderBottom: "1px dotted var(--fg-faint)" }}>{copy.confirm.opens(opens.n, opens.colors)}</span>
                <Chevron kind="disclosure" open={!!opensOpen} style={{ color: "var(--fg-faint)" }} />
              </button>
            ) : null}
            {opens && opensOpen ? <MatchedPlate indent={false} caption={copy.confirm.opensCaption(opens.colors)} names={opensNames ?? []} /> : null}
          </div>
        ) : null}
      </div>
      {cut ? (
        <section className="flex flex-col gap-[8px]">
          <SheetGroupHeading as="h3" label={copy.confirm.cutHeading} note={copy.confirm.cutNote} />
          {(query ? results ?? [] : cuts).map((item) => (
            <SuggestedChangesPickLine key={item.id} item={item} permits={[]} newestPriceAsOf={null} picked={item.cardOracleId === pickedId} off={false} onToggle={() => {}} aim={null} />
          ))}
          {query && (results ?? []).length === 0 ? (
            <p className="font-mono text-[11px]" style={{ color: "var(--fg-muted)" }}>{copy.confirm.anotherNone(query)}</p>
          ) : null}
          <div className="flex flex-col gap-[6px] pt-[4px]">
            <span className="font-mono text-[10.5px]" style={{ color: "var(--fg-faint)" }}>{copy.confirm.another}</span>
            <DeckSearchField value={query ?? ""} onChange={() => {}} placeholder={copy.confirm.anotherPlaceholder} />
          </div>
        </section>
      ) : null}
      <p className="font-mono text-[10.5px] leading-[1.6] text-pretty" style={{ color: "var(--fg-faint)" }}>
        {!hasVersion ? copy.confirm.brew : cut ? copy.confirm.lands(cut.name, cShort) : copy.confirm.landsRoom(pShort, cShort)}
      </p>
      <div className="mt-auto flex flex-col gap-[8px] md:mt-0 md:flex-row md:items-center md:gap-[10px] md:pt-[4px]">
        <PrimaryButton className="min-h-[44px] rounded-[8px] px-[20px] text-[14px]">
          {failed ? cc.confirm.failedRetry : cc.confirm.ctaPair(cShort, pShort)}
        </PrimaryButton>
        <GhostButton className="min-h-[44px] rounded-[8px] px-[18px] text-[13.5px] font-medium text-[color:var(--fg-muted)]">{cc.confirm.backList}</GhostButton>
      </div>
      {failed ? (
        <p role="alert" className="font-mono text-[11px] leading-[1.55]" style={{ color: "var(--danger)" }}>{cc.confirm.failed(cShort)}</p>
      ) : null}
    </div>
  );
}
