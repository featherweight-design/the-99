"use client";
// The friend request card's page (Social R1 PR D): the card beside its column, in every signed-in state (L2 to L8),
// and the column the signed-out page draws too (L1). The page reads the link once; this holds what a press changes.
//
// A card that names someone (open, no commander, your own link, already friends) arrives face down and turns face
// up once, after mount; the column's heading and buttons land with it (`.friend-land-in`). Decline turns it back
// before the column changes to Declined; Accept does not turn, it leaves for `/friends`. An action that refuses is
// redrawn as what the link now is (ended, or your own), never as done (E12); one that throws is the shared toast with
// Try again (E15), and the card stays up.

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ProfileCommander } from "../../lib/social/commander";
import { socialCopy } from "../../lib/copy/social";
import type { LandingView } from "../../lib/social/landing";
import { friendsReceiptPath, invitePath } from "../../lib/social/client-rules";
import { prefersReducedMotion } from "../../lib/ui/motion";
import { declineInviteAction, redeemInviteAction } from "../../app/friends/actions";
import { FriendCard, type CardFace } from "./friend-card";
import { SocialToast, type SocialToastState } from "./social-toast";

const copy = socialCopy.landing;

type Shown = LandingView | { kind: "declined"; name: string };

/** The turn's length, for the column to wait on before it changes (README 23). */
const turnMs = () => (prefersReducedMotion() ? 120 : 520);

function faceOf(v: LandingView): CardFace | null {
  switch (v.kind) {
    case "open":
      return { name: v.name, commander: v.commander, type: copy.typeRequest, rules: copy.openRules(v.name) };
    case "self":
      return { name: v.name, commander: v.commander, type: copy.typeOwn, rules: copy.ownRules };
    case "friends":
      return { name: v.name, commander: v.commander, type: copy.typeFriend(v.since), rules: copy.friendRules(v.name) };
    default:
      return null;
  }
}

// The board's two buttons (R2 Landing): 48px stacked full width at phone, 44px in a row from md.
const BUTTON = "box-border inline-flex h-[48px] w-full cursor-pointer items-center justify-center rounded-[8px] font-sans text-[15px] no-underline transition-colors disabled:cursor-default disabled:opacity-60 md:h-[44px] md:w-auto md:text-[14px]";
export const PRIMARY_BUTTON = `${BUTTON} border-0 bg-[color:var(--accent)] px-[26px] font-semibold text-[color:var(--bg)] hover:bg-[color:var(--accent-hover)] disabled:hover:bg-[color:var(--accent)]`;
const SECONDARY_BUTTON = `${BUTTON} bg-transparent px-[20px] font-medium text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] hover:[border-color:var(--accent)] hover:text-[color:var(--accent-hover)] disabled:hover:[border-color:var(--border-strong)] disabled:hover:text-[color:var(--fg)]`;

/**
 * The column beside the card: a kicker (desktop only; the phone board draws none), the heading that carries the
 * question, an optional body, the buttons and an optional fine print. `landing` holds them back until the card lands.
 */
export function LandingColumn({
  kicker,
  brand = false,
  title,
  body,
  actions,
  fine,
  landing = false,
}: {
  kicker: string;
  /** The signed-out kicker is the landing's mark, in the accent. */
  brand?: boolean;
  title: string;
  body?: string;
  actions: ReactNode;
  fine?: string;
  landing?: boolean;
}) {
  return (
    <section aria-labelledby="friend-landing-title" className="flex w-full flex-col gap-[8px] text-center md:w-[380px] md:gap-[10px] md:text-left">
      <p className={`m-0 font-mono text-[10.5px] font-medium uppercase tracking-[.14em] max-md:hidden ${brand ? "text-[color:var(--accent)]" : "text-[color:var(--fg-faint)]"}`}>
        {kicker}
      </p>
      <h1 id="friend-landing-title" className="m-0 font-display text-[21px] font-bold leading-[1.15] text-[color:var(--fg)] md:text-[28px]">
        {title}
      </h1>
      {body && <p className="m-0 font-sans text-[14px] leading-[1.55] text-[color:var(--fg-body)] md:text-[14.5px]">{body}</p>}
      <div className={`mt-[6px] flex flex-col gap-[8px] md:mt-[12px] md:flex-row md:gap-[10px] ${landing ? "friend-land-in" : ""}`}>{actions}</div>
      {fine && <p className={`m-0 mt-[6px] font-mono text-[11px] text-[color:var(--fg-faint)] ${landing ? "friend-land-in" : ""}`}>{fine}</p>}
    </section>
  );
}

export function FriendLanding({ token, view }: { token: string; view: LandingView }) {
  const router = useRouter();
  const [shown, setShown] = useState<Shown>(view);
  // The face the card was drawn with stays on its front once it turns back down, so the turn has a front to hide.
  const [face, setFace] = useState(() => faceOf(view));
  const named = face !== null;
  const [up, setUp] = useState(false);
  const [arrival, setArrival] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastSeq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // The arrival turn: once, after mount, so the face-down card the server drew is what turns.
  useEffect(() => {
    if (!named) return;
    // Two frames, so a card drawn face down by a client navigation is painted face down before it turns.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setUp(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
    // Only the first face turns on arrival; a later redraw keeps whatever side it is on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  };
  const say = (text: string, retry?: () => void) =>
    setToast({ id: ++toastSeq.current, text, ...(retry ? { retry: { label: copy.retry, run: retry } } : {}) });

  /** Redraw as what the link now is: an ended link turns face down, your own stays (or turns) face up. */
  function becomeEnded() {
    setArrival(false);
    setUp(false);
    setShown({ kind: "ended" });
  }
  function becomeSelf(v: { name: string; commander: ProfileCommander | null }) {
    const self: LandingView = { kind: "self", ...v };
    setFace(faceOf(self));
    setShown(self);
    setUp(true);
  }

  async function accept() {
    if (shown.kind !== "open" || busy) return;
    const { name, commander } = shown;
    setBusy(true);
    try {
      const r = await redeemInviteAction(token);
      if (r.ok) {
        // Stays busy: the page is leaving.
        router.push(friendsReceiptPath(r.friend.publicId));
        return;
      }
      setBusy(false);
      if (r.reason === "off") router.refresh();
      else if (r.reason === "self") becomeSelf({ name, commander });
      else becomeEnded();
    } catch {
      setBusy(false);
      say(copy.acceptFailed, () => void accept());
    }
  }

  async function decline() {
    if (shown.kind !== "open" || busy) return;
    const { name, commander } = shown;
    setBusy(true);
    try {
      const r = await declineInviteAction(token);
      if (r.ok) {
        // The card turns back down first; the column changes once it has.
        setArrival(false);
        setUp(false);
        later(turnMs(), () => {
          setBusy(false);
          setShown({ kind: "declined", name });
        });
        return;
      }
      setBusy(false);
      if (r.reason === "off") router.refresh();
      else if (r.reason === "self") becomeSelf({ name, commander });
      else if (r.reason === "ended") becomeEnded();
      else say(copy.declineFailed, () => void decline());
    } catch {
      setBusy(false);
      say(copy.declineFailed, () => void decline());
    }
  }

  async function copyLink() {
    // The page is at the link, so its own origin is the link's (E7).
    try {
      await navigator.clipboard.writeText(`${location.origin}${invitePath(token)}`);
      setCopied(true);
      later(1500, () => setCopied(false));
    } catch {
      say(copy.copyFailed);
    }
  }

  const toFriends = <Link href="/friends" className={SECONDARY_BUTTON}>{copy.toFriends}</Link>;
  const column = (() => {
    switch (shown.kind) {
      case "open":
        return (
          <LandingColumn
            kicker={copy.kicker}
            title={copy.openTitle(shown.name)}
            landing
            actions={
              <>
                <button type="button" className={PRIMARY_BUTTON} disabled={busy} aria-busy={busy || undefined} onClick={() => void accept()}>
                  {copy.accept}
                </button>
                <button type="button" className={SECONDARY_BUTTON} disabled={busy} onClick={() => void decline()}>
                  {copy.decline}
                </button>
              </>
            }
            fine={copy.openFine(shown.name)}
          />
        );
      case "self":
        return (
          <LandingColumn
            kicker={copy.kicker}
            title={copy.selfTitle}
            body={copy.selfBody}
            landing
            actions={
              <>
                <button type="button" className={PRIMARY_BUTTON} onClick={() => void copyLink()}>
                  {copied ? copy.copied : copy.copyLink}
                </button>
                {toFriends}
                <span role="status" className="sr-only">{copied ? copy.copied : ""}</span>
              </>
            }
          />
        );
      case "friends":
        return <LandingColumn kicker={copy.kicker} title={copy.alreadyTitle(shown.name)} body={copy.alreadyBody} landing actions={toFriends} />;
      case "declined":
        return (
          <LandingColumn
            kicker={copy.kicker}
            title={copy.declinedTitle}
            body={copy.declinedBody(shown.name)}
            actions={<Link href="/" className={SECONDARY_BUTTON}>{copy.toHome}</Link>}
          />
        );
      case "expired":
        return <LandingColumn kicker={copy.kicker} title={copy.expiredTitle} body={copy.expiredBody} actions={toFriends} />;
      case "ended":
        return <LandingColumn kicker={copy.kicker} title={copy.endedTitle} body={copy.endedBody} actions={toFriends} />;
    }
  })();

  return (
    <LandingStage>
      <FriendCard face={face} up={up && named} arrival={arrival} dim={shown.kind === "expired"} />
      {column}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </LandingStage>
  );
}

/**
 * The signed-in stage: at 1300 the card and the column side by side, 56px apart, 110px from the top, over a soft
 * accent glow; at 390 the card above a centred column, the whole of it inside the first screen.
 */
function LandingStage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 justify-center bg-[radial-gradient(420px_300px_at_50%_28%,color-mix(in_oklab,var(--accent)_7%,transparent),transparent_70%)] px-[16px] py-[22px] md:bg-[radial-gradient(700px_420px_at_50%_30%,color-mix(in_oklab,var(--accent)_6%,transparent),transparent_70%)] md:p-0">
      <div className="flex w-full flex-col items-center gap-[16px] md:mt-[110px] md:w-auto md:flex-row md:items-center md:gap-[56px] md:self-start">
        {children}
      </div>
    </div>
  );
}
