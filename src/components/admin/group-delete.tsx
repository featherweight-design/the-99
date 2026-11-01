"use client";

// Delete a group (small items 9, item 7; `Groups-Delete` D1 to D6c): the group page's foot, under History across a
// hairline. A text press in `--danger`, 44 tall on the phone and 32 from `md`, as Rule 0's Close the table, with the
// rule under it. A group with members or a live flyer code keeps the press, dimmed and inert, and the line says why in
// place. The confirm is the shared `ConfirmFrame`, danger tone, no note. A delete the server refuses (someone joined,
// or a code was made, since the page was drawn) says so in the dialog and refreshes the page into the refused state.
// A delete that lands goes to Groups, which shows the toast (`DeletedGroupToast`).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { deleteGroup } from "../../app/admin/groups/actions";
import type { GroupDeleteResult } from "../../lib/admin/group-writes";
import { deleteConfirm, deleteLine, deleteState, type GroupCard, type GroupCode } from "../../lib/admin/groups-rule";
import { adminCopy } from "../../lib/copy/admin";
import { ConfirmFrame } from "./confirm-frame";

const copy = adminCopy.groups.delete;

/** Where a landed delete goes: Groups, carrying the name for the toast. */
export const deletedHref = (name: string) => `/admin/groups?deleted=${encodeURIComponent(name)}`;

/** The dialog's line for a refused or failed delete. Null for a delete that landed. */
export function deleteFailure(result: GroupDeleteResult | "lost", name: string): string | null {
  if (result === "lost") return copy.lost;
  if (result.ok) return null;
  if (result.error === "not_empty") return copy.raced(name);
  if (result.error === "group") return adminCopy.groups.errors.group;
  return copy.failed;
}

export function GroupDelete({
  id,
  name,
  members,
  codes,
  overrides,
  remove = deleteGroup,
}: {
  id: string;
  name: string;
  /** The saved member count: an unselect not yet saved still counts. */
  members: number;
  codes: readonly GroupCode[];
  overrides: GroupCard["overrides"];
  /** The action, injectable for the component test. */
  remove?: (id: string) => Promise<GroupDeleteResult>;
}) {
  const router = useRouter();
  const lineId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const state = deleteState(members, codes);
  const line = deleteLine(state);
  const confirm = deleteConfirm(name, overrides, codes);

  const press = () => {
    if (line.refused) return;
    setFailure(null);
    setOpen(true);
  };
  const run = async () => {
    setPending(true);
    setFailure(null);
    let result: GroupDeleteResult | "lost";
    try {
      result = await remove(id);
    } catch {
      result = "lost";
    }
    if (result !== "lost" && result.ok) {
      router.push(deletedHref(result.name));
      return;
    }
    setPending(false);
    setFailure(deleteFailure(result, name));
    // Someone joined or a code was made since the page was drawn: the page redraws into the refused state.
    if (result !== "lost" && result.error === "not_empty") startTransition(() => router.refresh());
  };

  return (
    <div data-testid="group-delete">
      <div aria-hidden className="mt-[2px] h-px bg-[color:var(--border)]" />
      <div className="mt-[14px] flex flex-col items-start gap-[6px] px-[14px] py-[12px]">
        <button
          type="button"
          onClick={press}
          aria-disabled={line.refused || undefined}
          aria-describedby={lineId}
          className="inline-flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent p-0 font-sans text-[14px] font-medium text-[color:var(--danger)] aria-disabled:cursor-default aria-disabled:opacity-45 md:min-h-[32px]"
        >
          {copy.action}
        </button>
        <span
          id={lineId}
          data-refused={line.refused ? "" : undefined}
          className={
            line.refused
              ? "max-w-[560px] text-pretty text-[13px] leading-[1.55] text-[color:var(--fg-body)]"
              : "text-[12.5px] leading-[1.5] text-[color:var(--fg-faint)]"
          }
        >
          {line.text}
        </span>
        {line.codesLink && (
          <Link href="/admin/invites#flyer-codes" className="inline-flex min-h-[44px] items-center text-[13px] text-[color:var(--accent-text)] md:min-h-[32px]">
            {copy.codesLink}
          </Link>
        )}
      </div>
      {open && (
        <ConfirmFrame
          title={confirm.title}
          lead={confirm.lead}
          facts={confirm.facts}
          cancelLabel={copy.keep}
          confirmLabel={copy.confirm}
          tone="danger"
          pending={pending}
          onCancel={() => {
            setOpen(false);
            setFailure(null);
          }}
          onConfirm={() => void run()}
        >
          {failure && (
            <p role="alert" className="m-0 text-[13px] text-[color:var(--danger)]">
              {failure}
            </p>
          )}
        </ConfirmFrame>
      )}
    </div>
  );
}
