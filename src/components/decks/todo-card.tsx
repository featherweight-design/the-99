"use client";

// The to-do card (handoff `deck_messages`, `To-do Card.dc.html` and the left column of
// `Next Steps.dc.html`): everything the deck is waiting on, one row each, one press each. Which
// rows, their order and the next step are `deckTodo`'s; this file only draws them.
//
// One mount for both widths. The row stacks its label, title and body at 390 and runs them on one
// baseline from md; the press is 96px at 390 and 132px from md, and on the phone its hit area is
// stretched over the whole row by a pseudo-element, so there is still one control per row.

import Link from "next/link";
import { Fragment, type ReactNode, type Ref, useEffect, useRef, useTransition } from "react";
import { fillDeck } from "../../app/decks/actions";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { guidedBannerCopy } from "../../lib/copy/decks-builder";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import type { Todo, TodoRow as TodoRowFact } from "../../lib/decks/todo";
import { changeCount, type DraftState } from "../../lib/decks/draft-shape";
import { useChangeCommander } from "./change-commander-context";

const copy = deckVersioningCopy.todoCard;

export interface TodoCardProps {
  todo: Todo;
  deckName: string;
  /** Draws one row, by kind. Every kind the caller feeds `deckTodo` must be drawn here: the head counts the rule's rows. */
  renderRow: (row: TodoRowFact) => ReactNode;
}

export function TodoCard({ todo, deckName, renderRow }: TodoCardProps) {
  if (todo.rows.length === 0) return null;
  const eyebrow = todo.firstRun ? guidedBannerCopy.head : copy.head(deckName, todo.word);
  return (
    <section
      aria-label={eyebrow}
      className={
        "mx-[14px] my-[14px] md:mx-[26px] md:my-[18px] overflow-hidden rounded-[12px] " +
        "bg-[color:var(--surface-rail)] [border:1px_solid_var(--border-strong)]"
      }
    >
      <div className="flex items-center gap-[10px] px-[14px] pt-[12px] pb-[10px]">
        <span className="min-w-0 truncate font-mono uppercase leading-normal text-[9.5px] tracking-[0.14em] text-[color:var(--fg-faint)]">
          {eyebrow}
        </span>
        <span className="ml-auto flex-none font-mono leading-normal text-[11px] text-[color:var(--fg-muted)]">
          {copy.count(todo.rows.length)}
        </span>
      </div>
      {todo.rows.map((row) => (
        // The last N and ran out are ONE slot, keyed as one, so a pool emptying under an open
        // list re-draws the row rather than remounting it and tearing the selection down.
        <Fragment key={row.kind === "ranOut" ? "lastN" : row.kind}>{renderRow(row)}</Fragment>
      ))}
    </section>
  );
}

export interface TodoRowProps {
  /** Warnings draw a danger mark and an over-colored title; actions an accent mark. */
  tone: "warning" | "action";
  mark: ReactNode;
  title: ReactNode;
  body: ReactNode;
  /** The next step: the label, the tint, the inset edge and the only filled press. */
  next: boolean;
  press: {
    /** The short verb drawn on the press. */
    label: string;
    /** The full shipped string, as the press's accessible name. */
    name: string;
    /** A button's action, or `href` for a press that navigates (pending's Review). */
    onPress?: () => void;
    href?: string;
    disabled?: boolean;
    /** A press that opens something in the card (the last N's list) is a disclosure. */
    expanded?: boolean;
    controls?: string;
    describedBy?: string;
  };
  /** The press's element, for a caller that moves focus to it or anchors a moment on it. A prop of its
   *  own rather than a field of `press`, so reading `press` during render never reads a ref. */
  pressRef?: Ref<HTMLButtonElement>;
  /** The title, for a caller that lands focus on the row as a statement (`tabIndex={-1}`). */
  titleRef?: Ref<HTMLParagraphElement>;
}

export function TodoRow({ tone, mark, title, body, next, press, pressRef, titleRef }: TodoRowProps) {
  const pressClass = [
    "flex-none flex items-center justify-center gap-[5px] w-[96px] md:w-[132px] h-[36px] rounded-[8px]",
    "font-sans font-semibold text-[12.5px] whitespace-nowrap no-underline cursor-pointer disabled:cursor-default disabled:opacity-50",
    // The phone's hit area is the whole row: the row is `relative`, and this covers it.
    "after:absolute after:inset-0 md:after:hidden",
    next
      ? "bg-[color:var(--fg)] text-[color:var(--bg)] [border:1px_solid_var(--fg)]"
      : "bg-transparent text-[color:var(--fg)] [border:1px_solid_var(--border-strong)]",
  ].join(" ");
  const face = (
    <>
      {press.label}
      <span
        aria-hidden
        className={`font-normal ${next ? "text-[color:var(--bg)]" : "text-[color:var(--fg-faint)]"}`}
      >
        {copy.chevron}
      </span>
    </>
  );
  const warning = tone === "warning";
  return (
    <div
      data-todo-next={next || undefined}
      className={[
        "relative flex items-center gap-[11px] px-[14px] py-[11px] md:px-[16px] md:py-[10px]",
        "[border-top:1px_solid_var(--border)]",
        next
          ? "bg-[color:color-mix(in_srgb,var(--accent)_7%,var(--surface-rail))] shadow-[inset_3px_0_0_var(--accent)]"
          : "",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "flex-none flex items-center justify-center w-[30px] h-[30px] rounded-[8px] font-mono font-semibold text-[12px]",
          warning
            ? "bg-[color:color-mix(in_srgb,var(--danger)_16%,var(--bg))] text-[color:var(--danger)]"
            : "bg-[color:color-mix(in_srgb,var(--accent)_14%,var(--bg))] text-[color:var(--accent-text)]",
        ].join(" ")}
      >
        {mark}
      </span>
      <div className="flex-1 min-w-0 md:flex md:flex-wrap md:items-baseline md:gap-[12px]">
        {next && (
          <p className="m-0 mb-[2px] md:mb-0 font-mono uppercase leading-normal text-[9px] tracking-[0.14em] text-[color:var(--accent-text)]">
            {copy.nextStep}
          </p>
        )}
        <p
          ref={titleRef}
          tabIndex={titleRef ? -1 : undefined}
          className={`m-0 outline-none text-[13.5px] font-semibold leading-[1.4] ${
            warning ? "text-[color:var(--avail-over-fg)]" : "text-[color:var(--fg)]"
          }`}
        >
          {title}
        </p>
        <p className="m-0 mt-[2px] md:mt-0 text-[12px] md:text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">
          {body}
        </p>
      </div>
      {press.href ? (
        <Link href={press.href} aria-label={press.name} className={pressClass}>
          {face}
        </Link>
      ) : (
        <button
          type="button"
          onClick={press.onPress}
          ref={pressRef}
          disabled={press.disabled}
          aria-label={press.name}
          aria-expanded={press.expanded}
          aria-controls={press.controls}
          aria-describedby={press.describedBy}
          className={pressClass}
        >
          {face}
        </button>
      )}
    </div>
  );
}

/** A9: the fill never landed. The shipped retry, `fillDeck`, moved from `FillFailedBannerConnected`. */
export function FillFailedRow({ deckId, next }: { deckId: string; next: boolean }) {
  const [pending, startTransition] = useTransition();
  const fill = recommendationsCopy.fill;
  const retry = () => {
    startTransition(async () => {
      try {
        await fillDeck(deckId);
      } catch {
        // The row already says the fill failed, so a rejected retry changes nothing the player can
        // see — except that an escaped rejection would reach an error boundary and remove the retry.
      }
    });
  };
  return (
    <TodoRow
      tone="action"
      mark={copy.fillFailedMark}
      title={fill.failedHeading}
      body={fill.failedBody}
      next={next}
      press={{ label: fill.failedRetryShort, name: fill.failedRetryAria, onPress: retry, disabled: pending }}
    />
  );
}

/** A15: lines from an import that could not be put to a card. `Look` is the shipped `seeUnresolved`. */
export function UnresolvedRow({ count, next, onLook }: { count: number; next: boolean; onLook: () => void }) {
  const u = deckImportCopy.unresolved;
  return (
    <TodoRow
      tone="action"
      mark={String(count)}
      title={u.rowTitle(count)}
      body={u.rowBody(count)}
      next={next}
      press={{ label: u.bannerActionShort, name: u.bannerActionAria, onPress: onLook }}
    />
  );
}

/**
 * A14: the list differs from the newest version. Commit and Discard live in Review (Hugh's ruling),
 * so the row's one press goes where the banner's review link went. The count is `changeCount`, which
 * counts basics and a commander move as changes, so a draft that passes `hasChanges` never reads 0.
 *
 * After a commander change lands, focus comes here: the change-commander sheet raises the flag and
 * whatever draws the draft takes it. Re-run when the row appears as well as when the flag is raised,
 * because the announcement can arrive before the refreshed draft draws the row.
 */
export function PendingRow({ state, deckId, next }: { state: DraftState; deckId: string; next: boolean }) {
  const p = deckVersioningCopy.pending;
  const door = useChangeCommander();
  const titleRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (door?.focusPending && titleRef.current) {
      titleRef.current.focus();
      door.focusTaken();
    }
  }, [door]);
  const version = state.version?.number ?? 0;
  const n = changeCount(state);
  const adds = state.addChanges.length;
  const removes = state.removes.length;
  return (
    <TodoRow
      tone="action"
      mark={copy.pendingMark}
      title={
        <>
          {p.since(n, version)}{" "}
          {/* Per side, so each reads as its own direction; `counts` owns the sign, the U+2212 and
              the rule that a zero side is not drawn. */}
          <span className="font-normal text-[12px]">
            {adds > 0 && <span className="text-[color:var(--success)]">{p.counts(adds, 0)}</span>}
            {adds > 0 && removes > 0 && " / "}
            {removes > 0 && <span className="text-[color:var(--warning)]">{p.counts(0, removes)}</span>}
          </span>
        </>
      }
      body={next ? p.rowBodyNext(n, version + 1) : p.rowBody(n)}
      next={next}
      titleRef={titleRef}
      press={{ label: p.reviewShort, name: p.reviewCta(n), href: `/decks/${deckId}/changes` }}
    />
  );
}
