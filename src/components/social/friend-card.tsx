"use client";
// The friend request card (Social R1 PR D, README decisions 21 to 23; boards `R2 - Landing-*`): a card in the shape
// of a Magic card, 300×419, framed by the sender's commander art. Its back is the 99's mark. Both faces share one
// box, the front pre-rotated 180°, so the turn moves nothing on the page; the turn itself is CSS
// (`.friend-card-*` in globals.css), and who turns it when is the landing's (`friend-landing.tsx`).
//
// A client component because its art fades in as it lands (`FadingImg`). At phone width the card is drawn at 74%
// (222×310), scaled from the top centre, with the height the scale frees taken back below it.

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

export function FriendCard({
  face,
  up,
  arrival = false,
  dim = false,
}: {
  /** Null for a card that is never turned (signed out, expired, ended): the back alone is drawn. */
  face: CardFace | null;
  /** Face up. Changing it turns the card. */
  up: boolean;
  /** The arrival turn waits its 200ms beat; a decline's turn back starts at once. */
  arrival?: boolean;
  /** The expired card: the back at .42, in grayscale (L3). */
  dim?: boolean;
}) {
  return (
    <div
      data-testid="friend-card"
      className="friend-card relative h-[419px] w-[300px] flex-none max-md:mb-[-109px] max-md:origin-top max-md:scale-[.74]"
    >
      <div
        className="friend-card-turn"
        data-up={up ? "true" : "false"}
        data-arrival={arrival ? "true" : "false"}
      >
        <CardBack dim={dim} />
        {face && <CardFront face={face} hidden={!up} />}
      </div>
    </div>
  );
}

function CardBack({ dim }: { dim: boolean }) {
  return (
    <div
      aria-hidden
      data-testid="friend-card-back"
      className={`friend-card-face friend-card-back box-border rounded-[17px] bg-[color:var(--surface-inset)] p-[12px] shadow-[0_34px_70px_rgba(0,0,0,.6),inset_0_0_0_1px_var(--border-strong)] ${dim ? "opacity-[.42] grayscale" : ""}`}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-[10px] rounded-[10px] [border:1px_solid_var(--border-dashed)] bg-[radial-gradient(240px_260px_at_50%_46%,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_72%),repeating-linear-gradient(45deg,rgba(255,255,255,.018)_0_6px,transparent_6px_12px),var(--surface-sunken)]">
        <div className="flex flex-col items-center">
          <span className="mb-[6px] text-[13px] tracking-[4px] text-[color:var(--accent)]">◆ ◆ ◆</span>
          <span className="font-display text-[58px] font-bold leading-none text-[color:var(--fg)]">99</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[.4em] text-[color:var(--accent)]">{copy.kicker}</span>
      </div>
    </div>
  );
}

function CardFront({ face, hidden }: { face: CardFace; hidden: boolean }) {
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
      className={`friend-card-face friend-card-front box-border overflow-hidden rounded-[17px] p-[3px] ${SHADOW} ${art ? "bg-[color:var(--border-strong)]" : "bg-[linear-gradient(160deg,var(--fg-disabled),var(--border-strong))]"}`}
    >
      {/* The frame is the commander's art crop, behind the face, fading in as it lands. */}
      {art && <ArtLayer src={art} />}
      <div className="relative box-border flex h-full w-full flex-col gap-[6px] overflow-hidden rounded-[14px] bg-[color:var(--surface-inset)] p-[9px]">
        <div className="flex h-[32px] flex-none items-center gap-[8px] rounded-[8px] bg-[color:var(--elevated)] px-[10px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.05)]">
          <b className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-display text-[16px] font-bold text-[color:var(--fg)]">{face.name}</b>
        </div>
        {art ? (
          <div className="h-[178px] flex-none overflow-hidden rounded-[6px] bg-[color:var(--elevated)] shadow-[inset_0_0_0_1px_rgba(0,0,0,.6)]">
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
        <div className="flex h-[26px] flex-none items-center justify-between rounded-[6px] bg-[color:var(--elevated)] px-[10px] font-display text-[12.5px] font-semibold text-[color:var(--fg)] shadow-[inset_0_0_0_1px_rgba(255,255,255,.05)]">
          <span>{face.type}</span>
          <i className="text-[11px] not-italic text-[color:var(--accent)]">◆</i>
        </div>
        <p id={rulesId} className="m-0 min-h-0 flex-1 overflow-hidden [overflow-wrap:anywhere] rounded-[6px] bg-[color:var(--surface-sunken)] px-[11px] py-[9px] font-sans text-[12px] leading-[1.45] text-[color:var(--fg-body)]">{face.rules}</p>
        <div className="flex flex-none justify-between px-[4px] font-mono text-[9.5px] uppercase tracking-[.04em] text-[color:var(--fg-faint)]">
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{face.commander ? copy.credit(face.commander.name) : copy.noCommander}</span>
          <span className="flex-none pl-[8px]">{copy.mark}</span>
        </div>
      </div>
    </div>
  );
}
