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

export function ReplaceFlow({ currentCardCount, embedded }: { currentCardCount: number; embedded?: boolean }) {
  const router = useRouter();
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    if (!preview || pending) return;
    setPending(true);
    setConfirmError(null);
    try {
      await confirmUpload(preview.uploadId);
      router.push("/collection");
      router.refresh();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setPending(false);
    }
  }

  if (!preview) {
    return <UploadEntry currentCardCount={currentCardCount} onPreview={setPreview} />;
  }

  return (
    <>
      <ReviewScreen
        preview={preview}
        onCancel={() => setPreview(null)}
        onContinue={() => setConfirming(true)}
        embedded={embedded}
      />
      {confirming && (
        <ConfirmModal
          preview={preview}
          pending={pending}
          error={confirmError}
          onClose={() => setConfirming(false)}
          onConfirm={onConfirm}
        />
      )}
    </>
  );
}
