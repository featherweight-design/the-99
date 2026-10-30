"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { makeCode } from "../../app/admin/invites/flyer-actions";
import { adminCopy, flyerAdminCopy } from "../../lib/copy/admin";
import { flyerGroupName, parseStore } from "../../lib/flyer/admin-rule";

// The New flyer code form (flyer trial PR 4b; handoff Admin-Desktop A2, Admin-Phone P2): opens in place under the
// section head. Store (Hugh's own label), Group (a new group named from the store, or any existing one), the fixed
// facts as chips, and Make code. A failure is the smallest existing admin error line (`role="alert"`), the form kept.

const copy = flyerAdminCopy;
const FIELD =
  "h-[40px] w-full rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] text-[16px] text-[color:var(--fg)] focus:border-[color:var(--accent)] focus:outline-none [@media(pointer:fine)]:text-[14px]";
const LABEL = "text-[13px] font-semibold text-[color:var(--fg)] md:leading-[17px]";
const HELP = "text-[12px] leading-[1.5] text-[color:var(--fg-muted)]";
const BUTTON = "flex h-[44px] items-center justify-center whitespace-nowrap rounded-[10px] px-[16px] text-[14px] md:h-[32px] md:rounded-[8px] md:px-[14px] md:text-[12.5px]";

type MakeError = Extract<Awaited<ReturnType<typeof makeCode>>, { ok: false }>["error"];
// Only "failed" may have saved (a lost reply, a throw); a refusal wrote nothing, so it says so with the smallest existing lines.
const ERROR_LINE: Record<MakeError, string> = {
  failed: adminCopy.groups.errors.unknown,
  group: adminCopy.groups.errors.group,
  store: adminCopy.switch.refusal,
  off: adminCopy.switch.refusal,
};

export type FlyerGroupChoice = { id: string; name: string };

export function FlyerNewForm({ groups, onClose }: { groups: readonly FlyerGroupChoice[]; onClose: () => void }) {
  const router = useRouter();
  const id = useId();
  const [store, setStore] = useState("");
  const [group, setGroup] = useState("");
  const [failed, setFailed] = useState<MakeError | null>(null);
  const [pending, start] = useTransition();
  // The server's own rule: a label that is empty, too long or names no group is not a store.
  const label = parseStore(store);
  const ready = label !== null;
  const newName = (label !== null && flyerGroupName(label)) || "…";

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready || pending) return;
    setFailed(null);
    start(async () => {
      try {
        const result = await makeCode(store, group === "" ? null : group);
        if (result.ok) {
          onClose();
          router.refresh();
        } else setFailed(result.error);
      } catch {
        // A lost reply may follow a commit: refresh to reconcile, keep what was typed.
        setFailed("failed");
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      data-testid="flyer-new-form"
      className="flex flex-col gap-[14px] rounded-[12px] border border-solid border-[color:var(--accent-shadow)] bg-[color:var(--surface)] p-[16px]"
    >
      <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
        <div className="flex flex-col gap-[6px]">
          <label htmlFor={`${id}-store`} className={LABEL}>{copy.store}</label>
          <input
            id={`${id}-store`}
            name="store"
            value={store}
            onChange={(e) => setStore(e.target.value)}
            maxLength={60}
            autoComplete="off"
            autoFocus
            aria-describedby={`${id}-store-help`}
            className={FIELD}
          />
          <small id={`${id}-store-help`} className={HELP}>{copy.storeHelp}</small>
        </div>
        <div className="flex flex-col gap-[6px]">
          <label htmlFor={`${id}-group`} className={LABEL}>{copy.group}</label>
          <div className="relative">
            <select
              id={`${id}-group`}
              name="group"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              aria-describedby={`${id}-group-help`}
              className={`${FIELD} appearance-none pr-[32px]`}
            >
              <option value="">{copy.groupNew(newName)}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <i aria-hidden className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 not-italic text-[color:var(--fg-faint)]">▾</i>
          </div>
          <small id={`${id}-group-help`} className={HELP}>{copy.groupHelp}</small>
        </div>
      </div>
      <ul role="list" className="m-0 flex list-none flex-wrap gap-[6px] p-0">
        {copy.facts.map((f) => (
          <li key={f} className="inline-flex h-[26px] items-center rounded-full border border-solid border-[color:var(--border-strong)] px-[9px] font-mono text-[11px] text-[color:var(--fg-body)]">
            {f}
          </li>
        ))}
      </ul>
      {failed !== null && (
        <p role="alert" className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--danger)]">
          {ERROR_LINE[failed]}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-[10px]">
        <small className="basis-full font-mono text-[11px] text-[color:var(--fg-faint)] md:flex-1 md:basis-0 md:leading-[14px]">{copy.spends}</small>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className={`${BUTTON} flex-1 border border-solid border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg)] disabled:opacity-60 md:flex-none`}
        >
          {copy.cancel}
        </button>
        <button
          type="submit"
          disabled={!ready || pending}
          className={`${BUTTON} flex-1 border-0 bg-[color:var(--fg)] font-medium text-[color:var(--bg)] disabled:opacity-60 md:flex-none`}
        >
          {copy.make}
        </button>
      </div>
    </form>
  );
}
