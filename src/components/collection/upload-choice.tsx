"use client";
// §A, the upload choice (collection edit A1): STEP 2 OF 4. Two radio cards, neither picked, each
// with the collection's size after it. The Replace card carries the hand-edits warning; the Add
// card carries the overlap note from 80%. Nothing is written here; Continue opens the review.
// Collection Sync (plan PR 2) adds a third card, Sync, drawn third and behind its switch: its
// unavailable form, the stale banner at the step's head and the follow-up after the cards.

import { useId } from "react";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { ADD_OVERLAP_NOTE_AT } from "../../lib/collection/upload-preview";
import type { SyncUnavailable, UploadMode } from "../../app/collection/actions";
import type { SyncPick } from "../../lib/collection/sync";
import type { SyncNext, SyncNote } from "./sync-choice-view";
import { GhostButton, PrimaryButton } from "../ui/button";

export type ReplaceFacts = {
  editsSinceUpload: number;
  /** ISO time of the newest confirmed upload, or null for none. */
  lastUploadAt: string | null;
  /** History reaches back to that upload, so the count can be quoted. */
  historyReaches: boolean;
};

/** The Sync card and what hangs off it, from the sync dry runs. Absent, the step is the shipped two-card one. */
export type SyncChoice = {
  /** Why Sync cannot run, or null when it can. */
  unavailable: SyncUnavailable | null;
  /** ISO time the anchor was confirmed (the upload this file is compared with), or null when unavailable. */
  anchorAt: string | null;
  before: number;
  /** The collection's copies after the pick's Sync; null while that dry run is read; `failed` when it could not be. */
  after: number | null | "failed";
  note: SyncNote | null;
  next: SyncNext;
  stale: { kind: "noNewer"; tokens: number | null } | { kind: "older"; missing: number } | null;
  /** The follow-up under an older-looking file that adds a card, drawn while Sync is picked. */
  followUp: {
    pick: SyncPick;
    /**
     * Each option's figures, from that pick's own dry run: the holdings Only what it adds raises or brings
     * in, and every pick's tokens as the tokens IT would change. Null until that read lands.
     */
    adds: { cards: number; tokens: number } | null;
    tokens: number | null;
    all: { up: number; leaving: number; down: number; tokens: number };
    onPick: (pick: SyncPick) => void;
  } | null;
};

/** "Jun 2", pinned to en-US and UTC so a server render and a browser agree. */
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function Warning({ facts }: { facts: ReplaceFacts }) {
  const c = collectionEditCopy.upload;
  let text: string | null = null;
  if (facts.lastUploadAt === null) text = facts.editsSinceUpload > 0 ? c.choiceOverwriteNoUpload(facts.editsSinceUpload) : null;
  else if (!facts.historyReaches) text = c.choiceOverwriteUnknown(day(facts.lastUploadAt));
  else text = facts.editsSinceUpload > 0 ? c.overwriteCount(facts.editsSinceUpload, day(facts.lastUploadAt)) : null;
  if (!text) return null;
  return (
    <div className="mt-[6px] flex items-start gap-[10px] rounded-[10px] border border-[color:var(--border-strong)] border-l-[3px] border-l-[color:var(--warning)] bg-[color:var(--elevated-hover)] p-[12px_14px]">
      <span aria-hidden className="text-[15px] leading-[1.3] text-[color:var(--warning)]">
        ⚠
      </span>
      <span className="text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{text}</span>
    </div>
  );
}

/** The quiet ⓘ note: Add's overlap note, and Sync's. */
function Note({ text }: { text: string }) {
  return (
    <div className="mt-[6px] flex items-start gap-[10px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[12px_14px]">
      <span aria-hidden className="text-[15px] leading-[1.3] text-[color:var(--fg-faint)]">
        ⓘ
      </span>
      <span className="text-[13.5px] leading-[1.55] text-[color:var(--fg-muted)]">{text}</span>
    </div>
  );
}

function Card({
  mode,
  picked,
  tabbable,
  title,
  body,
  figure,
  unavailable,
  onPick,
  children,
}: {
  mode: UploadMode;
  picked: boolean;
  /** The one radio in the tab order: the picked one, or the first when nothing is. */
  tabbable: boolean;
  title: string;
  body: string;
  figure: string;
  /**
   * Why the card cannot be picked. It stays drawn, dimmed and focusable (`aria-disabled`), and the
   * reason takes the figure's place in a dashed box that describes the radio (C3).
   */
  unavailable?: string;
  onPick: () => void;
  children?: React.ReactNode;
}) {
  const titleId = useId();
  const reasonId = useId();
  const off = unavailable !== undefined;
  return (
    <div
      role="radio"
      aria-checked={picked}
      aria-disabled={off || undefined}
      aria-labelledby={off ? titleId : undefined}
      aria-describedby={off ? reasonId : undefined}
      tabIndex={tabbable ? 0 : -1}
      data-choice={mode}
      onClick={off ? undefined : onPick}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!off) onPick();
        }
      }}
      // R2: on desktop the radio sits on the title row and everything below runs the card's full
      // width; the phone keeps the radio column.
      className={`relative flex gap-[12px] rounded-[12px] p-[14px] outline-none md:block md:p-[22px] ${
        off ? "cursor-default bg-[color:var(--surface-sunken)]" : "cursor-pointer bg-[color:var(--surface)]"
      } ${
        picked
          ? "border border-[color:var(--accent)] shadow-[0_0_0_1px_var(--accent)]"
          : "border border-[color:var(--border-strong)] focus-visible:shadow-[0_0_0_2px_var(--accent)]"
      }`}
    >
      <span
        aria-hidden
        className={`mt-[2px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border-2 md:absolute md:top-[22px] md:left-[22px] ${
          picked ? "border-[color:var(--accent)]" : off ? "border-[color:var(--border-strong)]" : "border-[color:var(--border-dashed)]"
        }`}
      >
        {picked ? <span className="h-[10px] w-[10px] rounded-full bg-[color:var(--accent)]" /> : null}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
        <span
          id={titleId}
          className={`text-[15px] font-semibold md:pl-[34px] md:text-[17px] md:leading-[26px] ${off ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]"}`}
        >
          {title}
        </span>
        <span className={`text-[13.5px] leading-[1.55] md:text-[14px] ${off ? "text-[color:var(--fg-faint)]" : "text-[color:var(--fg-body)]"}`}>{body}</span>
        {off ? (
          <span
            id={reasonId}
            className="mt-[6px] rounded-[10px] border border-dashed border-[color:var(--border-dashed)] p-[12px_14px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]"
          >
            {unavailable}
          </span>
        ) : (
          <span className="font-mono text-[13px] text-[color:var(--fg-muted)]">{figure}</span>
        )}
        {children}
      </div>
    </div>
  );
}

/** The stale banner (S1, S2): the shipped warning box, at the head of the step. It says “looks”, never “is”. */
function StaleBanner({ stale, since }: { stale: NonNullable<SyncChoice["stale"]>; since: string }) {
  const c = collectionEditCopy.upload;
  const title = stale.kind === "older" ? c.staleOlderTitle(since) : c.staleSameTitle(since);
  const body =
    stale.kind === "older" ? (stale.missing > 0 ? c.staleOlderBody(stale.missing) : null) : stale.tokens ? c.staleSameBody(stale.tokens) : null;
  return (
    <div role="note" className="mb-[14px] flex items-start gap-[10px] rounded-[10px] border border-[color:var(--border-strong)] border-l-[3px] border-l-[color:var(--warning)] bg-[color:var(--elevated-hover)] p-[12px_14px] md:mb-[18px]">
      <span aria-hidden className="text-[15px] leading-[1.3] text-[color:var(--warning)]">
        ⚠
      </span>
      <span className="text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">
        <strong className="font-semibold text-[color:var(--fg)]">{title}</strong>
        {body ? ` ${body}` : null}
      </span>
    </div>
  );
}

/** The follow-up under an older-looking file, with Sync picked (S2): after the cards, never inside one. */
function FollowUp({ followUp }: { followUp: NonNullable<SyncChoice["followUp"]> }) {
  const c = collectionEditCopy.upload;
  const name = useId();
  const { adds, tokens, all } = followUp;
  const options: { pick: SyncPick; title: string; body: string | null }[] = [
    { pick: "additions", title: c.staleAddsTitle, body: adds === null ? null : c.staleAddsBody(adds.cards, adds.tokens) },
    { pick: "tokens", title: c.staleTokensTitle, body: tokens === null ? null : c.staleTokensBody(tokens) },
    { pick: "everything", title: c.staleAllTitle, body: c.staleAllBody(all.up, all.leaving, all.down, all.tokens) },
  ];
  return (
    <fieldset className="m-0 mt-[18px] min-w-0 border-0 p-0 md:mt-[22px]">
      <legend className="mb-[8px] p-0 text-[14px] md:mb-[10px] font-semibold text-[color:var(--fg)]">{c.staleQuestion}</legend>
      <div className="grid gap-[8px] md:grid-cols-3 md:gap-[12px]">
        {options.map((o) => {
          const on = followUp.pick === o.pick;
          return (
            <label
              key={o.pick}
              // The native radio is kept for the keyboard and the screen reader, and hidden; the ring
              // drawn beside it is the board's, as `Card` draws its own. Focus shows on the box.
              className={`flex min-h-[44px] cursor-pointer items-start gap-[12px] rounded-[10px] border bg-[color:var(--surface)] p-[12px_14px] has-[:focus-visible]:shadow-[0_0_0_2px_var(--accent)] ${
                on ? "border-[color:var(--accent)]" : "border-[color:var(--border-strong)]"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.pick}
                checked={on}
                onChange={() => followUp.onPick(o.pick)}
                className="sr-only"
              />
              <span
                aria-hidden
                data-ring
                className={`mt-[1px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-2 ${
                  on ? "border-[color:var(--accent)]" : "border-[color:var(--border-dashed)]"
                }`}
              >
                {on ? <span className="h-[8px] w-[8px] rounded-full bg-[color:var(--accent)]" /> : null}
              </span>
              <span className="flex min-w-0 flex-col gap-[3px]">
                <span className="text-[14px] font-semibold text-[color:var(--fg)]">{o.title}</span>
                {o.body ? <span className="text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">{o.body}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** The note's words; the two that name the last upload's day are dropped without one. */
function syncNoteText(note: SyncNote, since: string | null): string | null {
  const c = collectionEditCopy.upload;
  switch (note.kind) {
    case "keeps": return since ? c.syncKeeps(note.cards, since) : null;
    case "keepsNone": return since ? c.syncKeepsNone(since) : null;
    case "tokensOnly": return c.syncTokensOnly(note.tokens);
    case "nothingNew": return c.syncNothingNew;
    case "noChange": return c.syncNoChange;
  }
}

function syncNextText(next: SyncNext): string {
  const c = collectionEditCopy.upload;
  switch (next.kind) {
    case "sync": return c.nextSync;
    case "tokens": return c.nextSyncTokens;
    case "adds": return c.nextSyncAdds(next.cards, next.tokens);
  }
}

/**
 * The reason an unavailable Sync card names: never uploaded, else nothing to compare against (no
 * unreverted Replace or full Sync, or its file too old to read). Neither names a date: the newest upload
 * is not what Sync compares with, and there is no anchor to name.
 */
function unavailableReason(reason: SyncUnavailable): string {
  const c = collectionEditCopy.upload;
  return reason === "neverUploaded" ? c.syncUnavailableNoUpload : c.syncUnavailableNoRecord;
}

export function UploadChoice({
  filename,
  rows,
  replaceBefore,
  replaceAfter,
  addBefore,
  addAfter,
  facts,
  overlap,
  sync,
  picked,
  onPick,
  onContinue,
  onCancel,
}: {
  filename: string;
  rows: number;
  /** The collection's copies as each preview read them: the two reads are separate transactions, so each card quotes its own. */
  replaceBefore: number;
  addBefore: number;
  /** The file's matched cards: what a Replace leaves. */
  replaceAfter: number;
  /** The collection plus the file: what an Add leaves. */
  addAfter: number;
  facts: ReplaceFacts;
  overlap: { held: number; of: number };
  /** The Sync card, drawn only with its switch on for the reader. Absent, the step is the shipped two-card one. */
  sync?: SyncChoice;
  picked: UploadMode | null;
  onPick: (mode: UploadMode) => void;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const c = collectionEditCopy.upload;
  const headingId = useId();
  const pct = overlap.of > 0 ? Math.round((overlap.held / overlap.of) * 100) : 0;
  const showOverlap = overlap.of > 0 && overlap.held / overlap.of >= ADD_OVERLAP_NOTE_AT;
  const syncOff = sync?.unavailable ? unavailableReason(sync.unavailable) : undefined;
  const since = sync?.anchorAt ? day(sync.anchorAt) : null;
  // The cards in their drawn order. Sync is third (call 2).
  const order: UploadMode[] = sync ? ["replace", "add", "sync"] : ["replace", "add"];
  // Roving radios: the arrow moves from the card that HAS focus, wrapping, and focus goes with the
  // pick, so the one in the tab order is always the one selected. An unavailable card takes the
  // focus and not the pick, so a screen reader reaches its reason (C3: arrows land on it, Space does nothing).
  const move = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const from = (e.target as HTMLElement).closest<HTMLElement>("[data-choice]")?.dataset.choice as UploadMode | undefined;
    const at = from ? order.indexOf(from) : -1;
    if (at < 0) return;
    let step: number;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") step = 1;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") step = -1;
    else return;
    e.preventDefault();
    const to = order[(at + step + order.length) % order.length];
    if (!(to === "sync" && syncOff !== undefined)) onPick(to);
    e.currentTarget.querySelector<HTMLElement>(`[data-choice="${to}"]`)?.focus();
  };
  const staleShown = Boolean(sync?.stale && since);
  const syncNoteLine = sync && !syncOff && sync.note ? syncNoteText(sync.note, since) : null;
  const syncFigure =
    sync && sync.after !== null && sync.after !== "failed" ? c.after(sync.before, sync.after) : sync?.after === "failed" ? c.prepareFailed : c.preparing;

  return (
    <section className="flex flex-1 flex-col">
      <div className="flex-1 p-[20px_18px] md:max-w-[1280px] md:p-[36px_56px_20px]">
        <p className="m-0 font-mono text-[11px] tracking-[0.06em] text-[color:var(--fg-faint)]">
          {c.step(2, 4)} · {filename} · {rows.toLocaleString("en-US")} rows
        </p>
        <h1 id={headingId} className="m-0 mt-[12px] mb-[6px] font-display text-[18px] font-semibold md:text-[29px] md:font-bold">
          {sync ? (
            // G10: with Sync drawn, one title at both widths.
            c.choiceTitleSync
          ) : (
            <>
              <span className="md:hidden">{c.choiceTitlePhone}</span>
              <span className="hidden md:inline">{c.choiceTitle}</span>
            </>
          )}
        </h1>
        <p className={`m-0 text-[14px] text-[color:var(--fg-muted)] ${staleShown ? "mb-[18px]" : "mb-[24px]"}`}>{c.choiceLede}</p>
        {staleShown && sync?.stale && since ? <StaleBanner stale={sync.stale} since={since} /> : null}
        <div
          role="radiogroup"
          aria-labelledby={headingId}
          onKeyDown={move}
          className={`grid gap-[12px] md:gap-[20px] ${sync ? "md:grid-cols-3 md:items-start" : "md:grid-cols-2"}`}
        >
          <Card
            mode="replace"
            picked={picked === "replace"}
            tabbable={picked === "replace" || picked === null}
            title={c.replaceTitle}
            body={c.replaceBody}
            figure={c.after(replaceBefore, replaceAfter)}
            onPick={() => onPick("replace")}
          >
            <Warning facts={facts} />
          </Card>
          <Card
            mode="add"
            picked={picked === "add"}
            tabbable={picked === "add"}
            title={c.addTitle}
            body={c.addBody}
            figure={c.after(addBefore, addAfter)}
            onPick={() => onPick("add")}
          >
            {showOverlap ? <Note text={c.overlapNote(pct)} /> : null}
          </Card>
          {sync ? (
            <Card
              mode="sync"
              picked={picked === "sync"}
              tabbable={picked === "sync"}
              title={c.syncTitle}
              body={c.syncBody}
              figure={syncFigure}
              unavailable={syncOff}
              onPick={() => onPick("sync")}
            >
              {syncNoteLine ? <Note text={syncNoteLine} /> : null}
            </Card>
          ) : null}
        </div>
        {picked === "sync" && sync?.followUp && !syncOff ? <FollowUp followUp={sync.followUp} /> : null}
      </div>
      <div className="flex flex-col gap-[10px] border-t border-t-[color:var(--border-strong)] bg-[color:var(--surface-rail)] p-[14px_18px] md:flex-row md:items-center md:gap-[20px] md:p-[16px_56px]">
        <span className="hidden text-[13.5px] text-[color:var(--fg-body)] md:inline">
          {picked === "add" ? c.nextAdd : picked === "sync" && sync ? syncNextText(sync.next) : c.nextReplace}
        </span>
        <div className="flex flex-col-reverse gap-[10px] md:ml-auto md:flex-row md:gap-[12px]">
          <GhostButton type="button" onClick={onCancel} className="h-[44px] px-[20px] text-[14px]">
            {c.cancel}
          </GhostButton>
          <PrimaryButton
            type="button"
            onClick={onContinue}
            // TODO(collection sync PR 3): Sync's review. Until it ships, a picked Sync cannot continue.
            disabled={picked === null || picked === "sync"}
            className="h-[44px] px-[24px] text-[14px] font-semibold disabled:opacity-40"
          >
            {picked === "add" ? c.continueAdd : picked === "sync" ? c.continueSync : c.continueReplace}
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}
