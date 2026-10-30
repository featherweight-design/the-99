"use client";
// The newcomer's page (invites R1 PR 5, boards N1 to N12): the sender's card beside a column that walks email, code,
// then hand-over to Clerk's hosted sign-up. The page read the row once (`readJoin`); this holds what a press changes.
// The actions answer in closed reasons, so nothing here parses a message. A transport failure (a throw, or Resend
// down) is the shared toast with Try again and leaves the field as typed (R14); a refusal that ends the invite redraws
// the card face down and names nobody (N12).

import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { InviteSender } from "../../lib/social/friends";
import { flyerJoinCopy as flyerCopy, joinCopy as copy } from "../../lib/copy/join";
import { CODE_LENGTH, isEmailShape, parseCode } from "../../lib/invites/rules";
import type { FlyerJoinView } from "../../lib/flyer/join-read";
import type { FlyerClosed } from "../../lib/flyer/rules";
import { claimInviteAction, confirmCodeAction, handOverAction } from "../../app/join/actions";
import { confirmFlyerCodeAction, handOverFlyerAction, saveLaunchListAction, startFlyerClaimAction } from "../../app/join/flyer-actions";
import { FriendCard, type CardFace } from "../social/friend-card";
import { FORM, NewcomerColumn } from "./newcomer-column";
import { SocialToast, type SocialToastState } from "../social/social-toast";

export type JoinStart =
  | { kind: "email"; sender: InviteSender }
  | { kind: "code"; sender: InviteSender; email: string; resendWaitMs: number; expired: boolean }
  | { kind: "proven"; sender: InviteSender; email: string }
  | { kind: "expired" }
  | { kind: "ended" };

type Step = "email" | "code" | "proven" | "account" | "expired" | "ended" | "full" | "revoked" | "listed" | "launched";

// The two kinds of newcomer share one set of steps. A flyer's differ only where an invite names its sender: the card is the 99's
// own, the lines name no one, and a used-up, ended or retired code has the launch-list steps. Each action answers in the
// closed reasons below, so the page never reads a message.
type Claim = { ok: true; mailed: boolean } | { ok: false; reason: string; waitMs?: number; closed?: FlyerClosed };
type Confirm = { ok: true } | { ok: false; reason: string };
type HandOver = { ok: true; url: string } | { ok: false; reason: string };

// The boards' presses are 100% x 48px at every width (`.b1`, `.b2`): the friend landing's own button is 44px from `md`.
const PRESS = "box-border mt-[14px] inline-flex h-[48px] w-full cursor-pointer items-center justify-center rounded-[8px] font-sans text-[15px] no-underline disabled:cursor-default";
const press = (state: "ready" | "busy" = "ready") =>
  `${PRESS} border-0 font-semibold text-[color:var(--bg)] ${state === "busy" ? "bg-[color:var(--accent-strong)]" : "bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] disabled:opacity-60 disabled:hover:bg-[color:var(--accent)]"}`;
/** N5: the boxes are empty, so Confirm steps back to the outline (`.b2`). */
const PRESS_QUIET = `${PRESS.replace("mt-[14px]", "mt-[8px]")} bg-transparent font-medium text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] disabled:opacity-60`;
const link = (cooling: boolean) =>
  `inline-flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent px-[8px] font-sans text-[13.5px] font-medium no-underline disabled:cursor-default ${cooling ? "text-[color:var(--fg-locked)]" : "text-[color:var(--accent-text)] hover:text-[color:var(--accent-hover)] disabled:opacity-60"}`;
// N11, N12: the sign-in link inside the quiet mono line.
const QUIET_LINK = "cursor-pointer border-0 bg-transparent p-0 font-mono text-[11px] text-[color:var(--accent-text)] no-underline hover:text-[color:var(--accent-hover)]";
const QUIET = "m-0 mt-[22px] text-center font-mono text-[11px] leading-[1.55] text-[color:var(--fg-faint)]";
const ERR = "m-0 mt-[10px] text-center text-[12.5px] leading-[1.45] text-[color:var(--danger)]";
const field = (typed: boolean, locked: boolean) =>
  `box-border h-[48px] w-full rounded-[8px] bg-[color:var(--surface-sunken)] px-[12px] font-sans text-[16px] outline-none placeholder:text-[color:var(--fg-placeholder)] focus:[border-color:var(--accent)] ${locked ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]"} ${typed ? "[border:1px_solid_var(--accent)]" : "[border:1px_solid_var(--border-strong)]"}`;

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type JoinFlowProps =
  | { token: string; start: JoinStart; flyer?: false }
  /** `token` is the flyer code, in upper case (the page redirects a lower-case one). */
  | { token: string; start: FlyerJoinView; flyer: true };

export function JoinFlow({ token, ...props }: JoinFlowProps) {
  const flyer = props.flyer === true;
  const start = props.start;
  const sender = "sender" in start ? start.sender : null;
  // Face up while a flyer's reader is on the email, code or proven step; a closed or retired code shows the back alone.
  const flyerFace = flyer && (start.kind === "email" || start.kind === "code" || start.kind === "proven");
  const [step, setStep] = useState<Step>(start.kind === "closed" ? start.closed : start.kind);
  const [email, setEmail] = useState("email" in start ? start.email : "");
  // The address the launch list kept, for the line that thanks them.
  const [listed, setListed] = useState("");
  const [code, setCode] = useState("");
  const [line, setLine] = useState<string | null>(start.kind === "code" && start.expired ? copy.codeExpired : null);
  const [busy, setBusy] = useState(false);
  // Set once the hand-over succeeded: the page is leaving, and a second press would revoke the ticket it is using.
  const [leaving, setLeaving] = useState(false);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const [up, setUp] = useState(false);
  const [waitUntil, setWaitUntil] = useState(() => Date.now() + (start.kind === "code" ? start.resendWaitMs : 0));
  const [now, setNow] = useState(() => Date.now());
  const seq = useRef(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // The arrival turn, once, after mount, so the face-down card the server drew is what turns.
  useEffect(() => {
    if (!sender && !flyerFace) return;
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
  // A step change hands focus to the new step: the code field on the code step, the heading otherwise, so the
  // control that was pressed leaving the page does not drop a keyboard or screen-reader reader to the top.
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    if (step === "code") codeRef.current?.focus();
    else document.getElementById("friend-landing-title")?.focus();
  }, [step]);
  // Coming back from Clerk through the back/forward cache restores this page as it was left, Continue disabled.
  useEffect(() => {
    const restored = (e: PageTransitionEvent) => {
      if (e.persisted) setLeaving(false);
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
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
    // A flyer's claim that ended (its hold ran out, the code was revoked or the trial retired) has no card of its own
    // to draw: the page reads again, so the reader meets whichever state is now true.
    if (flyer) {
      window.location.reload();
      return;
    }
    setUp(false);
    setStep(to);
  };
  const claimAction = (address: string): Promise<Claim> => (flyer ? startFlyerClaimAction(token, address) : claimInviteAction(token, address));
  const confirmAction = (typed: string): Promise<Confirm> => (flyer ? confirmFlyerCodeAction(token, typed) : confirmCodeAction(token, typed));
  const handOverAct = (): Promise<HandOver> => (flyer ? handOverFlyerAction(token) : handOverAction(token));

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
    void run(() => claimAction(email), (r) => {
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
      } else if (r.reason === "closed") {
        // Used up, or revoked since the page loaded: the card turns face down and the launch list takes the address.
        setUp(false);
        setStep(r.closed === "revoked" ? "revoked" : "full");
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
    void run(() => confirmAction(parsed), (r) => {
      if (r.ok) setStep("proven");
      else if (r.reason === "wrong") setLine(copy.codeWrong);
      else if (r.reason === "expired") {
        // N5: the expired code is spent, so the boxes clear and Confirm steps back until a new one is typed.
        setCode("");
        setLine(copy.codeExpired);
      } else if (r.reason === "ended") end();
      else say(() => confirm());
    }, () => confirm());
  }

  // E1, E2: the launch list. A refusal of the field is the shipped line; a transport failure is the shared toast with
  // Try again and the field kept; a trial that has retired meanwhile turns the page to E3.
  function leaveEmail(e?: FormEvent) {
    e?.preventDefault();
    if (!isEmailShape(email)) {
      setLine(copy.notAnEmail);
      return;
    }
    void run(() => saveLaunchListAction(token, email), (r) => {
      if (r.ok) {
        setListed(email.trim().toLowerCase());
        setStep("listed");
      } else if (r.reason === "launched") setStep("launched");
      else if (r.reason === "throttled") say(() => leaveEmail());
      else setLine(copy.notAnEmail);
    }, () => leaveEmail());
  }

  function toSignUp() {
    void run(() => handOverAct(), (r) => {
      if (r.ok) {
        setLeaving(true);
        window.location.assign(r.url);
      }
      else if (r.reason === "account") {
        // N9: the card turns face down and names nobody, as an ended invite does.
        setUp(false);
        setStep("account");
      }
      else if (r.reason === "ended") end();
      else say(() => toSignUp());
    }, () => toSignUp());
  }

  // An ended or expired invite names nobody (N11, N12): its card is the back alone, whoever it was.
  const named = step === "email" || step === "code" || step === "proven";
  const person = sender !== null || flyer;
  // A flyer has no sender: its card is the 99's own, crowned in the art box and credited "From a flyer".
  const face: CardFace | null = !named
    ? null
    : sender
      ? { name: sender.displayName, commander: sender.commander, type: copy.cardType, rules: copy.cardRules(sender.displayName) }
      : flyer
        ? { name: flyerCopy.cardName, commander: null, type: flyerCopy.cardType, rules: flyerCopy.cardRules, crown: { credit: flyerCopy.cardCredit, mark: flyerCopy.cardMark } }
        : null;
  const signIn = (
    <SignInButton mode="redirect">
      <button type="button" className={QUIET_LINK}>{copy.signIn}</button>
    </SignInButton>
  );

  let column: React.ReactNode;
  if (step === "email" && person) {
    column = (
      <NewcomerColumn
        variant="join"
        title={sender ? copy.title(sender.displayName) : flyerCopy.title}
        body={copy.body}
        fine={sender ? copy.fine(sender.displayName) : flyerCopy.fine}
        balance={flyer}
        landing={up ? "go" : "wait"}
        actions={
          <form onSubmit={sendCode} noValidate className={FORM}>
            <label className="flex flex-col text-left font-sans text-[13px] font-semibold text-[color:var(--fg)]">
              <span className="mb-[6px]">{copy.emailLabel}</span>
              <input
                type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
                value={email} placeholder={copy.emailPlaceholder} className={field(email.length > 0, busy)} readOnly={busy}
                aria-invalid={line ? true : undefined} aria-describedby={line ? "join-line" : undefined}
                onChange={(e) => { setEmail(e.target.value); setLine(null); setToast(null); }}
              />
            </label>
            {line && <p id="join-line" role="alert" className={ERR}>{line}</p>}
            <button type="submit" disabled={busy || waiting} className={press(busy ? "busy" : "ready")}>{busy ? copy.sendingCode : waiting ? copy.resendIn(mmss(waitUntil - now)) : copy.sendCode}</button>
          </form>
        }
      />
    );
  } else if (step === "code" && person) {
    const digits = code.replace(/\D/g, "").slice(0, CODE_LENGTH);
    // Only a wrong code (N4) is drawn in danger; an expired one (N5) is a neutral empty row with Confirm stepped back.
    const wrong = line === copy.codeWrong;
    const expired = line === copy.codeExpired;
    column = (
      <NewcomerColumn
        variant="join"
        title={copy.codeTitle}
        body={copy.codeBody(email)}
        balance={flyer}
        landing="go"
        actions={
          <form onSubmit={confirm} noValidate className={FORM}>
            <div role="group" aria-label={copy.codeAria} className="group relative">
              <div aria-hidden className="flex justify-center gap-[8px]">
                {Array.from({ length: CODE_LENGTH }, (_, i) => (
                  <span
                    key={i}
                    className={`box-border flex h-[54px] w-[44px] items-center justify-center rounded-[8px] bg-[color:var(--surface-sunken)] font-mono text-[22px] font-semibold ${digits[i] ? "text-[color:var(--fg)]" : "text-[color:var(--fg-disabled)]"} ${wrong ? "[border:1px_solid_var(--danger)]" : digits[i] ? "[border:1px_solid_var(--accent)]" : "[border:1px_solid_var(--border-strong)]"} ${i === Math.min(digits.length, CODE_LENGTH - 1) ? "group-focus-within:shadow-[0_0_0_2px_var(--accent)]" : ""}`}
                  >
                    {digits[i] ?? "·"}
                  </span>
                ))}
              </div>
              <input
                ref={codeRef} value={digits} readOnly={busy} inputMode="numeric" autoComplete="one-time-code"
                aria-label={copy.codeAria} aria-invalid={line ? true : undefined} aria-describedby={line ? "join-line" : undefined}
                className="absolute inset-0 h-full w-full cursor-text border-0 bg-transparent text-transparent caret-transparent opacity-0 outline-none"
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH)); setLine(null); setToast(null); }}
              />
            </div>
            {line && <p id="join-line" role="alert" className={ERR}>{line}</p>}
            <button
              type="submit" disabled={busy || digits.length < CODE_LENGTH} data-quiet={expired && digits.length === 0 ? "true" : undefined}
              className={expired && digits.length === 0 ? PRESS_QUIET : press()}
            >
              {busy ? copy.confirming : copy.confirm}
            </button>
            <div className="mt-[6px] flex flex-wrap items-center justify-center gap-[4px]">
              <button type="button" className={link(waiting)} disabled={busy || waiting} onClick={() => sendCode()}>
                {waiting ? copy.resendIn(mmss(waitUntil - now)) : copy.resend}
              </button>
              <button type="button" className={link(false)} disabled={busy} onClick={() => { setLine(null); setToast(null); setStep("email"); }}>{copy.otherEmail}</button>
            </div>
          </form>
        }
      />
    );
  } else if (step === "proven" && person) {
    column = (
      <NewcomerColumn
        variant="join"
        title={copy.okTitle}
        body={sender ? copy.okBody(sender.displayName) : flyerCopy.okBody}
        balance={flyer}
        landing="go"
        actions={<div className={FORM}><button type="button" disabled={busy || leaving} className={press()} onClick={toSignUp}>{busy || leaving ? copy.continuing : copy.toSignUp}</button></div>}
      />
    );
  } else if (step === "account" && person) {
    column = (
      <NewcomerColumn
        variant="join"
        title={copy.haveAccountTitle}
        body={sender ? copy.haveAccountBody(email, sender.displayName) : flyerCopy.haveAccountBody(email)}
        balance={flyer}
        landing="go"
        actions={
          <div className={FORM}>
            <SignInButton mode="redirect">
              <button type="button" className={press()}>{copy.signIn}</button>
            </SignInButton>
          </div>
        }
      />
    );
  } else if (flyer && (step === "full" || step === "revoked")) {
    column = (
      <NewcomerColumn
        variant="join"
        title={step === "full" ? flyerCopy.fullTitle : flyerCopy.revokedTitle}
        body={flyerCopy.listBody}
        balance
        landing="go"
        actions={
          <>
            <form onSubmit={leaveEmail} noValidate className={FORM}>
              <label className="flex flex-col text-left font-sans text-[13px] font-semibold text-[color:var(--fg)]">
                <span className="mb-[6px]">{copy.emailLabel}</span>
                <input
                  type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
                  value={email} placeholder={copy.emailPlaceholder} className={field(email.length > 0, busy)} readOnly={busy}
                  aria-invalid={line ? true : undefined} aria-describedby={line ? "join-line" : undefined}
                  onChange={(e) => { setEmail(e.target.value); setLine(null); setToast(null); }}
                />
              </label>
              {line && <p id="join-line" role="alert" className={ERR}>{line}</p>}
              <button type="submit" disabled={busy} className={press(busy ? "busy" : "ready")}>{flyerCopy.listPress}</button>
            </form>
            <p className={QUIET}>{copy.haveOne} {signIn}</p>
          </>
        }
      />
    );
  } else if (flyer && step === "listed") {
    column = <NewcomerColumn variant="join" title={flyerCopy.listedTitle} body={flyerCopy.listedBody(listed)} balance landing="go" actions={<p className={QUIET}>{copy.haveOne} {signIn}</p>} />;
  } else if (flyer && step === "launched") {
    column = (
      <NewcomerColumn
        variant="join"
        title={flyerCopy.launchedTitle}
        body={flyerCopy.launchedBody}
        balance
        actions={
          <>
            <div className={FORM}>
              <Link href="/sign-up" className={press()}>{flyerCopy.launchedPress}</Link>
            </div>
            <p className={QUIET}>{copy.haveOne} {signIn}</p>
          </>
        }
      />
    );
  } else if (step === "expired") {
    column = <NewcomerColumn variant="join" title={copy.expiredTitle} body={copy.expiredBody} actions={<p className={QUIET}>{copy.haveOne} {signIn}</p>} />;
  } else {
    column = <NewcomerColumn variant="join" title={copy.endedTitle} body={copy.endedBody} actions={<p className={QUIET}>{copy.haveOne} {signIn}</p>} />;
  }

  return (
    <>
      <FriendCard face={face} up={up} arrival dim={step === "expired" || step === "launched"} compact word={copy.cardType} badge={step === "proven"} />
      {column}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}
