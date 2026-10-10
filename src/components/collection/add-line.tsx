"use client";
// One line of the Add cards sheet (collection edit R1, B4/B5): a holding to add, with the card's
// art, a printing chip that reopens the picker, a Foil chip, a stepper and the holdings note. A line
// whose printing is not chosen yet draws the required step in its place (B4a/B4m).

import { cssUrl } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";
import {
  canToggleFoil, foilFinishOf, ownedNote, setFinishTarget, type AddLineState,
} from "../../lib/collection/add-lines";
import type { PrintingChoice } from "../../lib/collection/catalog-read";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { PrintingRegion } from "../cards/printing-region";

const copy = collectionEditCopy.add;

const thumb = (uri: string | null): React.CSSProperties =>
  uri
    ? { backgroundImage: cssUrl(uri), backgroundSize: "cover", backgroundPosition: "center" }
    : { background: identityGradient([]) };

const printingLabel = (p: PrintingChoice) =>
  `${p.setCode.toUpperCase()}${p.collectorNumber ? ` · #${p.collectorNumber}` : ""}`;

export type AddLineProps = {
  line: AddLineState;
  /** The printing picker is open on this line (new, or reopened to change it). */
  picking: boolean;
  /** Another line is blocking on its required printing: this one folds to a single row. */
  collapsed: boolean;
  /** Folded in a duplicate just now: the edge pulses once (key changes to replay it). */
  pulse: number | null;
  phone: boolean;
  disabled: boolean;
  onOpenPicker: () => void;
  onChoose: (p: PrintingChoice) => void;
  onFinish: (finish: AddLineState["finish"]) => void;
  onQuantity: (q: number) => void;
  onRemove: () => void;
};

export function AddLine(props: AddLineProps) {
  const { line, picking, collapsed, pulse, phone, disabled } = props;
  const p = line.printing;
  const choosing = p === null;
  const note = ownedNote(line);
  const foilOn = line.finish !== "nonfoil";
  const toggleable = p !== null && canToggleFoil(p);
  const hasFoil = p !== null && foilFinishOf(p) !== null;

  if (collapsed && !picking) {
    return (
      <li className="flex items-center gap-[12px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--bg)] p-[12px]">
        <span aria-hidden className="h-[42px] w-[30px] shrink-0 rounded-[4px]" style={thumb(line.imageUri)} />
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{line.name}</span>
        {p && <span className="font-mono text-[11px] text-[color:var(--fg-body)]">{printingLabel(p)}</span>}
        <span className="text-[13px] text-[color:var(--fg-muted)]">{"×"}{line.quantity}</span>
      </li>
    );
  }

  return (
    <li
      className="relative flex flex-col gap-[10px] rounded-[10px] border border-solid bg-[color:var(--bg)] p-[12px]"
      style={{ borderColor: picking ? "var(--accent)" : "var(--border)" }}
      aria-label={line.name}
    >
      {pulse !== null && (
        <span key={pulse} aria-hidden className="anim-line-pulse pointer-events-none absolute inset-0 rounded-[10px]" />
      )}
      <div className="flex items-start gap-[12px]">
        <span aria-hidden className="h-[42px] w-[30px] shrink-0 rounded-[4px]" style={thumb(line.imageUri)} />
        <div className="flex min-w-0 flex-1 flex-col gap-[6px] md:gap-[4px]">
          <span className="text-[14px] font-semibold">{line.name}</span>
          {choosing ? (
            <span
              className="inline-flex h-[32px] items-center self-start rounded-[7px] border border-dashed px-[10px] text-[11.5px] md:h-[24px] md:rounded-[6px] md:text-[11px]"
              style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
            >
              {copy.choosePrinting}
            </span>
          ) : (
            <button
              type="button"
              disabled={disabled}
              aria-expanded={picking}
              aria-label={copy.printingChipAria(line.name, printingLabel(p))}
              onClick={props.onOpenPicker}
              className="inline-flex h-[32px] cursor-pointer items-center gap-[6px] self-start rounded-[7px] border border-solid border-[color:var(--border-strong)] px-[10px] font-mono text-[11.5px] text-[color:var(--fg-body)] disabled:cursor-default md:h-[24px] md:rounded-[6px] md:px-[8px] md:text-[11px]"
            >
              {printingLabel(p)}
              <span aria-hidden>{picking ? "▴" : "▾"}</span>
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={disabled}
          aria-label={copy.removeLineAria(line.name)}
          onClick={props.onRemove}
          className="-mr-[8px] -mt-[8px] flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[7px] text-[13px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg)] disabled:cursor-default md:mr-0 md:mt-0 md:h-[28px] md:w-[28px]"
        >
          {"✕"}
        </button>
      </div>

      {choosing ? (
        <span className="text-[12.5px] text-[color:var(--fg-muted)]">{copy.afterPrinting}</span>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-[8px] md:gap-[10px]">
            <button
              type="button"
              aria-pressed={foilOn}
              disabled={disabled || !toggleable}
              title={hasFoil ? undefined : copy.noFoil}
              aria-label={hasFoil ? copy.foil : `${copy.foil}, ${copy.noFoil}`}
              onClick={() => props.onFinish(setFinishTarget(p, !foilOn))}
              className={`inline-flex h-[44px] cursor-pointer items-center gap-[6px] rounded-full border border-solid border-[color:var(--border-strong)] px-[14px] text-[12.5px] disabled:cursor-default md:h-[28px] md:px-[10px] md:text-[12px] ${
                foilOn ? "bg-[color:var(--accent)] text-[color:var(--bg)]" : "bg-transparent text-[color:var(--fg-muted)]"
              } ${hasFoil ? "" : "opacity-50"}`}
            >
              <span aria-hidden>{"◆"}</span>
              {copy.foil}
            </button>
            <span className="inline-flex h-[44px] items-center overflow-hidden rounded-[9px] border border-solid border-[color:var(--border-strong)] md:h-[28px] md:rounded-[7px]">
              <button
                type="button"
                aria-label={copy.fewer}
                disabled={disabled || line.quantity <= 1}
                onClick={() => props.onQuantity(line.quantity - 1)}
                className="h-full w-[44px] cursor-pointer text-[color:var(--fg-muted)] disabled:cursor-default disabled:opacity-40 md:w-[28px]"
              >
                {"−"}
              </button>
              <input
                inputMode="numeric"
                aria-label={copy.countAria(line.name)}
                disabled={disabled}
                value={line.quantity}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
                  if (Number.isFinite(n) && n > 0) props.onQuantity(n);
                }}
                className="h-full w-[36px] border-x border-solid border-[color:var(--border-strong)] bg-transparent text-center text-[14px] outline-none md:w-[30px] md:text-[13px]"
              />
              <button
                type="button"
                aria-label={copy.more}
                disabled={disabled}
                onClick={() => props.onQuantity(line.quantity + 1)}
                className="h-full w-[44px] cursor-pointer text-[color:var(--fg-muted)] disabled:cursor-default md:w-[28px]"
              >
                +
              </button>
            </span>
            {note && !phone && <span className="ml-auto text-[11px] text-[color:var(--fg-faint)]">{ownedText(note)}</span>}
          </div>
          {note && phone && <span className="text-[11px] text-[color:var(--fg-faint)]">{ownedText(note)}</span>}
        </>
      )}

      {picking && (
        <PrintingRegion
          role="choose"
          source="catalog"
          layout={phone ? "row" : "grid"}
          id={`add-printings-${line.id}`}
          printings={line.choices}
          intro={phone ? collectionEditCopy.add.choose.introPhone(line.choices.length) : collectionEditCopy.add.choose.intro(line.choices.length)}
          cardName={line.name}
          colorIdentity={[]}
          onPick={props.onChoose}
          autoFocus
        />
      )}
    </li>
  );
}

function ownedText(note: NonNullable<ReturnType<typeof ownedNote>>): string {
  return note.kind === "holding"
    ? copy.owned(note.have, note.after)
    : note.kind === "elsewhere"
      ? copy.ownedElsewhere(note.have)
      : copy.newToYou;
}
