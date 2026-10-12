// A deck's color identity as clustered pips (handoff R2, "IdentityMark"): mana-colored 7px dots in a fixed
// 26px box, hugged by one dashed outline drawn as the union of a halo per pip (and a centre halo for three
// or more). The count is a shape: one, two in a row, a triangle, a diamond, a star, W U B R G clockwise from
// the top. Colorless is one hollow grey pip. Never the only label: every caller prints the deck name, so
// the mark is `aria-hidden`.

import { PIP_STYLE } from "../mana-color-parts";

const BOX = 26;
const PIP = 7;
const HALO_OUTER = 5.5;
const HALO_INNER = 4.5;

/** Pip centres in px from the box centre, by count (the design table's). */
export const PIP_CENTRES: Record<number, readonly (readonly [number, number])[]> = {
  1: [[0, 0]],
  2: [[-4, 0], [4, 0]],
  3: [[0, -4.6], [4, 2.3], [-4, 2.3]],
  4: [[0, -5.6], [5.6, 0], [0, 5.6], [-5.6, 0]],
  5: [0, 1, 2, 3, 4].map((i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return [6.8 * Math.cos(a), 6.8 * Math.sin(a)] as const;
  }),
};

const ORDER = ["W", "U", "B", "R", "G"] as const;

export function IdentityMark({ identity }: { identity: readonly string[] }) {
  const colors = ORDER.filter((c) => identity.includes(c));
  const pips: readonly ("W" | "U" | "B" | "R" | "G" | "C")[] = colors.length > 0 ? colors : ["C"];
  const centres = PIP_CENTRES[pips.length];
  // Centred on its own vertical extent, so a triangle does not sit high in the box.
  const ys = centres.map((p) => p[1]);
  const dy = -(Math.min(...ys) + Math.max(...ys)) / 2;
  const halos = pips.length >= 3 ? [...centres, [0, 0] as const] : centres;
  const at = (x: number, y: number, r: number) => ({ left: BOX / 2 + x - r, top: BOX / 2 + y + dy - r, width: r * 2, height: r * 2 });
  return (
    <span aria-hidden="true" data-identity-mark={pips.join("")} className="relative inline-block flex-none" style={{ width: BOX, height: BOX }}>
      {halos.map(([x, y], i) => (
        <span key={`o${i}`} className="absolute rounded-full bg-[var(--border-dashed)]" style={at(x, y, HALO_OUTER)} />
      ))}
      {halos.map(([x, y], i) => (
        <span key={`i${i}`} className="absolute rounded-full bg-[var(--bg)]" style={at(x, y, HALO_INNER)} />
      ))}
      {pips.map((c, i) => (
        <span
          key={c}
          data-pip={c}
          className="absolute box-border rounded-full"
          style={{
            ...at(centres[i][0], centres[i][1], PIP / 2),
            ...(c === "C"
              ? { border: `1.5px solid ${PIP_STYLE.C.bg}` }
              : { background: PIP_STYLE[c].bg, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.3)" }),
          }}
        />
      ))}
    </span>
  );
}
