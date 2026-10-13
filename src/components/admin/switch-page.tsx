import Link from "next/link";
import type { Banner, HistoryItem, OverrideItem, Rung, SwitchPage } from "../../lib/admin/switch-page-rule";
import { adminCopy, switchCopy } from "../../lib/copy/admin";
import { KILL } from "../../lib/switches/resolve";
import { AppWideControl, RowControls } from "./override-controls";
import { OverridePicker, ROW } from "./override-picker";
import { PendingReporter } from "../shell/pending-reporter";
import { CheckAccount } from "./check-account";
import { SectionHead } from "./costs-detail";
import { ResolvedDot } from "./switches-list";

// One switch's page (admin STATES F1 to F13; design table, Switch page). Read only (admin plan 8b):
// the App-wide value and each override's On or Off are drawn as text here, and become controls in
// 8c. The head (title, variable, tags, back link, description) is `AdminHead`'s detail mode.

const copy = adminCopy.switch;
const BOX = "overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]";
const FAINT_P = "m-0 text-pretty text-[13px] leading-[1.6]";

const RUNG_INK: Record<Rung["tone"], string> = {
  none: "text-[color:var(--fg-faint)]",
  plain: "text-[color:var(--fg)]",
  mono: "font-mono text-[color:var(--fg)]",
  danger: "font-mono font-semibold text-[color:var(--danger)]",
};

function Ladder({ page }: { page: SwitchPage }) {
  return (
    <div data-testid="switch-ladder" className={BOX}>
      {page.rungs.map((r, i) => (
        <div
          key={r.key}
          data-rung={r.key}
          data-deciding={r.deciding || undefined}
          className={`grid grid-cols-[84px_minmax(0,1fr)] items-baseline gap-x-[10px] gap-y-[4px] px-[14px] py-[11px] md:grid-cols-[120px_minmax(0,1fr)_150px] md:gap-[14px] md:px-[16px] md:py-[12px] ${
            i > 0 ? "border-0 border-t border-solid border-[color:var(--border)]" : ""
          } ${r.deciding ? "bg-[color:var(--surface-raised)]" : ""}`}
        >
          <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${r.deciding ? "text-[color:var(--accent)]" : "text-[color:var(--fg-faint)]"}`}>
            {copy.rungs[r.key]}
          </span>
          <span className={`min-w-0 text-[13.5px] [overflow-wrap:anywhere] ${RUNG_INK[r.tone]}`}>{r.value}</span>
          <span className={`col-start-2 font-mono text-[11px] md:col-start-auto md:text-right ${r.deciding ? "text-[color:var(--fg-body)]" : "text-[color:var(--fg-faint)]"}`}>
            {r.decides}
          </span>
        </div>
      ))}
      <div
        data-testid="switch-result"
        className="flex items-center gap-[9px] border-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[14px] py-[12px] text-[14px] font-medium text-[color:var(--fg)] md:px-[16px]"
      >
        <ResolvedDot state={page.result.state} />
        <span className="min-w-0">{page.result.text}</span>
      </div>
    </div>
  );
}

function BannerBox({ banner }: { banner: Banner }) {
  const danger = banner.kind === "kill";
  return (
    <div
      role="note"
      data-testid={`switch-banner-${banner.kind}`}
      className={`flex items-start gap-[12px] rounded-[12px] border border-solid bg-[color:var(--surface-rail)] px-[14px] py-[12px] md:px-[16px] md:py-[14px] ${
        danger ? "border-[color:var(--danger)]" : "border-[color:var(--warning)]"
      }`}
    >
      <span aria-hidden className={`mt-[6px] h-[8px] w-[8px] flex-none rotate-45 ${danger ? "bg-[color:var(--danger)]" : "bg-[color:var(--warning)]"}`} />
      <div className="flex min-w-0 flex-col gap-[4px]">
        <span className="text-[14px] font-semibold leading-[1.4] text-[color:var(--fg)]">{banner.title}</span>
        <span className="text-pretty text-[13px] leading-[1.55] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">{banner.body}</span>
        {banner.kind === "compound" && (
          <Link href={`/admin/switches/${banner.parent}`} className="mt-[2px] self-start text-[13px] text-[color:var(--accent)]">
            {banner.link}
            <PendingReporter href={`/admin/switches/${banner.parent}`} />
          </Link>
        )}
      </div>
    </div>
  );
}

type Section = { kind: "group" | "user"; page: SwitchPage };

function Override({ item, section }: { item: OverrideItem; section: Section }) {
  const { page, kind } = section;
  return (
    <li data-override={item.key} className={ROW}>
      <div className="flex min-w-0 flex-col gap-[2px] md:flex-1">
        <span className="pr-[48px] text-[14px] font-medium text-[color:var(--fg)] [overflow-wrap:anywhere] md:pr-0">{item.title}</span>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)] [overflow-wrap:anywhere]">{item.sub}</span>
      </div>
      <RowControls
        target={{ switchName: page.name, scope: kind, ...(kind === "group" ? { groupId: item.key } : { targetUserId: item.key }) }}
        title={item.title}
        value={item.value}
        killed={item.refused}
        context={{ switchLabel: switchCopy[page.name].label, scope: kind, groupName: kind === "group" ? item.title : null }}
        announces={kind === "group" && page.row.kind !== "model"}
        note={
          <>
            <span className={`text-[12.5px] leading-[1.45] ${item.note ? "italic" : ""} ${item.refused ? "text-[color:var(--danger)]" : "text-[color:var(--fg-muted)]"}`}>
              {item.note ? copy.note(item.note) : copy.noNote}
            </span>
            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{item.meta}</span>
          </>
        }
      />
    </li>
  );
}

function Overrides({ title, items, empty, section }: { title: string; items: OverrideItem[]; empty: string; section: Section }) {
  const { page, kind } = section;
  const choices =
    kind === "group"
      ? page.groupChoices.map((g) => ({ id: g.id, label: g.name, sub: g.id, search: g.name.toLocaleLowerCase("en-US") }))
      : page.people.map((p) => ({ id: p.id, label: p.label, sub: p.email ?? p.id, search: `${p.label} ${p.email ?? ""}`.toLocaleLowerCase("en-US") }));
  return (
    <>
      <SectionHead title={title} meta={items.length ? String(items.length) : copy.sectionNone} />
      <div className="flex flex-col gap-[8px]">
        {items.length ? (
          <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
            {items.map((it) => (
              <Override key={it.key} item={it} section={section} />
            ))}
          </ul>
        ) : (
          <p className={`${FAINT_P} text-[color:var(--fg-muted)]`}>{empty}</p>
        )}
        {!page.plumbing && (
          <OverridePicker
            kind={kind}
            name={page.name}
            label={switchCopy[page.name].label}
            choices={choices}
            taken={new Set(items.map((i) => i.key))}
            killed={page.row.env === KILL}
            announces={kind === "group" && page.row.kind !== "model"}
          />
        )}
      </div>
    </>
  );
}

export function SwitchPageView({
  page,
  overridesRead,
  clerk,
  account,
}: {
  page: SwitchPage;
  overridesRead: boolean;
  /** "down": the accounts are the stored ids, because Clerk could not be read (STATES A3). */
  clerk: "ok" | "down";
  /** The account `?account=` names, already matched against the universe. */
  account: string | null;
}) {
  // A plumbing switch shows no Groups or Accounts sections (F6), unless a row it ignores exists:
  // then the row is listed as ignored rather than hidden.
  const sections = !page.plumbing || page.groups.length + page.accounts.length > 0;
  return (
    <div className="flex flex-col gap-[12px] px-[16px] pb-[28px] pt-[16px] md:px-[28px] md:pb-[40px] md:pt-[22px]">
      {clerk === "down" && <p className={`${FAINT_P} text-[color:var(--warning)]`}>{adminCopy.accounts.clerkDown}</p>}
      {!overridesRead && <p className={`${FAINT_P} text-[color:var(--warning)]`}>{adminCopy.switches.overridesUnread}</p>}

      <SectionHead title={copy.ladderHead} meta={copy.ladderMeta} />
      {page.banner && <BannerBox banner={page.banner} />}
      <Ladder page={page} />

      <SectionHead title={copy.appHead} meta={page.app.meta} />
      <div data-testid="switch-app" className="flex flex-col gap-[8px]">
        <AppWideControl name={page.name} label={switchCopy[page.name].label} value={page.app.current} killed={page.row.env === KILL} />
        {page.app.note && <span className="text-pretty text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{page.app.note}</span>}
      </div>

      {sections && (
        <>
          <Overrides title={copy.groupsHead} items={page.groups} empty={copy.noGroup} section={{ kind: "group", page }} />
          <Overrides title={copy.accountsHead} items={page.accounts} empty={copy.noAccount} section={{ kind: "user", page }} />
        </>
      )}

      <SectionHead title={copy.check} />
      <CheckAccount explanations={page.explanations} initial={account} />

      <SectionHead title={copy.historyHead} meta={page.historyCut ? copy.historyLatest(page.history.length) : copy.historyCount(page.history.length)} />
      <HistoryList items={page.history} foot={copy.historyFoot} empty={copy.noHistory} testId="switch-history" />
    </div>
  );
}

/**
 * A page's history (design table, Switch page; the group page reuses it): newest first, when in
 * mono at the left from `md` up, the change and its note; the foot says the times are UTC.
 */
export function HistoryList({ items, foot, empty, testId }: { items: readonly HistoryItem[]; foot: string; empty: string; testId: string }) {
  return (
    <div data-testid={testId} className="flex flex-col gap-[10px]">
      {items.length ? (
        <>
          <ol className="m-0 list-none overflow-hidden rounded-[12px] border border-solid border-[color:var(--border)] p-0">
            {items.map((h, i) => (
              <li
                key={i}
                className={`flex flex-col gap-[4px] px-[14px] py-[11px] md:grid md:grid-cols-[130px_minmax(0,1fr)] md:gap-[14px] md:px-[16px] ${
                  i > 0 ? "border-0 border-t border-solid border-[color:var(--border)]" : ""
                }`}
              >
                <span className="font-mono text-[11px] leading-[1.6] text-[color:var(--fg-faint)]">{h.when}</span>
                <div className="flex min-w-0 flex-col gap-[3px]">
                  <span className="text-[13.5px] leading-[1.45] text-[color:var(--fg)] [overflow-wrap:anywhere]">{h.what}</span>
                  {h.note && <span className="text-[12.5px] italic leading-[1.45] text-[color:var(--fg-muted)]">{copy.note(h.note)}</span>}
                </div>
              </li>
            ))}
          </ol>
          <span className="text-[12px] leading-[1.5] text-[color:var(--fg-faint)]">{foot}</span>
        </>
      ) : (
        <p className={`${FAINT_P} text-[color:var(--fg-faint)]`}>{`${empty} ${foot}`}</p>
      )}
    </div>
  );
}
