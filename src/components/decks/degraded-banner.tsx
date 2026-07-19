// Degraded Suggestions Banner — §Degraded Suggestions Banner.
// Server component + inline retry <form>.
import { retryDeck } from "../../app/decks/[id]/actions";

interface DegradedBannerProps {
  deckId: string;
}

export function DegradedBanner({ deckId }: DegradedBannerProps) {
  const retryAction = retryDeck.bind(null, deckId);

  return (
    /*
      §Banner container
      mobile:  m 14px 16px 6px, bg #211C15, border 1px #3A3229, border-left 3px #E0913C, br 10px, p 12px 14px
      desktop: m 14px 16px 4px, bg #211C15, border 1px #3A3229, border-left 3px #E0913C, br 10px, p 13px 15px
    */
    <div
      className="mx-[16px] mt-[14px] mb-[6px] md:mb-[4px] rounded-[10px] px-[14px] py-[12px] md:px-[15px] md:py-[13px]"
      role="alert"
      aria-live="polite"
      style={{
        background: "#211C15",
        border: "1px solid #3A3229",
        borderLeft: "3px solid #E0913C",
      }}
    >
      {/* §Banner — header row */}
      <div className="flex items-center gap-[9px] md:gap-[10px]">
        {/* §Banner — warning icon */}
        <div
          className="flex-none flex items-center justify-center rounded-full font-bold"
          style={{
            width: 22,
            height: 22,
            border: "1.5px solid #E0913C",
            color: "#E0913C",
            fontSize: 12,
          }}
          aria-hidden
        >
          !
        </div>

        {/* §Banner — "Synergy data offline" heading */}
        <span
          className="font-semibold text-[12.5px] md:text-[13px]"
          style={{ color: "#EDE6D8" }}
        >
          Synergy data offline
        </span>

        {/* §Banner — Retry: link on mobile, button on desktop */}
        <form action={retryAction} className="ml-auto">
          {/* Mobile: text link */}
          <button
            type="submit"
            className="md:hidden text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
            style={{ color: "#C9A24B", background: "transparent", border: "none" }}
          >
            Retry
          </button>

          {/* Desktop: outlined button */}
          <button
            type="submit"
            className="hidden md:inline-flex items-center rounded-[7px] font-sans font-semibold text-[12px] px-[12px] py-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B]"
            style={{
              color: "#EDE6D8",
              background: "transparent",
              border: "1px solid #3A3229",
            }}
          >
            Retry
          </button>
        </form>
      </div>

      {/* §Banner — body text */}
      <p
        className="text-[11.5px] md:text-[12px] leading-[1.5] md:leading-[1.55] mt-[7px] md:mt-[9px]"
        style={{ color: "#C6B79A" }}
      >
        We couldn&apos;t reach EDHREC. Suggestions are ranked by role coverage from your owned
        cards; retry to pull synergy picks.
      </p>
    </div>
  );
}
