"use client";

// A reusable friend link's landing (friend links R1, boards Landing L1 to L7 and Signed-Out S1, S2). Signed in, opening
// the link sends the request once the page is mounted (G2: a GET render never writes, so a preview or a prefetch sends
// nothing); Withdraw takes it back (L3), Send it again sends it once more. Signed out, the owner is named (Q2) with Join
// (on one of their invites) and Sign in. Drawn on the shipped landing's card, column and stage.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { friendLinkCopy } from "../../lib/copy/friend-links";
import { socialCopy } from "../../lib/copy/social";
import { friendsReceiptPath, invitePath } from "../../lib/social/client-rules";
import type { LinkOwner } from "../../lib/social/link-landing";
import { joinFromLinkAction, sendLinkRequestAction, withdrawLinkRequestAction } from "../../app/friend/[token]/actions";
import { FriendCard, type CardFace } from "./friend-card";
import { LandingColumn, LandingStage } from "./friend-landing";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "./friend-landing-buttons";
import { PendingReporter } from "../shell/pending-reporter";

const c = friendLinkCopy.landing;
/** The quiet press under the sent column (board L1): Withdraw request. */
const QUIET_LINK = "min-h-[44px] cursor-pointer border-0 bg-transparent px-[4px] font-sans text-[13.5px] font-medium text-[color:var(--fg-muted)] underline decoration-[color:var(--border-dashed)] underline-offset-[3px] disabled:cursor-default md:min-h-[32px]";
const l = socialCopy.landing;

type State =
  | { kind: "sending" }
  | { kind: "sent"; again: string | null }
  | { kind: "withdrawn" }
  | { kind: "both" }
  | { kind: "friends" }
  | { kind: "self" }
  | { kind: "ended" }
  | { kind: "failed" }
  | { kind: "limited" };

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function LinkLanding({ token, owner, initial, sentAt, friendsSince = null }: {
  token: string;
  owner: LinkOwner;
  /** What the server read: the reader's own link, friends already, or a request to send. */
  initial: "self" | "friends" | "send";
  /** A request sent before this visit (waiting, or declined, which reads the same): L2 names its date. */
  sentAt: string | null;
  /** When the two became friends, for the card's type line (L5). */
  friendsSince?: string | null;
}) {
  const [state, setState] = useState<State>(initial === "self" ? { kind: "self" } : initial === "friends" ? { kind: "friends" } : { kind: "sending" });
  const sent = useRef(false);

  async function send(again: string | null) {
    setState({ kind: "sending" });
    const out = await sendLinkRequestAction(token).catch(() => null);
    if (!out) return setState({ kind: "failed" });
    if (out.ok) {
      if (out.outcome === "nowFriends") return setState({ kind: "both" });
      if (out.outcome === "alreadyFriends") return setState({ kind: "friends" });
      return setState({ kind: "sent", again });
    }
    if (out.reason === "self") return setState({ kind: "self" });
    if (out.reason === "ended") return setState({ kind: "ended" });
    // A capped send gets no retry: it would only be refused again until tomorrow.
    if (out.reason === "limited") return setState({ kind: "limited" });
    return setState({ kind: "failed" });
  }

  useEffect(() => {
    if (initial !== "send" || sent.current) return;
    sent.current = true;
    void send(sentAt);
    // Once per mount: the server's reading decides whether a send is due.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [withdrawLine, setWithdrawLine] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  async function withdraw() {
    if (withdrawing) return;
    setWithdrawing(true);
    setWithdrawLine(null);
    const done = await withdrawLinkRequestAction(owner.publicId).catch(() => false);
    setWithdrawing(false);
    if (done) setState({ kind: "withdrawn" });
    else setWithdrawLine(c.withdrawFailed);
  }

  const name = owner.displayName;
  const face = (type: string, rules: CardFace["rules"]): CardFace => ({ name, commander: owner.commander, type, rules });
  // Go to Friends is the secondary press on every signed-in state (boards L1 to L5); the primary is the state's own act.
  const toFriends = <Link className={SECONDARY_BUTTON} href={friendsReceiptPath(owner.publicId)}>{l.toFriends}<PendingReporter href={friendsReceiptPath(owner.publicId)} /></Link>;
  const [copied, setCopied] = useState(false);
  async function copyOwn() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${invitePath(token)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  let card: CardFace | null = face(c.typeSent, c.sentRules(name));
  let up = true;
  let column: ReactNode;
  switch (state.kind) {
    case "sending":
    case "sent":
      column = (
        <LandingColumn kicker={l.kicker} title={c.sentTitle(name)} body={c.sentBody(name)}
          fine={withdrawLine ?? (state.kind === "sent" && state.again ? c.sentAgain(day(state.again)) : undefined)}
          landing={state.kind === "sending" ? "wait" : "go"}
          actions={<>{toFriends}<button type="button" className={QUIET_LINK} onClick={() => void withdraw()} disabled={state.kind === "sending" || withdrawing} aria-busy={withdrawing || undefined}>{c.withdraw}</button></>} />
      );
      break;
    case "withdrawn":
      card = face(c.typeWithdrawn, c.sentRules(name));
      up = false;
      column = (
        <LandingColumn kicker={l.kicker} title={c.withdrawnTitle} body={c.withdrawnBody(name)}
          actions={<><button type="button" className={PRIMARY_BUTTON} onClick={() => void send(null)}>{c.sendAgain}</button><Link className={SECONDARY_BUTTON} href="/">{l.toHome}<PendingReporter href="/" /></Link></>} />
      );
      break;
    case "both":
      card = face(l.typeFriend(day(new Date().toISOString())), l.friendRules(name));
      column = <LandingColumn kicker={l.kicker} title={c.bothTitle(name)} body={c.bothBody(name)} actions={toFriends} />;
      break;
    case "friends":
      card = face(friendsSince ? l.typeFriend(day(friendsSince)) : l.typeRequest, l.friendRules(name));
      column = <LandingColumn kicker={l.kicker} title={l.alreadyTitle(name)} body={c.alreadyBody} actions={toFriends} />;
      break;
    case "self":
      card = face(l.typeOwn, c.ownRules);
      column = <LandingColumn kicker={l.kicker} title={l.selfTitle} body={c.selfBody}
        actions={<button type="button" className={PRIMARY_BUTTON} onClick={() => void copyOwn()}>{copied ? l.copied : l.copyLink}</button>} />;
      break;
    case "failed":
      card = face(l.typeRequest, c.sentRules(name));
      column = (
        <LandingColumn kicker={l.kicker} title={c.failedTitle} body={c.failedBody}
          actions={<button type="button" className={PRIMARY_BUTTON} onClick={() => void send(sentAt)}>{l.retry}</button>} />
      );
      break;
    case "limited":
      card = face(l.typeRequest, c.sentRules(name));
      column = <LandingColumn kicker={l.kicker} title={c.limitedTitle} body={c.limitedBody} actions={toFriends} />;
      break;
    case "ended":
      card = null;
      up = false;
      column = <LandingColumn kicker={l.kicker} title={l.endedTitle} body={c.endedBody} actions={<Link className={PRIMARY_BUTTON} href="/">{l.toHome}<PendingReporter href="/" /></Link>} />;
      break;
  }
  return (
    <LandingStage>
      <FriendCard face={card} up={up} arrival signature />
      {column}
    </LandingStage>
  );
}

/** Signed out (S1, S2): the owner named; Join on one of their invites unless they have none; Sign in comes back here. */
export function LinkLandingSignedOut({ token, owner, outOfInvites }: { token: string; owner: LinkOwner; outOfInvites: boolean }) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const name = owner.displayName;
  async function join() {
    if (joining) return;
    setJoining(true);
    setLine(null);
    const out = await joinFromLinkAction(token).catch(() => null);
    if (out?.ok) return router.push(out.path);
    setJoining(false);
    setLine(out && !out.ok && out.reason === "busy" ? c.joinBusy : c.joinFailed);
  }
  const signIn = (
    <SignInButton mode="redirect" forceRedirectUrl={invitePath(encodeURIComponent(token))}>
      <button type="button" className={outOfInvites ? PRIMARY_BUTTON : SECONDARY_BUTTON}>{l.signIn}</button>
    </SignInButton>
  );
  return (
    <>
      <FriendCard face={{ name, commander: owner.commander, type: l.typeRequest, rules: outOfInvites ? c.signedOutRulesNone(name) : c.signedOutRules(name) }} up arrival signature />
      <LandingColumn
        kicker={l.brand}
        signedOut
        title={c.signedOutTitle(name)}
        body={outOfInvites ? c.signedOutBodyNone : c.signedOutBody(name)}
        actions={outOfInvites ? signIn : (
          <>
            <button type="button" className={PRIMARY_BUTTON} onClick={() => void join()} aria-busy={joining || undefined}>{joining ? c.joining : c.join}</button>
            {signIn}
          </>
        )}
        fine={line ?? (outOfInvites ? c.noneFine(name) : c.joinFine(name))}
      />
    </>
  );
}

/** L7 with friend links on: a reset or unknown link, face down, naming nobody, saying a link can be reset. */
export function LinkEnded() {
  return (
    <LandingStage>
      <FriendCard face={null} up={false} />
      <LandingColumn kicker={l.kicker} title={l.endedTitle} body={c.endedBody} actions={<Link className={SECONDARY_BUTTON} href="/friends">{l.toFriends}<PendingReporter href="/friends" /></Link>} />
    </LandingStage>
  );
}
