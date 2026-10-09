import { deckStatsCopy } from "../../lib/copy/deck-stats";

const CARDS = [
  { key: "curve", title: deckStatsCopy.cards.curve },
  { key: "jobs", title: deckStatsCopy.cards.jobs },
  { key: "money", title: deckStatsCopy.cards.money },
  { key: "colors", title: deckStatsCopy.cards.colors },
  { key: "average", title: deckStatsCopy.cards.average },
  { key: "results", title: deckStatsCopy.cards.results },
] as const;

// Left column then right column at 1300 (curve, jobs, money | colors, average,
// results); a single column at 390 in the same order the handoff reads.
const LEFT = CARDS.slice(0, 3);
const RIGHT = CARDS.slice(3);

function Shell({ title, id }: { title: string; id: string }) {
  return (
    <section
      role="figure"
      aria-label={title}
      data-stats-card={id}
      className="flex flex-col gap-[16px] rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[16px]"
    >
      <header className="flex items-baseline border-b border-b-[color:var(--border)] pb-[10px]">
        <h3 className="font-serif text-[15px] text-[color:var(--fg)]">{title}</h3>
      </header>
    </section>
  );
}

export function DeckStatsView() {
  return (
    <div
      data-deck-stats
      className="grid grid-cols-1 gap-[14px] px-[16px] pb-[24px] pt-[14px] md:grid-cols-2 md:items-start md:px-[26px]"
    >
      <div className="flex flex-col gap-[14px]">
        {LEFT.map((c) => (
          <Shell key={c.key} id={c.key} title={c.title} />
        ))}
      </div>
      <div className="flex flex-col gap-[14px]">
        {RIGHT.map((c) => (
          <Shell key={c.key} id={c.key} title={c.title} />
        ))}
      </div>
    </div>
  );
}
