"use client";

import { useState } from "react";

import { saveDeckIntent } from "../../app/decks/tuning-actions";
import { countCharacters, deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { COVER_INK_SHADOW } from "../ui/art-wash";
import { ProvenanceDisc } from "../ui/provenance-disc";
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
 * On a phone (`width="phone"`) the line sits on the deck's art and takes the cover's ink shadow,
 * like the name above it.
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
  const [announced, setAnnounced] = useState("");
  // The line has a second door (the ask in Suggested changes) and a second copy (the other width),
  // and every save revalidates the deck. So a new line from the page replaces the held one,
  // adjusted during render rather than in an effect, so the old line never paints once more.
  const [seen, setSeen] = useState({ intent, seeded });
  if (seen.intent !== intent || seen.seeded !== seeded) {
    setSeen({ intent, seeded });
    setLine(intent);
    setIsSeeded(seeded);
    if (!editing) setDraft(intent ?? "");
  }
  const desktop = width === "desktop";
  // Under the name at 4px on desktop and 5px on a phone (V2:141, :154). The phone's header column
  // already spaces its rows 6px apart, so the line takes 1px back rather than adding 5.
  const shadow = desktop ? undefined : COVER_INK_SHADOW;

  // The save's announcement outlives the row: an emptied line draws nothing, and still says so.
  const status = (
    <span role="status" className="sr-only">
      {announced}
    </span>
  );
  if (line === null && !editing) return status;

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
    setAnnounced(deckTuningCopy.announce.intentSaved);
  }

  if (editing) {
    return (
      <>
        {status}
        <form onSubmit={submit} className={desktop ? "mt-[4px]" : "-mt-px w-full"}>
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
            {/* Escape does the same on a keyboard; a phone has no Escape. */}
            <button
              type="button"
              onClick={() => {
                setDraft(line ?? "");
                setRefused(null);
                setEditing(false);
              }}
              className="min-h-[44px] px-[6px] font-mono text-[10.5px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg-muted)] md:min-h-[36px]"
            >
              {copy.cancel}
            </button>
          </div>
          {refused ? <MutationError message={refused} /> : null}
        </form>
      </>
    );
  }

  return (
    <>
      {status}
      <p
        data-deck-intent
        className={desktop ? "mt-[4px] flex flex-wrap items-baseline gap-[8px]" : "-mt-px flex w-full flex-wrap items-baseline gap-[8px]"}
        style={{ textShadow: shadow }}
      >
        {/* The shipped disc (the fill ledger's), as the handoff names it, not the base canvas's copy. */}
        {isSeeded ? <ProvenanceDisc label={copy.seededAria} className="self-center" /> : null}
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
    </>
  );
}
