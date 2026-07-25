"use client";

// §Create — Pre-filled (/decks/new?commander=…)
// Full-card display (desktop) / thumb (mobile) + name input + Create/Change buttons.

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_HEX } from "../../lib/collection/browse";
import { createDeck } from "../../app/decks/actions";
import { colorLabel } from "../../lib/decks/format";
import { GhostButton, PrimaryButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreatePreFilledProps {
  oracleId: string;
  name: string;
  typeLine: string;
  colorIdentity: string[];
  imageUri: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreatePreFilled({
  oracleId,
  name,
  typeLine,
  colorIdentity,
  imageUri,
}: CreatePreFilledProps) {
  const [deckName, setDeckName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const gradient = commanderGradient(colorIdentity);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = deckName.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      setError("Name must be 1–120 characters.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createDeck(oracleId, trimmed);
      } catch {
        setError("Failed to create deck. Try again.");
      }
    });
  }

  return (
    <section>
      {/* ── Page header ── */}
      {/* Mobile: flex center gap-[10px] p-[20px_18px_14px] border-bottom */}
      {/* Desktop: block p-[34px_40px] no border-bottom */}
      <div
        className="flex items-center gap-[10px] p-[20px_18px_14px] md:block md:p-[34px_40px] border-b border-[#2A241D] md:border-b-0"
      >
        {/* Mobile back chevron */}
        <Link
          href="/decks/new"
          className="md:hidden"
          aria-label="Back to commander picker"
          style={{ color: "#8E8269", fontSize: 18, lineHeight: 1 }}
        >
          ‹
        </Link>

        <div>
          {/* Desktop back link */}
          <Link
            href="/decks/new"
            className="hidden md:block"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#8E8269",
              marginBottom: 6,
            }}
          >
            ‹ Commanders · {name}
          </Link>

          {/* §Page title "New deck": Cinzel 700 20/28px #EDE6D8; desktop margin 2px 0 4px */}
          <h1
            className="font-display font-bold text-[20px] md:text-[28px] m-0 md:m-[2px_0_4px]"
            style={{ color: "#EDE6D8" }}
          >
            New deck
          </h1>

          {/* §Subtitle: mobile mono 10px #8E8269 mt 1; desktop IBM Plex Sans 14px #A89B84 mb 26 */}
          <p className="font-mono text-[10px] mt-[1px] md:hidden" style={{ color: "#8E8269", marginBottom: 0 }}>
            Commander selected
          </p>
          <p className="font-sans hidden md:block text-[14px]" style={{ color: "#A89B84", marginBottom: 26 }}>
            Name your deck to get started.
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
            style={{ background: "#1E1A15", border: "1px solid #2A241D" }}
          >
            {/* §Commander art thumb mobile: 58×81px, br 8px, inset shadow */}
            <div
              className="shrink-0 rounded-[8px]"
              style={{
                width: 58,
                height: 81,
                background: imageUri ? `url(${imageUri}) center/cover` : gradient,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
              }}
            />
            <div className="flex flex-col justify-center min-w-0">
              {/* §Commander name mobile: Cinzel 600 16px #EDE6D8 */}
              <p
                className="font-display font-semibold leading-[1.2] truncate"
                style={{ fontSize: 16, color: "#EDE6D8", margin: 0 }}
              >
                {name}
              </p>
              {/* §Commander type line mobile: 11.5px #A89B84 mt-[3px] */}
              <p
                className="truncate"
                style={{ fontSize: 11.5, color: "#A89B84", marginTop: 3, marginBottom: 0 }}
              >
                {typeLine}
              </p>
            </div>
          </div>

          {/* Desktop: full card §Commander full card: 220px wide, 63/88 aspect, br 12px */}
          <div
            className="relative hidden md:block"
            style={{
              width: 220,
              aspectRatio: "63/88",
              borderRadius: 12,
              background: imageUri ? `url(${imageUri}) center/cover` : gradient,
              boxShadow: "0 24px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)",
            }}
          >
            {/* §Commander card — pip inset: absolute bottom-left */}
            <div
              className="absolute flex"
              style={{ left: 10, bottom: 10, gap: 5 }}
            >
              {colorIdentity.map((color) => (
                <span
                  key={color}
                  className="rounded-full"
                  style={{
                    width: 16,
                    height: 16,
                    background: WUBRG_HEX[color] ?? "#8E8269",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  }}
                  aria-hidden
                />
              ))}
            </div>
          </div>

          {/* Desktop: commander name + type below card */}
          <div className="hidden md:block" style={{ marginTop: 14 }}>
            {/* §Commander name desktop: Cinzel 600 17px #EDE6D8 */}
            <p
              className="font-display font-semibold leading-[1.2]"
              style={{ fontSize: 17, color: "#EDE6D8", margin: 0 }}
            >
              {name}
            </p>
            {/* §Commander type line desktop: 12.5px #A89B84 mt-[4px] */}
            <p
              style={{ fontSize: 12.5, color: "#A89B84", marginTop: 4, marginBottom: 0 }}
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
              background: "rgba(111,163,104,0.1)",
              border: "1px solid #33402F",
            }}
          >
            {/* Checkmark icon: 20×20px mobile / 24×24px desktop */}
            <div
              className="shrink-0 flex items-center justify-center rounded-full w-[20px] h-[20px] md:w-[24px] md:h-[24px] text-[12px] md:text-[14px]"
              style={{
                background: "rgba(111,163,104,0.2)",
                color: "#6FA368",
              }}
            >
              ✓
            </div>
            <span
              className="text-[12.5px] md:text-[13.5px]"
              style={{ color: "#C6B79A" }}
            >
              Legal · validated
            </span>
          </div>

          {/* Desktop: colour identity locked row */}
          <div className="hidden md:block mb-[24px]">
            {/* §Colour identity locked row label */}
            <p
              className="font-mono uppercase tracking-[0.14em]"
              style={{ fontSize: 10, color: "#8E8269", marginBottom: 9 }}
            >
              Colour identity
            </p>
            <div className="flex items-center" style={{ gap: 8 }}>
              {/* §Colour identity locked row — pip chips: 22×22px */}
              {colorIdentity.map((color) => (
                <span
                  key={color}
                  className="rounded-full"
                  style={{
                    width: 22,
                    height: 22,
                    background: WUBRG_HEX[color] ?? "#8E8269",
                  }}
                  aria-hidden
                />
              ))}
              {/* §Colour identity caption: IBM Plex Mono 12px #A89B84 ml-[4px] */}
              <span
                className="font-mono"
                style={{ fontSize: 12, color: "#A89B84", marginLeft: 4 }}
              >
                {colorLabel(colorIdentity)}
              </span>
            </div>
          </div>

          {/* Deck name form */}
          <form onSubmit={handleSubmit}>
            {/* §Deck name field label: IBM Plex Mono 10px 0.14em uppercase #8E8269 mb 8/9px */}
            <label
              htmlFor="deck-name-input"
              className="block font-mono uppercase tracking-[0.14em] mb-[8px] md:mb-[9px]"
              style={{ fontSize: 10, color: "#8E8269" }}
            >
              Deck name
            </label>

            {/* §Deck name input: bg #181410, border 1px #C9A24B (active), br 8/9px */}
            <TextField
              id="deck-name-input"
              ref={inputRef}
              autoFocus
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              maxLength={120}
              placeholder="My awesome deck"
              disabled={isPending}
              className={`block w-full rounded-[8px] md:rounded-[9px] p-[12px_14px] md:p-[14px_16px] text-[15px] md:text-[16px] [border-color:var(--brass)] ${
                error ? "mb-[8px]" : "mb-[24px]"
              }`}
            />

            {error && (
              <p
                className="font-mono text-[11px] mb-[16px]"
                style={{ color: "#C6533F" }}
              >
                {error}
              </p>
            )}

            {/* §"Create deck →" primary button */}
            <PrimaryButton
              type="submit"
              disabled={isPending || deckName.trim().length === 0}
              className="w-full md:w-auto text-[15px] transition-opacity disabled:opacity-40 mb-[12px] py-[13px] px-[26px]"
            >
              {isPending ? "Creating…" : "Create deck →"}
            </PrimaryButton>

            {/* §"Change commander" secondary button — ADDENDUM-secondary-cta-colour.md
                item 2: the softer mobile treatment was drift, not intent. One
                secondary treatment at both breakpoints. */}
            <GhostButton
              href="/decks/new"
              className="block md:inline-block text-center text-[13px] md:text-[14px] p-[11px_0] md:p-[13px_20px]"
            >
              Change commander
            </GhostButton>

            {/* §Helper text: mobile fs 12.5px lh 1.55; desktop fs 13px lh 1.6 border-top pt 16px */}
            <p
              className="mt-[20px] text-[12.5px] md:text-[13px] leading-[1.55] md:leading-[1.6] md:border-t md:border-[#2A241D] md:pt-[16px]"
              style={{ color: "#8E8269" }}
            >
              Colour identity is locked to your commander. Cards outside this
              identity won&apos;t be suggested.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
