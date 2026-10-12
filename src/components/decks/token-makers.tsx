"use client";

import { tokensCopy } from "../../lib/copy/tokens";
import type { TokenMaker } from "../../lib/tokens/read";
import { useCardDetail, useCardIntent } from "../cards/card-detail-provider";
import { usePreviewRow } from "./hover-preview";

/** Past this many names the list scrolls in a box: 9 on desktop, 5 on a phone (design table). */
export const MAKERS_BOX_DESKTOP = 9;
export const MAKERS_BOX_PHONE = 5;

/** Columns from md up: one name, two to six, seven or more. */
export function makerColumns(count: number): 1 | 2 | 3 {
  return count <= 1 ? 1 : count <= 6 ? 2 : 3;
}

function Maker({ maker, siblings }: { maker: TokenMaker; siblings: TokenMaker[] }) {
  const { open } = useCardDetail();
  const intent = useCardIntent(maker.oracleId, maker.imageUri);
  const preview = usePreviewRow(maker.imageUri);
  return (
    <li className="min-w-0" {...preview}>
      <button
        type="button"
        {...intent}
        onClick={(e) => open(
          maker.oracleId,
          siblings.map((m) => ({ oracleId: m.oracleId, name: m.name, imageUri: m.imageUri })),
          undefined,
          { opener: e.currentTarget },
        )}
        className="min-h-[44px] md:min-h-[30px] max-w-full text-left text-[13px] font-semibold text-[color:var(--fg)] underline decoration-[color-mix(in_oklab,var(--accent)_55%,transparent)] underline-offset-[3px]"
      >
        {maker.name}
      </button>
    </li>
  );
}

/**
 * The cards of this deck that make the token, A to Z (the loader's order), each opening its card
 * details. A long list scrolls inside a sunken box so one row can never push the rest of the group
 * down the page: past 5 names on a phone, past 9 from md up.
 */
export function TokenMakers({ makers, printingLine }: { makers: TokenMaker[]; printingLine: string | null }) {
  const n = makers.length;
  const boxPhone = n > MAKERS_BOX_PHONE;
  const boxDesktop = n > MAKERS_BOX_DESKTOP;
  const cols = makerColumns(n);
  const box = [
    boxPhone ? "max-md:max-h-[240px] max-md:overflow-y-auto max-md:overscroll-contain max-md:rounded-[8px] max-md:border max-md:border-[color:var(--border)] max-md:bg-[color:var(--surface-sunken)] max-md:px-[12px] max-md:py-[2px]" : "",
    boxDesktop ? "md:max-h-[158px] md:overflow-y-auto md:overscroll-contain md:rounded-[8px] md:border md:border-[color:var(--border)] md:bg-[color:var(--surface-sunken)] md:px-[12px] md:py-[2px]" : "",
  ].join(" ");
  const columns = cols === 1 ? "" : cols === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <div className="mt-[8px] flex flex-col gap-[6px] border-t border-t-[color:var(--border)] pt-[9px] md:ml-[54px]">
      <p className="m-0 flex items-baseline gap-[8px] font-mono text-[9.5px] uppercase tracking-[.14em] text-[color:var(--fg-muted)]">
        <span>{tokensCopy.makers.label(n)}</span>
        {boxPhone ? (
          <span className={`text-[10px] normal-case tracking-normal text-[color:var(--fg-locked)] ${boxDesktop ? "" : "md:hidden"}`}>
            {tokensCopy.makers.scrolls}
          </span>
        ) : null}
      </p>
      <ul className={`m-0 grid list-none grid-cols-1 gap-x-[18px] p-0 ${columns} ${box}`}>
        {makers.map((m) => <Maker key={m.oracleId} maker={m} siblings={makers} />)}
      </ul>
      {printingLine ? (
        <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">{printingLine}</p>
      ) : null}
    </div>
  );
}
