"use client";
// One pod on /friends, as a table (Social R1 PR E1; handoff R2 `R2 - Pods`, option B; design table
// `social-r1-pods.md` §3). The members sit as art tiles over a wash of their own art, the viewer outlined in the
// accent; the owner removes a member with the ✕ disc on its tile, and adds friends with the empty seat at the end of
// the row. The spares checkbox under the seats is the viewer's own grant to this pod (E5), seen by nobody else.
//
// A member's art is drawn only for the viewer and the viewer's friends (D2): the read hands a non-friend member over
// with no commander, so their tile is initials whatever they chose. The header carries the `…` menu (E2,
// `pod-menu.tsx`), and Rename swaps the header for its field (§7).

import { useEffect, useRef, useState } from "react";
import type { Pod, PodMember } from "../../lib/social/access";
import { socialCopy } from "../../lib/copy/social";
import { capName, POD_NAME_MAX } from "../../lib/social/client-rules";
import { AFFIX_FOCUS, AFFIX_INPUT } from "../ui/text-field";
import { SeatArt } from "./seat-art";
import { PodMenu } from "./pod-menu";
import { Checkbox } from "../ui/checkbox";

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
      <SeatArt art={art} name={member.displayName} ring={member.isYou} />
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
          className="absolute right-[4px] top-[4px] flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full border-0 bg-[color-mix(in_oklab,var(--bg)_78%,transparent)] p-0 text-[11px] text-[color:var(--fg)] after:absolute after:-inset-[8px] after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
        >
          {"✕"}
        </button>
      ) : null}
    </li>
  );
}

/**
 * The header's rename field (§7). Save, Return or a blur away commits a valid name; an empty or unchanged one
 * reverts, and so do Cancel and Escape. Cancel and Save keep focus in the field on press (`friends-head.tsx`'s
 * guard): Safari never focuses a clicked button, so its blur arrives with no relatedTarget and would commit an
 * edit Cancel meant to drop. Where a browser does move focus onto them, the relatedTarget check does the same.
 */
function PodRename({ name, onDone }: { name: string; onDone: (next: string | null, refocus: boolean) => void }) {
  const [value, setValue] = useState(name);
  const form = useRef<HTMLFormElement>(null);
  const done = useRef(false);
  // `refocus` is false for a blur: focus has already gone where the reader sent it.
  const finish = (next: string | null, refocus = true) => {
    if (done.current) return;
    done.current = true;
    onDone(next, refocus);
  };
  const commit = (refocus = true) => {
    const clean = value.trim();
    finish(clean && clean !== name ? clean : null, refocus);
  };
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
  return (
    <form
      ref={form}
      data-testid="pod-rename"
      className="relative flex flex-col gap-[8px] pr-[10px] pt-[10px] md:flex-row md:items-center md:pr-[6px] md:pt-[4px]"
      onSubmit={(e) => {
        e.preventDefault();
        commit();
      }}
      // On the form, so focus leaving from Cancel or Save (a reader who tabbed through them) commits too.
      onBlur={(e) => {
        if (!form.current?.contains(e.relatedTarget as Node | null)) commit(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.nativeEvent.isComposing) {
          e.stopPropagation();
          finish(null);
        }
      }}
    >
      <div className={`box-border flex h-[46px] w-full rounded-[8px] bg-[color:var(--surface-sunken)] [border:1px_solid_var(--border-strong)] md:h-[40px] md:flex-1 md:rounded-[6px] ${AFFIX_FOCUS}`}>
        <input
          autoFocus
          aria-label={copy.nameLabel}
          value={value}
          onChange={(e) => setValue(capName(e.target.value, POD_NAME_MAX))}
          autoComplete="off"
          className={`h-full w-full min-w-0 px-[12px] text-[16px] text-[color:var(--fg)] md:text-[14px] ${AFFIX_INPUT}`}
        />
      </div>
      <div className="flex gap-[8px]">
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() => finish(null)}
          className="h-[44px] flex-1 cursor-pointer rounded-[8px] bg-transparent px-[14px] text-[14px] text-[color:var(--fg-body)] [border:1px_solid_var(--border-strong)] md:h-[40px] md:flex-none md:rounded-[6px] md:text-[13px]"
        >
          {copy.cancel}
        </button>
        <button
          type="submit"
          onMouseDown={keepFocus}
          className="h-[44px] flex-1 cursor-pointer rounded-[8px] border-0 bg-[color:var(--accent)] px-[16px] text-[14px] font-semibold text-[color:var(--bg)] md:h-[40px] md:flex-none md:rounded-[6px] md:text-[13px]"
        >
          {copy.save}
        </button>
      </div>
    </form>
  );
}

export function PodCard({
  pod,
  shared,
  sharePending = false,
  onRemove,
  onAdd,
  onShare,
  onRename,
  onLeave,
  onDelete,
  leaveHeld = false,
  addRef,
  ruleZero,
}: {
  pod: Pod;
  shared: boolean;
  /** A write of this box is in flight: it holds until that write answers. */
  sharePending?: boolean;
  onRemove: (member: PodMember) => void;
  onAdd: () => void;
  onShare: (on: boolean) => void;
  /** A new name, already checked as non-empty and changed; the pane writes it. */
  onRename: (name: string) => void;
  onLeave: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  /** Leave waits: the pane is holding a removal of the heir the page last named. */
  leaveHeld?: boolean;
  /** The Add seat, for the Add friends dialog to hand focus back to. */
  addRef?: (el: HTMLButtonElement | null) => void;
  /** The card's last row, Rule 0's (`PodRuleZeroRow`); absent with the switch off, and no space kept (E4). */
  ruleZero?: React.ReactNode;
}) {
  const n = pod.members.length;
  const owner = pod.members.find((m) => m.isOwner);
  const [renaming, setRenaming] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  // Leaving the field by its own controls hands focus back to the `…` it was opened from, which the field replaced.
  const refocus = useRef(false);
  useEffect(() => {
    if (renaming || !refocus.current) return;
    refocus.current = false;
    menuTrigger.current?.focus();
  }, [renaming]);
  return (
    <div data-testid="pod-card" className="relative mt-[12px] rounded-[12px] bg-[color:var(--surface-rail)] pb-[6px] pl-[14px] pr-[4px] pt-[4px] [border:1px_solid_var(--border-strong)] md:pb-[8px] md:pl-[18px] md:pr-[6px] md:pt-[6px]">
      <Wash members={pod.members} />
      {renaming ? (
        <PodRename
          name={pod.name}
          onDone={(next, back) => {
            refocus.current = back;
            setRenaming(false);
            if (next !== null) onRename(next);
          }}
        />
      ) : (
        <div className="relative flex min-h-[44px] flex-wrap items-center gap-x-[10px] md:flex-nowrap">
          <b className="min-w-0 truncate font-sans text-[15px] font-semibold text-[color:var(--fg)]" data-testid="pod-name">{pod.name}</b>
          <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
            {pod.isOwner || !owner ? copy.metaOwn(n) : copy.metaOther(n, owner.displayName)}
          </span>
          <PodMenu pod={pod} leaveHeld={leaveHeld} triggerRef={menuTrigger} onRename={() => setRenaming(true)} onLeave={onLeave} onDelete={onDelete} />
        </div>
      )}
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
        <Checkbox checked={shared} busy={sharePending} onChange={onShare} />
        <span>{copy.share}</span>
      </label>
      {ruleZero}
    </div>
  );
}
