"use client";
// Search failed (HANDOFF §5, 5e). The answers are kept: *Try again* re-renders the same address,
// and *Change answers* goes back to the form, pre-filled. No motion (STATES invariant).

import Link from "next/link";
import { useRouter } from "next/navigation";

import { PRIMARY } from "../ui/button";
import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";

export function SearchFailed({ changeHref }: { changeHref: string }) {
  const router = useRouter();
  const button = "inline-flex items-center justify-center h-[44px] md:h-[36px] px-[16px] rounded-[8px] text-[13.5px] w-full md:w-auto";
  return (
    <section
      role="alert"
      data-testid="search-failed"
      className="flex flex-col items-center text-center gap-[10px] p-[36px_18px] md:p-[56px_40px] rounded-[14px] border border-dashed border-[color:var(--border-strong)]"
    >
      <span
        aria-hidden
        className="flex items-center justify-center w-[36px] h-[36px] rounded-full font-mono text-[15px] font-semibold text-[color:var(--warning)] [border:1.5px_solid_color-mix(in_oklab,var(--warning)_55%,transparent)]"
      >
        !
      </span>
      <h2 className="m-0 font-display font-semibold text-[16px] md:text-[19px] text-[color:var(--fg)]">{copy.searchFailed.head}</h2>
      <p className="m-0 max-w-[460px] text-[13px] md:text-[13.5px] leading-[1.6] text-[color:var(--fg-body)]">{copy.searchFailed.body}</p>
      <div className="flex flex-col md:flex-row gap-[8px] mt-[4px] w-full md:w-auto">
        <button type="button" onClick={() => router.refresh()} className={`${button} ${PRIMARY} font-semibold border-0 cursor-pointer`}>
          {copy.searchFailed.retry}
        </button>
        <Link href={changeHref} className={`${button} whitespace-nowrap no-underline border border-solid border-[color:var(--border-strong)] text-[color:var(--fg-body)]`}>
          {copy.searchFailed.change}
        </Link>
      </div>
    </section>
  );
}
