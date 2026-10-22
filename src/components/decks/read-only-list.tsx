// The read-only deck list's shared pieces: the open precon page's (`open-precon-view.tsx`) and a friend's deck page's
// (`friend-deck-view.tsx`), which draw one anatomy. The group notes say what the READER owns; the basics line lists the
// basic lands at the foot of Lands, in Lands' figure and never in what the reader owns.
import { preconsCopy as copy } from "../../lib/copy/precons";

/** A group's note: how many of its distinct non-basic cards the reader owns. */
export function groupOwned(cards: readonly { oracleId: string; owned: boolean; basic?: boolean }[]) {
  // By oracle id: a precon's feed lists a card once per printing, and two printings are one card.
  const counted = new Map(cards.filter((c) => !c.basic).map((c) => [c.oracleId, c.owned]));
  return { owned: [...counted.values()].filter(Boolean).length, of: counted.size };
}

/** The Commander group's note, in words for one or two. */
export function commanderNote(cards: readonly { owned: boolean }[]) {
  const owned = cards.filter((c) => c.owned).length;
  if (cards.length === 1) return owned === 1 ? copy.group.own1 : copy.group.own0of1;
  if (cards.length === 2 && owned === 2) return copy.group.ownBoth;
  if (cards.length === 2 && owned === 0) return copy.group.ownNeither;
  return copy.group.own(owned, cards.length);
}

/** The basic lands, at the foot of Lands: in Lands' figure, never in what the reader owns (Q4). */
export function BasicsLine({ basics }: { basics: readonly { oracleId: string; name: string; quantity: number }[] }) {
  return (
    <p className="m-0 mt-[4px] flex flex-wrap items-baseline gap-x-[8px] rounded-[7px] border border-dashed border-[color:var(--border-dashed)] p-[8px_9px]">
      <span className="text-[13px] text-[color:var(--fg-muted)]">{basics.map((b) => `${b.name} ×${b.quantity}`).join(" · ")}</span>
      <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.group.basicTag}</span>
    </p>
  );
}
