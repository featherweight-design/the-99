"use client";

// The landing's launch panel, invite-only state (public landing PR 4a, `Launch-List.dc.html`): one email field and
// `Tell me at launch`. The states are entry, sending, sent, not an email, and throttled. A visitor who left their address in
// the hero sees the same `sent` card in the close, so the list's answer is shared between the two panels (`LaunchListProvider`)
// while each keeps its own field.
//
// The save is a server action the ROOT PAGE hands in as a prop (`app/landing-entry.tsx`): this directory is walked as public
// surface (`check:public-reads`), which forbids importing an action. `Already on the list` answers exactly as `sent` does
// (the action returns the same `ok`), so the page never says whether an address is listed. A refusal of the field is the
// shipped line; a transport failure keeps the field as typed.

import { createContext, useContext, useId, useState, type FormEvent, type ReactNode } from "react";
import { landingCopy } from "../../lib/copy/landing";
import { looksLikeEmail } from "../../lib/public/email-shape";

const c = landingCopy.launch;

/** What the action answers: saved (or already listed), or the field's refusal, or too many tries. */
export type LaunchAction = (email: string) => Promise<{ ok: true } | { ok: false; reason: "invalid" | "throttled" }>;

type Shared = { action: LaunchAction; listed: string | null; setListed: (email: string) => void };
const Launch = createContext<Shared | null>(null);

export function LaunchListProvider({ action, children }: { action: LaunchAction; children: ReactNode }) {
  const [listed, setListed] = useState<string | null>(null);
  return <Launch.Provider value={{ action, listed, setListed }}>{children}</Launch.Provider>;
}

const CHECK = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
  </svg>
);

export function LaunchPanel() {
  const shared = useContext(Launch);
  const id = useId();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  if (!shared) throw new Error("LaunchPanel needs a LaunchListProvider");
  const { action, listed, setListed } = shared;

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (busy) return;
    // Checked before sending: the page says so itself, in the shipped words.
    if (!looksLikeEmail(email)) {
      setLine(c.notAnEmail);
      return;
    }
    setLine(null);
    setBusy(true);
    try {
      const r = await action(email);
      if (r.ok) setListed(email.trim().toLowerCase());
      else setLine(r.reason === "throttled" ? c.throttled : c.notAnEmail);
    } catch {
      setLine(c.failed);
    } finally {
      setBusy(false);
    }
  }

  const frame = "mt-[24px] rounded-[16px] border border-solid border-[color:color-mix(in_oklab,var(--accent)_55%,var(--border-strong))] bg-[color:var(--surface-raised)] p-[18px] shadow-[0_14px_36px_rgba(0,0,0,.35)] md:px-[24px] md:py-[22px]";

  if (listed) {
    return (
      <div role="status" aria-label={c.regionLabel} data-testid="launch-sent" className={`${frame} flex items-start gap-[12px]`}>
        <span className="flex h-[28px] w-[28px] flex-none items-center justify-center rounded-full border-[1.5px] border-solid border-[color:var(--success)] text-[color:var(--success)]">{CHECK}</span>
        <div>
          <b className="block text-[15px] font-semibold text-[color:var(--fg)]">{c.sentTitle}</b>
          <p className="m-0 mt-[3px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
            {c.sentBody(listed).map((p, i) =>
              typeof p === "string" ? p : <b key={i} className="ph-no-capture font-medium text-[color:var(--fg)]">{p.em}</b>,
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <section aria-label={c.regionLabel} data-testid="launch-panel" className={`${frame} text-left`}>
      <h2 className="m-0 flex items-center gap-[10px] font-sans text-[16px] font-semibold text-[color:var(--fg)]">
        <i aria-hidden="true" className="block h-[8px] w-[8px] flex-none rotate-45 bg-[color:var(--accent)]" />
        {c.title}
      </h2>
      <p className="m-0 mt-[6px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{c.body}</p>
      <form onSubmit={submit} noValidate className="mt-[14px] flex flex-col gap-[10px] md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <label htmlFor={`${id}-email`} className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)] md:sr-only">
            {c.emailLabel}
          </label>
          <input
            id={`${id}-email`}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            placeholder={c.emailPlaceholder}
            aria-invalid={line === c.notAnEmail ? true : undefined}
            aria-describedby={line ? `${id}-msg` : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              if (line) setLine(null);
            }}
            className={`ph-no-capture box-border h-[48px] w-full rounded-[8px] bg-[color:var(--surface-inset)] px-[14px] font-sans text-[16px] text-[color:var(--fg)] outline-none placeholder:text-[color:var(--fg-placeholder)] focus:[border-color:var(--accent)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_25%,transparent)] ${
              line === c.notAnEmail ? "[border:1px_solid_var(--danger)]" : "[border:1px_solid_var(--border-strong)]"
            }`}
          />
          {line && (
            <span id={`${id}-msg`} role="alert" className="text-[13px] leading-[1.5] text-[color:var(--danger)]">
              {line}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="box-border inline-flex h-[48px] w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-[8px] border-0 bg-[color:var(--accent)] px-[22px] font-sans text-[15px] font-semibold text-[color:var(--bg)] hover:bg-[color:var(--accent-hover)] disabled:cursor-default disabled:opacity-75 disabled:hover:bg-[color:var(--accent)] md:w-auto"
        >
          {busy ? c.sending : c.press}
        </button>
      </form>
      <p className="m-0 mt-[10px] font-mono text-[11.5px] leading-[1.55] text-[color:var(--fg-faint)]">{c.fine}</p>
    </section>
  );
}
