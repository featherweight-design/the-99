// A tool card on an About page's Try it (discovery R2·5, handoff `design/design_handoff_the99_discovery_onboarding/`,
// README-r2 C2 and C3; About visual build, handoff call 6; About Addendum R4 board 5, `build.py` `tool_new`).
//
// One way in (R4 board 5): the card has ONE press, a solid accent button with the shipped press label and an arrow; the
// card body and the picture are no hit area. The picture sits in its own inset frame. Under the description, the
// Where line lights the tool's control on the capture above (what Show me did). A deck card's button reads "Try it on
// {deck}", its accessible name already; a page card's, its press label. A card with nothing to open has no solid
// button: its door (another screen that helps) is its one button in the secondary style, and a card with no door has
// none, its mono line saying why.
//
// Widths are the grid's and the row's; no height is fixed (R2 gap 13): cards in a row stretch to the tallest, and
// each button sits at its card's foot so a desktop row's buttons share one baseline (R4 README 5.4).

import Link from "next/link";
import { PendingReporter } from "../../shell/pending-reporter";
import { showcaseCopy } from "../../../lib/copy/discovery";
import type { Shot } from "../../../lib/about/shots";
import type { ToolCardModel } from "../../../lib/discovery/showcase";
import { TOUCH_HIT } from "../../ui/touch-hit";

/** The tool card's halo on its picture: an accent ring with the rest of the picture dimmed. About's labelled screen lights
 *  a pressed label's region with the same look (`labelled-screen.tsx`). */
export const TOOL_CARD_HALO =
  "0 0 0 2px color-mix(in oklab, var(--accent) 75%, transparent), 0 0 0 6px color-mix(in oklab, var(--accent) 20%, transparent), 0 0 0 2000px color-mix(in oklab, var(--bg) 28%, transparent)";

function Picture({ shot, name }: { shot: Shot | null; name: string }) {
  // Inert (R4 board 5, `.npic`): its own 3:2 frame, no link, keeping its alt and halo.
  return (
    <div className="relative aspect-[3/2] overflow-hidden rounded-[9px] border border-[color:var(--border-strong)] bg-[color:var(--bg)] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.35)]">
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
            boxShadow: TOOL_CARD_HALO,
          }}
        />
      )}
    </div>
  );
}

// TOUCH_HIT: a coarse pointer reaches 44px round the 12px line (`.where`).
const WHERE = `${TOUCH_HIT} self-start font-mono text-[12px] leading-[1.5] text-[color:var(--fg-muted)] underline decoration-[color:var(--border-strong)] underline-offset-[3px] hover:text-[color:var(--fg)]`;
const MONO_LINE = "font-mono text-[12px] leading-[1.5] text-[color:var(--fg-muted)]";
// `relative` so the button paints over the Where line's coarse-pointer hit box above it. `mt-auto` from md puts it at
// the stretched card's foot (`.drow .ntc .btn`).
const BUTTON =
  "relative mt-[4px] flex min-h-[44px] items-center justify-center gap-[8px] rounded-[10px] px-[12px] text-center no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] md:mt-auto";
/** The solid press (`.btn`). */
export const TOOL_PRESS = `${BUTTON} bg-[color:var(--accent)] text-[14.5px] font-semibold text-[color:var(--bg)]`;
/** The secondary press, Try it's more button's style (`.morebtn`): a none card's door. */
export const TOOL_DOOR = `${BUTTON} border border-[color:var(--border-strong)] bg-[color:var(--surface)] text-[14px] font-medium text-[color:var(--fg)]`;

/** The card's Where line: an About page's way to light the tool's control on the capture above (call 6, R4 board 5). */
export type ToolCardLink = { href: string; label: string };

export function ToolCard({
  card, shot, link, lit = false, anchor,
}: {
  card: ToolCardModel;
  shot: Shot | null;
  /** The Where line: lights the tool's control on the capture above. */
  link: ToolCardLink;
  /** The card a Show me landing lit (Ways-In board, `.tc.on`): an accent border and ring. */
  lit?: boolean;
  /** An id for the card, so a link on the page can scroll to it. */
  anchor?: string;
}) {
  const { copy, state } = card;
  const press =
    state.kind === "deck"
      ? { href: state.href, label: showcaseCopy.tryOn(state.deck), cls: TOOL_PRESS }
      : state.kind === "page"
        ? { href: state.href, label: state.label, cls: TOOL_PRESS }
        : state.door
          ? { href: state.door.href, label: state.door.label, cls: TOOL_DOOR }
          : null;
  return (
    <article
      aria-label={copy.name}
      data-tool-card={card.id}
      data-state={state.kind}
      data-lit={lit ? "" : undefined}
      id={anchor}
      className={`flex h-full scroll-mt-[16px] flex-col gap-[12px] rounded-[14px] border bg-[color:var(--surface)] px-[10px] pb-[12px] pt-[10px] ${
        lit
          ? "border-[color:var(--accent)] shadow-[0_0_0_2px_color-mix(in_oklab,var(--accent)_45%,transparent)]"
          : "border-[color:var(--border-strong)]"
      }`}
    >
      <Picture shot={shot} name={copy.name} />
      <div className="flex flex-1 flex-col gap-[8px] px-[4px]">
        <div className="flex items-baseline justify-between gap-[10px]">
          <h3 className="m-0 text-[16px] font-semibold leading-[1.3] text-[color:var(--fg)]">{copy.name}</h3>
          {card.credit && (
            <span className="flex-none whitespace-nowrap rounded-full border border-[color:var(--border-strong)] px-[9px] py-[2px] font-mono text-[11px] text-[color:var(--fg-muted)]">
              {card.credit}
            </span>
          )}
        </div>
        <p className="m-0 text-[14px] leading-[1.5] text-[color:var(--fg-body)]">{copy.line}</p>
        {state.kind === "none" && <p className={`m-0 ${MONO_LINE}`}>{state.line}</p>}
        {card.note && <p className={`m-0 ${MONO_LINE}`}>{card.note}</p>}
        <Link href={link.href} data-tool-card-where className={WHERE}>
          {link.label}
          <PendingReporter href={link.href} />
        </Link>
        {press && (
          <Link href={press.href} data-tool-card-press className={press.cls}>
            {press.label}
            {/* A door's label carries its own arrow ("Open Friends →"). */}
            {press.cls === TOOL_PRESS && <span aria-hidden>→</span>}
            <PendingReporter href={press.href} />
          </Link>
        )}
      </div>
    </article>
  );
}
