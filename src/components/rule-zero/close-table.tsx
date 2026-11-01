"use client";
// `Close the table` (Rule 0 revisions 5; Table board C1 to C5, T1, D1, D2): the setter's text button in `--danger` at the
// table's foot, and its confirm, since a closed table cannot be reopened. The shipped bottom `Sheet` (fit) on the phone,
// `ModalChrome` 480 from `md`, chosen as Change deck chooses. Pressing the danger action runs `run`, which answers whether
// the table closed: while it runs the button holds (`aria-disabled` and `aria-busy`, so a focused button keeps its focus; the
// board draws no busy frame), and the confirm closes when the answer lands, a refusal so the page's toast can be seen, a
// close that landed because the page may stay mounted (its refresh fallback) rather than swap to the closed table. The pod's name is another reader's, so the question is drawn by `PersonText`, never as a string.

import { useEffect, useId, useRef, useState } from "react";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { PersonText, type ThirdPartyName } from "../../lib/person-name";
import { ModalChrome } from "../decks/receipt-modal";
import { Sheet } from "../ui/sheet";
import { TOUCH_HIT } from "../ui/touch-hit";
import { useMinWidth } from "../ui/use-min-width";

const copy = ruleZeroCopy.close;

export function CloseTable({ podName, run }: { podName: ThirdPartyName; run: () => Promise<boolean> }) {
  const wide = useMinWidth("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // One press at a time, whatever the render: a double press must not close twice.
  const running = useRef(false);
  const anchorRef = useRef<HTMLElement | null>(null);
  const leave = () => {
    if (!running.current) setOpen(false);
  };
  async function confirm() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await run();
    } catch {
      // A throw is the page's toast to say; the confirm leaves either way.
    } finally {
      running.current = false;
      setBusy(false);
    }
    setOpen(false);
  }
  const actions = <Actions busy={busy} wide={wide} onKeep={leave} onConfirm={() => void confirm()} />;
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={(e) => {
          anchorRef.current = e.currentTarget;
          setOpen(true);
        }}
        // The board's `.zclose`: full width, 44px, 600 14px, `--danger`, no fill or border.
        className={`${TOUCH_HIT} mt-[2px] flex min-h-[44px] w-full cursor-pointer items-center justify-center border-0 bg-transparent font-sans text-[14px] font-semibold text-[color:var(--danger)]`}
      >
        {copy.action}
      </button>
      {open && wide ? (
        <ModalChrome
          title=""
          titleNode={<PersonText text={copy.title(podName)} />}
          eyebrow=""
          lead={<span className="block text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.body}</span>}
          closeLabel={copy.dismiss}
          onClose={leave}
          width={480}
          fit
        >
          <div className="flex justify-end gap-[8px] px-[20px] pb-[20px] pt-[16px]">{actions}</div>
        </ModalChrome>
      ) : null}
      {open && !wide ? <ConfirmSheet podName={podName} anchorRef={anchorRef} onDismiss={leave} busy={busy}>{actions}</ConfirmSheet> : null}
    </>
  );
}

function ConfirmSheet({
  podName,
  anchorRef,
  onDismiss,
  busy,
  children,
}: {
  busy: boolean;
  podName: ThirdPartyName;
  anchorRef: React.RefObject<HTMLElement | null>;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogA11y(panelRef, onDismiss, { returnFocusRef: anchorRef, lockScroll: true });
  // The shared Sheet takes a string `ariaLabel`, and the pod's name is not one: name the dialog by its question heading
  // instead, as the desktop modal is (`aria-labelledby` outranks the Sheet's own `aria-label`).
  const titleId = useId();
  useEffect(() => {
    const panel = panelRef.current;
    panel?.setAttribute("aria-labelledby", titleId);
    return () => panel?.removeAttribute("aria-labelledby");
  }, [titleId]);
  return (
    <Sheet
      open
      portal
      onDismiss={onDismiss}
      ariaLabel={copy.action}
      panelRef={panelRef}
      header={
        // The board's `.zmh`: the question at 16px over the bare ✕. SheetHeader takes a string title, and the pod's name is not one.
        <div className="flex items-start justify-between gap-[10px] pl-[20px] pr-[8px]">
          <h2 id={titleId} className="m-0 pt-[8px] font-sans text-[16px] font-semibold leading-[1.35] text-[color:var(--fg)] [overflow-wrap:anywhere]">
            <PersonText text={copy.title(podName)} />
          </h2>
          <button
            type="button"
            aria-disabled={busy || undefined}
            onClick={() => {
              if (!busy) onDismiss();
            }}
            aria-label={copy.dismiss}
            className="flex h-[44px] w-[44px] flex-none cursor-pointer aria-disabled:cursor-default aria-disabled:opacity-60 items-center justify-center border-0 bg-transparent font-mono text-[15px] text-[color:var(--fg-muted)]"
          >
            ×
          </button>
        </div>
      }
    >
      <p className="m-0 px-[20px] pt-[6px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.body}</p>
      <div className="flex flex-col gap-[8px] px-[20px] pb-[26px] pt-[16px]">{children}</div>
    </Sheet>
  );
}

/** Phone: the danger action over `Keep it open`, both full width. From `md`: Keep it open, then the danger action, at the right. */
function Actions({ busy, wide, onKeep, onConfirm }: { busy: boolean; wide: boolean; onKeep: () => void; onConfirm: () => void }) {
  // Desktop is the board's `.btn.sm` (36px, 13px, radius 8, padding 13); the phone is its `.btn` (44px, 14.5px, radius 10).
  const size = wide ? "h-[36px] rounded-[8px] px-[13px] text-[13px]" : "min-h-[44px] w-full rounded-[10px] px-[18px] text-[14.5px]";
  // `aria-disabled`, not `disabled`: a disabled button drops the focus the keyboard is on. The handlers refuse while busy.
  const held = "aria-disabled:cursor-default aria-disabled:opacity-60";
  const keep = (
    <button
      key="keep"
      type="button"
      aria-disabled={busy || undefined}
      onClick={() => {
        if (!busy) onKeep();
      }}
      className={`${size} ${held} cursor-pointer bg-transparent font-sans font-semibold text-[color:var(--fg)] [border:1px_solid_var(--border-strong)]`}
    >
      {copy.keep}
    </button>
  );
  const danger = (
    <button
      key="danger"
      type="button"
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      onClick={() => {
        if (!busy) onConfirm();
      }}
      className={`${size} ${held} cursor-pointer border-0 bg-[color:var(--danger)] font-sans font-semibold text-[#fff]`}
    >
      {busy ? copy.closing : copy.action}
    </button>
  );
  return wide ? [keep, danger] : [danger, keep];
}
