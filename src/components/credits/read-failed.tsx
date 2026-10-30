"use client";
// P7: the read behind the page failed. One sentence and Try again, never a toast: it is not transient, and the
// page has nothing true to draw. The title stays, as in every other state.

import { useRouter } from "next/navigation";
import { creditsPageCopy } from "../../lib/copy/credits-page";
import { CreditsHead, PAGE } from "./credits-head";

const c = creditsPageCopy.read;

/** `suggestedV2` is the reader's `suggestedChangesV2Enabled(env)`, for the sub (`CreditsHead`). */
export function CreditsReadFailed({ suggestedV2 }: { suggestedV2: boolean }) {
  const router = useRouter();
  return (
    <div className={PAGE}>
      <CreditsHead suggestedV2={suggestedV2} />
      <div role="alert" className="flex flex-col items-start gap-[12px] rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[16px] py-[18px]">
        <span className="flex items-center gap-[10px] text-[14.5px] font-semibold text-[color:var(--fg)]">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" fill="var(--danger)" className="flex-none">
            <path fillRule="evenodd" d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 3.5h1.5v4.5h-1.5V4.5Zm0 6h1.5v1.5h-1.5V10.5Z" />
          </svg>
          {c.failed}
        </span>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="flex h-[44px] cursor-pointer items-center justify-center rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[20px] text-[14px] font-semibold text-[color:var(--fg)]"
        >
          {c.retry}
        </button>
      </div>
    </div>
  );
}
