"use client";

/**
 * The Shopping limit line (swap tools, ruling 4): `Marking cards over $10 · default · 4 over`. A
 * sibling of `PriceStrip` rather than a child, because the strip returns null when there is no price
 * provenance and the limit must still show (a deck with no price feed marks nothing, and says so).
 *
 * The figure is a button that swaps in a `$` field with Save and cancel. A deck that has not set a
 * limit shows the `default` chip; one that has shows `reset to $10` in its place. Draws nothing when
 * the swap tools are off, or when the Shopping list is empty.
 */
import { useId, useState, useTransition, type FormEvent } from "react";

import { swapToolsCopy as copy } from "../../lib/copy/swap-tools";
import { setShoppingLimitAction } from "../../lib/swaps/actions";
import { useSwapTools } from "../../lib/swaps/context";
import { DEFAULT_LIMIT_CENTS, formatLimit, parseLimitDollars } from "../../lib/swaps/limit";
import { useGotIt } from "./got-it";
import { AFFIX_FOCUS, AFFIX_INPUT } from "../ui/text-field";

export function StandInLimit({ shoppingCount, overCount }: { shoppingCount: number; overCount: number }) {
  const tools = useSwapTools();
  const gotIt = useGotIt();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [pending, startTransition] = useTransition();
  const errorId = useId();

  if (!tools || shoppingCount === 0) return null;
  const figure = formatLimit(tools.limitCents);

  const save = (cents: number | null) =>
    startTransition(async () => {
      const { ok } = await setShoppingLimitAction(tools.deckId, cents);
      if (ok) {
        setEditing(false);
        setAnnouncement(copy.announce.limitSaved(formatLimit(cents ?? DEFAULT_LIMIT_CENTS)));
      }
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cents = parseLimitDollars(draft);
    if (cents === null) {
      setInvalid(true);
      return;
    }
    save(cents);
  };

  const quiet = "inline-flex items-center min-h-[44px] md:min-h-0 font-mono text-[10.5px] underline underline-offset-2 bg-transparent border-none cursor-pointer";

  return (
    <div
      data-testid="stand-in-limit"
      className="flex flex-col gap-0 md:gap-[4px] mt-[4px] md:mt-[10px] px-[2px] pb-[2px] md:px-[4px] md:pb-0"
    >
      <form onSubmit={submit} className="flex flex-wrap items-center gap-[8px] min-h-[44px] md:min-h-[30px]">
        <span className="text-[12.5px]" style={{ color: "var(--fg-body)" }}>{copy.limit.lead}</span>
        {editing ? (
          <>
            <label
              className={`inline-flex items-center gap-[4px] h-[40px] md:h-[30px] px-[9px] rounded-[7px] font-mono text-[13px] ${AFFIX_FOCUS}`}
              style={{ border: "1px solid var(--accent)", background: "var(--bg)" }}
            >
              <span aria-hidden style={{ color: "var(--fg-faint)" }}>$</span>
              <input
                autoFocus
                inputMode="numeric"
                aria-label={copy.limit.fieldAria}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? errorId : undefined}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setInvalid(false);
                }}
                // 16px keeps iOS Safari from zooming the page on focus; the drawn text is 13px.
                className={`w-[7ch] ${AFFIX_INPUT} p-0 text-[16px] md:text-[13px] caret-[color:var(--accent)]`}
                style={{ color: "var(--fg)" }}
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center h-[40px] md:h-[28px] px-[12px] rounded-[8px] md:rounded-[7px] text-[13px] md:text-[12.5px] font-semibold bg-transparent cursor-pointer disabled:opacity-50 border border-solid border-[color:var(--accent)] text-[color:var(--accent)]"
            >
              {copy.limit.save}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setInvalid(false);
              }}
              className="inline-flex items-center min-h-[44px] md:min-h-0 px-[6px] text-[13px] md:text-[12.5px] bg-transparent border-none cursor-pointer text-[color:var(--fg-muted)]"
            >
              {copy.limit.cancel}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-label={copy.limit.editAria(figure)}
              onClick={() => {
                setDraft(String(tools.limitCents / 100));
                setEditing(true);
              }}
              className="inline-flex items-center min-h-[44px] md:min-h-0 leading-[44px] md:leading-[1.4] font-mono text-[13.5px] font-semibold bg-transparent border-0 p-0 cursor-pointer text-[color:var(--fg)] underline decoration-dotted decoration-[color:var(--accent)] underline-offset-[3px] md:no-underline md:border-b md:border-b-[color:var(--accent)] md:border-dotted md:border-[color:var(--accent)]"
            >
              {figure}
            </button>
            {tools.storedLimitCents === null ? (
              <span
                className="font-mono text-[9px] tracking-[0.1em] uppercase rounded-full px-[7px] py-[2px]"
                style={{ color: "var(--fg-faint)", border: "1px solid var(--border-strong)" }}
              >
                {copy.limit.defaultChip}
              </span>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => save(null)}
                className={`${quiet} px-[4px] md:px-0 text-[color:var(--fg-faint)] decoration-[color:var(--border-strong)]`}
              >
                {copy.limit.reset(formatLimit(DEFAULT_LIMIT_CENTS))}
              </button>
            )}
          </>
        )}
        {/* The separator travels with the count in one item, so a wrap never leaves it dangling
            at the end of the first line (the phone's editing state wraps here). */}
        <span className="inline-flex items-center gap-[8px] font-mono text-[11px] whitespace-nowrap" style={{ color: "var(--fg-muted)" }}>
          <span aria-hidden style={{ color: "var(--border-strong)" }}>·</span>
          {overCount > 0 ? copy.limit.overCount(overCount) : copy.limit.noneOver(figure)}
        </span>
      </form>
      {invalid ? (
        <p id={errorId} role="alert" className="m-0 font-mono text-[10px]" style={{ color: "var(--warning)" }}>
          {copy.limit.invalid}
        </p>
      ) : null}
      {/* The key: what a marked row's ⇄ does, and that the card's details hold the same door. With
          I got it on, `ShoppingKey` draws it instead, beside the buy item (R2 review). */}
      {gotIt ? null : (
        <p className="m-0 font-mono text-[10px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>
          <span aria-hidden="true" style={{ color: "var(--warning)" }}>⇄</span> {copy.limit.key}
        </p>
      )}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
    </div>
  );
}
