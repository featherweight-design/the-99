"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";

import { useDialogA11y } from "../../lib/a11y/dialog";
import { pushSettingsCopy } from "../../lib/copy/push-settings";
import { Sheet, SheetHeader } from "../ui/sheet";

const c = pushSettingsCopy.sheet;

/** Safari's own glyphs (board iPhone, frame 2): Share (a box with an arrow up) and Add (a plus in a rounded box). */
function Glyph({ name }: { name: "share" | "add" }) {
  return (
    <span className="inline-flex align-[-3px] text-[#0a84ff]">
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {name === "share" ? (
          <>
            <path d="M10 2.8v10" />
            <path d="M6.6 6 10 2.6 13.4 6" />
            <path d="M6.4 9H5a1.2 1.2 0 0 0-1.2 1.2v6A1.2 1.2 0 0 0 5 17.4h10a1.2 1.2 0 0 0 1.2-1.2v-6A1.2 1.2 0 0 0 15 9h-1.4" />
          </>
        ) : (
          <>
            <rect x="3.5" y="3.5" width="13" height="13" rx="3" />
            <path d="M10 7v6M7 10h6" />
          </>
        )}
      </svg>
    </span>
  );
}

/**
 * Push on an iPhone in Safari (push handoff call 4, board iPhone frame 2): iOS sends web push only to an app on the
 * Home Screen, so the device row's How ›, its box and any push tick open this. The shared sheet box with a ✕
 * (`Sheet`, `SheetHeader`), three steps, Safari's own glyphs. Mounted only while open, so `useDialogA11y` holds focus,
 * Escape and the scroll lock exactly as long as it is up; portaled to `<body>` for the reason `IosInstallSheet` gives
 * (the navigation overlay makes `<main>` inert while a press is pending).
 */
export function PushHowSheet({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(panelRef, onClose);
  return createPortal(
    <Sheet
      open
      onDismiss={onClose}
      ariaLabel={c.title}
      panelRef={panelRef}
      header={<SheetHeader title={c.title} closeLabel={c.close} onDismiss={onClose} />}
    >
      <div className="flex flex-col gap-[12px] px-[16px] pt-[14px] pb-[24px]">
        <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{c.line}</p>
        <ol className="m-0 mt-[4px] flex list-none flex-col p-0">
          {c.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-[12px] py-[10px] [&+&]:[border-top:1px_solid_var(--border)]">
              <i className="h-[22px] w-[22px] flex-none rounded-full border border-solid border-[color:var(--border-strong)] text-center font-mono text-[11px] font-medium not-italic leading-[20px] text-[color:var(--fg-muted)]">
                {i + 1}
              </i>
              <span className="text-[14px] leading-[1.5] text-[color:var(--fg)]">
                {step.lead}
                {step.glyph === "share" && <> <Glyph name="share" /></>}
                {step.strong && <> <b className="font-bold">{step.strong}</b></>}
                {step.glyph === "add" && <> <Glyph name="add" /></>}
                {step.rest}
                {step.small && <small className="block text-[12.5px] text-[color:var(--fg-muted)]">{step.small}</small>}
              </span>
            </li>
          ))}
        </ol>
        <p className="m-0 font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{c.foot}</p>
      </div>
    </Sheet>,
    document.body,
  );
}
