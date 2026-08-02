// Builder Spine — §Builder Spine (header, /decks/[id]).
// Client component. Commander thumb + inline rename + progress + export trigger.
"use client";

import { useState } from "react";
import { RenameForm } from "./rename-form";
import type { DeckDetail } from "../../lib/decks/read";
import { commanderGradient } from "../../lib/collection/gradients";
import { colorLabel } from "../../lib/decks/format";
import { PrimaryButton } from "@/components/ui/button";
import { CardDetailTrigger } from "./card-detail-provider";

interface BuilderSpineProps {
  deck: DeckDetail;
  onExport: () => void;
}

// WUBRG pip hex colors (design table §Global Tokens)
const PIP_HEX: Record<string, string> = {
  W: "#E8E4D6",
  U: "#4A7FB5",
  B: "#5B5566",
  R: "#C05A48",
  G: "#6B9E63",
};

export function BuilderSpine({ deck, onExport }: BuilderSpineProps) {
  const [renaming, setRenaming] = useState(false);

  const { commander, built, ownedCount, toBuyCount } = deck;
  const pct = Math.min(100, Math.round((built / 99) * 100));
  const exportDisabled = built === 0;

  // Commander thumb gradient (fallback when no art)
  const thumbGradient = commanderGradient(commander.colorIdentity);

  // Meta caption: color identity label
  const identityLabel = colorLabel(commander.colorIdentity);

  return (
    /*
      §Spine container
      mobile:  p 40px 16px 12px, border-bottom 1px #2A241D, flex col, items-center
      desktop: p 20px 30px,      border-bottom 1px #2A241D, flex row, items-center, gap 18px
    */
    <header
      className="flex flex-col items-center md:flex-row md:items-center md:gap-[18px] px-[16px] pt-[40px] pb-[12px] md:px-[30px] md:py-[20px]"
      style={{ borderBottom: "1px solid #2A241D" }}
    >
      {/* §Spine — commander art thumb (mobile). The thumb is the commander's only
          representation on this page, so it is also the way into its details (#91). */}
      <CardDetailTrigger
        oracleId={commander.oracleId}
        name={commander.name}
        className="block flex-none rounded-[5px] overflow-hidden md:hidden"
        style={{
          width: built === 0 ? 34 : 30,
          height: built === 0 ? 48 : 42,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
          background: commander.imageUri ? undefined : thumbGradient,
          border: "none",
          padding: 0,
        }}
      >
        {commander.imageUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={commander.imageUri}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <span className="block w-full h-full" style={{ background: thumbGradient }} />
        )}
      </CardDetailTrigger>

      {/* Commander thumb — desktop (different size) */}
      <CardDetailTrigger
        oracleId={commander.oracleId}
        name={commander.name}
        className="hidden md:block flex-none rounded-[6px] overflow-hidden flex-shrink-0"
        style={{
          width: 44,
          height: 62,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
          background: thumbGradient,
          border: "none",
          padding: 0,
        }}
      >
        {commander.imageUri && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={commander.imageUri}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        )}
      </CardDetailTrigger>

      {/* Center column: name + meta + progress */}
      <div className="flex-1 min-w-0 flex flex-col items-center md:items-start mt-[8px] md:mt-0">
        {/* §Spine — deck name (inline rename via RenameForm) */}
        {renaming ? (
          <div className="w-full max-w-[320px] md:max-w-none">
            <RenameForm
              deckId={deck.id}
              currentName={deck.name}
              onDone={() => setRenaming(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRenaming(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setRenaming(true);
              }
            }}
            aria-label={`Rename deck: ${deck.name}`}
            className="max-w-full truncate text-left font-display font-bold text-[16px] md:text-[21px] leading-[1.2] rounded-[3px]"
            style={{ color: "#EDE6D8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {deck.name}
          </button>
        )}

        {/* §Spine — deck meta caption */}
        <p
          className="font-mono text-[10px] md:text-[11px] mt-[1px] md:mt-[2px]"
          style={{ color: "#8E8269" }}
        >
          {commander.name} · {identityLabel}
        </p>

        {/* §Spine — pip chips (desktop only) */}
        {commander.colorIdentity.length > 0 && (
          <div className="hidden md:flex items-center gap-[8px] mt-[3px] ml-[2px]">
            {commander.colorIdentity.map((pip) => (
              <span
                key={pip}
                className="rounded-full flex-none"
                style={{
                  width: 10,
                  height: 10,
                  background: PIP_HEX[pip] ?? "#8E8269",
                }}
                aria-hidden
              />
            ))}
          </div>
        )}

        {/* §Spine — progress figure + "/99" + bar */}
        <div className="flex items-baseline gap-[4px] mt-[6px] md:mt-[4px]">
          <span
            className="font-mono font-semibold text-[14px] md:text-[20px]"
            style={{ color: "#EDE6D8" }}
          >
            {built}
          </span>
          <span
            className="font-mono font-normal text-[14px] md:text-[13px]"
            style={{ color: "#8E8269" }}
          >
            / 99
          </span>
        </div>

        {/* §Spine — progress bar track: mobile h 5, desktop h 6 */}
        <div
          className="w-full md:w-[170px] rounded-full overflow-hidden mt-[4px] md:mt-[6px] h-[5px] md:h-[6px]"
          style={{
            background: "#2A241D",
          }}
        >
          {/* §Spine — progress bar fill: built ≥99 #6FA368 / ≥55 #E0913C / <55 #C6533F */}
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: built >= 99 ? "#6FA368" : built >= 55 ? "#E0913C" : "#C6533F",
            }}
          />
        </div>

        {/* §Spine — "54 owned · 8 to buy" caption (desktop only) */}
        <p
          className="hidden md:block font-mono text-[10px] mt-[5px]"
          style={{ color: "#8E8269" }}
        >
          {ownedCount} owned · {toBuyCount} to buy
        </p>
      </div>

      {/* Export button */}
      <div className="mt-[10px] md:mt-0 md:ml-auto flex-none">
        {exportDisabled ? (
          /* §Spine — Export button (disabled, empty deck) — desktop */
          <button
            type="button"
            disabled
            className="hidden md:flex items-center gap-[6px] rounded-[8px] font-sans font-semibold text-[13px] px-[18px] py-[11px]"
            style={{
              color: "#8E8269",
              background: "transparent",
              border: "1px solid #2A241D",
              cursor: "not-allowed",
            }}
          >
            Export
          </button>
        ) : (
          /* §Spine — Export button (active) */
          <>
            {/* Mobile: text link with icon */}
            <button
              type="button"
              onClick={onExport}
              className="md:hidden flex items-center gap-[5px] rounded-[7px] font-mono text-[11px] px-[9px] py-[6px]"
              style={{
                color: "#C9A24B",
                background: "transparent",
                border: "1px solid #3A3229",
              }}
            >
              {/* §Spine — export link icon (mobile): 16px #8E8269 */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8E8269"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>

            {/* Desktop: filled brass button */}
            <PrimaryButton
              onClick={onExport}
              className="hidden md:flex items-center gap-[6px] text-[13px] px-[18px] py-[11px]"
            >
              Export
            </PrimaryButton>
          </>
        )}
      </div>
    </header>
  );
}
