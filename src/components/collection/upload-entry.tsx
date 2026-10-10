"use client";
// Replace Flow — Step 1 (Upload) per property table §Replace Flow — Step 1.
// The interim inline preview UI from earlier is gone; the parent ReplaceFlow
// component now owns steps 2 (review) and 3 (the replace confirm).

import { collectionChassisCopy } from "../../lib/copy/collection";
import { useMemo, useRef, useState, useTransition } from "react";
import { previewUpload, previewPaste, type UploadPreview } from "../../app/collection/actions";
import { refreshCopy } from "../../lib/copy/refresh";
import { parsePasteList } from "../../lib/manabox/paste";
import { COLLECTION_FILE_MAX_BYTES, COLLECTION_FILE_MAX_LABEL, PASTE_MAX_BYTES } from "../../lib/upload-limits";
import { GhostButton, PrimaryButton } from "../ui/button";
import { replaceCopy } from "../../lib/copy/replace";
import { collectionEditCopy } from "../../lib/copy/collection-edit";

type Mode = "dropzone" | "paste";

/**
 * How the un-started state is offered. `dropzone` is the page at
 * `/collection/replace`, where the screen is about files and a drop target is
 * the right control. `buttons` is first run's step-1 card, which has room for
 * a pair of 32px buttons and nothing like the room for a drop target — same
 * file input, same `setMode("paste")`, so this is a second rendering of one
 * state machine rather than a second state machine.
 */
type Entry = "dropzone" | "buttons";

export function UploadEntry({
  currentCardCount,
  onPreview,
  entry = "dropzone",
  onAddByHand,
}: {
  currentCardCount: number;
  onPreview: (preview: UploadPreview) => void;
  entry?: Entry;
  /** Buttons entry only: a third, ghost button beside Paste that opens Add cards (B0c). */
  onAddByHand?: (trigger: HTMLElement) => void;
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
    // Checked here as well as on the server: an oversized body never reaches the
    // action's own check, and the reader would see a minified React error instead.
    if (file.size > COLLECTION_FILE_MAX_BYTES) {
      setError(`File too large (max ${COLLECTION_FILE_MAX_LABEL})`);
      return;
    }
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

  // Both entries reach the same paste half, so it is written once here rather
  // than duplicated into each branch.
  const pastePanel = (
    <div className="mt-[16px]">
      <label
        htmlFor="paste-list"
        className="block text-[13px] font-semibold mb-[8px]"
        style={{ color: "var(--fg)" }}
      >
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
            {pending
              ? "Previewing…"
              : pasteCount === 0
                ? "Preview list"
                : pasteCount === 1
                  ? "Preview 1 card"
                  : `Preview ${pasteCount} cards`}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );

  // Rendered into whichever entry is drawn rather than hoisted to one shared
  // position: inside the dropzone's <label> it is what makes the whole drop
  // target clickable, and moving it out would leave that label controlling
  // nothing.
  const fileInput = (
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
  );

  if (entry === "buttons") {
    return (
      // No page padding and no replace warning: this renders inside first run's
      // step-1 card, which supplies its own padding, and the warning's
      // zero-collection sentence would restate the body copy directly above it.
      // The paste panel is the shared one, reached by the same setMode.
      <>
        {mode === "dropzone" ? (
          // §Step 1 — button group
          <div className="mt-[2px] flex w-full flex-col gap-[8px] sm:mt-[4px] sm:w-auto sm:flex-row">
            {fileInput}
            <PrimaryButton
              // What the locked nav's "Go to step 1" finds, scrolls to and focuses.
              data-step1-upload
              disabled={pending}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[44px] items-center justify-center rounded-[10px] text-[14px] disabled:opacity-60 disabled:cursor-wait sm:h-[32px] sm:justify-start sm:rounded-[8px] sm:px-[14px] sm:text-[12.5px]"
            >
              {refreshCopy.firstRun.uploadCsv}
            </PrimaryButton>
            <GhostButton
              disabled={pending}
              onClick={() => setMode("paste")}
              className="flex h-[44px] items-center justify-center rounded-[10px] text-[14px] font-normal disabled:opacity-60 sm:h-[32px] sm:justify-start sm:rounded-[8px] sm:px-[13px] sm:text-[12.5px]"
            >
              {refreshCopy.firstRun.pasteList}
            </GhostButton>
            {onAddByHand ? (
              <GhostButton
                disabled={pending}
                onClick={(e) => onAddByHand(e.currentTarget)}
                className="flex h-[44px] items-center justify-center rounded-[10px] text-[14px] font-normal disabled:opacity-60 sm:h-[32px] sm:justify-start sm:rounded-[8px] sm:px-[13px] sm:text-[12.5px]"
              >
                {collectionEditCopy.firstRun.addByHand}
              </GhostButton>
            ) : null}
          </div>
        ) : (
          pastePanel
        )}
        {error && (
          <p className="text-[13px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    // Desktop content area — §Desktop Content Area: padding 44px 48px, max-width 760px.
    // CENTRED: the cap is the handoff's, the alignment was never stated, and left-pinned it left
    // two thirds of a desktop body empty beside it.
    // With the replace note the column starts at the page's heading, so the note sits the
    // canvas's 20px under it; the 44px top belongs to a column that opens on the dropzone.
    <div className={`md:mx-auto md:w-full md:max-w-[760px] ${currentCardCount > 0 ? "md:p-[0_48px_44px]" : "md:p-[44px_48px]"}`}>
      {/* The replace note (first-run redesign D10; design table first-run-calm-replace.md §2).
          A plain note, not a warning: --surface-sunken, a 1px --border all round, no ⚠, no amber
          rule. Drawn only over a collection that exists, since with none there is nothing to
          replace and nothing for the note to say. The phone takes the same treatment (audit
          correction 5); only its spacing above stays the page's own. */}
      {currentCardCount > 0 && (
        <p className="m-0 md:mt-[20px] rounded-[10px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[14px_18px] text-[14px] leading-[1.6] text-pretty text-[color:var(--fg-body)]">
          {replaceCopy.note.before}
          <span className="font-semibold text-[color:var(--fg)]">{replaceCopy.note.count(currentCardCount)}</span>
          {replaceCopy.note.after}
        </p>
      )}

      {mode === "dropzone" ? (
        // Upload Drop Zone — §Upload Drop Zone: border 1.5px dashed --border-dashed, radius 12px, bg --surface-sunken, padding 30px 18px mobile / 40px desktop, mobile centered / desktop flex row (icon left)
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
              ? "bg-[color:var(--surface-inset)] [border:1.5px_dashed_var(--accent)]"
              : "bg-[color:var(--surface-sunken)] [border:1.5px_dashed_var(--border-dashed)] hover:bg-[color:var(--surface-inset)] hover:[border:1.5px_dashed_var(--accent)]",
          ].join(" ")}
        >
          {fileInput}

          {/* Icon circle — §Upload Icon Circle: 48×48 mobile / 58×58 desktop, radius 999px, border 1px --accent, color --accent, font 20/26px, margin auto mobile */}
          <div
            className="mx-auto mb-[14px] md:mx-0 md:mb-0 md:flex-none rounded-full flex items-center justify-center text-[20px] md:text-[26px] w-[48px] h-[48px] md:w-[58px] md:h-[58px]"
            style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
            aria-hidden
          >
            ↑
          </div>

          <div>
            {/* Upload title — §Upload Title: 15/17px 600 --fg */}
            <div className="text-[15px] md:text-[17px] font-semibold" style={{ color: "var(--fg)" }}>
              <span className="md:hidden">{collectionChassisCopy.upload.dropCompact}</span>
              <span className="hidden md:inline">{collectionChassisCopy.upload.dropWide}</span>
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
              {pending ? "Uploading…" : collectionChassisCopy.upload.browse}
            </PrimaryButton>
            {/* Helper — §Helper Text: 12/13px --fg-faint, margin-top 14px mobile */}
            <p
              className="mt-[14px] md:mt-0 text-[12px] md:text-[13px] leading-[1.55] md:leading-[1.5]"
              style={{ color: "var(--fg-faint)" }}
            >
              <span className="md:hidden">
                Only a Name and Quantity column are required.{" "}
                <button type="button" onClick={(e) => { e.preventDefault(); setMode("paste"); }} className="text-[color:var(--accent)]">
                  {collectionChassisCopy.upload.paste}
                </button>
              </span>
              <span className="hidden md:inline">
                We only need a Name and Quantity column: most exports already include them.
              </span>
            </p>
          </div>
        </label>
      ) : (
        pastePanel
      )}

      {/* Desktop-only "Paste a list instead" link — mobile has it inline in helper text */}
      {mode === "dropzone" && (
        <button
          type="button"
          onClick={() => setMode("paste")}
          className="hidden md:inline-block mt-[14px] text-[13px] whitespace-nowrap text-[color:var(--accent)]"
        >
          {collectionChassisCopy.upload.paste} →
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
