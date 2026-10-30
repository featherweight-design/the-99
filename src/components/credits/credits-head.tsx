import { creditsPageCopy } from "../../lib/copy/credits-page";
import { CreditsText } from "../ui/credits-text";

const c = creditsPageCopy;

export const PAGE = "mx-auto flex w-full leading-[normal] max-w-[1040px] flex-col gap-[22px] px-[16px] pb-[28px] pt-[18px] md:gap-[26px] md:px-[48px] md:pb-[40px] md:pt-[34px]";

/**
 * The title, sub and free-views line, drawn by the page, its loading screen and its read-failed state alike. `suggestedV2`
 * is the reader's `suggestedChangesV2Enabled(env)` (a v2 run over 10 changes uses 2 credits, so the sub stops saying
 * "any tool"); the loading screen, drawn before any switch is read, passes `null` and gets the words true for every reader.
 */
export function CreditsHead({ suggestedV2 }: { suggestedV2: boolean | null }) {
  const sub = suggestedV2 === false ? c.sub : c.subV2;
  return (
    <div className="flex flex-col gap-[6px]">
      <h1 className="m-0 font-display text-[26px] font-bold text-[color:var(--fg)] md:text-[30px]">{c.title}</h1>
      <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">
        <CreditsText text={`${sub} · ${c.subLink}`} />
      </span>
      <p className="m-0 mt-[4px] max-w-[900px] text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{c.viewsFree}</p>
    </div>
  );
}

