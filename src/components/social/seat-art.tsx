// A member's art seat: the pod card's tile (Social R1 §3a), 74px on the phone and 84px from md, their commander's art
// or their initials, outlined in the accent when `ring` (the viewer on the pod card, a seated member in Rule 0's
// setup). One component, so the two surfaces cannot drift apart.

import { FadingImg } from "../ui/hydrated-art";
import { PersonInitials, type ThirdPartyName } from "../../lib/person-name";

export function SeatArt({ art, name, ring, children }: { art: string | null; name: string | ThirdPartyName; ring: boolean; children?: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className={`relative block h-[74px] overflow-hidden rounded-[10px] bg-[color:var(--surface)] md:h-[84px] ${
        ring
          ? "[border:1px_solid_var(--accent)] shadow-[0_0_0_1px_var(--accent),0_10px_24px_rgba(0,0,0,.45)]"
          : "[border:1px_solid_rgba(255,255,255,.08)] shadow-[0_10px_24px_rgba(0,0,0,.45)]"
      }`}
    >
      {art ? (
        <FadingImg src={art} alt="" className="block h-full w-full object-cover" />
      ) : (
        <span
          data-testid="pod-seat-initials"
          className="flex h-full w-full items-center justify-center bg-[radial-gradient(120px_80px_at_50%_40%,color-mix(in_oklab,var(--elevated)_50%,var(--border-dashed)),var(--surface))] font-display text-[26px] font-bold text-[color:var(--fg-muted)]"
        >
          <PersonInitials n={name} />
        </span>
      )}
      {children}
    </span>
  );
}
