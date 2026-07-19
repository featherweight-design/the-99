"use client";
// ExportCopyButton — clipboard write with aria-live announcement + 1.5s label swap.
// Falls back to document.execCommand("copy") when navigator.clipboard is unavailable.

import { useState, useRef } from "react";

interface ExportCopyButtonProps {
  /** The text to copy to clipboard. */
  text: string;
  /** The aria-live status setter in the parent dialog (sr-only div). */
  onStatus: (msg: string) => void;
  /** Optional pre element ref for execCommand fallback. */
  preRef?: React.RefObject<HTMLPreElement | null>;
}

export function ExportCopyButton({ text, onStatus, preRef }: ExportCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCopy() {
    const lineCount = text.split("\n").length;

    function onSuccess() {
      const msg = `Copied · ${lineCount} lines`;
      onStatus(msg);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
        onStatus("");
      }, 1500);
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
        // silent — already tried
      });
    } else {
      // Legacy fallback: select <pre> content and execCommand
      if (preRef?.current) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(preRef.current);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand("copy");
        selection?.removeAllRanges();
      } else {
        // No pre ref — try creating a temporary textarea
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      onSuccess();
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="w-full md:w-auto font-sans font-semibold text-[14px] rounded-[8px] py-[12px] px-[0] md:py-[11px] md:px-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
      style={{
        color: "#14110E",
        background: "#C9A24B",
        border: "none",
      }}
    >
      {copied ? "Copied ✓" : "Copy to clipboard"}
    </button>
  );
}
