"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { moveAccountToGroup } from "../../app/admin/accounts/actions";
import type { AccountPage } from "../../lib/admin/account-page";
import type { SwitchLine } from "../../lib/admin/account-page-rule";
import type { MoveResult } from "../../lib/admin/group-writes";
import { joinAnd } from "../../lib/admin/groups-rule";
import type { ConfirmPreview } from "../../lib/admin/rise-confirm";
import { adminCopy } from "../../lib/copy/admin";
import { PendingReporter } from "../shell/pending-reporter";
import { Avatar } from "./accounts-list";
import { SectionHead } from "./costs-detail";
import { ModelConfirm } from "./model-confirm";
import { AllFeaturesControl } from "./override-controls";
import { Pill, ResolvedDot } from "./switches-list";

// One account's page (admin STATES A4 to A7; design table, Accounts). The head above the tab strip
// draws only the back link, since it does not read Clerk; this page draws the account's own head block
// with its name as the title. Then the tiles, the group with `Change group` (the one write), the
// switches in three groups, and spend by feature.

const copy = adminCopy.accounts;
const ERROR = "m-0 text-[12.5px] leading-[1.5] text-[color:var(--danger)]";
const CARD = "overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]";
const GROUP_HEAD =
  "m-0 flex items-baseline gap-[10px] bg-[color:var(--surface-sunken)] px-[14px] py-[8px] font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-[color:var(--fg-muted)]";
const ROW_LINE = "border-0 border-solid border-[color:var(--border)] [border-top-width:1px]";

function moveError(error: Exclude<MoveResult, { ok: true }>["error"]): string {
  switch (error) {
    case "group":
      return adminCopy.groups.errors.group;
    case "account":
      return copy.errors.account;
    case "accounts":
      return adminCopy.switch.clerkDownRefusal;
    default:
      return adminCopy.switch.saveFailed;
  }
}

function Tiles({ page }: { page: AccountPage }) {
  return (
    <div data-testid="account-tiles" className="grid grid-cols-2 gap-[8px] md:grid-cols-4 md:gap-[12px]">
      {page.tiles.map((t) => (
        <div
          key={t.key}
          data-tile={t.key}
          className="flex min-w-0 flex-col gap-[4px] rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[12px] py-[11px] md:px-[14px] md:py-[13px]"
        >
          <span className="text-[12px] text-[color:var(--fg-muted)]">{t.label}</span>
          <span className="whitespace-nowrap font-mono text-[19px] font-medium leading-[1.2] text-[color:var(--fg)] md:text-[22px]">{t.figure}</span>
          {t.sub && <span className="font-mono text-[10.5px] leading-[1.4] text-[color:var(--fg-faint)]">{t.sub}</span>}
        </div>
      ))}
    </div>
  );
}

function GroupSection({ page }: { page: AccountPage }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(page.group?.id ?? "");
  const [inFlight, setInFlight] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmPreview | null>(null);
  const targetName = page.groups.find((g) => g.id === target)?.name ?? null;

  async function submit(confirmed?: number) {
    setFailure(null);
    setInFlight(true);
    let result: MoveResult;
    try {
      result = await moveAccountToGroup(page.id, target || null, confirmed);
    } catch {
      // A thrown action is a lost reply, not a refusal: the move may have committed before the reply was
      // lost, so this is never "nothing changed". Refresh to reconcile and say the outcome is unknown, as
      // the group editor does.
      setInFlight(false);
      setConfirm(null);
      setFailure(adminCopy.groups.errors.unknown);
      router.refresh();
      return;
    }
    setInFlight(false);
    if (result.ok) {
      setConfirm(null);
      setOpen(false);
      router.refresh();
      return;
    }
    if (result.error === "confirm") {
      setConfirm(result.preview);
      return;
    }
    setConfirm(null);
    setFailure(moveError(result.error));
  }

  // The confirm names the group the account's overrides change with: the one it joins, else the one it leaves.
  const confirmGroup = targetName ?? page.group?.name ?? "";
  const capabilities = confirm ? joinAnd(confirm.costs.map((c) => adminCopy.confirmModel.capability[c.key])) : "";
  return (
    <>
      <SectionHead title={copy.group} />
      <div data-testid="account-group" className="flex flex-wrap items-center gap-[8px]">
        {page.group ? (
          <Link
            href={`/admin/groups/${page.group.id}`}
            className="inline-flex h-[36px] items-center rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[12px] font-mono text-[12.5px] text-[color:var(--fg)] no-underline md:h-[30px]"
          >
            {page.group.name}
            <PendingReporter href={`/admin/groups/${page.group.id}`} />
          </Link>
        ) : (
          <span className="text-[13px] text-[color:var(--fg-muted)]">{copy.noGroup}</span>
        )}
        {!open && (
          <button
            type="button"
            onClick={() => {
              setTarget(page.group?.id ?? "");
              setFailure(null);
              setOpen(true);
            }}
            className="inline-flex h-[36px] items-center border-0 bg-transparent px-[4px] text-[13px] text-[color:var(--accent)] md:h-[30px]"
          >
            {copy.changeGroup}
          </button>
        )}
      </div>
      {open && (
        <div
          data-testid="account-move"
          className="flex flex-col gap-[14px] rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] px-[14px] py-[12px] md:flex-row md:items-center md:px-[16px]"
        >
          <select
            aria-label={copy.pickGroup}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={inFlight}
            className="h-[44px] w-full rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] text-[16px] text-[color:var(--fg)] md:h-[36px] md:w-[220px] md:text-[13.5px]"
          >
            <option value="">{copy.noGroup}</option>
            {page.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <div className="flex gap-[10px] md:ml-auto">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={inFlight}
              className="h-[46px] flex-1 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[18px] text-[14px] text-[color:var(--fg)] disabled:opacity-60 md:h-[36px] md:flex-none"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              onClick={() => submit()}
              disabled={inFlight || target === (page.group?.id ?? "")}
              className="h-[46px] flex-1 rounded-[10px] bg-[color:var(--fg)] px-[20px] text-[14px] font-semibold text-[color:var(--bg)] disabled:opacity-60 md:h-[36px] md:flex-none md:rounded-[8px]"
            >
              {copy.save}
            </button>
          </div>
        </div>
      )}
      {failure && (
        <p role="alert" className={ERROR}>
          {failure}
        </p>
      )}
      {confirm && (
        <ModelConfirm
          preview={confirm}
          context={{ switchLabel: capabilities, op: "set", scope: "group", groupName: confirmGroup }}
          leadText={adminCopy.groups.confirmLead(confirmGroup)}
          noted={false}
          pending={inFlight}
          onCancel={() => setConfirm(null)}
          onConfirm={() => submit(confirm.count)}
        />
      )}
    </>
  );
}

function SwitchRowLine({ line }: { line: SwitchLine }) {
  return (
    <li
      data-switch={line.name}
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-[10px] gap-y-[3px] px-[14px] py-[11px] md:grid-cols-[minmax(0,1fr)_70px_minmax(0,1.5fr)] md:gap-[14px] md:px-[16px] ${ROW_LINE}`}
    >
      <Link href={`/admin/switches/${line.name}`} className="min-w-0 text-[14px] text-[color:var(--fg)] no-underline [overflow-wrap:anywhere]">
        {line.label}
        <PendingReporter href={`/admin/switches/${line.name}`} />
      </Link>
      <Pill row={{ state: line.on ? "on" : "off" }} />
      <span
        className={`col-span-2 text-pretty text-[13px] leading-[1.45] md:col-span-1 ${line.kill ? "text-[color:var(--danger)]" : "text-[color:var(--fg-muted)]"}`}
      >
        {line.source}
      </span>
    </li>
  );
}

function Switches({ page }: { page: AccountPage }) {
  const s = page.switches;
  const groups: { title: string; lines: SwitchLine[] }[] = [
    { title: copy.switchGroups.override, lines: s.override },
    { title: copy.switchGroups.rule, lines: s.rule },
  ];
  const lists: { key: "on" | "off"; names: string[] }[] = [
    { key: "on", names: s.envOn },
    { key: "off", names: s.envOff },
  ];
  return (
    <>
      <SectionHead title={adminCopy.tabs.switches} meta={String(s.total)} />
      <div data-testid="account-switches" className={CARD}>
        {page.allFeatures !== null && (
          <section data-testid="account-all-features" className="flex flex-col gap-[8px] md:flex-row md:items-center md:justify-between md:gap-[16px]">
            <div className="min-w-0">
              <h3 className={GROUP_HEAD}>
                <span>{copy.allFeatures.title}</span>
              </h3>
              <p className="m-0 text-pretty text-[13px] leading-[1.45] text-[color:var(--fg-muted)]">{copy.allFeatures.body}</p>
            </div>
            <AllFeaturesControl userId={page.id} label={copy.allFeatures.title} value={page.allFeatures} />
          </section>
        )}
        {groups.map((g, i) => (
          <section key={g.title} className={i > 0 || page.allFeatures !== null ? ROW_LINE : undefined}>
            <h3 className={GROUP_HEAD}>
              <span>{g.title}</span>
              <span className="normal-case tracking-normal text-[color:var(--fg-faint)]">{g.lines.length}</span>
            </h3>
            <ul className="m-0 list-none p-0">
              {g.lines.map((l) => (
                <SwitchRowLine key={l.name} line={l} />
              ))}
            </ul>
          </section>
        ))}
        <section className={ROW_LINE}>
          <h3 className={GROUP_HEAD}>
            <span>{copy.switchGroups.env}</span>
            <span className="normal-case tracking-normal text-[color:var(--fg-faint)]">{s.envOn.length + s.envOff.length}</span>
          </h3>
          {lists.map((l) => (
            <div key={l.key} data-env-list={l.key} className={`flex flex-col gap-[4px] px-[14px] py-[11px] md:px-[16px] ${ROW_LINE}`}>
              <span
                className={`inline-flex items-center gap-[7px] text-[13px] font-medium ${l.key === "off" ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]"}`}
              >
                <ResolvedDot state={l.key} />
                {l.key === "on" ? copy.envList.on(l.names.length) : copy.envList.off(l.names.length)}
              </span>
              {l.names.length > 0 && <span className="text-pretty text-[13px] leading-[1.6] text-[color:var(--fg-body)]">{l.names.join(", ")}</span>}
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

const FEATURE_GRID = "md:grid-cols-[minmax(0,1fr)_90px_90px] md:gap-[12px]";

/** One row of Spend by feature, or its `Total` foot (weight 600 on `--surface-rail`). */
function FeatureRow({ feature, name, presses, spent, first, foot = false }: { feature: string; name: string; presses: number; spent: string; first: boolean; foot?: boolean }) {
  const h = copy.featureCols;
  return (
    <li
      data-feature={feature}
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-[10px] gap-y-[2px] px-[14px] py-[11px] md:items-baseline ${FEATURE_GRID} ${first ? "" : ROW_LINE} ${
        foot ? "bg-[color:var(--surface-rail)] font-semibold" : ""
      }`}
    >
      <span className={`min-w-0 text-[14px] text-[color:var(--fg)] md:text-[13.5px] ${foot ? "" : "font-medium"}`}>{name}</span>
      <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)] max-md:col-start-1 max-md:row-start-2 md:text-right md:text-[12.5px] md:text-[color:var(--fg-body)]">
        <span className="md:hidden">{copy.pressesCell(presses)}</span>
        <span className="hidden md:inline">
          <span className="sr-only">{h.presses} </span>
          {presses}
        </span>
      </span>
      <span className="text-right font-mono text-[13px] text-[color:var(--fg)] max-md:col-start-2 max-md:row-start-1 md:text-[12.5px]">
        <span className="sr-only">{h.spent} </span>
        {spent}
      </span>
    </li>
  );
}

function FeatureSpendTable({ page }: { page: AccountPage }) {
  const h = copy.featureCols;
  return (
    <>
      <SectionHead title={copy.spendByFeature} meta={copy.spendMeta(page.month)} />
      {page.features.length === 0 ? (
        <p className="m-0 text-pretty text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">{adminCopy.costs.noPresses(page.month)}</p>
      ) : (
        <div data-testid="account-features" className={CARD}>
          <div aria-hidden className={`hidden bg-[color:var(--surface-rail)] px-[14px] py-[9px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)] md:grid ${FEATURE_GRID}`}>
            <span>{h.feature}</span>
            <span className="text-right">{h.presses}</span>
            <span className="text-right">{h.spent}</span>
          </div>
          <ul className="m-0 list-none border-0 border-solid border-[color:var(--border)] p-0 md:[border-top-width:1px]">
            {page.features.map((f, i) => (
              <FeatureRow key={f.feature} feature={f.feature} name={f.name} presses={f.presses} spent={f.spent} first={i === 0} />
            ))}
            <FeatureRow feature="total" name={copy.total} presses={page.featureTotal.presses} spent={page.featureTotal.spent} first={false} foot />
          </ul>
        </div>
      )}
    </>
  );
}

export function AccountPageView({ page }: { page: AccountPage }) {
  return (
    <div className="flex flex-col gap-[12px] px-[16px] pb-[28px] pt-[16px] md:px-[28px] md:pb-[40px] md:pt-[22px]">
      {page.clerk === "down" && <p className="m-0 text-pretty text-[13px] leading-[1.6] text-[color:var(--warning)]">{copy.clerkDown}</p>}
      {!page.overridesRead && <p className="m-0 text-pretty text-[13px] leading-[1.6] text-[color:var(--warning)]">{adminCopy.switches.overridesUnread}</p>}
      <div data-testid="account-head" className="flex items-center gap-[14px]">
        <Avatar text={page.initials} size="lg" />
        <div className="flex min-w-0 flex-col gap-[3px]">
          <h1 className="m-0 font-display text-[23px] font-normal leading-[1.2] text-[color:var(--fg)] [overflow-wrap:anywhere] md:text-[28px]">{page.name}</h1>
          {page.email && <span className="font-mono text-[11.5px] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">{page.email}</span>}
          <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)] [word-break:break-all]">{page.id}</span>
          <span className="text-pretty text-[12.5px] text-[color:var(--fg-body)]">{page.role}</span>
        </div>
      </div>
      <Tiles page={page} />
      {/* Keyed on the saved group, so a refresh after a move starts the picker from where the account now is. */}
      <GroupSection key={page.group?.id ?? ""} page={page} />
      <Switches page={page} />
      <FeatureSpendTable page={page} />
    </div>
  );
}
