"use client";
// The pod card's last row (Rule 0 plan §PR 6; boards `R1 - Entry-Phone` E1, E2 and `R1 - Entry-Desktop` F1, F2).
// With no open table it is `Rule 0 check`, which opens setup (PR 5's sheet) for this pod; with one, `Tonight's table`,
// a link to it with its faces and closing time. Absent with the switch off: the card renders no row (E4).
//
// The strip draws at most four faces (the boards draw four): the count is in the line under the title, and more
// faces would take the column the closing time needs at 390.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadPodSetupAction, setTableAction } from "../../app/friends/table/setup-actions";
import { leaveDialogsForNavigation } from "../../lib/a11y/dialog";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import type { OpenTable } from "../../lib/social/rule-zero";
import { closesWhen } from "../../lib/social/when";
import { PendingReporter } from "../shell/pending-reporter";
import { Face } from "../social/face";
import { useFriendInvite } from "../social/invite-context";
import { useHydrated } from "../ui/hydrated-art";
import { SetupSheet, type SetupData } from "./setup-sheet";
import { TableGlyph } from "./table-glyph";

const copy = ruleZeroCopy.entry;
const FACES_MAX = 4;

const ROW =
  "relative mb-[4px] mr-[10px] mt-[4px] flex min-h-[52px] w-[calc(100%-10px)] cursor-pointer items-center gap-[12px] rounded-[10px] bg-[color-mix(in_srgb,var(--surface-sunken)_80%,transparent)] py-[6px] pl-[12px] pr-[6px] text-left font-sans text-[color:var(--fg)] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] md:mr-[12px] md:w-[calc(100%-12px)]";

export function PodRuleZeroRow({ podId, table, now }: { podId: string; table: OpenTable | null; now: Date }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const invite = useFriendInvite();
  const [open, setOpen] = useState<{ setup: SetupData; invites: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  if (table) {
    const closes = closesWhen(table.closesAt, now, hydrated ? undefined : "UTC");
    return (
      <Link href={`/friends/table/${table.tableId}`} data-testid="pod-rule-zero" className={`${ROW} [border:1px_solid_var(--accent)]`}>
        <Icon />
        <Text title={copy.open} sub={copy.openSub(table.seats.length, closes)} />
        <span aria-hidden className="flex flex-none">
          {table.seats.slice(0, FACES_MAX).map((s, i) => (
            <Face
              key={i}
              name={s.displayName}
              commander={s.commander}
              size={24}
              className="-ml-[6px] [border:1.5px_solid_var(--bg)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--fg)_12%,transparent)]"
            />
          ))}
        </span>
        <Chevron />
        <PendingReporter href={`/friends/table/${table.tableId}`} />
      </Link>
    );
  }

  async function press() {
    if (busy) return;
    setBusy(true);
    try {
      const out = await loadPodSetupAction(podId);
      // Null when the switch went off or the reader left the pod: the page's next draw says which.
      if (out) setOpen(out);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" data-testid="pod-rule-zero" aria-busy={busy || undefined} onClick={() => void press()} className={`${ROW} [border:1px_solid_var(--border-strong)]`}>
        <Icon />
        <Text title={copy.row} sub={copy.rowSub} />
        <Chevron />
      </button>
      {open ? (
        <SetupSheet
          setup={open.setup}
          onClose={() => setOpen(null)}
          onSave={(seats) => setTableAction(podId, seats)}
          onDone={(tableId) => {
            // The sheet's history entry stays under the new route: released by a close, its Back would cancel the push.
            leaveDialogsForNavigation();
            setOpen(null);
            router.push(`/friends/table/${tableId}`);
          }}
          // On /friends, Invite someone new opens over setup, in place: setup is kept to come back to.
          onInvite={open.invites && invite?.inviteNew ? () => invite.inviteNew?.(document.activeElement as HTMLElement | null) : undefined}
        />
      ) : null}
    </>
  );
}

function Icon() {
  return (
    <span aria-hidden className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-[color:var(--accent-text)]">
      <TableGlyph size={18} />
    </span>
  );
}

function Text({ title, sub }: { title: string; sub: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
      <b className="text-[14px] font-semibold">{title}</b>
      <span className="truncate whitespace-nowrap font-mono text-[10.5px] text-[color:var(--fg-faint)]">{sub}</span>
    </span>
  );
}

function Chevron() {
  return (
    <span aria-hidden className="flex w-[28px] flex-none items-center justify-start text-[color:var(--fg-faint)]">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M5 2.5 9.5 7 5 11.5" />
      </svg>
    </span>
  );
}
