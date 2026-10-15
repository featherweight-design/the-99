// The trophy the game log draws for a seat that won (the form's seat, a Matchups row's beat count, a History
// `vs` line's winner). A trophy, not a crown: the rail's Commanders icon is a crown. Decorative: the button or
// row that holds it names the meaning.
export function TrophyIcon({ size = 15 }: { size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 2.5h7v4a3.5 3.5 0 0 1-7 0v-4Z" />
      <path d="M4.5 4H2.5a1.5 1.5 0 0 0 2 2.3M11.5 4h2a1.5 1.5 0 0 1-2 2.3M8 10v2.5M5.5 13.5h5" />
    </svg>
  );
}
