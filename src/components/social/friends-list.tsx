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
import Link from "next/link";
import type { Friend } from "../../lib/social/access";
import { socialCopy } from "../../lib/copy/social";
import { folderCopy } from "../../lib/copy/folders";
import { sinceDay } from "../../lib/social/when";
import { DeleteConfirm, DELETE_CONFIRM_WIDTH } from "../ui/delete-confirm";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { PersonName, personAttrs, type PersonParts } from "../../lib/person-name";
import { Face } from "./face";
import { PendingReporter } from "../shell/pending-reporter";
import { useMomentHold } from "../../lib/moments/hold";

const f = socialCopy.friends;

export const SECTION_HEAD =
  "m-0 flex min-h-[44px] items-center font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)] [border-bottom:1px_solid_var(--border)] md:min-h-[32px] md:pb-[8px]";

export function FriendsList({
  friends,
  now,
  timeZone,
  fresh,
  removing,
  onRemove,
  linkable = false,
}: {
  friends: Friend[];
  now: Date;
  timeZone: string | undefined;
  /** The friend just accepted (E10), whose `since` is drawn in `--success`. */
  fresh: string | null;
  /** The friend whose removal is in flight. */
  removing: string | null;
  onRemove: (friend: Friend) => void;
  /**
   * Each row is a link to the friend's page, with a › before its … (R2 P1, PP1). Only while the wishlist is on for
   * the reader (G9); off, the row is Round 1's.
   */
  linkable?: boolean;
}) {
  // A removal takes its row, its ⋯ and the confirm with it, so the dialog's own return lands on nothing: when
  // the list shrinks and focus is left on the page itself, it goes to the Friends heading. Effects run after the
  // dialog's cleanup in the same commit.
  const head = useRef<HTMLHeadingElement>(null);
  const count = useRef(friends.length);
  useEffect(() => {
    const shrank = friends.length < count.current;
    count.current = friends.length;
    if (shrank && (document.activeElement === null || document.activeElement === document.body)) head.current?.focus();
  }, [friends.length]);
  return (
    <section aria-labelledby="friends-head" className="mt-[26px] md:mt-[34px]">
      <h2 id="friends-head" ref={head} tabIndex={-1} className={`${SECTION_HEAD} outline-none`}>{f.head(friends.length)}</h2>
      {friends.length === 0 ? (
        <div className="mt-[12px] flex flex-col gap-[6px] rounded-[12px] px-[18px] py-[20px] md:mt-[14px] md:px-[28px] md:py-[26px] [border:1px_dashed_var(--border-strong)]">
          <p className="m-0 font-display text-[16px] font-bold text-[color:var(--fg)] md:text-[17px]">{f.emptyTitle}</p>
          <p className="m-0 max-w-[560px] text-[13px] leading-[1.55] md:text-[13.5px] text-[color:var(--fg-muted)]">{f.emptyBody}</p>
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
              linkable={linkable}
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
  linkable,
}: {
  friend: Friend;
  since: string;
  fresh: boolean;
  removing: boolean;
  onRemove: () => void;
  linkable: boolean;
}) {
  return (
    <li className="relative flex h-[60px] items-center gap-[12px] [border-bottom:1px_solid_var(--border)]" data-friend-row="">
      <Face name={friend.displayName} commander={friend.commander} size={40} />
      <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
        {linkable ? (
          // The whole row is the link: its box is stretched over the row, and the … sits above it.
          <Link
            href={`/friends/${friend.publicId}`}
            {...personAttrs(
              { "aria-label": f.openAria(friend.displayName) },
              "truncate text-[15px] font-medium text-[color:var(--fg)] no-underline outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-[8px] focus-visible:after:[outline:2px_solid_var(--accent)] md:text-[14.5px]",
            )}
          >
            <PersonName n={friend.displayName} />
            <PendingReporter href={`/friends/${friend.publicId}`} />
          </Link>
        ) : (
          <span className="truncate text-[15px] font-medium md:text-[14.5px] text-[color:var(--fg)]"><PersonName n={friend.displayName} /></span>
        )}
        {friend.commander ? <span className="truncate text-[12px] text-[color:var(--fg-muted)]">{friend.commander.name}</span> : null}
      </div>
      {/* PP1: a linked row drops its since date at phone width, so the › and … sit at the right edge. */}
      <span className={`flex-none font-mono text-[10.5px] md:text-[11px] ${linkable ? "hidden md:inline" : ""} ${fresh ? "text-[color:var(--success)]" : "text-[color:var(--fg-faint)]"}`}>
        {f.since(since)}
      </span>
      {linkable ? <span aria-hidden className="flex-none px-[4px] text-[18px] leading-none text-[color:var(--fg-muted)]">›</span> : null}
      <FriendMenu friend={friend} removing={removing} onRemove={onRemove} className="relative z-10" />
    </li>
  );
}

/**
 * A friend's … menu: its one row, Remove friend, turns into the shared delete pane (Keep it first and focused). On
 * the friends list's rows and in a friend page's head (R2 P2), the same control.
 */
export function FriendMenu({
  friend,
  removing,
  onRemove,
  className = "",
}: {
  friend: Pick<Friend, "displayName">;
  removing: boolean;
  onRemove: () => void;
  className?: string;
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
      // While open, the wrapper rises above the rows after it: each row's own z-10 is a stacking context, so the panel's
      // z-30 alone could not escape it and a later row's … would paint over the panel and take its presses.
      <div ref={wrap} className={`relative flex-none ${className}`} style={menu !== "closed" ? { zIndex: 40 } : undefined}>
        <button
          ref={trigger}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={menu !== "closed"}
          onClick={() => setMenu((m) => (m === "closed" ? "menu" : "closed"))}
          {...personAttrs(
            { "aria-label": f.menuAria(friend.displayName) },
            `flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-[8px] border-0 p-0 ${menu !== "closed" ? "bg-[color:var(--elevated)] text-[color:var(--fg)]" : "bg-transparent text-[color:var(--fg-muted)]"}`,
          )}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="19" cy="12" r="1.7" />
          </svg>
        </button>
        {menu !== "closed" ? (
          <MenuPanel label={f.menuAria(friend.displayName)} onDismiss={close}>
            {menu === "menu" ? (
              <button
                type="button"
                onClick={() => setMenu("confirm")}
                className="flex h-[38px] pointer-coarse:h-auto pointer-coarse:min-h-[44px] pointer-coarse:text-[14px] w-full cursor-pointer items-center border-0 bg-transparent px-[13px] text-left font-sans text-[13px] text-[color:var(--danger)] hover:bg-[color:var(--elevated)]"
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
  );
}

function MenuPanel({ label, onDismiss, children }: { label: string | PersonParts; onDismiss: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // A popover with no backdrop: Escape and focus are the dialog hook's, the page keeps its scroll.
  useDialogA11y(ref, onDismiss, { lockScroll: false });
  // It locks no scroll, so it holds moments and the tour off itself while it is up (hold.ts).
  useMomentHold(true);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      style={{ width: DELETE_CONFIRM_WIDTH }}
      {...personAttrs(
        { "aria-label": label },
        "absolute right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-[10px] bg-[color:var(--surface)] shadow-[0_22px_50px_rgba(0,0,0,0.6)] [border:1px_solid_var(--border-strong)]",
      )}
    >
      {children}
    </div>
  );
}
