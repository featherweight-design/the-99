import { after } from "next/server";

/**
 * Runs `task` once the response is sent when there is a request to defer it to (`after()`), and now, awaited, when
 * there is none (a script or a probe calling a collection write directly). Either way it is NON-FATAL: a failure is
 * logged, never thrown, so the write it follows has already committed and stays the caller's answer.
 */
export function afterCommit(label: string, task: () => Promise<unknown>): Promise<void> {
  const safe = async () => {
    try {
      await task();
    } catch (error) {
      console.error(`${label} failed after its write committed`, error);
    }
  };
  try {
    after(safe);
    return Promise.resolve();
  } catch {
    // `after` throws outside a request scope: there is no response to wait for, so the task runs now.
    return safe();
  }
}
