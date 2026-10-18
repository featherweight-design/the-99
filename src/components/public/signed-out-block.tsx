import { publicPagesCopy } from "../../lib/copy/public-pages";
import { Crowned99 } from "../marks";
import { SIGN_IN_PATH } from "./links";

const c = publicPagesCopy.signedOut;

/**
 * The signed-out block (C1, README call 4): one in-flow block, the same on every public page, under the card from `md` and
 * last before the footer on the phone. The mark, `This is The 99`, what it does and how the invite works, one `Sign in`
 * (Clerk's hosted page, through the proxy) and the fine print. No field, no form, never "Sign up". It reads no session:
 * a member who opens a public page is shown it too, so the page stays the same for everyone.
 */
export function SignedOutBlock() {
  return (
    <section
      aria-label={c.regionLabel}
      data-testid="public-signed-out"
      className="flex flex-col gap-[14px] rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-rail)] px-[16px] py-[18px] md:px-[22px] md:py-[20px]"
    >
      <div className="flex items-start gap-[14px]">
        <span aria-hidden="true" className="flex h-[30px] w-[30px] flex-none items-center justify-center">
          <Crowned99 variant="rail-62" className="max-h-[30px] w-auto" />
        </span>
        <div className="flex min-w-0 flex-col gap-[6px]">
          <h2 className="m-0 font-display font-semibold text-[16px] leading-[1.25] text-[color:var(--fg)]">{c.title}</h2>
          <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-body)]">{c.body}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-[14px] pl-[44px]">
        <a
          href={SIGN_IN_PATH}
          className="inline-flex min-h-[44px] items-center justify-center rounded-[8px] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-[20px] text-[14px] font-semibold text-[color:var(--fg)] no-underline hover:bg-[color:var(--elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
        >
          {c.signIn}
        </a>
        <span className="font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)]">{c.fine}</span>
      </div>
    </section>
  );
}
