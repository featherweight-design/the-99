"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchVersionSynopsis } from "../../app/decks/synopsis-actions";
import { synopsisCopy } from "../../lib/copy/synopsis";
import type { CheckedSynopsis } from "../../lib/synopsis/types";
import { HoverPreviewProvider } from "./hover-preview";
import type { FindingArt } from "./receipt-modal";
import { VersionSynopsisModal } from "./synopsis-body";

type Found = { versionNumber: number; committedAt: Date; content: CheckedSynopsis; art: Record<string, string | null> };

/**
 * `Overview for this version →` (SYNOPSIS-modal.md §4, 6e): the entry to a version's overview, in
 * the version's EXPANDED panel and never on the collapsed row.
 *
 * READ WHEN THE ROW OPENS, as the panel's diff is: whether a version has an overview is asked of
 * `fetchVersionSynopsis` on mount, so nothing rides the page for rows nobody opens. Until it answers,
 * and for a version committed without one, NOTHING draws: no link, no placeholder, no reserved line.
 *
 * ONE MOUNT at both widths (the-99-d9's ruling on the undrawn phone state, 2026-09-24), in the
 * panel header's note column: at 1300, 10px under the note, whatever the header's other column
 * holds; at 390, where the rest of that header is desktop-only, it is the one thing the header
 * draws, so it opens the panel directly under the row that carries the note, as a 44px target.
 */
export function VersionOverviewLink({ versionId }: { versionId: string }) {
  const [found, setFound] = useState<Found | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    fetchVersionSynopsis(versionId).then(
      (got) => {
        if (live && got.kind === "ok") setFound(got);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [versionId]);

  const art = useMemo<FindingArt>(
    () => new Map(Object.entries(found?.art ?? {}).map(([id, imageUri]) => [id, { name: "", imageUri }])),
    [found],
  );

  if (!found) return null;
  return (
    <>
      <div className="flex min-h-[44px] items-center md:min-h-0 md:mt-[10px]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="synopsis-version-link"
          className="group inline-flex min-h-[44px] items-center gap-[8px] font-mono text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] md:min-h-0 cursor-pointer"
        >
          <span className="border-b border-b-[color:var(--accent)] border-dotted border-[var(--accent)] group-hover:border-[var(--accent-hover)]">
            {synopsisCopy.version.entry}
          </span>
          <span aria-hidden>→</span>
        </button>
      </div>
      {open ? (
        // Its own preview provider: the Versions tab has none, and the sheet's card names preview
        // like the draft's (raised above the sheet, since they sit inside a dialog).
        <HoverPreviewProvider>
          <VersionSynopsisModal
            versionNumber={found.versionNumber}
            committedAt={new Date(found.committedAt)}
            content={found.content}
            art={art}
            onClose={() => setOpen(false)}
          />
        </HoverPreviewProvider>
      ) : null}
    </>
  );
}
