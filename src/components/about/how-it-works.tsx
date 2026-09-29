import { howItWorksCopy, type HowMethod } from "../../lib/copy/about";
import { bracketSubRows, howItWorksRowsCopy as copy } from "../../lib/copy/how-it-works";
import { MethodTag } from "../ui/method-tag";
import { HowRows } from "./how-rows";

const KEY_ORDER = Object.keys(howItWorksCopy.methods) as HowMethod[];

/**
 * "How the app reaches its answers": About's appendix, after the four chapters (handoff
 * about_how_it_works R1; plan 2026-09-28, PR B). The page mounts it only while
 * `HOW_IT_WORKS_ENABLED` is on.
 *
 * A server component: the key and every sentence are static. The rows are the one client part,
 * because a row opens and closes, and a hash naming one opens it before the jump lands.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mt-[18px] border-t border-solid border-[color:var(--border)] pt-[18px] scroll-mt-[20px] min-[1000px]:mt-[28px]"
    >
      <h2 className="font-display text-[16px] font-bold text-[color:var(--fg)] min-[1000px]:text-[21px]">
        {copy.title}
      </h2>
      <p className="mt-[4px] text-[13px] leading-[1.55] text-pretty text-[color:var(--fg-muted)]">{copy.sub}</p>

      <div className="mt-[12px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[14px] pt-[12px] pb-[12px] min-[1000px]:mt-[14px] min-[1000px]:px-[16px] min-[1000px]:pb-[14px]">
        <h3 className="font-mono text-[11px] font-medium tracking-[0.08em] text-[color:var(--fg-faint)]">
          {copy.keyHeading}
        </h3>
        <dl className="mt-[6px] flex flex-col min-[1000px]:mt-[8px] min-[1000px]:grid min-[1000px]:grid-cols-[repeat(2,minmax(0,1fr))] min-[1000px]:gap-x-[24px] min-[1000px]:gap-y-[8px]">
          {KEY_ORDER.map((m) => (
            <div
              key={m}
              className="flex flex-col gap-[5px] border-t border-solid border-[color:var(--border)] py-[8px] min-[1000px]:flex-row min-[1000px]:items-baseline min-[1000px]:gap-[10px] min-[1000px]:pb-0"
            >
              <dt className="flex min-[1000px]:w-[100px] min-[1000px]:flex-none">
                <MethodTag method={m} />
              </dt>
              <dd className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)] min-[1000px]:text-[12.5px]">
                {copy.keyDefs[m]}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <HowRows rows={copy.rows} subRows={bracketSubRows()} />
    </section>
  );
}
