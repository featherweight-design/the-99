// A tool on About's Tools tab (discovery R2·5; handoff `design/design_handoff_the99_discovery_onboarding/`, README-r2
// C2 and C3 with R2b's option C, property table "A tool card", STATES "A tool card").
//
// Option C: the whole card is the press, its footer saying where it opens. `How it works ›` and a none-state's door
// sit above the stretched link as their own links. A card with nothing to open is not a link at all.
//
// Widths are the grid's and the row's; no height is fixed (R2 gap 13): cards in a row stretch to the tallest.

import Link from "next/link";
import { PendingReporter } from "../../shell/pending-reporter";
import { showcaseCopy } from "../../../lib/copy/discovery";
import type { Shot } from "../../../lib/about/shots";
import type { ToolCardModel } from "../../../lib/discovery/showcase";
import { TOUCH_HIT } from "../../ui/touch-hit";

/** Where `How it works ›` opens the tool's entry: the Reference, at that entry. */
export function entryHref(entry: string): string {
  return `/about?tab=reference#${entry}`;
}

function Picture({ shot, name }: { shot: Shot | null; name: string }) {
  return (
    <div className="relative aspect-[3/2] overflow-hidden border-b border-b-[color:var(--border)] bg-[color:var(--bg)]">
      {shot && (
        // eslint-disable-next-line @next/next/no-img-element -- a fixed-size capture served as-is from public/
        <img
          src={shot.src}
          width={shot.width}
          height={shot.height}
          alt={showcaseCopy.pictureAlt(name)}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 block h-full w-full object-cover"
        />
      )}
      {shot?.halo && (
        <span
          aria-hidden
          data-tool-card-halo
          className="pointer-events-none absolute rounded-[9px]"
          style={{
            left: `${shot.halo.x * 100}%`,
            top: `${shot.halo.y * 100}%`,
            width: `${shot.halo.w * 100}%`,
            height: `${shot.halo.h * 100}%`,
            boxShadow:
              "0 0 0 2px color-mix(in oklab, var(--accent) 75%, transparent), 0 0 0 6px color-mix(in oklab, var(--accent) 20%, transparent), 0 0 0 2000px color-mix(in oklab, var(--bg) 28%, transparent)",
          }}
        />
      )}
    </div>
  );
}

// TOUCH_HIT: drawn at 38px (10px padding round a 12px line), a coarse pointer reaches 44px.
const HOW =
  `${TOUCH_HIT} z-[2] flex-none whitespace-nowrap py-[10px] font-mono text-[12px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg-muted)]`;
const MONO_LINE = "pt-[4px] font-mono text-[12px] leading-[1.5] text-[color:var(--fg-muted)]";

export function ToolCard({ card, shot }: { card: ToolCardModel; shot: Shot | null }) {
  const { copy, state } = card;
  const press = state.kind === "deck" || state.kind === "page";
  const footerLabel =
    state.kind === "deck" ? showcaseCopy.opens(state.deck, state.more) : state.kind === "page" ? state.label : null;
  return (
    <article
      aria-label={copy.name}
      data-tool-card={card.id}
      data-state={state.kind}
      className="relative flex h-full flex-col overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface)] focus-within:border-[color:var(--border-strong)]"
    >
      <Picture shot={shot} name={copy.name} />
      <div className="flex flex-1 flex-col gap-[8px] px-[14px] pb-[12px] pt-[14px] md:px-[18px] md:pb-[14px] md:pt-[16px]">
        <div className="flex items-baseline justify-between gap-[10px]">
          <h3 className="m-0 text-[16px] font-semibold leading-[1.3] text-[color:var(--fg)]">{copy.name}</h3>
          {card.credit && (
            <span className="flex-none whitespace-nowrap rounded-full border border-[color:var(--border-strong)] px-[9px] py-[2px] font-mono text-[11px] text-[color:var(--fg-muted)]">
              {card.credit}
            </span>
          )}
        </div>
        <p className="m-0 text-[14px] leading-[1.5] text-[color:var(--fg-body)]">{copy.line}</p>
        <div className="mt-auto flex flex-col gap-[6px] border-t border-t-[color:var(--border)] pt-[8px]">
          {state.kind === "none" && <p className={`m-0 ${MONO_LINE}`}>{state.line}</p>}
          {card.note && <p className={`m-0 ${MONO_LINE}`}>{card.note}</p>}
          <div className="flex min-h-[40px] items-center gap-[10px]">
            <Link href={entryHref(card.entry)} className={HOW}>
              {showcaseCopy.howItWorks}
              <PendingReporter href={entryHref(card.entry)} />
            </Link>
            {footerLabel && (
              <>
                <span
                  aria-hidden
                  className="ml-auto min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] text-[color:var(--fg-muted)]"
                >
                  {footerLabel}
                </span>
                <span
                  aria-hidden
                  className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border border-[color:var(--accent)] text-[15px] text-[color:var(--accent)]"
                >
                  →
                </span>
              </>
            )}
            {state.kind === "none" && state.door && (
              <Link
                href={state.door.href}
                className={`${TOUCH_HIT} z-[2] ml-auto py-[10px] text-[14px] font-semibold text-[color:var(--accent)] hover:underline`}
              >
                {state.door.label}
                <PendingReporter href={state.door.href} />
              </Link>
            )}
          </div>
        </div>
      </div>
      {press && (
        <Link
          href={state.href}
          aria-label={state.kind === "deck" ? showcaseCopy.tryOn(state.deck) : state.label}
          className="absolute inset-0 z-[1] rounded-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--accent)]"
        >
          <PendingReporter href={state.href} />
        </Link>
      )}
    </article>
  );
}
