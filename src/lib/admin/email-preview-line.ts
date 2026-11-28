import type { EmailPreviewResult } from "../../app/admin/invites/email-preview-actions";
import { emailPreviewAdminCopy as copy } from "../copy/admin";

/** The lines the Email previews card draws for an action result (drawn space-separated); `danger` when anything fell short or was refused. */
export function lineFor(r: EmailPreviewResult): { lines: string[]; danger: boolean } {
  if (!r.ok) return { lines: [r.reason === "cooldown" ? copy.cooldown(r.waitSec) : copy.refused[r.reason]], danger: true };
  const tail = r.stoppedBy === "capped" ? copy.capped : r.stoppedBy === "limited" ? copy.limited : r.stoppedBy === "failed" ? copy.failed : "";
  const names = r.sent.map((t) => copy.names[t as keyof typeof copy.names] ?? t);
  return { lines: [copy.result(names, r.total), tail].filter(Boolean), danger: r.sent.length < r.total };
}
