"use client";
// WUBRG pip primitive — per property table §WUBRG Color Pip / §WUBRG Pip Colors.
// Design table uses raw hexes (not brand tokens) for these five swatches.
const COLOR_HEX: Record<string, string> = {
  W: "#E8E4D6", U: "#4A7FB5", B: "#5B5566", R: "#C05A48", G: "#6B9E63",
};

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
        selected ? "opacity-100" : "opacity-40",
      ].join(" ")}
      style={{
        width: size,
        height: size,
        background: COLOR_HEX[color],
        boxShadow: selected
          ? "0 0 0 2px var(--brass)"                  // selected ring
          : "inset 0 0 0 1px rgba(0,0,0,0.3)",        // inactive shadow
      }}
    />
  );
}
