"use client";

// Update-from-a-list surface (#277). Owns all five steps of the flow: the list,
// the diff, and the three terminal screens between them.
//
// It reuses the import entry's paste/file machinery — same modes, same dropzone,
// same byte caps, same failure banners — and drops the two fields that flow has
// and this one must not: the deck's name and the commander picker. Both are
// facts about the deck this list is being compared against, and the whole
// premise is that neither of them changes.

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deckImportCopy as copy } from "../../lib/copy/deck-import";
import { parsePasteList } from "../../lib/manabox/paste";
import { UPDATED_PARAM } from "../../lib/decks/arrival";
import {
  previewDeckUpdate,
  updateDeckFromList,
  type DeckUpdatePreview,
} from "../../app/decks/update-actions";
import {
  DECK_IMPORT_FILE_MAX_BYTES,
  PASTE_MAX_BYTES,
  isDeckImportTooLargeMessage,
  type DeckImportSource,
} from "../../lib/upload-limits";
import { GhostButton, PrimaryButton } from "../ui/button";
import { Crown } from "../ui/crown";
import { UpdateDiff } from "./update-diff";

type UpdateMode = Extract<DeckImportSource, "paste" | "file">;

const MODES: { id: UpdateMode; label: string; shortLabel: string }[] = [
  { id: "paste", label: copy.entry.modePaste, shortLabel: copy.entry.modePasteShort },
  { id: "file", label: copy.entry.modeFile, shortLabel: copy.entry.modeFileShort },
];

const ACCEPTED_EXTENSIONS = [".csv", ".txt"];

type FailureKind = "fileRejected" | "noneMatched" | "empty" | "unexpected";

type Failure =
  | { kind: "fileRejected"; ext: string; size: string }
  | { kind: "noneMatched"; lineCount: number }
  | { kind: "empty" }
  | { kind: "unexpected"; detail: string | null };

/** What the flow is showing. The list step is the absence of all of these. */
type Step =
  | { kind: "diff"; preview: DeckUpdatePreview }
  | { kind: "noChange"; built: number }
  | { kind: "conflict"; listCommander: string; deckCommander: string };

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot === -1 || dot === name.length - 1) return "";
  return name.slice(dot).toLowerCase();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(Math.ceil((bytes / (1024 * 1024)) * 10) / 10).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${bytes} byte${bytes === 1 ? "" : "s"}`;
}

export function UpdateEntry({ deckId, deckName }: { deckId: string; deckName: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<UpdateMode>("paste");
  const [pasteText, setPasteText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  /** State 18. Separate from `failure`: it is a refused *write*, and its copy
   *  promises the deck is untouched — a claim the list step cannot make. */
  const [refused, setRefused] = useState(false);
  const [comparing, startComparing] = useTransition();
  const [applying, startApplying] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pasteCount = useMemo(
    () => (pasteText.trim() ? parsePasteList(pasteText).rows.reduce((n, r) => n + r.quantity, 0) : 0),
    [pasteText],
  );

  function acceptFile(candidate: File) {
    const ext = fileExtension(candidate.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext) || candidate.size > DECK_IMPORT_FILE_MAX_BYTES) {
      setFile(null);
      setFailure({
        kind: "fileRejected",
        ext: ext || copy.failures.fileRejected.noExtension,
        size: formatBytes(candidate.size),
      });
      return;
    }
    setFailure(null);
    setFile(candidate);
  }

  /** The text of whichever mode is active, read once per submission. Both the
   *  compare and the apply need it, and the apply must send byte-for-byte what
   *  the compare did or the server re-derives a different diff. */
  async function listText(): Promise<string> {
    return mode === "paste" ? pasteText : ((await file?.text()) ?? "");
  }

  function compare() {
    setFailure(null);
    startComparing(async () => {
      try {
        const result = await previewDeckUpdate({ deckId, text: await listText(), source: mode });
        if (!result.ok) {
          if (result.reason === "noRows") setFailure({ kind: "empty" });
          else if (result.reason === "noneMatched")
            setFailure({ kind: "noneMatched", lineCount: result.lineCount });
          else
            setStep({
              kind: "conflict",
              listCommander: result.listCommander,
              deckCommander: result.deckCommander,
            });
          return;
        }
        setStep(
          result.noChange ? { kind: "noChange", built: result.built } : { kind: "diff", preview: result },
        );
      } catch (e) {
        // A throw inside a transition reaches the error boundary and takes the
        // player's list with it. The size cap's message is theirs to act on and
        // is surfaced; every other throw is an internal invariant and falls back
        // to the generic body.
        const message = e instanceof Error ? e.message : "";
        setFailure({
          kind: "unexpected",
          detail: isDeckImportTooLargeMessage(message) ? message : null,
        });
      }
    });
  }

  function apply(keep: string[], lockedSeen: string[]) {
    setRefused(false);
    startApplying(async () => {
      try {
        const result = await updateDeckFromList({
          deckId,
          text: await listText(),
          source: mode,
          keep,
          lockedSeen,
        });
        // Provenance for one navigation, not deck state — the same reason the
        // import's `?imported=1` lives in the URL rather than in a column.
        router.push(
          result.versioned
            ? `/decks/${deckId}`
            : `/decks/${deckId}?${UPDATED_PARAM}=${result.in}-${result.out}-${result.kept}`,
        );
      } catch {
        setRefused(true);
      }
    });
  }

  if (applying) return <ApplyingBlock />;
  if (comparing) return <ParsingBlock />;

  if (refused) {
    return (
      <Terminal heading={copy.update.refused.heading} body={copy.update.refused.body}>
        <PrimaryButton
          onClick={() => setRefused(false)}
          className="w-full md:w-auto text-[15px] md:text-[14px] py-[13px] md:py-0 md:px-[24px] md:h-[44px] min-h-[44px]"
        >
          {copy.update.refused.action}
        </PrimaryButton>
      </Terminal>
    );
  }

  if (step?.kind === "noChange") {
    return (
      <Terminal
        heading={copy.update.noChange.heading}
        body={copy.update.noChange.body(String(step.built))}
        crown
      >
        <PrimaryButton
          onClick={() => router.push(`/decks/${deckId}`)}
          className="w-full md:w-auto text-[15px] md:text-[14px] py-[13px] md:py-0 md:px-[24px] md:h-[44px] min-h-[44px]"
        >
          {copy.update.noChange.back}
        </PrimaryButton>
        <GhostButton
          onClick={() => setStep(null)}
          className="w-full md:w-auto text-[14px] md:text-[13px] py-[12px] md:py-[10px] md:px-[20px] min-h-[44px]"
        >
          {copy.update.noChange.retry}
        </GhostButton>
      </Terminal>
    );
  }

  if (step?.kind === "conflict") {
    return (
      <Terminal
        heading={copy.update.conflict.heading(step.listCommander)}
        body={copy.update.conflict.body(step.deckCommander)}
      >
        <PrimaryButton
          onClick={() => router.push("/decks/import")}
          className="w-full md:w-auto text-[15px] md:text-[14px] py-[13px] md:py-0 md:px-[24px] md:h-[44px] min-h-[44px]"
        >
          {copy.update.conflict.primary}
        </PrimaryButton>
        <GhostButton
          onClick={() => router.push(`/decks/${deckId}`)}
          className="w-full md:w-auto text-[14px] md:text-[13px] py-[12px] md:py-[10px] md:px-[20px] min-h-[44px]"
        >
          {copy.update.conflict.cancel}
        </GhostButton>
      </Terminal>
    );
  }

  if (step?.kind === "diff") {
    return (
      <UpdateDiff
        preview={step.preview}
        applying={applying}
        onApply={(keep) => apply(keep, step.preview.lockedOut ?? [])}
        onCancel={() => router.push(`/decks/${deckId}`)}
        onImportAsNew={() => router.push("/decks/import")}
      />
    );
  }

  const canSubmit = mode === "paste" ? pasteText.trim().length > 0 : file !== null;

  return (
    <div className="p-[16px_18px_24px] md:mx-auto md:w-full md:max-w-[760px] md:p-[44px_48px]">
      <h2 className="font-display font-bold text-[20px] md:text-[28px] m-0 text-[color:var(--fg)]">
        {copy.update.list.heading(deckName)}
      </h2>
      <p className="mt-[3px] md:mt-[4px] font-mono text-[10px] text-[color:var(--fg-faint)] md:font-sans md:text-[14px] md:text-[color:var(--fg-muted)]">
        <span className="md:hidden">{copy.update.list.subMobile}</span>
        <span className="hidden md:inline">{copy.update.list.sub}</span>
      </p>

      <div
        role="group"
        aria-label={copy.update.list.heading(deckName)}
        className="flex gap-[8px] md:gap-[9px] mt-[16px] mb-[16px] md:mb-[22px]"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-label={m.label}
            aria-pressed={mode === m.id}
            onClick={() => {
              setMode(m.id);
              setFailure(null);
            }}
            className={[
              "rounded-full font-sans cursor-pointer min-h-[44px]",
              "text-[12.5px] md:text-[13px] px-[14px] md:px-[16px] py-[8px] md:py-[9px]",
              mode === m.id
                ? "font-semibold bg-[color:var(--accent)] text-[color:var(--bg)] border border-solid border-[color:var(--accent)]"
                : "bg-[color:var(--elevated)] text-[color:var(--fg-body)] border border-solid border-[color:var(--border-strong)] md:hover:border-[color:var(--accent)] md:hover:text-[color:var(--accent-hover)]",
            ].join(" ")}
          >
            <span className="md:hidden">{m.shortLabel}</span>
            <span className="hidden md:inline">{m.label}</span>
          </button>
        ))}
      </div>

      {mode === "paste" ? (
        <div>
          <label
            htmlFor="update-paste"
            className="block text-[13px] font-semibold mb-[8px] text-[color:var(--fg)]"
          >
            {copy.entry.pasteLabel}
          </label>
          <textarea
            id="update-paste"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            maxLength={PASTE_MAX_BYTES}
            placeholder={copy.entry.pastePlaceholder}
            aria-describedby={failure ? "update-failure" : undefined}
            className="h-[300px] w-full rounded-lg p-[14px_16px] font-mono text-[16px] md:text-[13px] resize-none bg-[color:var(--surface-sunken)] border border-solid border-[color:var(--border-strong)] text-[color:var(--fg-body)] caret-[color:var(--accent)] placeholder:text-[color:var(--fg-faint)]"
          />
        </div>
      ) : (
        <div>
          <label
            htmlFor="update-file"
            className="block text-[13px] font-semibold mb-[8px] text-[color:var(--fg)]"
          >
            {copy.entry.fileLabel}
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const dropped = e.dataTransfer.files[0];
              if (dropped) acceptFile(dropped);
            }}
            className={[
              "text-center rounded-[12px] p-[30px_18px] md:p-[40px] bg-[color:var(--surface-sunken)]",
              dragOver
                ? "[border:1.5px_dashed_var(--accent)]"
                : "[border:1.5px_dashed_var(--border-dashed)] md:hover:[border:1.5px_dashed_var(--accent)]",
            ].join(" ")}
          >
            <input
              id="update-file"
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              aria-describedby={failure ? "update-failure" : undefined}
              onChange={(e) => {
                const chosen = e.target.files?.[0];
                e.target.value = "";
                if (chosen) acceptFile(chosen);
              }}
            />
            <PrimaryButton
              onClick={() => fileInputRef.current?.click()}
              className="text-[15px] md:text-[14px] px-[22px] py-[13px] min-h-[44px]"
            >
              {copy.entry.submitFile}
            </PrimaryButton>
            <p className="mt-[14px] font-mono text-[10px] md:text-[11px] tracking-[0.04em] text-[color:var(--fg-faint)]">
              {file ? file.name : copy.entry.fileHint}
            </p>
          </div>
        </div>
      )}

      {failure && (
        <FailureBanner
          failure={failure}
          onAction={() => {
            const kind = failure.kind;
            setFailure(null);
            if (kind === "fileRejected") fileInputRef.current?.click();
            if (kind === "noneMatched" || kind === "empty") {
              setPasteText("");
              setFile(null);
            }
          }}
        />
      )}

      <PrimaryButton
        onClick={compare}
        disabled={!canSubmit}
        className="w-full md:w-auto mt-[16px] text-[15px] md:text-[14px] py-[13px] md:py-0 md:px-[24px] md:h-[44px] min-h-[44px] md:whitespace-nowrap disabled:opacity-50"
      >
        {copy.update.list.submit}
      </PrimaryButton>
      <p className="mt-[10px] mb-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-faint)]">
        {/* The count is the paste's, so it only means anything in paste mode. */}
        <span className="md:hidden">{copy.update.list.reassureMobile}</span>
        <span className="hidden md:inline">
          {mode === "paste" && pasteCount > 0
            ? `${pasteCount} cards. ${copy.update.list.reassure}`
            : copy.update.list.reassure}
        </span>
      </p>

      <div className="hidden md:grid md:grid-cols-2 md:gap-[24px] md:mt-[26px] md:pt-[20px] md:border-t md:border-[color:var(--border)]">
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase mb-[7px] text-[color:var(--fg-faint)]">
            {copy.update.list.aboutHeading}
          </p>
          <p className="text-[13px] leading-[1.6] text-[color:var(--fg-body)]">
            {copy.update.list.about}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase mb-[7px] text-[color:var(--fg-faint)]">
            {copy.update.list.aboutKeepsHeading}
          </p>
          <p className="text-[13px] leading-[1.6] text-[color:var(--fg-body)]">
            {copy.update.list.aboutKeeps}
          </p>
        </div>
      </div>
    </div>
  );
}

/** The three terminal screens share one construct: a heading, a sentence, and
 *  the ways out. None of them is an error, so none of them is `--danger`. */
function Terminal({
  heading,
  body,
  crown,
  children,
}: {
  heading: string;
  body: string;
  crown?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-[16px_18px_24px] md:p-[44px_48px]">
      {crown && <Crown tone="quiet" className="mb-[14px]" />}
      <h2 className="font-display font-bold text-[20px] md:text-[26px] m-0 text-[color:var(--fg)]">
        {heading}
      </h2>
      <p className="mt-[8px] md:max-w-[520px] text-[13.5px] md:text-[15px] leading-[1.6] text-[color:var(--fg-body)]">
        {body}
      </p>
      <div className="mt-[20px] flex flex-col md:flex-row justify-center gap-[10px] md:gap-[12px]">
        {children}
      </div>
    </div>
  );
}

function ParsingBlock() {
  return <Dots heading={copy.parsing.heading} live={copy.parsing.live} />;
}

/** State 17. Its own sentence rather than the parser's: what is happening is a
 *  write, and the transaction is the promise that sentence makes. */
function ApplyingBlock() {
  return (
    <Dots
      heading={copy.update.applying.heading}
      body={copy.update.applying.body}
      live={copy.update.applying.live}
    />
  );
}

function Dots({ heading, body, live }: { heading: string; body?: string; live: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-[16px_18px_24px] md:p-[34px_48px]">
      <Crown tone="page" pulse className="mb-[18px] md:mb-[12px]" />
      <h2 className="font-display font-bold text-[17px] md:text-[19px] m-0 text-[color:var(--fg)]">
        {heading}
      </h2>
      {body && (
        <p className="mt-[6px] mb-0 text-[13px] md:text-[14px] leading-[1.6] text-[color:var(--fg-muted)]">
          {body}
        </p>
      )}
      <div role="status" aria-live="polite" className="sr-only">
        {live}
      </div>
    </div>
  );
}

const FAILURE_ACTION: Record<FailureKind, string> = {
  fileRejected: copy.failures.fileRejected.action,
  noneMatched: copy.failures.noneMatched.action,
  empty: copy.failures.empty.action,
  unexpected: copy.failures.unexpected.action,
};

function failureText(failure: Failure): { heading: string; bodyMobile: string; body: string } {
  switch (failure.kind) {
    case "fileRejected":
      return {
        heading: copy.failures.fileRejected.heading,
        bodyMobile: copy.failures.fileRejected.bodyMobile(failure.ext, failure.size),
        body: copy.failures.fileRejected.body(failure.ext, failure.size),
      };
    case "noneMatched":
      return {
        heading: copy.failures.noneMatched.heading,
        bodyMobile: copy.failures.noneMatched.bodyMobile(failure.lineCount),
        body: copy.failures.noneMatched.body(failure.lineCount),
      };
    case "empty":
      return {
        heading: copy.failures.empty.heading,
        bodyMobile: copy.failures.empty.bodyMobile,
        body: copy.failures.empty.body,
      };
    case "unexpected":
      return {
        heading: copy.failures.unexpected.heading,
        bodyMobile: copy.failures.unexpected.bodyMobile(failure.detail),
        body: copy.failures.unexpected.body(failure.detail),
      };
  }
}

function FailureBanner({ failure, onAction }: { failure: Failure; onAction: () => void }) {
  const { heading, bodyMobile, body } = failureText(failure);
  return (
    <div
      id="update-failure"
      role="alert"
      className="flex items-start gap-[10px] md:gap-[12px] rounded-lg md:rounded-[10px] p-[12px_14px] md:p-[16px_18px] mt-[12px] md:mt-[14px] bg-[color:var(--elevated-hover)] border border-solid border-[color:var(--border-strong)] [border-left:3px_solid_var(--warning)]"
    >
      <span
        aria-hidden
        className="text-[15px] md:text-[17px] leading-[1.3] md:leading-[1.2] text-[color:var(--warning)]"
      >
        ⚠
      </span>
      <div>
        <p className="text-[14px] md:text-[15px] font-semibold leading-[1.4] text-[color:var(--fg)]">
          {heading}
        </p>
        <p className="mt-[5px] md:mt-[6px] text-[12.5px] md:text-[14px] leading-[1.55] md:leading-[1.6] text-[color:var(--fg-body)]">
          <span className="md:hidden">{bodyMobile}</span>
          <span className="hidden md:inline">{body}</span>
        </p>
        <GhostButton
          onClick={onAction}
          className="w-full md:w-auto mt-[14px] text-[14px] md:text-[13px] py-[12px] md:py-[10px] md:px-[20px] min-h-[44px]"
        >
          {FAILURE_ACTION[failure.kind]}
        </GhostButton>
      </div>
    </div>
  );
}
