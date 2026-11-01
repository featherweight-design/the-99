"use client";

// The landed delete's toast on Groups (small items 9, item 7; `Groups-Delete` D7, D8): the shared toast, *Deleted
// {group}.* with a bare ✕ and no Undo, since the group's settings went with it. The name arrives as `?deleted=` (no
// admin toast survives a navigation otherwise); the parameter is stripped through `mirrorUrl` once the toast is up,
// so a reload or a Back never shows it twice.

import { useEffect, useRef, useState } from "react";
import { adminCopy } from "../../lib/copy/admin";
import { mirrorUrl } from "../../lib/url/mirror";
import { ToastFrame, useToastClock } from "../collection/edit-toast";

const copy = adminCopy.groups.delete;
export const DELETED_PARAM = "deleted";

export function DeletedGroupToast({ name }: { name: string | null }) {
  const [shown, setShown] = useState(name);
  useEffect(() => {
    if (name === null) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(DELETED_PARAM)) return;
    url.searchParams.delete(DELETED_PARAM);
    mirrorUrl(url);
  }, [name]);
  if (shown === null) return null;
  return <Toast key={shown} name={shown} onDone={() => setShown(null)} />;
}

function Toast({ name, onDone }: { name: string; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  useToastClock(ref, !hover && !focus, onDone);
  return (
    <ToastFrame
      frameRef={ref}
      role="status"
      placement="center"
      kind="group-deleted"
      onHold={(k, on) => (k === "hover" ? setHover : setFocus)(on)}
      title={copy.toast(name)}
      actions={
        <button
          type="button"
          onClick={onDone}
          aria-label={copy.toastDismiss}
          className="flex h-[44px] w-[44px] flex-none items-center justify-center border-0 bg-transparent font-mono text-[15px] text-[color:var(--fg-faint)]"
        >
          ✕
        </button>
      }
    />
  );
}
