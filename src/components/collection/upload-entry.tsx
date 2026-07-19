"use client";

// INTERIM upload UI — the designed 3-step review/replace flow lives in #6.
// This ships a functional dropzone + paste fallback so first-run's Step 1
// can complete end-to-end (parse → preview → confirm → dashboard).
// Style per property table §CSV Dropzone / §Paste-List View (compact).

import { useState, useTransition, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { parsePasteList } from "../../lib/manabox/paste";
import {
  previewUpload,
  previewPaste,
  confirmUpload,
  type UploadPreview,
} from "../../app/collection/actions";

type Mode = "dropzone" | "paste";

export function UploadEntry() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("dropzone");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live client-side parse — feeds the recognized-count label and the
  // "Import {n} cards" button per §Paste-List View.
  // Memoised to avoid re-parsing on every render (only changes when pasteText changes).
  const { pasteCardCount, pasteLineCount } = useMemo(() => {
    if (!pasteText.trim()) return { pasteCardCount: 0, pasteLineCount: 0 };
    // Same line semantics as parsePasteList: split on \r?\n, ignore blanks.
    const pasteLineCount = pasteText
      .split(/\r?\n/)
      .filter((l) => l.trim() !== "").length;
    const pasteCardCount = parsePasteList(pasteText).rows.reduce(
      (n, r) => n + r.quantity,
      0,
    );
    return { pasteCardCount, pasteLineCount };
  }, [pasteText]);

  // All server calls run through `pending` so double-clicks / repeated drops
  // can't fire concurrent previews (each preview creates a csv_uploads row).
  function handleFile(file: File) {
    if (pending) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      try {
        const p = await previewUpload(fd);
        setPreview(p);
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
        setPreview(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Parse failed");
      }
    });
  }

  function handleConfirm() {
    if (!preview || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        await confirmUpload(preview.uploadId);
        setPreview(null);
        setPasteText("");
        router.refresh(); // Server actions already revalidatePath("/", "/collection").
      } catch (e) {
        setError(e instanceof Error ? e.message : "Confirm failed");
      }
    });
  }

  if (preview) {
    return (
      <div className="rounded-lg bg-[color:var(--surface-sunken)] p-4 [border:1px_solid_var(--border-strong)]">
        <p
          className="font-display font-semibold"
          style={{ fontSize: 18, color: "var(--fg)" }}
        >
          Review before importing
        </p>
        <ul
          className="mt-3 space-y-1 font-mono"
          style={{ fontSize: 13, color: "var(--fg-body)" }}
        >
          <li>
            Matched:{" "}
            <span style={{ color: "var(--success)" }}>
              {preview.matchedCardCount}
            </span>{" "}
            cards
          </li>
          <li>
            Unmatched:{" "}
            <span style={{ color: "var(--warning)" }}>
              {preview.unmatchedRows.length}
            </span>{" "}
            rows
          </li>
          <li>
            Parse errors:{" "}
            <span style={{ color: "var(--danger)" }}>
              {preview.parseErrors.length}
            </span>
          </li>
          {preview.currentCollectionCount > 0 && (
            <li style={{ color: "var(--warning)" }}>
              Confirming will REPLACE your current{" "}
              {preview.currentCollectionCount.toLocaleString()} cards.
            </li>
          )}
        </ul>
        {error && (
          <p className="mt-3 text-[13px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="rounded-lg px-5 py-3 font-semibold bg-[color:var(--brass)] text-[color:var(--bg)] hover:bg-[color:var(--brass-hover)]"
            style={{ fontSize: 14 }}
          >
            {pending ? "Importing…" : "Confirm import"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setError(null);
            }}
            className="rounded-lg px-5 py-3 hover:bg-[color:var(--elevated)]"
            style={{
              border: "1px solid var(--border-strong)",
              color: "var(--fg)",
              fontSize: 14,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {mode === "dropzone" ? (
        // Dropzone: mobile = centered column, desktop = flex row (icon left, text right)
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={[
            "block cursor-pointer text-center",
            // Mobile: column layout, rounded-[10px], p-[22px_16px]
            // Desktop: flex row, rounded-xl, p-[34px]
            "rounded-[10px] md:rounded-xl",
            "p-[22px_16px] md:p-[34px]",
            "md:flex md:items-center md:gap-[28px] md:text-left",
            // Drag-over toggles background + border via class swap
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
            onChange={(e) => {
              const f = e.target.files?.[0];
              // Reset so re-selecting the same file after a cancelled preview
              // still fires change.
              e.target.value = "";
              if (f) handleFile(f);
            }}
          />

          {/* Upload icon ring: mobile 40×40 / 18px icon, desktop 56×56 / 24px icon */}
          <div
            className={[
              "flex flex-shrink-0 items-center justify-center rounded-full",
              // Mobile: auto margin centers it in the column, desktop: no auto margin (flex row)
              "mx-auto mb-3 h-[40px] w-[40px] text-[18px]",
              "md:mx-0 md:mb-0 md:h-[56px] md:w-[56px] md:text-[24px]",
            ].join(" ")}
            style={{
              border: "1px solid var(--brass)",
              color: "var(--brass)",
            }}
            aria-hidden
          >
            ↑
          </div>

          {/* Text block */}
          <div>
            {/* Primary label: mobile 14px, desktop 17px */}
            <div
              className="font-semibold text-[14px] md:text-[17px]"
              style={{ color: "var(--fg)" }}
            >
              {/* Mobile shows shorter copy, desktop shows full */}
              <span className="md:hidden">Drop your collection CSV</span>
              <span className="hidden md:inline">Drop your collection CSV here</span>
            </div>

            {/* Format hint: mono, mobile 10px, desktop 11px */}
            <div
              className="mt-[6px] font-mono tracking-[0.06em] text-[10px] md:text-[11px]"
              style={{ color: "var(--fg-faint)" }}
            >
              ManaBox CSV export · more formats arrive with #6
            </div>

            {/* Browse files button: mobile mt-[14px], desktop no margin-top (in flex row) */}
            <button
              type="button"
              className={[
                "mt-[14px] rounded-lg font-semibold",
                "px-[18px] py-[10px] text-[13px]",
                "md:px-[22px] md:py-[11px] md:text-[14px] md:whitespace-nowrap",
                "bg-[color:var(--brass)] text-[color:var(--bg)]",
                "hover:bg-[color:var(--brass-hover)]",
              ].join(" ")}
              // Interactive elements inside a <label> don't forward activation
              // to the labeled input (HTML spec) — open the picker explicitly.
              onClick={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
            >
              Browse files
            </button>

            {/* Help text: mobile 12px mt-[12px], desktop 13px no margin-top (line break) */}
            <p
              className="mt-[12px] text-[12px] leading-[1.5] md:text-[13px]"
              style={{ color: "var(--fg-faint)" }}
            >
              <span className="md:hidden">
                Needs a <strong style={{ color: "var(--fg-body)", fontWeight: 600 }}>Name</strong> and{" "}
                <strong style={{ color: "var(--fg-body)", fontWeight: 600 }}>Quantity</strong>{" "}
                column — most exports already have them.
              </span>
              <span className="hidden md:inline">
                We only need a <strong style={{ color: "var(--fg-body)", fontWeight: 600 }}>Name</strong> and{" "}
                <strong style={{ color: "var(--fg-body)", fontWeight: 600 }}>Quantity</strong>{" "}
                column — most exports already include them.
              </span>
            </p>
          </div>
        </label>
      ) : (
        // Paste view — mobile-primary fallback
        <div
          className="rounded-[10px]"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {/* Header with back arrow */}
          <div
            className="flex items-center gap-3"
            style={{
              padding: "20px 20px 14px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => setMode("dropzone")}
              aria-label="Back to dropzone"
              className="text-[20px] leading-none"
              style={{ color: "var(--brass)" }}
            >
              ‹
            </button>
            <span
              className="font-display font-semibold text-[18px]"
              style={{ color: "var(--fg)" }}
            >
              Paste a list
            </span>
          </div>

          <div className="p-4">
            <p
              className="mb-[14px] text-[13px] leading-[1.55]"
              style={{ color: "var(--fg-body)" }}
            >
              One card per line — quantity, then name. We&apos;ll match them
              against the Oracle database.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              aria-label="Paste your card list"
              maxLength={100_000} // aligned with previewPaste's 100 KB server cap
              className="h-[300px] w-full rounded-[10px] p-[14px_16px] font-mono text-[13px] leading-[1.9] resize-none"
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--border-strong)",
                color: "var(--fg-body)",
                caretColor: "var(--fg-locked)", // §Paste textarea cursor color #6A6152
              }}
              placeholder={"3 Sol Ring\n1 Cultivate\nRhystic Study"}
            />
            {/* Recognized count label */}
            {pasteText.trim() && (
              <p
                className="mt-[10px] font-mono text-[11px]"
                style={{ color: "var(--fg-faint)" }}
              >
                {pasteLineCount} lines · {pasteCardCount} cards recognized
              </p>
            )}
            <button
              type="button"
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim() || pending}
              className="mt-[16px] w-full rounded-lg py-[13px] font-semibold text-[15px] bg-brass text-bg hover:bg-brass-hover disabled:opacity-50"
            >
              {pasteCardCount > 0 ? `Import ${pasteCardCount} cards` : "Import list"}
            </button>
          </div>
        </div>
      )}

      {/* Mode toggle link */}
      {mode === "dropzone" ? (
        <button
          type="button"
          onClick={() => setMode("paste")}
          className="mt-4 text-[12px] md:text-[13px]"
          style={{ color: "var(--brass)" }}
        >
          Paste a list instead
          <span className="hidden md:inline"> →</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setMode("dropzone")}
          className="mt-[14px] block text-center w-full text-[13px]"
          style={{ color: "var(--brass)" }}
        >
          Upload a CSV instead
        </button>
      )}

      {error && (
        <p className="mt-3 text-[13px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
