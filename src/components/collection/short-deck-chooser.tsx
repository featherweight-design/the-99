"use client";
// The removal chooser (#2983; handoff `design_handoff_the99_collection_edit/addendum-removal-chooser`, R1/R2): the short-deck
// warning of an Edit copies removal when EXACTLY ONE copy is left and two or more committed decks list the card. The rows are
// the control, no new button: the player marks the decks that go SHORT (as many as copies leave: the decks listing, less the
// one copy that stays), and the one unmarked deck keeps the copy, stored as its one authored reservation by the server
// (`editCollection`'s `keep`). The default mark is the allocation's own outcome (reservations first, then seniority), neutral
// until the player picks; a pick is accent, with the footer sentence and `Back to first committed`. One short is a radio
// (round mark), two or more are checkboxes with the tally (square marks); tapping an unmarked row when the count is met is an
// inline reason, never a disabled row. Title and confirm are the warning's own; Cancel takes focus first.
import { useEffect, useMemo, useRef, useState } from "react";
import type { ShortChoice, ShortDeck } from "../../lib/collection/write";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { formatShortDeckDate } from "../../lib/decks/format";

type Claimant = ShortChoice["claimants"][number];

/**
 * Whether the chooser can draw this card: every claimant asks for exactly one copy and none holds it as a commander (a
 * commander claim cannot be reserved, a multi-copy deck is one row taking one copy in the handoff's open question B). Anything
 * else is today's warning, unchanged.
 */
export function choosable(choice: ShortChoice | undefined): choice is ShortChoice {
  return !!choice && choice.claimants.length >= 2 && choice.claimants.every((c) => c.quantity === 1 && !c.commander)
    // Exactly one listed deck holds the copy now: a brew or an ignored deck holding it would leave every listed deck marked.
    && choice.claimants.filter((c) => c.allocated > 0).length === 1;
}

/** The decks the server's allocation leaves short (no copy): the default marks. */
export function defaultMarks(choice: ShortChoice): Set<string> {
  return new Set(choice.claimants.filter((c) => c.allocated === 0).map((c) => c.deckId));
}

/** The one deck that keeps the copy once every short deck is marked; null while the count is not met. */
export function keeperOf(choice: ShortChoice, marks: ReadonlySet<string>): Claimant | null {
  const kept = choice.claimants.filter((c) => !marks.has(c.deckId));
  return marks.size === choice.claimants.length - 1 && kept.length === 1 ? kept[0] : null;
}

const joinNames = (names: string[]) => (names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

export function ShortDeckChooser({
  titleId, cardName, choice, source = "remove", pending, error, notice, onCancel, onConfirm,
}: {
  titleId: string;
  /** `remove`: the sheet's Remove from collection; `save`: a lowering (the shipped save wording). */
  source?: "remove" | "save";
  cardName: string;
  choice: ShortChoice;
  pending: boolean;
  error?: string | null;
  /** Shown when a confirm came back with a different answer: picks reset to the new default. */
  notice?: boolean;
  onCancel: () => void;
  /** The marks the player confirmed: the decks that go short (as the warning the server re-checks), and the keeper when it is not the default. */
  onConfirm: (short: ShortDeck[], keep: { oracleId: string; deckId: string } | null) => void;
}) {
  const c = collectionEditCopy.shortWarning;
  const n = choice.claimants.length - 1;
  const first = useMemo(() => defaultMarks(choice), [choice]);
  const [marks, setMarks] = useState<ReadonlySet<string>>(first);
  const [refusal, setRefusal] = useState(false);
  // A redrawn answer (a changed warning) resets the picks to the new default: the host keys this on the answer.
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelRef.current?.focus(), [choice]);

  const radio = n === 1;
  const picked = marks.size;
  const keeper = keeperOf(choice, marks);
  const isDefault = marks.size === first.size && [...marks].every((id) => first.has(id));
  const shortNames = choice.claimants.filter((x) => marks.has(x.deckId)).map((x) => x.deckName);
  const keepNames = choice.claimants.filter((x) => !marks.has(x.deckId)).map((x) => x.deckName);
  const firstKeepers = choice.claimants.filter((x) => !first.has(x.deckId)).map((x) => x.deckName);
  const defaultShort = choice.claimants.filter((x) => first.has(x.deckId)).map((x) => x.deckName);

  function tap(deckId: string) {
    setRefusal(false);
    if (marks.has(deckId)) { setMarks(new Set([...marks].filter((id) => id !== deckId))); return; }
    if (radio) { setMarks(new Set([deckId])); return; }
    if (marks.size >= n) { setRefusal(true); return; }
    setMarks(new Set([...marks, deckId]));
  }

  const footer = !keeper
    ? c.chooser.footerMore(n - picked)
    : isDefault
      ? c.chooser.footerDefault(joinNames(defaultShort), joinNames(firstKeepers), defaultShort.length)
      : c.chooser.footerPicked(joinNames(shortNames), joinNames(keepNames));

  return (
    <div className="flex flex-col gap-[14px]">
      <h2 id={titleId} className="m-0 flex-none font-display text-[20px] font-bold leading-[1.3] text-[color:var(--fg)]">
        {source === "remove" ? c.titleRemove(cardName, n) : c.titleSave(n)}
      </h2>
      {notice ? <p role="status" className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">{c.changed}</p> : null}
      <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{c.chooser.body(cardName, choice.claimants.length, n)}</p>
      <div className="flex items-baseline justify-between gap-[12px]">
        <h3 className="m-0 font-mono text-[10px] font-medium uppercase tracking-[.14em] text-[color:var(--fg-faint)]">{c.chooser.heading(n)}</h3>
        {radio ? null : <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{c.chooser.tally(picked, n)}</span>}
      </div>
      <ul
        role={radio ? "radiogroup" : "group"}
        aria-label={c.chooser.groupAria(cardName)}
        className="m-0 list-none rounded-[10px] border border-[color:var(--border)] bg-[color:var(--bg)] p-0"
      >
        {choice.claimants.map((x) => {
          const marked = marks.has(x.deckId);
          const authored = marked && !first.has(x.deckId);
          return (
            <li key={x.deckId} className="border-b border-b-[color:var(--border)] last:border-b-0">
              <button
                type="button"
                role={radio ? "radio" : "checkbox"}
                aria-checked={marked}
                tabIndex={radio && !(marked || (picked === 0 && x === choice.claimants[0])) ? -1 : undefined}
                onKeyDown={radio ? (e) => {
                  const i = choice.claimants.findIndex((y) => y.deckId === x.deckId);
                  const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
                  if (!step) return;
                  e.preventDefault();
                  const next = choice.claimants[(i + step + choice.claimants.length) % choice.claimants.length];
                  setMarks(new Set([next.deckId]));
                  setRefusal(false);
                  (e.currentTarget.closest("ul")?.querySelectorAll<HTMLElement>("[role=radio]")[choice.claimants.indexOf(next)])?.focus();
                } : undefined}
                disabled={pending}
                onClick={() => tap(x.deckId)}
                className={`flex min-h-[56px] w-full items-center gap-[12px] px-[14px] text-left ${authored ? "bg-[color:var(--elevated)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_45%,transparent)]" : ""}`}
              >
                <span
                  aria-hidden
                  className={`flex h-[18px] w-[18px] flex-none items-center justify-center border-[1.5px] ${radio ? "rounded-full" : "rounded-[4px]"} ${marked ? (authored ? "border-[color:var(--accent)]" : "border-[color:var(--fg-muted)]") : "border-[color:var(--fg-faint)]"}`}
                >
                  {marked ? <span className={`h-[8px] w-[8px] ${radio ? "rounded-full" : "rounded-[2px]"} ${authored ? "bg-[color:var(--accent)]" : "bg-[color:var(--fg-muted)]"}`} /> : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] text-[color:var(--fg)]">{x.deckName}</span>
                  <span className="truncate font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                    {x.since === null ? c.chooser.rowSubUndated(x.quantity) : c.chooser.rowSub(x.quantity, formatShortDeckDate(new Date(x.since)))}
                  </span>
                </span>
                <span className={`flex-none font-mono text-[12px] ${marked ? "text-[color:var(--danger)]" : "text-[color:var(--fg-faint)]"}`}>
                  {marked ? c.chooser.short : c.chooser.keeps}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {refusal ? <p role="status" className="m-0 border-l-2 border-[color:var(--border-strong)] pl-[9px] text-[12px] leading-[1.5] text-[color:var(--fg)]">{c.chooser.refusal(n)}</p> : null}
      <p aria-live="polite" className="m-0 text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{footer}</p>
      {!isDefault && keeper ? (
        <button type="button" onClick={() => { setMarks(first); setRefusal(false); }} className="-mt-[6px] flex min-h-[32px] items-center self-start font-sans text-[12.5px] text-[color:var(--accent-text)] underline">
          {c.chooser.back}
        </button>
      ) : null}
      {error ? <p role="alert" className="m-0 text-[13px] text-[color:var(--danger)]">{error}</p> : null}
      <div className="mt-auto flex flex-none flex-col-reverse gap-[10px] pt-[4px] md:flex-row md:justify-end">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="flex h-[44px] items-center justify-center rounded-[8px] border border-[color:var(--border-strong)] px-[18px] text-[14px] text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] disabled:opacity-60"
        >
          {c.cancel}
        </button>
        <button
          type="button"
          disabled={pending || !keeper}
          onClick={() => {
            if (!keeper) return;
            const short = choice.claimants.filter((x) => marks.has(x.deckId)).map((x): ShortDeck => ({
              deckId: x.deckId, deckName: x.deckName, oracleId: choice.oracleId, cardName: choice.cardName, short: 1,
            }));
            onConfirm(short, isDefault ? null : { oracleId: choice.oracleId, deckId: keeper.deckId });
          }}
          className="flex h-[44px] items-center justify-center rounded-[8px] border border-[color:var(--border-strong)] bg-[color:var(--elevated)] px-[18px] text-[14px] font-semibold text-[color:var(--fg)] disabled:opacity-60"
        >
          {pending ? c.saving : source === "remove" ? c.confirmRemove : c.confirmSave}
        </button>
      </div>
    </div>
  );
}
