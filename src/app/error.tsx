"use client";
// A page whose render threw. It draws inside the root layout, so the shell, the theme and the fonts
// are already there; `retry` re-fetches and re-renders the segment.

import { ErrorNotice } from "../components/shell/error-notice";

export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorNotice boundary="page" error={error} retry={retry} />;
}
