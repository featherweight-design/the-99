import type { Metadata } from "next";
import { FeedbackList } from "../../../components/admin/feedback-list";
import { adminMetadata, requireAdmin } from "../../../lib/admin/access";
import { readFeedback } from "../../../lib/admin/feedback";
import { parseFeedbackFilter } from "../../../lib/admin/feedback-rule";
import { adminCopy, feedbackAdminCopy } from "../../../lib/copy/admin";
import { feedbackEnabled } from "../../../lib/feedback/flag";
import { requestFlags } from "../../../lib/flags/request";

export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ title: adminCopy.tabs.feedback });

/**
 * `/admin/feedback`, the eighth tab (flyer trial, admin Feedback PR B; board 11). `?filter=` is all, problem or
 * check_in. With the feedback switch off for the admin reading it, one plain line and no read. Opening the tab marks
 * nothing read.
 */
export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<{ filter?: string | string[] }> }) {
  const { userId } = await requireAdmin();
  if (!feedbackEnabled(await requestFlags(userId))) {
    return <p className="m-0 px-[16px] pt-[18px] text-pretty text-[13px] leading-[1.6] text-[color:var(--fg-muted)] md:px-[28px]">{feedbackAdminCopy.off}</p>;
  }
  const raw = (await searchParams).filter;
  const filter = parseFeedbackFilter(Array.isArray(raw) ? raw[0] : raw);
  const read = await readFeedback({ filter });
  return <FeedbackList key={filter} filter={filter} read={read} nowMs={new Date().getTime()} />;
}
