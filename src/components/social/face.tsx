// A person's face (Social R1, README decision 22): their signature commander's art, or their initials while
// they have chosen none. ONE component at every size a person is drawn: 64 in the head of /friends, 40 on a
// friend row, 26 on a pod chip, and R3's game-log picker. It draws the face and nothing else: a press, a
// pencil badge or a ring belongs to whoever wraps it.

import type { ProfileCommander } from "../../lib/social/commander";
import { faceInitials } from "../../lib/social/initials";
import { FadingImg } from "../ui/hydrated-art";

export type FaceSize = 64 | 40 | 26;

export { faceInitials };

// The board's three boxes: 14px corners on the 64 head tile, 10px on the 40 row tile, a disc at 26. The head
// tile is 56 with 13px corners at phone (R2 Friends-Phone) and 64 from md.
const BOX: Record<FaceSize, string> = {
  64: "h-[56px] w-[56px] rounded-[13px] text-[16px] md:h-[64px] md:w-[64px] md:rounded-[14px] md:text-[18px]",
  40: "h-[40px] w-[40px] rounded-[10px] text-[12px]",
  26: "h-[26px] w-[26px] rounded-full text-[9.5px]",
};

export function Face({
  name,
  commander,
  size,
  className = "",
}: {
  /** The person's display name: the initials while unset. */
  name: string;
  commander: Pick<ProfileCommander, "artCropUri"> | null;
  size: FaceSize;
  className?: string;
}) {
  const art = commander?.artCropUri ?? null;
  return (
    <span
      aria-hidden
      data-face={art ? "art" : "initials"}
      className={`${BOX[size]} flex flex-none items-center justify-center overflow-hidden font-mono font-medium ${size === 26 ? "bg-[color:var(--elevated)] text-[color:var(--fg-muted)]" : "[border:1px_solid_var(--border-strong)] bg-[color:var(--surface-raised)] text-[color:var(--fg-body)]"} ${className}`}
    >
      {art ? <FadingImg src={art} alt="" className="block h-full w-full object-cover" /> : faceInitials(name)}
    </span>
  );
}
