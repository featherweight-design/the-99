"use client";
// `Close the table` (Rule 0 revisions 5; Table board C1 to C5, T1, D1, D2): the setter's text button in `--danger` at the
// table's foot, and its confirm, since a closed table cannot be reopened. The shipped bottom `Sheet` (fit) on the phone,
// `ModalChrome` 480 from `md`, chosen as Change deck chooses. Pressing the danger action runs `run`, which answers whether
// the table closed: while it runs the button holds (disabled, `aria-busy`; the board draws no busy frame), and a refusal
// closes the confirm so the page's toast can be seen. A close that landed leaves the confirm to the page, which swaps to
// the closed table. The pod's name is another reader's, so the question is drawn by `PersonText`, never as a string.

import { useRef, useState } from "react";
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
    let ok = false;
    try {
      ok = await run();
    } catch {
      ok = false;
    } finally {
      running.current = false;
      setBusy(false);
    }
    if (!ok) setOpen(false);
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
      {open && !wide ? <ConfirmSheet podName={podName} anchorRef={anchorRef} onDismiss={leave}>{actions}</ConfirmSheet> : null}
    </>
  );
}

function ConfirmSheet({
  podName,
  anchorRef,
  onDismiss,
  children,
}: {
  podName: ThirdPartyName;
  anchorRef: React.RefObject<HTMLElement | null>;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogA11y(panelRef, onDismiss, { returnFocusRef: anchorRef, lockScroll: true });
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
          <h2 className="m-0 pt-[8px] font-sans text-[16px] font-semibold leading-[1.35] text-[color:var(--fg)] [overflow-wrap:anywhere]">
            <PersonText text={copy.title(podName)} />
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={copy.dismiss}
            className="flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent font-mono text-[15px] text-[color:var(--fg-muted)]"
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
  const size = wide ? "h-[32px] px-[14px] text-[12.5px]" : "min-h-[44px] w-full px-[18px] text-[14.5px]";
  const keep = (
    <button
      key="keep"
      type="button"
      disabled={busy}
      onClick={onKeep}
      className={`${size} cursor-pointer rounded-[10px] bg-transparent font-sans text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] disabled:cursor-default disabled:opacity-60`}
    >
      {copy.keep}
    </button>
  );
  const danger = (
    <button
      key="danger"
      type="button"
      disabled={busy}
      aria-busy={busy || undefined}
      onClick={onConfirm}
      className={`${size} cursor-pointer rounded-[10px] border-0 bg-[color:var(--danger)] font-sans font-semibold text-[color:var(--bg)] disabled:cursor-default disabled:opacity-60`}
    >
      {copy.action}
    </button>
  );
  return wide ? [keep, danger] : [danger, keep];
}
