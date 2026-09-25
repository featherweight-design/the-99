"use client";

import { useState } from "react";

import { countCharacters, deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { MutationError } from "./mutation-error";

const copy = deckTuningCopy.intent;

/**
 * The ask for what a deck is for, inside Suggested changes above its action row (placement
 * addendum, README :175; INTENT-where-it-lives.md). Shown only while the deck has no line.
 * Skippable, and it says so: the suggestions run without it.
 *
 * The pitch names the strongest marked axis, so it is said only when games have marked one; a
 * deck with no marks gets the label and the field. The field keeps what was typed through a
 * refused save, and the block stays mounted while the save is in flight.
 */
export function DeckIntentAsk({
  deckId,
  fix,
  save,
  onSaved,
  runBlocked = false,
}: {
  deckId: string;
  fix: { axis: string; hurt: number; games: number } | null;
  /** The suggestions cannot run now (every card locked, Locked): the skip line, which promises
   *  "the suggestions still run", is not drawn (Hugh, 2026-09-25). */
  runBlocked?: boolean;
  save: (deckId: string, formData: FormData) => Promise<{ ok: true } | { ok: false; message: string }>;
  onSaved: (line: string) => void;
}) {
  const [value, setValue] = useState("");
  const [skipped, setSkipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  if (skipped) return null;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const line = value.trim();
    if (line === "") return;
    setSaving(true);
    setRefused(null);
    const form = new FormData();
    form.set("intent", line);
    // A rejection is a refusal: the field must never stay locked with nothing said.
    const result: DeckMutationResult = await save(deckId, form).catch(
      (): DeckMutationResult => ({ ok: false, message: copy.refused }),
    );
    setSaving(false);
    if (!result.ok) {
      setRefused(result.message);
      return;
    }
    onSaved(line);
  }

  return (
    <form
      onSubmit={submit}
      aria-labelledby="intent-ask-label"
      className="mt-[14px] mb-[8px] rounded-[11px] px-[14px] py-[14px] md:px-[18px] md:py-[16px]"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border)" }}
    >
      <label
        id="intent-ask-label"
        htmlFor="intent-ask-field"
        className="block font-mono text-[10px] uppercase tracking-[0.14em]"
        style={{ color: "var(--accent)", marginBottom: 9 }}
      >
        {copy.askLabel}
      </label>
      {fix ? (
        <p className="max-w-[600px] text-[13px] leading-[1.6] md:text-[13.5px]" style={{ color: "var(--fg-body)" }}>
          {copy.ask(fix.axis, `${fix.hurt}`)}
        </p>
      ) : null}
      <input
        id="intent-ask-field"
        name="intent"
        value={value}
        onChange={(e) => {
          // Capped as the column counts, by code point, so the field never holds a line the save refuses.
          if (countCharacters(e.target.value) <= copy.maxLength) setValue(e.target.value);
        }}
        placeholder={copy.placeholder}
        autoComplete="off"
        className="mt-[14px] block min-h-[48px] w-full rounded-[8px] px-[14px] py-[12px] text-[16px] placeholder:text-[color:var(--fg-locked)] md:min-h-[46px] md:text-[13.5px]"
        style={{ background: "var(--surface)", border: "1px dashed var(--border-strong)", color: "var(--fg)" }}
      />
      <div className="mt-[12px] flex flex-wrap items-center gap-[14px]">
        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] rounded-[8px] px-[18px] py-[10px] text-[13.5px] font-semibold md:min-h-0 text-[color:var(--accent)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)]"
        >
          {copy.save}
        </button>
        {runBlocked ? null : (
          <button
            type="button"
            onClick={() => setSkipped(true)}
            className="font-mono text-[10.5px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg-muted)]"
          >
            {copy.skip}
          </button>
        )}
      </div>
      {refused ? <MutationError message={refused} /> : null}
    </form>
  );
}
