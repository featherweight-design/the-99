"use client";
// One line of the Add cards sheet (collection edit R1, B4/B5): a holding to add, with the card's
// art, a printing chip that reopens the picker, a Foil chip, a stepper and the holdings note. A line
// whose printing is not chosen yet draws the required step in its place (B4a/B4m).

import { useEffect, useRef, useState } from "react";
import { identityGradient } from "../../lib/collection/gradients";
import { ownedNote, SPECIAL_FINISHES, type AddLineState } from "../../lib/collection/add-lines";
import { isSynthetic, printingLabel as labelOf } from "../../lib/collection/edit-lines";
import type { PrintingChoice } from "../../lib/collection/catalog-read";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { PrintingRegion } from "../cards/printing-region";
import { AFFIX_FOCUS_INPUT, AFFIX_INPUT } from "../ui/text-field";
import { twMerge } from "tailwind-merge";
import { Chevron } from "../ui/chevron";
import { ArtLayer } from "../ui/art-layer";

const copy = collectionEditCopy.add;

/** A line's thumb: the plain ground, and the art fading in over it when there is one (`ArtLayer`). */
function Thumb({ uri }: { uri: string | null }) {
  return (
    <span aria-hidden className="relative h-[42px] w-[30px] shrink-0 overflow-hidden rounded-[4px]" style={{ background: identityGradient([]) }}>
      {uri ? <ArtLayer src={uri} /> : null}
    </span>
  );
}

/** A holding with no catalog printing behind it (edit mode only) names no set to draw. */
const printingLabel = (p: PrintingChoice) =>
  p.setCode === "" && p.collectorNumber === "" ? collectionEditCopy.copies.noPrinting : labelOf(p);

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
  /**
   * Edit mode: the note at the right edge, in place of the add mode's holdings note. `tone` inks
   * a change (`up` is --success, `down` stays body ink) and a note is plain text otherwise.
   */
  note?: { text: string; tone: "up" | "down" | "plain" } | null;
  /** Edit mode's line for a printing still to choose: `New printing`, in place of the card's name. */
  title?: string;
  /** The printing region's question, when it is not the add mode's (a fixed printing asks which copy). */
  intro?: string;
  /** A scanned line's fix (card-scan L2): its name is a press that opens the scan's photo and closest cards. */
  fix?: {
    open: boolean;
    onToggle: () => void;
    onSwap: (guess: NonNullable<AddLineState["scan"]>["guesses"][number]) => void;
    onSearch: () => void;
  };
};

export function AddLine(props: AddLineProps) {
  const { line, picking, collapsed, pulse, phone, disabled } = props;
  const p = line.printing;
  const choosing = p === null;
  // Edit mode names its own note (`props.note`), even when it has none to give: the add mode's
  // `you own ×3 → ×4` would describe the line against a count the sheet already shows.
  const note = props.note !== undefined ? null : ownedNote(line);
  const editNote = props.note ?? null;
  // A printing the catalog does not list cannot change finish: a row naming none cannot be made.
  const synthetic = p !== null && isSynthetic(p);
  // One chip per finish beside nonfoil that the printing exists in. Pressing the lit one goes back
  // to nonfoil, which a foil-only or etched-only printing does not have, so that chip is locked on.
  const specials = p === null ? [] : SPECIAL_FINISHES.filter((f) => p.finishes.includes(f));
  const hasNonfoil = p?.finishes.includes("nonfoil") ?? true;

  // A pending line (Auto's scan, its printings still being read) is drawn as a collapsed row with no printing yet: it
  // asks nothing, and gets its printing or leaves the list on its own.
  if ((collapsed && !picking) || line.pending) {
    return (
      <li className="flex items-center gap-[12px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--bg)] p-[12px]">
        <Thumb uri={p?.imageUri ?? line.imageUri} />
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{line.name}</span>
        {p ? (
          <span className="font-mono text-[11px] text-[color:var(--fg-body)]">{printingLabel(p)}</span>
        ) : line.pending ? null : (
          // Normal mode's scanned lines wait their turn for the printing step (L3).
          <span className="font-mono text-[11px]" style={{ color: "var(--warning)" }}>{copy.choosePrinting}</span>
        )}
        <span className="text-[13px] text-[color:var(--fg-muted)]">{"×"}{line.quantity}</span>
      </li>
    );
  }

  return (
    <li
      className="relative flex flex-col gap-[10px] rounded-[10px] border border-solid bg-[color:var(--bg)] p-[12px]"
      style={{ borderColor: picking || props.fix?.open ? "var(--accent)" : "var(--border)" }}
      aria-label={line.name}
      data-line-id={line.id}
    >
      {pulse !== null && (
        <span key={pulse} aria-hidden className="anim-line-pulse pointer-events-none absolute inset-0 rounded-[10px]" />
      )}
      <div className="flex items-start gap-[12px]">
        <Thumb uri={p?.imageUri ?? line.imageUri} />
        <div className="flex min-w-0 flex-1 flex-col gap-[6px] md:gap-[4px]">
          {props.fix && line.scan ? (
            <button
              type="button"
              disabled={disabled}
              aria-expanded={props.fix.open}
              aria-controls={`scan-fix-${line.id}`}
              onClick={props.fix.onToggle}
              // 24px as drawn, with the 44px a phone press needs drawn past it.
              className="relative inline-flex min-h-[24px] max-w-full cursor-pointer items-center gap-[6px] self-start border-0 bg-transparent p-0 text-left text-[14px] font-semibold text-[color:var(--fg)] after:absolute after:inset-x-0 after:-inset-y-[10px] after:content-[''] disabled:cursor-default md:after:hidden"
            >
              <span className="min-w-0">{line.name}</span>
              <span aria-hidden className="flex-none text-[11px] text-[color:var(--fg-faint)]">{"▾"}</span>
            </button>
          ) : (
            <span className="text-[14px] font-semibold">{choosing && props.title ? props.title : line.name}</span>
          )}
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
              <Chevron open={picking} />
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={disabled}
          aria-label={copy.removeLineAria(line.name)}
          onClick={props.onRemove}
          className="-mr-[8px] -mt-[8px] flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[7px] text-[13px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg)] disabled:cursor-default md:mr-0 md:mt-0 md:h-[28px] md:w-[28px] transition-colors"
        >
          {"✕"}
        </button>
      </div>

      {choosing ? (
        <span className="text-[12.5px] text-[color:var(--fg-muted)]">{copy.afterPrinting}</span>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-[8px] md:gap-[10px]">
            {(synthetic ? [] : specials.length > 0 ? specials : (["foil"] as const)).map((f) => {
              const available = specials.length > 0;
              const on = line.finish === f;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={on}
                  disabled={disabled || !available || (on && !hasNonfoil)}
                  title={available ? undefined : copy.noFoil}
                  aria-label={available ? copy[f] : `${copy[f]}, ${copy.noFoil}`}
                  onClick={() => props.onFinish(on ? "nonfoil" : f)}
                  className={`inline-flex h-[44px] cursor-pointer items-center gap-[6px] rounded-full border border-solid border-[color:var(--border-strong)] px-[14px] text-[12.5px] disabled:cursor-default md:h-[28px] md:px-[10px] md:text-[12px] ${
                    on ? "bg-[color:var(--accent)] text-[color:var(--bg)]" : "bg-transparent text-[color:var(--fg-muted)]"
                  } ${available ? "" : "opacity-50"}`}
                >
                  <span aria-hidden>{"\u25c6"}</span>
                  {copy[f]}
                </button>
              );
            })}
            {/* The stepper: its buttons ring themselves, so only the count's focus lights the field. */}
            <span className={`inline-flex h-[44px] items-center overflow-hidden rounded-[9px] border border-solid border-[color:var(--border-strong)] md:h-[28px] md:rounded-[7px] ${AFFIX_FOCUS_INPUT}`}>
              <button
                type="button"
                aria-label={copy.fewer}
                disabled={disabled || line.quantity <= 1}
                onClick={() => props.onQuantity(line.quantity - 1)}
                className="h-full w-[44px] cursor-pointer text-[color:var(--fg-muted)] disabled:cursor-default disabled:opacity-40 md:w-[28px]"
              >
                {"−"}
              </button>
              <CountInput name={line.name} quantity={line.quantity} disabled={disabled} onQuantity={props.onQuantity} />
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
            {editNote && !phone && <EditNote note={editNote} className="ml-auto" />}
          </div>
          {note && phone && <span className="text-[11px] text-[color:var(--fg-faint)]">{ownedText(note)}</span>}
          {editNote && phone && <EditNote note={editNote} />}
        </>
      )}

      {props.fix?.open && line.scan && <ScanFix line={line} scan={line.scan} fix={props.fix} disabled={disabled} />}

      {picking && (
        <PrintingRegion
          role="choose"
          source="catalog"
          layout={phone ? "row" : "grid"}
          id={`add-printings-${line.id}`}
          printings={line.choices}
          intro={props.intro ?? (phone ? collectionEditCopy.add.choose.introPhone(line.choices.length) : collectionEditCopy.add.choose.intro(line.choices.length))}
          cardName={line.name}
          colorIdentity={[]}
          onPick={props.onChoose}
          autoFocus
        />
      )}
    </li>
  );
}

const fixCopy = collectionEditCopy.scan.fix;

/** L2: what the scan saw, its closest cards with the one on the line ticked first, and the way out to search. */
function ScanFix({ line, scan, fix, disabled }: {
  line: AddLineState;
  scan: NonNullable<AddLineState["scan"]>;
  fix: NonNullable<AddLineProps["fix"]>;
  disabled: boolean;
}) {
  // A radio group's own keys, as the printing region has them: arrows move and choose, Home and End jump to the ends,
  // Tab leaves (only the ticked tile is a tab stop), and nothing wraps.
  const group = useRef<HTMLDivElement>(null);
  function onKey(e: React.KeyboardEvent, index: number) {
    const last = scan.guesses.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? Math.min(index + 1, last)
        : e.key === "ArrowLeft" || e.key === "ArrowUp" ? Math.max(index - 1, 0)
          : e.key === "Home" ? 0
            : e.key === "End" ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    if (next === index || disabled) return;
    fix.onSwap(scan.guesses[next]);
  }
  // A swap reorders the tiles (the card on the line leads) and holds them while it loads: focus follows the ticked
  // tile, if it was in the group.
  useEffect(() => {
    const g = group.current;
    if (!g || !g.contains(document.activeElement)) return;
    g.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [line.oracleId, disabled]);
  return (
    <div
      id={`scan-fix-${line.id}`}
      role="group"
      aria-label={fixCopy.regionLabel}
      className="flex flex-col gap-[12px] border-0 border-t border-solid border-[color:var(--border)] pt-[12px]"
    >
      <p className="m-0 flex items-center gap-[10px] text-[13.5px] text-[color:var(--fg-muted)]">
        <span className="relative h-[62px] w-[44px] flex-none overflow-hidden rounded-[5px] bg-[color:var(--surface-sunken)]">
          {scan.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- a data URL made on this device, never an optimisable asset
            <img src={scan.photo} alt={fixCopy.yourScan} className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
        </span>
        {fixCopy.question}
      </p>
      {/* Clipped as drawn, with 5px of room inside the clip for the ticked tile's ring (2px at a 3px offset). */}
      <div ref={group} role="radiogroup" aria-label={fixCopy.regionLabel} className="-m-[5px] flex gap-[10px] overflow-hidden p-[5px]">
        {scan.guesses.map((g, i) => {
          const on = g.oracleId === line.oracleId;
          return (
            <button
              key={g.oracleId}
              type="button"
              role="radio"
              aria-checked={on}
              // Held, not disabled, while a swap loads: a disabled button drops focus to the page.
              aria-disabled={disabled || undefined}
              tabIndex={on ? 0 : -1}
              onClick={() => !on && !disabled && fix.onSwap(g)}
              onKeyDown={(e) => onKey(e, i)}
              className="flex w-[96px] flex-none cursor-pointer flex-col border-0 bg-transparent p-0 text-left text-[color:var(--fg)] aria-disabled:cursor-default"
            >
              <span
                className="relative block aspect-[63/88] w-[96px] overflow-hidden rounded-[10px] shadow-[inset_0_0_0_1px_rgba(0,0,0,.35)]"
                style={{ background: identityGradient([]), outline: on ? "2px solid var(--accent)" : undefined, outlineOffset: on ? 3 : undefined }}
              >
                {g.imageUri ? <ArtLayer src={g.imageUri} /> : null}
                {on && (
                  <span aria-hidden className="absolute right-[8px] top-[8px] flex h-[21px] w-[21px] items-center justify-center rounded-[5px] bg-[color:var(--accent)] text-[11px] text-[color:var(--bg)]">
                    {"✓"}
                  </span>
                )}
              </span>
              <span className={`mt-[7px] text-[12px] leading-[1.3] ${on ? "font-semibold" : ""}`}>{g.name}</span>
              {on && (
                <span className="mt-[3px] flex items-center gap-[5px] font-mono text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--accent)]">
                  <span aria-hidden className="h-[7px] w-[7px] rotate-45 bg-[color:var(--accent)]" />
                  {fixCopy.onList}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={fix.onSearch}
        className="min-h-[44px] cursor-pointer self-start border-0 bg-transparent p-0 text-left text-[13.5px] text-[color:var(--accent)] disabled:cursor-default"
      >
        {fixCopy.search}
      </button>
    </div>
  );
}

const NOTE_INK = { up: "var(--success)", down: "var(--fg-body)", plain: "var(--fg-faint)" } as const;

function EditNote({ note, className = "" }: { note: NonNullable<AddLineProps["note"]>; className?: string }) {
  return (
    <span className={`font-mono text-[11px] ${className}`} style={{ color: NOTE_INK[note.tone] }}>
      {note.text}
    </span>
  );
}

function ownedText(note: NonNullable<ReturnType<typeof ownedNote>>): string {
  return note.kind === "holding"
    ? copy.owned(note.have, note.after)
    : note.kind === "elsewhere"
      ? copy.ownedElsewhere(note.have)
      : copy.newToYou;
}

/**
 * The count field. Keeps its own draft so a player can clear it and type a fresh number; only a
 * positive whole number reaches the line, and leaving the field puts the line's count back.
 * 16px below `md` so iOS Safari does not zoom the sheet on focus.
 */
function CountInput({ name, quantity, disabled, onQuantity }: { name: string; quantity: number; disabled: boolean; onQuantity: (q: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      inputMode="numeric"
      aria-label={copy.countAria(name)}
      disabled={disabled}
      value={draft ?? String(quantity)}
      onChange={(e) => {
        const text = e.target.value.replace(/\D/g, "");
        setDraft(text);
        const n = Number.parseInt(text, 10);
        if (Number.isFinite(n) && n > 0) onQuantity(n);
      }}
      onBlur={() => setDraft(null)}
      // The shared input half, with the stepper's own dividers put back over its `border-none`.
      className={twMerge(AFFIX_INPUT, "h-full w-[36px] border-x border-solid border-[color:var(--border-strong)] text-center text-[16px] md:w-[30px] [@media(pointer:fine)]:md:text-[13px]")}
    />
  );
}
