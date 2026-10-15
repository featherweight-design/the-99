"use client";
// A pod's Add friends (Social R1 PR E1; R2 option B, `+ Add friends, with faces`; design table §9): a dialog at
// desktop, the shipped sheet at phone (`SocialModal`). The viewer's friends who are not yet in the pod, by name, each
// a checkbox row with the friend's face; nothing ticked on open; one press adds every ticked friend in one write, all
// or none (E11). The list scrolls and the button stays pinned under it (README 15).
//
// Two empties (E15): every friend is already in the pod, or the viewer has no friends at all.

import { useId, useState, type RefObject } from "react";
import type { Friend } from "../../lib/social/access";
import { socialCopy } from "../../lib/copy/social";
import { Face } from "./face";
import { SocialModal } from "./social-modal";

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
  const n = ticked.size;
  const held = n === 0 || busy;
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
        <p className="m-0 py-[10px] text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]" data-testid="pod-add-empty">
          {hasFriends ? copy.addAllIn : copy.addNoFriends}
        </p>
      ) : (
        <>
          <div role="group" aria-labelledby={groupId} className="-mx-[2px] min-h-0 flex-1 overflow-y-auto px-[2px]">
            <span id={groupId} className="sr-only">{copy.addTitle(podName)}</span>
            {candidates.map((f) => (
              <label
                key={f.publicId}
                className="flex h-[56px] cursor-pointer items-center gap-[12px] font-sans text-[14.5px] text-[color:var(--fg)] [border-bottom:1px_solid_var(--elevated)]"
              >
                <input type="checkbox" checked={ticked.has(f.publicId)} onChange={() => toggle(f.publicId)} className="peer sr-only" />
                <span
                  aria-hidden
                  className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[4px] text-[12px] font-bold text-[color:var(--bg)] [border:1.5px_solid_var(--fg-faint)] peer-checked:bg-[color:var(--accent)] peer-checked:[border-color:var(--accent)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--accent)]"
                >
                  {ticked.has(f.publicId) ? "✓" : ""}
                </span>
                <Face name={f.displayName} commander={f.commander} size={40} />
                <span className="flex min-w-0 flex-col gap-[1px]">
                  <span className="truncate">{f.displayName}</span>
                  {f.commander ? <span className="truncate text-[12px] text-[color:var(--fg-muted)]">{f.commander.name}</span> : null}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-[14px] flex flex-none justify-end">
            <button
              type="button"
              aria-disabled={held || undefined}
              aria-busy={busy || undefined}
              onClick={() => {
                if (!held) onAdd([...ticked]);
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
