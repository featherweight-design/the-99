// One precon on `/decks/precons` (design table: Component PreconRow). The create picker's row
// shell. The whole row opens the precon through its name's link, stretched over the row; a shared
// deck's name is its own link above that stretch, so it opens the deck (R2, R6).

import Link from "next/link";
import { preconsCopy, preconMonth } from "../../../lib/copy/precons";
import type { PreconRow as Row } from "../../../lib/precons/list";
import { WUBRG_COLOR } from "../../../lib/collection/browse";
import { colorNames } from "../../../lib/copy/color-labels";
import { PendingReporter } from "../../shell/pending-reporter";
import { CommanderThumb } from "../../ui/commander-thumb";

const copy = preconsCopy.row;
const linkedClause = preconsCopy.link.linked.rowClause;

function DeckLink({ deckId, deckName }: { deckId: string; deckName: string }) {
  return (
    <Link
      href={`/decks/${deckId}`}
      className="relative z-[1] text-[color:var(--fg)] underline decoration-[color-mix(in_srgb,var(--accent)_55%,transparent)] underline-offset-[3px]"
    >
      {deckName}
      <PendingReporter href={`/decks/${deckId}`} />
    </Link>
  );
}

export function PreconRow({ row, href }: { row: Row; href: string }) {
  const lead = row.commanders[0];
  const built = row.built;
  return (
    <li className="relative flex min-h-[44px] items-center gap-[11px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] p-[10px_8px_10px_12px] md:gap-[14px] md:rounded-[11px] md:p-[11px_12px_11px_15px]">
      <CommanderThumb imageUri={lead?.imageUri ?? null} colorIdentity={row.identity} size="list" />
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="flex items-baseline justify-between gap-[10px]">
          <Link
            href={href}
            aria-label={copy.aria(row.name, row.owned, row.of)}
            className="font-display text-[14.5px] leading-[1.3] text-[color:var(--fg)] no-underline after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] md:text-[16px]"
          >
            {row.name}
            <PendingReporter href={href} />
          </Link>
          <span className="flex-none whitespace-nowrap font-mono text-[12px] font-medium text-[color:var(--fg)] md:text-[13px]">
            <span className="mr-[4px] text-[10px] font-normal text-[color:var(--fg-faint)]">{copy.ownLead}</span>
            {copy.own(row.owned, row.of)}
          </span>
        </div>
        <span className="font-mono text-[11px] leading-[1.5] text-[color:var(--fg-muted)]">
          {row.commanders.map((c) => c.name).join(" + ")}
        </span>
        <span className="flex items-center gap-[6px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {/* The dots are color alone; the names say it in words. */}
          <span className="sr-only">{row.identity.length > 0 ? colorNames(row.identity).join(", ") : copy.colorless}</span>
          <span aria-hidden className="flex gap-[3px]">
            {(row.identity.length > 0 ? row.identity : ["C"]).map((c) => (
              <span
                key={c}
                className="h-[9px] w-[9px] rounded-full md:h-[11px] md:w-[11px]"
                style={{ background: c === "C" ? "var(--fg-faint)" : WUBRG_COLOR[c] }}
              />
            ))}
          </span>
          {row.setCode} · {preconMonth(row.releaseDate)}
        </span>
        {/* R3 K9: once a deck is linked, each deck takes its own line, the linked first (the
            summary's order), and replaces R6's single `your decks A and B` line. */}
        {built.some((b) => b.linked) ? built.map((b) => (
          <span key={b.deckId} className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">
            {copy.built} <DeckLink deckId={b.deckId} deckName={b.deckName} />
            {b.linked && linkedClause}
            {copy.builtShared(b.shared)}
          </span>
        )) : built.length > 0 && (
          <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">
            {built.length === 1 ? copy.built : copy.builtTwo}{" "}
            {built.map((b, i) => (
              <span key={b.deckId}>
                {i > 0 && (i === built.length - 1 ? copy.builtAnd : ", ")}
                <DeckLink deckId={b.deckId} deckName={b.deckName} />
                {/* Each deck carries its own figure: two decks rarely share the same count. */}
                {copy.builtShared(b.shared)}
              </span>
            ))}
          </span>
        )}
        {row.twinName && <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.twin}</span>}
        {row.unmapped > 0 && (
          <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.unmapped(row.unmapped)}</span>
        )}
      </div>
      <span aria-hidden className="flex-none self-center text-[18px] text-[color:var(--fg-muted)]">›</span>
    </li>
  );
}
