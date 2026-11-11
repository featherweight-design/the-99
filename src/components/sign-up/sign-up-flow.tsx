"use client";
// The in-app sign-up by invitation (Small items 11, item 4: addendum A2 Ruling 1 and Ruling 3; boards Q1 to Q8, R2, R3 and
// R5), on Clerk's signal sign-up (`useSignUp` from @clerk/nextjs, the Future API). The invitation's ticket proves the mailbox,
// so the landing starts the sign-up with it at once and Q1 names the email it is for; there is no code step. Every refusal
// of the ticket (used, revoked, expired, unknown, or an invited email that already has an account, `invitation_account_exists`)
// is R3: one page, one copy, one address, so it says nothing about the email. Any other refusal, Clerk's bot check among them,
// is not the invitation's: it is the failed line, which tries again. An existing holder is never signed in from here with the
// ticket (ruling C): R3's Sign in is the way on.
//
// Make my account sends the ticket again with the name and the password in one `create`: `password()` would start a sign-up
// of its own without the ticket. Google (R2) first starts the sign-up with the ticket again, so a ticket that stopped working
// since the landing is refused before Google opens, then continues that same sign-up into Google. Back from Google with
// something missing, `/sso-callback` sends the reader to `?google=missing` (Q6), which asks only for what Clerk still lacks
// and sends it with `update` (FAPI takes a password there, though the Future type does not declare one).
// Drawn by `/sign-up` for an address with a ticket or `?google=missing` (kept out of search there): every invitation is made
// with `/sign-up` as its `redirectUrl`, so Clerk's accept link hands the reader here with `__clerk_ticket`.

import { useClerk, useSignUp } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { flyerJoinCopy, inviteOnlyCopy, joinCopy, signInCopy, signUpCopy as copy } from "../../lib/copy/join";
import { FriendCard, type CardFace } from "../social/friend-card";
import { PendingReporter } from "../shell/pending-reporter";
import { LegalLinks } from "../legal/legal-links";
import { FORM, NewcomerColumn } from "../join/newcomer-column";
import { field, press, quietPress } from "../join/join-parts";
import { Field, GOOGLE, GoogleMark, HINT, LINE_ID, MIN_PASSWORD, OR, SIGN_ERR, SSO_CALLBACK_INVITE, codesOf, passwordLine, toLanding, useCacheRestore } from "../sign-in/auth-parts";

/** Q1's card: the 99's own face, as a flyer's is, typed Invitation. */
const FACE: CardFace = {
  name: copy.cardName,
  commander: null,
  type: joinCopy.cardType,
  rules: copy.cardRules,
  crown: { credit: copy.cardCredit, mark: flyerJoinCopy.cardMark },
};

// R3's Sign in is the outline press (`.jbtn.q`): 14px under the body, as every `.jbtn`.
const PRESS_SIGN_IN = quietPress("mt-[14px]");
// Q5 draws both fields locked (`.jfld` without `.on`): the resting edge and the locked ink, whatever they hold.
const FIELD_LOCKED = field(false, "held");

/**
 * The refusals that are the invitation's or the account's, not the password's nor the bot check's: R3, at the landing, at
 * Google's press and at Make my account. Any `ticket_` or `invitation_` code (an account behind the invited email, an
 * invitation already accepted), an email that already has an account, and anything Clerk says of the ticket param.
 */
const isTicketRefusal = (error: unknown) =>
  codesOf(error).some((c) => c === "form_identifier_exists" || c.startsWith("ticket_") || c.startsWith("invitation_")) ||
  (isClerkAPIResponseError(error) && error.status !== 429 && error.errors.some((e) => e.meta?.paramName === "ticket"));

/** A sign-up held for something this page does not draw (anything past a name and a password, `legal_accepted` among them). */
const beyondPage = (missing: readonly string[]) => missing.some((f) => f !== "first_name" && f !== "password");

/** `ok`: the sign-up holds the ticket. `refused`: Clerk refused the ticket (R3). `failed`: anything else (a throw, a 429, the bot check). */
type Start = "ok" | "refused" | "failed";
type Screen = "checking" | "make" | "refused";

export function SignUpFlow({ ticket, googleMissing = false }: {
  /** The invitation's ticket, from its link. Null only on the way back from Google. */
  ticket: string | null;
  /** Back from Google with something missing (Q6, `/sso-callback`): the sign-up is Google's, and holds no ticket to send. */
  googleMissing?: boolean;
}) {
  const clerk = useClerk();
  const { signUp } = useSignUp();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("checking");
  const [email, setEmail] = useState("");
  // What Q1 asks for; Q6 asks only for what Clerk still lacks.
  const [asks, setAsks] = useState({ name: true, password: true });
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [line, setLine] = useState<string | null>(null);
  const [googleLine, setGoogleLine] = useState<string | null>(null);
  // Busy from the first paint: the landing checks the ticket as soon as Clerk has loaded.
  const [busy, setBusy] = useState(true);
  const [google, setGoogle] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const locked = busy || leaving || google;

  // A screen change hands focus to the new screen's heading (as /join does).
  const firstScreen = useRef(true);
  useEffect(() => {
    if (firstScreen.current) {
      firstScreen.current = false;
      return;
    }
    document.getElementById("friend-landing-title")?.focus();
  }, [screen]);
  useCacheRestore(() => setGoogle(false));

  /** The account is made: Clerk activates its session, then the page goes Home. */
  async function finish() {
    setLeaving(true);
    let failed = true;
    try {
      failed = !!(await signUp.finalize({ navigate: toLanding((url) => router.push(url)) })).error;
    } catch {
      failed = true;
    }
    if (failed) {
      setLeaving(false);
      setLine(joinCopy.failed);
    }
  }

  async function start(): Promise<Start> {
    if (!ticket) return "refused";
    try {
      const { error } = await signUp.ticket({ ticket });
      if (!error) return "ok";
      return isTicketRefusal(error) ? "refused" : "failed";
    } catch {
      return "failed";
    }
  }

  /** What follows a sign-up Clerk holds: Home when it needs nothing more, Q1 (or Q6) for what it does, else R3. */
  async function next(missing: boolean) {
    if (signUp.status === "complete") return finish();
    if (signUp.status !== "missing_requirements") return setScreen("refused");
    // Anything this page does not draw cannot be finished here, so it is R3 rather than a failed line that loops. That
    // includes `legal_accepted`: the page never consents for the reader.
    if (beyondPage(signUp.missingFields)) return setScreen("refused");
    const wants = { name: !missing || signUp.missingFields.includes("first_name"), password: !missing || signUp.missingFields.includes("password") };
    // Q6 with nothing this page draws (Clerk asks for something else): it cannot be finished here.
    if (!wants.name && !wants.password) return setScreen("refused");
    setEmail(signUp.emailAddress ?? "");
    setAsks(wants);
    setScreen("make");
  }

  async function land() {
    setBusy(true);
    setLine(null);
    try {
      if (googleMissing) {
        // Only a sign-up Google verified is Q6's, the test `/sso-callback` makes: anything else on this address is R3.
        if (signUp.verifications?.externalAccount?.status !== "verified") return setScreen("refused");
        return await next(true);
      }
      const started = await start();
      if (started === "refused") setScreen("refused");
      else if (started === "failed") setLine(joinCopy.failed);
      else await next(false);
    } finally {
      setBusy(false);
    }
  }

  // The landing, once Clerk has loaded the sign-up (a stub until it has).
  const landed = useRef(false);
  useEffect(() => {
    if (!clerk.loaded || landed.current) return;
    landed.current = true;
    void land();
    // Once, when Clerk has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerk.loaded]);

  // Q5.
  function make(e?: FormEvent) {
    e?.preventDefault();
    if (locked) return;
    // Q2, before Clerk is asked.
    if (asks.password && password.length < MIN_PASSWORD) {
      setLine(signInCopy.tooShort);
      return;
    }
    const firstName = name.trim();
    void (async () => {
      setBusy(true);
      setLine(null);
      try {
        // Clerk's sign-up changes under the awaits below, so its status is read fresh each time, never narrowed.
        const complete = () => signUp.status === "complete";
        // A sign-up an earlier press finished but whose finalize failed: the ticket is spent and the sign-up takes no
        // update, so the press retries only the finalize.
        if (complete()) return await finish();
        let error: unknown;
        if (googleMissing) {
          // FAPI's update takes a password, but the Future `update` type names none (`password()` would start a new sign-up
          // and drop Google's): the param is widened, not cast.
          const params: Parameters<typeof signUp.update>[0] & { password?: string } = {
            ...(asks.name ? { firstName } : {}),
            ...(asks.password ? { password } : {}),
          };
          ({ error } = await signUp.update(params));
        } else {
          ({ error } = await signUp.create({ strategy: "ticket", ticket: ticket ?? "", firstName, password }));
        }
        if (!error) {
          if (complete()) await finish();
          // As the landing reads the same sign-up: one Clerk no longer holds, or held for something this page does not
          // draw, is R3, so the press never loops on a line it cannot clear. Still short of only a name or a password it
          // was just sent, it is the failed line, and the press tries again.
          else if (signUp.status !== "missing_requirements" || beyondPage(signUp.missingFields)) setScreen("refused");
          else setLine(joinCopy.failed);
          return;
        }
        const refusal = passwordLine(error);
        if (refusal) setLine(refusal);
        else if (isTicketRefusal(error)) setScreen("refused");
        else setLine(joinCopy.failed);
      } catch {
        setLine(joinCopy.failed);
      } finally {
        setBusy(false);
      }
    })();
  }

  // R2: the ticket first, so a bad one is refused before Google opens.
  async function withGoogle() {
    if (locked) return;
    setGoogle(true);
    setGoogleLine(null);
    setLine(null);
    const started = await start();
    if (started === "refused") {
      setGoogle(false);
      setScreen("refused");
      return;
    }
    const client = clerk.client;
    let failed = started === "failed" || !client;
    if (client && !failed) {
      // The Future `signUp.sso()` POSTs a new sign-up, which drops the ticket and restricted mode refuses. The classic
      // resource's `continueSignUp` PATCHes the ticket's own sign-up into oauth_google instead: on the dev instance
      // (2026-11-11) that PATCH kept the same sign-up, its ticket-verified email and restricted mode's leave, and this page's
      // press reached Google's consent page.
      try {
        await client.signUp.authenticateWithRedirect({ strategy: "oauth_google", redirectUrl: SSO_CALLBACK_INVITE, redirectUrlComplete: "/", continueSignUp: true });
      } catch {
        failed = true;
      }
    }
    // A success is leaving for Google; only a refusal before it comes back here.
    if (failed) {
      setGoogle(false);
      setGoogleLine(joinCopy.failed);
    }
  }

  const passwordRefused = line === signInCopy.tooShort || line === signInCopy.tooWeak || line === signInCopy.breached;
  const errLine = line && <p id={LINE_ID} role="alert" className={SIGN_ERR}>{line}</p>;

  if (screen === "refused") {
    return (
      <>
        <FriendCard face={null} up={false} compact word={inviteOnlyCopy.backWord} />
        <NewcomerColumn
          variant="join"
          title={copy.refusedTitle}
          body={copy.refusedBody}
          actions={
            <div className={FORM}>
              <Link href="/sign-in" className={PRESS_SIGN_IN}>{joinCopy.signIn}<PendingReporter href="/sign-in" /></Link>
            </div>
          }
        />
      </>
    );
  }

  let body: React.ComponentProps<typeof NewcomerColumn>["body"];
  let actions: React.ReactNode;
  let legal = false;
  if (screen === "checking") {
    // The landing: the ticket is with Clerk. A failure with no answer keeps the page here, with a press that tries again.
    actions = (
      <div className={FORM}>
        {errLine}
        <button type="button" disabled={locked} className={press(locked ? "busy" : "ready")} onClick={() => void land()}>
          {locked ? copy.checking : joinCopy.retry}
        </button>
      </div>
    );
  } else {
    body = email ? (googleMissing ? copy.googleBody(email) : copy.body(email)) : undefined;
    const ready = (!asks.name || name.trim().length > 0) && (!asks.password || password.length > 0);
    // Q5: Make my account pressed. Both fields locked, the password's hint and Google gone until it answers. R2 (Google
    // pressed) keeps the fields as typed (`.jfld.on`).
    const making = busy || leaving;
    const look = (typed: boolean, danger = false) => (making ? FIELD_LOCKED : field(typed, false, danger));
    legal = true;
    actions = (
      <form onSubmit={make} noValidate className={FORM}>
        {asks.name && (
          <>
            <Field
              label={copy.nameLabel} line={false} locked={locked} look={look(name.length > 0)}
              type="text" autoComplete="given-name" value={name}
              onChange={(e) => { setName(e.target.value); setLine(null); }}
            />
            <p className={HINT}>{copy.nameHint}</p>
          </>
        )}
        {asks.password && (
          <>
            <Field
              label={signInCopy.passwordLabel} line={passwordRefused} locked={locked} look={look(password.length > 0, passwordRefused)} top={asks.name ? "mt-[14px]" : ""}
              type="password" autoComplete="new-password" value={password}
              onChange={(e) => { setPassword(e.target.value); setLine(null); }}
            />
            {/* Q2 to Q4 take the hint's slot. */}
            {passwordRefused ? errLine : !making && <p className={HINT}>{signInCopy.newPasswordHint}</p>}
          </>
        )}
        <button type="submit" disabled={locked || !ready} className={press(making ? "busy" : "ready")}>
          {making ? copy.making : copy.make}
        </button>
        {/* J3: a failure under the press, which stays and retries. */}
        {!passwordRefused && errLine}
        {!googleMissing && !making && (
          <>
            <div className={OR}>{signInCopy.or}</div>
            <button type="button" disabled={locked} className={GOOGLE} onClick={() => void withGoogle()}>
              <GoogleMark />
              {google ? copy.checking : signInCopy.google}
            </button>
            {googleLine && <p role="alert" className={SIGN_ERR}>{googleLine}</p>}
            {/* R2 draws no hint under the busy press. */}
            {email && !google && <p className={HINT}>{copy.googleHint(email)}</p>}
          </>
        )}
      </form>
    );
  }

  return (
    <>
      <FriendCard face={FACE} up compact word={joinCopy.cardType} />
      <NewcomerColumn variant="join" title={copy.title} body={body} actions={actions} />
      {/* Clerk's bot check mounts here, one mount in one place on every screen a sign-up call runs from (the landing's
          check, Q1, Q6), so a widget drawn during the landing survives the move to Q1. `signUp.ticket` is the first call,
          and Clerk looks for this mount on it (sign-up captcha is on): without it the call throws before the ticket is read. */}
      <div id="clerk-captcha" />
      {/* `.s7legal`: under the column, 14px down, on Q1 to Q8 (the landing's check and R3 draw none). */}
      {legal && <LegalLinks className="mt-[14px] justify-center" />}
    </>
  );
}
