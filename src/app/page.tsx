import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { Crowned99 } from "../components/marks";

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <section
        // Page layout per §Signed-Out Landing / Page layout.
        // Radial gradient differs between mobile and desktop (table row appshell.md:346):
        //   mobile:  600px 360px at 50% 22%, rgba(201,162,75,0.12)
        //   desktop: 1000px 520px at 50% 8%,  rgba(201,162,75,0.10)
        // Expressed as two Tailwind arbitrary-value bg utilities split at the md
        // breakpoint so no inline style is used on this element.
        className="flex min-h-screen flex-col items-center justify-center px-8 md:px-10 text-center bg-[radial-gradient(600px_360px_at_50%_22%,rgba(201,162,75,0.12),transparent_70%),var(--bg)] md:bg-[radial-gradient(1000px_520px_at_50%_8%,rgba(201,162,75,0.10),transparent_70%),var(--bg)]"
      >
        {/* Hero mark — 92px mobile / 132px desktop per §Hero numeral "99" */}
        <Crowned99 variant="hero-mobile" className="md:hidden" />
        <Crowned99 variant="hero-desktop" className="hidden md:block" />

        {/* "THE NINETY-NINE" sub-label per §"THE NINETY-NINE" sub-label
            mobile: 11px / 0.4em; desktop: 13px / 0.44em
            margin-top: 14px mobile / 16px desktop */}
        <p
          className="mt-[14px] md:mt-[16px] text-[11px] md:text-[13px] tracking-[0.4em] md:tracking-[0.44em] text-brass font-mono"
        >
          THE NINETY-NINE
        </p>

        {/* Tagline per §Tagline
            font-size 17px mobile / 21px desktop
            line-height 1.5 mobile only
            margin-top 22px mobile / 26px desktop
            max-width 280px mobile only */}
        <p
          className="mt-[22px] md:mt-[26px] max-w-[280px] md:max-w-none italic leading-[1.5] text-[17px] md:text-[21px] text-fg-body font-sans"
        >
          99 problems, but your commander ain&apos;t one.
        </p>

        {/* Sign in button per §Sign in button
            margin-top 34px mobile / 36px desktop
            padding 14px 0 (full width up to 260px) mobile / 14px 40px desktop */}
        <SignInButton mode="modal">
          <button
            type="button"
            className="mt-[34px] md:mt-[36px] w-full max-w-[260px] md:w-auto md:max-w-none rounded-[8px] py-[14px] px-0 md:px-[40px] font-semibold text-[15px] font-sans bg-brass hover:bg-brass-hover text-bg transition-colors cursor-pointer border-none"
          >
            Sign in
          </button>
        </SignInButton>

        {/* "Invite-only" note per §"Invite-only" note
            font-size 11px mobile / 12px desktop
            margin-top 18px mobile / 20px desktop
            letter-spacing 0.04em both
            mobile: "Invite-only · access by request"
            desktop: appends " · a Commander companion" */}
        <p
          className="mt-[18px] md:mt-[20px] text-[11px] md:text-[12px] tracking-[0.04em] text-fg-faint font-mono"
        >
          Invite-only · access by request
          <span className="hidden md:inline"> · a Commander companion</span>
        </p>
      </section>
    );
  }

  // Signed-in branch — Task 10 renders the dashboard here.
  return <div className="p-6 text-fg" />;
}
