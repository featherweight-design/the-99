"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HowMethod } from "../../lib/copy/about";
import type { HowRowCopy, HowRowLabels } from "../../lib/copy/how-it-works";
import { MethodTags } from "../ui/method-tag";

type SubRow = { label: string; methods: readonly HowMethod[]; lines: string[] };

/**
 * The appendix's eight rows. Any number can be open at once, and nothing is kept past the visit.
 *
 * A hash naming a row OPENS it and then scrolls to it, because the browser's own jump lands
 * before hydration, on the closed row, and a row near the foot of the page cannot reach the top
 * until its body is there to scroll past. The wash and the focus are `JumpMark`'s, which finds
 * the row's `data-entry-title` line like any entry's; the page mounts it while this section is on.
 */
// The labels arrive as a prop rather than an import: the copy module builds every row from the
// scoring and cadence constants, and none of that belongs in the browser's bundle.
export function HowRows({
  rows,
  subRows,
  labels,
}: {
  rows: readonly HowRowCopy[];
  subRows: SubRow[];
  labels: HowRowLabels;
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const pendingScroll = useRef<string | null>(null);
  const ids = rows.map((r) => r.id).join(" ");

  useEffect(() => {
    const known = new Set(ids.split(" "));
    const land = () => {
      // A hand-typed hash can carry a broken escape; that is no row.
      let id = "";
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      if (!known.has(id)) return;
      // Already open (Back to a row still open, say): no render follows, so scroll now. A pending
      // id left for the layout effect would fire on the next press of ANY row.
      if (document.getElementById(`${id}-body`)) {
        document.getElementById(id)?.scrollIntoView({ block: "start" });
        return;
      }
      pendingScroll.current = id;
      setOpen((s) => new Set(s).add(id));
    };
    land();
    window.addEventListener("hashchange", land);
    return () => window.removeEventListener("hashchange", land);
  }, [ids]);

  // After the render that opened the row.
  useLayoutEffect(() => {
    const id = pendingScroll.current;
    if (!id) return;
    pendingScroll.current = null;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  });

  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ul className="mt-[12px] list-none p-0 min-[1000px]:mt-[16px]">
      {rows.map((r) => (
        <HowRow
          key={r.id}
          row={r}
          open={open.has(r.id)}
          onToggle={() => toggle(r.id)}
          labels={labels}
          subRows={r.id === "how-brackets" ? subRows : null}
        />
      ))}
    </ul>
  );
}

function HowRow({
  row,
  open,
  onToggle,
  subRows,
  labels: copy,
}: {
  row: HowRowCopy;
  open: boolean;
  onToggle: () => void;
  subRows: SubRow[] | null;
  labels: HowRowLabels;
}) {
  const bodyId = `${row.id}-body`;
  const fields: [label: string, text: string][] = [
    [copy.fields.from, row.from],
    [copy.fields.how, row.how],
    [copy.fields.refresh, row.refresh],
  ];
  return (
    <li id={row.id} className="scroll-mt-[20px] border-t border-solid border-[color:var(--border)]">
      {/* The line JumpMark washes. The bleed and its matching padding are always on, so the wash
          does not move the text when it lands. */}
      <div
        data-entry-title=""
        className="-mx-[8px] rounded-[6px] data-[jumped]:bg-[color:var(--elevated)] min-[1000px]:-mx-[10px]"
      >
        <h3 tabIndex={-1} className="m-0 focus:outline-none">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={onToggle}
            className="flex min-h-[52px] w-full items-center gap-[10px] px-[8px] py-[9px] text-left min-[1000px]:min-h-[44px] min-[1000px]:px-[10px] min-[1000px]:py-[6px]"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-[6px] min-[1000px]:flex-row min-[1000px]:flex-wrap min-[1000px]:items-center min-[1000px]:gap-x-[10px]">
              <span className="text-[14.5px] leading-[1.35] font-semibold text-[color:var(--fg)] min-[1000px]:text-[14px]">
                {row.title}
              </span>
              <span className="flex flex-wrap items-center gap-[5px] min-[1000px]:contents">
                <MethodTags methods={row.methods} />
                <span className="ml-[4px] font-mono text-[10.5px] text-[color:var(--fg-faint)] min-[1000px]:ml-auto">
                  {copy.verdicts[row.verdict]}
                </span>
              </span>
            </span>
            <span
              aria-hidden="true"
              className="flex h-[44px] w-[44px] flex-none items-center justify-end font-mono text-[11px] text-[color:var(--fg-faint)] min-[1000px]:h-auto min-[1000px]:w-[14px] min-[1000px]:text-[10px]"
            >
              {open ? "▴" : "▾"}
            </span>
          </button>
        </h3>
      </div>

      {open && (
        <dl
          id={bodyId}
          className="mt-[6px] flex flex-col gap-[12px] pb-[16px] min-[1000px]:mt-[4px] min-[1000px]:grid min-[1000px]:grid-cols-[128px_minmax(0,1fr)] min-[1000px]:gap-x-[16px] min-[1000px]:gap-y-[9px] min-[1000px]:pb-[14px]"
        >
          {fields.map(([label, text]) => (
            <Field key={label} label={label}>
              {text}
            </Field>
          ))}
          <Field label={copy.fields.exact}>
            {subRows ? (
              <>
                {copy.bracketsLead}
                {subRows.map((s) => (
                  <span
                    key={s.label}
                    className="mt-[7px] block border-t border-solid border-[color:var(--border)] pt-[7px]"
                  >
                    <span className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
                      <span className="text-[12.5px] font-semibold text-[color:var(--fg)]">{s.label}</span>
                      <MethodTags methods={s.methods} />
                    </span>
                    {s.lines.map((l) => (
                      <span key={l} className="mt-[2px] block">
                        {l}
                      </span>
                    ))}
                  </span>
                ))}
              </>
            ) : (
              row.exact
            )}
          </Field>
        </dl>
      )}
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[3px] min-[1000px]:contents">
      <dt className="font-mono text-[10.5px] text-[color:var(--fg-faint)] min-[1000px]:pt-[2px]">{label}</dt>
      <dd className="m-0 text-[13.5px] leading-[1.55] text-pretty text-[color:var(--fg-body)] min-[1000px]:text-[13px]">
        {children}
      </dd>
    </div>
  );
}
