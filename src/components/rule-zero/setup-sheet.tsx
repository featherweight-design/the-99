"use client";
// Rule 0's setup (plan `2026-10-16-rule-zero.md` §PR 5; handoff boards `R1 - Setup-Phone` U1 to U4, `R1 -
// Setup-Desktop` V1 to V3). One sheet, three screens: who's playing (the pod's members as the pod card's own art seats,
// `role=checkbox`, 2 to 8), a deck for each seat, and one friend's decks. The shipped social modal draws it: the bottom
// sheet on the phone, the 640px dialog from md. Nothing is written until `Set the table` (or the setter's `Seats`
// saves); ✕ keeps nothing.
//
// A member who is not the viewer's friend can sit but has no control: their decks are never listed (G3). In `Seats`
// (`setup.tableId`), a player already seated keeps the deck they sit with, as `reseatTable` keeps it, so their row
// shows it with no control; only a new seat takes a pick.

import { useMemo, useRef, useState } from "react";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { socialCopy } from "../../lib/copy/social";
import { SEATS_MAX, SEATS_MIN } from "../../lib/social/client-rules";
import type { PodSetup, SeatedNow, SetupDeck, SetupMember } from "../../lib/social/rule-zero";
import type { SetupOutcome } from "../../app/friends/table/setup-actions";
import { SocialModal } from "../social/social-modal";
import { SeatArt } from "../social/seat-art";
import { faceInitials } from "../social/face";
import { FadingImg } from "../ui/hydrated-art";

const copy = ruleZeroCopy.setup;
const pods = socialCopy.pods;

export type SetupData = PodSetup & { tableId?: string; seated?: SeatedNow[] };

type Screen = { kind: "who" } | { kind: "decks" } | { kind: "friend"; publicId: string };

export const ACCENT_BUTTON =
  "inline-flex min-h-[44px] flex-none cursor-pointer items-center justify-center gap-[8px] whitespace-nowrap rounded-[10px] border-0 bg-[color:var(--accent)] px-[18px] font-sans text-[14.5px] font-semibold text-[color:var(--bg)] aria-disabled:cursor-default aria-disabled:opacity-40";
const ROW_ART = "relative flex h-[46px] w-[64px] flex-none items-center justify-center overflow-hidden rounded-[7px]";
const INITIALS =
  "bg-[radial-gradient(120px_80px_at_50%_40%,color-mix(in_oklab,var(--elevated)_50%,var(--border-dashed)),var(--surface))] font-display font-bold text-[color:var(--fg-muted)]";

export function SetupSheet({
  setup,
  onClose,
  onSave,
  onDone,
  onInvite,
}: {
  setup: SetupData;
  onClose: () => void;
  /** `setTableAction` or `reseatTableAction`, bound to the pod or the table. */
  onSave: (seats: { member: string; deck: string | null }[]) => Promise<SetupOutcome>;
  onDone: (tableId: string) => void;
  /** Add a friend › Invite someone new; absent with invites off, and the row with it (no space kept). */
  onInvite?: () => void;
}) {
  const kept = useMemo(() => new Map((setup.seated ?? []).map((s) => [s.publicId, s])), [setup.seated]);
  const you = setup.members.find((m) => m.kind === "you");
  const [seated, setSeated] = useState<string[]>(() =>
    setup.seated ? setup.seated.map((s) => s.publicId) : you ? [you.publicId] : [],
  );
  const [picks, setPicks] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(setup.members.map((m) => [m.publicId, m.start])),
  );
  const [screen, setScreen] = useState<Screen>({ kind: "who" });
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const byId = new Map(setup.members.map((m) => [m.publicId, m]));
  // Seating order: the seats a `Seats` keeps, in their order, then the members' own order.
  const ordered = [
    ...seated.filter((p) => kept.has(p)),
    ...setup.members.map((m) => m.publicId).filter((p) => seated.includes(p) && !kept.has(p)),
  ];
  const tooFew = seated.length < SEATS_MIN;
  const full = seated.length >= SEATS_MAX;

  function toggle(m: SetupMember) {
    if (m.kind === "you") return;
    setSeated((s) => (s.includes(m.publicId) ? s.filter((p) => p !== m.publicId) : s.length >= SEATS_MAX ? s : [...s, m.publicId]));
  }

  async function save() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const out = await onSave(ordered.map((p) => ({ member: p, deck: kept.has(p) ? null : seatable(byId.get(p)) ? picks[p] ?? null : null })));
      if (out.ok) onDone(out.tableId);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (screen.kind === "friend") {
    const m = byId.get(screen.publicId);
    if (!m) return null;
    const name = m.kind === "you" ? pods.you : m.displayName;
    const choose = (deck: string | null) => {
      setPicks((p) => ({ ...p, [m.publicId]: deck }));
      setScreen({ kind: "decks" });
    };
    return (
      <SocialModal
        title={m.kind === "you" ? copy.yourDecksTitle : copy.friendDecksTitle(name)}
        closeLabel={copy.close}
        onClose={onClose}
        onBack={() => setScreen({ kind: "decks" })}
        backLabel={copy.backToSeats}
        screen={`friend-${m.publicId}`}
        width={640}
      >
        <ul aria-label={m.kind === "you" ? copy.yourDecksTitle : copy.friendDecksList(name)} className="m-0 flex list-none flex-col gap-[2px] p-0 pt-[12px] md:pt-[16px]">
          {m.decks.map((d) => (
            <li key={d.deckId}>
              <button
                type="button"
                aria-pressed={picks[m.publicId] === d.deckId}
                onClick={() => choose(d.deckId)}
                className="flex min-h-[60px] w-full cursor-pointer items-center gap-[12px] rounded-[9px] border-0 bg-transparent px-[8px] py-[6px] text-left text-[color:var(--fg)] aria-pressed:bg-[color:var(--elevated)]"
              >
                <DeckArt deck={d} />
                <DeckText name={d.name} sub={d.commanderName} gap={4} />
              </button>
            </li>
          ))}
          {m.kind === "you" ? null : (
            <li>
              <button
                type="button"
                aria-pressed={picks[m.publicId] === null}
                onClick={() => choose(null)}
                className="flex min-h-[60px] w-full cursor-pointer items-center gap-[12px] rounded-[9px] border-0 bg-transparent px-[8px] py-[6px] text-left text-[color:var(--fg)] aria-pressed:bg-[color:var(--elevated)]"
              >
                <span aria-hidden className="flex h-[42px] w-[58px] flex-none items-center justify-center rounded-[7px] [border:1px_dashed_var(--border-dashed)] text-[16px] text-[color:var(--fg-muted)]">
                  ?
                </span>
                <DeckText name={copy.leaveItRow(name)} sub={copy.leaveItSub} gap={4} />
              </button>
            </li>
          )}
        </ul>
        <p className="m-0 pt-[18px] text-[13px] leading-[1.55] text-[color:var(--fg-muted)]">{copy.friendDecksFoot}</p>
      </SocialModal>
    );
  }

  if (screen.kind === "decks") {
    return (
      <SocialModal
        title={copy.decksTitle}
        sub={copy.decksSub}
        closeLabel={copy.close}
        onClose={onClose}
        screen="decks"
        width={640}
        footer={
          <>
            <button
              type="button"
              onClick={() => setScreen({ kind: "who" })}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-[6px] border-0 bg-transparent p-0 font-sans text-[13px] font-medium text-[color:var(--accent)] underline decoration-[color:color-mix(in_oklab,var(--accent)_50%,transparent)] underline-offset-[4px]"
            >
              <span aria-hidden>‹</span>
              {copy.back}
            </button>
            <button type="button" className={ACCENT_BUTTON} aria-disabled={busy || undefined} aria-busy={busy || undefined} onClick={() => void save()}>
              {copy.set}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[8px]">
          {ordered.map((p) => {
            const m = byId.get(p);
            return m ? <SeatRow key={p} member={m} kept={kept.get(p)} pick={picks[p] ?? null} onOpen={() => setScreen({ kind: "friend", publicId: p })} /> : null;
          })}
          {failed ? (
            <p role="alert" className="m-0 text-[13px] leading-[1.55] text-[color:var(--warning)]">
              {copy.failed}
            </p>
          ) : null}
        </div>
      </SocialModal>
    );
  }

  return (
    <SocialModal
      title={copy.whoTitle}
      sub={copy.whoSub(setup.podName)}
      closeLabel={copy.close}
      onClose={onClose}
      screen="who"
      width={640}
      footer={
        <>
          <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{copy.count(seated.length)}</span>
          <button type="button" className={ACCENT_BUTTON} aria-disabled={tooFew || undefined} onClick={() => (tooFew ? undefined : setScreen({ kind: "decks" }))}>
            {copy.next}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-[12px]">
        <div role="group" aria-label={copy.whoGroup} className="grid grid-cols-3 gap-x-[10px] gap-y-[12px] md:grid-cols-5">
          {setup.members.map((m) => {
            const on = seated.includes(m.publicId);
            const off = !on && (m.kind === "noDecks" || full);
            return (
              <MemberTile key={m.publicId} member={m} on={on} off={off} noDecks={m.kind === "noDecks" && !on} onToggle={() => (off ? undefined : toggle(m))} />
            );
          })}
        </div>
        {onInvite ? (
          <button
            type="button"
            onClick={onInvite}
            className="flex min-h-[56px] w-full cursor-pointer items-center gap-[12px] rounded-[10px] bg-transparent px-[12px] py-[8px] text-left text-[13.5px] leading-[1.45] text-[color:var(--fg-body)] [border:1.5px_dashed_var(--border-dashed)]"
          >
            <span aria-hidden className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] text-[16px] text-[color:var(--accent)] [border:1px_solid_var(--border-strong)]">
              +
            </span>
            <span>
              <b className="font-semibold text-[color:var(--fg)]">{copy.inviteTitle}</b>
              <br />
              {setup.owner === null ? copy.inviteBodyOwner : copy.inviteBody(setup.owner)}
            </span>
          </button>
        ) : null}
        {tooFew || full ? (
          <p role="status" className="m-0 text-[13px] leading-[1.55] text-[color:var(--warning)]">
            {tooFew ? copy.tooFew : copy.tooMany}
          </p>
        ) : null}
      </div>
    </SocialModal>
  );
}

/** A seat takes a pick only when its player's decks are listed: the viewer's own, and a friend's. */
const seatable = (m: SetupMember | undefined) => m !== undefined && (m.kind === "you" || m.kind === "hasDecks" || m.kind === "noDecks");

function MemberTile({ member, on, off, noDecks, onToggle }: { member: SetupMember; on: boolean; off: boolean; noDecks: boolean; onToggle: () => void }) {
  const tag = member.kind === "you" ? null : member.isOwner ? pods.ownerTag : member.kind === "picksOwn" ? pods.notFriendTag : null;
  const sub = noDecks ? copy.noDecks : member.kind === "picksOwn" ? copy.picksOwn : copy.decks(member.decks.length);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-disabled={off || member.kind === "you" || undefined}
      onClick={onToggle}
      className={`relative flex min-w-0 cursor-pointer flex-col gap-[6px] border-0 bg-transparent p-0 text-left text-[color:var(--fg)] aria-disabled:cursor-default ${off ? "opacity-[.42]" : ""}`}
    >
      <SeatArt art={member.commander?.artCropUri ?? null} name={member.displayName} ring={on}>
        {noDecks ? null : (
          <span
            className={`absolute right-[5px] top-[5px] flex h-[24px] w-[24px] items-center justify-center rounded-[7px] ${
              on
                ? "bg-[color:var(--accent)] text-[color:var(--bg)] [border:1.5px_solid_var(--accent)]"
                : "bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] [border:1.5px_solid_color-mix(in_oklab,var(--fg)_70%,transparent)]"
            }`}
          >
            {on ? (
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7.4 5.8 10 11 4" />
              </svg>
            ) : null}
          </span>
        )}
      </SeatArt>
      <span className="flex min-w-0 items-baseline gap-[5px] font-sans text-[13px] font-medium">
        <span className="min-w-0 truncate">{member.kind === "you" ? pods.you : member.displayName}</span>
        {tag ? <small className="flex-none whitespace-nowrap font-mono text-[10px] font-normal text-[color:var(--fg-muted)]">{tag}</small> : null}
      </span>
      <span className="truncate whitespace-nowrap font-mono text-[10px] text-[color:var(--fg-faint)]">{sub}</span>
    </button>
  );
}

function SeatRow({ member, kept, pick, onOpen }: { member: SetupMember; kept: SeatedNow | undefined; pick: string | null; onOpen: () => void }) {
  const name = member.kind === "you" ? pods.you : member.displayName;
  const deck = kept ? kept.deck : member.decks.find((d) => d.deckId === pick) ?? null;
  // A seat with a control: a new seat whose player has decks listed to the viewer.
  const control = !kept && seatable(member) && member.decks.length > 0;
  const you = member.kind === "you";
  const notFriend = member.kind === "picksOwn";
  const line = deck
    ? { name: deck.name, sub: deck.commanderName, accent: false }
    : you
      ? { name: copy.yourSeatWaits, sub: "", accent: false }
      : kept
      ? { name: copy.notFriendRow(name), sub: copy.leaveItSub, accent: false }
      : notFriend
        ? { name: copy.notFriendRow(name), sub: copy.notFriendSub, accent: false }
        : { name: copy.pick, sub: copy.leaveIt(name), accent: true };
  return (
    <button
      type="button"
      aria-disabled={!control || undefined}
      onClick={control ? onOpen : undefined}
      className="flex min-h-[64px] w-full cursor-pointer items-center gap-[12px] rounded-[10px] bg-[color:var(--surface-rail)] py-[8px] pl-[8px] pr-[6px] text-left text-[color:var(--fg)] [border:1px_solid_var(--border)] aria-disabled:cursor-default"
    >
      {deck?.artCropUri ? (
        <span aria-hidden className={ROW_ART}>
          <FadingImg src={deck.artCropUri} alt="" className="block h-full w-full object-cover" />
        </span>
      ) : (
        <span aria-hidden className={`${ROW_ART} ${INITIALS} text-[18px]`}>
          {faceInitials(member.displayName)}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex items-baseline font-sans text-[12px] font-medium text-[color:var(--fg-muted)]">
          {name}
          {notFriend ? <small className="ml-[6px] font-mono text-[10px] font-normal">{pods.notFriendTag}</small> : null}
        </span>
        <b
          className={`truncate whitespace-nowrap font-sans ${
            line.accent
              ? "text-[13px] font-medium text-[color:var(--accent)]"
              : deck
                ? "text-[14px] font-semibold"
                : "text-[14px] font-medium text-[color:var(--fg-body)]"
          }`}
        >
          {line.name}
        </b>
        <span className="truncate whitespace-nowrap font-mono text-[10.5px] text-[color:var(--fg-faint)]">{line.sub}</span>
      </span>
      <span aria-hidden className="flex w-[32px] flex-none items-center justify-center text-[color:var(--fg-faint)]">
        {control ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 2.5 9.5 7 5 11.5" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

function DeckArt({ deck }: { deck: SetupDeck }) {
  return (
    <span aria-hidden className="relative flex h-[42px] w-[58px] flex-none overflow-hidden rounded-[7px]">
      {deck.artCropUri ? <FadingImg src={deck.artCropUri} alt="" className="block h-full w-full object-cover" /> : <span className={`h-full w-full ${INITIALS}`} />}
    </span>
  );
}

function DeckText({ name, sub, gap }: { name: string; sub: string; gap: number }) {
  return (
    <span className="flex min-w-0 flex-col" style={{ gap }}>
      <b className="truncate whitespace-nowrap font-sans text-[14px] font-semibold">{name}</b>
      <span className="truncate whitespace-nowrap font-mono text-[10.5px] text-[color:var(--fg-faint)]">{sub}</span>
    </span>
  );
}
