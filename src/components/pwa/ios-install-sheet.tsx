"use client";

import { useRef } from "react";

import { useDialogA11y } from "../../lib/a11y/dialog";
import { pwaInstallCopy } from "../../lib/copy/pwa-install";
import { PrimaryButton } from "../ui/button";
import { Sheet } from "../ui/sheet";

const copy = pwaInstallCopy.sheet;

/** Concert Crawl's step glyphs: Share (a box with an arrow up), Add (a plus in a box), Home. */
function StepIcon({ icon }: { icon: string }) {
  const path =
    icon === "share"
      ? "M10 3v9M10 3l-3 3M10 3l3 3M5 10v6a1 1 0 001 1h8a1 1 0 001-1v-6"
      : icon === "plus"
        ? "M10 6v8M6 10h8"
        : "M3 8l7-5 7 5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8z";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {icon === "plus" ? <rect x="2.5" y="2.5" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="1.5" /> : null}
      <path d={path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * How to add The 99 to the home screen on iPhone (Concert Crawl's `IosHowToSheet`): three steps and
 * Got it, on the app's own sheet. Mounted only while open, so `useDialogA11y` holds focus, Escape and
 * the scroll lock exactly as long as it is up.
 */
export function IosInstallSheet({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(panelRef, onClose);
  return (
    <Sheet open onDismiss={onClose} ariaLabel={copy.ariaLabel} panelRef={panelRef}>
      <div className="flex flex-col gap-[14px] overflow-y-auto px-[20px] pt-[10px] pb-[24px]">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
          {copy.eyebrow}
        </span>
        <h2 className="m-0 font-display text-[19px] font-bold text-[color:var(--fg)]">{copy.title}</h2>
        <p className="m-0 text-[14px] text-[color:var(--fg-muted)]">{copy.sub}</p>
        <ol className="m-0 flex list-none flex-col gap-[12px] p-0">
          {copy.steps.map((step) => (
            <li key={step.num} className="flex items-start gap-[12px]">
              <span className="mt-[2px] flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full border border-solid border-[color:var(--border)] bg-[color:var(--surface-raised)] text-[color:var(--fg)]">
                <StepIcon icon={step.icon} />
              </span>
              <span className="flex flex-col gap-[3px]">
                <span className="text-[14px] font-semibold text-[color:var(--fg)]">
                  <span className="mr-[4px] text-[color:var(--fg-faint)]">{step.num}.</span>
                  {step.label}
                </span>
                <span className="text-[12.5px] text-[color:var(--fg-muted)]">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <PrimaryButton onClick={onClose} className="mt-[6px] min-h-[44px] w-full text-[15px]">
          {copy.done}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}
