"use client";
// Request history (#2984, R1d; `design_handoff_the99_request_history`): every spare request the reader made or offered (From you) and
// every one made or offered to them (To you), newest first, grouped by month, 30 at a time. The rows are Your requests' shape
// (card at card shape, the friend's face in the corner, kicker, title, line) with no ✕ and no Ask again: the live list keeps
// every action, so history only shows. The whole row opens card details. Dates are UTC days, the app's one rule for a stamp.
import { captureClientError } from "../../lib/sentry/capture-client";
import { BandTitle } from "../decks/deck-box";
import Link from "next/link";
import { useState, useTransition } from "react";
import { PendingReporter } from "../shell/pending-reporter";
import { loadMoreHistoryAction } from "../../app/friends/request-history-actions";
import { historyCopy as h } from "../../lib/copy/request-history";
import { PersonInitials, PersonText, type PersonParts } from "../../lib/person-name";
import { wall } from "../../lib/time/zoned";
import { useZone } from "../zone-context";
import { formatShortDeckDate } from "../../lib/decks/format";
import type { HistoryCursor, HistoryDirection, HistoryEntry } from "../../lib/social/request-history";
import { daysLeft } from "../../lib/social/spare-request-rules";
import { CardDetailTrigger } from "../cards/card-detail-context";
import { ART_CROP_TRIM } from "../ui/art-crop-trim";
import { FadingImg } from "../ui/hydrated-art";
import { SegmentedSwitch } from "../ui/segmented-switch";
import { BAND, PANEL, PanelEmpty } from "./section-panel";

export type HistoryTab = "asked" | "ofYou";
const DIRECTION: Record<HistoryTab, HistoryDirection> = { asked: "asked", ofYou: "received" };

// The month head is the reader's month, the same day the row stamps print.
const monthOf = (d: Date, zone: string | null) => {
  const w = wall(d, zone ?? "UTC");
  return `${new Date(Date.UTC(2000, w.mo - 1, 1)).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })} ${w.y}`;
};

function rowText(e: HistoryEntry, tab: HistoryTab, nowMs: number, zone: string | null): { kind: string; ink: string; on: string | null; title: PersonParts; detail: string | PersonParts } {
  const ink = e.state === "open" ? "text-[color:var(--accent-text)]" : e.state === "yes" ? "text-[color:var(--success)]" : "text-[color:var(--fg-faint)]";
  // A withdrawal from before `withdrawn_at` existed has no date to claim: the kicker draws none.
  const on = e.endedAt === null ? null : formatShortDeckDate(e.endedAt, zone);
  const left = () => daysLeft(e.createdAt, new Date(nowMs));
  if (e.offer) {
    // You have it R2: an offer. The ask's shell and kickers; `Offered` while open; the title and the line say offer.
    const o = h.offer;
    if (tab === "asked") {
      const detail = e.state === "open" ? o.openMine(e.other.displayName, left()) : o.offered(formatShortDeckDate(e.createdAt, zone));
      const title = e.state === "open" ? o.mine.open(e.other.displayName, e.card.name, e.copies) : o.mine[e.state](e.other.displayName, e.card.name);
      return { kind: e.state === "open" ? o.open : h.kind[e.state], ink, on, title, detail };
    }
    const detail = e.state === "open" ? h.openTheirs(left()) : e.state === "yes" ? h.theirsYes : e.state === "no" ? h.theirsNo : h.theirsExpired;
    return { kind: e.state === "open" ? h.ofYouOpen : h.kind[e.state], ink, on, title: o.theirs(e.other.displayName, e.card.name, e.copies), detail };
  }
  if (tab === "asked") {
    const detail = e.state === "open" ? h.openMine(e.deckName, left()) : h.asked(e.deckName, formatShortDeckDate(e.createdAt, zone));
    return { kind: h.kind[e.state], ink, on, title: h.mine[e.state](e.other.displayName, e.card.name), detail };
  }
  const detail = e.state === "open" ? h.openTheirs(left()) : e.state === "yes" ? h.theirsYes : e.state === "no" ? h.theirsNo : h.theirsExpired;
  return { kind: e.state === "open" ? h.ofYouOpen : h.kind[e.state], ink, on, title: h.theirs(e.other.displayName, e.card.name, e.copies), detail };
}

/** The row's picture: the card with the friend's face on its corner. Shared with the offerer's answer sheet. */
export function HistoryPicture({ e }: { e: HistoryEntry }) {
  return (
    <span aria-hidden className="relative h-[64px] w-[46px]">
      {e.card.imageUri ? (
        <FadingImg src={e.card.imageUri} alt="" className="block h-[64px] w-[46px] rounded-[3px] object-cover shadow-[0_2px_6px_rgba(0,0,0,.45)]" />
      ) : (
        <span className="block h-[64px] w-[46px] rounded-[3px] bg-[color:var(--surface-sunken)]" />
      )}
      <span className="absolute -bottom-[5px] -right-[6px] flex h-[24px] w-[24px] items-center justify-center overflow-hidden rounded-[7px] bg-[color:var(--elevated)] font-mono text-[9px] font-semibold text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)]">
        {e.other.commander?.artCropUri ? (
          <FadingImg src={e.other.commander.artCropUri} alt="" className="block h-full w-full object-cover" style={ART_CROP_TRIM.img} />
        ) : (
          <PersonInitials n={e.other.displayName} />
        )}
      </span>
    </span>
  );
}

function Rows({ entries, tab, nowMs }: { entries: readonly HistoryEntry[]; tab: HistoryTab; nowMs: number }) {
  const zone = useZone();
  const groups: { label: string; rows: HistoryEntry[] }[] = [];
  for (const e of entries) {
    const label = monthOf(e.createdAt, zone);
    if (groups.at(-1)?.label !== label) groups.push({ label, rows: [] });
    groups.at(-1)!.rows.push(e);
  }
  return (
    <>
      {groups.map((g, gi) => (
        <section key={g.label} className={`${PANEL} ${gi === 0 ? "mt-[18px]!" : "mt-[16px]!"}`}>
          <h2 className={BAND}>
            <BandTitle title={g.label} count={g.rows.length} />
          </h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {g.rows.map((e) => {
              const t = rowText(e, tab, nowMs, zone);
              return (
                <li key={e.id} className="[&+&]:[border-top:1px_solid_var(--border)]">
                  <CardDetailTrigger
                    oracleId={e.oracleId}
                    name={e.card.name}
                    className="block w-full text-left"
                  >
                    {/* The padding lives inside: the trigger's own inline `padding: 0` outranks any class on it. */}
                    <span className="grid grid-cols-[46px_minmax(0,1fr)] items-center gap-x-[12px] px-[14px] py-[12px] md:gap-x-[14px] md:px-[16px]">
                    <HistoryPicture e={e} />
                    <span className="flex min-w-0 flex-col gap-[3px]">
                      <span className="m-0 flex min-w-0 items-center gap-[7px]">
                        <span className={`truncate font-mono text-[9.5px] font-medium uppercase tracking-[.12em] ${t.ink}`}>{t.kind}</span>
                        {t.on !== null && <small className="font-mono text-[10px] text-[color:var(--fg-faint)]">{t.on}</small>}
                      </span>
                      <span className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--fg)] [overflow-wrap:anywhere]"><PersonText text={t.title} /></span>
                      <span className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [overflow-wrap:anywhere]"><PersonText text={t.detail} /></span>
                    </span>
                    </span>
                  </CardDetailTrigger>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

type Side = { entries: HistoryEntry[]; next: HistoryCursor | null };

export function RequestHistory({ asked, ofYou, hiddenCount, nowMs }: { asked: Side; ofYou: Side; hiddenCount: number; nowMs: number }) {
  const [tab, setTab] = useState<HistoryTab>("asked");
  const [sides, setSides] = useState<Record<HistoryTab, Side>>({ asked, ofYou });
  const [failed, setFailed] = useState<Record<HistoryTab, boolean>>({ asked: false, ofYou: false });
  const [loading, setLoading] = useState<Record<HistoryTab, boolean>>({ asked: false, ofYou: false });
  const [, startLoading] = useTransition();
  const side = sides[tab];

  function older() {
    const cursor = side.next;
    // Per tab, and ignored while that tab's page is out: a second press would fetch the same cursor again.
    if (cursor === null || loading[tab]) return;
    const at = tab;
    setFailed((f) => ({ ...f, [at]: false }));
    setLoading((l) => ({ ...l, [at]: true }));
    startLoading(async () => {
      const page = await loadMoreHistoryAction(DIRECTION[at], cursor).catch((e) => {
        captureClientError("requests.history-more", e);
        return null;
      });
      setLoading((l) => ({ ...l, [at]: false }));
      if (page === null) {
        setFailed((f) => ({ ...f, [at]: true }));
        return;
      }
      setSides((now) => {
        const have = new Set(now[at].entries.map((x) => x.id));
        return { ...now, [at]: { entries: [...now[at].entries, ...page.entries.filter((x) => !have.has(x.id))], next: page.next } };
      });
    });
  }

  const empty = tab === "asked" ? h.emptyAsked : h.emptyOfYou;
  return (
    <div className="mx-auto box-border w-full max-w-[720px] px-[16px] pb-[60px] pt-[22px] md:px-0 md:pt-[36px]">
      <Link href="/friends" className="text-[14px] text-[color:var(--fg-muted)] no-underline hover:text-[color:var(--fg)]">{h.back}<PendingReporter href="/friends" /></Link>
      <h1 className="m-0 mt-[14px] font-display text-[24px] font-bold text-[color:var(--fg)] md:text-[28px]">{h.title}</h1>
      <p className="m-0 mt-[4px] text-[13px] text-[color:var(--fg-muted)]">{h.line}</p>
      <div className="mt-[18px] flex">
        <SegmentedSwitch
          kind="tabs"
          ariaLabel={h.title}
          size="compact"
          fill
          value={tab}
          onChange={setTab}
          segments={[{ value: "asked", label: h.tabs.asked }, { value: "ofYou", label: h.tabs.ofYou }]}
          ids={{ tab: (v) => `rh-tab-${v}`, panel: (v) => `rh-panel-${v}` }}
        />
      </div>
      <div role="tabpanel" id={`rh-panel-${tab}`} aria-labelledby={`rh-tab-${tab}`}>
      {side.entries.length === 0 ? (
        <div className={`${PANEL} mt-[18px]!`}>
          <PanelEmpty size="lg" title={empty.title} body={empty.body} />
        </div>
      ) : (
        <>
          <Rows entries={side.entries} tab={tab} nowMs={nowMs} />
          {side.next !== null && (
            <div className="mt-[14px] flex flex-col items-center gap-[8px]">
              <button
                type="button"
                onClick={older}
                disabled={loading[tab]}
                className="flex min-h-[44px] cursor-pointer items-center rounded-[8px] bg-transparent px-[16px] font-sans text-[13px] font-medium text-[color:var(--fg)] [border:1px_solid_var(--border)] md:min-h-[36px]"
              >
                {h.older}
              </button>
              {failed[tab] && <p role="status" className="m-0 text-[13px] text-[color:var(--warning)]">{h.olderFailed}</p>}
            </div>
          )}
        </>
      )}
      </div>
      {hiddenCount > 0 && <p className="m-0 mt-[18px] text-[12.5px] leading-[1.5] text-[color:var(--fg-faint)]">{h.exFriends}</p>}
    </div>
  );
}
