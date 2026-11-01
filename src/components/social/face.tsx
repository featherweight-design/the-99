// A person's face (Social R1, README decision 22): their signature commander's art, or their initials while
// they have chosen none. ONE component at every size a person is drawn: 64 in the head of /friends, 40 on a
// friend row, 30 in the stand-ins modal's spares and on Home's Rule 0 table card (revisions Home), 26 on a pod chip, and R3's game-log picker; Rule 0's 36 on the lead story
// and 24 in a pod row's overlapped strip; 16 in a friend's deck page's eyebrow. It draws the face and nothing else: a press, a
// pencil badge or a ring belongs to whoever wraps it.

import type { ProfileCommander } from "../../lib/social/commander";
import { faceInitials } from "../../lib/names/initials";
import { PersonInitials, type ThirdPartyName } from "../../lib/person-name";
import { FadingImg } from "../ui/hydrated-art";

export type FaceSize = 64 | 40 | 36 | 32 | 30 | 26 | 24 | 22 | 16;

export { faceInitials };

// The boards' boxes: 14px corners on the 64 head tile, 10px on the 40 row tile and Rule 0's 36, 8px on the 30 (R2's
// modal friend row), a disc at 26 and 24. The 36 and the 24 sit on art, so their wrapper draws the edge (Rule 0 E2, E3). The head
// tile is 56 with 13px corners at phone (R2 Friends-Phone) and 64 from md.
const BOX: Record<FaceSize, string> = {
  64: "h-[56px] w-[56px] rounded-[13px] text-[16px] md:h-[64px] md:w-[64px] md:rounded-[14px] md:text-[18px]",
  40: "h-[40px] w-[40px] rounded-[10px] text-[12px]",
  36: "h-[36px] w-[36px] rounded-[10px] text-[10px] font-semibold",
  // The cart's Filters sheet Friend pill, a disc (v2 Controls B1).
  32: "h-[32px] w-[32px] rounded-full text-[11px]",
  30: "h-[30px] w-[30px] rounded-[8px] text-[10px]",
  // The cart's desktop Friend panel row, a 6px-cornered tile (v2 Controls A1).
  22: "h-[22px] w-[22px] rounded-[6px] text-[8.5px]",
  26: "h-[26px] w-[26px] rounded-full text-[9.5px]",
  24: "h-[24px] w-[24px] rounded-full text-[10px] font-semibold",
  16: "h-[16px] w-[16px] rounded-[5px] text-[7px]",
};

export function Face({
  name,
  commander,
  size,
  className = "",
}: {
  /** The person's display name: the initials while unset. */
  name: string | ThirdPartyName;
  commander: Pick<ProfileCommander, "artCropUri"> | null;
  size: FaceSize;
  className?: string;
}) {
  const art = commander?.artCropUri ?? null;
  return (
    <span
      aria-hidden
      data-face={art ? "art" : "initials"}
      className={`${BOX[size]} flex flex-none items-center justify-center overflow-hidden font-mono ${size === 24 || size === 36 ? "" : "font-medium "}${size === 26 || size === 24 || size === 36 ? "bg-[color:var(--elevated)] text-[color:var(--fg-muted)]" : "[border:1px_solid_var(--border-strong)] bg-[color:var(--surface-raised)] text-[color:var(--fg-body)]"} ${className}`}
    >
      {art ? <FadingImg src={art} alt="" className="block h-full w-full object-cover" /> : <PersonInitials n={name} />}
    </span>
  );
}
