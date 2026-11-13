"use client";
// Path 2 of Add a friend, "Invite someone new" (plan `2026-10-16-invites.md`, A5, D4, E1 to E6): both ways on one
// screen. At the table, `Show an invite QR` (the QR screen is `invite-qr.tsx`); by email, the field and `Send
// invitation`. The sub is the count line.
//
// The email: Send checks the address's SHAPE only (E1, `isEmailShape`), and once the error is shown it is checked
// again as they type. Send is outlined until the shape holds, then filled (E2). In flight (E3) the field is locked,
// the QR press is held, and Send reads `Sending…`; Escape still closes, and the send carries on. Every send that
// reached the server answers the one way, `Invitation sent` (E4), in a box that replaces the form, with `Invite
// someone else` (an empty field again) unless that was the last invite (E5). `failed`, `off` and a throw are the
// toast with Try again, the typed address kept (E6). `out` (a race with another tab) redraws the page, whose count
// then draws no email half.
//
// Out of invites, the email half is not drawn (the screen E5 draws once the last invite is spent has no field either),
// and the count line above is the reason. With a live QR (R4) Show an invite QR stays live: it shows that QR again.
// With none, the QR press is held too. A disabled field a phone cannot type into, drawn as if live, is what a
// home-screen iPhone met before this.

import { useEffect, useId, useRef, useState } from "react";
import type { InviteCount } from "../../lib/invites/rules";
import { isEmailShape, normalizeEmail } from "../../lib/invites/rules";
import { inviteCopy } from "../../lib/copy/invites";
import { sendEmailInviteAction } from "../../app/friends/invite-actions";
import { TextField } from "../ui/text-field";
import { InviteCountLine } from "./invite-count-line";
import type { SocialToastState } from "./social-toast";
import { usePressWait } from "./press-wait";

const t = inviteCopy.path;

export function QrIcon({ size }: { size: 18 | 16 | 26 | 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={size > 20 ? 1.6 : 1.8} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d={size > 20 ? "M14 14h3v3h-3zM18 18h3v3h-3zM14 20h1M20 14h1" : "M14 14h3v3h-3zM18 18h3v3h-3"} />
    </svg>
  );
}

export const KICKER = "m-0 mb-[6px] mt-[4px] font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-[color:var(--fg-faint)]";
/** The QR screen's and path 2's filled press: full width at phone, its own width at desktop. */
export const FILLED_PRESS =
  "flex h-[48px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border-0 bg-[color:var(--accent)] px-[16px] font-sans text-[15px] font-semibold text-[color:var(--bg)] md:h-[44px] md:w-auto md:rounded-[6px] md:text-[13px]";
const HELD_PRESS = "!cursor-default !bg-[color:var(--elevated)] !text-[color:var(--fg-locked)]";

type Stage = { kind: "form" } | { kind: "sending" } | { kind: "sent"; last: boolean };

export function InviteNew({
  count,
  onShowQr,
  qrPending,
  say,
  onRefresh,
  clearToast,
  emailOnly = false,
}: {
  count: InviteCount;
  /** Show an invite QR: the action and the QR screen are the sheet's. */
  onShowQr: () => void;
  /** The QR is being made or fetched again. */
  qrPending: boolean;
  say: (text: string, retry?: SocialToastState["retry"]) => void;
  /** Redraw the page, so the count moves. */
  onRefresh: () => void;
  /** Put away a Try again toast from an earlier send when a new one starts. */
  clearToast?: () => void;
  /** Friend links R1 (G7): the invite QR is retired, so the screen is the email half alone. */
  emailOnly?: boolean;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [bad, setBad] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "form" });
  const sending = stage.kind === "sending";
  const emailHeld = count.out;
  const qrHeld = (count.out && !count.liveQr) || sending;
  const shaped = isEmailShape(email);

  // One send at a time, guarded by a ref: a Try again toast holds a callback from the render that raised it, whose
  // `sending` was false, and every send reserves an invite for seven days. The toast's press runs the CURRENT send
  // (through `latest`), so it reads the address and the count as they are now.
  const inFlight = useRef(false);
  const latest = useRef<() => Promise<void>>(async () => {});
  // A send answers after Back or Close has taken this screen away: nothing is drawn and no toast is raised, since a
  // Try again would run a screen that no longer stands. The redraw an `out` race asks for still happens.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // One id per send (`repeatAnswer` in send.ts): the server never reserves, asks Clerk or mails twice for one id, and
  // answers a repeat with what the first came to. The id is kept for its address until a send answers `ok` (on time;
  // a late `ok` keeps it, so Try again is answered `ok` from its row). Every other answer (`failed`, `out`, `invalid`,
  // a throw, a give-up) keeps it, so Try again repeats the same request and can never send a second email. Where the
  // server knows nothing was mailed it frees the id itself, and the repeat then sends afresh. Another address is a new
  // send, with a new id.
  const request = useRef<{ email: string; id: string } | null>(null);
  const wait = usePressWait();
  async function send() {
    // One invite action at a time: a QR still being made holds Send too.
    if (inFlight.current || sending || emailHeld || qrPending) return;
    if (!shaped) {
      setBad(true);
      return;
    }
    inFlight.current = true;
    clearToast?.();
    const last = count.left <= 1;
    setStage({ kind: "sending" });
    const address = normalizeEmail(email);
    if (request.current?.email !== address) request.current = { email: address, id: crypto.randomUUID() };
    const asked = request.current;
    const call = sendEmailInviteAction(email, asked.id).catch(() => null);
    const out = await wait(call);
    inFlight.current = false;
    if (out === "late") {
      // Given up on (`press-wait.ts`): a reply that still comes is read as news, never drawn over the failure said
      // here, and keeps the id. One that reached the server moved the count, so the page reads again, whether or not
      // this screen still stands (as an on-time `out` does).
      void call.then((late) => {
        if (late && (late.ok || late.reason === "out")) onRefresh();
      });
      if (!mounted.current) return;
      setStage({ kind: "form" });
      say(t.sendFailed, { label: t.retry, run: () => void latest.current() });
      return;
    }
    if (out?.ok && request.current === asked) request.current = null;
    if (!mounted.current) {
      if (out && !out.ok && out.reason === "out") onRefresh();
      return;
    }
    if (out?.ok) {
      setStage({ kind: "sent", last });
      setEmail("");
      setBad(false);
      return;
    }
    setStage({ kind: "form" });
    if (out && !out.ok && out.reason === "invalid") setBad(true);
    else if (out && !out.ok && out.reason === "out") onRefresh();
    else say(t.sendFailed, { label: t.retry, run: () => void latest.current() });
  }
  useEffect(() => {
    latest.current = send;
  });

  return (
    <>
      <InviteCountLine id={`${id}-count`} count={count} thisQr={!emailOnly} className="mb-[16px]" />
      {emailOnly ? null : (<>
      <p className={KICKER}>{t.tableKicker}</p>
      <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{t.tableBody}</p>
      <div className="mt-[12px] flex">
        <button
          type="button"
          onClick={() => {
            if (!qrHeld && !qrPending) onShowQr();
          }}
          aria-disabled={qrHeld || qrPending || undefined}
          aria-describedby={count.out && !count.liveQr ? `${id}-count` : undefined}
          className={`${FILLED_PRESS} ${qrHeld ? HELD_PRESS : ""}`}
        >
          <span className="md:hidden"><QrIcon size={18} /></span>
          <span className="max-md:hidden"><QrIcon size={16} /></span>
          {t.showQr}
        </button>
      </div>
      </>)}

      {/* Out of invites: no email half (see the header). The sent box stays, as E5 keeps it after the last invite. */}
      {emailHeld && stage.kind !== "sent" ? null : (
      <>
      {emailOnly ? null : (
      <div aria-hidden className="mb-[14px] mt-[18px] flex items-center gap-[12px] font-mono text-[11px] text-[color:var(--fg-faint)]">
        <i className="h-px flex-1 bg-[color:var(--border-strong)]" />
        {t.or}
        <i className="h-px flex-1 bg-[color:var(--border-strong)]" />
      </div>
      )}

      <p className={KICKER}>{t.emailKicker}</p>
      {stage.kind === "sent" ? (
        <div role="status" className="flex flex-col gap-[6px] rounded-[12px] bg-[color:var(--surface)] px-[16px] pb-[6px] pt-[16px] [border:1px_solid_var(--border-strong)] md:pb-[4px] md:pt-[14px]">
          <b className="flex items-center gap-[8px] font-display text-[17px] font-bold text-[color:var(--fg)]">
            <i aria-hidden className="text-[16px] not-italic text-[color:var(--success)]">✓</i>
            {t.sent}
          </b>
          <span className="text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{t.sentBody}</span>
          {/* The last invite, or the count ran out since (another tab): nothing to send again, so no Invite someone else. */}
          {stage.last || emailHeld ? (
            <span className="pb-[12px] font-mono text-[11px] md:pb-[10px] text-[color:var(--fg-faint)]">{t.lastOne}</span>
          ) : (
            <button
              type="button"
              onClick={() => setStage({ kind: "form" })}
              className="min-h-[44px] cursor-pointer self-start border-0 bg-transparent px-[2px] py-0 font-sans text-[13.5px] font-medium text-[color:var(--accent-text)] md:min-h-[36px]"
            >
              {t.again}
            </button>
          )}
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor={`${id}-email`} className="mb-[6px] block text-[13px] font-semibold text-[color:var(--fg)]">{t.emailLabel}</label>
          <div className="flex flex-col md:flex-row md:flex-wrap md:gap-x-[8px]">
            <TextField
              id={`${id}-email`}
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t.emailPlaceholder}
              value={email}
              readOnly={sending || qrPending}
              aria-invalid={bad || undefined}
              aria-describedby={bad ? `${id}-err` : `${id}-hint`}
              onChange={(e) => {
                setEmail(e.target.value);
                if (bad) setBad(!isEmailShape(e.target.value));
              }}
              className={`h-[48px] min-w-0 px-[12px] text-[16px] md:h-[40px] md:flex-1 md:rounded-[6px] [@media(pointer:fine)]:md:text-[14px] focus:border-[color:var(--accent)] ${bad ? "!border-[color:var(--danger)]" : ""} ${sending ? "text-[color:var(--fg-muted)]" : ""}`}
            />
            <button
              type="submit"
              aria-disabled={sending || qrPending || undefined}
              className={`order-2 h-[48px] w-full flex-none cursor-pointer rounded-[8px] px-[16px] font-sans text-[15px] md:order-1 md:mt-0 md:h-[40px] md:w-auto md:rounded-[6px] md:text-[13px] ${
                sending ? "mt-[12px] border-0 bg-[color:var(--accent-strong)] font-semibold text-[color:var(--bg)]"
                  : shaped ? "mt-[12px] border-0 bg-[color:var(--accent)] font-semibold text-[color:var(--bg)]"
                  : "mt-[8px] bg-transparent font-medium text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] md:font-semibold"
              }`}
            >
              {sending ? t.sending : t.send}
            </button>
            {/* Phone: under the field, above Send. Desktop: under the field+Send row, above the hint. */}
            {bad ? <p id={`${id}-err`} role="alert" className="order-1 m-0 mt-[8px] text-[12.5px] leading-[1.45] text-[color:var(--danger)] md:order-2 md:basis-full">{t.notAnEmail}</p> : null}
          </div>
          <p id={`${id}-hint`} className="m-0 mt-[8px] font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)]">{t.emailHint}</p>
        </form>
      )}
      </>
      )}
    </>
  );
}
