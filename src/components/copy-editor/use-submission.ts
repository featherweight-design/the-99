"use client";
// The tray's submit flow: Open pull request posts the edits, then the status route is polled until the pull request
// appears (or the run fails, which gives the edits back). The edits belong to the overlay; this hook asks it to change them.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Edit } from "../../lib/copy-editor/edits";
import { readSent, readStatus, restoreEdits, submitEdits, writeSent, type Sent } from "../../lib/copy-editor/submit";

export type Pr = { number: number; url: string };
export type FailKind = "stale" | "rule" | "limit" | "unavailable" | "network" | "run";
export type Sub =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "failed"; kind: FailKind; keys: string[]; runUrl?: string }
  | { phase: "sent"; branch: string; count: number; pr: Pr | null; lagging: boolean };

/** Ask for the branch's state this often while it has no pull request; slower once it has one (waiting for the merge). */
const FAST_MS = 4_000;
const SLOW_MS = 30_000;
/** A branch with no run in sight this long after the dispatch is not coming. */
const LAG_MS = 3 * 60_000;
const GIVE_UP_MS = 15 * 60_000;

export function useSubmission(edits: Edit[], replaceEdits: (next: Edit[]) => void) {
  const [sub, setSub] = useState<Sub>(() => {
    const sent = typeof window === "undefined" ? null : readSent();
    return sent ? { phase: "sent", branch: sent.branch, count: sent.edits.length, pr: null, lagging: false } : { phase: "idle" };
  });
  const editsRef = useRef(edits);
  useEffect(() => {
    editsRef.current = edits;
  }, [edits]);

  const submit = useCallback(async () => {
    const sending = editsRef.current;
    if (sending.length === 0) return;
    setSub({ phase: "submitting" });
    const r = await submitEdits(sending);
    if (r.kind === "ok") {
      writeSent({ branch: r.branch, edits: sending, at: Date.now() });
      replaceEdits([]);
      setSub({ phase: "sent", branch: r.branch, count: sending.length, pr: null, lagging: false });
    } else {
      setSub({ phase: "failed", kind: r.kind, keys: "keys" in r ? r.keys : [] });
    }
  }, [replaceEdits]);

  const branch = sub.phase === "sent" ? sub.branch : null;
  const hasPr = sub.phase === "sent" && sub.pr !== null;
  useEffect(() => {
    if (!branch) return;
    let live = true;
    let timer = 0;
    const poll = async () => {
      const sent: Sent | null = readSent();
      if (!sent || sent.branch !== branch) return;
      const p = await readStatus(branch);
      if (!live) return;
      if (p.state === "failed") {
        // The run ended without a pull request: the edits come back and Try again resends them.
        replaceEdits(restoreEdits(editsRef.current, sent.edits));
        writeSent(null);
        setSub({ phase: "failed", kind: "run", keys: [], runUrl: p.runUrl });
        return;
      }
      if (p.state === "merged" || p.state === "closed") {
        writeSent(null);
        setSub({ phase: "idle" });
        return;
      }
      const age = Date.now() - sent.at;
      if (p.state === "open") setSub((cur) => (cur.phase === "sent" ? { ...cur, pr: { number: p.number, url: p.url }, lagging: false } : cur));
      else setSub((cur) => (cur.phase === "sent" && !cur.pr ? { ...cur, lagging: age > LAG_MS && p.state !== "pending" } : cur));
      if (p.state !== "open" && age > GIVE_UP_MS) return;
      timer = window.setTimeout(poll, p.state === "open" ? SLOW_MS : FAST_MS);
    };
    timer = window.setTimeout(poll, hasPr ? SLOW_MS : FAST_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
    // `hasPr` is read once when the loop starts; the loop paces itself after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, replaceEdits]);

  const dismiss = useCallback(() => setSub((cur) => (cur.phase === "failed" ? { phase: "idle" } : cur)), []);
  return { sub, submit, dismiss };
}
