import { Fragment } from "react";
import { EMAIL_TOKEN, legalCopy, type LegalBlock, type LegalDoc } from "../../lib/copy/legal/shared";
import { SupportLink } from "../credits/support-link";
import { LegalToc } from "./legal-toc";

/** Text with `{email}` drawn as the support mailto link, the one `/credits` draws. */
function Text({ text }: { text: string }) {
  const parts = text.split(EMAIL_TOKEN);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <SupportLink />}
          {part}
        </Fragment>
      ))}
    </>
  );
}

const BODY = "text-[15px] leading-[1.65] text-[color:var(--fg-body)]";

function Block({ block }: { block: LegalBlock }) {
  if (block.kind === "p") {
    return (
      <p className={`m-0 ${BODY}`}>
        {block.lead && <strong className="font-semibold text-[color:var(--fg)]">{block.lead} </strong>}
        <Text text={block.text} />
      </p>
    );
  }
  return (
    <ul className={`m-0 flex list-disc flex-col gap-[6px] pl-[22px] ${BODY}`}>
      {block.items.map((item, i) => (
        <li key={i}>
          {item.lead && <strong className="font-semibold text-[color:var(--fg)]">{item.lead} </strong>}
          <Text text={item.text} />
        </li>
      ))}
    </ul>
  );
}

/**
 * One prose page for `/privacy` and `/terms` (Fan Content notice R1, `LegalPage`): a 680px article (the 356px phone
 * measure), a mono `Last updated` line, the title in the theme's display face, `On this page`, 18px section headings
 * and 15px / 1.65 body. It is an `<article>`: the caller supplies the landmark (the shell's `<main>` signed in, its own
 * `<main>` signed out). The Fan Content notice follows from the shell and is not drawn here.
 */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <article className="mx-auto grid w-full max-w-[356px] grid-cols-1 gap-y-[28px] px-[0px] py-[28px] md:max-w-[1016px] md:grid-cols-[220px_minmax(0,680px)] md:gap-x-[48px] md:gap-y-[32px] md:px-[34px] md:py-[44px]">
      <header className="flex flex-col gap-[8px] md:col-start-2 md:row-start-1">
        <h1 className="m-0 font-display text-[28px] font-bold leading-[1.2] text-[color:var(--fg)] md:text-[36px]">{doc.title}</h1>
        <p className="m-0 font-mono text-[11.5px] text-[color:var(--fg-muted)]">{legalCopy.lastUpdated(doc.updated)}</p>
        <div className="mt-[8px] flex flex-col gap-[14px]">
          {doc.intro.map((b, i) => <Block key={i} block={b} />)}
        </div>
      </header>
      <LegalToc sections={doc.sections} />
      <div className="flex flex-col gap-[32px] md:col-start-2 md:row-start-2">
        {doc.sections.map((s) => (
          <section key={s.id} aria-labelledby={`${s.id}-h`} className="flex flex-col gap-[12px]">
            <h2 id={s.id} className="m-0 scroll-mt-[calc(var(--header-h,0px)+16px)] font-display text-[18px] font-semibold leading-[1.3] text-[color:var(--fg)]">
              <span id={`${s.id}-h`}>{s.title}</span>
            </h2>
            {s.blocks.map((b, i) => <Block key={i} block={b} />)}
          </section>
        ))}
      </div>
    </article>
  );
}
