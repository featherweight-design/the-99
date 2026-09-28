// /collection/sets/[code] — the grid.
//
// Two failure pages, one layout, and both distinct from "not indexed yet": an unknown code
// is a wrong link, a non-collectible one is a real product with no numbered run to be
// missing from, and a set with a null base_set_size is a real page that is merely early.
// Neither failure is a 404 route — the breadcrumb survives, so the reader is visibly still
// inside Collection — and neither offers a search field, because the index is one tap away
// and already has one.

import Link from "next/link";
import { requireUserId } from "../../../../lib/auth";
import { cacheForUser } from "../../../../lib/cache/user-lists";
import { COLLECTIBLE_SET_TYPES, loadSetGrid } from "../../../../lib/sets/read";
import { fingerprintOf, placeCells } from "../../../../lib/sets/completion";
import { parseAsOf, provenanceForm } from "../../../../lib/decks/price";
import { setPageCopy } from "../../../../lib/copy/set-collections";
import { SetGridClient } from "../../../../components/sets/set-grid-client";
import { EmptyState, EmptyStateBody, EmptyStateTitle } from "../../../../components/ui/empty-state";
import { GhostButton, PrimaryButton } from "../../../../components/ui/button";
import { PendingReporter } from "../../../../components/shell/pending-reporter";

function Shell({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-[16px] pb-[40px] md:px-[34px]">
      <p className="pt-[16px] font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
        <Link href="/collection/sets">{setPageCopy.breadcrumb(code)}<PendingReporter href="/collection/sets" /></Link>
      </p>
      {children}
    </main>
  );
}

export default async function SetGridPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const userId = await requireUserId();
  // `-3`: the payload gained each printing's BACK face, so a cell can open the modal at its
  // own printing on both sides. `-2` gained the full-size front, for the front half of the
  // same job. Same convention as `browse-2` — an entry written before a shape change is not
  // stale, it is a different shape, and it would otherwise be served for up to the hour-long
  // ceiling with the field simply absent: here that means a warm grid keeps handing the
  // modal a front with no back, which is exactly the printing mismatch this shape closes.
  const grid = await cacheForUser(userId, ["set-grid-3", code.toLowerCase()], () =>
    loadSetGrid(userId, code));

  if (!grid) {
    return (
      <Shell code={code}>
        <EmptyState>
          <EmptyStateTitle>{setPageCopy.unknownCode.heading(code)}</EmptyStateTitle>
          <EmptyStateBody>{setPageCopy.unknownCode.body}</EmptyStateBody>
          <div className="mt-[16px]">
            <PrimaryButton href="/collection/sets">
              {setPageCopy.unknownCode.action}
            </PrimaryButton>
          </div>
        </EmptyState>
      </Shell>
    );
  }

  // Digital products are excluded from search and their printings are dropped at ingest,
  // so a direct URL for one would otherwise land on a permanently empty grid.
  const collectible = !grid.set.digital
    && (COLLECTIBLE_SET_TYPES as readonly string[]).includes(grid.set.setType);
  if (!collectible) {
    const held = grid.heldCopies;
    return (
      <Shell code={code}>
        <EmptyState>
          <EmptyStateTitle>{setPageCopy.nonCollectible.heading(grid.set.name)}</EmptyStateTitle>
          <EmptyStateBody>{setPageCopy.nonCollectible.body(held)}</EmptyStateBody>
          <div className="mt-[16px] flex flex-col items-center gap-[10px]">
            {/* Only when there is something to see. This page is also reached by search,
                where the reader holds nothing from the set and the CTA would have offered
                "See those 0 in Collection" against an empty destination.

                `s`, which is the parameter the collection browser reads (browser.tsx:220).
                `sets` was silently ignored, so this opened an unfiltered collection. */}
            {held > 0 ? (
              <PrimaryButton href={`/collection?s=${grid.set.code.toUpperCase()}`}>
                {setPageCopy.nonCollectible.primary(held)}
              </PrimaryButton>
            ) : null}
            <GhostButton href="/collection/sets">
              {setPageCopy.nonCollectible.secondary}
            </GhostButton>
          </div>
        </EmptyState>
      </Shell>
    );
  }

  const cells = placeCells(grid.printings, grid.holdings, grid.picks);
  // The baseline the focus check compares against. From the collection rather than from
  // the cells, so a catalog refresh is not mistaken for an upload.
  const ownedFingerprint = fingerprintOf(grid.holdings, grid.picks);

  // Staleness is a property of the FEED, measured against the clock — not a comparison of
  // each row's as_of to the newest, which would light the line on a healthy feed, because
  // a sold-out printing keeps its last row with an older as_of by design.
  //
  // `provenanceForm` is the shipped decision, and its contract is to be called ONCE on the
  // server and passed down: `now` is a parameter precisely so the browser cannot compare
  // against a different clock and flip the answer between render and hydration.
  const newest = grid.newestAsOf ? parseAsOf(grid.newestAsOf) : null;
  const provenance = newest ? provenanceForm(newest, new Date()) : null;
  const staleAsOf = provenance?.behind ? provenance.when : null;

  return (
    <Shell code={code}>
      {/* The pick is written from inside this provider, and the grid's data depends on
          which printing is owned. `SetGridClient` turns that signal into the recheck the
          delta strip needs, including when the reader closes the modal before the write
          returns. */}
      <SetGridClient
        code={grid.set.code}
        name={grid.set.name}
        iconSvgUri={grid.set.iconSvgUri}
        releasedAt={grid.set.releasedAt}
        cells={cells}
        prices={grid.prices}
        newestAsOf={grid.newestAsOf}
        baseSetSize={grid.set.baseSetSize}
        ownedFingerprint={ownedFingerprint}
        staleAsOf={staleAsOf}
      />
    </Shell>
  );
}
