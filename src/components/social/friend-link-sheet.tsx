"use client";

// Add a friend with friend links on (friend links R1, Add-Phone/Add-Desktop A1 to A9, Reset R1 to R3): one screen with
// the reader's own reusable link (QR on the shipped light plate, Share or Copy, the short code), what it does for someone
// new (the invites line), Reset link and code in place, then a friend's code typed in. Built from AddFriendBody's parts
// and classes; the boxes are the join flow's `CodeBoxes` in their letters form.

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { friendLinkCopy } from "../../lib/copy/friend-links";
import { socialCopy } from "../../lib/copy/social";
import { PersonText } from "../../lib/person-name";
import { qrPath } from "../../lib/social/client-rules";
import { FRIEND_CODE_ALPHABET, FRIEND_CODE_LENGTH } from "../../lib/social/friend-code";
import type { RequestOwner } from "../../lib/social/friend-requests";
import {
  loadFriendLinkAction, resetFriendLinkAction, sendCodeRequestAction, type FriendLinkView,
} from "../../app/friends/friend-link-actions";
import { CodeBoxes } from "../join/join-parts";
import { Face } from "./face";
import { SocialModal } from "./social-modal";

const c = friendLinkCopy;
const d = socialCopy.dialog;
const COPIED_MS = 2000;
const KICK = "m-0 font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-[color:var(--fg-faint)]";
const BTN = "inline-flex flex-none cursor-pointer items-center justify-center rounded-[8px] font-sans";

type Entry =
  | { kind: "typing"; chars: string; busy?: boolean }
  | { kind: "wrong" | "own" | "limited" | "failed"; chars: string }
  | { kind: "sent" | "alreadyFriends" | "nowFriends"; owner: RequestOwner };

type Reset = "idle" | "confirm" | "busy" | "done";

/**
 * What the box holds as the reader types: capitals, at most six, and only the code alphabet's characters, so a space, a
 * hyphen or a lookalike (0, O, 1, I, L) never lands in a box. The server reads the six with `normalizeFriendCode`.
 */
export function codeChars(raw: string): string {
  return [...raw.toUpperCase()].filter((ch) => FRIEND_CODE_ALPHABET.includes(ch)).join("").slice(0, FRIEND_CODE_LENGTH);
}

export function FriendLinkSheet({
  left,
  onClose,
  onEmail,
  returnFocusRef,
  say,
  toast,
  cached = null,
  onLoaded,
}: {
  /** Invites the reader has left, for the line under the link and the email row; null when the count could not be read. */
  left: number | null;
  onClose: () => void;
  /** Invite someone new by email: the shipped email path. Absent (no row) when the count could not be read. */
  onEmail?: () => void;
  /** The link this page already read, so a return from the email screen draws at once; and where a read is kept. */
  cached?: FriendLinkView | null;
  onLoaded?: (link: FriendLinkView) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** The shared toast, for a failure that leaves the sheet as it was (Reset failed). */
  say: (text: string, retry?: { label: string; run: () => void }) => void;
  /** The page's toast, drawn inside the dialog so its Try again is in the Tab trap. */
  toast?: ReactNode;
}) {
  const [link, setLinkState] = useState<FriendLinkView | null>(cached);
  const setLink = (next: FriendLinkView) => {
    setLinkState(next);
    onLoaded?.(next);
  };
  const [loadFailed, setLoadFailed] = useState(false);
  const [reset, setReset] = useState<Reset>("idle");
  const [entry, setEntry] = useState<Entry>({ kind: "typing", chars: "" });
  const boxes = useRef<HTMLInputElement>(null);

  async function load() {
    setLoadFailed(false);
    const out = await loadFriendLinkAction().catch(() => null);
    if (out?.ok) setLink(out.link);
    else setLoadFailed(true);
  }
  useEffect(() => {
    if (cached) return;
    // The first read sets state only when it answers, never synchronously in the effect.
    loadFriendLinkAction().then(
      (out) => (out.ok ? setLink(out.link) : setLoadFailed(true)),
      () => setLoadFailed(true),
    );
    // Once, on open: `cached` is read only to skip the first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doReset() {
    setReset("busy");
    const out = await resetFriendLinkAction().catch(() => null);
    if (out?.ok) {
      setLink(out.link);
      setReset("done");
      return;
    }
    setReset("idle");
    // Past the day's cap a retry would only be refused again (and counted): it gets no Try again.
    if (out && !out.ok && out.reason === "limited") say(c.reset.limited);
    else say(c.reset.failed, { label: c.sheet.retry, run: () => void doReset() });
  }

  async function send(chars: string) {
    setEntry({ kind: "typing", chars, busy: true });
    const out = await sendCodeRequestAction(chars).catch(() => null);
    if (out?.ok) setEntry({ kind: out.outcome, owner: out.owner });
    else setEntry({ kind: out ? (out.reason === "off" ? "failed" : out.reason) : "failed", chars });
  }

  const confirming = reset === "confirm" || reset === "busy";
  // The sheet opens only on a press, so it never renders on the server: the share check can run at first render.
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");
  return (
    <SocialModal title={d.title} sub={c.sheet.sub} closeLabel={d.close} onClose={onClose} returnFocusRef={returnFocusRef} overlay={toast}>
      <div className={confirming ? "opacity-[.38] transition-opacity" : ""} aria-hidden={confirming || undefined}>
        {link ? <OwnLink link={link} left={left} fresh={reset === "done"} canShare={canShare} /> : <LinkPending failed={loadFailed} retry={() => void load()} />}
      </div>

      {link ? (confirming ? (
        <div role="alertdialog" aria-labelledby="friend-link-reset" className="mt-[14px] flex flex-col gap-[6px] rounded-[12px] bg-[color:var(--surface-inset)] p-[14px] [border:1px_solid_var(--border-strong)]">
          <p id="friend-link-reset" className="m-0 text-[14px] font-semibold text-[color:var(--fg)]">{c.reset.title}</p>
          <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{c.reset.body}</p>
          <div className="mt-[8px] flex gap-[8px] max-md:flex-col">
            <button type="button" onClick={() => reset === "confirm" && void doReset()} aria-busy={reset === "busy" || undefined} className={`${BTN} h-[44px] border-0 bg-[color:var(--danger)] px-[16px] text-[14px] font-semibold text-[color:var(--fg)] md:h-[36px] md:text-[13px] ${reset === "busy" ? "opacity-60" : ""}`}>
              {reset === "busy" ? c.reset.busy : c.reset.confirm}
            </button>
            <button type="button" onClick={() => reset === "confirm" && setReset("idle")} className={`${BTN} h-[44px] bg-transparent px-[16px] text-[14px] text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] md:h-[36px] md:text-[13px]`}>
              {c.reset.keep}
            </button>
          </div>
        </div>
      ) : (
        <div className={`mt-[6px] flex ${canShare ? "max-md:justify-center" : ""}`}>
          <button type="button" onClick={() => setReset("confirm")} className="min-h-[44px] cursor-pointer border-0 bg-transparent px-0 font-sans text-[13px] font-medium text-[color:var(--fg-muted)] underline decoration-[color:var(--border-dashed)] underline-offset-[3px] md:min-h-[32px]">
            {c.reset.open}
          </button>
        </div>
      )) : null}

      <CodeSection entry={entry} boxes={boxes} onType={(chars) => setEntry({ kind: "typing", chars })} onSend={send} onAgain={() => {
        setEntry({ kind: "typing", chars: "" });
        requestAnimationFrame(() => boxes.current?.focus());
      }} />

      {onEmail ? <button type="button" onClick={onEmail} className={`mt-[14px] flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-[12px] rounded-[10px] bg-transparent px-[14px] text-left font-sans text-[13.5px] font-medium text-[color:var(--fg)] [border:1px_solid_var(--border)] md:min-h-[44px]`}>
        <span className="flex min-w-0 flex-col">
          <span>{c.sheet.email}</span>
          <span className="font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)]">{c.sheet.emailSub(left ?? 0)}</span>
        </span>
        <span aria-hidden className="text-[16px] text-[color:var(--fg-muted)]">›</span>
      </button> : null}
    </SocialModal>
  );
}

function LinkPending({ failed, retry }: { failed: boolean; retry: () => void }) {
  return (
    <div className="mt-[4px] flex min-h-[235px] flex-col items-center justify-center gap-[10px] md:min-h-[230px]" aria-busy={!failed || undefined}>
      {failed ? (
        <>
          <p role="alert" className="m-0 text-[13px] text-[color:var(--fg-body)]">{c.sheet.loadFailed}</p>
          <button type="button" onClick={retry} className={`${BTN} h-[40px] bg-transparent px-[14px] text-[13px] text-[color:var(--fg)] [border:1px_solid_var(--border-strong)]`}>{c.sheet.retry}</button>
        </>
      ) : <div className="h-[235px] w-[235px] rounded-[10px] bg-[color:var(--surface-sunken)] md:h-[206px] md:w-[206px]" />}
    </div>
  );
}

function OwnLink({ link, left, fresh, canShare }: { link: FriendLinkView; left: number | null; fresh: boolean; canShare: boolean }) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const qr = qrPath(link.url, 0);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(t);
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      // Copy failed (shipped): the field is shown and selected for a long press.
      setManual(true);
      requestAnimationFrame(() => {
        field.current?.focus();
        field.current?.select();
      });
    }
  }
  return (
    <>
      <figure className="m-0 mt-[4px] flex flex-col items-center gap-[8px]">
        <div className="rounded-[10px] bg-[#F4F5F8] p-[16px]">
          <svg role="img" aria-label={c.sheet.qrAria} viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" className="block h-[203px] w-[203px] md:h-[174px] md:w-[174px]">
            <path d={qr.d} className="fill-[color:var(--bg)]" />
          </svg>
        </div>
        <figcaption className="font-mono text-[10.5px] text-[color:var(--fg-faint)] max-md:hidden">{d.qrCaption}</figcaption>
      </figure>

      {canShare ? (
        <div className="mt-[18px] flex flex-col gap-[8px] md:hidden">
          <button type="button" onClick={() => navigator.share?.({ url: link.url, text: d.shareText }).catch(() => {})} className="flex h-[48px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border-0 bg-[color:var(--accent)] font-sans text-[15px] font-semibold text-[color:var(--bg)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4" /><path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" /></svg>
            {d.share}
          </button>
        </div>
      ) : null}

      <div className={`flex gap-[8px] ${canShare ? "mt-[8px] max-md:flex-col md:mt-[18px]" : "mt-[16px] md:mt-[18px]"}`}>
        <input ref={field} readOnly value={link.url} aria-label={c.sheet.linkAria} onFocus={(e) => e.currentTarget.select()} className={`h-[44px] min-w-0 flex-1 rounded-[8px] bg-[color:var(--surface-sunken)] px-[12px] font-mono text-[16px] [@media(pointer:fine)]:text-[12.5px] text-[color:var(--fg-body)] [border:1px_solid_var(--border-strong)] md:h-[40px] md:rounded-[6px] ${canShare && !manual ? "max-md:hidden" : ""}`} />
        <button type="button" onClick={copy} className={`flex-none cursor-pointer rounded-[8px] font-sans font-semibold ${copied ? "bg-[color:var(--elevated)] text-[color:var(--success)] [border:1px_solid_var(--border-strong)]" : canShare ? "bg-transparent text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] md:bg-[color:var(--accent)] md:text-[color:var(--bg)] md:[border:0]" : "border-0 bg-[color:var(--accent)] text-[color:var(--bg)]"} ${canShare ? "h-[44px] w-full text-[14px] max-md:font-medium md:h-[40px] md:w-auto md:rounded-[6px] md:px-[16px] md:text-[13px]" : "h-[44px] px-[14px] text-[13px] md:h-[40px] md:rounded-[6px] md:px-[16px]"}`}>
          {copied ? d.copied : d.copy}
        </button>
      </div>

      <div className="mt-[14px] flex items-center justify-between gap-[12px] rounded-[10px] bg-[color:var(--surface-sunken)] px-[14px] py-[10px] [border:1px_solid_var(--border)]">
        <span className="flex min-w-0 flex-col gap-[2px]">
          <span className={KICK}>{c.sheet.codeKicker}</span>
          <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">{c.sheet.codeHint}</span>
        </span>
        <span role="img" aria-label={c.sheet.codeAria(link.code)} className="font-mono text-[22px] font-semibold tracking-[.16em] text-[color:var(--fg)]">
          {link.code.slice(0, 3)}<span aria-hidden className="text-[color:var(--fg-faint)]">·</span>{link.code.slice(3)}
        </span>
      </div>

      <p className={`m-0 mt-[12px] font-mono text-[11px] leading-[1.55] text-[color:var(--fg-muted)] md:mt-[10px] ${canShare ? "max-md:text-center" : ""}`}>{c.sheet.meta}</p>
      {left === null ? null : (
        <p className={`m-0 mt-[4px] font-mono text-[11px] leading-[1.55] ${left > 0 ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg-faint)]"} ${canShare ? "max-md:text-center" : ""}`}>
          {left > 0 ? c.sheet.invitesLeft(left) : c.sheet.invitesNone}
        </p>
      )}
      {fresh ? (
        <p role="status" className={`m-0 mt-[8px] text-[12.5px] leading-[1.5] text-[color:var(--success)] ${canShare ? "max-md:text-center" : ""}`}>
          <span aria-hidden className="mr-[6px]">✓</span>{c.reset.done}
        </p>
      ) : null}
    </>
  );
}

function CodeSection({ entry, boxes, onType, onSend, onAgain }: {
  entry: Entry;
  boxes: RefObject<HTMLInputElement | null>;
  onType: (chars: string) => void;
  onSend: (chars: string) => void;
  onAgain: () => void;
}) {
  const head = (
    <>
      <p className="m-0 text-[13px] font-semibold text-[color:var(--fg)]">{c.code.title}</p>
      <p className="m-0 mt-[2px] text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{c.code.body}</p>
    </>
  );
  if (entry.kind === "sent" || entry.kind === "alreadyFriends" || entry.kind === "nowFriends") {
    const name = entry.owner.displayName;
    const [title, detail] = entry.kind === "sent" ? [c.code.sent(name), c.code.sentDetail(name)]
      : entry.kind === "nowFriends" ? [c.code.accepted(name), c.code.acceptedDetail(name)]
      : [c.code.already(name), c.code.alreadyDetail];
    return (
      <section className="mt-[18px] pt-[16px] [border-top:1px_solid_var(--border)]">
        {head}
        <div role="status" className={`mt-[10px] flex items-center gap-[12px] rounded-[10px] p-[12px] ${entry.kind === "nowFriends" ? "bg-[color:color-mix(in_oklab,var(--success)_6%,var(--surface-inset))]" : "bg-[color:var(--surface-inset)]"} [border:1px_solid_var(--border)]`}>
          <Face name={name} commander={entry.owner.commander} size={40} />
          <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="text-[14px] font-semibold text-[color:var(--fg)]">{entry.kind !== "alreadyFriends" ? <span aria-hidden className="mr-[6px] text-[color:var(--success)]">✓</span> : null}<PersonText text={title} /></span>
            <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-body)]"><PersonText text={detail} /></span>
          </span>
        </div>
        <button type="button" onClick={onAgain} className="mt-[4px] min-h-[44px] cursor-pointer border-0 bg-transparent px-0 font-sans text-[13px] font-medium text-[color:var(--accent-text)] md:min-h-[32px]">{c.code.another}</button>
      </section>
    );
  }
  const chars = "chars" in entry ? entry.chars : "";
  const busy = entry.kind === "typing" && entry.busy === true;
  const line = entry.kind === "wrong" ? c.code.wrong : entry.kind === "own" ? c.code.own : entry.kind === "limited" ? c.code.limited : entry.kind === "failed" ? c.code.failed : null;
  // A code the server could not answer (failed, or capped) can be sent again as it stands; a wrong one wants editing.
  const ready = chars.length === FRIEND_CODE_LENGTH && entry.kind !== "wrong" && entry.kind !== "own" && !busy;
  return (
    <section className="mt-[18px] pt-[16px] [border-top:1px_solid_var(--border)]">
      {head}
      <form className="mt-[12px] flex flex-col gap-[10px] md:flex-row md:items-center md:gap-[12px]" onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSend(chars);
      }}>
        <CodeBoxes
          letters digits={chars} label={c.code.aria} wrong={entry.kind === "wrong" || entry.kind === "own"} busy={busy}
          describedBy={line ? "friend-code-line" : undefined} inputRef={boxes}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onType(codeChars(e.target.value))}
        />
        <button type="submit" disabled={!ready} aria-busy={busy || undefined} className={`${BTN} h-[48px] w-full px-[18px] text-[15px] font-semibold md:h-[44px] md:w-auto md:text-[13.5px] ${ready || busy ? "border-0 bg-[color:var(--accent)] text-[color:var(--bg)]" : "cursor-default bg-transparent text-[color:var(--fg-locked)] [border:1px_solid_var(--border)]"} ${busy ? "!bg-[color:var(--accent-strong)]" : ""}`}>
          {busy ? c.code.sending : c.code.send}
        </button>
      </form>
      {line ? <p id="friend-code-line" role="alert" className="m-0 mt-[8px] text-[12.5px] leading-[1.45] text-[color:var(--danger)] max-md:text-center">{line}</p> : null}
    </section>
  );
}
