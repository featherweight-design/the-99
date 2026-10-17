// The legacy gate's way back, on About's new shape (discovery R2·6b). The discovery handoff is silent on it, so the
// shipped behavior is kept: with `ABOUT_SHEET_ENABLED` off the proxy redirects a behind reader to
// `/about?next=<where they were going>`, and the page they land on owes them `Got it` and a way back. The words, the
// form and the action are the shipped page's (`DismissForm`, `dismissAbout`); only the placement moves, because the
// new shape has no contents rail to carry the desktop copy. Below `md` it is the shipped bar pinned on the tab bar;
// from `md` it sits in the page's flow above the tabs. One element at every width, so it is announced once.

import { PrimaryButton } from "../ui/button";
import { aboutCopy } from "../../lib/copy/about";
import { DismissForm } from "./dismiss-form";

export function GateDismiss({ destination, shown }: { destination: string; shown: readonly string[] }) {
  const clause = destination === "/" ? aboutCopy.dismissDestinationHome : aboutCopy.dismissDestination(destination);
  return (
    <>
      {/* The pinned bar's own height, given back to the document on the phone, as the shipped page did. */}
      <div aria-hidden className="h-[67px] md:hidden" />
      <DismissForm
        destination={destination}
        shown={shown}
        className="fixed inset-x-0 bottom-[var(--tabbar-h)] z-30 border-t border-solid border-[color:var(--border)] bg-[color:var(--bg)] px-[16px] pt-[10px] pb-[12px] md:static md:order-first md:mb-[20px] md:flex md:justify-end md:border-t-0 md:bg-transparent md:p-0"
      >
        <PrimaryButton type="submit" className="min-h-[44px] w-full px-[18px] md:w-auto" aria-label={`${aboutCopy.dismiss}, ${clause}`}>
          {aboutCopy.dismiss}
        </PrimaryButton>
      </DismissForm>
    </>
  );
}
