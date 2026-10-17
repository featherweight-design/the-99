"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { revokeInvite } from "../../app/admin/invites/actions";
import type { Account } from "../../lib/admin/accounts";
import { childRails, filterTree, nodeMeta, treeDepth, type RailCell, type TreeNode, type TreeRow } from "../../lib/admin/invite-tree-rule";
import { adminCopy } from "../../lib/copy/admin";
import { PendingReporter } from "../shell/pending-reporter";
import { SearchField } from "../ui/text-field";

// The Invites tab (plan `2026-10-16-invites.md`, PR 6b; handoff Admin-Desktop and Admin-Phone M4): who invited whom.
// The tree is nested lists (an always-open hierarchy of ordinary links and buttons, which a screen reader announces
// by level; no composite widget to steer with arrow keys). Each row draws its nesting with rail cells, one per level, whose lines are
// pseudo-elements (18px a level on the phone, 26px from `md`). On the phone a whole account row opens the account;
// from `md` only its `Open ›` does.

const inv = adminCopy.invites;
const tree = inv.tree;

const LINE = "before:absolute before:content-[''] before:left-[8px] md:before:left-[12px]";
const CELL: Record<RailCell, string> = {
  v: `${LINE} before:top-0 before:-bottom-px before:[border-left:1px_solid_var(--border-dashed)]`,
  blank: "",
  tv: `${LINE} before:top-0 before:-bottom-px before:[border-left:1px_solid_var(--border-dashed)] after:absolute after:content-[''] after:top-1/2 after:left-[8px] after:w-[9px] after:[border-top:1px_solid_var(--border-dashed)] md:after:left-[12px] md:after:w-[12px]`,
  t: `${LINE} before:top-0 before:h-1/2 before:w-[9px] before:[border-left:1px_solid_var(--border-dashed)] before:[border-bottom:1px_solid_var(--border-dashed)] before:rounded-bl-[5px] md:before:w-[12px] md:before:rounded-bl-[6px]`,
};

const ROW = "relative flex min-h-[52px] items-center gap-[8px] border-0 border-t-0 border-solid [border-bottom:1px_solid_var(--border)] text-[13.5px] text-[color:var(--fg-body)] md:h-[46px] md:min-h-0 md:gap-[10px]";
const FACE = "flex h-[26px] w-[26px] flex-none items-center justify-center overflow-hidden rounded-[7px] md:h-[28px] md:w-[28px]";
const SMALL = "font-mono text-[10.5px] text-[color:var(--fg-faint)] md:text-[11px]";
const TEXT_BUTTON = "inline-flex min-h-[44px] items-center border-0 bg-transparent px-[4px] text-[13px] font-medium text-[color:var(--accent)] no-underline disabled:opacity-60 md:min-h-[32px]";

function Rails({ cells }: { cells: readonly RailCell[] }) {
  if (cells.length === 0) return null;
  return (
    <span aria-hidden className="flex flex-none self-stretch">
      {cells.map((c, i) => (
        <span key={i} data-rail={c} className={`relative w-[18px] flex-none md:w-[26px] ${CELL[c]}`} />
      ))}
    </span>
  );
}

function AccountRow({ row }: { row: Extract<TreeRow, { kind: "account" }> }) {
  const href = `/admin/accounts/${encodeURIComponent(row.id)}`;
  const meta = nodeMeta(row.left, row.invited);
  const phoneMeta = [row.owner ? tree.owner : null, row.joined, meta].filter(Boolean).join(" · ");
  return (
    <div data-node={row.id} className={ROW}>
      <Rails cells={row.cells} />
      <span aria-hidden className={`${FACE} border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] font-mono text-[11px] text-[color:var(--fg-muted)]`}>
        {row.initials}
      </span>
      <span className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center md:gap-[10px]">
        <b className="font-medium text-[color:var(--fg)] [overflow-wrap:anywhere]">{row.name}</b>
        {row.owner && (
          <span className="hidden flex-none rounded-full border border-solid border-[color:var(--border-strong)] px-[7px] py-[2px] font-mono text-[10px] tracking-[0.08em] text-[color:var(--fg-muted)] md:inline">
            {tree.owner}
          </span>
        )}
        {row.joined && <small className={`hidden md:inline ${SMALL}`}>{tree.joined(row.joined)}</small>}
        <small className={`md:hidden ${SMALL}`}>{phoneMeta}</small>
      </span>
      <span className="ml-auto hidden flex-none items-center gap-[16px] md:flex">
        <small className={SMALL}>{meta}</small>
        <Link href={href} className={TEXT_BUTTON}>
          {inv.open}
          <PendingReporter href={href} />
        </Link>
      </span>
      {/* The phone's press: the whole row, named by the account, with the chevron as its mark. */}
      <Link href={href} aria-label={tree.openAccount(row.name)} className="absolute inset-0 md:hidden">
        <PendingReporter href={href} />
      </Link>
      <span aria-hidden className="ml-auto flex-none pr-[2px] text-[18px] text-[color:var(--fg-muted)] md:hidden">
        ›
      </span>
    </div>
  );
}

function DeletedRow({ row }: { row: Extract<TreeRow, { kind: "deleted" }> }) {
  return (
    <div data-node="deleted" className={ROW}>
      <Rails cells={row.cells} />
      <span aria-hidden className={`${FACE} border border-solid border-[color:var(--border-strong)]`} />
      <span className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center md:gap-[10px]">
        <span className="text-[color:var(--fg-muted)]">{inv.deleted}</span>
        {row.joined && <small className={SMALL}>{tree.joined(row.joined)}</small>}
      </span>
    </div>
  );
}

function WaitingRow({ row, onRevoke, busy }: { row: Extract<TreeRow, { kind: "waiting" }>; onRevoke: (id: string) => void; busy: boolean }) {
  const revoke = (
    <button type="button" onClick={() => onRevoke(row.id)} disabled={busy} className={TEXT_BUTTON}>
      {inv.revoke}
    </button>
  );
  return (
    <div data-waiting={row.id} className={`${ROW} md:text-[color:var(--fg-muted)]`}>
      <Rails cells={row.cells} />
      <span aria-hidden className={`${FACE} border-[1.5px] border-dashed border-[color:var(--border-dashed)]`} />
      <span className="flex min-w-0 flex-1 flex-col md:hidden">
        <span>{tree.waitingHow(row.how)}</span>
        {/* A long address gives way; the return date never does. */}
        <small className={`flex min-w-0 ${SMALL}`}>
          <span className="min-w-0 truncate">{row.email}</span>
          <span className="flex-none whitespace-pre"> · {tree.returns(row.returns)}</span>
        </small>
      </span>
      <span className="hidden min-w-0 flex-1 [overflow-wrap:anywhere] md:inline">{inv.waiting(row.how, row.email)}</span>
      <span className="ml-auto flex flex-none items-center gap-[16px]">
        <small className={`hidden md:inline ${SMALL}`}>{tree.returns(row.returns)}</small>
        {revoke}
      </span>
    </div>
  );
}

/** One level of the tree, as a list: each node's row, then its own list beneath it. */
function Branch({ nodes, parent, onRevoke, busy, label, style }: {
  nodes: readonly TreeNode[];
  /** The parent's rail cells, or null for the roots. */
  parent: readonly RailCell[] | null;
  onRevoke: (id: string) => void;
  busy: boolean;
  label?: string;
  style?: CSSProperties;
}) {
  const root = parent === null;
  return (
    <ul
      role="list"
      aria-label={label}
      data-testid={root ? "invite-tree" : undefined}
      style={style}
      className={`m-0 list-none p-0 ${root ? "min-w-[calc(var(--tree-depth)*18px+220px)] md:min-w-[calc(var(--tree-depth)*26px+360px)]" : ""}`}
    >
      {nodes.map((n, i) => {
        const cells = root ? [] : childRails(parent, i, nodes.length);
        if (n.kind === "waiting") {
          return (
            <li key={n.id}>
              <WaitingRow row={{ ...n, cells }} onRevoke={onRevoke} busy={busy} />
            </li>
          );
        }
        const { children, ...rest } = n;
        return (
          <li key={n.kind === "account" ? n.id : n.key}>
            {rest.kind === "account" ? <AccountRow row={{ ...rest, cells }} /> : <DeletedRow row={{ ...rest, cells }} />}
            {children.length > 0 && <Branch nodes={children} parent={cells} onRevoke={onRevoke} busy={busy} />}
          </li>
        );
      })}
    </ul>
  );
}

export function InviteTreeView({
  roots,
  accounts,
  invited,
  waiting,
  searchable,
  clerk,
}: {
  roots: TreeNode[];
  accounts: number;
  invited: number;
  waiting: number;
  searchable: Account[];
  clerk: "ok" | "down";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const byId = useMemo(() => new Map(searchable.map((a) => [a.id, a])), [searchable]);
  const shown = useMemo(() => filterTree(roots, query, byId), [roots, query, byId]);

  async function revoke(id: string) {
    setFailure(null);
    setRevoking(id);
    try {
      await revokeInvite(id);
    } catch {
      setFailure(adminCopy.groups.errors.unknown);
    }
    setRevoking(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col px-[16px] pb-[16px] pt-[16px] md:px-[28px] md:pb-[22px] md:pt-[22px]">
      {clerk === "down" && <p className="m-0 mb-[12px] text-[13px] leading-[1.6] text-[color:var(--warning)]">{adminCopy.accounts.clerkDown}</p>}
      <div className="mb-[14px] hidden items-center gap-[12px] md:flex">
        <SearchField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder={tree.search}
          aria-label={tree.search}
          containerClassName="h-[36px] w-[360px] rounded-[7px] px-[12px] py-0"
          // 13px as drawn, but 16px on a touch screen (an iPad passes `md`), where iOS zooms a smaller field.
          className="text-[16px] [@media(pointer:fine)]:text-[13px]"
        />
        <span data-testid="invite-tree-counts" className="ml-auto flex gap-[8px]">
          {[tree.accounts(accounts), tree.invited(invited), tree.waiting(waiting)].map((t) => (
            <span key={t} className="flex h-[28px] items-center rounded-full border border-solid border-[color:var(--border-strong)] px-[10px] font-mono text-[11px] text-[color:var(--fg-body)]">
              {t}
            </span>
          ))}
        </span>
      </div>
      {/* The search field is desktop only; a search made there and carried below `md` (a resize, a rotation) says so
          on the phone and can be cleared, so the tree is never left cut with no way back. */}
      {query.trim() && shown.length > 0 && (
        <p data-testid="invite-tree-filtered" className="m-0 mb-[10px] flex flex-wrap items-center gap-x-[10px] text-[13px] text-[color:var(--fg-muted)] [overflow-wrap:anywhere] md:hidden">
          {tree.filtered(query.trim())}
          <button type="button" onClick={() => setQuery("")} className={TEXT_BUTTON}>
            {tree.clear}
          </button>
        </p>
      )}
      {roots.length === 0 ? (
        <p className="m-0 text-[13px] text-[color:var(--fg-muted)]">{tree.empty}</p>
      ) : shown.length === 0 ? (
        <p className="m-0 flex flex-wrap items-center gap-x-[10px] text-[13px] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">
          {tree.noMatch(query.trim())}
          <button type="button" onClick={() => setQuery("")} className={TEXT_BUTTON}>
            {tree.clear}
          </button>
        </p>
      ) : (
        <>
          <p className="m-0 pb-[8px] pt-[2px] font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)] [border-bottom:1px_solid_var(--border-strong)] md:pt-[4px] md:text-[10.5px]">
            <span className="md:hidden">{tree.rootPhone}</span>
            <span className="hidden md:inline">{tree.root}</span>
          </p>
          {/* A deep branch would squeeze the names to nothing, so the tree keeps room for a name past its deepest
              rails and scrolls sideways in its own box rather than overflowing the page. */}
          <div className="overflow-x-auto">
            <Branch
              nodes={shown}
              parent={null}
              onRevoke={revoke}
              busy={revoking !== null}
              label={tree.label}
              style={{ "--tree-depth": treeDepth(shown) } as CSSProperties}
            />
          </div>
        </>
      )}
      {failure && (
        <p role="alert" className="m-0 mt-[10px] text-[12.5px] leading-[1.5] text-[color:var(--danger)]">
          {failure}
        </p>
      )}
    </div>
  );
}
