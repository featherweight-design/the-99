"use client";
// How to export (public landing PR 7b, README call 5): the four apps' export guides, opened from the signed-in first run
// and from the upload's no-column error. A sheet on the phone and a modal on desktop, one shell at both widths, the way
// the landing's What credits cost (`landing/cost-sheet.tsx`) draws its own. One app's steps open at a time. The words are
// `collection-sources.ts`: the third step says "here" because the reader is already in. The Moxfield note sits in
// Moxfield's guide alone.
//
// UNVERIFIED: the per-app steps are Design's, drafted from memory and not checked against a real export (see that file).

import { Fragment, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { useInertWhileOpen } from "../../lib/a11y/inert-page";
import { collectionSources, type GuideText } from "../../lib/copy/collection-sources";
import { SheetGrabber } from "../ui/sheet-grabber";
import { MoxfieldNote } from "./moxfield-note";

const s = collectionSources;
const c = s.signedIn;

function Words({ parts }: { parts: readonly GuideText[] }) {
  return (
    <>
      {parts.map((p, i) => (typeof p === "string" ? <Fragment key={i}>{p}</Fragment> : <b key={i} className="font-semibold text-[color:var(--fg)]">{p.b}</b>))}
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`flex-none text-[color:var(--fg-faint)] ${open ? "rotate-180" : ""}`}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function Dialog({ onClose, returnFocusRef }: { onClose: () => void; returnFocusRef: React.RefObject<HTMLElement | null> }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const base = useId();
  const [open, setOpen] = useState<string | null>(null);
  // Focus lands on the close button; Tab is held inside, Escape closes, focus returns to the opener (`useDialogA11y`).
  useDialogA11y(dialogRef, onClose, { initialFocusRef: closeRef, returnFocusRef });
  const inertRef = useInertWhileOpen(true);
  return (
    <div
      ref={inertRef}
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color:color-mix(in_oklab,var(--bg)_72%,transparent)] md:items-center"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="export-guides"
        onClick={(e) => e.stopPropagation()}
        className="anim-sheet-up relative flex max-h-[92dvh] w-full flex-col gap-[6px] overflow-hidden rounded-[18px_18px_0_0] border border-solid border-[color:var(--border-strong)] max-md:border-b-0 bg-[color:var(--surface-raised)] px-[18px] pb-[24px] pt-[10px] outline-none md:w-[520px] md:rounded-[14px] md:px-[24px] md:pb-[18px] md:pt-[22px]"
      >
        <SheetGrabber className="pt-0" barClassName="mb-[2px]" />
        <div className="flex flex-none items-start justify-between gap-[12px]">
          <h3 id={titleId} className="m-0 font-display text-[18px] font-bold leading-[1.3] text-[color:var(--fg)] md:text-[19px]">{c.title}</h3>
          <button
            ref={closeRef}
            type="button"
            aria-label={c.close}
            onClick={onClose}
            className="-mr-[12px] -mt-[10px] inline-flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full border-0 bg-transparent text-[16px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <p className="m-0 mb-[4px] flex-none text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">{c.lead}</p>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <ul className="m-0 list-none p-0">
            {s.apps.map((app) => {
              const shown = open === app.id;
              const panel = `${base}-${app.id}`;
              return (
                <li key={app.id} className="border-t border-solid border-t-[color:var(--border)]">
                  <button
                    type="button"
                    aria-expanded={shown}
                    aria-controls={panel}
                    onClick={() => setOpen(shown ? null : app.id)}
                    className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-[12px] border-0 bg-transparent px-0 text-left font-sans text-[14px] font-semibold text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--accent)]"
                  >
                    {app.name}
                    <Chevron open={shown} />
                  </button>
                  <div id={panel} hidden={!shown} className="pb-[12px]">
                    <ol className="m-0 flex list-decimal flex-col gap-[6px] pl-[20px] text-[13px] leading-[1.5] text-[color:var(--fg-body)]">
                      {[...app.steps.slice(0, -1), app.hereStep].map((parts, i) => (
                        <li key={i}><Words parts={parts} /></li>
                      ))}
                    </ol>
                    <p className="m-0 mt-[10px] text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{[s.requirement, app.bothColumns, app.foot].filter(Boolean).join(" ")}</p>
                    {app.id === "moxfield" && <MoxfieldNote className="mt-[10px]" />}
                  </div>
                </li>
              );
            })}
            <li className="border-t border-solid border-t-[color:var(--border)]">
              <button
                type="button"
                aria-expanded={open === "another"}
                aria-controls={`${base}-another`}
                onClick={() => setOpen(open === "another" ? null : "another")}
                className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-[12px] border-0 bg-transparent px-0 text-left font-sans text-[14px] font-semibold text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--accent)]"
              >
                {s.another.name}
                <Chevron open={open === "another"} />
              </button>
              <div id={`${base}-another`} hidden={open !== "another"} className="pb-[12px]">
                <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{c.another}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * The guides' opener and the dialog it opens, portalled to the body. `children` is the link's text; `className` styles the
 * trigger (a text link at each call site). The trigger keeps its own box: its 44px touch target is the caller's class.
 */
export function ExportGuides({ children, className }: { children: React.ReactNode; className: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={className}
      >
        {children}
      </button>
      {open && createPortal(<Dialog onClose={() => setOpen(false)} returnFocusRef={trigger} />, document.body)}
    </>
  );
}
