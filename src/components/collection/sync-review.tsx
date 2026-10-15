"use client";
// Collection Sync, the review (plan `2026-10-15-collection-sync.md` PR 3; handoff calls 3, 5, 6, 9 and 10).
// In order of risk: the stale pick named at the head (E5), four tiles, the tokens line, the conflicts as
// pairs of radios with two bulk presses, the overwrite banner (only for conflicts answered File), then the
// decks short, the shipped file-side lists and `Kept from The 99`. Every figure is the server's last read
// for the answers on screen; the flow re-reads on each answer, so the tiles follow them.

import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { flushSync } from "react-dom";
import type { UploadChangePreview, UploadSyncPreview } from "../../app/collection/actions";
import { answerFor, type SyncAnswers, type SyncReviewRow, type SyncSide } from "../../lib/collection/sync";
import type { PreviewList } from "../../lib/collection/upload-preview";
import type { ShortDeck } from "../../lib/collection/write";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { Rows, SHOWN, Tile } from "./review-parts";
import { ShortDeckWarning } from "./short-deck-warning";

const c = collectionEditCopy.upload;
const s = c.syncReview;

/** "Jun 2", pinned to en-US and UTC so a server render and a browser agree. */
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** What the conflicts section can be asked to do from outside: the held bar's press and the `undecided` refusal. */
export type SyncConflictsHandle = { focusFirstUndecided: () => void };

/** What the Sync review needs from the flow beyond the preview. */
export type SyncReviewControls = {
  answers: SyncAnswers;
  onAnswers: (answers: SyncAnswers) => void;
  /** A re-read for the answers on screen is in flight: the figures are the previous read's until it lands. */
  reading: boolean;
  /** The write is in flight: the answers freeze (X2). */
  pending: boolean;
  /** Where the held bar's press and the `undecided` refusal reach the conflicts section. */
  conflictsRef: Ref<SyncConflictsHandle>;
  /** Back to the choice with the follow-up open (E5). Absent when there is no follow-up to change. */
  onChangePick?: () => void;
  /** The held bar was pressed: move to the first unanswered conflict (K1b). No toast, no inline error. */
  onHeld: () => void;
  /** Leaves for the collection: the nothing-to-sync bar's only press (call 10). */
  onLeave: () => void;
};

/** The figures the tiles, the lists and the bar read, from one sync read. All in cards (call 6). */
export type SyncFigures = {
  decide: number;
  /** Taken from the file: file-only changes, and conflicts answered File. */
  take: number;
  /** Kept at the app's count: app-only changes, and conflicts answered App. */
  keep: number;
  /** Agreed, unchanged, and what a partial pick leaves alone. */
  nothing: number;
  /** Tokens whose count the confirm changes, either way, or 0. */
  tokens: number;
  decided: number;
  short: number;
  /** No card and no token would change, and nothing is left to decide (call 10). */
  nothingToSync: boolean;
};

export function syncFigures(sync: UploadSyncPreview, decks: readonly ShortDeck[]): SyncFigures {
  const k = sync.counts;
  const answeredApp = k.conflicts - k.undecided - k.answeredFile;
  return {
    decide: k.undecided,
    take: k.taken + k.answeredFile,
    keep: k.kept + answeredApp,
    nothing: k.agreed + k.unchanged + k.ignored,
    // The tokens this pick's read changes by count, either way: the one token figure Sync uses (PR 2).
    tokens: sync.tokensChanged,
    decided: k.conflicts - k.undecided,
    short: new Set(decks.map((d) => d.deckId)).size,
    nothingToSync: sync.nothing && k.undecided === 0,
  };
}

/** The confirm bar on a Sync: its sentence, whether it is held, and what its one press is. */
export type SyncBar =
  | { kind: "held"; line: string }
  | { kind: "nothing"; line: string }
  | { kind: "confirm"; line: string; label: string };

export function syncBar(f: SyncFigures): SyncBar {
  const b = s.bar;
  if (f.decide > 0) return { kind: "held", line: b.undecided(f.decide) };
  if (f.nothingToSync) return { kind: "nothing", line: b.nothing };
  if (f.take === 0) return { kind: "confirm", line: b.tokensOnly(f.keep, f.tokens), label: b.confirmTokens(f.tokens) };
  if (f.keep === 0) return { kind: "confirm", line: b.noneKept(f.take, f.tokens), label: b.confirm };
  return { kind: "confirm", line: b.sync(f.take, f.keep, f.tokens, f.decided, f.short), label: b.confirm };
}

/** Whether a conflict on `key` has an answer, as the rows draw it (a per-row answer, or the bulk rule). */
const decided = (answers: SyncAnswers, key: string) => answerFor(answers, key) !== undefined;

/** The line naming a stale follow-up's pick at the review's head (E5, S3), or null. */
function stalePickLine(sync: UploadSyncPreview, since: string, take: number): string | null {
  if (sync.stale === "noNewer") return sync.pick === "everything" && take > 0 ? null : s.pickedTokens(since);
  if (sync.stale !== "older") return null;
  if (sync.pick === "additions") return s.pickedAdds(since, take, sync.tokensChanged);
  if (sync.pick === "tokens") return s.pickedOlderTokens(since);
  return null;
}

export function SyncReviewDetail({
  change,
  syncData,
  decks,
  freshDeckIds,
  changed,
  controls,
}: {
  change: UploadChangePreview;
  syncData: UploadSyncPreview;
  decks: ShortDeck[];
  freshDeckIds: ReadonlySet<string>;
  /** The figures moved since the review drew them (a `stale` refusal, or decks a confirm found). */
  changed: boolean;
  controls: SyncReviewControls;
}) {
  const d = change.detail;
  const f = syncFigures(syncData, decks);
  // Every "since your <date> upload" names the anchor this file is compared with, never the newest upload.
  const since = syncData.anchorConfirmedAt ? day(syncData.anchorConfirmedAt) : "";
  const head = stalePickLine(syncData, since, f.take);
  const answers = controls.answers;
  // Conflicts answered App join Kept from The 99 (Conflicts board, K2), as the shipped rows read: at last upload → now.
  const keptRows = [
    ...syncData.kept.rows,
    ...syncData.conflicts.rows.filter((r) => r.answer === "app"),
  ].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  // Conflict rows read in the same name order as every other list on the review; the engine sorts by key.
  const conflictRows = [...syncData.conflicts.rows].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  const kept: PreviewList = {
    total: f.keep,
    rows: keptRows.map((r) => ({
      oracleId: r.oracleId, name: r.name ?? "", setCode: r.setCode, collectorNumber: r.collectorNumber, finish: r.finish,
      before: r.base, after: r.app, edited: false,
    })),
  };
  return (
    // Confirming (X2): everything above the bar freezes at .6, without reflow, and the radios cannot change.
    <div className={`mt-[16px] flex flex-col gap-[16px] md:mt-[24px] md:gap-[22px] ${controls.pending ? "opacity-60" : ""}`}>
      {head ? (
        <div className="flex items-start gap-[10px] rounded-[10px] border border-[color:var(--border-strong)] border-l-[3px] border-l-[color:var(--warning)] bg-[color:var(--elevated-hover)] p-[12px_14px]">
          <span aria-hidden className="text-[15px] leading-[1.3] text-[color:var(--warning)]">⚠</span>
          <p className="m-0 flex-1 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
            {head}
            {controls.onChangePick ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={controls.onChangePick}
                  disabled={controls.pending}
                  className="text-[13.5px] text-[color:var(--accent)] underline underline-offset-2"
                >
                  {s.change}
                </button>
              </>
            ) : null}
          </p>
        </div>
      ) : null}
      {changed ? (
        <p role="status" className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">
          {collectionEditCopy.shortWarning.changed}
        </p>
      ) : null}
      {/* ONE polite region, atomic, so an answer or a bulk press is announced once rather than per tile. */}
      <div
        aria-live="polite"
        aria-atomic="true"
        aria-busy={controls.reading || undefined}
        className="grid grid-cols-2 gap-[10px] md:grid-cols-4 md:gap-[12px]"
      >
        <Tile
          n={f.decide}
          label={s.tiles.decide}
          ink={f.decide > 0 ? "var(--warning)" : "var(--fg-faint)"}
          border={f.decide > 0 ? "var(--warning)" : undefined}
        />
        <Tile n={f.take} label={s.tiles.file} ink={f.take > 0 ? "var(--success)" : "var(--fg-faint)"} />
        <Tile n={f.keep} label={s.tiles.kept} ink={f.keep > 0 ? "var(--fg)" : "var(--fg-faint)"} />
        <Tile n={f.nothing} label={s.tiles.nothing} ink="var(--fg)" />
      </div>
      {f.tokens > 0 && !f.nothingToSync ? (
        <div className="flex items-start gap-[10px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[12px_14px] md:items-center md:gap-[12px]">
          <span aria-hidden className="text-[15px] leading-[1.3] text-[color:var(--fg-faint)]">ⓘ</span>
          <span className="flex-1 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{s.tokensLine(f.tokens)}</span>
          <span className="hidden flex-none font-mono text-[12px] leading-[1.9] text-[color:var(--fg-muted)] md:inline">
            {s.tokensFigure(syncData.tokens.count, syncData.tokens.copies)}
          </span>
        </div>
      ) : null}
      {syncData.conflicts.total > 0 ? (
        <SyncConflicts
          rows={conflictRows}
          total={syncData.conflicts.total}
          since={since}
          answers={answers}
          onAnswers={controls.onAnswers}
          disabled={controls.pending}
          handle={controls.conflictsRef}
        />
      ) : null}
      {f.nothingToSync ? (
        <p className="m-0 rounded-[10px] bg-[color:var(--surface-sunken)] p-[12px_14px] text-[13.5px] leading-[1.55] text-[color:var(--fg-muted)]">
          {s.nothing}
        </p>
      ) : (
        <>
          {syncData.counts.answeredFile > 0 ? (
            <p className="m-0 rounded-[10px] border border-[color:var(--border-strong)] border-l-[3px] border-l-[color:var(--warning)] bg-[color:var(--elevated-hover)] p-[12px_14px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
              {s.overwrite(syncData.counts.answeredFile, since)}
            </p>
          ) : null}
          <div className="grid gap-[22px] md:grid-cols-2">
            {decks.length > 0 ? (
              <ShortDeckWarning variant="embedded" source="sync" decks={decks} pending={false} freshDeckIds={freshDeckIds} />
            ) : null}
            <Rows heading={c.listLeaving(d.lists.leaving.total)} list={d.lists.leaving} tone="other" />
            <Rows heading={c.listDown(d.lists.down.total)} list={d.lists.down} tone="other" />
            <Rows heading={c.listUp(d.lists.up.total)} list={d.lists.up} tone="up" />
            <Rows heading={s.listKept(kept.total)} list={kept} tone="body" />
          </div>
        </>
      )}
    </div>
  );
}

/** The conflicts: a heading, the bulk presses, a row per card both sides changed, and Show all past eight. */
export function SyncConflicts({
  rows,
  total,
  since,
  answers,
  onAnswers,
  disabled,
  handle,
}: {
  /** The shipped conflicts (the first 500 by key); `total` counts every one. */
  rows: SyncReviewRow[];
  total: number;
  since: string;
  answers: SyncAnswers;
  onAnswers: (answers: SyncAnswers) => void;
  disabled: boolean;
  handle?: Ref<SyncConflictsHandle>;
}) {
  const [all, setAll] = useState(false);
  // The row a held confirm sent the reader to (P2): ringed until it is answered or focus leaves it, because the
  // radio it focuses is visually hidden and a pointer press draws no :focus-visible.
  const [ringKey, setRingKey] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const byKey = answers.byKey ?? {};
  // Pressed until any row changes by hand: a row press records a per-row answer only when it moves one.
  const pressed: SyncSide | null = answers.all && Object.keys(byKey).length === 0 ? answers.all : null;
  // A bulk answer is a RULE (G11): it decides every conflict, the ones past the cap included.
  const left = answers.all ? 0 : total - rows.filter((r) => byKey[r.key]).length;
  const shown = all ? rows : rows.slice(0, SHOWN);

  useImperativeHandle(handle, () => ({
    focusFirstUndecided() {
      const index = rows.findIndex((r) => !decided(answers, r.key));
      // Past the shipped rows (over the 500 cap), the section itself is the nearest place to stand.
      if (index === -1) {
        sectionRef.current?.scrollIntoView?.({ block: "center" });
        sectionRef.current?.focus();
        return;
      }
      if (index >= SHOWN && !all) flushSync(() => setAll(true));
      const key = rows[index].key;
      setRingKey(key);
      const row = [...(sectionRef.current?.querySelectorAll<HTMLElement>("[data-key]") ?? [])].find((el) => el.dataset.key === key);
      row?.scrollIntoView?.({ block: "center" });
      row?.querySelector<HTMLInputElement>("input")?.focus();
    },
  }), [rows, answers, all]);

  const answer = (key: string, side: SyncSide) => {
    if (ringKey === key) setRingKey(null);
    if (answerFor(answers, key) === side) return;
    onAnswers({ ...answers, byKey: { ...byKey, [key]: side } });
  };
  const bulk = (side: SyncSide) => onAnswers({ all: side });
  const bulkClass = (side: SyncSide) =>
    `min-h-[44px] w-full rounded-[8px] border px-[12px] text-[13px] font-semibold text-[color:var(--fg)] disabled:opacity-60 md:w-auto md:whitespace-nowrap md:px-[16px] ${
      pressed === side ? "border-[color:var(--accent)]" : "border-[color:var(--border-strong)]"
    }`;

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      aria-labelledby="sync-conflicts-heading"
      className="flex flex-col gap-[10px] rounded-[12px] border border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] p-[14px] outline-none md:p-[16px_18px]"
    >
      <div className="flex flex-col gap-[10px] md:flex-row md:items-start md:gap-[16px]">
        <div className="min-w-0 flex-1">
          <h2 id="sync-conflicts-heading" className="m-0 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-[color:var(--fg-muted)]">
            {s.listDecide(total)}
          </h2>
          {/* After a bulk press its status line takes the lede's place (K3, P3), rather than sitting under it. */}
          {pressed ? null : (
            <p className="m-0 mt-[6px] text-[13px] leading-[1.5] text-[color:var(--fg-body)]">
              {s.decideLede(since)} {s.decideLeft(left)}
            </p>
          )}
          <p role="status" className="m-0 mt-[6px] text-[13px] leading-[1.5] text-[color:var(--fg-body)] empty:hidden">
            {pressed === "app" ? s.bulkDoneApp(total) : pressed === "file" ? s.bulkDoneFile(total) : ""}
          </p>
        </div>
        <div className="flex flex-col gap-[8px] md:flex-none md:flex-row md:gap-[10px]">
          <button type="button" aria-pressed={pressed === "app"} disabled={disabled} onClick={() => bulk("app")} className={bulkClass("app")}>
            {s.bulkApp(total)}
          </button>
          <button type="button" aria-pressed={pressed === "file"} disabled={disabled} onClick={() => bulk("file")} className={bulkClass("file")}>
            {s.bulkFile(total)}
          </button>
        </div>
      </div>
      <div
        aria-hidden
        className="hidden gap-[10px] px-[12px] font-mono text-[10.5px] tracking-[0.08em] text-[color:var(--fg-faint)] md:grid md:grid-cols-[minmax(0,1fr)_90px_128px_128px]"
      >
        <span />
        <span className="text-right">{s.colAt(since)}</span>
        <span className="text-center">{s.colApp}</span>
        <span className="text-center">{s.colFile}</span>
      </div>
      <div className="flex flex-col gap-[6px]">
        {shown.map((row) => (
          <ConflictRow
            key={row.key}
            row={row}
            since={since}
            answer={answerFor(answers, row.key)}
            onAnswer={(side) => answer(row.key, side)}
            disabled={disabled}
            ringed={ringKey === row.key}
            onLeave={ringKey === row.key ? () => setRingKey(null) : undefined}
          />
        ))}
      </div>
      {all && total > rows.length ? (
        <p className="m-0 text-[12.5px] text-[color:var(--fg-muted)]">{s.bulkCapNote(rows.length, total)}</p>
      ) : null}
      {!all && rows.length > SHOWN ? (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="self-start min-h-[44px] text-[13px] text-[color:var(--accent)] underline underline-offset-2"
        >
          {c.showAll(rows.length)}
        </button>
      ) : null}
    </section>
  );
}

const count = (n: number) => `×${n}`;

/**
 * One card both sides changed: a fieldset whose name carries the card and the three counts, and two 44px
 * radios, App and File, with nothing pre-picked. Unanswered, it carries the 3px warning edge.
 */
export function ConflictRow({
  row,
  since,
  answer,
  onAnswer,
  disabled,
  ringed = false,
  onLeave,
}: {
  row: SyncReviewRow;
  since: string;
  answer: SyncSide | undefined;
  onAnswer: (side: SyncSide) => void;
  disabled: boolean;
  /** Drawn with the accent ring: the row a held confirm focused (P2). */
  ringed?: boolean;
  /** Focus left the row. */
  onLeave?: () => void;
}) {
  // ×0, never `new`, on a conflict row (copy-review ruling): the row compares three counts.
  const was = count(row.base);
  const name = row.name ?? "";
  const printing = `${row.setCode.toUpperCase()} ${row.collectorNumber} · ${row.finish}`;
  const pill = (side: SyncSide, label: string, n: number) => (
    <label
      className={`relative flex h-[44px] cursor-pointer items-center justify-center gap-[6px] rounded-[8px] border text-[13px] has-[:focus-visible]:shadow-[0_0_0_2px_var(--accent)] ${
        answer === side
          ? "border-[color:var(--accent)] bg-[color:var(--accent-dim)] text-[color:var(--fg)]"
          : "border-[color:var(--border-strong)] text-[color:var(--fg-body)]"
      }`}
    >
      <input
        type="radio"
        name={`sync-conflict-${row.key}`}
        value={side}
        checked={answer === side}
        disabled={disabled}
        onChange={() => onAnswer(side)}
        className="sr-only"
      />
      {label}{" "}
      <b className="font-mono font-medium text-[color:var(--fg)]">{count(n)}</b>
    </label>
  );
  return (
    <fieldset
      data-key={row.key}
      data-undecided={answer ? undefined : "true"}
      data-ringed={ringed ? "true" : undefined}
      onBlur={onLeave ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onLeave(); } : undefined}
      className={`m-0 grid min-w-0 gap-[8px] rounded-[8px] border bg-[color:var(--surface)] md:grid-cols-[minmax(0,1fr)_90px_128px_128px] md:items-center md:gap-[10px] ${
        // The 3px warning edge takes 2px more than the 1px border, so the left padding gives them back.
        answer
          ? "border-[color:var(--border)] p-[10px_12px] md:p-[8px_12px]"
          : "border-[color:var(--border-strong)] border-l-[3px] border-l-[color:var(--warning)] p-[10px_12px_10px_10px] md:p-[8px_12px_8px_10px]"
      } ${ringed ? "shadow-[0_0_0_2px_var(--accent)]" : ""}`}
    >
      <legend className="sr-only">{s.rowAria(name, s.rowPrinting(row.setCode.toUpperCase(), row.collectorNumber, row.finish), since, was, count(row.app), count(row.file))}</legend>
      <div aria-hidden className="min-w-0">
        <div className="truncate text-[13.5px] text-[color:var(--fg)] md:text-[14px]">{name}</div>
        <div className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {printing}
          <span className="md:hidden"> · {s.rowWas(since, was)}</span>
        </div>
      </div>
      <div aria-hidden className="hidden text-right font-mono text-[12px] text-[color:var(--fg-faint)] md:block">{was}</div>
      <div className="grid grid-cols-2 gap-[8px] md:contents">
        {pill("app", s.pickApp, row.app)}
        {pill("file", s.pickFile, row.file)}
      </div>
    </fieldset>
  );
}
