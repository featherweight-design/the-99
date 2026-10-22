"use client";
// A friend's Spares tab (menu and Home PR 7; board `Friends`): the full cards the friend offers, each with its spare
// count, cards on the reader's wishlist first and marked under the count. View only: a press on the card opens card
// details, as every card does, and nothing asks for the card (the request flow is a later round, G5).

import type { FriendSpareList } from "../../lib/social/spares";
import { socialCopy } from "../../lib/copy/social";
import { CardDetailProvider, CardDetailTrigger, cardDetailCopy, type SiblingCard } from "../cards/card-detail-provider";
import { HydratedImg } from "../ui/hydrated-art";

const p = socialCopy.friendPage;
const EAGER_TILES = 4;

export function FriendSparesTab({ name, spares }: { name: string; spares: FriendSpareList | null }) {
  if (spares === null) return <Empty title={p.spares.noneTitle(name)} body={p.spares.noneBody(name)} />;
  if (spares.lines.length === 0) return <Empty title={p.spares.emptyTitle(name)} body={p.spares.emptyBody(name)} />;
  const { lines } = spares;
  const siblings: SiblingCard[] = lines.map((l) => ({ oracleId: l.oracleId, name: l.name, imageUri: l.imageUri }));
  return (
    <>
      <p className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-faint)]">{p.spares.line(spares.pods)}</p>
      <CardDetailProvider>
        {/* The board's grid: two columns on a phone, six from desktop. */}
        <ul className="m-0 mt-[12px] grid list-none grid-cols-2 gap-x-[8px] gap-y-[12px] p-0 md:grid-cols-6 md:gap-[20px]">
          {lines.map((line, i) => {
            const count = p.spares.count(line.spare);
            return (
              <li key={line.oracleId} data-testid="spare-tile" className="flex min-w-0 flex-col gap-[6px]">
                <CardDetailTrigger
                  oracleId={line.oracleId}
                  name={line.name}
                  siblings={siblings}
                  imageUri={line.imageUri}
                  ariaLabel={`${cardDetailCopy.triggerAria(line.name)}, ${count}${line.onWishlist ? `, ${p.spares.onWishlist}` : ""}`}
                  className="relative block w-full cursor-pointer overflow-hidden p-0 [aspect-ratio:63/88] [border-radius:4.5%/3.2%] [border:1px_solid_var(--border)] bg-[color:var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                >
                  {line.imageUri ? (
                    <HydratedImg
                      eager={i < EAGER_TILES}
                      src={line.imageUri}
                      alt=""
                      decoding="async"
                      className="absolute inset-0 block h-full w-full object-cover object-center"
                    />
                  ) : (
                    // No art: the name in the card's place, so the spare can be told apart without opening it.
                    <span aria-hidden data-testid="spare-name" className="absolute inset-0 flex items-center justify-center p-[10px] text-center text-[12px] font-semibold leading-[1.3] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">
                      {line.name}
                    </span>
                  )}
                </CardDetailTrigger>
                <span className="flex flex-col gap-[3px] font-mono text-[10.5px] text-[color:var(--fg-muted)]">
                  <span>{count}</span>
                  {line.onWishlist && (
                    <span data-testid="spare-on-wishlist" className="inline-flex items-center gap-[4px] text-[color:var(--accent-text)]">
                      <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                        <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
                      </svg>
                      {p.spares.onWishlist}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </CardDetailProvider>
    </>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-[16px] flex flex-col gap-[6px] rounded-[12px] px-[20px] py-[22px] [border:1px_dashed_var(--border-dashed)] md:mt-[18px] md:px-[32px] md:py-[30px]">
      <p className="m-0 font-display text-[18px] font-bold text-[color:var(--fg)] [overflow-wrap:anywhere] md:text-[19px]">{title}</p>
      <p className="m-0 max-w-[600px] text-[14px] leading-[1.6] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">{body}</p>
    </div>
  );
}
