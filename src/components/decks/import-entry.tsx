"use client";

// Deck import entry surface — states 1, 3, 8, 9 and 10 of the deck-import
// handoff. The link mode (states 2 and 4–7) is absent for good: the fetch spike
// (#191) found the host it was drawn against answers 403 behind bot protection,
// and a decklist arrives here by paste or by file instead (#282). MODES below is
// the seam if a third door ever opens.

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importDeck, type ImportCommanderCandidate } from "../../app/decks/import-actions";
import { deckImportCopy as copy } from "../../lib/copy/deck-import";
import { deckPasteCardCount } from "../../lib/decks/paste-count";
import { IMPORTED_PARAM, PRECON_ADDED_PARAM, PRINTINGS_PARAM, arrivalPrintingsParam } from "../../lib/decks/arrival";
import {
  DECK_IMPORT_FILE_MAX_BYTES,
  PASTE_MAX_BYTES,
  isDeckImportTooLargeMessage,
  type DeckImportSource,
} from "../../lib/upload-limits";
import { GhostButton, PrimaryButton } from "../ui/button";
import { OptInCheckbox } from "../ui/opt-in-checkbox";
import { Crown } from "../ui/crown";
import { TextField } from "../ui/text-field";
import { CreatePicker } from "./create-picker";
import { ImportNoCommander } from "./import-no-commander";
import { DECK_NAME_MAX } from "../../lib/decks/deck-name";
import { usePendingPush } from "../shell/pending-push";

type ImportMode = Extract<DeckImportSource, "paste" | "file">;

const MODES: { id: ImportMode; label: string; shortLabel: string }[] = [
  { id: "paste", label: copy.entry.modePaste, shortLabel: copy.entry.modePasteShort },
  { id: "file", label: copy.entry.modeFile, shortLabel: copy.entry.modeFileShort },
];

type FailureKind = "fileRejected" | "noneMatched" | "empty" | "badCsv" | "unexpected" | "addFailed" | "addUnsure";

type Failure =
  | { kind: "fileRejected"; ext: string; size: string }
  | { kind: "noneMatched"; lineCount: number }
  | { kind: "empty" }
  | { kind: "badCsv"; detail: string }
  | { kind: "unexpected"; detail: string | null }
  /** S11: the ticked import's add was refused; nothing was written. */
  | { kind: "addFailed" }
  /** The ticked import threw: the add may have committed with its answer lost, so the retry carries the same id. */
  | { kind: "addUnsure" };

/** One press's arguments, kept so the banner's Try again repeats exactly that press (the picked commander included). */
type SubmitArgs = { commanderOracleId?: string; name: string; partnerOracleId: string | null };

/**
 * States 11–12. The source named no commander, so nothing has been written and
 * the surface hands the decision to the player: the picker when the list holds
 * legendary creatures, the dead end when it does not. A *declared* commander
 * never gets here — `importDeck` uses it and says nothing.
 */
type CommanderStep = { candidates: ImportCommanderCandidate[]; lineCount: number };

const ACCEPTED_EXTENSIONS = [".csv", ".txt"];

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  // A trailing dot leaves nothing after it, so `decklist.` has no extension to
  // name — returning "." would put "That one is a . at 40 KB" in the banner.
  if (dot === -1 || dot === name.length - 1) return "";
  return name.slice(dot).toLowerCase();
}

function formatBytes(bytes: number): string {
  // Rounded up, never to nearest. This size only ever appears beside the cap it
  // broke, and a file one byte over 2 MB rendered as "2.0 MB" reads as inside a
  // 2 MB limit — the banner would then contradict itself.
  if (bytes >= 1024 * 1024) return `${(Math.ceil((bytes / (1024 * 1024)) * 10) / 10).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${bytes} byte${bytes === 1 ? "" : "s"}`;
}

/**
 * `compact` draws the door without its page furniture: no heading, no
 * subtitle, and a paste box at four lines instead of three hundred pixels.
 *
 * `/about` is the only caller. Its entry already carries this route's title
 * and its sentence, so the heading and subtitle arrive as a second copy of
 * both — and an empty 300px paste target conveys nothing a figure needs while
 * taking more height than the viewport has. The route itself never passes it:
 * on `/decks/import` the heading names the page and the box is a real target.
 */
export function ImportEntry({ compact = false, canOwn = false }: {
  compact?: boolean;
  /**
   * `NO_COLLECTION_ENTRY_ENABLED`, resolved for the reader by the page (S8): the form offers `I own these cards`.
   * Off, the form and the payload are exactly as shipped.
   */
  canOwn?: boolean;
} = {}) {
  const router = useRouter();
  const nav = usePendingPush();
  const [mode, setMode] = useState<ImportMode>("paste");
  const [pasteText, setPasteText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [commanderStep, setCommanderStep] = useState<CommanderStep | null>(null);
  // `I own these cards`: unticked by default (S8), and kept through the commander step and every failure.
  const [own, setOwn] = useState(false);
  // The ticked press's idempotency id: minted once per submission and reused by every retry of it (the commander
  // step's second pass, Try again), so a press whose answer was lost lands on the deck it made rather than a second.
  // A different list is a different submission and drops it; a name edit does not, since a retry may rename.
  const actionIdRef = useRef<string | null>(null);
  const lastSubmit = useRef<SubmitArgs | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);

  const pasteCount = useMemo(
    // Read as the import reads it: no section header or sideboard line counts as a card.
    () => deckPasteCardCount(pasteText),
    [pasteText],
  );

  /**
   * A different list is a different submission: it drops the id, the retry's arguments (the commanders a picker
   * chose for the old list) and a refused add's banner, whose Try again would otherwise send the new list under them.
   */
  function newSubmission() {
    actionIdRef.current = null;
    lastSubmit.current = null;
    setFailure((f) => (f && (f.kind === "addFailed" || f.kind === "addUnsure") ? null : f));
  }

  function selectMode(next: ImportMode) {
    // Pressing the tab already chosen changes nothing, so it keeps the id and a refused add's Try again.
    if (next === mode) return;
    setMode(next);
    setFailure(null);
    newSubmission();
  }

  function acceptFile(candidate: File) {
    const ext = fileExtension(candidate.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext) || candidate.size > DECK_IMPORT_FILE_MAX_BYTES) {
      setFile(null);
      // A file with no dot has no extension to name, and falling back to the
      // whole filename makes the copy read "That one is a shopping-list at 40 KB".
      fail({
        kind: "fileRejected",
        ext: ext || copy.failures.fileRejected.noExtension,
        size: formatBytes(candidate.size),
      });
      return;
    }
    setFailure(null);
    setFile(candidate);
    newSubmission();
  }

  /**
   * Every failure leaves the commander step behind it. The picker outranks the
   * banner in the render below, so a failure on the second pass — an empty list,
   * nothing matched, a throw — would otherwise set a banner nobody ever sees and
   * strand the player on a picker that had just refused them. Routed through one
   * function so a branch added later cannot forget.
   */
  function fail(next: Failure) {
    setCommanderStep(null);
    setFailure(next);
  }

  function submit(
    commanderOracleId?: string,
    name = deckName,
    partnerOracleId: string | null = null,
  ) {
    // `pending` alone cannot hold this door. It only turns true on the re-render
    // that follows `startTransition`, so two clicks in one tick both read false
    // and both reach the server — and `importDeck` deliberately does not dedupe,
    // so that is two decks. The ref flips synchronously and closes the gap.
    if (pending || inFlight.current) return;
    inFlight.current = true;
    // The picker lets the player edit the name, and a failure on the second pass
    // drops them back here. Without this the field would revert to what they
    // typed before the picker and quietly discard the edit.
    setDeckName(name);
    setFailure(null);
    lastSubmit.current = { commanderOracleId, name, partnerOracleId };
    const sentOwn = canOwn && own;
    const actionId = sentOwn ? (actionIdRef.current ??= crypto.randomUUID()) : null;
    startTransition(async () => {
      let committed = false;
      try {
        const text = mode === "paste" ? pasteText : ((await file?.text()) ?? "");
        const result = await importDeck({
          text,
          source: mode,
          name: name.trim(),
          // Omitted rather than passed as undefined so the first pass sends the
          // exact payload it always has. The second pass sends the partner slot
          // even when it is empty: a `null` there is the player's answer that
          // this deck has one commander, and the action reads an absent key as
          // the paste's declaration standing.
          ...(commanderOracleId ? { commanderOracleId, partnerOracleId } : {}),
          // Only when ticked, so an unticked press sends the exact payload it always has.
          ...(actionId ? { own: true, actionId } : {}),
        });
        if (result.ok) {
          committed = true;
          // The param is the whole provenance signal for the arrival chrome.
          // It belongs on the navigation rather than in a column: the deck was
          // not "imported" forever, it was imported on this one trip.
          const printings = arrivalPrintingsParam(result.printingsKept, result.printingsNotOwned);
          // The add's entry rides beside it as a claim the deck page checks against the ledger (S10's strip).
          router.push(
            `/decks/${result.deckId}?${IMPORTED_PARAM}=1${printings ? `&${PRINTINGS_PARAM}=${printings}` : ""}${actionId ? `&${PRECON_ADDED_PARAM}=${actionId}` : ""}`,
          );
          return;
        }
        // S11: nothing was written. The list, the name and the tick stay, and the id is kept for Try again.
        if (result.reason === "addFailed") {
          fail({ kind: "addFailed" });
          return;
        }
        if (result.reason === "noRows") {
          fail({ kind: "empty" });
          return;
        }
        if (result.reason === "noneMatched") {
          fail({ kind: "noneMatched", lineCount: result.lineCount });
          return;
        }
        if (result.reason === "csvInvalid") {
          fail({ kind: "badCsv", detail: result.detail });
          return;
        }
        // States 11–12. Nothing was written; the list is still in `pasteText` /
        // `file`, so the second pass re-sends it with the commander the player picked.
        if (result.reason === "commanderNeeded") {
          setCommanderStep({ candidates: result.candidates, lineCount: result.lineCount });
          return;
        }
      } catch (e) {
        // importDeck throws on the size cap and on an illegal commander. Unhandled,
        // a throw inside a transition reaches the error boundary and takes the
        // player's list with it; the banner keeps the list on the page.
        //
        // The size cap is the player's to fix, so its message is surfaced rather
        // than blamed on us. It is also the client's only byte-accurate signal:
        // the textarea's maxLength counts characters while the server counts
        // UTF-8 bytes, so a multi-byte list can clear the client guard and still
        // be refused. Only that message is shown — every other throw is an
        // internal invariant ("card is not a legal commander") that would read as
        // gibberish, so those fall back to the generic body.
        const message = e instanceof Error ? e.message : "";
        const tooLarge = isDeckImportTooLargeMessage(message);
        // A ticked press that threw may have added the cards and made the deck with its answer lost. Its Try again
        // carries the same id, so it lands on that deck. The size cap refuses before any write, so it stays the
        // player's to fix.
        if (actionId && !tooLarge) {
          fail({ kind: "addUnsure" });
          return;
        }
        fail({
          kind: "unexpected",
          detail: tooLarge ? message : null,
        });
      } finally {
        // Released on every outcome except a deck that was actually written.
        // `router.push` is asynchronous, so releasing there too would hand the
        // surface back to the player for as long as the route takes to fetch —
        // and a click in that window is a second deck. The commander step is
        // why this cannot simply latch shut on the way in: that path writes
        // nothing and must be able to submit a second time.
        if (!committed) inFlight.current = false;
      }
    });
  }

  const canSubmit =
    deckName.trim().length > 0 && (mode === "paste" ? pasteText.trim().length > 0 : file !== null);

  if (pending) return <ParsingBlock />;

  // State 12 first: an import with no legendary creature cannot become a Commander
  // deck at all, so it is a dead end rather than an empty picker.
  if (commanderStep && commanderStep.candidates.length === 0) {
    return (
      <ImportNoCommander
        lineCount={commanderStep.lineCount}
        onBack={() => setCommanderStep(null)}
        onStartFromCommander={() => nav.go("/decks/new")}
      />
    );
  }

  // State 11.
  if (commanderStep) {
    return (
      <CreatePicker
        mode="import"
        candidates={commanderStep.candidates}
        initialName={deckName}
        onSubmit={(oracleId, name, partnerOracleId) => submit(oracleId, name, partnerOracleId)}
      />
    );
  }

  return (
    <div
      className={
        compact
          ? "w-full"
          : "p-[16px_18px_24px] md:mx-auto md:w-full md:max-w-[760px] md:p-[44px_48px]"
      }
    >
      {!compact && (
        <>
          <h2 className="font-display font-bold text-[20px] md:text-[28px] m-0 text-[color:var(--fg)]">
            {copy.entry.heading}
          </h2>
          <p className="mt-[3px] md:mt-[4px] font-mono text-[10px] text-[color:var(--fg-faint)] md:font-sans md:text-[14px] md:text-[color:var(--fg-muted)]">
            <span className="md:hidden">{copy.entry.subMobile}</span>
            <span className="hidden md:inline">{copy.entry.sub}</span>
          </p>
        </>
      )}

      <div
        role="group"
        aria-label={copy.entry.heading}
        className="flex gap-[8px] md:gap-[9px] mt-[16px] mb-[16px] md:mb-[22px]"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            // The visible label swaps to the short form below md, which would
            // otherwise hand a screen reader a different name at each breakpoint.
            aria-label={m.label}
            aria-pressed={mode === m.id}
            onClick={() => selectMode(m.id)}
            className={[
              "rounded-full font-sans cursor-pointer min-h-[44px]",
              "text-[12.5px] md:text-[13px] px-[14px] md:px-[16px] py-[8px] md:py-[9px]",
              mode === m.id
                ? "font-semibold bg-[color:var(--accent)] text-[color:var(--bg)] border border-solid border-[color:var(--accent)]"
                : "bg-[color:var(--elevated)] text-[color:var(--fg-body)] border border-solid border-[color:var(--border-strong)] md:hover:border-[color:var(--accent)] md:hover:text-[color:var(--accent-hover)] transition-colors",
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
            htmlFor="import-paste"
            className="block text-[13px] font-semibold mb-[8px] text-[color:var(--fg)]"
          >
            {copy.entry.pasteLabel}
          </label>
          <textarea
            id="import-paste"
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              newSubmission();
            }}
            maxLength={PASTE_MAX_BYTES}
            placeholder={copy.entry.pastePlaceholder}
            aria-describedby={failure ? "import-failure" : undefined}
            className={`${compact ? "h-[92px]" : "h-[300px]"} w-full rounded-lg p-[14px_16px] font-mono text-[16px] md:text-[13px] resize-none bg-[color:var(--surface-sunken)] border border-solid border-[color:var(--border-strong)] text-[color:var(--fg-body)] caret-[color:var(--accent)] placeholder:text-[color:var(--fg-placeholder)]`}
          />
        </div>
      ) : (
        <div>
          <label
            htmlFor="import-file"
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
                : "[border:1.5px_dashed_var(--border-dashed)] md:hover:[border:1.5px_dashed_var(--accent)] transition-colors",
            ].join(" ")}
          >
            <input
              id="import-file"
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              aria-describedby={failure ? "import-failure" : undefined}
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
            setFailure(null);
            // Try again repeats the refused press, with the same id and the name as it stands now: a name edit
            // keeps the id, since a retry may rename.
            if ((failure.kind === "addFailed" || failure.kind === "addUnsure") && lastSubmit.current) {
              const last = lastSubmit.current;
              submit(last.commanderOracleId, deckName, last.partnerOracleId);
              return;
            }
            if (failure.kind === "fileRejected") fileInputRef.current?.click();
            // All three offer a fresh start, so all three clear whichever input
            // this mode is actually using — clearing only one leaves the other
            // holding the list the player was just told did not work.
            if (failure.kind === "noneMatched" || failure.kind === "empty" || failure.kind === "badCsv") {
              setPasteText("");
              setFile(null);
            }
          }}
        />
      )}

      <label
        htmlFor="import-deck-name"
        className="block text-[13px] font-semibold mt-[16px] mb-[8px] text-[color:var(--fg)]"
      >
        {copy.commander.nameLabel}
      </label>
      <TextField
        id="import-deck-name"
        value={deckName}
        onChange={(e) => setDeckName(e.target.value)}
        maxLength={DECK_NAME_MAX}
        className="block w-full rounded-[8px] p-[12px_14px] text-[16px] md:text-[14.5px]"
      />

      {/* S8: under Deck name, above the import button. A 44px row on the phone, centred there as drawn. */}
      {canOwn && (
        <OptInCheckbox
          checked={own}
          onChange={setOwn}
          className="mt-[16px] min-h-[44px] items-center md:min-h-0 md:items-start"
        >
          {copy.entry.own}
        </OptInCheckbox>
      )}

      <PrimaryButton
        // Wrapped: a bare `submit` would receive the click event as its first
        // argument and post it as a commander id.
        onClick={() => submit()}
        disabled={!canSubmit}
        className="w-full md:w-auto mt-[16px] text-[15px] md:text-[14px] py-[13px] md:py-0 md:px-[24px] md:h-[44px] min-h-[44px] md:whitespace-nowrap disabled:opacity-50"
      >
        {mode === "paste" ? copy.entry.submitPasteCount(pasteCount) : copy.entry.submit}
      </PrimaryButton>

      <p className="mt-[16px] text-[12.5px] leading-[1.55] text-[color:var(--fg-faint)] md:hidden">
        {copy.entry.footnoteMobile}
      </p>
      <div className="hidden md:grid md:grid-cols-2 md:gap-[24px] md:mt-[26px] md:pt-[20px] md:border-t md:border-[color:var(--border)]">
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase mb-[7px] text-[color:var(--fg-faint)]">
            {copy.entry.aboutWhatComesHeading}
          </p>
          <p className="text-[13px] leading-[1.6] text-[color:var(--fg-body)]">
            {copy.entry.aboutWhatComes}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase mb-[7px] text-[color:var(--fg-faint)]">
            {copy.entry.aboutFailureHeading}
          </p>
          <p className="text-[13px] leading-[1.6] text-[color:var(--fg-body)]">
            {copy.entry.aboutFailure}
          </p>
        </div>
      </div>
    </div>
  );
}

function ParsingBlock() {
  // The handoff draws a determinate bar and a `done / total` figure, but
  // `importDeck` is one server-action round trip returning only a terminal
  // result — there is no progress channel and no `total` until it answers.
  // A faked bar would report a number nothing measured, so the indeterminate
  // dots stand in until a streaming API exists. Escalated to Design.
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-[16px_18px_24px] md:p-[34px_48px]">
      <Crown tone="page" pulse className="mb-[18px] md:mb-[12px]" />
      <h2 className="font-display font-bold text-[17px] md:text-[19px] m-0 text-[color:var(--fg)]">
        {copy.parsing.heading}
      </h2>
      <div role="status" aria-live="polite" className="sr-only">
        {copy.parsing.live}
      </div>
    </div>
  );
}

const FAILURE_ACTION: Record<FailureKind, string> = {
  fileRejected: copy.failures.fileRejected.action,
  noneMatched: copy.failures.noneMatched.action,
  empty: copy.failures.empty.action,
  badCsv: copy.failures.badCsv.action,
  unexpected: copy.failures.unexpected.action,
  addFailed: copy.failures.addFailed.action,
  addUnsure: copy.failures.addUnsure.action,
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
    case "badCsv":
      return {
        heading: copy.failures.badCsv.heading,
        bodyMobile: copy.failures.badCsv.bodyMobile(failure.detail),
        body: copy.failures.badCsv.body(failure.detail),
      };
    case "unexpected":
      return {
        heading: copy.failures.unexpected.heading,
        bodyMobile: copy.failures.unexpected.bodyMobile(failure.detail),
        body: copy.failures.unexpected.body(failure.detail),
      };
    // The precon add's own sentence, alone: the handoff draws it as one line with Try again.
    case "addFailed":
      return { heading: copy.failures.addFailed.heading, bodyMobile: "", body: "" };
    case "addUnsure":
      return { heading: copy.failures.addUnsure.heading, bodyMobile: "", body: "" };
  }
}

function FailureBanner({ failure, onAction }: { failure: Failure; onAction: () => void }) {
  const { heading, bodyMobile, body } = failureText(failure);
  return (
    <div
      id="import-failure"
      role="alert"
      className="flex items-start gap-[10px] md:gap-[12px] rounded-lg md:rounded-[10px] p-[12px_14px] md:p-[16px_18px] mt-[12px] md:mt-[14px] bg-[color:var(--elevated-hover)] border border-solid border-[color:var(--border-strong)] [border-left:3px_solid_var(--warning)]"
    >
      <span aria-hidden className="text-[15px] md:text-[17px] leading-[1.3] md:leading-[1.2] text-[color:var(--warning)]">
        ⚠
      </span>
      <div>
        <p className="text-[14px] md:text-[15px] font-semibold leading-[1.4] text-[color:var(--fg)]">
          {heading}
        </p>
        {body && (
          <p className="mt-[5px] md:mt-[6px] text-[12.5px] md:text-[14px] leading-[1.55] md:leading-[1.6] text-[color:var(--fg-body)]">
            <span className="md:hidden">{bodyMobile}</span>
            <span className="hidden md:inline">{body}</span>
          </p>
        )}
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
