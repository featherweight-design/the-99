"use client";
// Friend links R1 (proposal, account 2, 2026-11-12). Add a friend, one screen: the player's own reusable friend link
// (QR on the shipped light plate, the link with Copy or Share, and the short code), what it does for someone new
// (the invites line), Reset link and code, then a friend's code typed in. Built from AddFriendBody's own parts and
// classes; CodeBoxes' box is the join flow's, at 6 characters with a gap after 3.

import type { ReactNode } from "react";
import { qrPath } from "../../lib/social/client-rules";
import { Face } from "./face";
import { PersonText } from "../../lib/person-name";
import type { ProfileCommander } from "../../lib/social/commander";

export type CodeEntry =
  | { kind: "empty" }
  | { kind: "typing"; chars: string }
  | { kind: "busy"; chars: string }
  | { kind: "sent"; name: any; commander: ProfileCommander | null }
  | { kind: "friends"; name: any; commander: ProfileCommander | null }
  | { kind: "accepted"; name: any; commander: ProfileCommander | null }
  | { kind: "wrong"; chars: string }
  | { kind: "own"; chars: string };

export type ResetState = "idle" | "confirm" | "busy" | "done";

const BTN = "inline-flex flex-none cursor-pointer items-center justify-center rounded-[8px] font-sans";
const KICK = "m-0 font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-[color:var(--fg-faint)]";

export function FriendLinkBody({
  url, code, left, share, reset, entry, newCode,
}: {
  url: string; code: string; left: number; share: boolean; reset: ResetState; entry: CodeEntry;
  /** Just reset: the plate, link and code are the new ones, and the status line says so. */
  newCode?: boolean;
}) {
  const qr = qrPath(url, 0);
  const confirming = reset === "confirm" || reset === "busy";
  return (
    <>
      <div className={confirming ? "opacity-[.38] transition-opacity" : ""} aria-hidden={confirming || undefined}>
        <figure className="m-0 mt-[4px] flex flex-col items-center gap-[8px]">
          <div className="rounded-[10px] bg-[#F4F5F8] p-[16px]">
            <svg role="img" aria-label="QR code for your friend link" viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" className="block h-[203px] w-[203px] md:h-[174px] md:w-[174px]">
              <path d={qr.d} className="fill-[color:var(--bg)]" />
            </svg>
          </div>
          <figcaption className="font-mono text-[10.5px] text-[color:var(--fg-faint)] max-md:hidden">Scan with a phone camera</figcaption>
        </figure>

        {share ? (
          <div className="mt-[18px] flex flex-col gap-[8px] md:hidden">
            <button type="button" className="flex h-[48px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border-0 bg-[color:var(--accent)] font-sans text-[15px] font-semibold text-[color:var(--bg)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4" /><path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" /></svg>
              Share link
            </button>
          </div>
        ) : null}

        <div className={`flex gap-[8px] ${share ? "mt-[8px] md:mt-[18px]" : "mt-[16px] md:mt-[18px]"}`}>
          <input readOnly value={url} aria-label="Friend link" className={`h-[44px] min-w-0 flex-1 rounded-[8px] bg-[color:var(--surface-sunken)] px-[12px] font-mono text-[16px] [@media(pointer:fine)]:text-[12.5px] text-[color:var(--fg-body)] [border:1px_solid_var(--border-strong)] md:h-[40px] md:rounded-[6px] ${share ? "max-md:hidden" : ""}`} />
          <button type="button" className={`flex-none cursor-pointer rounded-[8px] font-sans font-semibold ${share ? "h-[44px] w-full bg-transparent text-[14px] font-medium text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] md:h-[40px] md:w-auto md:rounded-[6px] md:border-0 md:bg-[color:var(--accent)] md:px-[16px] md:text-[13px] md:font-semibold md:text-[color:var(--bg)]" : "h-[44px] border-0 bg-[color:var(--accent)] px-[14px] text-[13px] text-[color:var(--bg)] md:h-[40px] md:rounded-[6px] md:px-[16px]"}`}>
            Copy link
          </button>
        </div>

        {/* The code: read out across a table, or typed on another phone. Its own row, under the link. */}
        <div className="mt-[14px] flex items-center justify-between gap-[12px] rounded-[10px] bg-[color:var(--surface-sunken)] px-[14px] py-[10px] [border:1px_solid_var(--border)]">
          <span className="flex min-w-0 flex-col gap-[2px]">
            <span className={KICK}>Your code</span>
            <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">Type it in Add a friend</span>
          </span>
          <span aria-label={`Your code, ${code.split("").join(" ")}`} className="font-mono text-[22px] font-semibold tracking-[.16em] text-[color:var(--fg)]">
            {code.slice(0, 3)}<span aria-hidden className="text-[color:var(--fg-faint)]">·</span>{code.slice(3)}
          </span>
        </div>

        <p className={`m-0 mt-[12px] font-mono text-[11px] leading-[1.55] text-[color:var(--fg-muted)] md:mt-[10px] ${share ? "max-md:text-center" : ""}`}>
          Works for anyone, as often as you like, until you reset it.
        </p>
        {/* What it does for someone new: said here, beside the link that spends it, never under the head's press. */}
        <p className={`m-0 mt-[4px] font-mono text-[11px] leading-[1.55] ${left > 0 ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg-faint)]"} ${share ? "max-md:text-center" : ""}`}>
          {left > 0
            ? `Someone new to The 99 joins with one of your invites · ${left === 1 ? "1 invite left" : `${left} invites left`}`
            : "Out of invites: players on The 99 can still add you, but someone new can’t join through it yet."}
        </p>
        {newCode ? (
          <p role="status" className={`m-0 mt-[8px] text-[12.5px] leading-[1.5] text-[color:var(--success)] ${share ? "max-md:text-center" : ""}`}>
            ✓ New link and code. The old ones no longer work.
          </p>
        ) : null}
      </div>

      {confirming ? (
        <div role="alertdialog" aria-labelledby="reset-title" className="mt-[14px] flex flex-col gap-[6px] rounded-[12px] bg-[color:var(--surface-inset)] p-[14px] [border:1px_solid_var(--border-strong)]">
          <p id="reset-title" className="m-0 text-[14px] font-semibold text-[color:var(--fg)]">Reset your link and code?</p>
          <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">
            The old link, QR code and code stop working for anyone you’ve sent them to. Your friends stay, and so do requests already waiting.
          </p>
          <div className="mt-[8px] flex gap-[8px] max-md:flex-col">
            <button type="button" aria-busy={reset === "busy" || undefined} className={`${BTN} h-[44px] border-0 bg-[color:var(--danger)] px-[16px] text-[14px] font-semibold text-[color:var(--fg)] md:h-[36px] md:text-[13px] ${reset === "busy" ? "opacity-60" : ""}`}>
              {reset === "busy" ? "Resetting…" : "Reset link and code"}
            </button>
            <button type="button" className={`${BTN} h-[44px] bg-transparent px-[16px] text-[14px] text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] md:h-[36px] md:text-[13px]`}>
              Keep them
            </button>
          </div>
        </div>
      ) : (
        <div className={`mt-[6px] flex ${share ? "max-md:justify-center" : ""}`}>
          <button type="button" className="min-h-[44px] cursor-pointer border-0 bg-transparent px-0 font-sans text-[13px] font-medium text-[color:var(--fg-muted)] underline decoration-[color:var(--border-dashed)] underline-offset-[3px] md:min-h-[32px]">
            Reset link and code
          </button>
        </div>
      )}

      <CodeSection entry={entry} />

      <a className="mt-[14px] flex min-h-[48px] items-center justify-between gap-[12px] rounded-[10px] px-[14px] text-[13.5px] font-medium text-[color:var(--fg)] no-underline [border:1px_solid_var(--border)] md:min-h-[44px]">
        <span className="flex min-w-0 flex-col">
          <span>Invite someone new by email</span>
          <span className="font-mono text-[10.5px] font-normal text-[color:var(--fg-faint)]">{left > 0 ? `Uses an invite when they join · ${left} left` : "Out of invites"}</span>
        </span>
        <span aria-hidden className="text-[16px] text-[color:var(--fg-muted)]">›</span>
      </a>
    </>
  );
}

function Boxes({ chars, wrong, busy }: { chars: string; wrong: boolean; busy: boolean }) {
  return (
    <div role="group" aria-label="Friend’s code" className="group relative">
      <div aria-hidden className="flex justify-center gap-[6px] md:justify-start">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={`box-border flex h-[50px] w-[42px] items-center justify-center rounded-[8px] bg-[color:var(--surface-sunken)] font-mono text-[20px] font-semibold ${i === 3 ? "ml-[10px]" : ""} ${chars[i] ? "text-[color:var(--fg)]" : "text-[color:var(--fg-disabled)]"} ${wrong ? "[border:1px_solid_var(--danger)]" : chars[i] ? "[border:1px_solid_var(--accent)]" : "[border:1px_solid_var(--border-strong)]"} ${!busy && !wrong && i === Math.min(chars.length, 5) && chars.length < 6 ? "shadow-[0_0_0_2px_var(--accent)]" : ""} md:h-[44px] md:w-[38px] md:text-[18px]`}>
            {chars[i] ?? "·"}
          </span>
        ))}
      </div>
    </div>
  );
}

function CodeSection({ entry }: { entry: CodeEntry }) {
  const head = (
    <>
      <p className="m-0 text-[13px] font-semibold text-[color:var(--fg)]">Have a friend’s code?</p>
      <p className="m-0 mt-[2px] text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">Type it here to send them a friend request.</p>
    </>
  );
  let body: ReactNode;
  if (entry.kind === "sent" || entry.kind === "friends" || entry.kind === "accepted") {
    const [title, detail] =
      entry.kind === "sent" ? [["Request sent to ", entry.name], [entry.name, " sees it on Friends. You’re friends once they accept."]]
      : entry.kind === "accepted" ? [["You and ", entry.name, " are friends"], [entry.name, " had already sent you a request, so this answered it."]]
      : [["You and ", entry.name, " are already friends"], ["Nothing to send."]];
    body = (
      <div role="status" className={`mt-[10px] flex items-center gap-[12px] rounded-[10px] p-[12px] ${entry.kind === "accepted" ? "bg-[color:color-mix(in_oklab,var(--success)_6%,var(--surface-inset))]" : "bg-[color:var(--surface-inset)]"} [border:1px_solid_var(--border)]`}>
        <Face name={entry.name} commander={entry.commander} size={40} />
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="text-[14px] font-semibold text-[color:var(--fg)]">{entry.kind !== "friends" ? <span aria-hidden className="mr-[6px] text-[color:var(--success)]">✓</span> : null}<PersonText text={title as any} /></span>
          <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-body)]"><PersonText text={detail as any} /></span>
        </span>
      </div>
    );
    return (
      <section className="mt-[18px] pt-[16px] [border-top:1px_solid_var(--border)]">
        {head}
        {body}
        <button type="button" className="mt-[4px] min-h-[44px] cursor-pointer border-0 bg-transparent px-0 font-sans text-[13px] font-medium text-[color:var(--accent-text)] md:min-h-[32px]">Enter another code</button>
      </section>
    );
  }
  const chars = entry.kind === "empty" ? "" : entry.chars;
  const wrong = entry.kind === "wrong" || entry.kind === "own";
  const busy = entry.kind === "busy";
  const ready = chars.length === 6 && !wrong;
  return (
    <section className="mt-[18px] pt-[16px] [border-top:1px_solid_var(--border)]">
      {head}
      <div className="mt-[12px] flex flex-col gap-[10px] md:flex-row md:items-center md:gap-[12px]">
        <Boxes chars={chars} wrong={wrong} busy={busy} />
        <button type="button" disabled={!ready} aria-busy={busy || undefined} className={`${BTN} h-[48px] w-full px-[18px] text-[15px] font-semibold md:h-[44px] md:w-auto md:text-[13.5px] ${ready ? "border-0 bg-[color:var(--accent)] text-[color:var(--bg)]" : "bg-transparent text-[color:var(--fg-locked)] [border:1px_solid_var(--border)]"} ${busy ? "!bg-[color:var(--accent-strong)]" : ""}`}>
          {busy ? "Sending…" : "Send request"}
        </button>
      </div>
      {entry.kind === "wrong" ? <p role="alert" className="m-0 mt-[8px] text-[12.5px] leading-[1.45] text-[color:var(--danger)] max-md:text-center">No player has that code. Check it with them: a code stops working once it’s reset.</p> : null}
      {entry.kind === "own" ? <p role="alert" className="m-0 mt-[8px] text-[12.5px] leading-[1.45] text-[color:var(--danger)] max-md:text-center">That’s your own code. Type a friend’s.</p> : null}
    </section>
  );
}
