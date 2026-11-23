// The Find a deck door's two-diamond glyph, drawn rather than typed so it takes the accent's outline. Its own module so
// the collection's buttons, which the landing demo's grid also draws, carry no door (and none of its imports).
export function FitsGlyph() {
  return (
    <span aria-hidden="true" className="flex gap-[3px]">
      {[0, 1].map((i) => (
        <span key={i} className="w-[6px] h-[6px] rotate-45 border-[1.5px] border-[color:var(--accent)]" />
      ))}
    </span>
  );
}
