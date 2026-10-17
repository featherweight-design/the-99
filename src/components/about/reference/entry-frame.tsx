// An opened Reference entry's picture (discovery R2·6a, README-r2 C5, R2 gap 9): its screen's real frame in a 3:2
// window, moved so the entry's control is in view, the control haloed and the rest dimmed as a tool card's is. An entry
// whose control the locator map does not place shows the top of its screen, unhaloed.

import { frameWindow } from "../../../lib/about/reference";
import type { Shot } from "../../../lib/about/shots";

export function EntryFrame({ shot, alt }: { shot: Shot; alt: string }) {
  const w = frameWindow(shot);
  return (
    <div className="relative aspect-[3/2] w-full flex-none overflow-hidden rounded-[10px] border border-[color:var(--border)] bg-[color:var(--bg)] lg:w-[330px] lg:self-start">
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size capture served as-is from public/ */}
      <img
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 block h-full w-full object-cover"
        style={{ objectPosition: `50% ${w.position}%` }}
      />
      {w.halo && (
        <span
          aria-hidden
          data-entry-halo
          className="pointer-events-none absolute rounded-[8px]"
          style={{
            left: `${w.halo.left}%`,
            top: `${w.halo.top}%`,
            width: `${w.halo.width}%`,
            height: `${w.halo.height}%`,
            boxShadow:
              "0 0 0 2px color-mix(in oklab, var(--accent) 75%, transparent), 0 0 0 6px color-mix(in oklab, var(--accent) 20%, transparent), 0 0 0 2000px color-mix(in oklab, var(--bg) 28%, transparent)",
          }}
        />
      )}
    </div>
  );
}
