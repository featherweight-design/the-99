"use client";
// The newcomer's page (invites R1 PR 5, boards N1 to N12): the sender's card beside a column that walks email, code,
// then hand-over to Clerk's hosted sign-up. The page read the row once (`readJoin`); this holds what a press changes.
// The actions answer in closed reasons, so nothing here parses a message. A transport failure (a throw, or Resend
// down) is the shared toast with Try again and leaves the field as typed (R14); a refusal that ends the invite redraws
// the card face down and names nobody (N12).

import { SignInButton } from "@clerk/nextjs";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { InviteSender } from "../../lib/social/friends";
import { joinCopy as copy } from "../../lib/copy/join";
import { CODE_LENGTH, isEmailShape, parseCode } from "../../lib/invites/rules";
import { claimInviteAction, confirmCodeAction, handOverAction } from "../../app/join/actions";
import { FriendCard, type CardFace } from "../social/friend-card";
import { LandingColumn, PRIMARY_BUTTON } from "../social/friend-landing";
import { SocialToast, type SocialToastState } from "../social/social-toast";

export type JoinStart =
  | { kind: "email"; sender: InviteSender }
  | { kind: "code"; sender: InviteSender; email: string; resendWaitMs: number; expired: boolean }
  | { kind: "proven"; sender: InviteSender; email: string }
  | { kind: "expired" }
  | { kind: "ended" };

type Step = "email" | "code" | "proven" | "account" | "expired" | "ended";

const LINK = "cursor-pointer border-0 bg-transparent p-0 font-sans text-[14px] text-[color:var(--accent)] underline underline-offset-2 hover:text-[color:var(--accent-hover)] disabled:cursor-default disabled:opacity-60";
const FIELD = "box-border h-[48px] w-full rounded-[8px] bg-[color:var(--surface-sunken)] px-[14px] font-sans text-[16px] text-[color:var(--fg)] outline-none [border:1px_solid_var(--border-strong)] focus:[border-color:var(--accent)] md:h-[44px]";

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function JoinFlow({ token, start }: { token: string; start: JoinStart }) {
  const sender = "sender" in start ? start.sender : null;
  const [step, setStep] = useState<Step>(start.kind);
  const [email, setEmail] = useState("email" in start ? start.email : "");
  const [code, setCode] = useState("");
  const [line, setLine] = useState<string | null>(start.kind === "code" && start.expired ? copy.codeExpired : null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const [up, setUp] = useState(false);
  const [waitUntil, setWaitUntil] = useState(() => Date.now() + (start.kind === "code" ? start.resendWaitMs : 0));
  const [now, setNow] = useState(() => Date.now());
  const seq = useRef(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // The arrival turn, once, after mount, so the face-down card the server drew is what turns.
  useEffect(() => {
    if (!sender) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setUp(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
    // Only the first face turns on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The resend countdown ticks only while it counts.
  const waiting = waitUntil > now;
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [waiting]);

  const say = (retry: () => void) =>
    setToast({ id: ++seq.current, text: copy.failed, retry: { label: copy.retry, run: retry } });
  const end = (to: "ended" | "expired" = "ended") => {
    setUp(false);
    setStep(to);
  };

  async function run<T>(act: () => Promise<T>, then: (r: T) => void, retry: () => void) {
    if (busy) return;
    setBusy(true);
    setLine(null);
    // A new request retires the last one's Try again: its callback holds the old state and could resubmit a spent code.
    setToast(null);
    try {
      then(await act());
    } catch {
      say(retry);
    } finally {
      setBusy(false);
    }
  }

  function sendCode(e?: FormEvent) {
    e?.preventDefault();
    if (!isEmailShape(email)) {
      setLine(copy.notAnEmail);
      return;
    }
    void run(() => claimInviteAction(token, email), (r) => {
      if (r.ok && !r.mailed) {
        // The claim committed but the mail did not go: the resend cooldown is running, the address stays editable.
        setWaitUntil(Date.now() + 60_000);
        setNow(Date.now());
        say(() => sendCode());
      } else if (r.ok) {
        setCode("");
        setStep("code");
        setWaitUntil(Date.now() + 60_000);
        setNow(Date.now());
        requestAnimationFrame(() => codeRef.current?.focus());
      } else if (r.reason === "invalid") setLine(copy.notAnEmail);
      else if (r.reason === "wait") {
        // Refused, so the stored address is unchanged: stay where the reader is (the email step names the cooldown).
        setWaitUntil(Date.now() + (r.waitMs ?? 60_000));
        setNow(Date.now());
      } else if (r.reason === "ended") end();
      else say(() => sendCode());
    }, () => sendCode());
  }

  function confirm(e?: FormEvent) {
    e?.preventDefault();
    const parsed = parseCode(code);
    if (!parsed) {
      setLine(copy.codeWrong);
      return;
    }
    void run(() => confirmCodeAction(token, parsed), (r) => {
      if (r.ok) setStep("proven");
      else if (r.reason === "wrong") setLine(copy.codeWrong);
      else if (r.reason === "expired") setLine(copy.codeExpired);
      else if (r.reason === "ended") end();
      else say(() => confirm());
    }, () => confirm());
  }

  function toSignUp() {
    void run(() => handOverAction(token), (r) => {
      if (r.ok) window.location.assign(r.url);
      else if (r.reason === "account") setStep("account");
      else if (r.reason === "ended") end();
      else say(() => toSignUp());
    }, () => toSignUp());
  }

  // An ended or expired invite names nobody (N11, N12): its card is the back alone, whoever it was.
  const named = step !== "ended" && step !== "expired";
  const face: CardFace | null = sender && named
    ? { name: sender.displayName, commander: sender.commander, type: copy.cardType, rules: copy.cardRules(sender.displayName) }
    : null;
  const name = sender?.displayName ?? "";
  const signIn = (
    <SignInButton mode="redirect">
      <button type="button" className={LINK}>{copy.signIn}</button>
    </SignInButton>
  );

  let column: React.ReactNode;
  if (step === "email" && sender) {
    column = (
      <LandingColumn
        kicker={copy.brand}
        title={copy.title(name)}
        body={copy.body}
        fine={copy.fine(name)}
        landing={up ? "go" : "wait"}
        actions={
          <form onSubmit={sendCode} noValidate className="flex w-full flex-col gap-[8px]">
            <label className="flex flex-col gap-[6px] text-left font-mono text-[11px] uppercase tracking-[.08em] text-[color:var(--fg-faint)]">
              {copy.emailLabel}
              <input
                type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
                value={email} placeholder={copy.emailPlaceholder} className={FIELD} readOnly={busy}
                aria-invalid={line ? true : undefined} aria-describedby={line ? "join-line" : undefined}
                onChange={(e) => { setEmail(e.target.value); setLine(null); setToast(null); }}
              />
            </label>
            {line && <p id="join-line" role="alert" className="m-0 text-left text-[13px] text-[color:var(--danger)]">{line}</p>}
            <button type="submit" disabled={busy || waiting} className={PRIMARY_BUTTON}>{busy ? copy.sendingCode : waiting ? copy.resendIn(mmss(waitUntil - now)) : copy.sendCode}</button>
          </form>
        }
      />
    );
  } else if (step === "code" && sender) {
    const digits = code.replace(/\D/g, "").slice(0, CODE_LENGTH);
    column = (
      <LandingColumn
        kicker={copy.brand}
        title={copy.codeTitle}
        body={copy.codeBody(email)}
        landing="go"
        actions={
          <form onSubmit={confirm} noValidate className="flex w-full flex-col gap-[10px]">
            <div className="group relative">
              <div aria-hidden className="grid grid-cols-6 gap-[6px]">
                {Array.from({ length: CODE_LENGTH }, (_, i) => (
                  <span
                    key={i}
                    className={`flex h-[52px] items-center justify-center rounded-[8px] bg-[color:var(--surface-sunken)] font-mono text-[22px] text-[color:var(--fg)] ${line ? "[border:1px_solid_var(--danger)]" : "[border:1px_solid_var(--border-strong)]"} ${i === Math.min(digits.length, CODE_LENGTH - 1) ? "group-focus-within:shadow-[0_0_0_2px_var(--accent)]" : ""}`}
                  >
                    {digits[i] ?? ""}
                  </span>
                ))}
              </div>
              <input
                ref={codeRef} value={digits} inputMode="numeric" autoComplete="one-time-code" maxLength={CODE_LENGTH}
                aria-label={copy.codeAria} aria-invalid={line ? true : undefined} aria-describedby={line ? "join-line" : undefined}
                className="absolute inset-0 h-full w-full cursor-text border-0 bg-transparent text-transparent caret-transparent opacity-0 outline-none"
                onChange={(e) => { setCode(e.target.value); setLine(null); setToast(null); }}
              />
            </div>
            {line && <p id="join-line" role="alert" className="m-0 text-left text-[13px] text-[color:var(--danger)]">{line}</p>}
            <button type="submit" disabled={busy || digits.length < CODE_LENGTH} className={PRIMARY_BUTTON}>{busy ? copy.confirming : copy.confirm}</button>
            <div className="flex flex-wrap items-center justify-center gap-x-[16px] gap-y-[6px] md:justify-start">
              <button type="button" className={LINK} disabled={busy || waiting} onClick={() => sendCode()}>
                {waiting ? copy.resendIn(mmss(waitUntil - now)) : copy.resend}
              </button>
              <button type="button" className={LINK} disabled={busy} onClick={() => { setLine(null); setToast(null); setStep("email"); }}>{copy.otherEmail}</button>
            </div>
          </form>
        }
      />
    );
  } else if (step === "proven" && sender) {
    column = (
      <LandingColumn
        kicker={copy.brand}
        title={copy.okTitle}
        body={copy.okBody(name)}
        landing="go"
        actions={<button type="button" disabled={busy} className={PRIMARY_BUTTON} onClick={toSignUp}>{busy ? copy.continuing : copy.toSignUp}</button>}
      />
    );
  } else if (step === "account" && sender) {
    column = (
      <LandingColumn
        kicker={copy.brand}
        title={copy.haveAccountTitle}
        body={copy.haveAccountBody(email, name)}
        landing="go"
        actions={
          <SignInButton mode="redirect">
            <button type="button" className={PRIMARY_BUTTON}>{copy.signIn}</button>
          </SignInButton>
        }
      />
    );
  } else if (step === "expired") {
    column = <LandingColumn kicker={copy.brand} brand title={copy.expiredTitle} body={copy.expiredBody} actions={<p className="m-0 text-[14px] text-[color:var(--fg-body)]">{copy.haveOne} {signIn}</p>} />;
  } else {
    column = <LandingColumn kicker={copy.brand} brand title={copy.endedTitle} body={copy.endedBody} actions={<p className="m-0 text-[14px] text-[color:var(--fg-body)]">{copy.haveOne} {signIn}</p>} />;
  }

  return (
    <>
      <FriendCard face={face} up={up} arrival dim={step === "expired"} />
      {column}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}
