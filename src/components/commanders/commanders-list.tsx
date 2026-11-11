"use client";

// The Commanders list: the rows a reader reads down, drawn from rows handed in. The signed-in page (`commanders-view.tsx`)
// and, later, the landing demo (from the fictional fixture) both draw it, so it holds no fetch, sort, server action or
// per-reader state: the hide wiring comes in through `hideSlot` and `hideProps`, and the demo leaves them out.
// Listed in `PUBLIC_SURFACE_COMPONENTS` (`scripts/lib/public-reads.mjs`) so it stays that way.
import type { ReactNode, MutableRefObject, Ref } from "react";
import { ArrivalOrder } from "@/components/ui/arrival-queue";
import type { CommanderRowItem } from "../../lib/commanders/rankings";
import { CommanderRow } from "./commander-row";
import { commanderDetailHref } from "./list-nav";

type Hide = { onHide: () => void; hideRef?: Ref<HTMLButtonElement> };

export function CommandersList({
  rows,
  rankBySlug,
  avail,
  wasWindowed = false,
  itemRefs,
  hideSlot,
  hideProps,
  trailing,
  hrefFor,
}: {
  rows: readonly CommanderRowItem[];
  /** Each slug's place in the whole ranking, which the windowed rows do not carry. */
  rankBySlug: ReadonlyMap<string, number>;
  avail: Parameters<typeof commanderDetailHref>[1];
  /** Where a row's press goes: the signed-in detail page unless a host that has no session (the landing demo) names its own, or null for a row that links nowhere. */
  hrefFor?: (r: CommanderRowItem) => string | null;
  /** The list was cut to a window: each row takes focus (`tabIndex -1`) so a reveal can land on the first new one. */
  wasWindowed?: boolean;
  itemRefs?: MutableRefObject<(HTMLLIElement | null)[]>;
  /** A row's replacement (the standing-hide Undo line); null draws the row. */
  hideSlot?: (r: CommanderRowItem, i: number) => ReactNode | null;
  /** The hide glyph's press and ref; absent, the row draws no glyph. */
  hideProps?: (r: CommanderRowItem, i: number) => Hide;
  /** One last item after the rows (the reveal control). */
  trailing?: ReactNode;
}) {
  return (
    <ArrivalOrder>
      <ul className="flex flex-col gap-[10px] sm:gap-[12px] list-none p-0 m-0">
        {rows.map((r, i) => (
          <li
            key={r.slug}
            tabIndex={wasWindowed ? -1 : undefined}
            ref={
              wasWindowed && itemRefs
                ? (el) => {
                    itemRefs.current[i] = el;
                  }
                : undefined
            }
            className={
              wasWindowed
                ? "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                : undefined
            }
          >
            {/* The SAME component the discover lane draws. Nothing here
                is read off ownership (D1), so the receipt counts, the
                delta and the availability mode no longer reach the row —
                they belong to surfaces that survived it. */}
            {hideSlot?.(r, i) ?? (
              <CommanderRow
                position={i}
                {...hideProps?.(r, i)}
                item={{
                  slug: r.slug,
                  name: r.name,
                  // The owned lane's rows are cards the reader HOLDS, so each
                  // carries the name on their own copy; the discover lane leaves
                  // it absent and the row draws the oracle name.
                  printedName: r.printedName,
                  colorIdentity: r.colorIdentity,
                  artCropUri: r.artCropUri,
                  rank: rankBySlug.get(r.slug) ?? 0,
                  prose: r.prose,
                  gapSlot: r.gapSlot,
                  score: r.score,
                  measurableTotal: r.measurableTotal,
                  // Fit's three parts, for the segmented bar. The owned lane
                  // already carried them on its score rows; the discover
                  // lane ships them from v6 of its payload.
                  fitPool: r.fitPool,
                  fitRoles: r.fitRoles,
                  fitSynergy: r.fitSynergy,
                  deckCount: r.deckCount,
                  // EVERY ROW HERE IS OWNED, so §7.4 row 5 applies to all
                  // of them: the slot unmounts. Passed as a literal rather
                  // than read, because the lane has no price to read.
                  price: { kind: "absent" },
                  priceOk: true,
                  href: hrefFor ? hrefFor(r) : commanderDetailHref(r.slug, avail),
                }}
              />
            )}
          </li>
        ))}
        {trailing ? <li>{trailing}</li> : null}
      </ul>
    </ArrivalOrder>
  );
}
