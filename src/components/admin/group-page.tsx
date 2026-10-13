import Link from "next/link";
import type { GroupPage } from "../../lib/admin/groups";
import { adminCopy } from "../../lib/copy/admin";
import { PendingReporter } from "../shell/pending-reporter";
import { SectionHead } from "./costs-detail";
import { GroupEditor } from "./group-editor";
import { HistoryList } from "./switch-page";
import { ResolvedDot } from "./switches-list";

// One group's page (admin STATES G2 to G4; design table, Groups), or the new-group page (G3): the
// editor, then the overrides the group carries and its history. The head (name, description, back
// link) is `AdminHead`'s detail mode.

const copy = adminCopy.groups;
const FAINT_P = "m-0 text-pretty text-[13px] leading-[1.6]";

export function GroupPageView({ page }: { page: GroupPage }) {
  const { saved } = page;
  // Remounted on every saved state, so a refresh after a save starts the editor from what was saved.
  const key = JSON.stringify([saved, page.rows.map((r) => r.saved?.id ?? null)]);
  return (
    <div className="flex flex-col gap-[12px] px-[16px] pb-[28px] pt-[16px] md:px-[28px] md:pb-[40px] md:pt-[22px]">
      {page.clerk === "down" && <p className={`${FAINT_P} text-[color:var(--warning)]`}>{adminCopy.accounts.clerkDown}</p>}
      <GroupEditor key={key} saved={saved} rows={page.rows} />

      {saved && (
        <>
          <SectionHead title={copy.carries} meta={page.overrides.length ? String(page.overrides.length) : adminCopy.switch.sectionNone} />
          {page.overrides.length ? (
            <ul data-testid="group-overrides" className="m-0 list-none overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-0">
              {page.overrides.map((o, i) => {
                const href = `/admin/switches/${o.name}`;
                return (
                  <li
                    key={o.name}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-[10px] gap-y-[3px] px-[14px] py-[11px] md:grid-cols-[minmax(0,1fr)_70px_minmax(0,1.5fr)] md:gap-[14px] md:px-[16px] ${
                      i > 0 ? "border-0 border-t border-solid border-[color:var(--border)]" : ""
                    }`}
                  >
                    <span className="min-w-0 text-[14px] text-[color:var(--fg)] [overflow-wrap:anywhere]">{o.label}</span>
                    <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-[13px] font-medium text-[color:var(--fg)]">
                      <ResolvedDot state={o.value} />
                      {o.value === "on" ? adminCopy.switches.app.on : adminCopy.switches.app.off}
                    </span>
                    <Link href={href} className="col-span-2 text-[13px] text-[color:var(--accent)] md:col-span-1">
                      {copy.openSwitch}
                      <PendingReporter href={href} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={`${FAINT_P} text-[color:var(--fg-muted)]`}>{copy.carriesNone}</p>
          )}

          <SectionHead
            title={copy.historyHead}
            meta={page.historyCut ? adminCopy.switch.historyLatest(page.history.length) : adminCopy.switch.historyCount(page.history.length)}
          />
          <HistoryList items={page.history} foot={copy.historyFoot} empty={copy.noHistory} testId="group-history" />
        </>
      )}
    </div>
  );
}
