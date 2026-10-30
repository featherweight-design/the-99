"use client";
// A pod's Add friends (Social R1 PR E1; R2 option B, `+ Add friends, with faces`; design table §9): a dialog at
// desktop, the shipped sheet at phone (`SocialModal`). The viewer's friends who are not yet in the pod, by name, each
// a checkbox row with the friend's face; nothing ticked on open; one press adds every ticked friend in one write, all
// or none (E11). The list scrolls and the button stays pinned under it (README 15).
//
// Two empties (E15): every friend is already in the pod, or the viewer has no friends at all.

import { useId, useState, type RefObject } from "react";
import type { Friend } from "../../lib/social/access";
import { ADD_MEMBERS_MAX } from "../../lib/social/client-rules";
import { socialCopy } from "../../lib/copy/social";
import { Face } from "./face";
import { SocialModal } from "./social-modal";
import { useFriendInvite } from "./invite-context";
import { ACCENT_BUTTON } from "./friends-head";
import { Checkbox } from "../ui/checkbox";
import { PersonName } from "../../lib/person-name";

const copy = socialCopy.pods;

export function PodAddFriends({
  podName,
  candidates,
  hasFriends,
  busy,
  onAdd,
  onClose,
  returnFocusRef,
}: {
  podName: string;
  /** The viewer's friends not in the pod, in the order drawn. */
  candidates: readonly Friend[];
  /** Whether the viewer has any friend at all: no friends is its own empty. */
  hasFriends: boolean;
  busy: boolean;
  onAdd: (publicIds: string[]) => void;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set());
  const groupId = useId();
  const friendInvite = useFriendInvite();
  // Only friends still on offer count: one who left the list while it was open (a friendship ended) is neither
  // counted nor sent, or the whole batch would be refused for a row the reader can no longer see.
  const live = [...ticked].filter((id) => candidates.some((f) => f.publicId === id));
  const n = live.length;
  // Past the batch cap the button holds and says why, so a press never meets a refusal it could not see (E11).
  const over = n > ADD_MEMBERS_MAX;
  const held = n === 0 || over || busy;
  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <SocialModal title={copy.addTitle(podName)} sub={copy.addSub} closeLabel={socialCopy.page.close} onClose={onClose} returnFocusRef={returnFocusRef} width={420}>
      {candidates.length === 0 ? (
        <div data-testid="pod-add-empty">
          <p className="m-0 py-[10px] text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]">
            {hasFriends ? copy.addAllIn : copy.addNoFriends}
          </p>
          {/* No friends yet: the head's own Add a friend, one press one link (decision 15). The sheet closes first, so
              the link's dialog opens over /friends rather than over this sheet. */}
          {!hasFriends && friendInvite ? (
            <button
              type="button"
              onClick={() => {
                if (friendInvite.pending || friendInvite.held) return;
                onClose();
                friendInvite.invite();
              }}
              aria-disabled={friendInvite.pending || friendInvite.held || undefined}
              className={`${ACCENT_BUTTON} mt-[6px] h-[44px] w-full ${friendInvite.held ? "!bg-[color:var(--elevated)] !text-[color:var(--fg-locked)]" : ""} max-md:h-[48px] max-md:text-[15px] md:w-auto md:px-[18px]`}
            >
              {friendInvite.pending ? socialCopy.page.invitePending : socialCopy.page.invite}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div role="group" aria-labelledby={groupId} className="-mx-[2px] min-h-0 flex-1 overflow-y-auto px-[2px]">
            <span id={groupId} className="sr-only">{copy.addTitle(podName)}</span>
            {candidates.map((f) => (
              <label
                key={f.publicId}
                className="flex h-[56px] cursor-pointer items-center gap-[12px] font-sans text-[14.5px] text-[color:var(--fg)] [border-bottom:1px_solid_var(--elevated)]"
              >
                <Checkbox checked={ticked.has(f.publicId)} onChange={() => toggle(f.publicId)} />
                <Face name={f.displayName} commander={f.commander} size={40} />
                <span className="flex min-w-0 flex-col gap-[1px]">
                  <span className="truncate"><PersonName n={f.displayName} /></span>
                  {f.commander ? <span className="truncate text-[12px] text-[color:var(--fg-muted)]">{f.commander.name}</span> : null}
                </span>
              </label>
            ))}
          </div>
          {over ? <p role="status" className="m-0 mt-[10px] text-[12.5px] text-[color:var(--fg-muted)]">{copy.addMax(ADD_MEMBERS_MAX)}</p> : null}
          <div className="mt-[14px] flex flex-none justify-end">
            <button
              type="button"
              aria-disabled={held || undefined}
              aria-busy={busy || undefined}
              onClick={() => {
                if (!held) onAdd(live);
              }}
              className="h-[48px] w-full cursor-pointer rounded-[8px] border-0 bg-[color:var(--accent)] px-[18px] font-sans text-[14px] font-semibold text-[color:var(--bg)] aria-disabled:cursor-default aria-disabled:opacity-50 md:h-[40px] md:w-auto"
            >
              {copy.addConfirm(n)}
            </button>
          </div>
        </>
      )}
    </SocialModal>
  );
}
