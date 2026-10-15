// A person's face (Social R1, README decision 22): their signature commander's art, or their initials while
// they have chosen none. ONE component at every size a person is drawn: 64 in the head of /friends, 40 on a
// friend row, 26 on a pod chip, and R3's game-log picker. It draws the face and nothing else: a press, a
// pencil badge or a ring belongs to whoever wraps it.

import type { ProfileCommander } from "../../lib/social/commander";
import { FadingImg } from "../ui/hydrated-art";

export type FaceSize = 64 | 40 | 26;

/** Two letters: the first of each of the first two words, or the first two of a one-word name. */
export function faceInitials(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const letters = (w: string) => [...w].filter((c) => /[\p{L}\p{N}]/u.test(c));
  const out = words.length > 1
    ? [letters(words[0])[0], letters(words[1])[0]]
    : letters(words[0] ?? "").slice(0, 2);
  return out.filter(Boolean).join("").toLocaleUpperCase("en-US");
}

// The board's three boxes: 14px corners on the 64 head tile, 10px on the 40 row tile, a disc at 26.
const BOX: Record<FaceSize, string> = {
  64: "h-[64px] w-[64px] rounded-[14px] text-[18px]",
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
      className={`${BOX[size]} flex flex-none items-center justify-center overflow-hidden font-mono font-medium text-[color:var(--fg-body)] ${size === 26 ? "bg-[color:var(--elevated)]" : "[border:1px_solid_var(--border)] bg-[color:var(--surface-raised)]"} ${className}`}
    >
      {art ? <FadingImg src={art} alt="" className="block h-full w-full object-cover" /> : faceInitials(name)}
    </span>
  );
}
