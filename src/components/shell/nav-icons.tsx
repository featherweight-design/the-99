// The four rail/tab glyphs — 19px, currentColor, 1.5px, round caps
// (design/design_handoff_the99_refresh/CHROME-rail-and-tabs.md §The rail).
//
// ONE component for both chromes. The handoff calls out that the slots must not
// transpose between the rail and the tab bar, and that was caught in review
// once already; two icon sets is the only way for it to happen again.
//
// The shapes are an engineering call — the handoff fixes the geometry and not
// the drawing. They stay rectilinear with one rotated square, so they read as
// siblings of the app mark rather than as a borrowed icon set.

export type NavHref = "/" | "/collection" | "/commanders" | "/decks";

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 19 19"
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
    // Home — a roof over a threshold.
    case "/":
      return (
        <Svg>
          <path d="M2.75 8.25 9.5 3l6.75 5.25V15a1.25 1.25 0 0 1-1.25 1.25h-11A1.25 1.25 0 0 1 2.75 15Z" />
          <path d="M7.75 16.25v-4.5h3.5v4.5" />
        </Svg>
      );
    // Collection — two cards, one behind the other.
    case "/collection":
      return (
        <Svg>
          <rect x="6.5" y="3.25" width="9.75" height="12.5" rx="1.5" />
          <path d="M12.5 16.75H4.25A1.5 1.5 0 0 1 2.75 15.25V6.5" />
        </Svg>
      );
    // Commanders — the app's rotated square, crowned by the same two ticks the
    // wordmark uses.
    case "/commanders":
      return (
        <Svg>
          <path d="M9.5 6.75 13 10.25 9.5 13.75 6 10.25Z" />
          <path d="M4.75 4.25 6.5 2.5M14.25 4.25 12.5 2.5M4 16.5h11" />
        </Svg>
      );
    // Decks — a stack of three.
    case "/decks":
      return (
        <Svg>
          <rect x="2.75" y="3.25" width="13.5" height="7" rx="1.5" />
          <path d="M4.25 12.75h10.5M5.75 15.75h7" />
        </Svg>
      );
  }
}
