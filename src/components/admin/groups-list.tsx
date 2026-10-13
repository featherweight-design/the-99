import Link from "next/link";
import type { GroupCard } from "../../lib/admin/groups-rule";
import { adminCopy } from "../../lib/copy/admin";
import { PendingReporter } from "../shell/pending-reporter";
import { SectionHead } from "./costs-detail";
import { ResolvedDot } from "./switches-list";

// The Groups list (admin STATES G1, G5; design table, Groups): one card per group, one column on a
// phone and two from `md` up. No disagreement banner (R2: one group per account).

const copy = adminCopy.groups;
const LINK = "text-[13px] text-[color:var(--accent)]";

export function NewGroupLink() {
  return (
    <Link href="/admin/groups/new" className={`${LINK} ml-auto inline-flex min-h-[32px] items-center`}>
      {copy.newGroup}
      <PendingReporter href="/admin/groups/new" />
    </Link>
  );
}

/** One override a group carries, as a chip: its dot, the switch and its value (design table, override chip). */
export function OverrideChip({ label, value }: { label: string; value: "on" | "off" }) {
  return (
    <span className="inline-flex h-[26px] items-center gap-[6px] rounded-[6px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] px-[9px] text-[12px] text-[color:var(--fg-body)]">
      <ResolvedDot state={value} />
      {`${label}: ${value}`}
    </span>
  );
}

function Card({ card }: { card: GroupCard }) {
  const href = `/admin/groups/${card.id}`;
  return (
    <li
      data-group={card.name}
      className="flex min-w-0 flex-col gap-[6px] rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[14px] py-[13px] md:px-[16px] md:py-[14px]"
    >
      <div className="flex items-baseline gap-[10px]">
        <span className="min-w-0 font-mono text-[15px] font-medium text-[color:var(--fg)] [overflow-wrap:anywhere]">{card.name}</span>
        <span className="flex-none font-mono text-[11px] text-[color:var(--fg-faint)]">{card.count}</span>
        <Link href={href} aria-label={`${copy.edit} ${card.name}`} className={`${LINK} ml-auto flex-none`}>
          {copy.edit}
          <PendingReporter href={href} />
        </Link>
      </div>
      {card.description && <span className="text-[13px] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">{card.description}</span>}
      <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">{card.members}</span>
      {card.overrides.length > 0 && (
        <div className="mt-[2px] flex flex-wrap gap-[6px]">
          {card.overrides.map((o) => (
            <OverrideChip key={o.name} label={o.label} value={o.value} />
          ))}
        </div>
      )}
    </li>
  );
}

export function GroupsList({ cards, count, meta, clerk }: { cards: GroupCard[]; count: string; meta: string; clerk: "ok" | "down" }) {
  return (
    <div className="flex flex-col gap-[12px] px-[16px] pb-[28px] pt-[16px] md:px-[28px] md:pb-[40px] md:pt-[22px]">
      {clerk === "down" && <p className="m-0 text-pretty text-[13px] leading-[1.6] text-[color:var(--warning)]">{adminCopy.accounts.clerkDown}</p>}
      <div className="flex items-end gap-[10px]">
        <SectionHead title={count} meta={meta} />
        <NewGroupLink />
      </div>
      {cards.length ? (
        <ul data-testid="group-cards" className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-[12px] p-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {cards.map((c) => (
            <Card key={c.id} card={c} />
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[13px] leading-[1.6] text-[color:var(--fg-muted)]">{copy.none}</p>
      )}
    </div>
  );
}
