// Finding the tools R10 (account 1, 2026-11-23): What's new's Show all as a sheet. The rail (desktop) and the column (phone)
// keep five rows; Show all N opens every item in a right-hand sheet from md, full screen on a phone.
import { FeedItemRow } from "../src/components/feed/feed-item";
import { CardDetailProvider } from "../src/components/cards/card-detail-provider";
export const feedSheetCopy = {
  title: "What’s new",
  count: (n: number, fresh: number) => (fresh > 0 ? `${n} · ${fresh} new` : `${n}`),
  all: "All",
  kinds: { "price-drop": "Price drops", combo: "Combos", "new-set": "New sets", "trade-match": "Trade matches" } as Record<string, string>,
  choose: "Choose notifications",
  archive: "Past announcements",
  clear: "Clear all",
  close: "Close What’s new",
};
const DAY = "m-0 px-[14px] pt-[12px] pb-[2px] font-mono text-[9.5px] font-medium tracking-[.14em] text-[color:var(--fg-locked)] uppercase md:px-[18px]";
const ROWS = "m-0 list-none p-0 [&>li+li]:[border-top:1px_solid_var(--border)]";
export function FeedSheet({ items, now, fresh, kind = "all", desk }: { items: any[]; now: string; fresh: number; kind?: string; desk: boolean }) {
  const counts: Record<string, number> = {};
  items.forEach((i) => (counts[i.kind] = (counts[i.kind] ?? 0) + 1));
  const shown = kind === "all" ? items : items.filter((i) => i.kind === kind);
  const nowMs = Date.parse(now);
  const groups: [string, any[]][] = [
    ["Today", shown.filter((i) => nowMs - Date.parse(i.at) < 864e5)],
    ["This week", shown.filter((i) => nowMs - Date.parse(i.at) >= 864e5 && nowMs - Date.parse(i.at) < 7 * 864e5)],
    ["Earlier", shown.filter((i) => nowMs - Date.parse(i.at) >= 7 * 864e5)],
  ];
  const chip = (id: string, label: string, n: number) => (
    <li key={id} className="flex-none">
      <button type="button" aria-pressed={kind === id} className={`flex min-h-[36px] items-center gap-[6px] whitespace-nowrap rounded-full px-[12px] text-[13px] ${kind === id ? "bg-[color:var(--fg)] text-[color:var(--bg)] font-medium" : "bg-[color:var(--surface)] text-[color:var(--fg)] [border:1px_solid_var(--border-strong)]"}`}>
        {label}<span className={`font-mono text-[10.5px] ${kind === id ? "opacity-70" : "text-[color:var(--fg-faint)]"}`}>{n}</span>
      </button>
    </li>
  );
  return (
    <CardDetailProvider>
    <div className="fixed inset-0 z-50 flex justify-end">
      {desk ? <div aria-hidden className="absolute inset-0 bg-[rgba(0,0,0,0.55)]" /> : null}
      <section role="dialog" aria-modal="true" aria-labelledby="feed-sheet-title" data-feed-sheet
        className={`relative flex h-full flex-col bg-[color:var(--bg)] ${desk ? "w-[460px] [border-left:1px_solid_var(--border-strong)] shadow-[-24px_0_60px_rgba(0,0,0,0.5)]" : "w-full"}`}>
        <header className="flex flex-none flex-col gap-[12px] px-[16px] pt-[14px] pb-[12px] [border-bottom:1px_solid_var(--border)] md:px-[20px] md:pt-[18px]">
          <div className="flex items-center gap-[10px]">
            <i aria-hidden className="h-[7px] w-[7px] flex-none rotate-45 bg-[color:var(--accent)] opacity-85" />
            <h2 id="feed-sheet-title" className="m-0 font-display text-[20px] font-bold text-[color:var(--fg)]">{feedSheetCopy.title}</h2>
            <span className="font-mono text-[10.5px] tracking-[.14em] text-[color:var(--accent-text)]">{feedSheetCopy.count(items.length, fresh)}</span>
            <button type="button" aria-label={feedSheetCopy.close} className="ml-auto -mr-[8px] flex h-[44px] w-[44px] items-center justify-center rounded-[8px] border-0 bg-transparent text-[15px] text-[color:var(--fg-muted)] md:h-[36px] md:w-[36px]">✕</button>
          </div>
          <ul role="list" aria-label="Show" className="-mx-[16px] m-0 flex list-none gap-[8px] overflow-x-auto px-[16px] [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            {chip("all", feedSheetCopy.all, items.length)}
            {Object.keys(feedSheetCopy.kinds).filter((k) => counts[k]).map((k) => chip(k, feedSheetCopy.kinds[k], counts[k]))}
          </ul>
        </header>
        <div data-sheet-rows className="min-h-0 flex-1 overflow-y-auto">
          {groups.filter(([, g]) => g.length > 0).map(([label, g], gi) => (
            <div key={label} className={gi > 0 ? "[border-top:1px_solid_var(--border)]" : ""}>
              <p className={DAY}>{label}</p>
              <ul className={ROWS}>{g.map((i) => <FeedItemRow key={i.key} item={i} now={now} onDismiss={() => {}} />)}</ul>
            </div>
          ))}
        </div>
        <footer className="flex flex-none items-center gap-[6px] px-[10px] py-[6px] [border-top:1px_solid_var(--border)] md:px-[14px]">
          <a className="flex min-h-[44px] items-center gap-[5px] px-[6px] text-[13px] font-medium text-[color:var(--fg-muted)] no-underline md:min-h-[36px]">{feedSheetCopy.archive}<i aria-hidden className="not-italic text-[color:var(--fg-faint)]">›</i></a>
          <a className="flex min-h-[44px] items-center gap-[5px] px-[6px] text-[13px] font-medium text-[color:var(--fg-muted)] no-underline md:min-h-[36px]">{feedSheetCopy.choose}<i aria-hidden className="not-italic text-[color:var(--fg-faint)]">›</i></a>
          <button type="button" className="ml-auto flex min-h-[44px] items-center border-0 bg-transparent px-[10px] text-[13px] font-medium text-[color:var(--fg-muted)] md:min-h-[36px]">{feedSheetCopy.clear}</button>
        </footer>
      </section>
    </div>
    </CardDetailProvider>
  );
}
