// PROPOSAL (account settings handoff R1): the delete flow, two screens of ONE SocialModal (sheet on the phone, 440 dialog
// from md). `Frame` repeats SocialModal's markup without its portal and hooks so the boards can render it; the build uses
// SocialModal itself (`screen`, `onBack`, `sub`).
import type { ReactNode } from "react";
import { accountCopy } from "../../lib/copy/account";
import { creditsPageCopy } from "../../lib/copy/credits-page";
import { signInCopy } from "../../lib/copy/join";
import { joinCopy } from "../../lib/copy/join";
import { SupportLink } from "../credits/support-link";
import { SheetGrabber } from "../ui/sheet-grabber";
import { CodeBoxes, field, link, LINKS } from "../join/join-parts";
import { CODE_ERR, SIGN_ERR } from "../sign-in/auth-parts";

const a = accountCopy.del;
const c = creditsPageCopy.del;
type Parts = (string | { em: string })[];

function P({ parts }: { parts: Parts }) {
  return <>{parts.map((p, i) => (typeof p === "string" ? p : <b key={i} className="font-semibold text-[color:var(--fg)] [overflow-wrap:anywhere]">{p.em}</b>))}</>;
}

export function Frame({ title, sub, back, children }: { title: string; sub?: ReactNode; back?: boolean; children: ReactNode }) {
  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_oklab,var(--bg)_72%,transparent)] md:items-start md:pt-[10dvh]">
      <div role="dialog" aria-modal="true" className="flex w-full flex-col overflow-hidden rounded-[20px_20px_0_0] bg-[color:var(--surface-raised)] outline-none [border-top:1px_solid_var(--border-strong)] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] md:rounded-[14px] md:[border:1px_solid_var(--border-strong)] md:shadow-[0_30px_70px_rgba(0,0,0,0.6)] md:w-[440px]">
        <SheetGrabber />
        <div className="flex items-center gap-[4px] px-[18px] md:pt-[12px] md:px-[20px]">
          {back ? (
            <button type="button" aria-label={a.back} className="-ml-[12px] flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 pb-[3px] text-[22px] leading-none text-[color:var(--fg)] md:-ml-[10px] md:w-[36px]">{"‹"}</button>
          ) : null}
          <h2 className="m-0 min-w-0 flex-1 font-display text-[18px] font-bold md:text-[19px] text-[color:var(--fg)]">{title}</h2>
          <button type="button" aria-label={a.close} className="-mr-[10px] flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[15px] text-[color:var(--fg-muted)]">{"✕"}</button>
        </div>
        {sub ? <p className="mx-[18px] mt-0 mb-[14px] text-[13px] leading-[1.5] text-[color:var(--fg-muted)] md:mx-[20px]">{sub}</p> : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[18px] pb-[24px] md:px-[20px] md:pb-[18px]">{children}</div>
      </div>
    </div>
  );
}

// The pair under every delete in the app (ui/delete-confirm.tsx: Keep, then the --danger press), at the modal's size.
const PAIR_BTN = "h-[44px] flex-1 cursor-pointer rounded-[8px] font-sans text-[14px] md:h-[40px] md:text-[13.5px] disabled:cursor-default";
const KEEP = `${PAIR_BTN} border border-solid border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]`;
const GO = `${PAIR_BTN} border-none bg-[color:var(--danger)] font-semibold text-[color:var(--bg)]`;

export type HeldFx = { plan: number; pack: number; subscribed: boolean } | null;

/** D1: what goes, the paid credits where held, the word, Keep and Delete account. */
export function DeleteScreen({ held, typed, line, busy = false, note }: { held: HeldFx; typed: string; line?: string | null; busy?: boolean; note?: string | null }) {
  const ready = typed.trim().toLowerCase() === a.word;
  const cells = held ? [
    held.plan > 0 ? { key: "plan", label: c.plan, n: held.plan, sub: c.planSub } : null,
    held.pack > 0 ? { key: "pack", label: c.packs, n: held.pack, sub: c.packsSub } : null,
  ].filter((x) => x !== null) : [];
  return (
    <Frame title={a.title}>
      <div className="flex flex-col gap-[12px] pt-[2px]">
        {note ? <p role="status" className="m-0 font-mono text-[11px] text-[color:var(--fg-muted)]">{note}</p> : null}
        <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{a.intro}</p>
        <ul className="m-0 -mt-[4px] flex list-none flex-col gap-[3px] p-0">
          {a.erased.map((x) => (
            <li key={x} className="flex items-baseline gap-[10px] text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]">
              <span aria-hidden className="inline-block h-[5px] w-[5px] flex-none -translate-y-[2px] rotate-45 bg-[color:var(--danger)]" />
              <span>{x.charAt(0).toUpperCase() + x.slice(1)}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)]">{a.pods}</p>
        {cells.length > 0 ? (
          <>
            {/* The shipped deletion warning's split (credits/delete-warning.tsx), now inside the flow. */}
            <ul className="m-0 flex list-none overflow-hidden rounded-[10px] border border-solid border-[color:var(--border)] p-0">
              {cells.map((cell) => (
                <li key={cell.key} className="flex min-w-0 flex-1 flex-col gap-[2px] px-[12px] py-[10px] border-l border-solid border-l-[color:var(--border)] first:border-l-0">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">{cell.label}</span>
                  <span className="font-mono text-[20px] font-semibold leading-[1.15] text-[color:var(--fg)]">{cell.n}</span>
                  <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)] md:whitespace-nowrap">{cell.sub}</span>
                </li>
              ))}
            </ul>
            <p className="m-0 text-pretty text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
              {a.heldSays(held!.plan, held!.pack)}
              {held!.subscribed ? ` ${a.plan}` : ""}
            </p>
            <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)]">
              {held!.subscribed ? a.refundBefore : c.refundBefore}
              <SupportLink />
              {held!.subscribed ? a.refundAfter : c.refundAfter}
            </p>
          </>
        ) : null}
        <p className="m-0 text-[13.5px] font-semibold leading-[1.55] text-[color:var(--fg)]">{a.final}</p>
        <label className="mt-[2px] flex flex-col text-left font-sans text-[13px] font-semibold text-[color:var(--fg)]">
          <span className="mb-[6px]">{a.typeLabel}</span>
          <input value={typed} readOnly autoCapitalize="none" autoComplete="off" spellCheck={false} className={field(typed.length > 0, busy ? "held" : false)} />
        </label>
        {line ? <p role="alert" className={`${SIGN_ERR} -mt-[4px]`}>{line}</p> : null}
        <div className="mt-[4px] flex gap-[8px]">
          <button type="button" disabled={busy} className={KEEP}>{a.keep}</button>
          <button type="button" disabled={!ready || busy} aria-busy={busy || undefined} className={`${GO} ${!ready ? "opacity-[.45]" : busy ? "opacity-60" : ""}`}>{busy ? a.deleting : a.go}</button>
        </div>
      </div>
    </Frame>
  );
}

const DOTS = "••••••••••";
const CONFIRM = "box-border mt-[14px] inline-flex h-[48px] w-full cursor-pointer items-center justify-center rounded-[8px] border-0 bg-[color:var(--danger)] font-sans text-[15px] font-semibold text-[color:var(--bg)] disabled:cursor-default";

/** D2: Clerk's step-up, as a screen of the same modal. `kind` is the account's first factor. */
export function VerifyScreen({ kind, email, typed = "", line, busy = false, cooling = "0:41" }: {
  kind: "password" | "code" | "google"; email: string; typed?: string; line?: string | null; busy?: boolean; cooling?: string | null;
}) {
  const sub = kind === "password" ? a.verifyPassword(email) : kind === "code" ? a.verifyCode(email) : a.verifyGoogle(email);
  const codeFull = typed.length === 6;
  return (
    <Frame title={a.verifyTitle} back sub={<P parts={sub} />}>
      {kind === "password" ? (
        <div className="flex flex-col">
          <label className="flex flex-col text-left font-sans text-[13px] font-semibold text-[color:var(--fg)]">
            <span className="mb-[6px]">{signInCopy.passwordLabel}</span>
            <input type="text" value={typed ? DOTS : ""} readOnly className={field(typed.length > 0, busy ? "held" : false, !!line && !busy)} />
          </label>
          {line ? <p role="alert" className={SIGN_ERR}>{line}</p> : null}
          <button type="button" disabled={busy || !typed} className={`${CONFIRM} ${busy ? "opacity-60" : !typed ? "opacity-[.45]" : ""}`}>{busy ? a.deleting : a.confirm}</button>
          <div className={LINKS}><button type="button" className={link(false)}>{signInCopy.codeInstead}</button></div>
        </div>
      ) : (
        <div className="flex flex-col pt-[4px]">
          <CodeBoxes digits={typed} label="6-digit code" wrong={!!line && line !== a.tooMany} busy={busy} onChange={() => {}} />
          {line ? <p role="alert" className={CODE_ERR}>{line}</p> : null}
          <button type="button" disabled={busy || !codeFull} className={`${CONFIRM} ${busy ? "opacity-60" : !codeFull ? "opacity-[.45]" : ""}`}>{busy ? a.deleting : a.confirm}</button>
          <div className={LINKS}>
            <button type="button" disabled={!!cooling} className={link(!!cooling)}>{cooling ? joinCopy.resendIn(cooling) : joinCopy.resend}</button>
          </div>
        </div>
      )}
    </Frame>
  );
}

export { joinCopy };
