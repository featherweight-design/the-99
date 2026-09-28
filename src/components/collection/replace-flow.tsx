"use client";
// ReplaceFlow — steps 1 → 2 → 3 for the destructive replace path.
// Step 1: UploadEntry (Task 7). On success advances to step 2.
// Step 2: ReviewScreen (Task 8). Continue → step 3.
// Step 3: ConfirmModal (Task 9). Confirm → confirmUpload() → /collection.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmUpload, type UploadPreview } from "../../app/collection/actions";
import { UploadEntry } from "./upload-entry";
import { ReviewScreen } from "./review-screen";
import { ConfirmModal } from "./confirm-modal";

export function ReplaceFlow({
  currentCardCount,
  embedded,
  entry,
}: {
  currentCardCount: number;
  embedded?: boolean;
  // Pass-through to step 1. Held here rather than letting a caller render
  // UploadEntry itself, because steps 2 and 3 are this component's to own and a
  // caller reaching past it for step 1 would have to re-implement them.
  entry?: React.ComponentProps<typeof UploadEntry>["entry"];
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // A FIRST import goes straight through: with no collection there is nothing to replace,
  // so the Replace modal would only ask the player to confirm losing nothing (prod walk
  // 2026-09-28, item 5a). "First" is the count the server read when it built the preview,
  // not a caller's prop (first run passes a literal 0). The server re-checks at the confirm,
  // and when a collection turns out to exist after all it writes nothing and this opens the
  // modal instead.
  const firstImport = preview?.currentCollectionCount === 0;

  async function onConfirm() {
    if (!preview || pending) return;
    setPending(true);
    setConfirmError(null);
    try {
      const outcome = await confirmUpload(preview.uploadId, { firstImport: firstImport && !confirming });
      if (outcome?.needsConfirm) {
        setConfirming(true);
        return;
      }
      // The receipt, not the collection. A typed REPLACE is the most destructive action in
      // the app and was the only one with no receipt; the summary route is keyed on the
      // upload id, so it survives a reload and stays linkable.
      router.push(`/collection/replace/summary/${preview.uploadId}`);
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Confirm failed");
      // A skipped confirm has no surface of its own to say it failed, so it opens the modal,
      // whose error slot is where a failed confirm has always been reported.
      setConfirming(true);
    } finally {
      setPending(false);
    }
  }

  if (!preview) {
    return (
      <>
        {/* The entry's own column, and the heading centred with it — see the note on the page.
            Hidden on the phone, where the page's back-chevron bar carries the title instead.
            AND NOT WHEN EMBEDDED: `FirstRunChecklist` mounts this flow inside its own step-1
            card, which already has a Welcome heading and is not the collection route — a second
            `Replace collection` title and a `‹ Collection` link back would both be wrong there. */}
        {embedded ? null : (
          <div className="hidden md:block md:mx-auto md:w-full md:max-w-[760px] md:p-[28px_48px_0]">
            <a href="/collection" className="font-mono text-[11px] tracking-[0.06em] text-[color:var(--fg-faint)]">‹ Collection</a>
            <h1 className="font-display font-bold text-[30px] mt-[8px]" style={{ color: "var(--fg)" }}>Replace collection</h1>
          </div>
        )}
        <UploadEntry
        currentCardCount={currentCardCount}
        entry={entry}
        onPreview={(p) => {
          setConfirmError(null);
          setConfirming(false);
          setPreview(p);
        }}
        />
      </>
    );
  }

  return (
    <>
      <ReviewScreen
        preview={preview}
        onCancel={() => {
          setConfirming(false);
          setPreview(null);
        }}
        onContinue={() => (firstImport ? void onConfirm() : setConfirming(true))}
        pending={pending && !confirming}
        embedded={embedded}
      />
      {confirming && (
        <ConfirmModal
          preview={preview}
          pending={pending}
          error={confirmError}
          onClose={() => {
            setConfirming(false);
            setConfirmError(null);
          }}
          onConfirm={onConfirm}
        />
      )}
    </>
  );
}
