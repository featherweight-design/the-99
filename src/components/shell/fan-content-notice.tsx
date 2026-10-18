import { FAN_CONTENT_POLICY_URL, passageOneParts, fanContentNotice, policyLinkAria } from "../../lib/copy/fan-content-notice";

/**
 * The Fan Content notice (launch epic A1; design `design_handoff_the99_fan_content_notice`, approved R2). A small legal line
 * after every page, signed in or out. It is page content, never `position: fixed`, never dismissible, and it carries no state:
 * a server component with no request API, which is also what lets another layout render it unchanged.
 *
 * INK IS `--fg-muted` ALONE (measured 6.61 to 7.35:1 on `--bg` in all six themes, `fan-content-notice.test.tsx`); `--fg-faint`
 * fails in two themes and is not used for text. The hairline is `--border`. The link keeps the notice's ink, underlined in
 * `--fg-faint` (a decorative line, 4.12:1 or better), `--fg` on hover, the shipped accent ring on focus.
 *
 * Two mounts and only two, both in `shell.tsx`: after `ShellMain` inside the signed-in column, and after `children` in the
 * bare signed-out branch (`align="center"`, with its own gutter and the device's bottom inset). The signed-in column's own
 * bottom reserve clears the tab bar and the sheets, and reads the locked 88px.
 */
export function FanContentNotice({ align = "start" }: { align?: "start" | "center" }) {
  const centered = align === "center";
  const parts = passageOneParts();
  return (
    <footer
      data-fan-content-notice
      className={`shrink-0 border-t border-solid border-t-[color:var(--border)] px-[16px] pt-[20px] md:px-[34px] md:pt-[22px] ${
        centered ? "pb-[calc(24px+env(safe-area-inset-bottom))] md:pb-[calc(28px+env(safe-area-inset-bottom))]" : "pb-[24px] md:pb-[28px]"
      }`}
    >
      <div
        className={`max-w-[720px] font-sans text-[11px] leading-[16px] text-[color:var(--fg-muted)] md:text-[12px] md:leading-[18px] ${
          centered ? "mx-auto text-center" : ""
        }`}
      >
        <p className="m-0">
          {parts.before}
          <a
            href={FAN_CONTENT_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={policyLinkAria}
            className="text-[color:var(--fg-muted)] underline decoration-[color:var(--fg-faint)] decoration-1 underline-offset-2 hover:text-[color:var(--fg)] hover:decoration-[color:var(--fg-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] visited:text-[color:var(--fg-muted)]"
          >
            {/* The arrow stays on the same line as the last word. */}
            {parts.link.slice(0, parts.link.lastIndexOf(" ") + 1)}
            <span className="whitespace-nowrap">
              {parts.link.slice(parts.link.lastIndexOf(" ") + 1)}
              <span aria-hidden="true"> ↗</span>
            </span>
          </a>
          {parts.after}
        </p>
        <p className="m-0 mt-[6px]">{fanContentNotice.passageTwo}</p>
      </div>
    </footer>
  );
}
