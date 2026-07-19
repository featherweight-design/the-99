// INTERIM Decks surface — full builder ships in #8.
// Empty state per property table §Empty State — No Decks.
import Link from "next/link";
import { requireUserId } from "../../lib/auth";
import { listRecentDecks } from "../../lib/home/summary";
import { CardFan } from "../../components/marks";

export default async function DecksPage() {
  const userId = await requireUserId();
  const decks = await listRecentDecks(userId, 50);

  if (decks.length === 0) {
    return (
      <section
        className="flex flex-col items-center justify-center text-center"
        style={{ padding: "32px" }}
      >
        {/* Card-fan mark: mobile variant → 100×110, decks-desktop → 120×130 (−15° front) */}
        <CardFan variant="mobile" className="mb-[22px] md:hidden" />
        <CardFan variant="decks-desktop" className="mb-[26px] hidden md:block" />

        <h1
          className="font-display font-bold text-[24px] md:text-[28px]"
          style={{ color: "var(--fg)", margin: 0 }}
        >
          No decks yet
        </h1>

        {/* Body: mobile 14px different copy, desktop 16px different copy */}
        <p
          className="mt-3 text-[14px] leading-[1.6] md:max-w-[420px] md:text-[16px]"
          style={{ color: "var(--fg-body)" }}
        >
          <span className="md:hidden">
            Pick a commander and we&apos;ll assemble the 99 from cards you
            already own.
          </span>
          <span className="hidden md:inline">
            Pick a commander and we&apos;ll assemble the 99 from cards you
            already own — then track what&apos;s missing.
          </span>
        </p>

        {/* "Browse commanders" CTA: mobile pad 13px 26px mt-[24px], desktop 12px 26px */}
        <Link
          href="/commanders"
          className={[
            "mt-[24px] rounded-lg font-semibold text-[14px]",
            "px-[26px] py-[13px] md:py-[12px]",
            "bg-[color:var(--brass)] text-[color:var(--bg)]",
            "hover:bg-[color:var(--brass-hover)]",
          ].join(" ")}
        >
          Browse commanders
        </Link>
      </section>
    );
  }

  // Non-empty interim list — full builder + editor arrive with #8.
  return (
    <section className="p-6 md:p-10">
      <h1
        className="mb-6 font-display font-bold text-[28px]"
        style={{ color: "var(--fg)" }}
      >
        Your decks
      </h1>
      <ul className="flex flex-col gap-3">
        {decks.map((d) => (
          <li key={d.id}>
            <Link
              href={`/decks/${d.id}`}
              className="flex items-center gap-4 rounded-lg p-4 bg-[color:var(--surface)] [border:1px_solid_var(--border-strong)] hover:bg-[color:var(--elevated)]"
            >
              <div className="min-w-0 flex-1">
                <div
                  className="font-display font-semibold text-[16px]"
                  style={{ color: "var(--fg)" }}
                >
                  {d.name}
                </div>
                <div className="mt-1 text-[12px]" style={{ color: "var(--fg-muted)" }}>
                  {d.commanderName}
                </div>
              </div>
              <div
                className="font-mono text-[13px] flex-shrink-0"
                style={{ color: "var(--fg)" }}
              >
                {d.cardCount}/99
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
