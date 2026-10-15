"use client";
// Your friends (Social R1; R2 Friends F4, F5; R1 F1, F6, F7). Sorted by name, as `listFriends` returns them
// (C4): a friend just accepted does not jump to the top, it reads `since today` in `--success` where its name
// falls. A row is the face (40), the name with the commander's name under it, the `since`, and `…`, whose one
// row, Remove friend, turns into the shared delete pane (Keep it first and focused). With none, the empty box,
// which offers no search: nobody can be found by name.
//
// Removing is the page's write; this draws the pane and reports the press. The row leaves when the write
// lands, so the list itself is the receipt, and a failure is the page's toast.

import { useEffect, useRef, useState } from "react";
import type { Friend } from "../../lib/social/access";
import { socialCopy } from "../../lib/copy/social";
import { folderCopy } from "../../lib/copy/folders";
import { sinceDay } from "../../lib/social/when";
import { DeleteConfirm, DELETE_CONFIRM_WIDTH } from "../ui/delete-confirm";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { Face } from "./face";

const f = socialCopy.friends;

export const SECTION_HEAD =
  "m-0 flex min-h-[32px] items-center pb-[8px] font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)] [border-bottom:1px_solid_var(--border)]";

export function FriendsList({
  friends,
  now,
  timeZone,
  fresh,
  removing,
  onRemove,
}: {
  friends: Friend[];
  now: Date;
  timeZone: string | undefined;
  /** The friend just accepted (E10), whose `since` is drawn in `--success`. */
  fresh: string | null;
  /** The friend whose removal is in flight. */
  removing: string | null;
  onRemove: (friend: Friend) => void;
}) {
  return (
    <section aria-labelledby="friends-head" className="mt-[34px]">
      <h2 id="friends-head" className={SECTION_HEAD}>{f.head(friends.length)}</h2>
      {friends.length === 0 ? (
        <div className="mt-[14px] flex flex-col gap-[6px] rounded-[12px] px-[20px] py-[22px] md:px-[28px] md:py-[26px] [border:1px_dashed_var(--border-strong)]">
          <p className="m-0 font-display text-[17px] font-bold text-[color:var(--fg)]">{f.emptyTitle}</p>
          <p className="m-0 max-w-[560px] text-[13.5px] leading-[1.55] text-[color:var(--fg-muted)]">{f.emptyBody}</p>
        </div>
      ) : (
        <ul className="m-0 list-none p-0">
          {friends.map((friend) => (
            <FriendRow
              key={friend.publicId}
              friend={friend}
              since={sinceDay(friend.since, now, timeZone)}
              fresh={friend.publicId === fresh}
              removing={removing === friend.publicId}
              onRemove={() => onRemove(friend)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FriendRow({
  friend,
  since,
  fresh,
  removing,
  onRemove,
}: {
  friend: Friend;
  since: string;
  fresh: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  const [menu, setMenu] = useState<"closed" | "menu" | "confirm">("closed");
  const trigger = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  // An outside press closes the menu, as the shelf menu's does; never while the removal is in flight.
  useEffect(() => {
    if (menu === "closed") return;
    const away = (e: PointerEvent) => {
      if (!removing && !wrap.current?.contains(e.target as Node)) setMenu("closed");
    };
    window.addEventListener("pointerdown", away);
    return () => window.removeEventListener("pointerdown", away);
  }, [menu, removing]);

  function close() {
    if (removing) return;
    setMenu("closed");
    trigger.current?.focus();
  }

  return (
    <li className="relative flex h-[60px] items-center gap-[12px] [border-bottom:1px_solid_var(--border)]" data-friend-row="">
      <Face name={friend.displayName} commander={friend.commander} size={40} />
      <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
        <span className="truncate text-[14.5px] font-medium text-[color:var(--fg)]">{friend.displayName}</span>
        {friend.commander ? <span className="truncate text-[12px] text-[color:var(--fg-muted)]">{friend.commander.name}</span> : null}
      </div>
      <span className={`flex-none font-mono text-[11px] ${fresh ? "text-[color:var(--success)]" : "text-[color:var(--fg-faint)]"}`}>
        {f.since(since)}
      </span>
      <div ref={wrap} className="relative flex-none">
        <button
          ref={trigger}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={menu !== "closed"}
          aria-label={f.menuAria(friend.displayName)}
          onClick={() => setMenu((m) => (m === "closed" ? "menu" : "closed"))}
          className={`flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-[8px] border-0 p-0 text-[15px] tracking-[1px] text-[color:var(--fg-muted)] ${menu !== "closed" ? "bg-[color:var(--elevated)]" : "bg-transparent"}`}
        >
          {"⋯"}
        </button>
        {menu !== "closed" ? (
          <MenuPanel label={f.menuAria(friend.displayName)} onDismiss={close}>
            {menu === "menu" ? (
              <button
                type="button"
                onClick={() => setMenu("confirm")}
                className="flex h-[40px] w-full cursor-pointer items-center border-0 bg-transparent px-[13px] text-left font-sans text-[13px] text-[color:var(--danger)] hover:bg-[color:var(--elevated)]"
              >
                {f.remove}
              </button>
            ) : (
              <DeleteConfirm
                heading={f.removeHeading(friend.displayName)}
                body={f.removeBody(friend.displayName)}
                cancelLabel={folderCopy.del.cancel}
                confirmLabel={f.removeConfirm}
                pending={removing}
                error={null}
                onCancel={close}
                onConfirm={onRemove}
              />
            )}
          </MenuPanel>
        ) : null}
      </div>
    </li>
  );
}

function MenuPanel({ label, onDismiss, children }: { label: string; onDismiss: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // A popover with no backdrop: Escape and focus are the dialog hook's, the page keeps its scroll.
  useDialogA11y(ref, onDismiss, { lockScroll: false });
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      style={{ width: DELETE_CONFIRM_WIDTH }}
      className="absolute right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-[10px] bg-[color:var(--surface)] shadow-[0_22px_50px_rgba(0,0,0,0.6)] [border:1px_solid_var(--border-strong)]"
    >
      {children}
    </div>
  );
}
