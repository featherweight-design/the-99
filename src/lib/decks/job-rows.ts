import type { Job } from "../labels/types";
import { jobRowsOf, type JobRowsByCard } from "./job-tally";

/** The Jobs card's labels for a deck's cards, as row keys. Null when the label read failed: the card then
 *  stays a shell, because calling every card unlabeled would state something the read never learned. */
export function loadJobRows(labels: ReadonlyMap<string, Job[]> | null): JobRowsByCard | null {
  if (!labels) return null;
  return Object.fromEntries([...labels].map(([id, jobs]) => [id, jobRowsOf(jobs)]));
}
