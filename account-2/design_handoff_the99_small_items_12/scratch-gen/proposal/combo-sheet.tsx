// Small items 12, item 1: the combo sheet, refreshed (proposal). One body for every way in: card details' combo
// line, the deck's combos one piece away, and the feed's combo item (opened on its own). Shipped pieces kept:
// ReceiptTile plates (missing piece dashed), MissingPieceWhereLine, ComboGlyph, CostPips, the .bk2 back bar, the
// .hd2 head, the .cft foot. New: plates as a tilted pair, a facts card (Mana needed, Needs) before the steps, and
// numbered steps on the first-run step numeral, with mana symbols drawn as pips inside the step text.
import type { ReactNode } from "react";
import type { ComboModal } from "../src/lib/bracket/combo-modal";
import type { FindingArt } from "../src/lib/decks/builder-figures";
import { ReceiptTile } from "../src/components/decks/receipt-modal";
import { ComboGlyph } from "../src/components/cards/combo-glyph";
import { CostPips } from "../src/components/ui/cost-pips";
import { LinkOutLabel } from "../src/components/ui/link-out-icon";
import { deckAnalysisCopy } from "../src/lib/copy/deck-analysis";

const copy = deckAnalysisCopy.receipt;
export const NEW = "outline-[1.5px] outline-dashed outline-offset-[4px] outline-[#C9853E]";

/** A step's text with each {X} drawn as its pip, inline. */
export function StepText({ text }: { text: string }) {
  const parts = text.split(/((?:\{[^}]+\})+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\{/.test(p) ? (
          <span key={i} className="inline-flex translate-y-[1px] px-[1px]"><CostPips cost={p} size={13} /></span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Mana({ mana }: { mana: ComboModal["mana"] }) {
  if (mana.kind === "free") return <span className="text-[13px] text-[color:var(--fg)]">{copy.manaFree}</span>;
  if (mana.kind === "unknown") return <span className="text-[13px] text-[color:var(--fg-faint)]">{copy.manaUnknown}</span>;
  return mana.pips ? <span className="flex"><CostPips cost={mana.pips} size={15} /></span> : <span className="font-mono text-[13px]">{mana.value}</span>;
}

export type Plate = { oracleId: string; where?: ReactNode; missing?: boolean; still?: boolean };

export function ComboSheetBody({
  combo, art, plates, titled = true, wide = false, mark = false,
}: {
  combo: ComboModal; art: FindingArt; plates: Plate[]; titled?: boolean; wide?: boolean; mark?: boolean;
}) {
  const names = combo.cards.map((c) => art.get(c.oracleId)?.name ?? c.name);
  const sib = combo.cards.map((c) => ({ oracleId: c.oracleId, name: c.name, imageUri: art.get(c.oracleId)?.imageUri ?? null }));
  const n = combo.steps.length;
  const tiles = (
    <div className={"relative flex justify-center " + (wide ? "gap-[16px] pt-[6px]" : "gap-[18px] pt-[4px]") + (mark ? " " + NEW + " rounded-[12px]" : "")}>
      {plates.map((p, i) => (
        <div key={p.oracleId} style={{ transform: `rotate(${i === 0 ? -2.5 : 2.5}deg)`, transformOrigin: i === 0 ? "bottom right" : "bottom left" }}>
          <ReceiptTile card={combo.cards.find((c) => c.oracleId === p.oracleId)!} art={art} siblings={sib} width={wide ? 128 : 150} where={p.where} missing={p.missing} press={!p.still} />
        </div>
      ))}
      <span aria-hidden className="absolute left-1/2 top-[86px] flex h-[30px] w-[30px] -translate-x-1/2 items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] font-mono text-[15px] text-[color:var(--fg-muted)]" style={wide ? { top: 76 } : undefined}>+</span>
    </div>
  );
  const title = titled ? (
    <div className="flex flex-col gap-[9px]">
      <h3 className="m-0 flex flex-wrap items-center gap-x-[8px] font-display text-[18px] font-bold leading-[1.25] text-[color:var(--fg)] md:text-[19px]">
        <ComboGlyph />
        {names.map((nm, i) => (
          <span key={i}>{i > 0 ? <span className="font-normal text-[color:var(--fg-faint)]"> + </span> : null}{nm}</span>
        ))}
      </h3>
      <Produces combo={combo} />
    </div>
  ) : (
    <Produces combo={combo} />
  );
  const facts = (
    <div className={"flex flex-col rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-rail)]" + (mark ? " " + NEW : "")}>
      <div className="flex items-center gap-[12px] px-[14px] py-[11px]">
        <span className="w-[92px] flex-none font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.manaNeeded}</span>
        <Mana mana={combo.mana} />
      </div>
      {combo.prerequisites ? (
        <div className="flex items-start gap-[12px] border-t border-[color:var(--border)] px-[14px] py-[11px]">
          <span className="w-[92px] flex-none pt-[3px] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.prerequisites}</span>
          <span className="text-[13px] leading-[1.5] text-[color:var(--fg-body)]"><StepText text={combo.prerequisites} /></span>
        </div>
      ) : null}
    </div>
  );
  const steps = n > 0 ? (
    <div className="flex flex-col gap-[10px]">
      <h4 className="m-0 ml-[2px] flex items-baseline gap-[8px] font-sans text-[13px] font-semibold text-[color:var(--fg)]">
        {copy.steps}
        <span className="font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)]">{n}</span>
      </h4>
      <ol className={"m-0 flex list-none flex-col p-0" + (mark ? " " + NEW + " rounded-[10px]" : "")}>
        {combo.steps.map((s, i) => (
          <li key={i} className="relative grid grid-cols-[22px_1fr] gap-x-[12px] pb-[12px] last:pb-0">
            {i < n - 1 ? <span aria-hidden className="absolute left-[10.5px] top-[26px] bottom-[2px] w-px bg-[color:var(--border)]" /> : null}
            <span aria-hidden className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] font-mono text-[11px] text-[color:var(--accent-text)]">{i + 1}</span>
            <span className="pt-[1px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]"><StepText text={s} /></span>
          </li>
        ))}
      </ol>
    </div>
  ) : null;
  if (wide) {
    return (
      <div className="grid grid-cols-[288px_1fr] gap-[26px] px-[22px] pt-[22px] pb-[22px]">
        <div className="flex flex-col gap-[16px] self-start">{tiles}</div>
        <div className="flex min-w-0 flex-col gap-[18px]">{title}{facts}{steps}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[18px] px-[16px] pt-[18px] pb-[20px]">
      {tiles}
      {title}
      {facts}
      {steps}
    </div>
  );
}

function Produces({ combo }: { combo: ComboModal }) {
  if (combo.produces.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-[6px] p-0">
      {combo.produces.map((p) => (
        <li key={p} className="rounded-[6px] bg-[color:var(--elevated)] px-[9px] py-[5px] font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-body)]">{p}</li>
      ))}
    </ul>
  );
}

/** `.cft`, as shipped: the Spellbook link bottom left, the action bottom right. */
export function Foot({ action }: { action?: ReactNode }) {
  return (
    <div className="flex flex-none items-center gap-[12px] border-t border-[color:var(--border)] px-[16px] pt-[12px] pb-[18px] md:px-[18px] md:pb-[14px]">
      <a href="#" className="inline-flex min-h-[44px] items-center font-mono text-[10.5px] text-[color:var(--accent-text)] underline decoration-[color:var(--accent-text)] underline-offset-[3px]">
        <LinkOutLabel>{copy.spellbook}</LinkOutLabel>
      </a>
      {action ? <div className="ml-auto flex flex-col items-end">{action}</div> : null}
    </div>
  );
}

/** `.bk2`, as shipped. */
export function BackBar({ label }: { label: string }) {
  return (
    <div className="flex flex-none items-center gap-[8px] min-h-[52px] pl-[16px] pr-[8px] border-b border-[color:var(--border)]">
      <span className="-ml-[8px] inline-flex min-h-[44px] items-center gap-[8px] px-[8px] font-sans text-[13.5px] font-medium text-[color:var(--fg)]">
        <span aria-hidden className="text-[16px] text-[color:var(--fg-muted)]">←</span>{label}
      </span>
      <span className="ml-auto flex h-[44px] w-[44px] items-center justify-center font-mono text-[15px] text-[color:var(--fg-muted)]">×</span>
    </div>
  );
}

/** `.hd2`, as shipped (the pass sheet's and the combos list's head). */
export function Head({ eyebrow, title, lead, mark = false }: { eyebrow: string; title: string; lead: ReactNode; mark?: boolean }) {
  return (
    <div className={"flex flex-none items-start gap-[10px] py-[10px] pl-[18px] pr-[8px] border-b border-[color:var(--border)]" + (mark ? " " + NEW : "")}>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="m-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--accent-text)]">{eyebrow}</p>
        <h2 className="m-0 mt-[4px] flex items-center gap-[8px] font-display text-[17px] font-bold leading-tight text-[color:var(--fg)]"><ComboGlyph />{title}</h2>
        <p className="m-0 mt-[4px] text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{lead}</p>
      </div>
      <span className="flex h-[44px] w-[44px] flex-none items-center justify-center font-mono text-[15px] text-[color:var(--fg-muted)]">×</span>
    </div>
  );
}
