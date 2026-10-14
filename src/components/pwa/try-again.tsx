"use client";

import { PrimaryButton } from "../ui/button";

/** Reloads the address the reader asked for: the worker serves this page in its place, so a reload asks again. */
export function TryAgain({ label }: { label: string }) {
  return (
    <PrimaryButton onClick={() => window.location.reload()} className="w-fit px-[20px] min-h-[44px] text-[14px]">
      {label}
    </PrimaryButton>
  );
}
