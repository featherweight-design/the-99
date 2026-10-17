"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { revokeInvite, setAccountInvites, topUpGroup } from "../../app/admin/invites/actions";
import { fmtDay, invitedByName, setDraft, topUpDraft, type AccountInvites, type TopUpMember } from "../../lib/admin/invites-rule";
import { adminCopy } from "../../lib/copy/admin";
import { PendingReporter } from "../shell/pending-reporter";
import { SectionHead } from "./costs-detail";
import { HistoryList } from "./switch-page";

// Invites in the admin (plan `2026-10-16-invites.md`, PR 6; handoff Admin-Desktop and Admin-Phone M2, M3): an
// account's Invites section (the field SETS what it has left; who invited it, whom it invited, each invite still
// waiting with Revoke, its history) and a group's Top up invites (raises members below N, lowers nobody). Both
// borrow the group editor's controls: a numeric field with its help line, and the pending bar with Undo and Save.

const inv = adminCopy.invites;
const CARD = "flex flex-col gap-[10px] md:gap-[12px] rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[14px] py-[14px] md:px-[20px] md:py-[18px]";
const FIELD =
  "h-[44px] w-full min-w-0 rounded-[8px] border border-solid bg-[color:var(--surface-sunken)] px-[12px] font-mono text-[16px] text-[color:var(--fg)] md:h-[38px] md:w-[120px] md:text-[14px]";
const HELP = "text-pretty text-[12px] leading-[1.5] text-[color:var(--fg-faint)]";
const ERROR = "m-0 text-[12.5px] leading-[1.5] text-[color:var(--danger)]";
const LINE = "flex min-h-[44px] items-center gap-[10px] border-0 border-t border-solid border-[color:var(--border)] py-[6px] text-[13px] text-[color:var(--fg-body)] md:min-h-[40px] md:text-[13.5px]";
// Dates are desktop only (the phone frames draw none).
const META = "hidden font-mono text-[11px] text-[color:var(--fg-faint)] md:inline";
const FACE = "flex h-[26px] w-[26px] flex-none items-center justify-center overflow-hidden rounded-[7px] md:h-[28px] md:w-[28px]";
const TEXT_BUTTON = "inline-flex min-h-[44px] md:min-h-[32px] items-center border-0 bg-transparent px-[4px] text-[13px] font-medium text-[color:var(--accent)] disabled:opacity-60";

/** The numeric field, its label and its help line, as the group editor draws a field. */
function NumberField({ label, help, helpPhone, value, onChange, invalid, disabled, edited }: { label: string; help: string; helpPhone?: string; value: string; onChange: (v: string) => void; invalid: boolean; disabled: boolean; edited: boolean }) {
  return (
    <label className="flex min-w-0 flex-col gap-[6px]">
      <span className="text-[13px] font-semibold text-[color:var(--fg)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        className={`${FIELD} ${edited ? "border-[color:var(--accent)]" : "border-[color:var(--border-strong)]"}`}
      />
      {helpPhone ? (
        <>
          <span className={`${HELP} md:hidden`}>{helpPhone}</span>
          <span className={`${HELP} hidden md:inline`}>{help}</span>
        </>
      ) : (
        <span className={HELP}>{help}</span>
      )}
    </label>
  );
}

/** The group editor's pending bar: what the press will do, then Undo and the press. */
function PendingBar({ testId, sentence, failure, press, onUndo, onPress, inFlight, pressDisabled = false }: {
  testId: string;
  sentence: string;
  failure: string | null;
  press: string;
  onUndo: () => void;
  onPress: () => void;
  inFlight: boolean;
  pressDisabled?: boolean;
}) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-stretch gap-[14px] rounded-[12px] border border-solid border-[color:var(--accent)] bg-[color:var(--surface-raised)] p-[14px] md:flex-row md:items-center md:px-[16px]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <span className="text-pretty text-[13px] leading-[1.55] text-[color:var(--fg-body)]">{sentence}</span>
        {failure && (
          <p role="alert" className={ERROR}>
            {failure}
          </p>
        )}
      </div>
      <div className="flex flex-none justify-end gap-[10px]">
        <button
          type="button"
          onClick={onUndo}
          disabled={inFlight}
          className="h-[46px] flex-1 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[18px] text-[14px] text-[color:var(--fg)] disabled:opacity-60 md:h-[40px] md:flex-none"
        >
          {adminCopy.groups.undo}
        </button>
        <button
          type="button"
          onClick={onPress}
          disabled={inFlight || pressDisabled}
          className="h-[46px] flex-1 whitespace-nowrap rounded-[10px] bg-[color:var(--fg)] px-[20px] text-[14px] font-semibold text-[color:var(--bg)] disabled:opacity-60 md:h-[40px] md:flex-none md:rounded-[8px]"
        >
          {press}
        </button>
      </div>
    </div>
  );
}

function WhoLine({ initials, children, action }: { initials: string | null; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={LINE}>
      {initials === null ? (
        <span aria-hidden className={`${FACE} border-[1.5px] border-dashed border-[color:var(--border-dashed)]`} />
      ) : (
        <span aria-hidden className={`${FACE} border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] font-mono text-[11px] text-[color:var(--fg-muted)]`}>
          {initials}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-[10px] [overflow-wrap:anywhere]">{children}</span>
      {action && <span className="ml-auto flex-none">{action}</span>}
    </div>
  );
}

const initialsOf = (name: string) => name.trim()[0]?.toLocaleUpperCase("en-US") ?? "?";
const strong = (text: string) => <b className="font-medium text-[color:var(--fg)]">{text}</b>;

/** M2: one account's Invites section. Keyed by its caller on the saved left, so a save starts it afresh. */
export function AccountInvitesSection({ accountId, name, invites }: { accountId: string; name: string; invites: AccountInvites }) {
  const router = useRouter();
  const [draft, setDraftText] = useState(String(invites.left));
  const [inFlight, setInFlight] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeFailure, setRevokeFailure] = useState<string | null>(null);
  const state = setDraft(draft, invites.left);

  async function save() {
    if (state.kind !== "pending") return;
    setFailure(null);
    setInFlight(true);
    try {
      const result = await setAccountInvites(accountId, draft);
      setInFlight(false);
      if (result.ok) router.refresh();
      else setFailure(inv.invalid);
    } catch {
      // A lost reply may follow a commit: refresh to reconcile and say the outcome is unknown.
      setInFlight(false);
      setFailure(adminCopy.groups.errors.unknown);
      router.refresh();
    }
  }

  async function revoke(id: string) {
    setRevokeFailure(null);
    setRevoking(id);
    try {
      await revokeInvite(id);
    } catch {
      setRevokeFailure(adminCopy.groups.errors.unknown);
    }
    setRevoking(null);
    router.refresh();
  }

  const by = invites.invitedBy;
  const headId = useId();
  return (
    <>
      <SectionHead title={inv.section} id={headId} />
      <section data-testid="account-invites" aria-labelledby={headId} className={CARD}>
        <NumberField label={inv.field} help={inv.fieldHelp(name)} value={draft} onChange={(v) => { setDraftText(v); setFailure(null); }} invalid={state.kind === "invalid"} disabled={inFlight} edited={draft !== String(invites.left)} />
        {state.kind === "invalid" && (
          <p role="alert" className={ERROR}>
            {inv.invalid}
          </p>
        )}
        {state.kind === "pending" && (
          <PendingBar
            testId="account-invites-pending"
            sentence={inv.pendingSet(name, invites.left, state.to, invites.waiting)}
            failure={failure}
            press={adminCopy.accounts.save}
            onUndo={() => { setDraftText(String(invites.left)); setFailure(null); }}
            onPress={save}
            inFlight={inFlight}
          />
        )}
        {/* A founder has no inviter, and the frames draw no row for one. */}
        {by.kind !== "founder" && (
          <div data-testid="account-invited-by-line">
            <WhoLine initials={by.kind === "account" ? initialsOf(by.name) : null}>
              <span>
                {inv.invitedBy} {strong(invitedByName(by))}
              </span>
              <span className={META}>{inv.joined(fmtDay(by.joinedAt))}</span>
            </WhoLine>
          </div>
        )}
        {invites.invited.map((e, i) => {
          const href = e.id === null ? null : `/admin/accounts/${encodeURIComponent(e.id)}`;
          return (
            <div key={`${e.id ?? "deleted"}-${i}`} data-invited={e.id ?? "deleted"}>
              <WhoLine
                initials={e.id === null ? null : initialsOf(e.name)}
                action={
                  href && (
                    <Link href={href} className={`${TEXT_BUTTON} no-underline`}>
                      {inv.open}
                      <PendingReporter href={href} />
                    </Link>
                  )
                }
              >
                <span>
                  {inv.invited} {strong(e.name)}
                </span>
                <span className={META}>{inv.joined(e.joined)}</span>
              </WhoLine>
            </div>
          );
        })}
        {invites.waitingLines.map((w) => (
          <div key={w.id} data-waiting={w.id}>
            <WhoLine
              initials={null}
              action={
                <button type="button" onClick={() => revoke(w.id)} disabled={revoking !== null} className={TEXT_BUTTON}>
                  {inv.revoke}
                </button>
              }
            >
              <span className="md:hidden">
                {inv.waitingPhone}
                {w.email}
              </span>
              <span className="hidden md:inline">
                {inv.waiting(w.how, "")}
                {strong(w.email)}
              </span>
              <span className={META}>{inv.sentReturns(w.sent, w.returns)}</span>
            </WhoLine>
          </div>
        ))}
        {revokeFailure && (
          <p role="alert" className={ERROR}>
            {revokeFailure}
          </p>
        )}
      </section>
      <SectionHead
        title={adminCopy.groups.historyHead}
        meta={invites.historyCut ? adminCopy.switch.historyLatest(invites.history.length) : adminCopy.switch.historyCount(invites.history.length)}
      />
      <HistoryList items={invites.history} foot={adminCopy.groups.historyFoot} empty={adminCopy.groups.noHistory} testId="account-invites-history" />
    </>
  );
}

/** M3: a group's Top up invites. The field clears once a top-up lands. */
export function GroupTopUp({ groupId, members }: { groupId: string; members: readonly TopUpMember[] }) {
  const router = useRouter();
  const [draft, setDraftText] = useState("");
  const [inFlight, setInFlight] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const state = topUpDraft(draft, members);
  const headId = useId();

  async function topUp() {
    if (state.kind !== "pending") return;
    setFailure(null);
    setInFlight(true);
    try {
      const result = await topUpGroup(groupId, draft);
      setInFlight(false);
      if (result.ok) {
        setDraftText("");
        router.refresh();
      } else setFailure(result.reason === "invalid" ? inv.invalid : adminCopy.switch.saveFailed);
    } catch {
      setInFlight(false);
      setFailure(adminCopy.groups.errors.unknown);
      router.refresh();
    }
  }

  return (
    <>
      <SectionHead title={inv.groupSection} id={headId} />
      <section data-testid="group-top-up" aria-labelledby={headId} className={CARD}>
        <NumberField label={inv.groupField} help={inv.groupHelp} helpPhone={inv.groupHelpPhone} value={draft} onChange={(v) => { setDraftText(v); setFailure(null); }} invalid={state.kind === "invalid"} disabled={inFlight} edited={draft !== ""} />
        {state.kind === "invalid" && (
          <p role="alert" className={ERROR}>
            {inv.invalid}
          </p>
        )}
        {state.kind === "pending" && (
          <PendingBar
            testId="group-top-up-pending"
            sentence={state.sentence}
            failure={failure}
            press={inv.topUp}
            onUndo={() => { setDraftText(""); setFailure(null); }}
            onPress={topUp}
            inFlight={inFlight}
            pressDisabled={state.raised.length === 0}
          />
        )}
      </section>
    </>
  );
}
