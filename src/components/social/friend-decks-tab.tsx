// A friend's Decks tab (menu and Home PR 7; handoff G4): view-only tiles, each the commander's art with the deck's name
// on it, the commander, the status and the count. No press and no link: the deck's list is not the viewer's to open, and
// nothing here carries an id to open it by.

import type { FriendDeck } from "../../lib/social/decks";
import { socialCopy } from "../../lib/copy/social";
import { statusPillStyle } from "../../lib/decks/status-style";
import { StatusPillBadge } from "../decks/status-pill";

const p = socialCopy.friendPage;
const PILL_IN_FLOW = "inline-flex h-[19px] items-center self-start rounded-[5px] px-[7px] font-mono text-[10px]";

export function FriendDecksTab({ name, decks }: { name: string; decks: FriendDeck[] }) {
  if (decks.length === 0) {
    return (
      <div className="mt-[16px] flex flex-col gap-[6px] rounded-[12px] px-[20px] py-[22px] [border:1px_dashed_var(--border-dashed)] md:mt-[18px] md:px-[32px] md:py-[30px]">
        <p className="m-0 font-display text-[18px] font-bold text-[color:var(--fg)] [overflow-wrap:anywhere] md:text-[19px]">{p.decks.emptyTitle(name)}</p>
        <p className="m-0 max-w-[600px] text-[14px] leading-[1.6] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">{p.decks.emptyBody(name)}</p>
      </div>
    );
  }
  return (
    <>
      <p className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-faint)]">{p.decks.line(name)}</p>
      <ul className="m-0 mt-[12px] grid list-none grid-cols-1 gap-[12px] p-0 md:grid-cols-4 md:gap-[16px]">
        {decks.map((d, i) => {
          const fill = Math.min(100, Math.round((d.built / d.bodySize) * 100));
          const color = statusPillStyle(d.status).color as string;
          return (
            <li key={i} data-testid="friend-deck" className="overflow-hidden rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-inset)]">
              <div className="relative h-[120px]" style={{ background: "var(--surface-sunken)" }}>
                {d.artCropUri && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.artCropUri} alt="" loading={i < 4 ? "eager" : "lazy"} className="block h-full w-full object-cover" />
                )}
                <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(20,17,14,.9))" }} />
                <b className="absolute bottom-[8px] left-[12px] right-[12px] z-[2] truncate font-display text-[14px] font-bold text-[color:var(--fg)]">{d.name}</b>
              </div>
              <div className="flex flex-col gap-[8px] px-[12px] pb-[12px] pt-[10px]">
                <span className="truncate font-mono text-[10.5px] text-[color:var(--fg-body)]">
                  {d.commanderName}
                  {d.partnerName ? ` + ${d.partnerName}` : ""}
                </span>
                <StatusPillBadge status={d.status} className={PILL_IN_FLOW} />
                <span className="flex items-center gap-[10px]">
                  <span className="h-[3px] flex-1 overflow-hidden rounded-[2px] bg-[color:var(--border-strong)]">
                    <i className="block h-full" style={{ width: `${fill}%`, background: color }} />
                  </span>
                  <small className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{p.decks.figure(d.built, d.bodySize, d.status === "To buy" ? d.toBuy : 0)}</small>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
