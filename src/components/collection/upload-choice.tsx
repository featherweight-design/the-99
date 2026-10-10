"use client";
// §A, the upload choice (collection edit A1): STEP 2 OF 4. Two radio cards, neither picked, each
// with the collection's size after it. The Replace card carries the hand-edits warning; the Add
// card carries the overlap note from 80%. Nothing is written here; Continue opens the review.

import { useId } from "react";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { ADD_OVERLAP_NOTE_AT } from "../../lib/collection/upload-preview";
import type { UploadMode } from "../../app/collection/actions";
import { GhostButton, PrimaryButton } from "../ui/button";

export type ReplaceFacts = {
  editsSinceUpload: number;
  /** ISO time of the newest confirmed upload, or null for none. */
  lastUploadAt: string | null;
  /** History reaches back to that upload, so the count can be quoted. */
  historyReaches: boolean;
};

/** "Jun 2", pinned to en-US and UTC so a server render and a browser agree. */
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function Warning({ facts }: { facts: ReplaceFacts }) {
  const c = collectionEditCopy.upload;
  let text: string | null = null;
  if (facts.lastUploadAt === null) text = facts.editsSinceUpload > 0 ? c.overwriteNoUpload(facts.editsSinceUpload) : null;
  else if (!facts.historyReaches) text = c.overwriteUnknown(day(facts.lastUploadAt));
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

function Card({
  mode,
  picked,
  tabbable,
  title,
  body,
  figure,
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
  onPick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="radio"
      aria-checked={picked}
      tabIndex={tabbable ? 0 : -1}
      data-choice={mode}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onPick();
        }
      }}
      className={`flex cursor-pointer gap-[12px] rounded-[12px] bg-[color:var(--surface)] p-[14px] outline-none md:gap-[16px] md:p-[22px] ${
        picked
          ? "border border-[color:var(--accent)] shadow-[0_0_0_1px_var(--accent)]"
          : "border border-[color:var(--border-strong)] focus-visible:shadow-[0_0_0_2px_var(--accent)]"
      }`}
    >
      <span
        aria-hidden
        className={`mt-[2px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border-2 ${
          picked ? "border-[color:var(--accent)]" : "border-[color:var(--border-dashed)]"
        }`}
      >
        {picked ? <span className="h-[10px] w-[10px] rounded-full bg-[color:var(--accent)]" /> : null}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
        <span className="text-[15px] font-semibold text-[color:var(--fg)] md:text-[17px]">{title}</span>
        <span className="text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] md:text-[14px]">{body}</span>
        <span className="font-mono text-[13px] text-[color:var(--fg-muted)]">{figure}</span>
        {children}
      </div>
    </div>
  );
}

export function UploadChoice({
  filename,
  rows,
  copiesBefore,
  replaceAfter,
  addAfter,
  facts,
  overlap,
  picked,
  onPick,
  onContinue,
  onCancel,
}: {
  filename: string;
  rows: number;
  copiesBefore: number;
  /** The file's matched cards: what a Replace leaves. */
  replaceAfter: number;
  /** The collection plus the file: what an Add leaves. */
  addAfter: number;
  facts: ReplaceFacts;
  overlap: { held: number; of: number };
  picked: UploadMode | null;
  onPick: (mode: UploadMode) => void;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const c = collectionEditCopy.upload;
  const headingId = useId();
  const pct = overlap.of > 0 ? Math.round((overlap.held / overlap.of) * 100) : 0;
  const showOverlap = overlap.of > 0 && overlap.held / overlap.of >= ADD_OVERLAP_NOTE_AT;
  const move = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") onPick(picked === "replace" ? "add" : "replace");
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") onPick(picked === "add" ? "replace" : "add");
    else return;
    e.preventDefault();
  };

  return (
    <section className="flex flex-col md:min-h-[calc(100vh-140px)]">
      <div className="flex-1 p-[20px_18px] md:max-w-[1280px] md:p-[36px_56px_20px]">
        <p className="m-0 font-mono text-[11px] tracking-[0.06em] text-[color:var(--fg-faint)]">
          {c.step(2, 4)} · {filename} · {rows.toLocaleString("en-US")} rows
        </p>
        <h2 id={headingId} className="m-0 mt-[12px] mb-[6px] font-display text-[18px] font-semibold md:text-[29px] md:font-bold">
          <span className="md:hidden">{c.choiceTitlePhone}</span>
          <span className="hidden md:inline">{c.choiceTitle}</span>
        </h2>
        <p className="m-0 mb-[24px] text-[14px] text-[color:var(--fg-muted)]">{c.choiceLede}</p>
        <div role="radiogroup" aria-labelledby={headingId} onKeyDown={move} className="grid gap-[12px] md:grid-cols-2 md:gap-[20px]">
          <Card
            mode="replace"
            picked={picked === "replace"}
            tabbable={picked === "replace" || picked === null}
            title={c.replaceTitle}
            body={c.replaceBody}
            figure={c.after(copiesBefore, replaceAfter)}
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
            figure={c.after(copiesBefore, addAfter)}
            onPick={() => onPick("add")}
          >
            {showOverlap ? (
              <div className="mt-[6px] flex items-start gap-[10px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[12px_14px]">
                <span aria-hidden className="text-[15px] leading-[1.3] text-[color:var(--fg-faint)]">
                  ⓘ
                </span>
                <span className="text-[13.5px] leading-[1.55] text-[color:var(--fg-muted)]">{c.overlapNote(pct)}</span>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
      <div className="flex flex-col gap-[10px] border-t border-t-[color:var(--border-strong)] bg-[color:var(--surface-rail)] p-[14px_18px] md:flex-row md:items-center md:gap-[20px] md:p-[16px_56px]">
        <span className="hidden text-[13.5px] text-[color:var(--fg-body)] md:inline">
          {picked === "add" ? c.nextAdd : c.nextReplace}
        </span>
        <div className="flex flex-col-reverse gap-[10px] md:ml-auto md:flex-row md:gap-[12px]">
          <GhostButton type="button" onClick={onCancel} className="h-[44px] px-[20px] text-[14px]">
            {c.cancel}
          </GhostButton>
          <PrimaryButton
            type="button"
            onClick={onContinue}
            disabled={picked === null}
            className="h-[44px] px-[24px] text-[14px] font-semibold disabled:opacity-40"
          >
            {picked === "add" ? c.continueAdd : c.continueReplace}
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}
