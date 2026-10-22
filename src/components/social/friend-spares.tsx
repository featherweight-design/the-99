"use client";
// Friends with a spare of one card (Social R2 PR 8a; handoff R3 `Option B opened` O1 and O2, `Spares` S3): the
// stand-ins modal's section, and the read that feeds it. View only (Q3): a row names the friend, the pods their share
// reaches the reader through and how many they hold spare, and nothing on it is pressable.
//
// With spare requests on (`SPARE_REQUESTS_ENABLED`, plan `2026-10-22-spare-requests.md` PR 3b; handoff
// `design_handoff_the99_spare_requests`, calls 2, 4 and 6), each row is one line of status with ONE thing on the right
// (Ask, Ask instead, Ask again, or Requested, Accepted, Declined), the foot line moves behind an ⓘ on the head, and one
// state sentence sits under the rows. Off, the section is as shipped.

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import type { FriendSpare } from "../../lib/social/spares";
import type { AskStateLine } from "../../lib/social/spare-requests";
import { SPARE_REQUEST_DAYS } from "../../lib/social/spare-request-rules";
import { spareCopy } from "../../lib/copy/social";
import { printedFaceName } from "../../lib/collection/browse";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { InfoTip } from "../ui/info-tip";
import { Face } from "./face";
import { SocialToast, type SocialToastState } from "./social-toast";

/** One Ask or Ask instead from the modal: the friend, the card and the copies the row is short. */
export type AskPress = {
  friend: { publicId: string; displayName: string };
  oracleId: string;
  copies: number;
  /** The open ask Ask instead withdraws; absent for a plain Ask (or Ask again). */
  fromRequestId?: string;
};

/** Spare requests on this surface (`SPARE_REQUESTS_ENABLED` for the reader), or null with the switch off. */
export type RequestsCtx = {
  /** The reader's shown asks for one card, newest first, as the route served them and as the presses since moved them. */
  asksFor: (oracleId: string) => readonly AskStateLine[];
  /** Sends the ask; true once the action answered ok (and the asks moved), false on any refusal or failure. */
  ask: (press: AskPress) => Promise<boolean>;
};

/** Provided by `FriendSparesProvider` beside its own context; null outside it or with the switch off. */
export const SpareRequestsContext = createContext<RequestsCtx | null>(null);

/** An ask the asker still holds open: the stored open ask, whatever G3 derives of it at read (it still blocks the card). */
const isOpen = (a: AskStateLine) => a.state === "open" || a.state === "unavailable" || a.state === "unneeded";

/** The spare glyph's mark on the row and in the key (call 4): requested while an ask is open, accepted after a yes. */
export type SpareMark = "requested" | "accepted" | null;

export function cardMark(asks: readonly AskStateLine[]): SpareMark {
  if (asks.some(isOpen)) return "requested";
  if (asks.some((a) => a.state === "yes")) return "accepted";
  return null;
}

/** What one friend's row draws on the right, from the reader's shown asks for the card (newest first). */
export type RowAsk =
  | { kind: "ask" }
  | { kind: "requested"; daysLeft: number }
  | { kind: "askInstead"; fromRequestId: string; from: string }
  | { kind: "accepted" }
  | { kind: "declined" }
  | { kind: "askAgain" };

/**
 * One ask per card (Q6): the friend holding the open ask reads Requested, and every other friend Ask instead, which
 * moves it. A No holds that friend back for the cooldown (a shown No is inside it: both are 14 days), so Declined offers
 * no Ask; a Yes reads Accepted; an expiry offers Ask again; anyone else Ask.
 */
export function rowAsk(asks: readonly AskStateLine[], publicId: string): RowAsk {
  const open = asks.find(isOpen);
  if (open && open.holder.publicId === publicId) return { kind: "requested", daysLeft: open.daysLeft ?? 0 };
  const mine = asks.filter((a) => a.holder.publicId === publicId);
  if (mine.some((a) => a.state === "no")) return { kind: "declined" };
  if (mine.some((a) => a.state === "yes")) return { kind: "accepted" };
  if (open) return { kind: "askInstead", fromRequestId: open.id, from: open.holder.displayName };
  if (mine[0]?.state === "expired") return { kind: "askAgain" };
  return { kind: "ask" };
}

/** The one sentence under the rows for the state they are in, or null (Shopping and Asker-States boards). */
export function stateLine(rows: readonly { name: string; ask: RowAsk }[]): string | null {
  const instead = rows.find((r) => r.ask.kind === "askInstead");
  if (instead && instead.ask.kind === "askInstead") return spareCopy.request.oneAtATime(instead.ask.from, instead.name);
  if (rows.some((r) => r.ask.kind === "accepted")) return spareCopy.request.whenYours;
  if (rows.length > 0 && rows.every((r) => r.ask.kind === "declined")) return spareCopy.request.nobodyElse;
  return null;
}

/**
 * The two-people glyph with its mark (`.sg`, `.sg.asked`, `.sg.yes`): fact ink plain, an accent dot at its top right
 * once requested, success ink with a ticked dot at its foot once accepted. The dot's ring is the row's own ground, and
 * the tick is drawn in the ground's ink (`--bg`, the board's fixed dark ink in the dark theme) rather than a hex.
 */
export function MarkedSpareGlyph({ mark, size, testId }: { mark: SpareMark; size: number; testId?: string }) {
  return (
    <span
      data-testid={testId}
      data-mark={mark ?? "spare"}
      className={`relative inline-flex ${mark === "accepted" ? "text-[color:var(--success)]" : "text-[color:var(--fact)]"}`}
    >
      <SpareGlyph size={size} />
      {mark === "requested" ? (
        <span
          aria-hidden="true"
          className="absolute right-[-3px] top-[-2px] size-[7px] rounded-full bg-[color:var(--accent)] shadow-[0_0_0_1.5px_var(--row-bg,var(--bg))]"
        />
      ) : null}
      {mark === "accepted" ? (
        <>
          <span
            aria-hidden="true"
            className="absolute bottom-[-1px] right-[-4px] size-[8px] rounded-full bg-[color:var(--success)] shadow-[0_0_0_1.5px_var(--row-bg,var(--bg))]"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-[2px] right-[-1.5px] z-[1] h-[2px] w-[3.5px] -rotate-45 [border-bottom:1.3px_solid_var(--bg)] [border-left:1.3px_solid_var(--bg)]"
          />
        </>
      ) : null}
    </span>
  );
}

/**
 * One card's spares from the uncached route (`GET /api/friend-spares`). Null on any failure: a spare is absent on
 * failure (G3), never an error the modal has to draw.
 */
export async function fetchCardSpares(oracleId: string): Promise<FriendSpare[] | null> {
  try {
    const res = await fetch(`/api/friend-spares?ids=${encodeURIComponent(oracleId)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { spares?: FriendSpare[] } | null;
    return Array.isArray(body?.spares) ? body.spares.filter((s) => s.oracleId === oracleId) : null;
  } catch {
    return null;
  }
}

/**
 * The card's spares as the modal reads them: `loading` until the route answers, then the rows (empty when nobody
 * has one, or when the read failed). Off (`enabled` false) it reads nothing and is settled at once with none.
 */
export function useCardSpares(oracleId: string, enabled: boolean): FriendSpare[] | "loading" {
  const [read, setRead] = useState<{ oracleId: string; spares: FriendSpare[] } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void fetchCardSpares(oracleId).then((spares) => {
      if (live) setRead({ oracleId, spares: spares ?? [] });
    });
    return () => {
      live = false;
    };
  }, [oracleId, enabled]);
  if (!enabled) return [];
  return read?.oracleId === oracleId ? read.spares : "loading";
}

/** Most spares first, then by name (R1 decision 16's order for people). */
export function orderSpares(spares: readonly FriendSpare[]): FriendSpare[] {
  return [...spares].sort((a, b) =>
    b.spare - a.spare
    || a.friend.displayName.localeCompare(b.friend.displayName, "en-US", { sensitivity: "base" })
    || (a.friend.publicId < b.friend.publicId ? -1 : 1));
}

/** The two-people glyph the spare marker and count chip draw (R3 `.spm`, `.sp2`). */
export function SpareGlyph({ size }: { size: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="16.5" cy="9.5" r="2.6" />
      <path d="M15.5 14.2c2.6-.3 4.6 1.3 5.1 4.3" />
    </svg>
  );
}

/** What the section needs of the card to Ask: its id, its name for the presses' names, and the copies it is short. */
export type SectionCard = Pick<DeckDetailCard, "oracleId" | "name" | "printedName" | "layout"> & { quantity?: number };

/**
 * The section: its head with `view only`, a row per friend, and the foot line saying what a spare is. With spare
 * requests on (and the card given), the rows ask instead (`RequestSection`).
 */
export function FriendSpareSection({ spares, card }: { spares: readonly FriendSpare[]; card?: SectionCard }) {
  const requests = useContext(SpareRequestsContext);
  if (requests && card) return <RequestSection spares={spares} card={card} requests={requests} />;
  const rows = orderSpares(spares);
  return (
    <section aria-label={spareCopy.modalTitleSpares} data-testid="friend-spares" className="flex flex-col">
      <div className="flex items-center justify-between gap-[12px] pb-[6px]">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--fg-faint)]">{spareCopy.section(rows.length)}</span>
        <span className="font-mono text-[11.5px] text-[color:var(--fg-faint)]">{spareCopy.viewOnly}</span>
      </div>
      <ul role="list" className="m-0 list-none p-0">
        {rows.map((s) => (
          <li key={s.friend.publicId} data-testid="friend-spare" className="flex items-center gap-[12px] py-[9px]">
            <Face name={s.friend.displayName} commander={s.friend.commander} size={30} />
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <b className="truncate text-[15px] font-semibold text-[color:var(--fg)]">{s.friend.displayName}</b>
              {/* The pods wrap rather than truncate: they are why this friend can see you, and an ellipsis hid the second
                  one at 390 (bb's R2 walk). */}
              <span className="font-mono text-[11.5px] leading-[1.45] text-[color:var(--fg-faint)] [overflow-wrap:anywhere] [text-wrap:pretty]">
                {spareCopy.via(s.friend.pods)}
              </span>
            </span>
            <span className="inline-flex h-[22px] flex-none items-center gap-[6px] rounded-[4px] px-[7px] font-mono text-[11.5px] text-[color:var(--fact)] bg-[color-mix(in_oklab,var(--fact)_14%,transparent)]">
              <SpareGlyph size={13} />
              {spareCopy.count(s.spare)}
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 mt-[4px] text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]">{spareCopy.foot}</p>
    </section>
  );
}

const ASK_BASE =
  "flex h-[36px] min-w-[64px] flex-none cursor-pointer items-center justify-center whitespace-nowrap rounded-[9px] bg-transparent px-[14px] font-sans text-[13px] disabled:cursor-default md:h-[32px] md:rounded-[8px]";
const ASK = `${ASK_BASE} font-semibold text-[color:var(--accent-text)] [border:1px_solid_var(--accent)]`;
const ASK_ALT = `${ASK_BASE} font-medium text-[color:var(--fg-body)] [border:1px_solid_var(--border-strong)]`;
const STATUS = "inline-flex flex-none items-center gap-[6px] whitespace-nowrap font-sans text-[13px] font-medium";

/** The rows with Ask (`.fsx2`, `.fsr`): one sub line and one thing on the right per friend, the ⓘ, the state line. */
function RequestSection({ spares, card, requests }: { spares: readonly FriendSpare[]; card: SectionCard; requests: RequestsCtx }) {
  const tipId = useId();
  const rows = orderSpares(spares).map((s) => ({ s, name: s.friend.displayName, ask: rowAsk(requests.asksFor(card.oracleId), s.friend.publicId) }));
  const line = stateLine(rows);
  const cardName = printedFaceName(card);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const seq = useRef(0);
  // FOCUS AFTER AN ASK. The pressed Ask gives way to the row's Requested, so the focused control leaves the document
  // and focus would fall to <body>. It lands on that status instead (focusable, so a screen reader reads Requested),
  // unless the reader has moved on (as `StandInsSheet` does after a take).
  const listRef = useRef<HTMLUListElement | null>(null);
  // A ref read after every render: the ask's answer redraws this section (the provider's asks move), and that render
  // is the one whose status takes focus.
  const landOn = useRef<string | null>(null);
  useEffect(() => {
    const friend = landOn.current;
    if (!friend) return;
    landOn.current = null;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    const row = [...(listRef.current?.querySelectorAll<HTMLElement>("li[data-friend]") ?? [])].find((li) => li.dataset.friend === friend);
    row?.querySelector<HTMLElement>('[data-testid="friend-spare-status"]')?.focus();
  });
  async function press(s: FriendSpare, fromRequestId?: string) {
    if (busy) return;
    setBusy(s.friend.publicId);
    const ok = await requests.ask({
      friend: { publicId: s.friend.publicId, displayName: s.friend.displayName },
      oracleId: card.oracleId,
      copies: Math.max(1, card.quantity ?? 1),
      fromRequestId,
    });
    setBusy(null);
    if (!ok) setToast({ id: ++seq.current, text: spareCopy.request.failed });
    else landOn.current = s.friend.publicId;
  }
  return (
    <section aria-label={spareCopy.modalTitleSpares} data-testid="friend-spares" className="flex flex-col">
      {/* The head anchors the ⓘ's tip (`.tip`, 26px down from the head's top). From md the modal is only as tall as its
          rows, so a tip drawn down would be cut at the modal's foot: there it opens up, over the Replacing box. */}
      <div className="relative flex items-center justify-between gap-[12px] pb-[6px] font-mono text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--fg-faint)]">
        <span className="flex items-center">
          {spareCopy.section(rows.length)}
          <InfoTip
            id={tipId}
            label={spareCopy.request.tipLabel}
            lines={[spareCopy.request.tip]}
            className="inline-flex"
            buttonClassName="ml-[6px] border-[color:var(--border-strong)] font-serif text-[11px] font-semibold italic normal-case tracking-normal aria-expanded:border-[color:var(--accent)] aria-expanded:text-[color:var(--accent-text)]"
            tipClassName="left-0 right-auto top-[26px] w-[min(300px,100%)] gap-0 rounded-[9px] px-[12px] py-[10px] font-sans normal-case tracking-normal shadow-[0_8px_24px_rgba(0,0,0,0.35)] md:bottom-[calc(100%+2px)] md:top-auto md:w-[min(300px,100%)]"
          />
        </span>
      </div>
      <ul ref={listRef} role="list" className="m-0 list-none p-0">
        {rows.map(({ s, ask }) => (
          <li key={s.friend.publicId} data-testid="friend-spare" data-friend={s.friend.publicId} data-ask={ask.kind} className="flex min-h-[52px] items-center gap-[12px] py-[9px]">
            <Face name={s.friend.displayName} commander={s.friend.commander} size={30} />
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <b className="truncate text-[15px] font-semibold leading-[normal] text-[color:var(--fg)]">{s.friend.displayName}</b>
              <span data-testid="friend-spare-sub" className="truncate font-mono text-[11.5px] leading-[1.45] text-[color:var(--fg-faint)]">
                <em className="not-italic text-[color:var(--fact)]">{spareCopy.request.count(s.spare)}</em>
                {" · "}
                {ask.kind === "requested"
                  ? spareCopy.request.daysLeft(ask.daysLeft)
                  : ask.kind === "askAgain"
                    ? spareCopy.request.noAnswer(SPARE_REQUEST_DAYS)
                    : spareCopy.request.pods(s.friend.pods)}
              </span>
            </span>
            <RowEnd ask={ask} friend={s.friend.displayName} card={cardName} busy={busy === s.friend.publicId} locked={busy !== null}
              onAsk={() => void press(s, ask.kind === "askInstead" ? ask.fromRequestId : undefined)} />
          </li>
        ))}
      </ul>
      {line ? <p data-testid="friend-spares-line" className="m-0 mt-[4px] text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]">{line}</p> : null}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </section>
  );
}

/** The row's one right element: a press for Ask, Ask instead and Ask again, one word for the rest. */
function RowEnd({ ask, friend, card, busy, locked, onAsk }: {
  ask: RowAsk; friend: string; card: string; busy: boolean; locked: boolean; onAsk: () => void;
}) {
  const r = spareCopy.request;
  if (ask.kind === "ask" || ask.kind === "askAgain" || ask.kind === "askInstead") {
    const [label, aria] = ask.kind === "ask" ? [r.ask, r.askAria(friend, card)]
      : ask.kind === "askAgain" ? [r.askAgain, r.askAgainAria(friend, card)]
        : [r.askInstead, r.askInsteadAria(friend, card)];
    return (
      <button type="button" data-testid="friend-spare-ask" aria-label={aria} aria-busy={busy || undefined} disabled={locked}
        onClick={onAsk} className={ask.kind === "askInstead" ? ASK_ALT : ASK}>
        {label}
      </button>
    );
  }
  if (ask.kind === "requested") {
    return (
      <span data-testid="friend-spare-status" tabIndex={-1} className={`${STATUS} text-[color:var(--accent-text)]`}>
        <i aria-hidden="true" className="size-[7px] rounded-full bg-[color:var(--accent)]" />
        {r.requested}
      </span>
    );
  }
  if (ask.kind === "accepted") {
    return (
      <span data-testid="friend-spare-status" tabIndex={-1} className={`${STATUS} text-[color:var(--success)]`}>
        <i aria-hidden="true" className="text-[12px] not-italic">✓</i>
        {r.accepted}
      </span>
    );
  }
  return (
    <span data-testid="friend-spare-status" tabIndex={-1} className={`${STATUS} text-[color:var(--fg-muted)]`}>
      <i aria-hidden="true" className="size-[7px] rounded-full bg-[color:var(--fg-faint)]" />
      {r.declined}
    </span>
  );
}
