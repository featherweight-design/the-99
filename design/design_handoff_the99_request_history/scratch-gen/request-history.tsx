"use client";
// PROPOSAL (card request history R1, issue #2984; account 2, 2026-11-18). `/friends/requests`: every spare request the
// reader made (You asked) and every one made of them (Asked of you), newest first, grouped by month, 30 at a time.
// Rows are Your requests' shipped rows (`RequestPicture` shape, kicker, title, line) with no ✕ and no Ask again: the
// live list keeps every action, so history only shows. The whole row opens card details (`useCardDetail`).
// Ex-friends' requests are not read (the friend grant join, `check:social-reads`); a foot line says so only when the
// reader has some. Withdrawn asks never show on the holder's side (they were never told).
import Link from "next/link";
import { useState } from "react";
import { PersonInitials, PersonText, personText, type PersonParts, type ThirdPartyName } from "../../lib/person-name";
import { FadingImg } from "../ui/hydrated-art";
import { ART_CROP_TRIM } from "../ui/art-crop-trim";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { BAND, PANEL, PanelEmpty } from "./section-panel";

export type HistoryRow = {
  id: string;
  card: { name: string; imageUri: string | null };
  friend: { displayName: ThirdPartyName; commander: { artCropUri: string | null } | null };
  state: "open" | "yes" | "no" | "expired" | "withdrawn";
  createdAt: Date;
  /** Answered, expired or withdrawn at; null while open. */
  closedAt: Date | null;
  deckName: string | null;
  copies: number;
  daysLeft: number | null;
};

export const historyCopy = {
  back: "‹ Friends",
  title: "Request history",
  line: "Every spare you’ve asked for, and every one asked of you. Newest first.",
  tabs: { asked: "You asked", ofYou: "Asked of you" },
  kind: { open: "Requested", yes: "Accepted", no: "Declined", expired: "No answer", withdrawn: "Withdrawn" },
  ofYouOpen: "Waiting on you",
  mine: {
    open: (f: ThirdPartyName, c: string) => personText`You asked ${f} for ${c}`,
    yes: (f: ThirdPartyName, c: string) => personText`${f} can spare ${c}`,
    no: (f: ThirdPartyName, c: string) => personText`${f} is keeping ${c}`,
    expired: (f: ThirdPartyName, c: string) => personText`${f} didn’t answer about ${c}`,
    withdrawn: (f: ThirdPartyName, c: string) => personText`You withdrew your request to ${f} for ${c}`,
  },
  theirs: (f: ThirdPartyName, c: string, n: number) => (n > 1 ? personText`${f} asked you for ${n} ${c}` : personText`${f} asked you for ${c}`),
  asked: (deck: string | null, on: string) => (deck ? `For ${deck} · asked ${on}` : `Asked ${on}`),
  openMine: (deck: string | null, days: number) => `${deck ? `For ${deck} · ` : ""}still open, ${days} days left`,
  openTheirs: (days: number) => `${days} days left. Answer it under Waiting on you.`,
  theirsYes: "You said yes. The handover is between you.",
  theirsNo: "You said no.",
  theirsExpired: "It ran out after 14 days without an answer.",
  older: "Show older requests",
  exFriends: "Requests with people you’re no longer friends with don’t show here. Add them back and they return.",
  emptyAsked: { title: "You haven’t asked for a spare yet", body: "Ask a friend from a card’s spares in Shopping or on their Spares tab." },
  emptyOfYou: { title: "Nobody has asked you for a spare yet", body: "When a friend asks for one of your spares, it waits on you on Friends." },
  entry: "History ›",
  noneOpenTitle: "Nothing open right now",
  noneOpenBody: "Ask a friend for a spare from Shopping or their Spares tab. Every past request is in History.",
} as const;
const h = historyCopy;

const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", ...o }).format(d);
const day = (d: Date) => fmt(d, { month: "short", day: "numeric" });
const month = (d: Date) => fmt(d, { month: "long", year: "numeric" });

function rowText(a: HistoryRow, dir: "asked" | "ofYou"): { kind: string; ink: string; at: Date; title: PersonParts; detail: string } {
  const at = a.closedAt ?? a.createdAt;
  const ink = a.state === "open" ? "text-[color:var(--accent-text)]" : a.state === "yes" ? "text-[color:var(--success)]" : "text-[color:var(--fg-faint)]";
  if (dir === "asked") {
    const detail = a.state === "open" ? h.openMine(a.deckName, a.daysLeft ?? 0) : h.asked(a.deckName, day(a.createdAt));
    return { kind: h.kind[a.state], ink, at, title: h.mine[a.state](a.friend.displayName, a.card.name), detail };
  }
  const detail = a.state === "open" ? h.openTheirs(a.daysLeft ?? 0) : a.state === "yes" ? h.theirsYes : a.state === "no" ? h.theirsNo : h.theirsExpired;
  return { kind: a.state === "open" ? h.ofYouOpen : h.kind[a.state], ink, at, title: h.theirs(a.friend.displayName, a.card.name, a.copies), detail };
}

function Picture({ a }: { a: HistoryRow }) {
  return (
    <span aria-hidden className="relative h-[64px] w-[46px]">
      {a.card.imageUri ? (
        <FadingImg src={a.card.imageUri} alt="" className="block h-[64px] w-[46px] rounded-[3px] object-cover shadow-[0_2px_6px_rgba(0,0,0,.45)]" />
      ) : (
        <span className="block h-[64px] w-[46px] rounded-[3px] bg-[color:var(--surface-sunken)]" />
      )}
      <span className={`absolute -bottom-[5px] -right-[6px] flex h-[24px] w-[24px] items-center justify-center overflow-hidden rounded-[7px] bg-[color:var(--elevated)] font-mono text-[9px] font-semibold text-[color:var(--fg-muted)] [border:1.5px_solid_var(--surface-inset)] ${a.friend.commander?.artCropUri ? ART_CROP_TRIM.box : ""}`}>
        {a.friend.commander?.artCropUri
          ? <FadingImg src={a.friend.commander.artCropUri} alt="" className="block h-full w-full object-cover" style={ART_CROP_TRIM.img} />
          : <PersonInitials n={a.friend.displayName} />}
      </span>
    </span>
  );
}

export function HistoryList({ rows, dir, more }: { rows: readonly HistoryRow[]; dir: "asked" | "ofYou"; more: boolean }) {
  const groups: { label: string; rows: HistoryRow[] }[] = [];
  for (const a of rows) {
    const label = month(a.createdAt);
    if (groups.at(-1)?.label !== label) groups.push({ label, rows: [] });
    groups.at(-1)!.rows.push(a);
  }
  return (
    <div className="flex flex-col">
      {groups.map((g) => (
        <section key={g.label} className={`${PANEL} mt-[16px]! first:mt-[18px]!`}>
          <h2 className={BAND}>{g.label}<span className="pr-[8px] font-sans text-[12.5px] font-medium normal-case tracking-normal">{g.rows.length}</span></h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {g.rows.map((a) => {
              const t = rowText(a, dir);
              return (
                <li key={a.id} className="[&+&]:[border-top:1px_solid_var(--border)]">
                  <button type="button" data-history-row className="grid w-full cursor-pointer grid-cols-[46px_minmax(0,1fr)] items-center gap-x-[12px] border-0 bg-transparent px-[14px] py-[12px] text-left md:gap-x-[14px] md:px-[16px] hover:bg-[color:var(--surface-hover,transparent)]">
                    <Picture a={a} />
                    <div className="flex min-w-0 flex-col gap-[3px]">
                      <p className="m-0 flex min-w-0 items-center gap-[7px]">
                        <span className={`truncate font-mono text-[9.5px] font-medium uppercase tracking-[.12em] ${t.ink}`}>{t.kind}</span>
                        <small className="font-mono text-[10px] text-[color:var(--fg-faint)]">{day(t.at)}</small>
                      </p>
                      <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--fg)] [overflow-wrap:anywhere]"><PersonText text={t.title} /></p>
                      <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">{t.detail}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {more && (
        <div className="mt-[14px] flex justify-center">
          <button type="button" className="flex min-h-[44px] cursor-pointer items-center rounded-[8px] bg-transparent px-[16px] font-sans text-[13px] font-medium text-[color:var(--fg)] [border:1px_solid_var(--border)] md:min-h-[36px]">{h.older}</button>
        </div>
      )}
    </div>
  );
}

function Empty({ dir }: { dir: "asked" | "ofYou" }) {
  const e = dir === "asked" ? h.emptyAsked : h.emptyOfYou;
  return (
    <div className={`${PANEL} mt-[18px]!`}>
      <PanelEmpty size="lg" title={e.title} body={e.body} />
    </div>
  );
}

export function RequestHistory({ asked, ofYou, tab: initial, more = false, exFriends = false }: {
  asked: readonly HistoryRow[]; ofYou: readonly HistoryRow[]; tab: "asked" | "ofYou"; more?: boolean; exFriends?: boolean;
}) {
  const [tab, setTab] = useState(initial);
  const rows = tab === "asked" ? asked : ofYou;
  return (
    <div className="mx-auto box-border w-full max-w-[720px] px-[16px] pb-[60px] pt-[22px] md:px-0 md:pt-[36px]">
      <Link href="/friends" className="text-[14px] text-[color:var(--fg-muted)] no-underline hover:text-[color:var(--fg)]">{h.back}</Link>
      <h1 className="m-0 mt-[14px] font-display text-[24px] font-bold text-[color:var(--fg)] md:text-[28px]">{h.title}</h1>
      <p className="m-0 mt-[4px] text-[13px] text-[color:var(--fg-muted)]">{h.line}</p>
      <div className="mt-[18px] flex">
        <SegmentedSwitch kind="tabs" ariaLabel={h.title} size="compact" fill value={tab} onChange={setTab}
          segments={[{ value: "asked", label: h.tabs.asked }, { value: "ofYou", label: h.tabs.ofYou }]} />
      </div>
      {rows.length === 0 ? <Empty dir={tab} /> : <HistoryList rows={rows} dir={tab} more={more} />}
      {exFriends && <p className="m-0 mt-[18px] text-[12.5px] leading-[1.5] text-[color:var(--fg-faint)]">{h.exFriends}</p>}
    </div>
  );
}
