"use client";

// E1, the page's one press (handoff Entry.dc, Hugh picked B): a bare button under the Overview, accent outline on a 10% accent tint, full width on
// a phone and its own width at 1300. No icon and no line beside it, because the flow's first screen explains it. The shipped `line-pulse` plays
// twice when it first scrolls into view on a visit, then rests (the stylesheet drops it under reduced motion).
import { useEffect, useRef, useState } from "react";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import type { UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { UpgradeFlow } from "./upgrade-flow";
import type { UpgradeArt } from "./pick-steps";

const PULSE_GAP_MS = 560;

export function UpgradeEntry({ precon, panel, art }: { precon: string; panel: UpgradePanel; art: UpgradeArt }) {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = button.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watch = new IntersectionObserver((entries) => {
      if (played.current || !entries.some((e) => e.isIntersecting)) return;
      played.current = true;
      setPulse(1);
      timer = setTimeout(() => setPulse(2), PULSE_GAP_MS);
      watch.disconnect();
    });
    watch.observe(el);
    return () => { watch.disconnect(); if (timer) clearTimeout(timer); };
  }, []);

  return (
    <>
      <div className="flex">
        <button
          ref={button}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="relative h-[46px] w-full cursor-pointer rounded-[10px] border border-solid border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)] px-[18px] font-sans text-[14px] text-[color:var(--accent-text)] md:h-[40px] md:w-auto md:text-[13px]"
        >
          {preconUpgradeCopy.entry.press}
          {pulse > 0 && <span key={pulse} aria-hidden className="anim-line-pulse pointer-events-none absolute inset-0 rounded-[10px]" />}
        </button>
      </div>
      {open && <UpgradeFlow precon={precon} panel={panel} art={art} onClose={() => setOpen(false)} />}
    </>
  );
}
