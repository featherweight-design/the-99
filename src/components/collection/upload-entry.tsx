"use client";
// Replace Flow — Step 1 (Upload) per property table §Replace Flow — Step 1.
// The interim inline preview UI from earlier is gone; the parent ReplaceFlow
// component now owns steps 2 (review) and 3 (type-to-confirm).

import { useMemo, useRef, useState, useTransition } from "react";
import { previewUpload, previewPaste, type UploadPreview } from "../../app/collection/actions";
import { parsePasteList } from "../../lib/manabox/paste";
import { PASTE_MAX_BYTES } from "../../lib/upload-limits";
import { GhostButton, PrimaryButton } from "../ui/button";

type Mode = "dropzone" | "paste";

export function UploadEntry({
  currentCardCount,
  onPreview,
}: {
  currentCardCount: number;
  onPreview: (preview: UploadPreview) => void;
}) {
  const [mode, setMode] = useState<Mode>("dropzone");
  const [dragOver, setDragOver] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (pending) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      try {
        const p = await previewUpload(fd);
        onPreview(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    });
  }

  function handlePasteSubmit() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const p = await previewPaste(pasteText);
        onPreview(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Parse failed");
      }
    });
  }

  const pasteCount = useMemo(
    () => (pasteText.trim() ? parsePasteList(pasteText).rows.reduce((n, r) => n + r.quantity, 0) : 0),
    [pasteText],
  );

  return (
    // Desktop content area — §Desktop Content Area: padding 44px 48px, max-width 760px
    <div className="md:max-w-[760px] md:p-[44px_48px]">
      {/* Warning banner — §Warning Banner (Replace Warning): bg #211C15 (--elevated-hover), border 1px #3A3229 (--border-strong), border-left 3px #E0913C (--warning), radius 8/10px, padding 12/16px, gap 10/12px, margin-top 20px desktop */}
      <div
        className="flex items-start gap-[10px] md:gap-[12px] rounded-lg md:rounded-[10px] p-[12px_14px] md:p-[16px_18px] md:mt-[20px]"
        style={{
          background: "var(--elevated-hover)",
          border: "1px solid var(--border-strong)",
          borderLeft: "3px solid var(--warning)",
        }}
      >
        {/* Warning icon — §Warning Banner Icon: #E0913C (--warning), 15/17px */}
        <span
          aria-hidden
          className="text-[15px] md:text-[17px] leading-[1.3] md:leading-[1.2]"
          style={{ color: "var(--warning)" }}
        >
          ⚠
        </span>
        {/* Body — §Warning Banner Body: 12.5/14px, #C6B79A (--fg-body), line-height 1.55/1.6 */}
        <p
          className="text-[12.5px] md:text-[14px] leading-[1.55] md:leading-[1.6]"
          style={{ color: "var(--fg-body)" }}
        >
          {currentCardCount === 0 ? (
            <>
              <span className="md:hidden">
                This upload becomes your collection. You&apos;ll see exactly what matched before anything is committed.
              </span>
              <span className="hidden md:inline">
                This upload becomes your collection — you&apos;ll see exactly what matched before anything is committed.
              </span>
            </>
          ) : (
            <>
              <span className="md:hidden">
                Uploading a new file replaces your current {currentCardCount.toLocaleString()} cards. There&apos;s no merge — the new export becomes your whole collection.
              </span>
              <span className="hidden md:inline">
                Uploading replaces your entire collection. Your current {currentCardCount.toLocaleString()} cards will be swapped for whatever&apos;s in the new file — no merge, no append. You&apos;ll see exactly what matched before anything is committed.
              </span>
            </>
          )}
        </p>
      </div>

      {mode === "dropzone" ? (
        // Upload Drop Zone — §Upload Drop Zone: border 1.5px dashed #4A4033 (--border-dashed), radius 12px, bg #181410 (--surface-sunken), padding 30px 18px mobile / 40px desktop, mobile centered / desktop flex row (icon left)
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={[
            "block cursor-pointer text-center rounded-[12px] mt-[16px] md:mt-[18px]",
            "p-[30px_18px] md:p-[40px]",
            "md:flex md:items-center md:gap-[28px] md:text-left",
            dragOver
              ? "bg-[color:var(--surface-inset)] [border:1.5px_dashed_var(--brass)]"
              : "bg-[color:var(--surface-sunken)] [border:1.5px_dashed_var(--border-dashed)] hover:bg-[color:var(--surface-inset)] hover:[border:1.5px_dashed_var(--brass)]",
          ].join(" ")}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            aria-label="Upload collection CSV"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) handleFile(f);
            }}
          />

          {/* Icon circle — §Upload Icon Circle: 48×48 mobile / 58×58 desktop, radius 999px, border 1px #C9A24B (--brass), color --brass, font 20/26px, margin auto mobile */}
          <div
            className="mx-auto mb-[14px] md:mx-0 md:mb-0 md:flex-none rounded-full flex items-center justify-center text-[20px] md:text-[26px] w-[48px] h-[48px] md:w-[58px] md:h-[58px]"
            style={{ border: "1px solid var(--brass)", color: "var(--brass)" }}
            aria-hidden
          >
            ↑
          </div>

          <div>
            {/* Upload title — §Upload Title: 15/17px 600 --fg */}
            <div className="text-[15px] md:text-[17px] font-semibold" style={{ color: "var(--fg)" }}>
              <span className="md:hidden">Drop your new CSV</span>
              <span className="hidden md:inline">Drop your new collection CSV here</span>
            </div>
            {/* Formats — §Upload Subtitle: mono 10/11px --fg-faint, letter-spacing 0.06em, margin-top 6px */}
            <div
              className="mt-[6px] font-mono text-[10px] md:text-[11px] tracking-[0.06em]"
              style={{ color: "var(--fg-faint)" }}
            >
              <span className="md:hidden">Moxfield · Archidekt · Deckbox · ManaBox · CSV</span>
              <span className="hidden md:inline">Moxfield · Archidekt · Deckbox · ManaBox · plain CSV</span>
            </div>
            {/* Browse files button — §"Browse files" Button.
                Deviation vs handoff (#30): (a) desktop mt/mb 14px added — the flat design put the button flush against format meta above and helper text below; needs breathing room. (b) Background moved from an inline style to a Tailwind utility so the hover-state class actually applies (inline styles outrank hover utilities and were shadowing the color swap). (c) Disabled + label swap while the upload transition is pending so the user gets feedback instead of a silent submit. */}
            <PrimaryButton
              onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
              disabled={pending}
              className="text-[13px] md:text-[14px] mt-[16px] md:mt-[14px] md:mb-[14px] px-[20px] md:px-[22px] py-[11px] md:whitespace-nowrap disabled:opacity-60 disabled:cursor-wait"
            >
              {pending ? "Uploading…" : "Browse files"}
            </PrimaryButton>
            {/* Helper — §Helper Text: 12/13px --fg-faint, margin-top 14px mobile */}
            <p
              className="mt-[14px] md:mt-0 text-[12px] md:text-[13px] leading-[1.55] md:leading-[1.5]"
              style={{ color: "var(--fg-faint)" }}
            >
              <span className="md:hidden">
                Only a Name and Quantity column are required.{" "}
                <button type="button" onClick={(e) => { e.preventDefault(); setMode("paste"); }} className="text-[color:var(--brass)]">
                  Paste a list instead
                </button>
              </span>
              <span className="hidden md:inline">
                We only need a Name and Quantity column — most exports already include them.
              </span>
            </p>
          </div>
        </label>
      ) : (
        <div className="mt-[16px]">
          <label htmlFor="paste-list" className="block text-[13px] font-semibold mb-[8px]" style={{ color: "var(--fg)" }}>
            Paste your list
          </label>
          <textarea
            id="paste-list"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            aria-label="Paste your card list"
            maxLength={PASTE_MAX_BYTES}
            placeholder={"3 Sol Ring\n1 Cultivate\nRhystic Study"}
            className="h-[300px] w-full rounded-lg p-[14px_16px] font-mono text-[13px] resize-none"
            style={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--border-strong)",
              color: "var(--fg-body)",
              caretColor: "var(--fg-locked)",
            }}
          />
          <div className="mt-[10px] flex items-center justify-between">
            <span className="font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>
              {pasteCount > 0 ? `${pasteCount} cards recognized` : ""}
            </span>
            <div className="flex gap-[8px]">
              <GhostButton
                type="button"
                onClick={() => setMode("dropzone")}
                className="text-[13px] px-[16px] py-[10px]"
              >
                Back
              </GhostButton>
              <PrimaryButton
                type="button"
                onClick={handlePasteSubmit}
                disabled={pending || !pasteText.trim()}
                className="text-[13px] px-[16px] py-[10px] disabled:opacity-50"
              >
                {pending ? "Previewing…" : `Preview ${pasteCount > 0 ? `${pasteCount} cards` : "list"}`}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Desktop-only "Paste a list instead" link — mobile has it inline in helper text */}
      {mode === "dropzone" && (
        <button
          type="button"
          onClick={() => setMode("paste")}
          className="hidden md:inline-block mt-[14px] text-[13px] whitespace-nowrap"
          style={{ color: "var(--brass)" }}
        >
          Paste a list instead →
        </button>
      )}

      {error && (
        <p className="mt-[12px] text-[13px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
