"use client";
// The friend request card (Social R1 PR D, README decisions 21 to 23; boards `R2 - Landing-*`): a card in the shape
// of a Magic card, 300×419, framed by the sender's commander art. Its back is the 99's mark. Both faces share one
// box, the front pre-rotated 180°, so the turn moves nothing on the page; the turn itself is CSS
// (`.friend-card-*` in globals.css), and who turns it when is the landing's (`friend-landing.tsx`).
//
// A client component because its art fades in as it lands (`FadingImg`). At phone width the card is drawn at 74%
// (222×310), scaled from the top centre, with the height the scale frees taken back below it.
//
// `compact` is the newcomer's card (`/join`, `/sign-up`; invites R1 PR 5, boards N1 to N12): the same 300×419 box
// scaled to .5 (150×210) at every width, tilted -3° while it has a face to show (a back alone sits straight), with a back word of the caller's and, at N6, the check badge.
// The friend landing never passes it, so its sizes are unchanged.

import { useId } from "react";
import type { ProfileCommander } from "../../lib/social/commander";
import { socialCopy } from "../../lib/copy/social";
import { FadingImg } from "../ui/hydrated-art";
import { ArtLayer } from "../ui/art-layer";
import { faceInitials } from "./face";

const copy = socialCopy.landing;

/** What the face-up card names. Only an open link, your own and a friend's are ever drawn face up (D1, E6). */
export type CardFace = {
  name: string;
  commander: Pick<ProfileCommander, "name" | "artCropUri"> | null;
  /** The type line: `typeRequest`, `typeOwn` or `typeFriend(since)`. */
  type: string;
  /** The text box: `openRules(name)`, `ownRules` or `friendRules(name)`. */
  rules: string;
};

const SHADOW = "shadow-[0_34px_70px_rgba(0,0,0,.6),0_0_0_1px_rgba(0,0,0,.6)]";
// The board's compact card draws `0 20px 44px` at 150 wide; the box is scaled by .5, so its own shadow is doubled.
const COMPACT_SHADOW = "shadow-[0_40px_88px_rgba(0,0,0,.6),0_0_0_2px_rgba(0,0,0,.6)]";

export function FriendCard({
  face,
  up,
  arrival = false,
  dim = false,
  compact = false,
  word,
  badge = false,
}: {
  /** Null for a card that is never turned (signed out, expired, ended): the back alone is drawn. */
  face: CardFace | null;
  /** Face up. Changing it turns the card. */
  up: boolean;
  /** The arrival turn waits its 200ms beat; a decline's turn back starts at once. */
  arrival?: boolean;
  /** The expired card: the back at .42, in grayscale (L3). */
  dim?: boolean;
  /** The newcomer's 150×210 card, tilted -3° (`/join`, `/sign-up`). */
  compact?: boolean;
  /** The word under the back's mark. Defaults to the landing's kicker. */
  word?: string;
  /** The check badge on the card's corner (N6). Compact only. */
  badge?: boolean;
}) {
  const turn = (
    <div
      className="friend-card-turn"
      data-up={up ? "true" : "false"}
      data-arrival={arrival ? "true" : "false"}
    >
      <CardBack dim={dim} word={word ?? copy.kicker} compact={compact} />
      {face && <CardFront face={face} hidden={!up} compact={compact} />}
    </div>
  );
  if (compact) {
    return (
      <div data-testid="friend-card" data-variant="compact" className={`relative h-[210px] w-[150px] flex-none ${face ? "rotate-[-3deg]" : ""}`}>
        <div className="friend-card absolute left-0 top-0 h-[419px] w-[300px] origin-top-left scale-[.5]">{turn}</div>
        {badge && (
          <span
            aria-hidden
            data-testid="friend-card-badge"
            className="absolute bottom-[-8px] right-[-8px] flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[color:var(--success)] font-sans text-[15px] font-bold text-[color:var(--bg)] shadow-[0_4px_10px_rgba(0,0,0,.5)]"
          >
            ✓
          </span>
        )}
      </div>
    );
  }
  return (
    <div
      data-testid="friend-card"
      className="friend-card relative h-[419px] w-[300px] flex-none max-md:mb-[-109px] max-md:origin-top max-md:scale-[.74]"
    >
      {turn}
    </div>
  );
}

// The invite-only page's fan (`/sign-up`, boards I1 and I2): three backs, the front one carrying the word. A 360×440 fan at
// `md` and up; below it the same 300×419 backs scaled to .48 inside a 240×240 box. Decorative.
const FAN_BACK = "absolute h-[419px] w-[300px] origin-top max-md:left-[-30px] max-md:top-[6px] md:left-[30px] md:top-[10px] md:origin-center";
const FAN_PLACE = {
  left: "opacity-[.55] [transform:scale(.48)_rotate(-9deg)_translate(-40px,14px)] md:[transform:rotate(-9deg)_translate(-26px,8px)]",
  right: "opacity-[.75] [transform:scale(.48)_rotate(8deg)_translate(40px,16px)] md:[transform:rotate(8deg)_translate(26px,10px)]",
  front: "[transform:scale(.48)] md:[transform:none]",
} as const;

export function InviteFan({ word }: { word: string }) {
  return (
    <div aria-hidden data-testid="invite-fan" className="relative h-[240px] w-[240px] flex-none md:h-[440px] md:w-[360px]">
      {(["left", "right", "front"] as const).map((place) => (
        <div key={place} data-fan={place} className={`${FAN_BACK} ${FAN_PLACE[place]}`}>
          <CardBack dim={false} word={place === "front" ? word : null} compact={false} />
        </div>
      ))}
    </div>
  );
}

// The compact back is the 300×419 box at .5, so the board's 150×210 values are doubled here (pr5 table, Card back and
// Back inner): radius 9px → 18, inner radius 6px → 12, inner border 1px → 2.
function CardBack({ dim, word, compact }: { dim: boolean; word: string | null; compact: boolean }) {
  return (
    <div
      aria-hidden
      data-testid="friend-card-back"
      className={`friend-card-face friend-card-back box-border bg-[color:var(--surface-inset)] p-[12px] ${compact ? "rounded-[18px] shadow-[0_40px_88px_rgba(0,0,0,.6),inset_0_0_0_2px_var(--border-strong)]" : "rounded-[17px] shadow-[0_34px_70px_rgba(0,0,0,.6),inset_0_0_0_1px_var(--border-strong)]"} ${dim ? "opacity-[.42] grayscale" : ""}`}
    >
      <div className={`flex h-full w-full flex-col items-center justify-center ${compact ? "gap-[12px] rounded-[12px] [border:2px_solid_var(--border-dashed)]" : "gap-[10px] rounded-[10px] [border:1px_solid_var(--border-dashed)]"} bg-[color:var(--surface-sunken)] bg-[image:radial-gradient(240px_260px_at_50%_46%,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_72%),repeating-linear-gradient(45deg,rgba(255,255,255,.018)_0_6px,transparent_6px_12px)]`}>
        <div className="flex flex-col items-center">
          <span className={`text-[color:var(--accent)] ${compact ? "mb-[8px] text-[16px] tracking-[6px]" : "mb-[6px] text-[13px] tracking-[4px]"}`}>◆ ◆ ◆</span>
          <span className={`font-display font-bold leading-none text-[color:var(--fg)] ${compact ? "text-[68px]" : "text-[58px]"}`}>99</span>
        </div>
        {word !== null && (
          <span
            data-testid="friend-card-word"
            className={`font-mono uppercase text-[color:var(--accent)] ${compact ? "text-[15px] tracking-[.35em]" : "text-[10px] tracking-[.4em]"}`}
          >
            {word}
          </span>
        )}
      </div>
    </div>
  );
}

function CardFront({ face, hidden, compact }: { face: CardFace; hidden: boolean; compact: boolean }) {
  const art = face.commander?.artCropUri ?? null;
  // The text box says what accepting shares, so it is the image's description, read after its label.
  const rulesId = useId();
  return (
    <div
      // One labelled image to assistive tech while it is face up; face down it is not there to read.
      role="img"
      aria-label={copy.cardAria(face.name, face.commander?.name ?? null, face.type)}
      aria-describedby={rulesId}
      aria-hidden={hidden || undefined}
      data-testid="friend-card-front"
      data-frame={art ? "art" : "grey"}
      className={`friend-card-face friend-card-front box-border overflow-hidden ${compact ? `rounded-[18px] p-[8px] text-left ${COMPACT_SHADOW}` : `rounded-[17px] p-[3px] ${SHADOW}`} ${art ? "bg-[color:var(--border-strong)]" : "bg-[linear-gradient(160deg,var(--fg-disabled),var(--border-strong))]"}`}
    >
      {/* The frame is the commander's art crop, behind the face, fading in as it lands. */}
      {art && <ArtLayer src={art} />}
      <div className={`relative box-border flex h-full w-full flex-col overflow-hidden rounded-[14px] bg-[color:var(--surface-inset)] ${compact ? "gap-[6px] p-[10px]" : "gap-[6px] p-[9px]"}`}>
        <div className={`flex flex-none items-center gap-[8px] bg-[color:var(--elevated)] shadow-[inset_0_0_0_1px_rgba(255,255,255,.05)] ${compact ? "h-[34px] rounded-[8px] px-[12px]" : "h-[32px] rounded-[8px] px-[10px]"}`}>
          <b className={`flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[color:var(--fg)] ${compact ? "font-sans text-[18px] font-semibold" : "font-display text-[16px] font-bold"}`}>{face.name}</b>
        </div>
        {art ? (
          <div className={`flex-none overflow-hidden rounded-[6px] bg-[color:var(--elevated)] ${compact ? "h-[176px]" : "h-[178px]"} shadow-[inset_0_0_0_1px_rgba(0,0,0,.6)]`}>
            <FadingImg src={art} alt="" className="block h-full w-full object-cover" />
          </div>
        ) : (
          <div
            data-testid="friend-card-initials"
            className="flex h-[178px] flex-none items-center justify-center overflow-hidden rounded-[6px] bg-[radial-gradient(220px_160px_at_50%_40%,var(--elevated),var(--surface))] font-display text-[64px] font-bold tracking-[.04em] text-[color:var(--fg-muted)] shadow-[inset_0_0_0_1px_rgba(0,0,0,.6)]"
          >
            {faceInitials(face.name)}
          </div>
        )}
        <div className={`flex flex-none items-center justify-between bg-[color:var(--elevated)] font-display font-semibold text-[color:var(--fg)] shadow-[inset_0_0_0_1px_rgba(255,255,255,.05)] ${compact ? "h-[28px] rounded-[6px] px-[12px] text-[15px]" : "h-[26px] rounded-[6px] px-[10px] text-[12.5px]"}`}>
          <span>{face.type}</span>
          <i className="text-[11px] not-italic text-[color:var(--accent)]">◆</i>
        </div>
        <p id={rulesId} className={`m-0 min-h-0 flex-1 overflow-hidden [overflow-wrap:anywhere] rounded-[6px] bg-[color:var(--surface-sunken)] font-sans text-[color:var(--fg-body)] ${compact ? "px-[12px] py-[10px] text-[14px] leading-[1.4]" : "px-[11px] py-[9px] text-[12px] leading-[1.45]"}`}>{face.rules}</p>
        <div className={`flex flex-none justify-between px-[4px] font-mono uppercase text-[color:var(--fg-faint)] ${compact ? "text-[12px] tracking-[.15em]" : "text-[9.5px] tracking-[.04em]"}`}>
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{face.commander ? copy.credit(face.commander.name) : copy.noCommander}</span>
          <span className="flex-none pl-[8px]">{copy.mark}</span>
        </div>
      </div>
    </div>
  );
}
