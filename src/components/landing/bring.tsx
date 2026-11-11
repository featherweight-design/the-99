"use client";

import { Fragment, useId, useState } from "react";
import { collectionSources, type GuideText } from "../../lib/copy/collection-sources";
import { MoxfieldNote } from "../collection/moxfield-note";
import { landingCopy } from "../../lib/copy/landing";
import { rise, Section, Lead } from "./section";

const c = landingCopy.bring;
const s = collectionSources;

const ROW = "flex min-h-[60px] w-full items-center gap-[12px] px-[16px] py-[10px] text-left";
const NAME = "font-sans text-[14.5px] font-semibold text-[color:var(--fg)]";
const SUB = "text-[13px] leading-[1.45] text-[color:var(--fg-muted)]";

function Words({ parts }: { parts: readonly GuideText[] }) {
  return (
    <>
      {parts.map((p, i) => (typeof p === "string" ? <Fragment key={i}>{p}</Fragment> : <b key={i} className="font-semibold text-[color:var(--fg)]">{p.b}</b>))}
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`flex-none text-[color:var(--fg-muted)] ${open ? "rotate-180" : ""}`}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function Plain({ name, sub }: { name: string; sub: string }) {
  return (
    <li className={`${ROW} border-t border-solid border-t-[color:var(--border)] first:border-t-0`}>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <b className={NAME}>{name}</b>
        <span className={SUB}>{sub}</span>
      </span>
    </li>
  );
}

/**
 * Bring your collection (public landing PR 7a): the first-timer path, then a row per source. The four apps the parser names
 * each open a three-step export guide in place, ONE open at a time (opening another closes the first); the rest are plain
 * rows. Static words only: there is no upload control on this page, and no step promises an action a visitor cannot take yet.
 * Each app row carries the "How to export" toggle (the mock).
 */
export function Bring() {
  const [open, setOpen] = useState<string | null>(null);
  const base = useId();
  return (
    <Section id="landing-bring" eyebrow={c.eyebrow} title={c.title} testId="landing-bring" lead={<Lead>{c.lead}</Lead>}>
      <div className="mt-[22px] max-w-[780px]">
        <div className="anim-gentle-in flex flex-col gap-[12px] rounded-[14px] border border-solid border-[color:var(--accent)] bg-[color:var(--surface-inset)] p-[18px]" style={rise(0)}>
          <h3 className="m-0 font-sans text-[17px] font-semibold text-[color:var(--fg)]">{c.firstTimer.title}</h3>
          <p className="m-0 text-[14px] leading-[1.55] text-[color:var(--fg-body)]">{c.firstTimer.lead}</p>
          <ol role="list" className="m-0 flex list-none flex-col gap-[10px] p-0">
            {c.firstTimer.steps.map((step, i) => (
              <li key={step.b} className="flex gap-[10px] text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]">
                <em aria-hidden="true" className="mt-[1px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border border-solid border-[color:var(--accent)] font-mono text-[11px] not-italic text-[color:var(--accent-text)]">{i + 1}</em>
                <span><b className="font-semibold text-[color:var(--fg)]">{step.b}</b> {step.rest}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="m-0 mt-[28px] font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--accent-text)]">{c.appsLabel}</p>
        <ul className="anim-gentle-in m-0 mt-[12px] list-none overflow-hidden rounded-[14px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-inset)] p-0" style={rise(1)}>
          {s.apps.map((app) => {
            const shown = open === app.id;
            const panel = `${base}-${app.id}`;
            return (
              <li key={app.id} className={`border-t border-solid border-t-[color:var(--border)] first:border-t-0 ${shown ? "bg-[color:var(--surface-raised)]" : ""}`}>
                <button
                  type="button"
                  aria-expanded={shown}
                  aria-controls={panel}
                  onClick={() => setOpen(shown ? null : app.id)}
                  className={`${ROW} min-h-[60px] cursor-pointer border-0 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[color:var(--accent)]`}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <b className={NAME}>{app.name}</b>
                    <span className={SUB}>{app.sub}</span>
                  </span>
                  <span className="flex flex-none items-center gap-[8px] text-[13.5px] text-[color:var(--accent-text)]">
                    {s.toggle}
                    <Chevron open={shown} />
                  </span>
                </button>
                <div id={panel} hidden={!shown} className="px-[16px] pb-[18px] pt-[4px]">
                    <ol className="m-0 flex list-decimal flex-col gap-[7px] pl-[22px] text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]">
                      {app.steps.map((parts, i) => (
                        <li key={i}><Words parts={parts} /></li>
                      ))}
                    </ol>
                    <p className="m-0 mt-[12px] text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{[s.requirement, app.bothColumns, app.foot].filter(Boolean).join(" ")}</p>
                    {app.id === "moxfield" && <MoxfieldNote className="mt-[12px]" />}
                  </div>
              </li>
            );
          })}
          <Plain name={s.another.name} sub={s.another.sub} />
          <Plain name={s.list.name} sub={s.list.sub} />
        </ul>
      </div>
    </Section>
  );
}
