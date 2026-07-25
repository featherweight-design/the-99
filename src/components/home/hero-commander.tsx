import { getRankedList } from "../../lib/recs/ranked-list";
import { completeness, COMPLETENESS_THRESHOLDS } from "../../lib/recs/score";

/** WUBRG identity pip. Colors come from brand tokens (--w --u --b --r --g). */
function ColorPip({ color }: { color: string }) {
  const c = color.toUpperCase();
  const token =
    c === "W" ? "--w"
    : c === "U" ? "--u"
    : c === "B" ? "--b"
    : c === "R" ? "--r"
    : c === "G" ? "--g"
    : "--fg-faint";
  return (
    <span
      aria-label={`Color: ${c}`}
      // §Card: WUBRG pip — 11px × 11px, border-radius 3px, border rgba(0,0,0,0.35)
      className="inline-block h-[11px] w-[11px] rounded-[3px]"
      style={{ background: `var(${token})`, border: "1px solid rgba(0,0,0,0.35)" }}
    />
  );
}

function fillColor(pct: number): string {
  // §Hero card: Progress bar fill — ≥90% success, ≥75% warning, <75% danger
  if (pct >= COMPLETENESS_THRESHOLDS.high) return "var(--success)";
  if (pct >= COMPLETENESS_THRESHOLDS.mid) return "var(--warning)";
  return "var(--danger)";
}

export function HeroCommanderSkeleton() {
  return (
    <div
      // §Hero card container: bg surface, border line, border-radius 14px, overflow hidden
      className="mb-[34px] flex overflow-hidden rounded-[14px]"
      style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}
      aria-busy="true"
    >
      {/* Art placeholder: striped, 200px, desktop only */}
      <div
        className="hidden md:block w-[200px] shrink-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, #1E1A15 0 11px, #181209 11px 22px), var(--bg)",
          borderRight: "1px solid var(--border-strong)",
        }}
      />
      {/* Info area skeleton */}
      <div className="flex flex-1 flex-col justify-center p-6 md:p-[26px_30px]">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-faint)",
          }}
        >
          Loading recommendations…
        </p>
      </div>
    </div>
  );
}

/**
 * Async server component — cheap once scores are persisted, expensive only on a
 * cold miss (dozens of EDHREC fetches).
 * Dashboard wraps this in <Suspense> so the surrounding shell streams first.
 * READINESS item 4: degraded flag renders an interim "synergy data offline" note.
 */
export async function HeroCommander({ userId }: { userId: string }) {
  const { items, degraded } = await getRankedList(userId);
  const top = items[0];

  if (!top) {
    // No candidates — dedicated empty surface lives at /commanders.
    // Hero on Home just falls back to a quiet placeholder.
    return (
      <div
        className="mb-[34px] rounded-[14px] p-[26px_30px]"
        style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--fg-faint)",
          }}
        >
          No commander candidates yet.
        </p>
      </div>
    );
  }

  const pct = completeness(top);

  return (
    <div
      // §Hero card container: display flex, bg surface, border line, border-radius 14px, overflow hidden, mb 34px
      className="mb-[34px] flex flex-col overflow-hidden rounded-[14px] md:flex-row"
      style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}
    >
      {/* Art placeholder — striped per handoff ("real art drops later").
          §Hero card: Art placeholder — 200px, flex none, border-right line, bg base + stripe */}
      <div
        className="hidden md:block w-[200px] shrink-0"
        style={{
          background:
            "repeating-linear-gradient(135deg, #1E1A15 0 11px, #181209 11px 22px), var(--bg)",
          borderRight: "1px solid var(--border-strong)",
        }}
        aria-hidden
      />

      {/* Info area — §Hero card: Info area — flex 1, padding 26px 30px, flex-col, justify center */}
      <div className="flex flex-1 flex-col justify-center p-6 md:p-[26px_30px]">
        {/* WUBRG pips — §Card: WUBRG pip, gap 4px */}
        <div className="mb-2 flex items-center gap-[4px]">
          {top.colorIdentity.map((c) => (
            <ColorPip key={c} color={c} />
          ))}
        </div>
        {/* Commander name — §Hero card: Commander name — Cinzel 700 28px primary */}
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 28,
            color: "var(--fg)",
          }}
        >
          {top.name}
        </h2>

        {degraded && (
          <p
            className="mt-2"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--warning)",
            }}
          >
            synergy data offline — ranking by pool + roles only
          </p>
        )}

        {/* Completeness row — §Hero card: Completeness row — flex, gap 10px, mt 18px, max-w 420px */}
        {pct != null ? (
          <div className="mt-[18px] flex max-w-[420px] items-center gap-[10px]">
            {/* §Hero card: Owned count — mono 13px, color success/warning/danger */}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: fillColor(pct),
              }}
            >
              {top.edhrecOwnedCount}/{top.edhrecTotal}
            </span>
            {/* §Hero card: Progress bar track — flex 1, h 6px, bg elevated, br 3px, overflow hidden */}
            <div
              className="h-[6px] flex-1 overflow-hidden rounded-[3px]"
              style={{ background: "var(--elevated)" }}
              role="progressbar"
              aria-label="Deck completeness"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {/* §Hero card: Progress bar fill — h 100%, br 3px, bg success/warning/danger */}
              <div
                className="h-full rounded-[3px]"
                style={{ width: `${pct}%`, background: fillColor(pct) }}
              />
            </div>
          </div>
        ) : (
          <p
            className="mt-[18px]"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-faint)",
            }}
          >
            completeness unavailable
          </p>
        )}
      </div>
    </div>
  );
}
