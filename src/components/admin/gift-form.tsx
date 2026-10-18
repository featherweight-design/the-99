"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { grantCredits } from "../../app/admin/payments/actions";
import { GIFT_NOTE_MAX, GIFT_UNITS_MAX, GIFT_UNITS_MIN, type GiftRefusal, type GiftResult } from "../../lib/admin/gift-rule";
import { adminCopy } from "../../lib/copy/admin";
import { SearchField } from "../ui/text-field";
import { SectionHead } from "./costs-detail";
import { CARD, ERROR, HELP, NumberField, PendingBar } from "./invites-section";

// Grant credits (admin plan A2b, A-R4): built from the admin handoff's own controls, no new layout. The account is
// picked from the group editor's member rows (one at a time, so a radio), the count is the invites top-up's number
// field, and the press is the group editor's pending bar with Undo. A press sends one `actionId`, kept until the grant
// lands, so a double press or a retry after a lost reply writes one lot (`grant_gift`'s `gift:<actionId>`).

const f = adminCopy.payments.form;
export type PickAccount = { id: string; name: string; email: string | null };

const NOTE = "min-h-[44px] w-full min-w-0 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] py-[10px] text-[16px] text-[color:var(--fg)] md:min-h-[38px] [@media(pointer:fine)]:md:text-[14px]";
const SHOWN = 8;

const unitsOf = (text: string): number | null => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null);

export function GiftForm({ accounts, clerkDown }: { accounts: readonly PickAccount[]; clerkDown: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [units, setUnits] = useState("");
  const [note, setNote] = useState("");
  const [inFlight, setInFlight] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // One id per grant: made on the first press, kept across a retry, dropped once the grant lands or the form clears.
  const actionId = useRef<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return accounts.filter((a) => a.name.toLowerCase().includes(q)).slice(0, SHOWN);
  }, [accounts, query]);
  const picked = accounts.find((a) => a.id === accountId) ?? null;
  const rows = picked && !matches.some((m) => m.id === picked.id) ? [picked, ...matches] : matches;

  const n = unitsOf(units);
  const unitsBad = units.trim() !== "" && !(n !== null && n >= GIFT_UNITS_MIN && n <= GIFT_UNITS_MAX);
  const noteBad = note.trim().length > GIFT_NOTE_MAX;
  const ready = picked !== null && n !== null && !unitsBad && note.trim() !== "" && !noteBad;

  function clear() {
    setAccountId(null);
    setUnits("");
    setNote("");
    setQuery("");
    setFailure(null);
    actionId.current = null;
  }

  async function press() {
    if (!ready || !picked || n === null) return;
    actionId.current ??= crypto.randomUUID();
    setFailure(null);
    setDone(null);
    setInFlight(true);
    let result: GiftResult;
    try {
      result = await grantCredits({ accountId: picked.id, units: n, note: note.trim(), actionId: actionId.current });
    } catch {
      // A rejected action may have committed before its reply was lost: the id is kept, so pressing again is safe.
      setInFlight(false);
      setFailure(f.errors.lost);
      router.refresh();
      return;
    }
    setInFlight(false);
    if (!result.ok) {
      setFailure(f.errors[result.error as GiftRefusal]);
      return;
    }
    setDone(f.done(n, picked.name));
    clear();
  }

  return (
    <section aria-labelledby="gift-head" className="flex flex-col gap-[10px]">
      <SectionHead title={f.head} id="gift-head" />
      <div data-testid="gift-form" className={CARD}>
        <div className="flex flex-col gap-[6px]">
          <span className="text-[13px] font-semibold text-[color:var(--fg)]">{f.account}</span>
          <SearchField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            placeholder={f.find}
            aria-label={f.find}
            autoComplete="off"
            disabled={inFlight}
            containerClassName="h-[44px] rounded-[9px] px-[12px] py-0 md:h-[38px]"
            className="text-[16px] [@media(pointer:fine)]:md:text-[14px]"
          />
          <span className={HELP}>{clerkDown ? f.clerkDown : f.accountHelp}</span>
          {query.trim() && matches.length === 0 && <span className={HELP}>{f.noMatch}</span>}
          {rows.length > 0 && (
            <div role="radiogroup" aria-label={f.account} className="overflow-hidden rounded-[10px] border border-solid border-[color:var(--border)]">
              {rows.map((a) => {
                const on = a.id === accountId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-account={a.id}
                    disabled={inFlight}
                    onClick={() => {
                      setAccountId(a.id);
                      setDone(null);
                      actionId.current = null;
                    }}
                    className={`flex w-full min-h-[52px] items-center gap-[12px] border-0 border-t border-solid border-[color:var(--border)] px-[14px] py-[8px] text-left first:border-t-0 md:min-h-[44px] md:px-[16px] ${
                      on ? "bg-[color:var(--surface-raised)]" : "bg-transparent"
                    }`}
                  >
                    <span aria-hidden className={`h-[16px] w-[16px] flex-none rounded-full border-2 border-solid ${on ? "border-[color:var(--accent)] bg-[color:var(--accent)]" : "border-[color:var(--border-dashed)]"}`} />
                    <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-[8px]">
                      <span className="text-[14px] font-medium text-[color:var(--fg)] [overflow-wrap:anywhere]">{a.name}</span>
                      {a.email && a.email !== a.name && (
                        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)]">{a.email}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <NumberField
          label={f.units}
          help={f.unitsHelp(GIFT_UNITS_MAX)}
          value={units}
          onChange={(v) => {
            setUnits(v);
            setDone(null);
            actionId.current = null;
          }}
          invalid={unitsBad}
          disabled={inFlight}
          edited={units.trim() !== ""}
        />
        {unitsBad && <p role="alert" className={ERROR}>{f.errors.units}</p>}
        <label className="flex min-w-0 flex-col gap-[6px]">
          <span className="text-[13px] font-semibold text-[color:var(--fg)]">{f.note}</span>
          <input
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setDone(null);
              actionId.current = null;
            }}
            autoComplete="off"
            maxLength={GIFT_NOTE_MAX}
            disabled={inFlight}
            aria-invalid={noteBad ? true : undefined}
            className={NOTE}
          />
          <span className={HELP}>{f.noteHelp}</span>
        </label>
        {done && <p role="status" className="m-0 text-[13px] text-[color:var(--success)]">{done}</p>}
      </div>
      {(ready || failure) && picked && n !== null && (
        <PendingBar
          testId="gift-pending"
          sentence={f.pending(n, picked.name)}
          failure={failure}
          press={f.press}
          onUndo={clear}
          onPress={press}
          inFlight={inFlight}
          pressDisabled={!ready}
        />
      )}
    </section>
  );
}
