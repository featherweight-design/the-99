"use client";
// The in-app sign-in (Small items 11, item 4: addenda A1 and A2; boards P1 to P8, K5, N1, N2 and G1), on Clerk's signal
// sign-in (`useSignIn` from @clerk/nextjs, the Future API). Ruling 2 (Hugh, 2026-11-11) binds every step: nothing a reader sees,
// and nowhere the page goes, says whether an email has an account. So Continue asks Clerk nothing (P2 for every email); a
// wrong password, an unknown email, a code-only account and a locked one are one line (P3); the code and the reset code are
// "sent" whatever Clerk answers (P4, P6); and four presses are held, so each lands no sooner than its floor: Sign in with a
// password, Email me a code, the reset (`RESET_FLOOR_MS`, two calls) and every code's Confirm (`FLOOR_MS` for the rest). The
// floor pads a fast answer only: it hides a difference shorter than itself (an unknown email Clerk refuses at once), not a
// slower one, so Clerk's own enumeration protection, which answers an unknown email as it does a real one, carries the rest.
// That protection is on at its Strict level in every Clerk instance (Bulk still confirms a single account); the page is
// public and noindex. What only a real account can reach (a correct password Clerk refuses, a second factor) is the boards'
// own N1 and N2. Every way the reader is signed in lands on `destination`, the page they came from, made safe by `returnTo`:
// the server page's `landing` (the query), or, when that is Home, what a `<SignInButton>` wrote after the hash (`hashReturn`).
// Google's way lands there too: it rides to `/sso-callback` as `redirect_url`.

import { useClerk, useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { joinCopy, signInCopy as copy, type Parts } from "../../lib/copy/join";
import { CODE_LENGTH, CODE_RESEND_MS, isEmailShape, parseCode } from "../../lib/invites/rules";
import { FriendCard } from "../social/friend-card";
import { PendingReporter } from "../shell/pending-reporter";
import { FORM, NewcomerColumn } from "../join/newcomer-column";
import { CodeBoxes, LINKS, QUIET, QUIET_LINK, link, mmss, press, useTicking } from "../join/join-parts";
import { HOME, hashReturn, withReturn } from "../../lib/auth/return-to";
import { mirrorUrl } from "../../lib/url/mirror";
import { Field, GOOGLE, GoogleMark, HINT, LINE_ID, MIN_PASSWORD, OR, SIGN_ERR, SSO_CALLBACK, codeOf, passwordLine, toHome, useCacheRestore } from "./auth-parts";

/** The least time from a press to the screen it leads to, on the password, code and reset paths (ruling 2). */
export const FLOOR_MS = 900;
/** P6's floor: its press makes two Clerk calls (a fresh sign-in, then the code), and only an email Clerk knows reaches the
 * second, so the gap a floor must cover is about twice P4's. */
export const RESET_FLOOR_MS = 1500;

// P3's codes. `user_locked` and `strategy_for_user_invalid` only ever answer an email that has an account, so they read
// exactly as an unknown one does.
const WRONG = new Set(["form_password_incorrect", "form_password_or_identifier_incorrect", "form_identifier_not_found", "user_locked", "strategy_for_user_invalid"]);
// N1's: a correct password Clerk will not take. The `__sign_in` forms are the sign-in variants @clerk/shared names.
const REFUSED = new Set([
  "form_password_pwned", "form_password_pwned__sign_in",
  "form_password_compromised", "form_password_compromised__sign_in",
  "form_password_untrusted", "form_password_untrusted__sign_in",
]);

type Screen = "email" | "password" | "code" | "reset" | "newPassword" | "mfa";

// Read only from presses; the compiler cannot tell a press's handler from render when the handler is chosen at render.
const clock = () => Date.now();
/** Waits out what is left of `floor` since the press: a fast answer is padded to it, a slow one is not delayed further. */
const held = (since: number, floor = FLOOR_MS) => new Promise<void>((done) => setTimeout(done, Math.max(0, floor - (Date.now() - since))));

export function SignInFlow({ landing = HOME, googleRefused = false, googleCode = false, googleReturning = false }: {
  /** Where a signed-in reader lands: a same-site path `returnTo` already checked on the server, from the query. */
  landing?: string;
  googleRefused?: boolean;
  /** `/sso-callback` draws P1 with the Google press busy while it finishes the sign-in (A1 M2). */
  googleReturning?: boolean;
  /** Back from Google to a real account that asks for a second factor (`/sso-callback`): N2 at once. */
  googleCode?: boolean;
}) {
  const clerk = useClerk();
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
  const [google, setGoogle] = useState(googleReturning);
  // Set once Clerk made the session: the page is leaving for `destination`.
  const [leaving, setLeaving] = useState(false);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const codeRef = useRef<HTMLInputElement>(null);
  // Read once, in the browser: the server draws the same page whatever the hash says, since nothing drawn depends on it.
  const [destination] = useState(() =>
    landing !== HOME || typeof window === "undefined" ? landing : (hashReturn(window.location.hash, window.location.host) ?? HOME));
  // The hash's parameters are read; they come off the address so a reload or a shared link does not carry them.
  useEffect(() => {
    if (window.location.hash.includes("redirect_url") || window.location.hash.includes("sign_in_force_redirect_url")) {
      mirrorUrl(`${window.location.pathname}${window.location.search}`);
    }
  }, []);
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
  useCacheRestore(() => setGoogle(false));
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

  /** The session is made: Clerk activates it, then the page goes to `destination`. */
  async function finish() {
    setLeaving(true);
    let failed = true;
    try {
      failed = !!(await signIn.finalize({ navigate: toHome((url) => router.push(url), destination) })).error;
    } catch {
      failed = true;
    }
    if (failed) {
      setLeaving(false);
      setLine(joinCopy.failed);
    }
  }

  /** N2: a new device or a second factor. Only a real account with its right password or code gets here. */
  async function secondFactor() {
    // Known limit: only the emailed code is drawn (S2). An account whose second factor is an authenticator app or a phone
    // cannot finish here, and gets the failed line.
    if (!signIn.supportedSecondFactors?.some((f) => f.strategy === "email_code")) {
      setLine(joinCopy.failed);
      return;
    }
    const { error } = await signIn.mfa.sendEmailCode();
    if (error) setLine(joinCopy.failed);
    else toCode("mfa");
  }
  // Back from Google at a second factor: the email is the one Clerk holds for the sign-in, when it says. The sign-in is only
  // read once Clerk has loaded it (a reload of `?google=code` mounts before it has), and the code is sent once, then.
  const googleSent = useRef(false);
  useEffect(() => {
    if (!googleCode || !clerk.loaded || googleSent.current) return;
    googleSent.current = true;
    setEmail(signIn.identifier ?? "");
    void run(secondFactor);
    // Once, when Clerk has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleCode, clerk.loaded]);

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
  function sendQuietly(send: () => Promise<unknown>, nextScreen: Screen, floor: number) {
    void run(async () => {
      const since = Date.now();
      try {
        await send();
      } catch {
        // Swallowed: an unknown email must look sent.
      }
      await held(since, floor);
      toCode(nextScreen);
    });
  }

  // P4 (and its resend).
  const emailCode = () => sendQuietly(() => signIn.emailCode.sendCode({ emailAddress: address }), "code", FLOOR_MS);

  // P6 (and its resend): a fresh sign-in for the email, then the reset code, whatever either answers.
  const reset = () =>
    sendQuietly(async () => {
      const { error } = await signIn.create({ identifier: address });
      if (!error) await signIn.resetPasswordEmailCode.sendCode();
    }, "reset", RESET_FLOOR_MS);

  const resendMfa = () => void run(secondFactor);

  function confirm(e?: FormEvent) {
    e?.preventDefault();
    const parsed = parseCode(code);
    if (!parsed) {
      setLine(joinCopy.codeWrong);
      return;
    }
    void run(async () => {
      // Timed from the press like the sends: an unknown email's code is refused at once, a real one's is checked.
      const since = Date.now();
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
      await held(since);
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
      setLine(passwordLine(error) ?? joinCopy.failed);
    });
  }

  async function withGoogle() {
    if (locked) return;
    setGoogle(true);
    setGoogleLine(null);
    setLine(null);
    let failed = false;
    try {
      // The destination goes both ways: as `redirectUrl` for a sign-in Clerk completes on its own, and on the callback's
      // address for the one `/sso-callback` finishes, which checks it again.
      failed = !!(await signIn.sso({ strategy: "oauth_google", redirectUrl: destination, redirectCallbackUrl: withReturn(SSO_CALLBACK, destination) })).error;
    } catch {
      failed = true;
    }
    // A success is leaving for Google; only a refusal before it comes back here.
    if (failed) {
      setGoogle(false);
      setGoogleLine(joinCopy.failed);
    }
  }

  const errLine = line && <p id={LINE_ID} role="alert" className={SIGN_ERR}>{line}</p>;
  const foot = (
    <p className={QUIET.replace("mt-[22px]", "mt-[18px]")}>
      {copy.newHere} <Link href="/sign-up" className={QUIET_LINK}>{copy.howToJoin}<PendingReporter href="/sign-up" /></Link>
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
          {googleLine && <p role="alert" className={SIGN_ERR}>{googleLine}</p>}
          <div className={OR}>{copy.or}</div>
          <Field
            label={joinCopy.emailLabel} line={!!line} locked={locked} top="mt-[16px]"
            type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
            value={email} placeholder={joinCopy.emailPlaceholder}
            onChange={(e) => { setEmail(e.target.value); setLine(null); }}
          />
          {errLine}
          <button type="submit" disabled={locked || !isEmailShape(email)} className={press()}>{copy.continue}</button>
        </form>
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
          {/* N1 offers the emailed code alone: its press is already the reset. */}
          {!cantUse && <button type="button" className={link(false)} disabled={locked} onClick={reset}>{copy.forgot}</button>}
          <button type="button" className={link(false)} disabled={locked} onClick={emailCode}>{copy.codeInstead}</button>
        </div>
      </form>
    );
  } else if (codeScreen) {
    const digits = code.replace(/\D/g, "").slice(0, CODE_LENGTH);
    title = screen === "reset" ? copy.resetTitle : joinCopy.codeTitle;
    body = screen === "reset" ? copy.resetBody(address) : screen === "mfa" ? (address ? joinCopy.codeBody(address) : copy.codeBodyNoEmail) : copy.codeBody(address);
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
              <button type="button" className={link(false)} disabled={locked} onClick={() => { setPassword(""); setCantUse(false); to("email"); }}>{copy.backToSignIn}</button>
            ) : (
              <button type="button" className={link(false)} disabled={locked} onClick={() => to("email")}>{joinCopy.otherEmail}</button>
            )}
          </div>
        </form>
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
        {/* A refusal takes the hint's slot. */}
        {errLine || <p className={HINT}>{copy.newPasswordHint}</p>}
        <button type="submit" disabled={locked} className={press(busy ? "busy" : "ready")}>{busy || leaving ? copy.saving : copy.save}</button>
      </form>
    );
  }

  return (
    <>
      <FriendCard face={null} up={false} compact word={copy.cardWord} />
      <NewcomerColumn variant="join" title={title} body={body} actions={actions} />
      {/* The pointer to /sign-up sits under the column, not in it (P1, P4, P5, G1). */}
      {(screen === "email" || screen === "code") && foot}
    </>
  );
}
