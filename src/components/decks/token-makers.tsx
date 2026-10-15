"use client";

import { tokensCopy } from "../../lib/copy/tokens";
import type { TokenMaker } from "../../lib/tokens/read";
import { useCardDetail, useCardIntent } from "../cards/card-detail-provider";
import { usePreviewRow } from "./hover-preview";

/** Columns from md up: one name, two to six, seven or more. */
export function makerColumns(count: number): 1 | 2 | 3 {
  return count <= 1 ? 1 : count <= 6 ? 2 : 3;
}

// The box exists to stop a long list pushing the page down, so it appears where the list can actually
// outgrow its cap, worked out from the design's own numbers: a name is 44px tall on a phone (one column)
// and 30px from md up (`makerColumns` of them), the box pads 2px top and bottom, and its cap is 240px on a
// phone and 158px from md up. That is past 5 names on a phone, as the design table says. From md up the
// table says "past 9", which is the one-column count; with two and three columns the same 158px holds
// 10 to 15 names, and a box and a fade drawn over a list that cannot scroll are noise, so desktop turns
// on at the first count that overflows (16).
const PHONE_ROW = 44;
const DESKTOP_ROW = 30;
const BOX_PAD = 4;
const PHONE_CAP = 240;
const DESKTOP_CAP = 158;

export function boxedOnPhone(count: number): boolean {
  return count * PHONE_ROW + BOX_PAD > PHONE_CAP;
}

/** The same decision for a list drawn in a fixed number of columns (a tile's is one). */
function boxedOnDesktopIn(count: number, columns: 1 | 2 | 3): boolean {
  return Math.ceil(count / columns) * DESKTOP_ROW + BOX_PAD > DESKTOP_CAP;
}

export function boxedOnDesktop(count: number): boolean {
  return boxedOnDesktopIn(count, makerColumns(count));
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
          { art: maker.imageUri, opener: e.currentTarget },
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
 * down the page: where the list can outgrow its cap, which is 6 names on a phone and 16 from md up
 * (`boxedOnPhone`, `boxedOnDesktop`).
 */
export function TokenMakers({ makers, printingLine, layout = "row" }: {
  makers: TokenMaker[]; printingLine: string | null;
  /** `box` is the `In this deck` box of a token's details: no row indent, the row's columns. */
  layout?: "row" | "box";
}) {
  const n = makers.length;
  const cols = makerColumns(n);
  const boxPhone = boxedOnPhone(n);
  const boxDesktop = boxedOnDesktopIn(n, cols);
  const box = [
    boxPhone ? "max-md:max-h-[240px] max-md:overflow-y-auto max-md:overscroll-contain max-md:rounded-[8px] max-md:border max-md:border-[color:var(--border)] max-md:bg-[color:var(--surface-sunken)] max-md:px-[12px] max-md:py-[2px]" : "",
    boxDesktop ? "md:max-h-[158px] md:overflow-y-auto md:overscroll-contain md:rounded-[8px] md:border md:border-[color:var(--border)] md:bg-[color:var(--surface-sunken)] md:px-[12px] md:py-[2px]" : "",
  ].join(" ");
  const columns = cols === 1 ? "" : cols === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <div className={`mt-[8px] flex flex-col gap-[6px] border-t border-t-[color:var(--border)] pt-[9px] ${layout === "box" ? "" : "md:ml-[54px]"}`}>
      <p className="m-0 flex items-baseline gap-[8px] font-mono text-[9.5px] uppercase tracking-[.14em] text-[color:var(--fg-faint)]">
        <span>{tokensCopy.makers.label(n)}</span>
        {boxPhone || boxDesktop ? (
          <span className={`text-[10px] normal-case tracking-normal text-[color:var(--fg-locked)] ${boxPhone && boxDesktop ? "" : boxPhone ? "md:hidden" : "max-md:hidden"}`}>
            {tokensCopy.makers.scrolls}
          </span>
        ) : null}
      </p>
      <ul className={`m-0 grid list-none grid-cols-1 gap-x-[18px] p-0 ${columns} ${box}`}>
        {makers.map((m) => <Maker key={m.oracleId} maker={m} siblings={makers} />)}
        {/* The sticky 28px fade at the box's foot, drawn only where the box scrolls at that width. It takes its own
            28px at the end of the list rather than overlaying it, so a box that does not overflow (10 names in
            3 columns is about 120px under a 158px cap) never has text under the fade. */}
        {boxPhone || boxDesktop ? (
          <li
            aria-hidden
            className={`pointer-events-none sticky bottom-0 h-[28px] list-none [background:linear-gradient(to_top,var(--surface-sunken),transparent)] [grid-column:1/-1] ${
              boxPhone && boxDesktop ? "" : boxPhone ? "md:hidden" : "max-md:hidden"
            }`}
          />
        ) : null}
      </ul>
      {printingLine ? (
        <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">{printingLine}</p>
      ) : null}
    </div>
  );
}
