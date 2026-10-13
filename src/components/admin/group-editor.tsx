"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createGroup, saveGroup } from "../../app/admin/groups/actions";
import type { GroupWriteResult } from "../../lib/admin/group-writes";
import {
  DESCRIPTION_MAX,
  GROUP_NAME,
  joinAnd,
  memberState,
  parseCredits,
  pendingSummary,
  ALLOWANCE_MAX,
  ALLOWANCE_MIN,
  type Draft,
  type MemberRow,
  type SavedGroup,
} from "../../lib/admin/groups-rule";
import type { ConfirmPreview } from "../../lib/admin/rise-confirm";
import { adminCopy } from "../../lib/copy/admin";
import { SectionHead } from "./costs-detail";
import { ModelConfirm } from "./model-confirm";
import { SearchField } from "../ui/text-field";

// A group's editor (admin STATES G2 to G4; design table, Groups): the fields, every account in the
// universe as a member row, and the pending bar. It holds the whole desired state and sends it on
// Save; the server diffs it against the database, so two tabs cannot half-apply each other. A save
// that raises model access opens the 8c confirm and re-sends with the confirmed count.

const copy = adminCopy.groups;
const FIELD =
  "h-[44px] w-full min-w-0 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[12px] text-[16px] text-[color:var(--fg)] md:h-[38px] md:text-[13.5px]";
const ERROR = "m-0 text-[12.5px] leading-[1.5] text-[color:var(--danger)]";

type FieldError = { field: "name" | "description" | "credits"; text: string } | null;

/** What a save sends: the whole desired state, and the confirmed count once a confirm is accepted. */
type Sent = { name: string; description: string | null; dailyAllowance: number | null; members: string[]; confirmed?: number };

const draftOf = (saved: SavedGroup | null): Draft => ({
  name: saved?.name ?? "",
  description: saved?.description ?? "",
  credits: saved?.dailyAllowance == null ? "" : String(saved.dailyAllowance),
});
const savedMembers = (rows: readonly MemberRow[], saved: SavedGroup | null) => new Set(saved ? rows.filter((r) => r.saved?.id === saved.id).map((r) => r.id) : []);

/** The field a draft fails on before it is sent, or null. */
function checkDraft(d: Draft): FieldError {
  if (!GROUP_NAME.test(d.name.trim())) return { field: "name", text: copy.errors.nameRule };
  if (d.description.trim().length > DESCRIPTION_MAX) return { field: "description", text: copy.errors.description };
  const c = parseCredits(d.credits);
  if (c !== null && !(Number.isInteger(c) && c >= ALLOWANCE_MIN && c <= ALLOWANCE_MAX)) return { field: "credits", text: copy.errors.allowance };
  return null;
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint: string;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-[6px]">
      <span className="text-[12.5px] text-[color:var(--fg-muted)]">{label}</span>
      {children}
      <span className="text-[12px] leading-[1.5] text-[color:var(--fg-faint)]">{hint}</span>
      {error && (
        <span role="alert" className={ERROR}>
          {error}
        </span>
      )}
    </label>
  );
}

function MemberButton({ row, selected, groupId, onToggle }: { row: MemberRow; selected: boolean; groupId: string | null; onToggle: () => void }) {
  const { sub, state, unsaved } = memberState(row, selected, groupId);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      data-member={row.id}
      onClick={onToggle}
      className={`flex w-full min-h-[60px] items-center gap-[12px] border-0 px-[14px] py-[8px] text-left md:min-h-[52px] md:px-[16px] ${
        selected ? "bg-[color:var(--surface-raised)]" : "bg-transparent"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[6px] border-2 border-solid ${
          selected ? "border-[color:var(--accent)] bg-[color:var(--accent)]" : "border-[color:var(--border-dashed)] bg-transparent"
        }`}
      >
        <span className={`h-[7px] w-[7px] rotate-45 ${selected ? "bg-[color:var(--bg)]" : "bg-transparent"}`} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="flex flex-wrap items-baseline gap-x-[8px]">
          <span className="text-[14px] font-medium text-[color:var(--fg)] [overflow-wrap:anywhere]">{row.name}</span>
          {row.email && row.email !== row.name && (
            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)] [overflow-wrap:anywhere]">{row.email}</span>
          )}
        </span>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)] [word-break:break-all]">{row.id}</span>
        {sub && <span className="text-[12px] text-[color:var(--fg-muted)]">{sub}</span>}
      </span>
      <span
        className={`hidden flex-none whitespace-nowrap font-mono text-[10.5px] md:inline ${
          selected && unsaved ? "text-[color:var(--accent)]" : selected ? "text-[color:var(--fg-body)]" : "text-[color:var(--fg-faint)]"
        }`}
      >
        {state}
      </span>
    </button>
  );
}

function errorText(error: Exclude<GroupWriteResult, { ok: true }>["error"]): string {
  switch (error) {
    case "group":
      return copy.errors.group;
    case "members":
      return copy.errors.members;
    case "accounts":
      return adminCopy.switch.clerkDownRefusal;
    case "failed":
      return adminCopy.switch.saveFailed;
    default:
      return adminCopy.switch.refusal;
  }
}

export function GroupEditor({ saved, rows }: { saved: SavedGroup | null; rows: MemberRow[] }) {
  const router = useRouter();
  const groupId = saved?.id ?? null;
  const [draft, setDraft] = useState<Draft>(() => draftOf(saved));
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => savedMembers(rows, saved));
  const [query, setQuery] = useState("");
  const [inFlight, setInFlight] = useState(false);
  const [fieldError, setFieldError] = useState<FieldError>(null);
  const [failure, setFailure] = useState<string | null>(null);
  // The preview and the exact input it describes: a confirm resends THAT input, never the editor's live
  // state, which can change while the request is out.
  const [confirm, setConfirm] = useState<{ preview: ConfirmPreview; input: Sent } | null>(null);

  const pending = pendingSummary({ saved, draft, rows, selected });
  const unsaved = rows.filter((r) => memberState(r, selected.has(r.id), groupId).unsaved).length;
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("en-US");
    if (!q) return rows;
    return rows.filter((r) => `${r.name} ${r.email ?? ""} ${r.id}`.toLocaleLowerCase("en-US").includes(q));
  }, [rows, query]);

  const edit = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((d) => ({ ...d, [k]: e.target.value }));
    setFieldError(null);
    setFailure(null);
  };
  const toggle = (id: string) => {
    setFailure(null);
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };
  const undo = () => {
    setDraft(draftOf(saved));
    setSelected(savedMembers(rows, saved));
    setFieldError(null);
    setFailure(null);
  };

  function submit() {
    const bad = checkDraft(draft);
    if (bad) {
      setFieldError(bad);
      return;
    }
    return send({
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      dailyAllowance: parseCredits(draft.credits),
      members: rows.filter((r) => selected.has(r.id)).map((r) => r.id),
    });
  }

  async function send(input: Sent) {
    setFailure(null);
    setInFlight(true);
    let result: GroupWriteResult;
    try {
      result = groupId ? await saveGroup(groupId, input) : await createGroup(input);
    } catch {
      // A rejected action (a dropped connection, an expired session) may have committed before the
      // reply was lost, so this is never "nothing changed": refresh to reconcile and say the outcome
      // is unknown, as the settings dialog does.
      setInFlight(false);
      setConfirm(null);
      setFailure(copy.errors.unknown);
      router.refresh();
      return;
    }
    setInFlight(false);
    if (result.ok) {
      setConfirm(null);
      // A save's own revalidation carries the refreshed page back with the reply, and the editor is
      // keyed on what it draws, so only a create needs to go anywhere.
      if (!groupId) router.push(`/admin/groups/${result.id}`);
      return;
    }
    if (result.error === "confirm") {
      setConfirm({ preview: result.preview, input: { ...input, confirmed: undefined } });
      return;
    }
    setConfirm(null);
    if (result.error === "name") setFieldError({ field: "name", text: copy.errors.name });
    else if (result.error === "nameRule") setFieldError({ field: "name", text: copy.errors.nameRule });
    else if (result.error === "description") setFieldError({ field: "description", text: copy.errors.description });
    else if (result.error === "allowance") setFieldError({ field: "credits", text: copy.errors.allowance });
    else setFailure(errorText(result.error));
  }

  const err = (f: NonNullable<FieldError>["field"]) => (fieldError?.field === f ? fieldError.text : null);
  // The name the save commits: a rename in the same save is the group the confirm describes.
  const groupName = (confirm ? confirm.input.name : draft.name.trim()) || saved?.name || copy.thisGroup;
  const capabilities = confirm ? joinAnd(confirm.preview.costs.map((c) => adminCopy.confirmModel.capability[c.key])) : "";

  return (
    <>
      <div data-testid="group-fields" className="grid grid-cols-[minmax(0,1fr)] gap-[14px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Field label={copy.name} hint={copy.nameHint} error={err("name")}>
          <input
            value={draft.name}
            onChange={edit("name")}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={40}
            aria-invalid={err("name") ? true : undefined}
            className={`${FIELD} font-mono`}
          />
        </Field>
        <Field label={copy.description} hint={copy.descriptionHint} error={err("description")}>
          <input value={draft.description} onChange={edit("description")} autoComplete="off" maxLength={DESCRIPTION_MAX} className={FIELD} />
        </Field>
        <Field label={copy.credits} hint={copy.creditsHelp} error={err("credits")}>
          <input
            value={draft.credits}
            onChange={edit("credits")}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            aria-invalid={err("credits") ? true : undefined}
            className={`${FIELD} font-mono`}
          />
        </Field>
      </div>

      <SectionHead title={copy.membersHead} meta={copy.selectedCount(selected.size, unsaved)} />
      <SearchField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery("")}
        placeholder={copy.find}
        aria-label={copy.find}
        autoComplete="off"
        containerClassName="h-[44px] rounded-[9px] px-[12px] py-0 md:h-[38px]"
        className="text-[16px] md:text-[14px]"
      />
      {shown.length ? (
        <div
          data-testid="group-members"
          role="group"
          aria-label={copy.membersHead}
          className="overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]"
        >
          {shown.map((r, i) => (
            <div key={r.id} className={i > 0 ? "border-0 border-t border-solid border-[color:var(--border)]" : ""}>
              <MemberButton row={r} selected={selected.has(r.id)} groupId={groupId} onToggle={() => toggle(r.id)} />
            </div>
          ))}
        </div>
      ) : (
        <p className="m-0 text-[13px] leading-[1.6] text-[color:var(--fg-muted)]">{copy.noMatch}</p>
      )}

      {pending && (
        <div
          data-testid="group-pending"
          className="flex flex-col items-stretch gap-[14px] rounded-[12px] border border-solid border-[color:var(--accent)] bg-[color:var(--surface-raised)] p-[14px] md:flex-row md:items-center md:px-[16px]"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
            <span className="text-[14px] font-semibold text-[color:var(--fg)]">{pending.title}</span>
            {pending.body && <span className="text-pretty text-[13px] leading-[1.55] text-[color:var(--fg-body)]">{pending.body}</span>}
            {failure && (
              <p role="alert" className={ERROR}>
                {failure}
              </p>
            )}
          </div>
          <div className="flex flex-none justify-end gap-[10px]">
            <button
              type="button"
              onClick={undo}
              disabled={inFlight}
              className="h-[46px] flex-1 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[18px] text-[14px] text-[color:var(--fg)] disabled:opacity-60 md:h-[40px] md:flex-none"
            >
              {copy.undo}
            </button>
            <button
              type="button"
              onClick={() => submit()}
              disabled={inFlight}
              className="h-[46px] flex-1 whitespace-nowrap rounded-[10px] bg-[color:var(--fg)] px-[20px] text-[14px] font-semibold text-[color:var(--bg)] disabled:opacity-60 md:h-[40px] md:flex-none md:rounded-[8px]"
            >
              {groupId ? copy.save : copy.create}
            </button>
          </div>
        </div>
      )}

      {confirm && (
        <ModelConfirm
          preview={confirm.preview}
          context={{ switchLabel: capabilities, op: "set", scope: "group", groupName }}
          leadText={copy.confirmLead(groupName)}
          noted={false}
          pending={inFlight}
          onCancel={() => setConfirm(null)}
          onConfirm={() => send({ ...confirm.input, confirmed: confirm.preview.count })}
        />
      )}
    </>
  );
}
