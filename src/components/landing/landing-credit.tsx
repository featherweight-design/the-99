"use client";
// The landing's data credit (EDHREC, Commander Spellbook), drawn as the first line of the Fan Content notice so the page ends in one
// legal block (the mock's `.crd` over `.fan`). The shell's signed-out mount hands it to the notice for EVERY signed-out page; it
// draws nothing off `/`, so every other page's footer is unchanged.

import { usePathname } from "next/navigation";
import { landingCopy } from "../../lib/copy/landing";

export function LandingCredit() {
  if (usePathname() !== "/") return null;
  return <p className="m-0 mb-[6px]">{landingCopy.footer.credit}</p>;
}
