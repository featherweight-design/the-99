// The choose route's header: the way back, the title and its two subs. Shared by the page and its
// loading screen, so the screen a reader waits on is the one the page then fills.
import Link from "next/link";

export function ChooseHeader({
  back,
  title,
  sub,
  subPhone,
  centered = false,
}: {
  back: { href: string; label: string };
  title: string;
  sub: string;
  subPhone: string;
  centered?: boolean;
}) {
  return (
    <header
      className={[
        "flex flex-col gap-[3px] md:gap-[6px] p-[20px_18px_14px] border-0 border-b border-solid border-[color:var(--border)] md:border-b-0",
        centered ? "md:w-[680px] md:max-w-full md:mx-auto md:p-[34px_0_26px]" : "md:p-[34px_40px_26px]",
      ].join(" ")}
    >
      <Link href={back.href} className="self-start font-mono text-[11px] text-[color:var(--fg-faint)] no-underline">
        {back.label}
      </Link>
      <h1 className="m-0 font-display font-bold text-[20px] md:text-[28px] text-[color:var(--fg)]">{title}</h1>
      <p className="m-0 md:hidden font-mono text-[10px] text-[color:var(--fg-faint)]">{subPhone}</p>
      <p className="m-0 hidden md:block max-w-[640px] text-[14px] text-[color:var(--fg-muted)]">{sub}</p>
    </header>
  );
}
