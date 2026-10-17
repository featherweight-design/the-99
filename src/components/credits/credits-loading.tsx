// What `/credits` draws while it loads (P6): the real title and sub at once, then four plain blocks in the page's own
// shape (the total, the balance strip, an offer, the history), breathing like every loader and with no spinner. Served by
// the route's own `loading.tsx` on a navigation and by `ShellLoading` on a direct load. It carries `StallWatch` and
// `data-loading-screen` as `LoadingScreen` does, so a page stuck here is reported like any other.
import { creditsLoadingCopy } from "../../lib/copy/shell";
import { StallWatch } from "../shell/nav-stall";
import { CreditsHead, PAGE } from "./credits-head";

const BLOCK = "block bg-[color:var(--elevated)]";

export function CreditsLoading() {
  return (
    <div data-loading-screen className={PAGE}>
      <span role="status" className="sr-only">{creditsLoadingCopy.status}</span>
      <StallWatch />
      <CreditsHead />
      <div className="anim-skeleton flex flex-col gap-[22px] md:gap-[26px]" aria-hidden="true">
        <div className="flex flex-col gap-[12px]">
          <span className={`${BLOCK} h-[40px] w-[140px] rounded-[8px]`} />
          <span className={`${BLOCK} h-[84px] w-full rounded-[12px]`} />
        </div>
        <span className={`${BLOCK} h-[220px] w-full rounded-[14px]`} />
        <span className={`${BLOCK} h-[160px] w-full rounded-[12px]`} />
      </div>
    </div>
  );
}
