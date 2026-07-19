"use client";

// §Create — Pre-filled (/decks/new?commander=…)
// Full-card display (desktop) / thumb (mobile) + name input + Create/Change buttons.

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_HEX } from "../../lib/collection/browse";
import { createDeck } from "../../app/decks/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function colorLabel(identity: string[]): string {
  if (identity.length === 0) return "Colorless";
  if (identity.length === 1) {
    const MAP: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
    return MAP[identity[0]] ?? identity[0];
  }
  if (identity.length === 5) return "5-color";
  if (identity.length >= 3) return "Multi";
  const key = identity.slice().sort().join("");
  const GUILDS: Record<string, string> = {
    UW: "Azorius", BU: "Dimir", BR: "Rakdos", GR: "Gruul", GW: "Selesnya",
    BW: "Orzhov", RU: "Izzet", BG: "Golgari", RW: "Boros", GU: "Simic",
  };
  return GUILDS[key] ?? "Multi";
}

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
        className="flex items-center gap-[10px] p-[20px_18px_14px] md:block md:p-[34px_40px]"
        style={{ borderBottom: "1px solid #2A241D" }}
      >
        {/* Mobile back chevron */}
        <Link
          href="/decks/new"
          className="md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
          aria-label="Back to commander picker"
          style={{ color: "#8E8269", fontSize: 18, lineHeight: 1 }}
        >
          ‹
        </Link>

        <div>
          {/* Desktop back link */}
          <Link
            href="/decks/new"
            className="hidden md:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#8E8269",
              marginBottom: 6,
            }}
          >
            ‹ Commanders · {name}
          </Link>

          {/* §Page title "New deck": Cinzel 700 20/28px #EDE6D8 */}
          <h1
            className="font-display font-bold text-[20px] md:text-[28px] m-0"
            style={{ color: "#EDE6D8" }}
          >
            New deck
          </h1>

          {/* §Subtitle */}
          <p
            className="font-mono text-[10px] md:text-[14px] mt-[1px]"
            style={{ color: "#8E8269", marginBottom: 0 }}
          >
            <span className="md:hidden">Commander selected</span>
            <span
              className="hidden md:inline"
              style={{ color: "#A89B84", marginBottom: 26, display: "block" }}
            >
              Name your deck to get started.
            </span>
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
                  aria-label={color}
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
            className="flex items-center rounded-[8px] md:rounded-[10px] mb-[24px] md:mb-[28px]"
            style={{
              gap: 9,
              background: "rgba(111,163,104,0.1)",
              border: "1px solid #33402F",
              padding: "10px 13px",
            }}
          >
            {/* Checkmark icon: 20/24px circle */}
            <div
              className="shrink-0 flex items-center justify-center rounded-full"
              style={{
                width: 20,
                height: 20,
                background: "rgba(111,163,104,0.2)",
                color: "#6FA368",
                fontSize: 12,
              }}
            >
              ✓
            </div>
            <span
              style={{ fontSize: 12.5, color: "#C6B79A" }}
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
                  aria-label={color}
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
            {/* §Deck name field label: IBM Plex Mono 10px 0.14em uppercase #8E8269 */}
            <label
              htmlFor="deck-name-input"
              className="block font-mono uppercase tracking-[0.14em]"
              style={{ fontSize: 10, color: "#8E8269", marginBottom: 8 }}
            >
              Deck name
            </label>

            {/* §Deck name input: bg #181410, border 1px #C9A24B (active), br 8/9px */}
            <input
              id="deck-name-input"
              ref={inputRef}
              autoFocus
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              maxLength={120}
              placeholder="My awesome deck"
              disabled={isPending}
              className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] rounded-[8px] md:rounded-[9px]"
              style={{
                background: "#181410",
                border: "1px solid #C9A24B",
                padding: "12px 14px",
                fontSize: 15,
                color: "#EDE6D8",
                display: "block",
                marginBottom: error ? 8 : 24,
              }}
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
            <button
              type="submit"
              disabled={isPending || deckName.trim().length === 0}
              className="w-full md:w-auto rounded-[8px] font-sans font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] disabled:opacity-40 mb-[12px]"
              style={{
                fontSize: 15,
                color: "#14110E",
                background: "#C9A24B",
                border: "none",
                padding: "13px 26px",
              }}
            >
              {isPending ? "Creating…" : "Create deck →"}
            </button>

            {/* §"Change commander" secondary button */}
            <Link
              href="/decks/new"
              className="block md:inline-block text-center rounded-[8px] font-sans transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
              style={{
                fontWeight: 500,
                fontSize: 13,
                color: "#A89B84",
                background: "transparent",
                border: "1px solid #2A241D",
                padding: "11px 0",
                marginLeft: 0,
              }}
            >
              <span className="md:hidden">Change commander</span>
              <span
                className="hidden md:inline"
                style={{ padding: "0 20px", fontWeight: 600, fontSize: 14, color: "#EDE6D8" }}
              >
                Change commander
              </span>
            </Link>

            {/* §Helper text (desktop only) */}
            <p
              className="hidden md:block mt-[20px]"
              style={{
                fontSize: 13,
                color: "#8E8269",
                lineHeight: 1.6,
                borderTop: "1px solid #2A241D",
                paddingTop: 16,
              }}
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
