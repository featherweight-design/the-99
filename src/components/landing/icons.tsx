// The landing's line icons (20-unit box, 1.5 stroke, ink from `currentColor`), transcribed from the handoff's generator
// (`scratch-gen/lp.py` ICON and ICO). Decorative: each is `aria-hidden`, and the words beside it carry the meaning.
const PATHS = {
  collection: '<rect x="3.2" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="3.2" width="5.8" height="5.8" rx="1.2"/><rect x="3.2" y="11" width="5.8" height="5.8" rx="1.2"/><rect x="11" y="11" width="5.8" height="5.8" rx="1.2"/>',
  commanders: '<path d="M3 14.5 4.4 6l3.2 3.6L10 4l2.4 5.6L15.6 6 17 14.5z"/><path d="M3 16.6h14"/>',
  decks: '<rect x="6.6" y="3.2" width="10" height="13" rx="1.6"/><path d="M4.2 5.4A1.6 1.6 0 0 0 3.4 6.8v8.6a1.6 1.6 0 0 0 1.6 1.6h8.2"/>',
  cart: '<path d="M2.8 3.6h2.1l1.7 9.2a1.4 1.4 0 0 0 1.4 1.1h6.6a1.4 1.4 0 0 0 1.4-1.1l1.1-5.8H5.6"/><circle cx="8.4" cy="16.6" r="1"/><circle cx="14.4" cy="16.6" r="1"/>',
  gift: '<path d="M3 9h14v8.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M2 6h16v3H2z"/><path d="M10 6v12.5"/><path d="M10 6C8.6 3 5.4 2.6 5 4.4 4.6 6 7.6 6 10 6zM10 6c1.4-3 4.6-3.4 5-1.6C15.4 6 12.4 6 10 6z"/>',
  sun: '<circle cx="10" cy="10" r="3.4"/><path d="M10 2.2v2M10 15.8v2M2.2 10h2M15.8 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M4.5 15.5l1.4-1.4M14.1 5.9l1.4-1.4"/>',
  overview: '<rect x="4" y="2.5" width="12" height="15" rx="1.5"/><path d="M7 6.5h6M7 9.5h6M7 12.5h4"/>',
  changes: '<path d="M3 7h12l-3-3M17 13H5l3 3"/>',
  deeper: '<circle cx="8.5" cy="8.5" r="5"/><path d="m12.3 12.3 4.5 4.5"/>',
  choose: '<circle cx="10" cy="10" r="7.2"/><path d="m12.8 7.2-1.8 4.6-4.6 1.8 1.8-4.6z"/>',
  which: '<rect x="2.5" y="4" width="8" height="11.5" rx="1.2"/><path d="M13 6.5h4.5M13 10h4.5M13 13.5h3"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}
