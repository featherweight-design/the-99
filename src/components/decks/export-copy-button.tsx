"use client";
// ExportCopyButton — §Export dialog — "Copy to clipboard" primary button: clipboard write with aria-live announcement + 1.5s label swap.
// The write and its fallback are `useCopyText`'s, shared with the Shopping strip's Copy the list.

import { PrimaryButton } from "@/components/ui/button";
import { useCopyText } from "@/components/ui/use-copy-text";
import { exportDialogCopy } from "../../lib/copy/decks-builder";

interface ExportCopyButtonProps {
  /** The text to copy to clipboard. */
  text: string;
  /** The aria-live status setter in the parent dialog (sr-only div). */
  onStatus: (msg: string) => void;
}

export function ExportCopyButton({ text, onStatus }: ExportCopyButtonProps) {
  const lineCount = text === "" ? 0 : text.split("\n").length;
  const { copied, copy } = useCopyText(
    (ok) => onStatus(ok ? exportDialogCopy.copiedAnnounce(lineCount) : exportDialogCopy.copyFailed),
    () => onStatus(""),
  );

  return (
    <PrimaryButton
      onClick={() => copy(text)}
      className="w-full md:w-auto text-[14px] py-[12px] px-[0] md:py-[11px] md:px-[22px]"
    >
      {copied ? exportDialogCopy.copied : exportDialogCopy.copy}
    </PrimaryButton>
  );
}
