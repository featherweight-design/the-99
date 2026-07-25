"use client";
// Empty State — Filtered to Zero (§Empty State — Filtered to Zero).
// Shows when the active color filter yields zero results.
// Contains: dimmed WUBRG pips of active filter, "Showing 0 of N" count,
// Cinzel heading, body text, "Clear color filter" button.
// Mobile breakpoint: sm:640px (project uses sm: prefix, table breakpoint is 640px).

import { WUBRG_HEX } from "../../lib/collection/browse";
import { GhostButton } from "../ui/button";

// Single-color names
const MONO_NAMES: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

// Two-color guild names (sorted WUBRG key)
const GUILD_NAMES: Record<string, string> = {
  WU: "Azorius",
  WB: "Orzhov",
  UB: "Dimir",
  UR: "Izzet",
  BR: "Rakdos",
  BG: "Golgari",
  WR: "Boros",
  WG: "Selesnya",
  UG: "Simic",
  RG: "Gruul",
};

// Three-color shard/wedge names
const TRIO_NAMES: Record<string, string> = {
  WUB: "Esper",
  WUR: "Jeskai",
  WUG: "Bant",
  WBR: "Mardu",
  WBG: "Abzan",
  UBR: "Grixis",
  UBG: "Sultai",
  URG: "Temur",
  BRG: "Jund",
  WRG: "Naya",
};

// Four-color names
const QUAD_NAMES: Record<string, string> = {
  WUBR: "Yore-Tiller (non-Green)",
  WUBG: "Witch-Maw (non-Red)",
  WURG: "Ink-Treader (non-Black)",
  WBRG: "Dune-Brood (non-Blue)",
  UBRG: "Chaos (non-White)",
};

function colorFilterLabel(colors: string[]): string {
  if (colors.length === 0) return "this filter";
  const sorted = [...colors].sort((a, b) => "WUBRG".indexOf(a) - "WUBRG".indexOf(b));
  const key = sorted.join("");
  if (sorted.length === 1) return MONO_NAMES[key] ?? key;
  if (sorted.length === 2) return GUILD_NAMES[key] ?? key;
  if (sorted.length === 3) return TRIO_NAMES[key] ?? key;
  if (sorted.length === 4) return QUAD_NAMES[key] ?? key;
  return "5-color"; // WUBRG
}

type FilteredEmptyProps = {
  colors: string[];
  total: number;
  onClear: () => void;
};

export function FilteredEmpty({ colors, total, onClear }: FilteredEmptyProps) {
  const label = colorFilterLabel(colors);

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center text-center p-[24px_30px] sm:p-[40px]"
    >
      {/* Dimmed WUBRG pips (active filter colors) */}
      <div
        className="flex gap-[6px] mb-[18px] sm:mb-[20px]"
        aria-hidden="true"
      >
        {colors.map((c) => (
          <span
            key={c}
            className="block rounded-full"
            style={{
              width: 20,
              height: 20,
              background: WUBRG_HEX[c] ?? "#8E8269",
              opacity: 0.5,
            }}
          />
        ))}
      </div>

      {/* "Showing 0 of N" count — amber warning color */}
      <p
        className="m-0 font-mono text-[10.5px] sm:text-[11px]"
        style={{ color: "#E0913C", marginBottom: 12 }}
      >
        Showing 0 of {total}
      </p>

      {/* Heading */}
      <h2
        className="font-display m-0 text-[20px] sm:text-[24px]"
        style={{ fontWeight: 700, color: "#EDE6D8" }}
      >
        No commanders in {label}
      </h2>

      {/* Body */}
      <p
        className="m-0 text-[13px] sm:text-[14px]"
        style={{
          color: "#C6B79A",
          lineHeight: 1.6,
          marginTop: 10,
          maxWidth: 420,
        }}
      >
        None of your {total} ranked commander{total === 1 ? "" : "s"}{" "}
        include{total === 1 ? "s" : ""} {label} in their color identity. Try a
        different filter or clear it to see all results.
      </p>

      {/* Clear color filter button */}
      <GhostButton
        onClick={onClear}
        // brand focus-visible outline treatment inherited from globals.css
        className="text-[13px] p-[11px_20px] sm:p-[10px_20px] mt-[20px]"
      >
        Clear color filter
      </GhostButton>
    </div>
  );
}
