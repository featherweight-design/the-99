// INTERIM Collection surface — designed 3-step flow lives in #6.
// Empty state per property table §Empty State — Collection Empty.
import { requireUserId } from "../../lib/auth";
import { getCollectionStats } from "../../lib/home/summary";
import { CardFan } from "../../components/marks";
import { UploadEntry } from "../../components/collection/upload-entry";

export default async function CollectionPage() {
  const userId = await requireUserId();
  const stats = await getCollectionStats(userId);

  if (stats.uniqueCards === 0) {
    return (
      <section
        className="flex flex-col items-center justify-center text-center"
        style={{ padding: "32px", paddingTop: "32px" }}
      >
        {/* Card-fan mark: mobile variant → 100×110, desktop variant → 120×130 */}
        <CardFan variant="mobile" className="mb-[22px] md:hidden" />
        <CardFan variant="desktop" className="mb-[26px] hidden md:block" />

        <h1
          className="font-display font-bold text-[28px]"
          style={{ color: "var(--fg)", margin: 0 }}
        >
          Your collection is empty
        </h1>

        <p
          className="mt-3 max-w-[420px] text-[16px] leading-[1.6]"
          style={{ color: "var(--fg-body)" }}
        >
          A pile of possibilities waiting for a general. Upload a CSV and the
          table fills — commanders and decks follow.
        </p>

        {/* CTA row: upload entry inline (contains "Paste a list" toggle) */}
        <div className="mt-[26px] w-full max-w-[480px]">
          <UploadEntry />
        </div>
      </section>
    );
  }

  // Non-empty interim: show card count + upload entry to replace collection.
  // NOTE: the full grid + filters + review flow ships in #6.
  return (
    <section className="p-6 md:p-10">
      <p
        className="mb-6 font-mono text-[13px]"
        style={{ color: "var(--fg-muted)" }}
      >
        {stats.totalCards.toLocaleString()} cards ·{" "}
        {stats.uniqueCards.toLocaleString()} unique
      </p>
      <UploadEntry />
    </section>
  );
}
