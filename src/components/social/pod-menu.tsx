"use client";
// A pod's `…` menu (Social R1 PR E2; design table `social-r1-pods.md` §3b, §6, §8). Everyone sees it: the owner's
// rows are Rename, Leave pod and Delete pod, a member's is Leave pod alone. Leave and Delete swap the menu for the
// shared `DeleteConfirm` pane in the same place, Keep focused first. Rename hands back to the card, which draws its
// field in place of the header (§7).
//
// The panel sits under the trigger inside the card, which does not clip (the wash clips itself), so it opens over
// the seats and the cards below. The writes are the pane's: this only asks and waits.

import { useEffect, useId, useRef, useState } from "react";
import type { Pod } from "../../lib/social/access";
import { socialCopy } from "../../lib/copy/social";
import { folderCopy } from "../../lib/copy/folders";
import { DeleteConfirm } from "../ui/delete-confirm";

const copy = socialCopy.pods;

type Row = "rename" | "leave" | "del";
type Mode = "menu" | "leave" | "del";

/** What Leave says, by who is leaving (§8): the last member deletes it, an owner hands it on, a member asks back. */
export function leaveText(pod: Pod): { body: string; confirm: string } {
  if (pod.members.length <= 1) return { body: copy.leaveLastBody, confirm: copy.leaveLastConfirm };
  if (pod.isOwner && pod.nextOwner) return { body: copy.leaveOwnerBody(pod.nextOwner.displayName), confirm: copy.leaveConfirm };
  const owner = pod.members.find((m) => m.isOwner);
  const name = owner?.displayName ?? "";
  return { body: owner?.isFriend ? copy.leaveMemberBody(name) : copy.leaveMemberStrangerBody(name), confirm: copy.leaveConfirm };
}

export function PodMenu({
  pod,
  onRename,
  onLeave,
  onDelete,
  leaveHeld = false,
  triggerRef,
}: {
  pod: Pod;
  /** Leave is held (`aria-disabled`) until the redraw names the heir again. */
  leaveHeld?: boolean;
  onRename: () => void;
  /** Resolves true when the pod is gone for this reader (the card then leaves), false when the write failed. */
  onLeave: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const ownTrigger = useRef<HTMLButtonElement>(null);
  const trigger = triggerRef ?? ownTrigger;
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const panelId = useId();
  const rows: Row[] = pod.isOwner ? ["rename", "leave", "del"] : ["leave"];

  function close(refocus = true) {
    // A write in flight lands either way, so nothing may hide its pane while it is waiting.
    if (pending) return;
    setOpen(false);
    setMode("menu");
    if (refocus) trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  });

  // The menu lands on its active row each time it is drawn: on opening, and on Keep from a confirm.
  useEffect(() => {
    if (open && mode === "menu") items.current[active]?.focus();
    // `active` is not a dependency: moving between rows focuses them itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  function move(to: number) {
    const next = (to + rows.length) % rows.length;
    setActive(next);
    items.current[next]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const to =
      e.key === "ArrowDown" ? active + 1 : e.key === "ArrowUp" ? active - 1 : e.key === "Home" ? 0 : e.key === "End" ? rows.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    move(to);
  }

  function choose(row: Row) {
    if (row === "rename") {
      setOpen(false);
      setMode("menu");
      onRename();
    } else setMode(row);
  }

  async function confirm() {
    if (pending) return;
    setPending(true);
    const gone = await (mode === "del" ? onDelete() : onLeave()).catch(() => false);
    setPending(false);
    // Gone: the card is about to leave with this menu in it, so there is nothing to put back.
    if (gone) {
      setOpen(false);
      setMode("menu");
    }
  }

  const label: Record<Row, string> = { rename: copy.rename, leave: copy.leave, del: copy.del };
  const leave = leaveText(pod);
  const heading = mode === "del" ? copy.delHeading(pod.name) : copy.leaveHeading(pod.name);
  const PANEL =
    "absolute right-0 top-[46px] z-[5] w-[248px] overflow-hidden rounded-[10px] bg-[color:var(--surface)] shadow-[0_22px_50px_rgba(0,0,0,0.6)] [border:1px_solid_var(--border-strong)]";

  return (
    // Positioned, so the panel follows the trigger when a long name wraps it onto a later header line.
    <div
      ref={root}
      className="relative ml-auto flex-none md:flex-initial"
      // Tabbing out closes it, so a keyboard reader never leaves one menu open while opening the next. Only a blur
      // that names where focus went: Safari gives a pressed row's blur none, and a pointer outside is `onDown`'s.
      onBlur={(e) => {
        const to = e.relatedTarget as Node | null;
        if (open && to && !root.current?.contains(to)) close(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={copy.menuAria(pod.name)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (open) return close();
          setActive(0);
          setOpen(true);
        }}
        className={`flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-[8px] border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] ${
          open ? "bg-[color:var(--elevated)] text-[color:var(--fg)]" : "bg-transparent text-[color:var(--fg-muted)]"
        }`}
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>
      {open && mode === "menu" ? (
        <div id={panelId} role="menu" aria-label={copy.menuAria(pod.name)} className={PANEL} data-testid="pod-menu">
          {rows.map((row, i) => (
            <button
              key={row}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitem"
              aria-disabled={(row === "leave" && leaveHeld) || undefined}
              tabIndex={active === i ? 0 : -1}
              onFocus={() => setActive(i)}
              onKeyDown={onKeyDown}
              onClick={() => {
                // Safari does not focus a clicked button, so the row is recorded here for Keep to return to.
                setActive(i);
                if (row === "leave" && leaveHeld) return;
                choose(row);
              }}
              className={`flex h-[44px] w-full cursor-pointer items-center border-0 bg-transparent px-[13px] text-left font-sans text-[14px] aria-disabled:cursor-default aria-disabled:opacity-50 md:h-[38px] md:text-[13px] ${
                i === 0 ? "" : "[border-top:1px_solid_var(--elevated)]"
              } ${row === "del" ? "text-[color:var(--danger)]" : "text-[color:var(--fg)]"}`}
            >
              {label[row]}
            </button>
          ))}
        </div>
      ) : null}
      {open && mode !== "menu" ? (
        <div id={panelId} role="dialog" aria-label={heading} className={PANEL} data-testid="pod-confirm">
          <DeleteConfirm
            heading={heading}
            body={mode === "del" ? copy.delBody : leave.body}
            cancelLabel={folderCopy.del.cancel}
            confirmLabel={mode === "del" ? copy.delConfirm : leave.confirm}
            pending={pending}
            error={null}
            phoneTall
            onCancel={() => setMode("menu")}
            onConfirm={() => void confirm()}
          />
        </div>
      ) : null}
    </div>
  );
}
