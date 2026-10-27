"use client";
// ExportCopyButton — §Export dialog — "Copy to clipboard" primary button: clipboard write with aria-live announcement + 1.5s label swap.
// Falls back to document.execCommand("copy") when navigator.clipboard is unavailable.

import { useState, useRef, useEffect } from "react";
import { PrimaryButton } from "@/components/ui/button";
import { exportDialogCopy } from "../../lib/copy/decks-builder";

interface ExportCopyButtonProps {
  /** The text to copy to clipboard. */
  text: string;
  /** The aria-live status setter in the parent dialog (sr-only div). */
  onStatus: (msg: string) => void;
}

export function ExportCopyButton({ text, onStatus }: ExportCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the 1.5s label-swap timer on unmount to prevent state updates on unmounted component.
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleCopy() {
    const lineCount = text === "" ? 0 : text.split("\n").length;

    function onSuccess() {
      const msg = exportDialogCopy.copiedAnnounce(lineCount);
      onStatus(msg);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
        onStatus("");
      }, 1500);
    }

    function legacyCopy() {
      // Legacy fallback: create a temporary textarea to copy text without depending on
      // which DOM tree is visible (avoids selecting the hidden <pre> in the dual-layout).
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
      if (ok) {
        onSuccess();
      } else {
        onStatus(exportDialogCopy.copyFailed);
      }
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(legacyCopy);
    } else {
      legacyCopy();
    }
  }

  return (
    <PrimaryButton
      onClick={handleCopy}
      className="w-full md:w-auto text-[14px] py-[12px] px-[0] md:py-[11px] md:px-[22px]"
    >
      {copied ? exportDialogCopy.copied : exportDialogCopy.copy}
    </PrimaryButton>
  );
}
