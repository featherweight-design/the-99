"use client";

// The one line card details add for a card that makes tokens (design D1): under the proxy note, in the
// `In this deck` box, only from a deck and only when this card is a maker of one of the deck's tokens. No
// block of its own, and nothing at all outside a deck or with the switch off (no provider, no read).

import { tokensCopy } from "../../lib/copy/tokens";
import { useDeckTokens } from "./deck-tokens-context";
import { ArtLayer } from "../ui/art-layer";

/** `onShowTokens` is null where the sheet cannot close to the page (stacked over another sheet): no link then. */
export function TokenCardLine({ oracleId, onShowTokens }: { oracleId: string; onShowTokens: (() => void) | null }) {
  const ctx = useDeckTokens();
  if (!ctx || ctx.read.status !== "ok") return null;
  const made = ctx.read.tokens.filter((t) => t.makers.some((m) => m.oracleId === oracleId));
  if (made.length === 0) return null;

  const names = made.map((t) => t.name);
  const inShopping = made.some((t) => t.joined);
  const allOwned = made.every((t) => t.state === "owned");
  const state = inShopping ? tokensCopy.details.inShopping : allOwned ? tokensCopy.details.owned : null;
  const art = made.find((t) => t.picture?.imageUriSmall)?.picture?.imageUriSmall ?? null;

  return (
    <div className="mt-[12px] flex flex-wrap items-center gap-x-[10px] border-t border-t-[color:var(--border)] pt-[10px]">
      <span
        aria-hidden
        className="relative h-[28px] w-[20px] flex-none overflow-hidden rounded-[2px]"
        style={{ boxShadow: "inset 0 0 0 1px var(--border-strong)" }}
      >
        {art ? <ArtLayer src={art} style={{ boxShadow: "inset 0 0 0 1px var(--border-strong)" }} /> : null}
      </span>
      <span className="min-w-0 text-[13.5px]" style={{ color: "var(--fg-body)" }}>
        {boldNames(tokensCopy.details.line(names), names)}
        {state ? (
          <>
            <span aria-hidden> · </span>
            <span className="font-mono text-[11px]" style={{ color: "var(--accent)" }}>{state}</span>
          </>
        ) : null}
      </span>
      {onShowTokens ? (
        <button
          type="button"
          onClick={onShowTokens}
          aria-label={tokensCopy.details.linkAria}
          className="ml-auto min-h-[44px] border-0 bg-transparent p-0 text-[13px] text-[color:var(--accent)] md:min-h-0"
        >
          {tokensCopy.details.link}
        </button>
      ) : null}
    </div>
  );
}

/** The sentence with each token's name in weight 600 `--fg`, the rest as it stands. */
function boldNames(line: string, names: string[]) {
  const escaped = [...names].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return line.split(new RegExp(`(${escaped.join("|")})`)).map((part, i) =>
    names.includes(part) ? <b key={i} className="font-semibold" style={{ color: "var(--fg)" }}>{part}</b> : part,
  );
}
