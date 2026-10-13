import type { Metadata } from "next";
import { AdminHead } from "../../components/admin/admin-head";
import { adminMetadata, requireAdmin } from "../../lib/admin/access";

// Gated like the render: a stranger's 404 carries the root's metadata alone, as an unknown path's does.
export const generateMetadata = (): Promise<Metadata> => adminMetadata<Metadata>({ robots: { index: false, follow: false } });

/**
 * Every admin page: the gate, then the shared head (admin STATES D3). A `flex:1; min-height:0`
 * column inside `ShellMain`, never `100dvh`: the shell already reserves the header and the tab
 * bar (READINESS-audit finding 14). The shell scrolls the document, so nothing here is a
 * fixed-height box above a scrolling one: the head is `sticky` at the top (on a phone only its tab
 * strip stays, the rest scrolling away), and a page's pinned bar (Costs' month bar) is `sticky`
 * directly beneath it, at the `--admin-head-h` the head publishes from the measured height of its
 * pinned part (design table R2 delta `page`, and the head pinning row).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { env } = await requireAdmin();
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AdminHead env={env} />
      {children}
    </div>
  );
}
