// Finding the tools R3 (account 1, 2026-11-23), PROPOSAL: Ask, inside the shipped card search. The search field takes a
// question as well as a card name; questions match the tool registry by phrase (no model call), and the tools answer
// above the cards. Starter questions show while nothing is typed, and Home draws the same field with them.
import { SearchField } from "../src/components/ui/text-field";
import { SearchGlyph } from "../src/components/card-search/card-search";
import { SearchRow } from "../src/components/card-search/search-row";
import { showcaseCopy } from "../src/lib/copy/discovery";
import { TuningToolMark } from "../src/components/decks/tuning-tool-mark";
import { NavIcon } from "../src/components/shell/nav-icons";
import { FitsGlyph } from "./find";

const T = showcaseCopy.tools;

/** Every new string (copy strings.ts holds the same). */
export const askCopy = {
  placeholder: "Search cards, or ask a question",
  starters: {
    heading: "Not sure where to go? Ask",
    questions: [
      "Where can my spare cards go?",
      "How do I make my deck better?",
      "What can I build with my cards?",
      "What should I buy next?",
    ],
  },
  tools: { heading: "Tools for this", free: "free" },
  noCards: "No card names match.",
  noTool: {
    title: "Nothing here answers that yet",
    body: "Try one of these, or search a card by name.",
    about: "Every tool, in About",
  },
  home: { heading: "Not sure where to go?" },
};

type Answer = { key: string; mark: any; name: string; cost: string; line: string; yours?: string; where: string };
const wash = "flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[8px] bg-[color:color-mix(in_srgb,var(--accent)_14%,var(--bg))] md:h-[30px] md:w-[30px]";
const accent = (n: any) => <span className="text-[color:var(--accent)] [&_svg]:h-[18px] [&_svg]:w-[18px]">{n}</span>;
export const ANSWERS: Record<string, Answer[]> = {
  spares: [
    { key: "find-a-deck", mark: <FitsGlyph />, name: T["find-a-deck"].name, cost: "free", line: T["find-a-deck"].line, yours: "212 of your cards are in no deck", where: "Collection, cards in no deck" },
    { key: "read", mark: <FitsGlyph />, name: "Which deck needs it most?", cost: "1 credit", line: "Takes a card through each deck’s plan and names the ones it really helps.", where: "Inside Find a deck" },
    { key: "wishlist", mark: accent(<NavIcon href={"/collection" as any} />), name: T.wishlist.name, cost: "free", line: T.wishlist.line, where: "Collection, Wishlist" },
  ],
};

/** The starter questions: the shipped filter chip's shape at 44px, wrapping. A press types the question in. */
export function Starters({ heading = askCopy.starters.heading, pad = true }: { heading?: string; pad?: boolean }) {
  return (
    <section aria-label={heading || askCopy.starters.heading} className={pad ? "px-4 pt-[14px] pb-[4px] md:px-[14px] md:pt-[8px]" : ""}>
      {heading ? <h3 className="m-0 pb-[8px] font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{heading}</h3> : null}
      <ul role="list" className="m-0 flex list-none flex-wrap gap-[8px] p-0">
        {askCopy.starters.questions.map((q) => (
          <li key={q}>
            <button type="button" className="flex min-h-[44px] cursor-pointer items-center rounded-full bg-[color:var(--surface)] px-[14px] text-left text-[13.5px] text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] md:min-h-[34px] md:px-[12px] md:text-[13px]">{q}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One tool answer: the search row's frame, a mark tile in place of the card, the tool's shipped line, the reader's
 *  own number when there is one, and where it lands. A press goes there (the tool's `lands`, as Try it). */
function AnswerRow({ a, first }: { a: Answer; first: boolean }) {
  return (
    <a href="#" role="option" aria-selected={false} className={`flex min-h-[72px] items-start gap-3 px-4 py-[12px] no-underline md:min-h-[58px] md:px-[14px] md:py-[10px] ${first ? "" : "border-t border-solid border-[color:var(--border)]"}`}>
      <span aria-hidden className={wash}>{a.mark}</span>
      <span className="min-w-0 flex-1">
        <span className="block">
          <span className="text-[15px] font-semibold leading-[1.3] text-[color:var(--fg)] md:text-[14px]">{a.name}</span>
          <span className="ml-[8px] inline-block whitespace-nowrap rounded-[4px] px-[5px] align-[1px] font-mono text-[10px] leading-[16px] text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)]">{a.cost}</span>
        </span>
        <span className="mt-[3px] block text-[13.5px] leading-[1.5] text-[color:var(--fg-muted)] md:text-[12.5px]">{a.line}</span>
        {a.yours ? <span className="mt-[3px] block text-[13px] font-medium leading-[1.5] text-[color:var(--accent-text)] md:text-[12.5px]">{a.yours}</span> : null}
        <span className="mt-[3px] block font-mono text-[11px] text-[color:var(--fg-faint)]">{a.where} ›</span>
      </span>
    </a>
  );
}

const META = "px-4 pt-[14px] pb-[6px] font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[color:var(--fg-faint)] md:px-[14px] md:pt-2";

export function ToolAnswers({ answers }: { answers: Answer[] }) {
  return (
    <>
      <h3 className={`m-0 ${META}`}>{askCopy.tools.heading}</h3>
      <div role="listbox" aria-label={askCopy.tools.heading}>{answers.map((a, i) => <AnswerRow key={a.key} a={a} first={i === 0} />)}</div>
      <p className="m-0 border-t border-solid border-[color:var(--border)] px-4 py-[14px] text-[13px] text-[color:var(--fg-faint)] md:px-[14px] md:py-[10px]">{askCopy.noCards}</p>
    </>
  );
}

export function NoTool() {
  const c = askCopy.noTool;
  return (
    <>
      <div className="flex flex-col gap-[6px] px-4 pt-[22px] pb-[6px] md:px-[14px] md:pt-[12px]">
        <p className="m-0 text-[15.5px] font-semibold text-[color:var(--fg)] md:text-[14.5px]">{c.title}</p>
        <p className="m-0 text-[14px] leading-[1.6] text-[color:var(--fg-muted)] md:text-[13.5px]">{c.body}</p>
      </div>
      <Starters heading="" />
      <p className="m-0 px-4 pt-[14px] pb-[16px] md:px-[14px]"><a href="#" className="text-[13.5px] font-medium text-[color:var(--accent-text)] underline underline-offset-[3px]">{c.about} ›</a></p>
    </>
  );
}

export function RecentRows({ rows }: { rows: any[] }) {
  return (
    <>
      <div className="flex items-center justify-between px-4 pt-[14px] pb-[6px] md:px-[14px] md:pt-2">
        <h3 className="font-mono text-[10.5px] font-medium tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">Recent cards</h3>
        <button type="button" className="min-h-9 text-[13.5px] font-medium md:min-h-0 md:text-[13px] text-[color:var(--accent-text)] underline underline-offset-[3px]">Clear</button>
      </div>
      <div role="listbox" aria-label="Recent cards">
        {rows.map((r, i) => <SearchRow key={r.oracleId} row={r} query="" id={`r-${i}`} first={i === 0} active={false} returned={false} onPick={() => {}} />)}
      </div>
    </>
  );
}

function Field({ query, desk }: { query: string; desk: boolean }) {
  return (
    <SearchField
      containerClassName={desk ? "h-[46px] min-w-0 gap-3 rounded-none border-0 bg-transparent pr-[10px] pl-4 focus-within:shadow-none" : "h-11 min-w-0 flex-1 rounded-[10px] border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] pr-[6px] pl-[13px]"}
      className={desk ? "text-[15px] whitespace-nowrap" : "text-[16px] whitespace-nowrap"}
      leading={<span className="flex-none text-[color:var(--fg-muted)]"><SearchGlyph size={18} /></span>}
      trailing={desk && query === "" ? <kbd aria-hidden className="-mr-[40px] flex-none rounded-[5px] border border-solid border-[color:var(--border-strong)] px-[6px] py-[2px] font-mono text-[10.5px] font-medium text-[color:var(--fg-faint)]">⌘K</kbd> : null}
      aria-label={askCopy.placeholder} placeholder={askCopy.placeholder} value={query} onChange={() => {}} onClear={() => {}} />
  );
}

/** The phone's full-screen sheet, as `PhoneFrame` draws it, with `body` in the results' host. */
export function PhoneSheet({ query, body }: { query: string; body: any }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[color:var(--bg)]">
      <div className="flex items-center gap-[6px] border-b border-b-[color:var(--border)] py-3 pr-2 pl-[14px] pt-[14px]">
        <Field query={query} desk={false} />
        <button type="button" aria-label="Close search" className="flex h-11 w-11 flex-none items-center justify-center text-[16px] text-[color:var(--fg-muted)]">✕</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
    </div>
  );
}

/** The desktop frame, as `search-desktop.tsx` draws it: the field box and the dropdown under it, 12px from the rail. */
export function DeskDropdown({ query, body, foot = "↑ ↓ to move · ↵ to open · esc to close" }: { query: string; body: any; foot?: string }) {
  return (
    <div className="fixed top-[73px] left-[calc(var(--rail-w,72px)+12px)] z-40 flex w-[540px] flex-col gap-2">
      <span aria-hidden className="absolute top-[18px] -left-[6px] z-10 h-[10px] w-[10px] rotate-45 border-b border-l border-solid border-[color:var(--accent)] bg-[color:var(--bg)]" />
      <div className="rounded-[10px] border border-solid border-[color:var(--accent)] bg-[color:var(--bg)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]"><Field query={query} desk /></div>
      <div className="flex flex-col overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] py-[6px] shadow-[0_22px_50px_rgba(0,0,0,0.6)]">
        <div>{body}</div>
        <p className="m-0 flex items-center justify-between gap-3 border-t border-solid border-[color:var(--border)] px-[14px] pt-[9px] pb-[5px] font-mono text-[11px] text-[color:var(--fg-faint)]"><span>{foot}</span><span>⌘K opens this from anywhere</span></p>
      </div>
    </div>
  );
}

/** Home's way in (R3, in place of R2's What you can do): the same field, as a press that opens the search, with the
 *  starter questions under it. A starter opens the search with its question typed. */
export function HomeAsk() {
  return (
    <section aria-label={askCopy.home.heading} className="flex flex-col gap-[10px]">
      <h2 className="m-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--fg-muted)]">{askCopy.home.heading}</h2>
      <button type="button" className="flex h-[48px] w-full cursor-text items-center gap-[10px] rounded-[10px] bg-[color:var(--surface-sunken)] px-[14px] text-left text-[15px] text-[color:var(--fg-faint)] [border:1px_solid_var(--border-strong)] min-[1180px]:max-w-[640px]">
        <span className="text-[color:var(--fg-muted)]"><SearchGlyph size={18} /></span>
        <span className="min-w-0 flex-1 truncate">{askCopy.placeholder}</span>
        <kbd aria-hidden className="hidden rounded-[5px] px-[6px] py-[2px] font-mono text-[10.5px] text-[color:var(--fg-faint)] [border:1px_solid_var(--border-strong)] md:inline">⌘K</kbd>
      </button>
      <Starters heading="" pad={false} />
    </section>
  );
}

/** R4: Home's search, for good. First thing under the page head, above the welcome strip: the field (a press that
 *  opens the search) and, under it, the starters in one row that scrolls sideways on a phone. */
export function HomeSearch() {
  return (
    <section aria-label="Search or ask" className="flex flex-col gap-[10px]">
      <button type="button" className="flex h-[48px] w-full cursor-text items-center gap-[10px] rounded-[10px] bg-[color:var(--surface-sunken)] px-[14px] text-left text-[15px] text-[color:var(--fg-faint)] [border:1px_solid_var(--border-strong)] min-[1180px]:max-w-[720px]">
        <span className="text-[color:var(--fg-muted)]"><SearchGlyph size={18} /></span>
        <span className="min-w-0 flex-1 truncate">{askCopy.placeholder}</span>
        <kbd aria-hidden className="hidden rounded-[5px] px-[6px] py-[2px] font-mono text-[10.5px] text-[color:var(--fg-faint)] [border:1px_solid_var(--border-strong)] md:inline">⌘K</kbd>
      </button>
      <ul role="list" aria-label={askCopy.starters.heading} className="-mx-[16px] m-0 flex list-none gap-[8px] overflow-x-auto px-[16px] pb-[2px] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [scrollbar-width:none]">
        {askCopy.starters.questions.map((q) => (
          <li key={q} className="flex-none">
            <button type="button" className="flex min-h-[40px] cursor-pointer items-center whitespace-nowrap rounded-full bg-[color:var(--surface)] px-[13px] text-[13px] text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] md:min-h-[34px]">{q}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** R5: Home's search as its own panel, so it reads as a place to start rather than one more field. The accent edge the
 *  welcome strip uses, a short title and line, the field at 52px, the starters, and (personality, not flash) a small fan
 *  of three of the reader's own cards with the search's lens over it, the card search empty state's graphic in their art. */
export const homeSearchCopy = { title: "Not sure where to go?", line: "Ask a question, or look up any card." };
function Fan({ art, small = false }: { art: string[]; small?: boolean }) {
  const w = small ? 38 : 70, h = small ? 53 : 98;
  const lens = small ? 26 : 46;
  return (
    <div aria-hidden className="relative flex-none" style={{ width: small ? 92 : 168, height: small ? 70 : 128 }}>
      {art.map((a, i) => (
        <img key={a} src={a} alt="" className="absolute rounded-[5px] shadow-[0_8px_18px_rgba(0,0,0,0.5)] [border:1px_solid_rgba(0,0,0,0.4)]"
          style={{ width: w, height: h, left: (small ? 8 : 14) + i * (small ? 20 : 36), top: small ? 6 : 10, transform: `rotate(${(i - 1) * 14}deg)`, zIndex: i === 1 ? 2 : 1, objectFit: "cover" }} />
      ))}
      <span className="absolute z-[3] rounded-full border-[3px] border-solid border-[color:var(--accent)] shadow-[0_8px_18px_rgba(0,0,0,0.45)]"
        style={{ width: lens, height: lens, left: small ? 46 : 92, top: small ? 30 : 58, background: "color-mix(in srgb, var(--bg) 30%, transparent)" }} />
      <span className="absolute z-[3] origin-left rotate-45 rounded-[3px] bg-[color:var(--accent)]" style={{ width: small ? 14 : 24, height: small ? 3 : 5, left: small ? 67 : 129, top: small ? 53 : 99 }} />
    </div>
  );
}
export function HomeSearchPanel({ art, query = "", open = null }: { art: string[]; query?: string; open?: any }) {
  return (
    <section aria-label={homeSearchCopy.title}
      className="relative overflow-visible rounded-[12px] px-[16px] pt-[14px] pb-[14px] md:px-[20px] md:pt-[16px] md:pb-[16px] [border:1px_solid_color-mix(in_srgb,var(--accent)_55%,var(--border))]"
      style={{ background: "linear-gradient(100deg, color-mix(in srgb, var(--accent) 10%, var(--surface)) 0%, var(--surface) 60%)" }}>
      <div className="hidden md:block absolute right-[28px] top-[50%] -translate-y-1/2"><Fan art={art} /></div>
      <div>
        <div className="flex items-start gap-[12px]">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 font-display [text-wrap:balance] text-[19px] font-bold leading-[1.2] text-[color:var(--fg)] md:text-[21px]">{homeSearchCopy.title}</h2>
            <p className="m-0 mt-[3px] text-[13.5px] leading-[1.5] text-[color:var(--fg-muted)]">{homeSearchCopy.line}</p>
          </div>
          <div className="-mt-[4px] -mr-[6px] md:hidden"><Fan art={art} small /></div>
        </div>
        <div>
          <div className="relative mt-[12px] md:max-w-[calc(100%-200px)] min-[1180px]:max-w-[720px]">
            <div className={`flex h-[52px] w-full items-center gap-[10px] rounded-[10px] bg-[color:var(--bg)] px-[14px] text-[15.5px] ${open ? "[border:1px_solid_var(--accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)]" : "[border:1px_solid_var(--border-strong)]"}`}>
              <span className="text-[color:var(--accent)]"><SearchGlyph size={19} stroke={1.9} /></span>
              <span className={`min-w-0 flex-1 truncate ${query ? "text-[color:var(--fg)]" : "text-[color:var(--fg-faint)]"}`}>{query || askCopy.placeholder}</span>
              {query ? <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[color:var(--surface-raised)] text-[12px] text-[color:var(--fg-muted)]">✕</span>
                : <kbd aria-hidden className="hidden rounded-[5px] px-[6px] py-[2px] font-mono text-[10.5px] text-[color:var(--fg-faint)] [border:1px_solid_var(--border-strong)] md:inline">⌘K</kbd>}
            </div>
            {open ? (
              <div className="absolute left-0 right-0 top-[60px] z-30 flex flex-col overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] py-[6px] shadow-[0_22px_50px_rgba(0,0,0,0.6)]">
                <div>{open}</div>
                <p className="m-0 flex items-center justify-between gap-3 border-t border-solid border-[color:var(--border)] px-[14px] pt-[9px] pb-[5px] font-mono text-[11px] text-[color:var(--fg-faint)]"><span>↑ ↓ to move · ↵ to open · esc to close</span><span>⌘K opens this from anywhere</span></p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <ul role="list" aria-label={askCopy.starters.heading} className="relative -mx-[16px] m-0 mt-[12px] md:max-w-[calc(100%-200px)] flex list-none gap-[8px] overflow-x-auto px-[16px] pb-[2px] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [scrollbar-width:none]">
        {askCopy.starters.questions.map((q) => (
          <li key={q} className="flex-none">
            <button type="button" className="flex min-h-[40px] cursor-pointer items-center whitespace-nowrap rounded-full bg-[color:var(--bg)] px-[13px] text-[13px] text-[color:var(--fg)] [border:1px_solid_var(--border-strong)] md:min-h-[34px]">{q}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
