import type { Metadata } from "next";

import { TryAgain } from "../../components/pwa/try-again";
import { pwaCopy } from "../../lib/copy/pwa";

// The page the service worker shows when a page load finds no network (`public/sw.js`). Public in
// `src/proxy.ts`, and the worker fetches it with no credentials, so the copy it keeps is the
// signed-out render: no shell, no reader, nothing that is anyone's data.
export const metadata: Metadata = { title: "Offline · The 99" };

const copy = pwaCopy.offline.page;

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col justify-center gap-[12px] px-[20px] py-[40px]">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
        {copy.eyebrow}
      </span>
      <h1 className="m-0 font-display text-[24px] font-bold text-[color:var(--fg)]">{copy.title}</h1>
      <p className="m-0 text-[14px] text-[color:var(--fg-muted)]">{copy.sub}</p>
      <div className="mt-[8px]">
        <TryAgain label={copy.retry} />
      </div>
    </main>
  );
}
