"use client";

import type { CSSProperties, ReactNode } from "react";

import { dismissAbout } from "../../app/about/actions";
import { usePendingPush } from "../shell/pending-push";

/**
 * The About dismiss's form, shared by the phone's pinned bar and the desktop contents rail. The
 * action records the acknowledgement and hands back where the reader was going; the page then
 * navigates there through `usePendingPush`, so a slow arrival reaches the navigation screen as a
 * press on a link does (a kept route shows its own screen instead, by the provider's own rule).
 */
export function DismissForm({
  destination,
  shown,
  className,
  style,
  children,
}: {
  destination: string;
  /** The switched entry ids the page showed: the dismiss acknowledges these and no others. */
  shown: readonly string[];
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { go } = usePendingPush();
  return (
    <form
      className={className}
      style={style}
      action={async (formData) => {
        go(await dismissAbout(formData));
      }}
    >
      <input type="hidden" name="next" value={destination} />
      {shown.map((id) => <input key={id} type="hidden" name="shown" value={id} />)}
      {children}
    </form>
  );
}
