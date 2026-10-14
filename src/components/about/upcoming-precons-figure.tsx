// The `upcoming-precons` entry's specimen (handoff `The 99 - About · Upcoming Precons Entry.dc.html`, §G per-entry
// artboard; slots in `about · upcoming precons.ts`): one announced set as the Announced group draws it, read-only,
// with its name, its date line and its one revealed commander. The banner is not drawn here; the caption names it.
//
// Drawn from the artboard rather than by the group's own component: the Announced group is the plan's PR 2, a
// separate release, and the specimen must not wait on it or import it before it ships. The fixture is staging's
// own (2026-10-14): Darkhold Destiny Commander and Gargantos, the thinnest real announced set.

import { WUBRG_COLOR } from "../../lib/collection/browse";
import type { RevealedCommander } from "../../lib/precons/revealed";
import { HydratedImg } from "../ui/hydrated-art";

/** Fixture props (§G "Fixture props"). The date lines are the set's, fixed at the artboard's today, 2026-10-14. */
export const UPCOMING_SET: {
  name: string;
  meta: string;
  metaPhone: [string, string];
  revealed: RevealedCommander[];
} = {
  name: "Darkhold Destiny Commander",
  meta: "MDC · Apr 9, 2027 · in 6 months · 1 commander revealed",
  metaPhone: ["Apr 9, 2027 · in 6 months", "MDC · 1 commander revealed"],
  revealed: [
    {
      oracleId: "about-gargantos",
      name: "Gargantos, the Endbringer",
      colorIdentity: ["B", "G"],
      imageUriSmall: "https://cards.scryfall.io/small/front/6/0/60b48730-3590-4c8c-b0e8-6007bb36d6b6.jpg?1791578335",
      collectorNumber: "399",
    },
  ],
};

/** The set block: dashed shell, the name, the date line (one line at md, two below), and the revealed cards. */
export function UpcomingPreconsFigureBody() {
  return (
    <div className="p-[12px]">
      <div className="flex flex-col gap-[10px] rounded-[10px] border border-dashed border-[color:var(--border-dashed)] px-[12px] pt-[11px] pb-[12px] md:px-[14px] md:pt-[12px] md:pb-[14px]">
        <div className="flex flex-col gap-[3px]">
          <span className="font-display text-[15px] text-[color:var(--fg)] md:text-[16px]">{UPCOMING_SET.name}</span>
          <span className="hidden font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)] md:block">{UPCOMING_SET.meta}</span>
          {UPCOMING_SET.metaPhone.map((line) => (
            <span key={line} className="font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)] md:hidden">{line}</span>
          ))}
        </div>
        <ul className="m-0 flex list-none gap-[8px] p-0 md:gap-[12px]">
          {UPCOMING_SET.revealed.map((c) => (
            <li key={c.oracleId} className="flex w-[76px] flex-col gap-[5px] md:w-[84px]">
              <HydratedImg
                eager
                src={c.imageUriSmall ?? undefined}
                className="h-[106px] w-[76px] rounded-[4px] bg-[color:var(--surface-raised)] object-cover md:h-[117px] md:w-[84px]"
              />
              <span className="line-clamp-2 text-[10.5px] leading-[1.3] text-[color:var(--fg-body)] md:text-[11px]">{c.name}</span>
              <span className="flex gap-[3px]">
                {c.colorIdentity.map((x) => (
                  <span key={x} className="h-[7px] w-[7px] rounded-full md:h-[8px] md:w-[8px]" style={{ background: WUBRG_COLOR[x] }} />
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
