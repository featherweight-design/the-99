"use client";

// §Create — Pre-filled (/decks/new?commander=…)
// Full-card display (desktop) / thumb (mobile) + name input + Create/Change buttons.

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import { createDeck } from "../../app/decks/actions";
import { colorLabel } from "../../lib/decks/format";
import { GhostButton, PrimaryButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { DECK_NAME_MAX } from "../../lib/decks/deck-name";
import { CommanderThumb, CARD_ART_RING } from "../ui/commander-thumb";
import { HandOffAnswersBlock } from "../intake/hand-off-answers";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { helpMeChooseCopy } from "../../lib/copy/help-me-choose";
import type { CreateAnswers } from "../../lib/intake/answers";
import type { HandOffAnswers } from "../../lib/intake/hand-off-load";
import { PendingReporter } from "../shell/pending-reporter";
import { ArtLayer } from "../ui/art-layer";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreatePreFilledProps {
  oracleId: string;
  name: string;
  typeLine: string;
  colorIdentity: string[];
  imageUri: string | null;
  /** The synergy picks carried from the commander page in `?select=`. Optional
      so the picker door, which has no commander in the URL and therefore no
      selection to carry, needs no change. */
  selectedOracleIds?: string[];
  /**
   * Set when a Help me choose result brought the player here (HANDOFF §6): every way back leads to
   * those results, the subs say the deck is built from the answers, the answers block is drawn
   * when there is a row to draw, and the create carries the answers to the fill. Absent, this is
   * today's page, byte for byte.
   */
  handOff?: {
    answers: HandOffAnswers;
    /** What `createDeck` is handed: the answers as the block shows them. */
    create: CreateAnswers;
    resultsHref: string;
    changeHref: string;
    /** False when nothing but colors or words was asked: the block has no row to draw. */
    drawBlock: boolean;
  };
}

const handOffCopy = helpMeChooseCopy.handOff;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreatePreFilled({
  oracleId,
  name,
  typeLine,
  colorIdentity,
  imageUri,
  selectedOracleIds,
  handOff,
}: CreatePreFilledProps) {
  const backHref = handOff?.resultsHref ?? "/decks/new";
  const [deckName, setDeckName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const gradient = commanderGradient(colorIdentity);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = deckName.trim();
    if (trimmed.length === 0 || trimmed.length > DECK_NAME_MAX) {
      setError(`Name must be 1–${DECK_NAME_MAX} characters.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createDeck(oracleId, trimmed, selectedOracleIds, null, handOff?.create ?? null);
      } catch (err) {
        // See create-picker.tsx: the action's closing `redirect()` throws, and
        // without this the success path paints a failure on its way out.
        unstable_rethrow(err);
        setError(addPanelCopy.createPicker.failed);
      }
    });
  }

  return (
    <section>
      {/* ── Page header ── */}
      {/* Mobile: flex center gap-[10px] p-[20px_18px_14px] border-bottom */}
      {/* Desktop: block p-[34px_40px] no border-bottom */}
      <div
        className="flex items-center gap-[10px] p-[20px_18px_14px] md:block md:p-[34px_40px] border-b border-b-[color:var(--border)] border-[color:var(--border)] md:border-b-0"
      >
        {/* Mobile back chevron */}
        <Link
          href={backHref}
          className="md:hidden text-[color:var(--fg-faint)]"
          aria-label={handOff ? handOffCopy.backAria : "Back to commander picker"}
          style={{ fontSize: 18, lineHeight: 1 }}
        >
          ‹
          <PendingReporter href={backHref} />
        </Link>

        <div>
          {/* Desktop back link */}
          <Link
            href={backHref}
            className="hidden md:block text-[color:var(--fg-faint)]"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              marginBottom: 6,
            }}
          >
            {handOff ? handOffCopy.back : <>‹ Commanders · {name}</>}
            <PendingReporter href={backHref} />
          </Link>

          {/* §Page title "New deck": Cinzel 700 20/28px var(--fg); desktop margin 2px 0 4px */}
          <h1
            className="font-display font-bold text-[20px] md:text-[28px] m-0 md:m-[2px_0_4px]"
            style={{ color: "var(--fg)" }}
          >
            New deck
          </h1>

          {/* §Subtitle: mobile mono 10px var(--fg-faint) mt 1; desktop IBM Plex Sans 14px var(--fg-muted) mb 26 */}
          <p className="font-mono text-[10px] mt-[1px] md:hidden" style={{ color: "var(--fg-faint)", marginBottom: 0 }}>
            {handOff ? handOffCopy.subPhone : "Commander selected"}
          </p>
          <p className="font-sans hidden md:block text-[14px]" style={{ color: "var(--fg-muted)", marginBottom: 26 }}>
            {handOff ? handOffCopy.sub : "Name your deck."}
          </p>
        </div>
      </div>

      {/* ── Body layout: mobile = single-col, desktop = two-col (card left, form right) ── */}
      <div className="p-[20px_18px] md:p-[40px] md:flex md:gap-[48px] md:items-start">

        {/* ── Left: commander card / thumbnail ── */}
        <div className="md:shrink-0">
          {/* Mobile: thumbnail row §Commander card thumbnail */}
          <div
            className="md:hidden flex gap-[14px] rounded-[12px] p-[14px] mb-[24px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {/* §Commander art thumb mobile — the summary thumb: this flow's
                commander is already chosen, so it takes the same box the
                picker's selected summary does. */}
            <CommanderThumb imageUri={imageUri} colorIdentity={colorIdentity} size="summary" />
            <div className="flex flex-col justify-center min-w-0">
              {/* §Commander name mobile: Cinzel 600 16px var(--fg) */}
              <p
                className="font-display font-semibold leading-[1.2] truncate"
                style={{ fontSize: 16, color: "var(--fg)", margin: 0 }}
              >
                {name}
              </p>
              {/* §Commander type line mobile: 11.5px var(--fg-muted) mt-[3px] */}
              <p
                className="truncate"
                style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 3, marginBottom: 0 }}
              >
                {typeLine}
              </p>
            </div>
          </div>

          {/* Desktop: full card §Commander full card: 220px wide, 63/88 aspect, br 12px */}
          <div
            className="relative hidden overflow-hidden md:block"
            style={{
              width: 220,
              aspectRatio: "63/88",
              borderRadius: 12,
              // The ground; the art fades in over it (`ArtLayer`), carrying the ring an inset shadow here would
              // paint under.
              background: imageUri ? "var(--elevated)" : gradient,
              // The two card faces converge: `0 20px 50px` is the commander
              // page's, and the 24px offset here was drift rather than a second
              // decision. The ring takes the app's one thumb alpha with it.
              boxShadow: `0 20px 50px rgba(0,0,0,0.5), ${CARD_ART_RING}`,
            }}
          >
            {/* Desktop only (`hidden md:block`): a phone fetches none of it. */}
            {imageUri ? <ArtLayer src={imageUri} media="(min-width: 48rem)" style={{ boxShadow: CARD_ART_RING }} /> : null}
          </div>
          {/* No pip inset on the art: the locked "Color identity" row to the
              right of it shows the same pips at the same moment, with a label
              and the identity's name (#123). */}

          {/* Desktop: commander name + type below card */}
          <div className="hidden md:block" style={{ marginTop: 14 }}>
            {/* §Commander name desktop: Cinzel 600 17px var(--fg) */}
            <p
              className="font-display font-semibold leading-[1.2]"
              style={{ fontSize: 17, color: "var(--fg)", margin: 0 }}
            >
              {name}
            </p>
            {/* §Commander type line desktop: 12.5px var(--fg-muted) mt-[4px] */}
            <p
              style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 4, marginBottom: 0 }}
            >
              {typeLine}
            </p>
          </div>
        </div>

        {/* ── Right: form ── */}
        <div className="flex-1 min-w-0">
          {/* §Legal-validated strip */}
          <div
            className="flex items-center gap-[9px] md:gap-[11px] rounded-[8px] md:rounded-[10px] mb-[24px] md:mb-[28px] p-[10px_13px] md:p-[13px_16px]"
            style={{
              background: "color-mix(in oklab, var(--success) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--success) 40%, var(--bg))",
            }}
          >
            {/* Checkmark icon: 20×20px mobile / 24×24px desktop */}
            <div
              className="shrink-0 flex items-center justify-center rounded-full w-[20px] h-[20px] md:w-[24px] md:h-[24px] text-[12px] md:text-[14px]"
              style={{
                background: "color-mix(in oklab, var(--success) 20%, transparent)",
                color: "var(--success)",
              }}
            >
              ✓
            </div>
            <span
              className="text-[12.5px] md:text-[13.5px]"
              style={{ color: "var(--fg-body)" }}
            >
              Legal · validated
            </span>
          </div>

          {/* Desktop: color identity locked row */}
          <div className="hidden md:block mb-[24px]">
            {/* §Color identity locked row label */}
            <p
              className="font-mono uppercase tracking-[0.14em]"
              style={{ fontSize: 10, color: "var(--fg-faint)", marginBottom: 9 }}
            >
              Color identity
            </p>
            <div className="flex items-center" style={{ gap: 8 }}>
              {/* §Color identity locked row — pip chips: 22×22px */}
              {colorIdentity.map((color) => (
                <span
                  key={color}
                  className="rounded-full"
                  style={{
                    width: 22,
                    height: 22,
                    background: WUBRG_COLOR[color] ?? "var(--fg-faint)",
                  }}
                  aria-hidden
                />
              ))}
              {/* §Color identity caption: IBM Plex Mono 12px var(--fg-muted) ml-[4px] */}
              <span
                className="font-mono"
                style={{ fontSize: 12, color: "var(--fg-muted)", marginLeft: 4 }}
              >
                {colorLabel(colorIdentity)}
              </span>
            </div>
          </div>

          {handOff?.drawBlock && <HandOffAnswersBlock answers={handOff.answers} changeHref={handOff.changeHref} />}

          {/* Deck name form */}
          <form onSubmit={handleSubmit}>
            {/* §Deck name field label: IBM Plex Mono 10px 0.14em uppercase var(--fg-faint) mb 8/9px */}
            <label
              htmlFor="deck-name-input"
              className="block font-mono uppercase tracking-[0.14em] mb-[8px] md:mb-[9px]"
              style={{ fontSize: 10, color: "var(--fg-faint)" }}
            >
              Deck name
            </label>

            {/* §Deck name input: bg var(--surface-sunken), border 1px var(--accent) (active), br 8/9px */}
            <TextField
              id="deck-name-input"
              ref={inputRef}
              autoFocus
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              maxLength={DECK_NAME_MAX}
              placeholder="My awesome deck"
              disabled={isPending}
              className={`block w-full rounded-[8px] md:rounded-[9px] p-[12px_14px] md:p-[14px_16px] text-[15px] md:text-[16px] border-[color:var(--accent)] ${
                error ? "mb-[8px]" : "mb-[24px]"
              }`}
            />

            {error && (
              <p
                className="font-mono text-[11px] mb-[16px]"
                style={{ color: "var(--danger)" }}
              >
                {error}
              </p>
            )}

            {/* The two CTAs are a flex row (column on mobile) with an explicit
                gap. They used to be a margin plus the whitespace between two
                inline-blocks, which collapsed to nothing on desktop (#125). */}
            <div className="flex flex-col md:flex-row md:items-center gap-[12px]">
              {/* §"Create deck →" primary button */}
              <PrimaryButton
                type="submit"
                disabled={isPending || deckName.trim().length === 0}
                className="w-full md:w-auto text-[15px] transition-opacity disabled:opacity-40 py-[13px] px-[26px]"
              >
                {isPending ? "Creating…" : "Create deck →"}
              </PrimaryButton>

              {/* §"Change commander" secondary button — ADDENDUM-secondary-cta-colour.md
                  item 2: the softer mobile treatment was drift, not intent. One
                  secondary treatment at both breakpoints. */}
              <GhostButton
                href={backHref}
                className="block text-center text-[13px] md:text-[14px] p-[11px_0] md:p-[13px_20px]"
              >
                {handOff ? handOffCopy.backToResults : "Change commander"}
              </GhostButton>
            </div>

            {/* §Helper text: mobile fs 12.5px lh 1.55; desktop fs 13px lh 1.6 border-top pt 16px */}
            <p
              className="mt-[20px] text-[12.5px] md:text-[13px] leading-[1.55] md:leading-[1.6] md:border-t md:border-[color:var(--border)] md:pt-[16px]"
              style={{ color: "var(--fg-faint)" }}
            >
              Cards outside your commander&apos;s color identity won&apos;t be suggested.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
