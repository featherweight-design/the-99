"use client";

import { useState } from "react";
import { reportCopy as copy } from "../../lib/copy/report";
import { ReportForm } from "./report-form";

// About's index row (flyer trial PR 5; handoff Report-Phone R2, Report-Desktop D2): an icon, "Something wrong?" over its
// line, and "Report a problem" at the right, under the six page tiles and above Terms and Privacy. The press opens the form.

export function ReportRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        data-about-report
        className="mx-[16px] mt-[20px] flex items-center gap-[12px] rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface)] py-[12px] pl-[14px] pr-[6px] md:mx-0 md:mt-[28px] md:max-w-[560px]"
      >
        <span aria-hidden className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px] border border-solid border-[color:var(--border-strong)] text-[color:var(--fg-muted)]">
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2.8 17.4 16H2.6z" />
            <path d="M10 8v3.6" />
            <path d="M10 13.6v.2" />
          </svg>
        </span>
        <span className="flex-1 text-[13.5px] leading-[1.45] text-[color:var(--fg-body)] [text-wrap:pretty]">
          <b className="block font-semibold text-[color:var(--fg)]">{copy.aboutTitle}</b>
          {copy.aboutLine}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-[44px] cursor-pointer items-center whitespace-nowrap border-0 bg-transparent px-[10px] text-[13.5px] font-semibold text-[color:var(--accent-text)] hover:underline"
        >
          {copy.aboutPress}
        </button>
      </div>
      {open && <ReportForm source="about" onClose={() => setOpen(false)} />}
    </>
  );
}
