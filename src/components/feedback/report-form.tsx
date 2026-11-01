"use client";

import { reportCopy as copy } from "../../lib/copy/report";
import type { ReportSource } from "../../lib/feedback/report-rule";
import { ModalChrome } from "../decks/receipt-modal";
import { SocialToast } from "../social/social-toast";
import { ReportBody, useReportDraft } from "./report-body";

// The Report a problem form inside the app (flyer trial PR 5; handoff Report-Phone R3 to R6, Report-Desktop D3 and D4):
// `ModalChrome` at 520 on desktop, its sheet on the phone, around the one form body (`report-body.tsx`, which `/report`
// draws too). The dialog cannot close mid-send.

export function ReportForm({
  source,
  digest,
  eventId,
  onClose,
}: {
  source: ReportSource;
  /** The boundary's digest, when a server error carried one. */
  digest?: string | null;
  /** The Sentry event id of a browser-side throw. */
  eventId?: string | null;
  onClose: () => void;
}) {
  const draft = useReportDraft({ source, digest, eventId });

  // Sending holds the dialog open: Escape, the scrim and the ✕ all come here.
  const close = () => {
    if (draft.phase !== "sending") onClose();
  };

  return (
    <>
      <ModalChrome
        title={copy.title}
        closeLabel={copy.close}
        onClose={close}
        width={520}
        fit
        titleClassName="!font-sans !font-semibold text-[15px] leading-tight md:text-[16px] md:leading-[17px]"
      >
        <ReportBody draft={draft} layout="modal" onClose={onClose} onCancel={close} />
      </ModalChrome>
      <SocialToast toast={draft.toast} onDone={draft.clearToast} />
    </>
  );
}
