// One precon on `/decks/precons` in tiles (handoff R4 §3, design table §T: Component PreconTile).
// `DeckCardTile`'s anatomy with nothing new invented: the shell, the 63:88 art box with its bottom
// corners clipped, and `CardTileCaption` with a sub-line. Nothing is drawn over the art. The whole
// tile opens the precon through its name's link, stretched over the tile as in `PreconRow`; a
// deck's name in the foot is its own link above that stretch, so it opens the deck.

import Link from "next/link";
import { preconsCopy, preconMonth } from "../../../lib/copy/precons";
import type { PreconCommander, PreconRow as Row } from "../../../lib/precons/list";
import { WUBRG_COLOR } from "../../../lib/collection/browse";
import { colorNames } from "../../../lib/copy/color-labels";
import { PendingReporter } from "../../shell/pending-reporter";
import { CardTileCaption, TILE_ART_CLIP } from "../../ui/card-tile-caption";
import { HydratedImg } from "../../ui/hydrated-art";
import { TILE_ART_RATIO, TILE_SHELL } from "../deck-card-tile";

const copy = preconsCopy.tile;
const rowCopy = preconsCopy.row;

/** The 1px inner edge every card image carries, drawn OVER the art (an inset shadow paints under an img). */
const INNER_EDGE = "pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]";

/** T3f: the plate prints the commander's name, which the image would have carried. */
function NoArt({ name }: { name: string }) {
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-[6px] px-[12px] text-center" data-testid="tile-no-art">
      <span className="text-[12.5px] leading-[1.35] text-[color:var(--fg-muted)]">{name}</span>
      <span className="font-mono text-[9px] text-[color:var(--fg-locked)]">{copy.noArt}</span>
    </span>
  );
}

function Art({ commander, eager }: { commander: PreconCommander; eager: boolean }) {
  return commander.imageUri ? (
    <HydratedImg
      eager={eager}
      src={commander.imageUri}
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover object-center"
    />
  ) : (
    <NoArt name={commander.name} />
  );
}

/** T3e: both commanders' cards in the one box, staggered, each 66% wide, 5px corners. The list's grid
 *  draws no tile wider than ~241px (three tracks just under 792px; 174px at 390), so a card is at most
 *  ~159px and 5px clears its 3.1% (4.9px). The second is ringed where it overlaps. */
function PairArt({ commanders, eager }: { commanders: [PreconCommander, PreconCommander]; eager: boolean }) {
  const card = "absolute w-[66%] overflow-hidden rounded-[5px] bg-[color:var(--surface-sunken)]";
  return (
    <>
      {commanders.map((c, i) => (
        <span
          key={c.oracleId}
          data-testid="tile-pair-card"
          className={`${card} ${i === 0 ? "left-[5%] top-[4%]" : "bottom-[4%] right-[5%] shadow-[0_0_0_1px_var(--surface-sunken)]"}`}
          style={{ aspectRatio: TILE_ART_RATIO }}
        >
          <Art commander={c} eager={eager} />
          <span aria-hidden className={INNER_EDGE} />
        </span>
      ))}
    </>
  );
}

const FOOT_META = "font-mono text-[9.5px] leading-[1.3]";

export function PreconTile({ row, href, eager = false }: {
  row: Row;
  href: string;
  /** In the list's first screen (`GRID_EAGER_TILES`), so the art is in the server HTML. */
  eager?: boolean;
}) {
  const [first, second] = row.commanders;
  const identity = row.identity.length > 0 ? row.identity : ["C"];
  const hasFoot = row.built.length > 0 || row.twinName !== null || row.unmapped > 0;
  return (
    <li className={`${TILE_SHELL} relative min-w-0 border border-solid border-[color:var(--border)] bg-[color:var(--surface)] md:hover:border-[color:var(--border-strong)]`}>
      <div
        aria-hidden
        className={`relative w-full overflow-hidden bg-[color:var(--surface-sunken)] ${TILE_ART_CLIP}`}
        style={{ aspectRatio: TILE_ART_RATIO }}
      >
        {first && second ? (
          <PairArt commanders={[first, second]} eager={eager} />
        ) : first ? (
          <Art commander={first} eager={eager} />
        ) : (
          // A commander the catalog cannot place leaves the row with none: the plate, with no name.
          <NoArt name="" />
        )}
        <span className={INNER_EDGE} />
      </div>

      <CardTileCaption
        meta={
          <>
            <span className="text-[color:var(--fg-faint)]">{rowCopy.ownLead}</span>
            <span className="font-semibold text-[color:var(--fg)]">{rowCopy.own(row.owned, row.of)}</span>
          </>
        }
        name={
          <Link
            href={href}
            aria-label={row.commanders.length > 0
              ? copy.aria(row.name, row.commanders.map((c) => c.name), row.owned, row.of)
              : rowCopy.aria(row.name, row.owned, row.of)}
            className="text-[color:var(--fg)] no-underline after:absolute after:inset-0 after:rounded-[inherit] after:content-['']"
          >
            {row.name}
            <PendingReporter href={href} />
          </Link>
        }
        nameSub={
          <span className="flex min-w-0 items-center gap-[5px]">
            {/* The dots are color alone; the names say it in words. */}
            <span className="sr-only">{row.identity.length > 0 ? colorNames(row.identity).join(", ") : rowCopy.colorless}</span>
            <span aria-hidden className="flex flex-none gap-[3px]">
              {identity.map((c) => (
                <span
                  key={c}
                  className="h-[8px] w-[8px] rounded-full md:h-[9px] md:w-[9px]"
                  style={{ background: c === "C" ? "var(--fg-faint)" : WUBRG_COLOR[c] }}
                />
              ))}
            </span>
            <span className="min-w-0 truncate">{copy.meta(row.setCode, preconMonth(row.releaseDate))}</span>
          </span>
        }
      />

      {/* Only when present, and only the row's own lines in the row's order: decks (linked first,
          one line each, finding 10), the twin, then what the catalog lacks. */}
      {hasFoot && (
        <div className="mt-auto flex flex-col border-x-0 border-b-0 border-t-[1px] border-solid border-t-[color:var(--border)]" data-testid="tile-foot">
          {row.built.map((b) => (
            <div key={b.deckId} className="flex min-h-[44px] min-w-0 flex-col justify-center gap-[2px] p-[5px_9px] md:min-h-[34px] md:p-[5px_10px]">
              <Link
                href={`/decks/${b.deckId}`}
                className="relative z-[1] min-w-0 truncate text-[11.5px] leading-[1.3] text-[color:var(--fg)] underline decoration-[color-mix(in_srgb,var(--accent)_55%,transparent)] underline-offset-[3px] md:text-[12px]"
              >
                {b.deckName}
                <PendingReporter href={`/decks/${b.deckId}`} />
              </Link>
              <span className={`${FOOT_META} text-[color:var(--fg-muted)]`}>
                {b.linked ? copy.footBuilt(b.shared) : copy.footShared(b.shared)}
              </span>
            </div>
          ))}
          {row.twinName && (
            <div className="flex min-h-[44px] flex-col justify-center p-[5px_9px] md:min-h-[34px] md:p-[5px_10px]">
              <span className={`${FOOT_META} text-[color:var(--fg-faint)]`}>{copy.footTwin}</span>
            </div>
          )}
          {row.unmapped > 0 && (
            <div className="flex min-h-[44px] flex-col justify-center p-[5px_9px] md:min-h-[34px] md:p-[5px_10px]">
              <span className={`${FOOT_META} text-[color:var(--fg-faint)]`}>{rowCopy.unmapped(row.unmapped)}</span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
