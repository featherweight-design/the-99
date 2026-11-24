"use client";
// Ask's answers in the card search (tool discovery D, `design_handoff_the99_tool_discovery/` README 5 and STATES "Ask"):
// the tools a typed question answers, the starter questions, and the state where nothing answers. The tool row keeps the
// search row's frame (72px on the phone, 58px in the dropdown), so a tool and a card read as one list.

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import { askCopy, cardSearchCopy } from "../../lib/copy/card-search";
import type { DeckPick, ToolCardModel } from "../../lib/discovery/showcase";
import { feedAge } from "../../lib/feed/age";
import { atPlace } from "../../lib/commanders/place-paths";

/** About's index (its Tools tab redirects there, `legacy-href.ts`): where `Every tool, in About` goes. Here, not in `ask.ts`, so the shell does not load the tool registry for a link. */
const ABOUT_TOOLS_HREF = "/about";

const HEADING = "font-mono text-[10.5px] font-medium tracking-[0.14em] text-[color:var(--fg-faint)] uppercase";

/** Where a press on a tool's answer lands: its page or deck, or New deck when the reader has no deck it can read. */
export function toolHref(m: ToolCardModel): string {
  return m.state.kind === "none" ? atPlace("/decks/new/choose", true) : m.state.href;
}

/** The decks a press on this answer asks the reader to choose between: several fit and the read carried them (a server read; the offline answer carries none). */
export function picksOf(m: ToolCardModel): DeckPick[] | null {
  return m.state.kind === "deck" && m.state.more > 0 && m.state.picks ? m.state.picks : null;
}

/** The mono line at the row's foot: where the press goes. */
export function toolWhere(m: ToolCardModel): string {
  const s = m.state;
  const picks = picksOf(m);
  if (picks) return askCopy.pick.foot(picks.length);
  if (s.kind === "deck") return `${cardSearchCopy.row.inDeck(s.deck)}${s.more > 0 ? ` ${cardSearchCopy.row.moreDecks(s.more)}` : ""}`;
  return s.kind === "page" ? s.label : askCopy.newDeck;
}

/** The tool's mark: one ink on an accent wash, 28px in a 48px tile on the phone and 24px in 40px from md (R12 Q19). While the
 *  page loads (Q20) the glyph gives way to a 22px spinner, which stands still under reduced motion. */
function Mark({ pending }: { pending: boolean }) {
  return (
    <span
      aria-hidden
      data-ask-mark=""
      className="flex h-12 w-12 flex-none items-center justify-center rounded-[12px] text-[color:var(--accent-text)] md:h-10 md:w-10 md:rounded-[10px]"
      style={{ background: "color-mix(in srgb, var(--accent) 16%, var(--surface))" }}
    >
      {pending ? (
        <span data-ask-spin="" className="block h-[22px] w-[22px] rounded-full border-2 border-solid border-[color:var(--accent)] border-t-transparent motion-safe:animate-spin" />
      ) : (
        <svg className="h-7 w-7 md:h-6 md:w-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.5 3.5a3.6 3.6 0 0 0-4.2 4.8L3.5 12.1a1.6 1.6 0 0 0 2.3 2.3l3.8-3.8a3.6 3.6 0 0 0 4.8-4.2l-2.2 2.2-1.9-.5-.5-1.9z" />
        </svg>
      )}
    </span>
  );
}

export function ToolRow({
  model,
  id,
  first,
  active,
  opening,
  onPress,
  onKey,
}: {
  model: ToolCardModel;
  id: string;
  first: boolean;
  active: boolean;
  /** The tool whose page is loading, if any: this row rings, the others dim. */
  opening: string | null;
  onPress: () => void;
  onKey?: (e: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const none = model.state.kind === "none";
  const line = model.state.kind === "none" ? model.state.line : model.copy.line;
  const pending = opening === model.id;
  const dim = opening !== null && !pending;
  const where = pending ? askCopy.opening(model.copy.name) : toolWhere(model);
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      aria-label={askCopy.rowAria(model.copy.name, line, model.credit ?? askCopy.free, where)}
      tabIndex={-1}
      onClick={onPress}
      onKeyDown={onKey}
      data-ask-tool={model.id}
      data-ask-none={none ? "" : undefined}
      data-ask-pending={pending ? "" : undefined}
      className={`flex min-h-[72px] cursor-pointer items-center gap-3 rounded-[8px] py-2 pr-[14px] pl-4 outline-none md:min-h-[58px] md:py-[7px] md:pl-[14px] ${
        first ? "" : "border-t border-solid border-[color:var(--border)]"
      } ${active || pending ? "bg-[color:var(--elevated)]" : ""} ${pending ? "shadow-[inset_0_0_0_1.5px_var(--accent)]" : ""} ${dim ? "opacity-[0.45]" : ""}`}
    >
      <Mark pending={pending} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] leading-[1.3] font-semibold text-[color:var(--fg)] md:text-[14px]">{model.copy.name}</span>
          <span className="flex-none rounded-full border border-solid border-[color:var(--border-strong)] px-2 font-mono text-[10.5px] leading-[18px] text-[color:var(--fg-body)]">
            {model.credit ?? askCopy.free}
          </span>
        </span>
        <span className="line-clamp-2 text-[13px] leading-[1.4] text-[color:var(--fg-muted)] md:line-clamp-1 md:text-[12.5px]">{line}</span>
        <span className="flex min-w-0 font-mono text-[11.5px] whitespace-nowrap text-[color:var(--fg-faint)] md:text-[11px]">
          <span className={`min-w-0 truncate ${pending ? "text-[color:var(--accent-text)]" : ""}`}>{where}</span>
          <span aria-hidden className="flex-none pl-1">{"›"}</span>
        </span>
      </span>
    </div>
  );
}

/**
 * The deck picker (R12 Q21, G28): a tool several decks can use swaps the answers for the decks in the same box. The field
 * keeps focus and the keys (the card search's own `active` walks these rows), so this draws and presses and owns no key.
 * `opening` names the deck whose page is loading: its row rings and the others dim, as a tool row does.
 */
export function DeckPicker({
  tool,
  picks,
  listboxId,
  active,
  opening,
  onBack,
  onPick,
}: {
  tool: ToolCardModel;
  picks: readonly DeckPick[];
  listboxId: string;
  active: number;
  opening: string | null;
  onBack: () => void;
  onPick: (deck: DeckPick, place: number) => void;
}) {
  // One clock for every row, read when the picker opens.
  const [now] = useState(() => new Date().toISOString());
  const busy = opening !== null;
  return (
    <div data-ask-pick="" role="group" aria-label={askCopy.pick.aria(tool.copy.name)}>
      <div className="flex items-center gap-2 px-2 pt-1 pb-2 md:px-[6px]">
        <button
          type="button"
          data-ask-pick-back=""
          disabled={busy}
          onClick={onBack}
          className="flex h-11 min-w-11 cursor-pointer items-center gap-1 rounded-[8px] px-2 text-[14px] font-medium text-[color:var(--accent-text)] md:h-8 md:text-[13px]"
        >
          <span aria-hidden>{"‹"}</span> {askCopy.pick.back}
        </button>
      </div>
      <div className="flex items-center gap-3 px-4 pb-3 md:px-[14px]">
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="flex items-center gap-2">
            <span className="text-[16px] font-semibold text-[color:var(--fg)] md:text-[15px]">{tool.copy.name}</span>
            <span className="flex-none rounded-full border border-solid border-[color:var(--border-strong)] px-2 font-mono text-[10.5px] leading-[18px] text-[color:var(--fg-body)]">
              {tool.credit ?? askCopy.free}
            </span>
          </span>
          <span className="text-[13px] leading-[1.45] text-[color:var(--fg-muted)] md:text-[12.5px]">{askCopy.pick.line(picks.length)}</span>
        </span>
      </div>
      <h3 className={`px-4 pt-1 pb-[6px] md:px-[14px] ${HEADING}`}>{askCopy.pick.heading}</h3>
      <div id={listboxId} role="listbox" aria-label={askCopy.pick.list} aria-busy={busy || undefined}>
        {picks.map((d, i) => {
          const pending = opening === d.id;
          const dim = busy && !pending;
          return (
            <div
              key={d.id}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              onClick={() => onPick(d, i)}
              data-ask-pick-deck={d.id}
              data-ask-pending={pending ? "" : undefined}
              className={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded-[8px] py-2 pr-[14px] pl-4 outline-none md:min-h-[54px] md:py-[6px] md:pl-[14px] ${
                i ? "border-t border-solid border-[color:var(--border)]" : ""
              } ${i === active || pending ? "bg-[color:var(--elevated)]" : ""} ${pending ? "shadow-[inset_0_0_0_1.5px_var(--accent)]" : ""} ${dim ? "opacity-[0.45]" : ""}`}
            >
              <span className="block h-[44px] w-[60px] flex-none overflow-hidden rounded-[6px] border border-solid border-[color:var(--border-strong)] md:h-[36px] md:w-[50px]">
                {d.art ? (
                  // eslint-disable-next-line @next/next/no-img-element -- card art is a remote Scryfall image
                  <img src={d.art} alt="" decoding="async" loading="lazy" className="h-full w-full object-cover" />
                ) : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="truncate font-display text-[15px] font-bold text-[color:var(--fg)] md:text-[14px]">{d.name}</span>
                <span className={`truncate font-mono text-[11px] ${pending ? "text-[color:var(--accent-text)]" : "text-[color:var(--fg-faint)]"}`}>
                  {pending ? askCopy.opening(tool.copy.name) : askCopy.pick.meta(d.commander, feedAge(d.edited, now))}
                </span>
              </span>
              <span aria-hidden className="flex-none text-[16px] text-[color:var(--fg-faint)]">{"›"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The four starter questions: a press types one into the field. 44px on the phone, 34px in the dropdown. */
export function Starters({ questions, onPick, heading = true }: { questions: readonly string[]; onPick: (q: string) => void; heading?: boolean }) {
  if (questions.length === 0) return null;
  return (
    <div data-ask-starters="" className="px-4 pt-[14px] pb-1 md:px-[14px] md:pt-2">
      {heading ? <h3 className={`${HEADING} pb-2`}>{askCopy.starters.heading}</h3> : null}
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            data-ask-starter=""
            className="min-h-11 cursor-pointer rounded-full border border-solid border-[color:var(--border-strong)] px-[14px] text-left text-[14px] leading-[1.3] text-[color:var(--fg)] md:min-h-[34px] md:text-[13px]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Nothing answers: never a dead end. Says so, offers the starters, and the way into every tool. */
export function NoTool({ questions, onPick, onNavigate }: { questions: readonly string[]; onPick: (q: string) => void; onNavigate: () => void }) {
  return (
    <div data-ask-none-state="">
      <div className="flex flex-col gap-1 px-4 pt-[18px] pb-1 md:px-[14px] md:pt-3">
        <p className="text-[15.5px] font-semibold text-[color:var(--fg)] md:text-[14.5px]">{askCopy.noTool.title}</p>
        <p className="text-[14px] leading-[1.6] text-[color:var(--fg-muted)] md:text-[13.5px] md:leading-[1.55]">{askCopy.noTool.body}</p>
      </div>
      <Starters questions={questions} onPick={onPick} heading={false} />
      <Link
        href={ABOUT_TOOLS_HREF}
        onClick={onNavigate}
        data-ask-about=""
        className="mx-4 mt-2 mb-3 flex min-h-11 items-center gap-1 text-[14px] font-medium text-[color:var(--accent-text)] md:mx-[14px] md:min-h-9 md:text-[13px]"
      >
        {askCopy.noTool.about}
        <span aria-hidden>{"›"}</span>
      </Link>
    </div>
  );
}

/** The heading over the tools. Hidden from the tree: the group already carries its name. */
export function ToolsHeading() {
  return <h3 className={`${HEADING} px-4 pt-[14px] pb-[6px] md:px-[14px] md:pt-2`}>{askCopy.tools.heading}</h3>;
}
