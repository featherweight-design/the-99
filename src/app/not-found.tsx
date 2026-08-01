import { Crab } from "../components/character/crab";
import { shellCopy } from "../lib/copy/shell";
import { GhostButton, PrimaryButton } from "../components/ui/button";

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
        <PrimaryButton
          href="/"
          className="text-[13px] md:text-[14px] px-[22px] py-[12px]"
        >
          {shellCopy.notFound.primaryCta}
        </PrimaryButton>
        <GhostButton
          href="/decks"
          className="text-[13px] md:text-[14px] px-[22px] py-[12px]"
        >
          {shellCopy.notFound.secondaryCta}
        </GhostButton>
      </div>
    </div>
  );
}
