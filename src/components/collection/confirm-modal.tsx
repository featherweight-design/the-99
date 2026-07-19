"use client";
import type { UploadPreview } from "../../app/collection/actions";
export function ConfirmModal(_: {
  preview: UploadPreview; pending: boolean; error: string | null;
  onClose: () => void; onConfirm: () => Promise<void> | void;
}) {
  return null; // implemented in Task 9
}
