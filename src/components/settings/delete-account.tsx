"use client";
// Deleting the account (account settings handoff R1, calls 6 to 10; READINESS clarifications 1, 4, 6, 7, 9, 10): ONE
// SocialModal with two screens.
//
// D1, "Delete your account?": what goes, the pods line, the paid-credits split while paid credits are held (the shipped
// warning's markup, moved inside), the plan line whenever a plan is live, the widened refund line, "It can't be undone.",
// then the typed word (any case, trimmed) and Keep / Delete account.
//
// D2, "Confirm it's you": Clerk's step-up drawn as a screen of the same modal, never Clerk's own UI. The delete is a server
// action that answers Clerk's reverification error when the session's strict window has passed; `useReverification` hands
// that to `onNeedsReverification`, which opens D2. D2 verifies the session's first factor (the password, or a code to the
// address Clerk offers: for a Google-only account, its Google email), then `complete()` retries the delete. ‹ is `cancel()`,
// which lands back on D1 with "Nothing was deleted."
//
// What Sign out does on this device happens first, while the session still holds (clarification 6): recent card searches
// cleared, this device's push subscription forgotten. It runs only once the delete is going ahead: before the call when the
// session is inside its window, or after D2 verifies.
//
// After the delete: `clerk.signOut({ redirectUrl: "/?deleted=1" })`, never a plain load, so the server reads no stale
// token, GhostSession never fires and the param survives (clarification 7). The landing says "Your account is deleted."

import { useRef, useState, type RefObject } from "react";
import { useClerk, useReverification, useUser } from "@clerk/nextjs";
import { isReverificationCancelledError } from "@clerk/nextjs/errors";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { deleteAccountAction } from "../../app/settings/account-actions";
import { accountCopy, type SignInMethod } from "../../lib/copy/account";
import { creditsPageCopy } from "../../lib/copy/credits-page";
import { joinCopy, signInCopy } from "../../lib/copy/join";
import { warnsBeforeDelete, type HeldPaid } from "../../lib/payments/held-rule";
import { clearRecent } from "../../lib/card-search/recent";
import { forgetThisDevice } from "../../lib/push/forget-device";
import { noteSignOutPressed } from "../../lib/analytics/sign-out-evidence";
import { CODE_LENGTH, CODE_RESEND_MS } from "../../lib/invites/rules";
import { SupportLink } from "../credits/support-link";
import { CodeBoxes, field, link, LINKS, mmss, useTicking } from "../join/join-parts";
import { CODE_ERR, codesOf, SIGN_ERR } from "../sign-in/auth-parts";
import { SocialModal } from "../social/social-modal";

const a = accountCopy.del;
const c = creditsPageCopy.del;

/** Where a delete lands: the signed-out landing, which reads the param, shows the toast and strips it. */
export const DELETED_HREF = "/?deleted=1";

// The pair under every delete in the app (Keep, then the --danger press), at the modal's size.
const PAIR_BTN = "h-[44px] flex-1 cursor-pointer rounded-[8px] font-sans text-[14px] md:h-[40px] md:text-[13.5px] disabled:cursor-default";
const KEEP = `${PAIR_BTN} border border-solid border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-body)]`;
const GO = `${PAIR_BTN} border-none bg-[color:var(--danger)] font-semibold text-[color:var(--bg)]`;
const CONFIRM =
  "box-border mt-[14px] inline-flex h-[48px] w-full cursor-pointer items-center justify-center rounded-[8px] border-0 bg-[color:var(--danger)] font-sans text-[15px] font-semibold text-[color:var(--bg)] disabled:cursor-default";

/** Clerk's refusals of a password (the sign-in's own set). */
const WRONG_PASSWORD = new Set(["form_password_incorrect", "form_password_or_identifier_incorrect", "strategy_for_user_invalid"]);

type Kind = "password" | "code" | "google";
type Pending = { cancel: () => void; complete: () => void };

export type DeleteFacts = { held: HeldPaid | null; planLive: boolean; methods: SignInMethod[] };

type Parts = (string | { em: string })[];
function Sub({ parts }: { parts: Parts }) {
  return <>{parts.map((p, i) => (typeof p === "string" ? p : <b key={i} className="font-semibold text-[color:var(--fg)] [overflow-wrap:anywhere]">{p.em}</b>))}</>;
}

const tooMany = (err: unknown) => isClerkAPIResponseError(err) && err.status === 429;

export function DeleteAccount({ facts, onClose, returnFocusRef }: { facts: DeleteFacts; onClose: () => void; returnFocusRef?: RefObject<HTMLElement | null> }) {
  const clerk = useClerk();
  const { user } = useUser();
  const [screen, setScreen] = useState<"d1" | "d2">("d1");
  const [busy, setBusy] = useState(false);

  // --- D1 --------------------------------------------------------------------------------------------------------------
  const [typed, setTyped] = useState("");
  const [line, setLine] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const ready = typed.trim().toLowerCase() === a.word;

  // --- D2 --------------------------------------------------------------------------------------------------------------
  const pending = useRef<Pending | null>(null);
  const [kind, setKind] = useState<Kind>("code");
  const [codeTo, setCodeTo] = useState<{ email: string; id: string } | null>(null);
  const [passwordEmail, setPasswordEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [d2Line, setD2Line] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const waiting = waitUntil > now;
  useTicking(waiting, () => setNow(Date.now()));

  // Sign out's on-device steps, once, while the session still holds.
  const cleared = useRef(false);
  async function beforeDelete() {
    if (cleared.current) return;
    cleared.current = true;
    if (user) clearRecent(user.id);
    // The sign-out evidence keeps the session's end from reading as a ghost (#2926).
    noteSignOutPressed();
    await forgetThisDevice().catch(() => {});
  }

  const del = useReverification(deleteAccountAction, {
    onNeedsReverification: ({ cancel, complete }) => {
      pending.current = { cancel, complete };
      void openVerify();
    },
  });

  async function deleteNow() {
    if (!ready || busy) return;
    setBusy(true);
    setLine(null);
    setNote(null);
    // Inside the strict window the delete runs at once, so the on-device steps go first. Outside it, D2 runs them.
    if (clerk.session?.checkAuthorization({ reverification: "strict" })) await beforeDelete();
    try {
      const r = await del();
      if (r.ok) return leave();
      fail(r.reason === "limited" ? a.tooMany : a.failed);
    } catch (err) {
      if (isReverificationCancelledError(err)) {
        setBusy(false);
        setScreen("d1");
        setNote(a.notDeleted);
      } else fail(a.failed);
    }
  }

  function fail(text: string) {
    pending.current = null;
    setBusy(false);
    setChecking(false);
    setScreen("d1");
    setLine(text);
  }

  function leave() {
    // The session is already gone on Clerk's side, so a throw here still lands on the landing.
    clerk.signOut({ redirectUrl: DELETED_HREF }).catch(() => window.location.replace(DELETED_HREF));
  }

  async function openVerify() {
    setScreen("d2");
    setD2Line(null);
    setPassword("");
    setCode("");
    const session = clerk.session;
    if (!session) return fail(a.failed);
    try {
      const v = await session.startVerification({ level: "first_factor" });
      const factors = v.supportedFirstFactors ?? [];
      const byCode = factors.find((f) => f.strategy === "email_code");
      const byPassword = factors.find((f) => f.strategy === "password");
      const to = byCode && "emailAddressId" in byCode ? { email: byCode.safeIdentifier, id: byCode.emailAddressId } : null;
      setCodeTo(to);
      setPasswordEmail(to?.email ?? user?.primaryEmailAddress?.emailAddress ?? "");
      if (byPassword) return setKind("password");
      if (!to) return fail(a.failed);
      setKind(facts.methods.includes("google") ? "google" : "code");
      await sendCode(to.id);
    } catch (err) {
      setD2Line(tooMany(err) ? a.tooMany : a.failed);
    }
  }

  async function sendCode(emailAddressId: string) {
    setWaitUntil(Date.now() + CODE_RESEND_MS);
    setNow(Date.now());
    try {
      await clerk.session?.prepareFirstFactorVerification({ strategy: "email_code", emailAddressId });
    } catch (err) {
      setD2Line(tooMany(err) ? a.tooMany : a.failed);
    }
  }

  async function codeInstead() {
    if (!codeTo) return;
    setKind("code");
    setD2Line(null);
    await sendCode(codeTo.id);
  }

  async function confirm() {
    const session = clerk.session;
    if (!session || checking || !pending.current) return;
    setChecking(true);
    setD2Line(null);
    try {
      const v = await session.attemptFirstFactorVerification(
        kind === "password" ? { strategy: "password", password } : { strategy: "email_code", code },
      );
      if (v.status !== "complete") return fail(a.failed);
      await beforeDelete();
      const p = pending.current;
      pending.current = null;
      // The delete runs again, now inside the window; `deleteNow` reads its answer.
      p?.complete();
    } catch (err) {
      setChecking(false);
      if (tooMany(err)) return setD2Line(a.tooMany);
      const codes = codesOf(err);
      if (kind === "password") setD2Line(codes.some((x) => WRONG_PASSWORD.has(x)) ? a.wrongPassword : a.failed);
      else setD2Line(codes.includes("verification_expired") ? joinCopy.codeExpired : joinCopy.codeWrong);
    }
  }

  function back() {
    const p = pending.current;
    pending.current = null;
    setChecking(false);
    p?.cancel();
  }

  function close() {
    if (busy && !pending.current) return;
    pending.current?.cancel();
    pending.current = null;
    onClose();
  }

  if (screen === "d2") {
    const sub = kind === "password" ? a.verifyPassword(passwordEmail) : kind === "google" ? a.verifyGoogle(codeTo?.email ?? "") : a.verifyCode(codeTo?.email ?? "");
    const digits = code.replace(/\D/g, "").slice(0, CODE_LENGTH);
    const canConfirm = kind === "password" ? password.length > 0 : digits.length === CODE_LENGTH;
    return (
      <SocialModal
        title={a.verifyTitle}
        sub={undefined}
        closeLabel={a.close}
        onClose={close}
        onBack={checking ? undefined : back}
        backLabel={a.back}
        screen="d2"
        returnFocusRef={returnFocusRef}
      >
        <p className="m-0 mb-[14px] text-[13px] leading-[1.5] text-[color:var(--fg-muted)]"><Sub parts={sub} /></p>
        <form
          noValidate
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
        >
          {kind === "password" ? (
            <>
              <label className="flex flex-col text-left font-sans text-[13px] font-semibold text-[color:var(--fg)]">
                <span className="mb-[6px]">{signInCopy.passwordLabel}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  disabled={checking}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setD2Line(null);
                  }}
                  className={field(password.length > 0, checking ? "held" : false, d2Line === a.wrongPassword)}
                />
              </label>
              {d2Line ? <p role="alert" className={SIGN_ERR}>{d2Line}</p> : null}
            </>
          ) : (
            <div className="pt-[4px]">
              <CodeBoxes
                digits={digits}
                label={joinCopy.codeAria}
                wrong={d2Line === joinCopy.codeWrong || d2Line === joinCopy.codeExpired}
                busy={checking}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));
                  setD2Line(null);
                }}
              />
              {d2Line ? <p role="alert" className={CODE_ERR}>{d2Line}</p> : null}
            </div>
          )}
          <button
            type="submit"
            disabled={checking || !canConfirm}
            aria-busy={checking || undefined}
            className={`${CONFIRM} ${checking ? "opacity-60" : !canConfirm ? "opacity-[.45]" : ""}`}
          >
            {checking ? a.deleting : a.confirm}
          </button>
          <div className={LINKS}>
            {kind === "password" ? (
              codeTo ? (
                <button type="button" className={link(false)} disabled={checking} onClick={() => void codeInstead()}>{signInCopy.codeInstead}</button>
              ) : null
            ) : (
              <button type="button" className={link(waiting)} disabled={checking || waiting} onClick={() => codeTo && void sendCode(codeTo.id)}>
                {waiting ? joinCopy.resendIn(mmss(waitUntil - now)) : joinCopy.resend}
              </button>
            )}
          </div>
        </form>
      </SocialModal>
    );
  }

  const held = warnsBeforeDelete(facts.held) ? facts.held : null;
  const cells = held
    ? [
        held.plan > 0 ? { key: "plan", label: c.plan, n: held.plan, sub: c.planSub } : null,
        held.pack > 0 ? { key: "pack", label: c.packs, n: held.pack, sub: c.packsSub } : null,
      ].filter((x) => x !== null)
    : [];
  const money = held !== null || facts.planLive;
  return (
    <SocialModal title={a.title} closeLabel={a.close} onClose={close} screen="d1" returnFocusRef={returnFocusRef}>
      <div data-delete-screen="d1" className="flex flex-col gap-[12px] pt-[2px]">
        {note ? <p role="status" className="m-0 font-mono text-[11px] text-[color:var(--fg-muted)]">{note}</p> : null}
        <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{a.intro}</p>
        <ul className="m-0 -mt-[4px] flex list-none flex-col gap-[3px] p-0">
          {a.erased.map((x) => (
            <li key={x} className="flex items-baseline gap-[10px] text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]">
              <span aria-hidden className="inline-block h-[5px] w-[5px] flex-none -translate-y-[2px] rotate-45 bg-[color:var(--danger)]" />
              <span>{x}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)]">{a.pods}</p>
        {cells.length > 0 ? (
          // The shipped deletion warning's split, now inside the flow.
          <ul data-delete-split="" className="m-0 flex list-none overflow-hidden rounded-[10px] border border-solid border-[color:var(--border)] p-0">
            {cells.map((cell) => (
              <li key={cell.key} className="flex min-w-0 flex-1 flex-col gap-[2px] border-l border-solid border-l-[color:var(--border)] px-[12px] py-[10px] first:border-l-0">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">{cell.label}</span>
                <span className="font-mono text-[20px] font-semibold leading-[1.15] text-[color:var(--fg)]">{cell.n}</span>
                <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)] md:whitespace-nowrap">{cell.sub}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {money ? (
          <>
            <p data-delete-money="" className="m-0 text-pretty text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
              {held ? `${c.title(held.plan + held.pack)}. ${a.heldSays(held.plan, held.pack)}` : ""}
              {held && facts.planLive ? " " : ""}
              {facts.planLive ? a.plan : ""}
            </p>
            <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-muted)]">
              {facts.planLive ? a.refundBefore : c.refundBefore}
              <SupportLink />
              {facts.planLive ? a.refundAfter : c.refundAfter}
            </p>
          </>
        ) : null}
        <p className="m-0 text-[13.5px] font-semibold leading-[1.55] text-[color:var(--fg)]">{a.final}</p>
        <label className="mt-[2px] flex flex-col text-left font-sans text-[13px] font-semibold text-[color:var(--fg)]">
          <span className="mb-[6px]">{a.typeLabel}</span>
          <input
            value={typed}
            disabled={busy}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => {
              setTyped(e.target.value);
              setLine(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void deleteNow();
              }
            }}
            className={field(typed.length > 0, busy ? "held" : false)}
          />
        </label>
        {line ? <p role="alert" className={`${SIGN_ERR} -mt-[4px]`}>{line}</p> : null}
        <div className="mt-[4px] flex gap-[8px]">
          <button type="button" disabled={busy} onClick={close} className={KEEP}>{a.keep}</button>
          <button
            type="button"
            disabled={!ready || busy}
            aria-busy={busy || undefined}
            onClick={() => void deleteNow()}
            className={`${GO} ${!ready ? "opacity-[.45]" : busy ? "opacity-60" : ""}`}
          >
            {busy ? a.deleting : a.go}
          </button>
        </div>
      </div>
    </SocialModal>
  );
}
