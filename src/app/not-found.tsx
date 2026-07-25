import Link from "next/link";
import { Crab } from "../components/character/crab";
import { shellCopy } from "../lib/copy/shell";

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center p-[40px] min-h-[400px] md:min-h-[480px] bg-[color:var(--bg)] bg-[radial-gradient(520px_300px_at_50%_70%,rgba(201,162,75,0.07),transparent_70%)]"
    >
      <span
        aria-hidden="true"
        className="font-display leading-none text-[48px] md:text-[64px]"
        style={{ fontWeight: 900, color: "var(--elevated)", letterSpacing: "0.04em" }}
      >
        {shellCopy.notFound.numeral}
      </span>
      <Crab size={96} className="mt-[-14px] mb-[18px]" />
      <h1 className="font-display font-bold text-[21px] md:text-[24px] m-0" style={{ color: "var(--fg)" }}>
        {shellCopy.notFound.heading}
      </h1>
      <p
        className="text-[13.5px] md:text-[15px] max-w-[380px] mt-[10px] mb-0 leading-[1.6]"
        style={{ color: "var(--fg-body)" }}
      >
        {shellCopy.notFound.caption}
      </p>
      <div className="flex flex-col md:flex-row gap-[12px] mt-[24px]">
        <Link
          href="/"
          className="rounded-lg font-sans font-semibold text-[13px] md:text-[14px] px-[22px] py-[12px] hover:bg-[color:var(--brass-hover)]"
          style={{ color: "var(--bg)", background: "var(--brass)" }}
        >
          {shellCopy.notFound.primaryCta}
        </Link>
        <Link
          href="/decks"
          className="rounded-lg font-sans font-semibold text-[13px] md:text-[14px] px-[22px] py-[12px] hover:border-[color:var(--brass)] hover:text-[color:var(--brass-hover)]"
          style={{ color: "var(--fg)", border: "1px solid var(--border-strong)" }}
        >
          {shellCopy.notFound.secondaryCta}
        </Link>
      </div>
    </div>
  );
}
