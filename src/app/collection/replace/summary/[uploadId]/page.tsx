// /collection/replace/summary/[uploadId] — what the import did to your decks.
//
// Reached by confirming a collection replace, in place of the bounce back to `/collection` the
// flow used to make. A typed REPLACE is the most destructive action in the app and was the only
// one with no receipt.
//
// The upload id is in the URL rather than the page being "the last import", so the receipt is
// linkable, survives a reload, and an older one still renders its own figures. `loadSummaryView`
// scopes every read to the signed-in reader, so another player's id is a not-found.

import { notFound } from "next/navigation";
import { requireUserId } from "../../../../../lib/auth";
import { loadSummaryView } from "../../../../../lib/collection/summary-read";
import { ArrivalsSummary } from "../../../../../components/collection/arrivals-summary";
import { isUuid } from "../../../../../lib/uuid";
import type { UploadPreview } from "../../../actions";

export default async function ImportSummaryPage({
  params,
}: {
  params: Promise<{ uploadId: string }>;
}) {
  const { uploadId } = await params;
  // A malformed segment reaching a uuid column is a 500 where the route means not-found, so it
  // is answered here — the same guard every deck route makes.
  if (!isUuid(uploadId)) notFound();
  const userId = await requireUserId();

  const view = await loadSummaryView(uploadId, userId);
  if (!view) notFound();
  // An unconfirmed upload has no receipt to show and is not a page: the player is still in the
  // flow, or abandoned it.
  if (!view.confirmedAt) notFound();

  // The issues line's route back reads the preview payload this upload already carries, which
  // is what `IssueInspector` is built against — so nothing new is stored and nothing is fetched.
  const preview = view.summary && view.summary.issues.unmatched + view.summary.issues.parseErrors > 0
    ? await previewFor(uploadId, userId)
    : null;

  return (
    <section>
      <ArrivalsSummary
        summary={view.summary}
        contested={view.contested}
        preview={preview}
        filename={view.filename}
        stampDate={view.confirmedAt.toLocaleDateString("en-GB", {
          day: "numeric", month: "short", year: "numeric",
        })}
      />
    </section>
  );
}

/**
 * The stored preview, in the shape `IssueInspector` reads.
 *
 * Only the fields that component touches are filled: it renders the unmatched names and the
 * parse errors and nothing else, and the rest of `UploadPreview` describes a decision the
 * player has already made.
 */
async function previewFor(uploadId: string, userId: string): Promise<UploadPreview | null> {
  const { db } = await import("../../../../../db");
  const { csvUploads } = await import("../../../../../db/schema");
  const { and, eq } = await import("drizzle-orm");
  const [row] = await db.select().from(csvUploads)
    .where(and(eq(csvUploads.id, uploadId), eq(csvUploads.userId, userId)));
  if (!row) return null;
  const payload = row.previewPayload as {
    unmatched?: { name: string; setCode: string; line: number; quantity: number }[];
    parseErrors?: { line: number; reason: string }[];
    skippedByDesignCount?: number;
  };
  return {
    uploadId,
    matchedCardCount: 0,
    unmatchedRows: payload.unmatched ?? [],
    skippedByDesignCount: payload.skippedByDesignCount ?? 0,
    parseErrors: payload.parseErrors ?? [],
    currentCollectionCount: 0,
    filename: row.filename,
    rowCount: row.rowCount,
  };
}
