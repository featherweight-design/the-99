"use client";
// Asking for a signature card once (avatar handoff 20, calls 4 to 6; Onboarding board O1 to O4, D1 and D2). Two
// places, one picker:
//
// - The first-run row (`SignatureRow`): unnumbered, after step 3 and before Add your friends, in the Choose your news
//   row's box (the board's `.frw`). To do, it opens the picker over Home and carries a Skip, which takes the row away
//   for good. Picked, it turns done with the face ("{card}. Change it any time on Friends.") and stays; its press
//   reopens the picker.
// - The Home strip (`SignatureStrip`): a player past first run with no face who was never asked. The welcome strip's
//   shape, a dashed initials mark, Choose your signature card, and a ✕ that ends the asking.
//
// Either one's pick goes through `setSignatureCardAction`, which makes a profile first if there is none, and stamps the
// ask done in the same write; Skip and ✕ go through `skipFacePromptAction`. Both redraw Home in the reply. The picker
// stays open while a pick saves and closes when it lands (P4, P6), so nothing here is optimistic but the strip's ✕.

import { useRef, useState } from "react";
import { setSignatureCardAction, skipFacePromptAction } from "../../app/friends/actions";
import { socialCopy } from "../../lib/copy/social";
import type { OwnCommander } from "../../lib/social/friends";
import { Face, faceInitials } from "../social/face";
import { HOME_HEADING_ID } from "./home-heading";
import { SignaturePicker, type SignaturePick } from "../social/signature-picker";
import { SocialToast, type SocialToastState } from "../social/social-toast";

const s = socialCopy.signature;
const RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

/** Home's heading takes focus when the control holding it leaves, as the welcome strip's ✕ does. */
const focusHomeHeading = () => document.getElementById(HOME_HEADING_ID)?.focus();

/** The picker as Home opens it, with its save and its toast. Returns the opener's props and the overlay to draw. */
function useHomePicker(face: OwnCommander | null, returnFocusRef: React.RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const seq = useRef(0);

  async function save(pick: SignaturePick | null): Promise<boolean> {
    // Home offers no "Use initials instead" (the picker draws it only with a face, and clearing is /friends' to do),
    // but a pick that is null is refused as no card by the action all the same.
    const out = await setSignatureCardAction(pick?.oracleId ?? null, pick?.printingId ?? null).catch(() => null);
    if (!out?.ok) {
      setToast({ id: ++seq.current, text: s.failed });
      return false;
    }
    setOpen(false);
    // The pick's redraw can take the opener away (the strip leaves; the row's press is a new element once done): once
    // the dialog has put focus back, a focus with no opener left goes to Home's heading rather than the body.
    setTimeout(() => {
      if (!returnFocusRef.current?.isConnected) focusHomeHeading();
    }, 0);
    return true;
  }

  const toastEl = <SocialToast toast={toast} onDone={() => setToast(null)} />;
  const overlay = open ? (
    <SignaturePicker current={face} onSave={save} onClose={() => setOpen(false)} returnFocusRef={returnFocusRef} toast={toastEl} clearable={false} />
  ) : (
    toastEl
  );
  return { open: () => setOpen(true), overlay };
}

// The Choose your news row's box (`first-run.tsx`, the board's `.frw`), with Skip as a sibling of the press: a button
// cannot hold a button.
const BOX = "flex min-h-[56px] items-center gap-[12px] rounded-[14px] bg-[color:var(--surface-rail)] p-[12px_15px] font-sans";
const PRESS = `flex min-w-0 flex-1 cursor-pointer items-center gap-[12px] self-stretch border-0 bg-transparent p-0 text-left ${RING}`;
const TEXT = "flex min-w-0 flex-1 flex-col gap-[3px]";
const TITLE = "font-display text-[15px] font-semibold";

/** `name`: the reader's display name, for the face's initials while its art loads; null with no profile yet. */
export function SignatureRow({ face, name }: { face: OwnCommander | null; name: string | null }) {
  const press = useRef<HTMLButtonElement>(null);
  const [skipped, setSkipped] = useState(false);
  const picker = useHomePicker(face, press);
  if (skipped) return null;

  const skip = () => {
    setSkipped(true);
    focusHomeHeading();
    // Gone on the press; a write that fails leaves the row for the next load.
    void skipFacePromptAction().catch(() => undefined);
  };

  return (
    <>
      {face ? (
        <div data-signature-row="done" className={`${BOX} [border:1px_solid_var(--border)]`}>
          <button ref={press} type="button" onClick={picker.open} aria-label={s.doneAria(face.name)} className={PRESS}>
            <span aria-hidden className="flex w-[22px] flex-none justify-center text-[14px] font-semibold text-[color:var(--success)]">✓</span>
            <span className={TEXT}>
              <span className={`${TITLE} text-[color:var(--fg-body)]`}>{s.title}</span>
              <span className="text-[12px] text-[color:var(--fg-muted)]">{s.doneLine(face.name)}</span>
            </span>
            <span aria-hidden className="flex flex-none items-center gap-[10px] text-[12.5px] text-[color:var(--fg-body)]">
              <Face name={name ?? ""} commander={face} size={30} />
              <span className="text-[color:var(--fg-faint)]">›</span>
            </span>
          </button>
        </div>
      ) : (
        <div data-signature-row="todo" className={`${BOX} [border:1px_solid_var(--border-strong)]`}>
          <button ref={press} type="button" onClick={picker.open} className={PRESS}>
            <span aria-hidden className="box-border flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[6px] [border:1.5px_dashed_var(--border-dashed)]">
              <span className="h-[12px] w-[9px] rounded-[2px] [border:1.4px_solid_var(--fg-muted)]" />
            </span>
            <span className={TEXT}>
              <span className={`${TITLE} text-[color:var(--fg)]`}>{s.choose}</span>
              <span className="text-[12px] text-[color:var(--fg-muted)]">{s.rowSub}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={skip}
            aria-label={s.skipAria}
            data-signature-skip
            className={`min-h-[44px] flex-none cursor-pointer border-0 bg-transparent px-[6px] font-sans text-[13px] font-medium text-[color:var(--fg-muted)] ${RING}`}
          >
            {s.skip}
          </button>
          <span aria-hidden className="flex-none text-[color:var(--fg-faint)]">›</span>
        </div>
      )}
      {picker.overlay}
    </>
  );
}

/** The welcome strip's anatomy (`welcome-strip.tsx`); its link, and its ✕ (44, 32 from sm). */
const LINK =
  "relative cursor-pointer whitespace-nowrap rounded-[3px] border-0 bg-transparent p-0 font-[inherit] text-[length:inherit] font-semibold leading-[inherit] text-[color:var(--fg)] underline decoration-[color-mix(in_srgb,var(--accent)_55%,transparent)] " +
  "underline-offset-[3px] hover:decoration-[color:var(--fg)] after:absolute after:-inset-x-[6px] after:-inset-y-[12px] after:content-[''] " + RING;

export function SignatureStrip({ name }: { name: string | null }) {
  const link = useRef<HTMLButtonElement>(null);
  const [closed, setClosed] = useState(false);
  const picker = useHomePicker(null, link);
  if (closed) return null;

  const close = () => {
    setClosed(true);
    focusHomeHeading();
    // Hidden on the press; a write that fails leaves the strip for the next load.
    void skipFacePromptAction().catch(() => undefined);
  };

  return (
    <section
      aria-label={s.stripRegion}
      data-signature-strip
      className="flex min-h-[52px] items-center gap-[12px] rounded-[12px] border border-solid border-[color:var(--accent-dim)] bg-[color:var(--surface)] py-[7px] pl-[12px] pr-[4px] text-[13.5px] leading-[1.45] text-[color:var(--fg-body)]"
    >
      {/* The initials friends see now, in a dashed box: the face before it has art (the board's `.sl3`). */}
      <span aria-hidden className="box-border flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px] font-mono text-[10px] font-medium text-[color:var(--fg-muted)] [border:1.5px_dashed_var(--border-dashed)]">
        {name ? faceInitials(name) : null}
      </span>
      <p className="m-0 min-w-0 flex-1 [text-wrap:pretty]">
        {s.stripLead}{" "}
        <button ref={link} type="button" onClick={picker.open} data-signature-choose className={LINK}>
          {s.choose}
        </button>
      </p>
      <button
        type="button"
        aria-label={s.stripDismiss}
        data-signature-dismiss
        onClick={close}
        className={`flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center rounded-[6px] border-0 bg-transparent p-0 text-[13px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg)] sm:mr-[4px] sm:h-[32px] sm:w-[32px] ${RING}`}
      >
        <span aria-hidden>✕</span>
      </button>
      {picker.overlay}
    </section>
  );
}
