import { Crab } from "../components/character/crab";
import { LoaderDots } from "../components/character/loader-dots";
import { shellCopy } from "../lib/copy/shell";

export default function Loading() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center p-[40px] min-h-[420px] md:min-h-[520px] bg-[radial-gradient(560px_320px_at_50%_68%,rgba(201,162,75,0.08),transparent_70%),var(--bg)]"
    >
      <div className="relative inline-flex">
        <Crab size={96} />
        <LoaderDots className="absolute top-[-4px] right-[-22px]" />
      </div>
      <h2
        className="font-display font-bold text-[19px] md:text-[22px] mt-[24px] mb-0"
        style={{ color: "var(--fg)" }}
      >
        {shellCopy.loading.heading}
      </h2>
      <p className="font-mono text-[12px] md:text-[13px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
        {shellCopy.loading.statusGeneric}
      </p>
      <p
        className="text-[13.5px] md:text-[15px] max-w-[380px] mt-[10px] mb-0 leading-[1.6]"
        style={{ color: "var(--fg-body)" }}
      >
        {shellCopy.loading.caption}
      </p>
    </div>
  );
}
