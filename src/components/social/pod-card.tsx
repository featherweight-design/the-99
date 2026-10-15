"use client";
// One pod on /friends, as a table (Social R1 PR E1; handoff R2 `R2 - Pods`, option B; design table
// `social-r1-pods.md` §3). The members sit as art tiles over a wash of their own art, the viewer outlined in the
// accent; the owner removes a member with the ✕ disc on its tile, and adds friends with the empty seat at the end of
// the row. The spares checkbox under the seats is the viewer's own grant to this pod (E5), seen by nobody else.
//
// A member's art is drawn only for the viewer and the viewer's friends (D2): the read hands a non-friend member over
// with no commander, so their tile is initials whatever they chose. The header menu (rename, leave, delete) is E2's.

import type { Pod, PodMember } from "../../lib/social/access";
import { socialCopy } from "../../lib/copy/social";
import { FadingImg } from "../ui/hydrated-art";
import { faceInitials } from "./face";

const copy = socialCopy.pods;

/** The wash under the seats (§3a): the members' own art, blurred 34px at 30%, bleeding 40px past the card. */
function Wash({ members }: { members: readonly PodMember[] }) {
  const art = members.flatMap((m) => (m.commander?.artCropUri ? [m.commander.artCropUri] : []));
  if (art.length === 0) return null;
  return (
    // A clip of its own, so the card itself never clips (E2's menu opens inside it).
    <div aria-hidden className="pod-wash pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <div className="absolute inset-[-40px] flex opacity-30 [filter:blur(34px)_saturate(1.25)]">
        {art.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- the seats' own art, already requested (G15)
          <img key={i} src={src} alt="" className="h-full min-w-0 flex-1 object-cover" />
        ))}
      </div>
    </div>
  );
}

/** A member's seat: art (or initials), the name, and a tag; the owner's ✕ over the art (§3d, §3e). */
function Seat({ member, podName, onRemove }: { member: PodMember; podName: string; onRemove: (() => void) | null }) {
  const art = member.commander?.artCropUri ?? null;
  // The owner tag wins over not-a-friend: a member is one or the other on the tile (d9, 2026-10-15).
  const tag = member.isYou ? null : member.isOwner ? copy.ownerTag : !member.isFriend ? copy.notFriendTag : null;
  return (
    <li className="relative flex min-w-0 flex-col gap-[6px]" data-testid="pod-seat" data-you={member.isYou ? "" : undefined}>
      <span
        aria-hidden
        className={`relative block h-[74px] overflow-hidden rounded-[10px] md:h-[84px] ${
          member.isYou
            ? "[border:1px_solid_var(--accent)] shadow-[0_0_0_1px_var(--accent),0_10px_24px_rgba(0,0,0,.45)]"
            : "[border:1px_solid_rgba(255,255,255,.08)] shadow-[0_10px_24px_rgba(0,0,0,.45)]"
        }`}
      >
        {art ? (
          <FadingImg src={art} alt="" className="block h-full w-full object-cover" />
        ) : (
          <span
            data-testid="pod-seat-initials"
            className="flex h-full w-full items-center justify-center bg-[radial-gradient(120px_80px_at_50%_40%,color-mix(in_oklab,var(--elevated)_70%,var(--border-dashed)),var(--surface))] font-display text-[26px] font-bold text-[color:var(--fg-muted)]"
          >
            {faceInitials(member.displayName)}
          </span>
        )}
      </span>
      <span className="flex min-w-0 items-baseline gap-[6px] font-sans text-[13px] font-medium text-[color:var(--fg)]">
        <span className="min-w-0 truncate" data-testid="pod-seat-name">{member.isYou ? copy.you : member.displayName}</span>
        {tag ? <small className="flex-none font-mono text-[10px] font-normal text-[color:var(--fg-muted)]">{tag}</small> : null}
      </span>
      {onRemove ? (
        <button
          type="button"
          aria-label={copy.removeMemberAria(member.displayName, podName)}
          onClick={onRemove}
          // 28px as drawn, with a 44px press (C-3): the pseudo-element takes the 8px around it.
          className="absolute right-[4px] top-[4px] flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full border-0 bg-[rgba(14,15,20,.78)] p-0 text-[11px] text-[color:var(--fg)] after:absolute after:-inset-[8px] after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
        >
          {"✕"}
        </button>
      ) : null}
    </li>
  );
}

export function PodCard({
  pod,
  shared,
  onRemove,
  onAdd,
  onShare,
  addRef,
}: {
  pod: Pod;
  shared: boolean;
  onRemove: (member: PodMember) => void;
  onAdd: () => void;
  onShare: (on: boolean) => void;
  /** The Add seat, for the Add friends dialog to hand focus back to. */
  addRef?: (el: HTMLButtonElement | null) => void;
}) {
  const n = pod.members.length;
  const owner = pod.members.find((m) => m.isOwner);
  return (
    <div data-testid="pod-card" className="relative mt-[12px] rounded-[12px] bg-[color:var(--surface-rail)] pb-[6px] pl-[14px] pr-[4px] pt-[4px] [border:1px_solid_var(--border-strong)] md:pb-[8px] md:pl-[18px] md:pr-[6px] md:pt-[6px]">
      <Wash members={pod.members} />
      <div className="relative flex min-h-[44px] flex-wrap items-center gap-x-[10px] md:flex-nowrap">
        <b className="min-w-0 truncate font-sans text-[15px] font-semibold text-[color:var(--fg)]">{pod.name}</b>
        <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
          {pod.isOwner || !owner ? copy.metaOwn(n) : copy.metaOther(n, owner.displayName)}
        </span>
      </div>
      <ul
        // An explicit list role: Safari drops a list's semantics once its marker is gone (`list-none`).
        role="list"
        className="relative m-0 mr-[10px] mt-[8px] grid list-none grid-cols-3 gap-x-[10px] gap-y-[12px] p-0 md:mr-[12px] md:grid-cols-[repeat(5,116px)] md:gap-x-[12px] md:gap-y-[14px]"
        aria-label={pod.name}
      >
        {pod.members.map((m) => (
          <Seat key={m.publicId} member={m} podName={pod.name} onRemove={pod.isOwner && !m.isYou ? () => onRemove(m) : null} />
        ))}
        {pod.isOwner ? (
          // A list item of its own, so the list holds nothing but items (C-9).
          <li className="flex min-w-0 flex-col">
            <button
              ref={addRef}
              type="button"
              onClick={onAdd}
              className="flex h-[74px] cursor-pointer items-center justify-center rounded-[10px] bg-transparent p-0 font-sans text-[13px] font-medium text-[color:var(--fg-body)] [border:1.5px_dashed_var(--border-dashed)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] md:h-[84px]"
            >
              {copy.addFriends}
            </button>
          </li>
        ) : null}
      </ul>
      {n === 1 ? <p className="relative m-0 mr-[10px] mt-[8px] text-[12.5px] text-[color:var(--fg-muted)] md:mr-0">{copy.solo}</p> : null}
      <label className="relative mt-[10px] flex min-h-[44px] cursor-pointer items-center gap-[10px] font-sans text-[13px] text-[color:var(--fg-body)] md:min-h-[40px]">
        <input
          type="checkbox"
          checked={shared}
          onChange={(e) => onShare(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[4px] text-[12px] font-bold text-[color:var(--bg)] [border:1.5px_solid_var(--fg-faint)] peer-checked:bg-[color:var(--accent)] peer-checked:[border-color:var(--accent)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--accent)]"
        >
          {shared ? "✓" : ""}
        </span>
        <span>{copy.share}</span>
      </label>
    </div>
  );
}
