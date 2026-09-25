"use client";
// Too narrow (HANDOFF §5, F7): fewer than four commanders fit every answer. NAMED, NEVER LOOSENED
// (§8.5): each option drops or widens one answer and searches again, as a new address, so the
// player sees which answer cost them and back undoes it.
//
// `few` is the slim bar above one to three rows; `none` replaces the results with a centered
// empty state. No motion (STATES invariant).

import Link from "next/link";

import { helpMeChooseCopy as copy } from "../../lib/copy/help-me-choose";
import { serializeChooseParams } from "../../lib/intake/params";
import type { NarrowOption } from "../../lib/intake/present";
import { CHOOSE_PATH } from "../../lib/intake/submit";

export const optionHref = (o: NarrowOption) => `${CHOOSE_PATH}${serializeChooseParams(o.params)}`;

export function NarrowNote({
  count,
  options,
  changeHref,
}: {
  /** How many commanders fit everything: 0 draws the empty state. */
  count: number;
  options: readonly NarrowOption[];
  changeHref: string;
}) {
  if (count === 0) {
    return (
      <section
        data-testid="narrow-none"
        className="flex flex-col items-center text-center gap-[18px] p-[36px_18px] md:p-[52px_40px] rounded-[14px] border border-dashed border-[color:var(--border-strong)]"
      >
        <h2 className="m-0 font-display font-semibold text-[16px] md:text-[19px] text-[color:var(--fg)]">{copy.narrow.none}</h2>
        <p className="m-0 max-w-[460px] text-[13px] md:text-[13.5px] leading-[1.6] text-[color:var(--fg-body)]">{copy.narrow.noneLead}</p>
        {options.length > 0 && <Options options={options} column />}
        <p className="m-0 text-[12.5px] text-[color:var(--fg-faint)]">
          <YourselfLine changeHref={changeHref} />
        </p>
      </section>
    );
  }
  return (
    <section
      data-testid="narrow-few"
      className="flex flex-col gap-[12px] md:flex-row md:items-center md:gap-[22px] p-[13px_14px] md:p-[14px_16px] rounded-[11px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)]"
    >
      <div className="flex flex-col gap-[6px]">
        <h2 className="m-0 font-display font-semibold text-[16px] md:text-[19px] text-[color:var(--fg)]">{copy.narrow.few(count)}</h2>
        <p className="m-0 max-w-[460px] text-[13px] md:text-[13.5px] leading-[1.6] text-[color:var(--fg-body)]">{copy.narrow.fewLead}</p>
      </div>
      {options.length > 0 && (
        <div className="md:ml-auto">
          <Options options={options} />
        </div>
      )}
    </section>
  );
}

/** *Or change your answers yourself.*, with its middle words the link. */
function YourselfLine({ changeHref }: { changeHref: string }) {
  const whole = copy.narrow.yourself;
  const link = copy.narrow.yourselfLink;
  const at = whole.indexOf(link);
  const anchor = (
    <Link
      href={changeHref}
      className="text-[color:var(--accent)] no-underline [border-bottom:1px_solid_color-mix(in_oklab,var(--accent)_50%,transparent)]"
    >
      {link}
    </Link>
  );
  if (at < 0) return <>{whole} {anchor}</>;
  return (
    <>
      {whole.slice(0, at)}
      {anchor}
      {whole.slice(at + link.length)}
    </>
  );
}

function Options({ options, column = false }: { options: readonly NarrowOption[]; column?: boolean }) {
  return (
    <ul
      className={[
        "m-0 p-0 list-none flex gap-[8px]",
        column ? "flex-col w-full max-w-[440px]" : "flex-col md:flex-row md:flex-wrap",
      ].join(" ")}
    >
      {options.map((o, i) => (
        <li key={o.label}>
          <Link
            href={optionHref(o)}
            data-testid="narrow-option"
            className={[
              "flex items-center gap-[12px] min-h-[48px] md:min-h-[44px] p-[8px_12px_8px_14px] rounded-[9px] border border-solid no-underline text-left",
              i === 0
                ? "bg-[color:var(--elevated)] border-[color:color-mix(in_oklab,var(--accent)_55%,transparent)]"
                : "bg-transparent border-[color:var(--border-strong)]",
            ].join(" ")}
          >
            <span className="flex flex-col gap-[2px] flex-1 min-w-0">
              <span className="text-[13.5px] font-semibold text-[color:var(--fg)] whitespace-nowrap overflow-hidden text-ellipsis">{o.label}</span>
              {o.reason && <span className="text-[11.5px] leading-[1.45] text-[color:var(--fg-faint)]">{o.reason}</span>}
            </span>
            {/* The first option, the one that brings back most, is lit; the rest step back. */}
            <span className={`flex-none font-mono text-[11px] whitespace-nowrap ${i === 0 ? "text-[color:var(--fg-body)]" : "text-[color:var(--fg-faint)]"}`}>{o.count}</span>
            <span aria-hidden className={`flex-none text-[13px] ${i === 0 ? "text-[color:var(--accent)]" : "text-[color:var(--fg-faint)]"}`}>→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
