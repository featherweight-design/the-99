"use client";

// A note from the creator (discovery R2·6a, README-r2 R2b, board `Note`): the letter leaves the top of About and is
// the Reference's last row, opening as a dialog from `md` (640 wide, its text scrolling inside it) and as a sheet
// below. One DOM at every width. The text is `aboutCopy.pageIntro`, unchanged; its last two paragraphs are the
// sign-off and the signature.

import { useRef, useState } from "react";
import { aboutCopy } from "../../../lib/copy/about";
import { creatorNoteCopy } from "../../../lib/copy/discovery";
import { useDialogA11y } from "../../../lib/a11y/dialog";

function NoteDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useDialogA11y(ref, onClose);
  const paragraphs = aboutCopy.pageIntro.split("\n\n");
  const signature = paragraphs.at(-1);
  const signOff = paragraphs.at(-2);
  const body = paragraphs.slice(0, -2);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div aria-hidden className="absolute inset-0 bg-[rgba(10,8,6,0.62)]" onClick={onClose} />
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={creatorNoteCopy.title}
        data-creator-note
        className="relative flex h-[min(700px,92dvh)] w-full flex-col rounded-t-[18px] border border-b-0 border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] md:h-[min(660px,90dvh)] md:w-[640px] md:rounded-[16px] md:border-b-[1px] md:border-b-[color:var(--border-strong)] md:shadow-[0_40px_100px_rgba(0,0,0,0.7)]"
      >
        <span aria-hidden className="mt-[8px] h-[4px] w-[40px] self-center rounded-full bg-[color:var(--border-dashed)] md:hidden" />
        <div className="flex items-start justify-between gap-[12px] px-[16px] pb-[10px] pt-[12px] md:px-[28px] md:pt-[24px]">
          <h2 className="m-0 font-display text-[20px] font-semibold text-[color:var(--fg)] md:text-[24px]">
            {creatorNoteCopy.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={creatorNoteCopy.close}
            className="-mr-[12px] -mt-[8px] h-[44px] w-[44px] flex-none text-[20px] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
          >
            ✕
          </button>
        </div>
        {/* In the dialog's Tab order, so a keyboard reader can reach the letter and scroll it. */}
        <div tabIndex={0} className="relative min-h-0 flex-1 overflow-y-auto px-[16px] pb-[70px] pt-[4px] text-[14.5px] leading-[1.65] text-[color:var(--fg-body)] md:px-[28px] md:text-[15px]">
          {body.map((p, i) => (
            <p key={i} className="m-0 mb-[14px]">
              {p}
            </p>
          ))}
          <p className="m-0 mb-[2px] mt-[6px]">{signOff}</p>
          <p className="m-0 font-display text-[18px] text-[color:var(--fg)]">{signature}</p>
        </div>
        {/* The drawn bottom edge: the text scrolls beneath it, and the body's foot clears it at the end. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[70px] bg-[linear-gradient(transparent,var(--surface-rail))] md:rounded-b-[16px]"
        />
      </section>
    </div>
  );
}

/** The Reference's last row, and the note it opens. */
export function CreatorNote() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a
        href="#creator-note"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        data-creator-note-row
        className="mt-[28px] flex min-h-[56px] w-full items-center justify-between gap-[12px] rounded-[12px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[18px] py-0 text-left hover:border-[color:var(--accent-dim)]"
      >
        <span>
          <span className="block font-display text-[16px] font-semibold text-[color:var(--fg)]">{creatorNoteCopy.title}</span>
          <span className="mt-[2px] block text-[13px] text-[color:var(--fg-muted)]">{creatorNoteCopy.row}</span>
        </span>
        <span aria-hidden className="text-[14px] text-[color:var(--fg-faint)]">
          ›
        </span>
      </a>
      {open && <NoteDialog onClose={() => setOpen(false)} />}
    </>
  );
}
