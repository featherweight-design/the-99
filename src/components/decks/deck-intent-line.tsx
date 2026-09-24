"use client";

import { useState } from "react";

import { saveDeckIntent } from "../../app/decks/tuning-actions";
import { countCharacters, deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { COVER_INK_SHADOW } from "../ui/art-wash";
import { MutationError } from "./mutation-error";

const copy = deckTuningCopy.intent;

/**
 * What this deck is for, SECOND in the deck header: under the name, above the commander line
 * (placement addendum r3, E2/E2b). It wraps and never truncates; a deck with no line draws no row,
 * and the commander line moves up. The ask for a first line lives in Suggested changes; here the
 * line is read, and edited in place from its own `edit`.
 *
 * An app-seeded line carries the provenance disc and the `from the build` chip, both dropped for
 * good the moment the player saves over it (`saveDeckIntent` clears the flag).
 *
 * `onArt` is the phone header, where the line sits on the deck's art and takes the cover's ink
 * shadow like the name above it.
 */
export function DeckIntentLine({
  deckId,
  intent,
  seeded,
  width,
  save = saveDeckIntent,
}: {
  deckId: string;
  intent: string | null;
  seeded: boolean;
  width: "desktop" | "phone";
  save?: (deckId: string, formData: FormData) => Promise<DeckMutationResult>;
}) {
  // Held here after a save, so the header shows the new line before the page's own data returns.
  const [line, setLine] = useState(intent);
  const [isSeeded, setIsSeeded] = useState(seeded);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(intent ?? "");
  const [saving, setSaving] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const desktop = width === "desktop";
  const shadow = desktop ? undefined : COVER_INK_SHADOW;

  if (line === null && !editing) return null;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setRefused(null);
    const form = new FormData();
    form.set("intent", draft.trim());
    // A rejection is a refusal: the field must never stay locked with nothing said.
    const result = await save(deckId, form).catch(
      (): DeckMutationResult => ({ ok: false, message: copy.refused }),
    );
    setSaving(false);
    if (!result.ok) {
      setRefused(result.message);
      return;
    }
    setLine(draft.trim() === "" ? null : draft.trim());
    setIsSeeded(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={submit} className={desktop ? "mt-[4px]" : "mt-[5px] w-full"}>
        <div className="flex flex-wrap items-center gap-[8px]">
          <input
            autoFocus
            name="intent"
            value={draft}
            onChange={(e) => {
              if (countCharacters(e.target.value) <= copy.maxLength) setDraft(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(line ?? "");
                setEditing(false);
              }
            }}
            readOnly={saving}
            placeholder={copy.placeholder}
            aria-label={copy.askLabel}
            className="min-h-[44px] min-w-0 flex-1 rounded-[8px] px-[12px] text-[16px] placeholder:text-[color:var(--fg-locked)] md:min-h-[36px] md:text-[14px]"
            style={{ background: "var(--surface-sunken)", border: "1px dashed var(--border-strong)", color: "var(--fg)" }}
          />
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] rounded-[8px] px-[14px] text-[13px] font-semibold text-[color:var(--accent)] [border:1px_solid_var(--accent)] md:min-h-[36px]"
          >
            {copy.save}
          </button>
        </div>
        {refused ? <MutationError message={refused} /> : null}
      </form>
    );
  }

  return (
    <p
      data-deck-intent
      className={desktop ? "mt-[4px] flex flex-wrap items-baseline gap-[8px]" : "mt-[5px] flex w-full flex-wrap items-baseline gap-[8px]"}
      style={{ textShadow: shadow }}
    >
      {isSeeded ? (
        <span
          role="img"
          aria-label={copy.seededAria}
          className="inline-flex size-[18px] flex-none items-center justify-center self-center rounded-full font-display text-[10px] font-bold"
          style={{ border: "1.5px solid var(--accent)", color: "var(--accent)" }}
        >
          i
        </span>
      ) : null}
      <span
        className={desktop ? "min-w-0 text-[14px] leading-[1.45]" : "min-w-0 text-[12.5px] leading-[1.5]"}
        style={{ color: "var(--fg-body)", borderBottom: "1px dashed var(--border-strong)" }}
      >
        {line}
      </span>
      {isSeeded ? (
        <span
          className="flex-none rounded-full px-[9px] py-[2px] font-mono text-[10px] uppercase tracking-[0.1em]"
          style={{ color: "var(--accent)", background: "color-mix(in oklab, var(--accent) 12%, transparent)" }}
        >
          {copy.seeded}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setDraft(line ?? "");
          setEditing(true);
        }}
        aria-label={copy.editAria}
        className="relative flex-none font-mono text-[10px] text-[color:var(--fg-locked)] hover:text-[color:var(--fg-muted)] before:absolute before:-inset-[14px] before:content-['']"
      >
        {copy.edit}
      </button>
    </p>
  );
}
