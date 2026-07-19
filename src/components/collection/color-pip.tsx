"use client";
// WUBRG pip primitive — per property table §WUBRG Color Pip / §WUBRG Pip Colors.
import { WUBRG_HEX } from "../../lib/collection/browse";

export function ColorPip({
  color,
  selected,
  onToggle,
  size = 15,
}: {
  color: "W" | "U" | "B" | "R" | "G";
  selected: boolean;
  onToggle: () => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={selected}
      aria-label={`Filter by ${color}`}
      onClick={onToggle}
      className={[
        "rounded-full transition-opacity",
        // selected uses brand focus-visible outline treatment inherited from globals.css
        selected
          ? "opacity-100 shadow-[0_0_0_2px_var(--brass)]"
          : "opacity-40 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.3)]",
      ].join(" ")}
      style={{ width: size, height: size, background: WUBRG_HEX[color] }}
    />
  );
}
