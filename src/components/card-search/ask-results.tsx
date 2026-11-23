"use client";
// Ask's answers in the card search (tool discovery D, `design_handoff_the99_tool_discovery/` README 5 and STATES "Ask"):
// the tools a typed question answers, the starter questions, and the state where nothing answers. The tool row keeps the
// search row's frame (72px on the phone, 58px in the dropdown), so a tool and a card read as one list.

import Link from "next/link";
import type { KeyboardEvent } from "react";
import { askCopy, cardSearchCopy } from "../../lib/copy/card-search";
import type { ToolCardModel } from "../../lib/discovery/showcase";
import { atPlace } from "../../lib/commanders/place-paths";
import { ABOUT_TOOLS_HREF } from "../../lib/discovery/ask";

const HEADING = "font-mono text-[10.5px] font-medium tracking-[0.14em] text-[color:var(--fg-faint)] uppercase";

/** Where a press on a tool's answer lands: its page or deck, or New deck when the reader has no deck it can read. */
export function toolHref(m: ToolCardModel): string {
  return m.state.kind === "none" ? atPlace("/decks/new/choose", true) : m.state.href;
}

/** The mono line at the row's foot: where the press goes. */
export function toolWhere(m: ToolCardModel): string {
  const s = m.state;
  if (s.kind === "deck") return `${cardSearchCopy.row.inDeck(s.deck)}${s.more > 0 ? ` ${cardSearchCopy.row.moreDecks(s.more)}` : ""}`;
  return s.kind === "page" ? s.label : askCopy.newDeck;
}

/** The tool's mark: one ink on an accent wash, the search row's art slot (40px phone, 30px dropdown). */
function Mark() {
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] text-[color:var(--accent-text)] md:h-[30px] md:w-[30px] md:rounded-[8px]"
      style={{ background: "color-mix(in srgb, var(--accent) 16%, var(--surface))" }}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.5 3.5a3.6 3.6 0 0 0-4.2 4.8L3.5 12.1a1.6 1.6 0 0 0 2.3 2.3l3.8-3.8a3.6 3.6 0 0 0 4.8-4.2l-2.2 2.2-1.9-.5-.5-1.9z" />
      </svg>
    </span>
  );
}

export function ToolRow({
  model,
  id,
  first,
  active,
  onPress,
  onKey,
}: {
  model: ToolCardModel;
  id: string;
  first: boolean;
  active: boolean;
  onPress: () => void;
  onKey?: (e: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const none = model.state.kind === "none";
  const line = model.state.kind === "none" ? model.state.line : model.copy.line;
  const where = toolWhere(model);
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
      className={`flex min-h-[72px] cursor-pointer items-center gap-3 rounded-[8px] py-2 pr-[14px] pl-4 outline-none md:min-h-[58px] md:py-[7px] md:pl-[14px] ${
        first ? "" : "border-t border-solid border-[color:var(--border)]"
      } ${active ? "bg-[color:var(--elevated)]" : ""}`}
    >
      <Mark />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] leading-[1.3] font-semibold text-[color:var(--fg)] md:text-[14px]">{model.copy.name}</span>
          <span className="flex-none rounded-full border border-solid border-[color:var(--border-strong)] px-2 font-mono text-[10.5px] leading-[18px] text-[color:var(--fg-body)]">
            {model.credit ?? askCopy.free}
          </span>
        </span>
        <span className="line-clamp-2 text-[13px] leading-[1.4] text-[color:var(--fg-muted)] md:line-clamp-1 md:text-[12.5px]">{line}</span>
        <span className="flex min-w-0 font-mono text-[11.5px] whitespace-nowrap text-[color:var(--fg-faint)] md:text-[11px]">
          <span className="min-w-0 truncate">{where}</span>
          <span aria-hidden className="flex-none pl-1">{"›"}</span>
        </span>
      </span>
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

/** Tools answered and no card name matched: the cards part is this one line, never the no-results box. */
export function NoCards() {
  return <p className="border-t border-solid border-[color:var(--border)] px-4 py-[14px] text-[13px] text-[color:var(--fg-muted)] md:px-[14px]">{askCopy.noCards}</p>;
}
