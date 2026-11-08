import { landingCopy } from "../../lib/copy/landing";
import { Icon } from "./icons";
import { rise, Section } from "./section";

const c = landingCopy.loop;

/**
 * How it works (public landing PR 4b): the four steps and the one Free line. Static markup, as the hero phone is. Bring your
 * collection (step 1) is a step here, and its own section is not on this page yet, so the loop stands alone. The Free line
 * is said once, in words (READINESS-audit finding 14): no chip on the line and none on any card.
 */
export function Loop() {
  return (
    <Section
      id="landing-loop"
      eyebrow={c.eyebrow}
      title={c.title}
      testId="landing-loop"
      lead={<p className="m-0 mt-[12px] text-[14px] font-medium text-[color:var(--fg-body)]">{c.free}</p>}
    >
      <ol className="m-0 mt-[24px] flex list-none flex-col gap-[14px] p-0 md:grid md:grid-cols-4 md:gap-[18px]">
        {c.steps.map((step, i) => (
          <li
            key={step.title}
            className="anim-gentle-in grid grid-cols-[44px_1fr] gap-x-[14px] gap-y-[4px] rounded-[14px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-inset)] p-[16px] md:flex md:flex-col md:gap-[10px] md:p-[20px]"
            style={rise(i)}
          >
            <span className="row-span-3 flex h-[44px] w-[44px] flex-none items-center justify-center rounded-[12px] border border-solid border-[color:color-mix(in_oklab,var(--accent)_50%,var(--border-strong))] bg-[color:color-mix(in_oklab,var(--accent)_8%,transparent)] text-[color:var(--accent-text)]">
              <Icon name={step.icon} />
            </span>
            <h3 className="m-0 font-sans text-[16px] font-semibold text-[color:var(--fg)]">{step.title}</h3>
            <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--fg-body)]">{step.line}</p>
            <ul className="m-0 mt-[4px] flex list-none flex-col gap-[4px] p-0">
              {step.points.map((point) => (
                <li key={point} className="flex gap-[7px] text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]">
                  <span aria-hidden="true" className="mt-[6px] h-[5px] w-[5px] flex-none rotate-45 bg-[color:var(--fg-faint)]" />
                  {point}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Section>
  );
}
