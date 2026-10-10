"use client";
// §F, the revert confirmation (collection edit F4 to F7). One dialog for the whole decision: it
// reads what the revert would do today (a dry run of the revert itself, so the confirmation and
// the save are one computation), draws it as Then and Now per row with a reason, and, when the
// revert would leave a committed deck short, swaps its own content for §E rather than opening a
// second dialog. Nothing is written until the one press that says Revert, and a refusal writes
// nothing and says so.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import {
  previewRevert, revertCollectionEntry, type RevertPreview,
} from "../../app/collection/history-actions";
import type { HistoryRow } from "../../db/schema";
import type { ShortDeck } from "../../lib/collection/write";
import { collectionItemKey, type CollectionItemIdentity } from "../../lib/collection/key";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { ShortDeckWarning } from "./short-deck-warning";

const c = collectionEditCopy.revert;
const SHOWN = 8;
const qty = (s: { quantity: number } | null | undefined) => s?.quantity ?? 0;

type Line = { key: string; name: string; then: number; now: number; reason: string | null };

/**
 * Every row the ENTRY changed, as Then (what the revert leaves) and Now (today). A row the revert
 * has nothing to do on stays in the list, reading `Already back`: hiding it would make a partial
 * revert look like a complete one (F5). A row whose count moved since the entry says why.
 */
export function revertLines(p: Pick<RevertPreview, "rows" | "entryRows">): Line[] {
  const keyOf = (r: HistoryRow) => collectionItemKey(r as CollectionItemIdentity);
  const today = new Map(p.rows.map((r) => [keyOf(r), r]));
  return p.entryRows.map((e) => {
    const key = keyOf(e);
    const r = today.get(key);
    if (!r) return { key, name: e.name, then: qty(e.before), now: qty(e.before), reason: c.reasonBack };
    return { key, name: e.name, then: qty(r.after), now: qty(r.before), reason: qty(r.before) === qty(e.after) ? null : c.reasonSince };
  });
}

type View =
  | { k: "reading" }
  | { k: "ready"; p: RevertPreview; notice: boolean }
  | { k: "warning"; p: RevertPreview; decks: ShortDeck[]; fresh: ReadonlySet<string>; changed: boolean }
  | { k: "refused"; text: string; title: string };

export function RevertConfirm({
  entryId, title, when, onClose, onReverted,
}: {
  entryId: string;
  /** What the entry is called in the list, for the title. */
  title: string;
  /** The entry's time, spelled by the list. */
  when: string;
  onClose: () => void;
  /** The revert committed: the host closes this and refreshes the list. */
  onReverted: () => void;
}) {
  const headingId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<View>({ k: "reading" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Minted once per decision and reused on a retry, so a revert that did commit applies once.
  const actionId = useRef<string | null>(null);

  useDialogA11y(dialogRef, onClose, { initialFocusRef: closeRef, closeOnEscape: !pending });

  useEffect(() => {
    let live = true;
    previewRevert(entryId)
      .then((r) => {
        if (!live) return;
        if ("rows" in r) setView((v) => ({ k: "ready", p: r, notice: v.k === "ready" && v.notice }));
        else if ("missingCard" in r) setView({ k: "refused", title: c.catalogTitle, text: c.catalogBody(r.missingCard) });
        else setView({ k: "refused", title: c.catalogTitle, text: c.gone });
      })
      .catch(() => live && setView({ k: "refused", title: c.catalogTitle, text: collectionEditCopy.history.loadFailed }));
    return () => {
      live = false;
    };
  }, [entryId, attempt]);

  const preview = view.k === "ready" || view.k === "warning" ? view.p : null;
  const lines = useMemo(() => (preview ? revertLines(preview) : []), [preview]);

  async function revert(confirmShort?: ShortDeck[]) {
    if (!preview || pending) return;
    // A revert that would leave a deck short asks first, inside this same dialog.
    if (view.k === "ready" && preview.decks.length > 0 && !confirmShort) {
      setView({ k: "warning", p: preview, decks: preview.decks, fresh: new Set(), changed: false });
      return;
    }
    setPending(true);
    setError(null);
    actionId.current ??= crypto.randomUUID();
    try {
      const out = await revertCollectionEntry(entryId, actionId.current, preview.expected, confirmShort);
      if ("reverted" in out) return onReverted();
      if ("wouldShort" in out) {
        const was = new Set(view.k === "warning" ? view.decks.map((d) => d.deckId) : []);
        setView({
          k: "warning", p: preview, decks: out.wouldShort,
          fresh: new Set(out.wouldShort.map((d) => d.deckId).filter((id) => !was.has(id))), changed: view.k === "warning",
        });
      } else if ("stale" in out) {
        // The collection moved since this was drawn: read it again and say so.
        actionId.current = null;
        setView({ k: "ready", p: preview, notice: true });
        setAttempt((a) => a + 1);
      } else if ("missingCard" in out) setView({ k: "refused", title: c.catalogTitle, text: c.catalogBody(out.missingCard) });
      else setView({ k: "refused", title: c.catalogTitle, text: c.gone });
    } catch {
      setError(collectionEditCopy.history.loadFailed);
    } finally {
      setPending(false);
    }
  }

  const copiesChanged = preview ? preview.rows.reduce((n, r) => n + Math.abs(qty(r.after) - qty(r.before)), 0) : 0;
  const partial = preview?.differs === true;
  const nothingLeft = preview !== null && preview.rows.length === 0;
  const shown = all ? lines : lines.slice(0, SHOWN);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] md:items-center md:bg-[color-mix(in_oklab,var(--bg)_74%,transparent)]"
      role="presentation"
      onClick={() => { if (!pending) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-busy={pending || undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full overflow-y-auto rounded-[22px_22px_0_0] p-[12px_22px_26px] outline-none [border-top:1px_solid_var(--border-strong)] shadow-[0_-20px_50px_rgba(0,0,0,.5)] md:w-[560px] md:rounded-2xl md:p-[28px_32px] md:[border:1px_solid_var(--border-strong)] md:shadow-[0_40px_100px_rgba(0,0,0,.7)]"
        style={{ background: "var(--surface-rail)" }}
      >
        <div aria-hidden className="mx-auto mb-[16px] h-[4px] w-[40px] rounded-full bg-[color:var(--border-strong)] md:hidden" />

        {view.k === "warning" ? (
          <ShortDeckWarning
            titleId={headingId}
            source="revert"
            decks={view.decks}
            pending={pending}
            error={error}
            notice={view.changed}
            freshDeckIds={view.fresh}
            onCancel={onClose}
            onConfirm={() => void revert(view.decks)}
          />
        ) : view.k === "refused" ? (
          <div className="flex flex-col gap-[12px]">
            <h2 id={headingId} className="m-0 font-display text-[20px] font-bold text-[color:var(--fg)]">{view.title}</h2>
            <p role="alert" className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{view.text}</p>
            <button ref={closeRef} type="button" onClick={onClose} className="h-[44px] cursor-pointer self-start rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[18px] text-[14px] text-[color:var(--fg)]">
              {c.close}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-[14px]">
            <h2 id={headingId} className="m-0 font-display text-[20px] font-bold leading-[1.3] text-[color:var(--fg)] md:text-[24px]">{c.title(title)}</h2>
            {view.k === "reading" ? (
              <p role="status" className="m-0 text-[13.5px] text-[color:var(--fg-muted)]">{c.reading}</p>
            ) : (
              <>
                {view.notice ? (
                  <p role="status" className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{collectionEditCopy.shortWarning.changed}</p>
                ) : null}
                <p className="m-0 text-[14px] text-[color:var(--fg-body)]">{c.lede(when, copiesChanged)}</p>
                {partial && !nothingLeft ? (
                  <p className="m-0 rounded-[8px] border border-[color:var(--border-strong)] border-l-[3px] border-l-[color:var(--warning)] bg-[color:var(--elevated-hover)] p-[10px_12px] text-[13px] leading-[1.5] text-[color:var(--fg-body)]">
                    {c.differs}
                  </p>
                ) : null}
                {nothingLeft ? (
                  <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{c.nothingLeft}</p>
                ) : (
                  <div>
                    <div className="grid grid-cols-[1fr_44px_44px] gap-x-[10px] border-b border-b-[color:var(--border)] pb-[4px] font-mono text-[10.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">
                      <span aria-hidden />
                      <span className="text-right">{c.then}</span>
                      <span className="text-right">{c.now}</span>
                    </div>
                    <ul className="m-0 list-none p-0">
                      {shown.map((l) => (
                        <li key={l.key} className="grid min-h-[40px] grid-cols-[1fr_44px_44px] items-center gap-x-[10px] border-b border-b-[color:var(--border)] py-[6px] last:border-b-0">
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] text-[color:var(--fg)]">{l.name}</span>
                            {l.reason ? <span className="block text-[11.5px] text-[color:var(--fg-faint)]">{l.reason}</span> : null}
                          </span>
                          <span className="text-right font-mono text-[13px] text-[color:var(--fg)]">×{l.then}</span>
                          <span className="text-right font-mono text-[13px] text-[color:var(--fg-muted)]">×{l.now}</span>
                        </li>
                      ))}
                    </ul>
                    {!all && lines.length > SHOWN ? (
                      <button type="button" onClick={() => setAll(true)} className="mt-[6px] min-h-[44px] cursor-pointer border-0 bg-transparent p-0 text-[13px] text-[color:var(--accent)] underline underline-offset-2">
                        {collectionEditCopy.upload.showAll(lines.length)}
                      </button>
                    ) : null}
                  </div>
                )}
                {error ? <p role="alert" className="m-0 text-[13px] text-[color:var(--fg-body)]">{error}</p> : null}
              </>
            )}
            <div className="flex flex-col-reverse gap-[10px] md:flex-row md:justify-end">
              <button ref={closeRef} type="button" onClick={onClose} disabled={pending} className="h-[44px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[18px] text-[14px] text-[color:var(--fg)] disabled:opacity-60">
                {nothingLeft ? c.close : collectionEditCopy.shortWarning.cancel}
              </button>
              {!nothingLeft ? (
                <button
                  type="button"
                  onClick={() => void revert()}
                  disabled={pending || view.k === "reading"}
                  className="h-[44px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] px-[18px] text-[14px] font-semibold text-[color:var(--fg)] disabled:opacity-60"
                >
                  {pending ? collectionEditCopy.history.reverting : partial ? c.confirmPartial : c.confirm}
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
