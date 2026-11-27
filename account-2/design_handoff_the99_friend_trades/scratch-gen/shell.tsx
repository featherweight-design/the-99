import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
mkdirSync("dz/frames", { recursive: true });
export type Dev = "phone" | "desk";
export const frames: { id: string; dev: Dev; vh?: number }[] = [];
export function app(id: string, dev: Dev, main: ReactNode, opts: { vh?: number; path?: string } = {}) {
  (globalThis as any).__PATH = opts.path ?? "/collection/wishlist";
  (globalThis as any).__AV = { initials: "WC", art: null };
  const badges = { friends: 0, friendsWaiting: 0, friendsAt: new Date().toISOString() } as any;
  const door: any = { adminDoor: false, adminEnv: null, credits: null };
  writeFileSync(`dz/frames/${id}.html`, renderToString(
    <div className="flex min-h-dvh flex-1">
      <NavRail locked={false} openLock={null as any} theme="amonkhet" {...door} friendsMoment={false} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
        <MobileHeader theme="amonkhet" installed={false} {...door} />
        <main className="flex min-w-0 flex-1 flex-col">{main}</main>
      </div>
      <TabBar locked={false} openLock={null as any} friendsMoment={false} badges={badges} />
    </div>,
  ));
  frames.push({ id, dev, vh: opts.vh });
}
export const done = () => writeFileSync("dz/frames.json", JSON.stringify(frames));
