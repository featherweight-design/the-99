"use client";
// The in-app sign-in (Small items 11, item 4: addenda A1 and A2; boards P1 to P8, K5, N1, N2 and G1), on Clerk's signal
// sign-in (`useSignIn` from @clerk/nextjs, the Future API). Ruling 2 (Hugh, 2026-11-11) binds every step: nothing a reader sees,
// and nowhere the page goes, says whether an email has an account. So Continue asks Clerk nothing (P2 for every email); a
// wrong password, an unknown email, a code-only account and a locked one are one line (P3); the code and the reset code are
// "sent" whatever Clerk answers (P4, P6); and each of those three presses lands no sooner than `FLOOR_MS`, so the time Clerk
// took cannot tell them apart either. What only a real account can reach (a correct password Clerk refuses, a second factor)
// is the boards' own N1 and N2.

import { useSignIn } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { joinCopy, signInCopy as copy, type Parts } from "../../lib/copy/join";
import { CODE_LENGTH, CODE_RESEND_MS, isEmailShape, parseCode } from "../../lib/invites/rules";
import { FriendCard } from "../social/friend-card";
import { FORM, NewcomerColumn } from "../join/newcomer-column";
import { CodeBoxes, ERR, LINKS, PRESS_QUIET, QUIET, QUIET_LINK, field, link, mmss, press, useTicking } from "../join/join-parts";

/** The least time from a press to the screen it leads to, on the password, code and reset paths (ruling 2). */
export const FLOOR_MS = 900;
const MIN_PASSWORD = 8;
/** Where Google hands the reader back (`app/sso-callback`), and where they land once in. */
export const SSO_CALLBACK = "/sso-callback";

// P3's codes. `user_locked` and `strategy_for_user_invalid` only ever answer an email that has an account, so they read
// exactly as an unknown one does.
const WRONG = new Set(["form_password_incorrect", "form_password_or_identifier_incorrect", "form_identifier_not_found", "user_locked", "strategy_for_user_invalid"]);
// N1's: a correct password Clerk will not take.
const REFUSED = new Set(["form_password_pwned", "form_password_compromised"]);

type Screen = "email" | "password" | "code" | "reset" | "newPassword" | "mfa";

/** Clerk's code for a refusal, or `null` for a 429 (the failed line, never P3) and anything that is not Clerk's answer. */
function codeOf(error: unknown): string | null {
  if (!error || !isClerkAPIResponseError(error) || error.status === 429) return null;
  return error.errors[0]?.code ?? null;
}

// Read only from presses; the compiler cannot tell a press's handler from render when the handler is chosen at render.
const clock = () => Date.now();
const held = (since: number) => new Promise<void>((done) => setTimeout(done, Math.max(0, FLOOR_MS - (Date.now() - since))));

/** K1's Google press: the outline press (`.gbtn`) with Google's mark. */
const GOOGLE = `${PRESS_QUIET.replace("mt-[8px]", "mt-0")} gap-[10px]`;
/** The rule between Google and the email (`.or9`). */
const OR = "mt-[18px] flex w-full items-center gap-[12px] font-mono text-[11px] text-[color:var(--fg-faint)] before:h-px before:flex-1 before:bg-[color:var(--border)] before:content-[''] after:h-px after:flex-1 after:bg-[color:var(--border)] after:content-['']";
const LABEL = "flex flex-col text-left font-sans text-[13px] font-semibold text-[color:var(--fg)]";
/** K5's hint under the new password (`.s7hint`). */
const HINT = "m-0 mt-[6px] text-left text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]";
const LINE_ID = "sign-in-line";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** A labelled field (`.jform label` over `.jfld`). `line` is whether a line shows under it; `danger` draws S3's edge. */
function Field({ label, value, line, danger = false, locked, top = "", ...input }: {
  label: string;
  value: string;
  line: boolean;
  danger?: boolean;
  locked: boolean;
  /** The label's own top margin, where the board gives one. */
  top?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "className">) {
  return (
    <label className={`${LABEL} ${top}`}>
      <span className="mb-[6px]">{label}</span>
      <input
        {...input} value={value} readOnly={locked} className={field(value.length > 0, locked, danger)}
        aria-invalid={line ? true : undefined} aria-describedby={line ? LINE_ID : undefined}
      />
    </label>
  );
}

export function SignInFlow({ googleRefused = false }: { googleRefused?: boolean }) {
  const { signIn } = useSignIn();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [line, setLine] = useState<string | null>(null);
  // G1: the line under the Google press, set by the way back from Google (`?google=refused`).
  const [googleLine, setGoogleLine] = useState<string | null>(googleRefused ? copy.googleRefused : null);
  // N1: the password was right but Clerk will not take it, so the press resets it instead.
  const [cantUse, setCantUse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(false);
  // Set once Clerk made the session: the page is leaving for Home.
  const [leaving, setLeaving] = useState(false);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const codeRef = useRef<HTMLInputElement>(null);
  const address = email.trim();
  const codeScreen = screen === "code" || screen === "reset" || screen === "mfa";

  // A screen change hands focus to the new screen: the code field on a code screen, the heading otherwise (as /join does).
  const firstScreen = useRef(true);
  useEffect(() => {
    if (firstScreen.current) {
      firstScreen.current = false;
      return;
    }
    if (codeScreen) codeRef.current?.focus();
    else document.getElementById("friend-landing-title")?.focus();
  }, [screen, codeScreen]);
  // Coming back from Google through the back/forward cache restores this page as it was left, the press busy.
  useEffect(() => {
    const restored = (e: PageTransitionEvent) => {
      if (e.persisted) setGoogle(false);
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);
  const waiting = waitUntil > now;
  useTicking(waiting, () => setNow(Date.now()));

  const locked = busy || leaving || google;
  const to = (next: Screen) => {
    setLine(null);
    setScreen(next);
  };
  function toCode(next: Screen) {
    setCode("");
    const at = clock();
    setWaitUntil(at + CODE_RESEND_MS);
    setNow(at);
    to(next);
  }

  async function run(act: () => Promise<void>) {
    if (locked) return;
    setBusy(true);
    setLine(null);
    try {
      await act();
    } catch {
      setLine(joinCopy.failed);
    } finally {
      setBusy(false);
    }
  }

  /** The session is made: Clerk activates it, then the page goes Home. */
  async function finish() {
    setLeaving(true);
    const { error } = await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl("/");
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
    if (error) {
      setLeaving(false);
      setLine(joinCopy.failed);
    }
  }

  /** N2: a new device or a second factor. Only a real account with its right password or code gets here. */
  async function secondFactor() {
    const { error } = await signIn.mfa.sendEmailCode();
    if (error) setLine(joinCopy.failed);
    else toCode("mfa");
  }

  /** What follows a first factor Clerk accepted. */
  async function next() {
    const status = signIn.status;
    if (status === "complete") await finish();
    else if (status === "needs_second_factor" || status === "needs_client_trust") await secondFactor();
    else if (status === "needs_new_password") {
      setCantUse(true);
      setLine(copy.cantUse);
    } else setLine(joinCopy.failed);
  }

  // P1 → P2: every email, and Clerk is not asked.
  function toPassword(e?: FormEvent) {
    e?.preventDefault();
    if (!isEmailShape(email)) {
      setLine(joinCopy.notAnEmail);
      return;
    }
    setPassword("");
    setCantUse(false);
    setGoogleLine(null);
    to("password");
  }

  function withPassword(e?: FormEvent) {
    e?.preventDefault();
    if (cantUse) return reset();
    if (password.length === 0) return;
    void run(async () => {
      const since = Date.now();
      let error: unknown = null;
      try {
        error = (await signIn.password({ identifier: address, password })).error;
      } catch (thrown) {
        error = thrown ?? new Error("password");
      }
      await held(since);
      if (!error) return next();
      const code = codeOf(error);
      if (code && WRONG.has(code)) setLine(copy.wrong);
      else if (code && REFUSED.has(code)) {
        setCantUse(true);
        setLine(copy.cantUse);
      } else setLine(joinCopy.failed);
    });
  }

  /** Runs `send`, keeps none of its answer, and lands on `next` no sooner than the floor. */
  function sendQuietly(send: () => Promise<unknown>, nextScreen: Screen) {
    void run(async () => {
      const since = Date.now();
      try {
        await send();
      } catch {
        // Swallowed: an unknown email must look sent.
      }
      await held(since);
      toCode(nextScreen);
    });
  }

  // P4 (and its resend).
  const emailCode = () => sendQuietly(() => signIn.emailCode.sendCode({ emailAddress: address }), "code");

  // P6 (and its resend): a fresh sign-in for the email, then the reset code, whatever either answers.
  const reset = () =>
    sendQuietly(async () => {
      const { error } = await signIn.create({ identifier: address });
      if (!error) await signIn.resetPasswordEmailCode.sendCode();
    }, "reset");

  const resendMfa = () =>
    void run(async () => {
      const { error } = await signIn.mfa.sendEmailCode();
      if (error) setLine(joinCopy.failed);
      else toCode("mfa");
    });

  function confirm(e?: FormEvent) {
    e?.preventDefault();
    const parsed = parseCode(code);
    if (!parsed) {
      setLine(joinCopy.codeWrong);
      return;
    }
    void run(async () => {
      const verify = () =>
        screen === "reset" ? signIn.resetPasswordEmailCode.verifyCode({ code: parsed })
          : screen === "mfa" ? signIn.mfa.verifyEmailCode({ code: parsed })
            : signIn.emailCode.verifyCode({ code: parsed });
      let ok = false;
      try {
        ok = !(await verify()).error;
      } catch {
        ok = false;
      }
      // P5: any refusal of a code is the shipped wrong-code line, for an email with an account or without.
      if (!ok) setLine(joinCopy.codeWrong);
      else if (screen === "reset") {
        setPassword("");
        to("newPassword");
      } else await next();
    });
  }

  // K5.
  function savePassword(e?: FormEvent) {
    e?.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setLine(copy.tooShort);
      return;
    }
    void run(async () => {
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({ password });
      if (!error) return next();
      const code = codeOf(error);
      if (code === "form_password_not_strong_enough") setLine(copy.tooWeak);
      else if (code === "form_password_pwned") setLine(copy.breached);
      else if (code === "form_password_length_too_short") setLine(copy.tooShort);
      else setLine(joinCopy.failed);
    });
  }

  async function withGoogle() {
    if (locked) return;
    setGoogle(true);
    setGoogleLine(null);
    setLine(null);
    let failed = false;
    try {
      failed = !!(await signIn.sso({ strategy: "oauth_google", redirectUrl: "/", redirectCallbackUrl: SSO_CALLBACK })).error;
    } catch {
      failed = true;
    }
    // A success is leaving for Google; only a refusal before it comes back here.
    if (failed) {
      setGoogle(false);
      setGoogleLine(joinCopy.failed);
    }
  }

  const errLine = line && <p id={LINE_ID} role="alert" className={ERR}>{line}</p>;
  const foot = (
    <p className={QUIET.replace("mt-[22px]", "mt-[18px]")}>
      {copy.newHere} <Link href="/sign-up" className={QUIET_LINK}>{copy.howToJoin}</Link>
    </p>
  );

  let title: string;
  let body: string | Parts;
  let actions: React.ReactNode;
  if (screen === "email") {
    title = copy.title;
    body = copy.body;
    actions = (
      <>
        <form onSubmit={toPassword} noValidate className={FORM}>
          <button type="button" disabled={locked} className={GOOGLE} onClick={() => void withGoogle()}>
            <GoogleMark />
            {google ? copy.signingIn : copy.google}
          </button>
          {googleLine && <p role="alert" className={ERR}>{googleLine}</p>}
          <div className={OR}>{copy.or}</div>
          <Field
            label={joinCopy.emailLabel} line={!!line} locked={locked} top="mt-[16px]"
            type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
            value={email} placeholder={joinCopy.emailPlaceholder}
            onChange={(e) => { setEmail(e.target.value); setLine(null); }}
          />
          {errLine}
          <button type="submit" disabled={locked} className={press()}>{copy.continue}</button>
        </form>
        {foot}
      </>
    );
  } else if (screen === "password") {
    title = copy.passwordTitle;
    body = copy.forEmail(address);
    actions = (
      <form onSubmit={withPassword} noValidate className={FORM}>
        <Field
          label={copy.passwordLabel} line={!!line} locked={locked} danger={line === copy.wrong || line === copy.cantUse}
          type="password" autoComplete="current-password" value={password}
          onChange={(e) => { setPassword(e.target.value); setLine(cantUse ? copy.cantUse : null); }}
        />
        {errLine}
        <button type="submit" disabled={locked || (!cantUse && password.length === 0)} className={press(busy ? "busy" : "ready")}>
          {cantUse ? copy.resetPassword : busy || leaving ? copy.signingIn : copy.signIn}
        </button>
        <div className={LINKS}>
          <button type="button" className={link(false)} disabled={locked} onClick={reset}>{copy.forgot}</button>
          <button type="button" className={link(false)} disabled={locked} onClick={emailCode}>{copy.codeInstead}</button>
        </div>
      </form>
    );
  } else if (codeScreen) {
    const digits = code.replace(/\D/g, "").slice(0, CODE_LENGTH);
    title = screen === "reset" ? copy.resetTitle : joinCopy.codeTitle;
    body = screen === "reset" ? copy.resetBody(address) : screen === "mfa" ? joinCopy.codeBody(address) : copy.codeBody(address);
    const resend = screen === "reset" ? reset : screen === "mfa" ? resendMfa : emailCode;
    actions = (
      <>
        <form onSubmit={confirm} noValidate className={FORM}>
          <CodeBoxes
            digits={digits} label={joinCopy.codeAria} wrong={line === joinCopy.codeWrong} busy={locked} describedBy={line ? LINE_ID : undefined} inputRef={codeRef}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH)); setLine(null); }}
          />
          {errLine}
          <button type="submit" disabled={locked || digits.length < CODE_LENGTH} className={press()}>
            {busy || leaving ? joinCopy.confirming : joinCopy.confirm}
          </button>
          <div className={LINKS}>
            <button type="button" className={link(waiting)} disabled={locked || waiting} onClick={resend}>
              {waiting ? joinCopy.resendIn(mmss(waitUntil - now)) : joinCopy.resend}
            </button>
            {screen === "reset" ? (
              <button type="button" className={link(false)} disabled={locked} onClick={() => { setPassword(""); setCantUse(false); to("password"); }}>{copy.backToSignIn}</button>
            ) : (
              <button type="button" className={link(false)} disabled={locked} onClick={() => to("email")}>{joinCopy.otherEmail}</button>
            )}
          </div>
        </form>
        {screen === "code" && foot}
      </>
    );
  } else {
    title = copy.newPasswordTitle;
    body = copy.forEmail(address);
    actions = (
      <form onSubmit={savePassword} noValidate className={FORM}>
        <Field
          label={copy.newPasswordLabel} line={!!line} locked={locked} danger={!!line}
          type="password" autoComplete="new-password" value={password}
          onChange={(e) => { setPassword(e.target.value); setLine(null); }}
        />
        <p className={HINT}>{copy.newPasswordHint}</p>
        {errLine}
        <button type="submit" disabled={locked} className={press(busy ? "busy" : "ready")}>{busy || leaving ? copy.saving : copy.save}</button>
      </form>
    );
  }

  return (
    <>
      <FriendCard face={null} up={false} compact word={copy.cardWord} />
      <NewcomerColumn variant="join" title={title} body={body} actions={actions} />
    </>
  );
}
