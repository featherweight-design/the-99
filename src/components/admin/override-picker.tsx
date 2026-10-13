"use client";

import { useEffect, useRef, useState } from "react";
import { adminCopy } from "../../lib/copy/admin";
import { SearchField } from "../ui/text-field";
import type { ConfirmContext } from "./model-confirm";
import { RowControls } from "./override-controls";

// Add a group or an account override (admin STATES F7, F8). The button opens an inline lookup; a
// pick adds a pending row with On and Off unset and a note field, and nothing is written until On or
// Off is pressed. A target that already has a row reads `already set` and cannot be picked.

const copy = adminCopy.switch;
const MAX_RESULTS = 7;
export const ROW =
  "relative flex flex-col gap-[10px] rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[14px] py-[12px] md:flex-row md:items-center md:gap-[16px] md:px-[16px]";

type Choice = { id: string; label: string; sub: string; search: string };

export function OverridePicker({
  kind,
  name,
  label,
  choices,
  taken,
  killed,
  announces,
}: {
  kind: "group" | "user";
  name: string;
  label: string;
  choices: readonly Choice[];
  taken: ReadonlySet<string>;
  killed: boolean;
  announces: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Choice | null>(null);
  // F12 for a group added and turned on at once: the saved row is drawn by the list, so the line is here.
  const [announced, setAnnounced] = useState(false);
  // A saved or cancelled pending row hands focus back to the Add button it came from.
  const addRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  useEffect(() => {
    if (refocus.current && !picked) {
      refocus.current = false;
      addRef.current?.focus();
    }
  }, [picked]);
  const q = query.trim().toLocaleLowerCase("en-US");
  const found = choices.filter((c) => q === "" || c.search.includes(q) || c.id.toLocaleLowerCase("en-US").startsWith(q)).slice(0, MAX_RESULTS);
  const context: Omit<ConfirmContext, "op"> = { switchLabel: label, scope: kind, groupName: kind === "group" ? (picked?.label ?? null) : null };

  if (picked) {
    return (
      <div data-testid="pending-override" className={ROW}>
        <div className="flex min-w-0 flex-col gap-[2px] md:flex-1">
          <span className="pr-[56px] text-[14px] font-medium text-[color:var(--fg)] [overflow-wrap:anywhere] md:pr-0">{picked.label}</span>
          <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)] [overflow-wrap:anywhere]">{picked.sub}</span>
        </div>
        <RowControls
          target={{ switchName: name, scope: kind, ...(kind === "group" ? { groupId: picked.id } : { targetUserId: picked.id }) }}
          title={picked.label}
          value={null}
          killed={killed}
          context={context}
          onSaved={(value) => {
            setAnnounced(announces && value === "on");
            setPicked(null);
            setOpen(false);
            setQuery("");
            refocus.current = true;
          }}
          onCleared={() => {
            setPicked(null);
            setOpen(false);
            refocus.current = true;
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {announced && <span className="text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]">{copy.whatsNewInline}</span>}
      <button
        ref={addRef}
        type="button"
        data-add-override={kind}
        aria-expanded={open}
        disabled={killed}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-[44px] items-center justify-center self-stretch whitespace-nowrap rounded-[8px] border border-dashed border-[color:var(--border-dashed)] bg-transparent px-[14px] text-[13.5px] text-[color:var(--fg)] disabled:text-[color:var(--fg-disabled)] md:h-[34px] md:self-start"
      >
        {kind === "group" ? copy.addGroup : copy.addAccount}
      </button>
      {open && (
        <div className="flex flex-col gap-[6px]">
          {/* Accounts always search; groups once there are more than a lookup shows. */}
          {(kind === "user" || choices.length > MAX_RESULTS) && (
            <SearchField
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery("")}
              placeholder={kind === "user" ? copy.accountSearch : copy.groupSearch}
              aria-label={kind === "user" ? copy.accountSearch : copy.groupSearch}
              containerClassName="h-[44px] rounded-[9px] px-[12px] py-0 md:h-[38px]"
              className="text-[16px] md:text-[14px]"
            />
          )}
          {choices.length === 0 && kind === "group" ? (
            <p className="m-0 text-[13px] text-[color:var(--fg-muted)]">{copy.groupsNone}</p>
          ) : found.length === 0 ? (
            <p className="m-0 text-[13px] text-[color:var(--fg-muted)]">{kind === "user" ? copy.accountNoMatch : copy.groupNoMatch}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[10px] border border-solid border-[color:var(--border)] p-0">
              {found.map((c, i) => {
                const already = taken.has(c.id);
                return (
                  <li key={c.id} className={i > 0 ? "border-0 border-t border-solid border-[color:var(--border)]" : ""}>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => setPicked(c)}
                      className="flex min-h-[44px] w-full items-center gap-[10px] border-0 bg-transparent px-[12px] py-[8px] text-left disabled:cursor-default"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={`text-[13.5px] [overflow-wrap:anywhere] ${already ? "text-[color:var(--fg-disabled)]" : "text-[color:var(--fg)]"}`}>{c.label}</span>
                        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)] [overflow-wrap:anywhere]">{c.sub}</span>
                      </span>
                      {already && <span className="flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.already}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
