// The four rail/tab glyphs — 19px, currentColor, 1.5px, round caps
// (design/design_handoff_the99_refresh/CHROME-rail-and-tabs.md §The rail).
//
// ONE component for both chromes. The handoff calls out that the slots must not
// transpose between the rail and the tab bar, and that was caught in review
// once already; two icon sets is the only way for it to happen again.
//
// The paths are transcribed from the handoff frames ("The 99 - Refresh · Home
// and Decks.dc.html"), which draw all four glyphs — they are not an engineering
// invention. Note the 20-unit viewBox rendered at 19px: that is what the frames
// specify, and changing it rescales every stroke.

export type NavHref = "/" | "/collection" | "/commanders" | "/decks";

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function NavIcon({ href }: { href: NavHref }) {
  switch (href) {
    case "/":
      return (
        <Svg>
          <path d="M3 9.2 10 3.6l7 5.6V16a1 1 0 0 1-1 1h-3.5v-4.2h-5V17H4a1 1 0 0 1-1-1z" />
        </Svg>
      );
    case "/collection":
      return (
        <Svg>
          <rect x="3.2" y="3.2" width="5.8" height="5.8" rx="1.2" />
          <rect x="11" y="3.2" width="5.8" height="5.8" rx="1.2" />
          <rect x="3.2" y="11" width="5.8" height="5.8" rx="1.2" />
          <rect x="11" y="11" width="5.8" height="5.8" rx="1.2" />
        </Svg>
      );
    case "/commanders":
      return (
        <Svg>
          <path d="M3 14.5 4.4 6l3.2 3.6L10 4l2.4 5.6L15.6 6 17 14.5z" />
          <path d="M3 16.6h14" />
        </Svg>
      );
    case "/decks":
      return (
        <Svg>
          <rect x="6.6" y="3.2" width="10" height="13" rx="1.6" />
          <path d="M4.2 5.4A1.6 1.6 0 0 0 3.4 6.8v8.6a1.6 1.6 0 0 0 1.6 1.6h8.2" />
        </Svg>
      );
  }
}
