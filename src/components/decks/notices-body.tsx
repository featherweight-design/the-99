"use client";

/**
 * Notices (deck notices HANDOFF §2, §4): the fifth `ModalChrome` body, 560 wide. The deck's rules
 * violations first, then the data entries under the findings' own labels and marks in the findings
 * row's order, then the bracket rules. An empty group is absent (`inGroupOrder` has dropped it).
 *
 * A row names what moved and never edits anything: no remove action, no + or −, and never
 * `--success` / `--warning`, which are the pending banner's marks for the player's own edits.
 * Card names are the Overview's form and open the card on top of this sheet.
 *
 * THE FOOT (D12). Not dirty: the sentence and a Re-analyze that recomputes the bracket only, spends
 * nothing and writes no overview. Dirty: the sentence and *Analysis tab →*, which closes onto the
 * banner, since the banner's Re-analyze reads both. A deck never analyzed has no foot; its legality
 * groups carry their own.
 */
import { useId } from "react";

import { CardDetailTrigger } from "../cards/card-detail-provider";
import { GhostButton } from "../ui/button";
import { colorNames } from "../../lib/copy/color-labels";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { deckNoticesCopy as copy } from "../../lib/copy/notices";
import { formatShortDeckDate } from "../../lib/decks/format";
import type { NoticeGroup } from "../../lib/notices/group";
import type { DataNotice, DeckNotices, ViolationNotice } from "../../lib/notices/read";
import type { FindingId } from "../../lib/bracket/findings";
import { FindingMark } from "./finding-mark";
import { ModalChrome } from "./receipt-modal";

export type NoticesFoot =
  | { kind: "none" }
  /** `note`: the overview check's note while a legality entry stands (plan D12, F3 (b)), without
   *  *See which →*, which would open the sheet it sits in. The foot never writes an overview, so it
   *  carries no credit note. */
  | { kind: "reanalyze"; busy: boolean; failed: string | null; note?: string | null; onPress: () => void }
  | { kind: "toTab"; onPress: () => void };

const LEGAL_GROUPS = new Set<NoticeGroup>(["notLegal", "outsideColors"]);

function groupLabel(group: NoticeGroup): string {
  if (group === "notLegal") return copy.sheet.groups.notLegal;
  if (group === "outsideColors") return copy.sheet.groups.outsideColors;
  if (group === "rules") return copy.sheet.groups.rules;
  return deckAnalysisCopy.findings.labels[group as FindingId];
}

export function NoticesBody({
  notices,
  deckName,
  commanders,
  foot,
  onClose,
}: {
  notices: DeckNotices;
  deckName: string;
  /** The commanders' names and joined identity, for the outside-colors reason line. */
  commanders: { names: string[]; identity: string[] };
  foot: NoticesFoot;
  onClose: () => void;
}) {
  const siblings = notices.groups.flatMap((g) =>
    g.items.flatMap((i) => (i.kind === "data" ? i.cards.map((c) => c.oracleId) : [i.card.oracleId])),
  );
  const lastLegal = notices.groups.filter((g) => LEGAL_GROUPS.has(g.group)).at(-1)?.group ?? null;
  return (
    <ModalChrome
      width={560}
      title={copy.sheet.title}
      aside={notices.analyzedAt ? copy.sheet.since(formatShortDeckDate(new Date(notices.analyzedAt))) : deckName}
      closeLabel={copy.sheet.closeAria}
      onClose={onClose}
    >
      <div data-testid="notices-body">
        {notices.groups.map((g) => (
          <section
            key={g.group}
            data-notice-group={g.group}
            className="flex flex-col gap-[4px] px-[16px] pt-[12px] pb-[10px] md:px-[18px] md:pt-[14px] md:pb-[12px] [&+&]:border-t [&+&]:border-[color:var(--border)]"
          >
            <h3
              className="m-0 flex min-h-[20px] items-center gap-[8px] font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{ color: LEGAL_GROUPS.has(g.group) ? "var(--danger)" : "var(--fg-faint)" }}
            >
              {!LEGAL_GROUPS.has(g.group) && g.group !== "rules" && <FindingMark id={g.group as FindingId} />}
              {groupLabel(g.group)}
            </h3>
            <ul className="m-0 list-none p-0">
              {g.items.map((item) =>
                item.kind === "data" ? (
                  <DataRow key={item.seq} item={item} siblings={siblings} />
                ) : (
                  <ViolationRow key={`${item.group}:${item.card.oracleId}`} item={item} siblings={siblings} commanders={commanders} />
                ),
              )}
            </ul>
            {/* Under the LAST legality group, whatever follows it (NS:123,126; CV:174). */}
            {g.group === lastLegal && (
              <p data-notice-legal-foot className="m-0 mt-[2px] font-mono text-[10.5px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
                {copy.sheet.legal.foot}
              </p>
            )}
          </section>
        ))}
      </div>
      {foot.kind !== "none" && <Foot foot={foot} />}
    </ModalChrome>
  );
}

function CardName({ oracleId, name, siblings }: { oracleId: string; name: string; siblings: string[] }) {
  return (
    <CardDetailTrigger
      oracleId={oracleId}
      name={name}
      siblings={siblings}
      className="inline border-b border-b-[color:var(--accent)] border-dotted border-[color:var(--accent)] font-semibold text-[color:var(--fg)]"
    >
      {name}
    </CardDetailTrigger>
  );
}

function DataRow({ item, siblings }: { item: DataNotice; siblings: string[] }) {
  const rule = item.group === "rules";
  return (
    <li data-notice-row className="flex min-h-[36px] items-start gap-[10px] py-[7px] md:gap-[12px]">
      <span className="w-[56px] flex-none font-mono text-[10.5px] leading-[20px] md:w-[64px]" style={{ color: "var(--fg-muted)" }}>
        {copy.sheet.dir[item.direction]}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px] text-[13.5px]">
        {rule ? (
          <>
            <span className="font-semibold leading-[20px]" style={{ color: "var(--fg)" }}>{item.detail.rule}</span>
            {item.detail.reads && <span className="text-[13px] leading-[1.5] text-pretty" style={{ color: "var(--fg-body)" }}>{item.detail.reads}</span>}
          </>
        ) : (
          <>
            <span className="leading-[20px]">
              {item.cards.map((c, i) => (
                <span key={c.oracleId}>
                  {i > 0 && <span style={{ color: "var(--fg-faint)" }}> + </span>}
                  <CardName oracleId={c.oracleId} name={c.name} siblings={siblings} />
                </span>
              ))}
            </span>
            {item.group === "twoCardCombos" && item.detail.produces && item.detail.produces.length > 0 && (
              <span className="flex items-center gap-[6px] text-[12.5px] leading-[1.5]" style={{ color: "var(--fg-muted)" }}>
                {copy.sheet.combo(item.detail.produces.join(", "))}
              </span>
            )}
          </>
        )}
      </span>
      <span className="flex-none whitespace-nowrap text-right font-mono text-[10.5px] leading-[20px]" style={{ color: "var(--fg-faint)" }}>
        {formatShortDeckDate(new Date(item.publishedAt))}
      </span>
    </li>
  );
}

function ViolationRow({
  item,
  siblings,
  commanders,
}: {
  item: ViolationNotice;
  siblings: string[];
  commanders: { names: string[]; identity: string[] };
}) {
  return (
    <li data-notice-row className="flex min-h-[36px] flex-col justify-center gap-[2px] py-[7px] text-[13.5px] leading-[1.45]">
      <span><CardName oracleId={item.card.oracleId} name={item.card.name} siblings={siblings} /></span>
      <span className="flex flex-wrap items-center gap-[6px] text-[12.5px] leading-[1.5]" style={{ color: "var(--fg-muted)" }}>
        {item.group === "notLegal" ? (
          copy.sheet.legal.notLegal
        ) : (
          <>
            {/* Flat swatches (NS:86), decorative: the words beside them name the colors. */}
            {item.colors.map((c) => (
              <span
                key={c}
                aria-hidden="true"
                className="size-[10px] flex-none rounded-[2px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.4)]"
                style={{ background: `var(--${c.toLowerCase()})` }}
              />
            ))}
            {copy.sheet.legal.outside(
              colorNames(item.colors).join(" and "),
              commanders.names.join(" and "),
              colorNames(commanders.identity).join(", ") || "colorless",
            )}
          </>
        )}
      </span>
    </li>
  );
}

function Foot({ foot }: { foot: Exclude<NoticesFoot, { kind: "none" }> }) {
  const failed = foot.kind === "reanalyze" ? foot.failed : null;
  const noteId = useId();
  return (
    <div
      data-notices-foot={foot.kind}
      className="flex flex-wrap items-center gap-[12px] border-t border-[color:var(--border)] px-[16px] pt-[14px] pb-[22px] md:gap-[16px] md:px-[18px] md:pb-[16px]"
      style={{ background: "var(--surface-rail)" }}
    >
      {/* F2: on failure the sentence BECOMES the failure line, beside Try again. */}
      <p
        role={failed ? "status" : undefined}
        className={`m-0 min-w-0 text-[13px] leading-[1.55] text-pretty ${foot.kind === "reanalyze" ? "flex-[1_1_220px]" : "flex-[1_1_260px]"}`}
        style={{ color: failed ? "var(--danger)" : "var(--fg-muted)" }}
      >
        {failed ?? (foot.kind === "reanalyze" ? copy.sheet.foot.holds : copy.sheet.foot.dirty)}
      </p>
      {/* The note slot, in CREDITS' banner placement: sentence, note, button at 1300 (the note
          right-aligned beside the press); centered under the button at 390. */}
      {foot.kind === "reanalyze" && foot.note ? (
        <p
          id={noteId}
          data-testid="notices-foot-note"
          className="order-3 m-0 w-full text-center font-mono text-[9.5px] leading-[1.55] text-[color:var(--fg-faint)] md:order-none md:w-auto md:max-w-[340px] md:text-right md:text-[11px]"
        >
          {foot.note}
        </p>
      ) : null}
      {foot.kind === "reanalyze" ? (
        <GhostButton
          onClick={foot.onPress}
          disabled={foot.busy}
          aria-busy={foot.busy}
          aria-describedby={foot.note ? noteId : undefined}
          className="h-[44px] w-full flex-none rounded-[8px] text-[14px] font-medium md:h-[36px] md:w-auto md:px-[16px] md:text-[13px]"
        >
          {foot.failed ? deckAnalysisCopy.banner.tryAgain : deckAnalysisCopy.banner.reanalyze}
        </GhostButton>
      ) : (
        <button
          type="button"
          onClick={foot.onPress}
          className="inline-flex min-h-[44px] flex-none items-center gap-[8px] font-mono text-[11px] text-[color:var(--accent)] hover:text-[color:var(--accent-hover)] transition-colors"
        >
          <span className="border-b border-b-[color:var(--accent)] border-dotted border-[color:var(--accent)]">{copy.sheet.foot.toTab}</span>
          <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}
