/**
 * The life tracker's drawn icons, from the design handoff's icon boards (I1): 24-unit line icons that take their colour
 * from `currentColor`. The four with official art (poison, energy, tickets, The Ring) are files in `public/tracker/`
 * and drawn by `OfficialIcon`; these are the ones with no official symbol. Decorative: the name sits beside the icon.
 */
import type { SVGProps } from "react";
import type { CounterKey } from "@/lib/tracker/engine";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

/** The panel's sheet opener (F04 `.mk`): a chevron pointing up, into the sheet that rises from the panel. */
export const SheetChevronIcon = (props: IconProps) => (
  <Icon strokeWidth={2} {...props}>
    <path d="M6 15l6-6 6 6"/>
  </Icon>
);

/** The panel's tax badge (F14 `.bd`): an arrow up, the cost going up. */
export const TaxUpIcon = (props: IconProps) => (
  <Icon strokeWidth={2.1} {...props}>
    <path d="M12 4v16M5 11l7-7 7 7"/>
  </Icon>
);

/** End turn's arrow (F04 `.endt`). */
export const EndTurnIcon = (props: IconProps) => (
  <Icon strokeWidth={2.2} {...props}>
    <path d="M5 12h12M13 6l6 6-6 6"/>
  </Icon>
);

export const RadIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="1.6"/><path d="M10.20 8.88L7.50 4.21A9 9 0 0 1 16.50 4.21L13.80 8.88A3.6 3.6 0 0 0 10.20 8.88z"/><path d="M15.60 12.00L21.00 12.00A9 9 0 0 1 16.50 19.79L13.80 15.12A3.6 3.6 0 0 0 15.60 12.00z"/><path d="M10.20 15.12L7.50 19.79A9 9 0 0 1 3.00 12.00L8.40 12.00A3.6 3.6 0 0 0 10.20 15.12z"/>
  </Icon>
);

export const DayNightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 1 0 0-7.6z"/><path d="M9 2.5v2M9 19.5v2M2.5 12h2M4.4 7.4l1.4 1.4M4.4 16.6l1.4-1.4"/><path d="M15.5 4.5a7.5 7.5 0 1 1-2.6 14.6 6 6 0 0 0 2.6-14.6z" fill="currentColor" strokeWidth="1.2"/>
  </Icon>
);

export const BlessingIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 20.5h18"/><path d="M4.5 20.5v-3h15v3"/><path d="M6.5 17.5v-3h11v3"/><path d="M8.5 14.5v-3h7v3"/><path d="M12 11.5V7"/><circle cx="12" cy="4.6" r="1.8"/>
  </Icon>
);

export const DungeonIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="8.5" y="2.5" width="7" height="5" rx="1"/><rect x="3" y="16.5" width="7" height="5" rx="1"/><rect x="14" y="16.5" width="7" height="5" rx="1"/><path d="M10.5 7.5l-3.5 9M13.5 7.5l3.5 9"/>
  </Icon>
);

export const InitiativeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 4.5h5v4h4v4h4v4h3.5"/><path d="M4 20.5h16.5"/><path d="M7 11.5v6M4.5 15l2.5 2.5L9.5 15"/>
  </Icon>
);

/** The centre strip's own marks (P1): day, night, dice and undo. */
export const SunIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>
  </Icon>
);

export const MoonIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>
  </Icon>
);

export const D6Icon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>
  </Icon>
);

export const D20Icon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 2.5l8.5 5v9l-8.5 5-8.5-5v-9z"/><path d="M12 7.5l4.5 7.5h-9z"/>
  </Icon>
);

export const CoinIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/>
  </Icon>
);

export const UndoIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 7L4 12l5 5"/><path d="M4 12h10a5 5 0 010 10h-2"/>
  </Icon>
);

/** The strip's Menu (M1 `more`): three dots. */
export const MoreIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none"/>
  </Icon>
);

/** The Menu's Back to the table (M1 `door`): an arrow out through a door frame. */
export const DoorIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>
  </Icon>
);

export const MonarchIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 18l2-10 4.3 4L12 5l2.2 7 4.3-4 2 10z"/><path d="M5 21h14"/>
  </Icon>
);

export const ExperienceIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 20l6-4 6 4"/><path d="M6 14.5l6-4 6 4"/><path d="M6 9l6-4 6 4"/>
  </Icon>
);

export const SpeedIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.52 14.91A8.5 8.5 0 0 1 5.58 9.92"/><path d="M6.42 9.08A8.5 8.5 0 0 1 11.41 7.02"/><path d="M12.59 7.02A8.5 8.5 0 0 1 17.58 9.08"/><path d="M18.42 9.92A8.5 8.5 0 0 1 20.48 14.91" opacity=".35"/><path d="M12 15.5L15.73 10.18"/><circle cx="12" cy="15.5" r="1.4" fill="currentColor"/>
  </Icon>
);

export const StormIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 8.5h13"/><path d="M6 12h11"/><path d="M8.5 15.5h7"/><path d="M11 19h3.5"/><path d="M17 8.5c2 0 3-1.2 3-2.5S19 3.5 17 3.5H8"/>
  </Icon>
);

export const TaxIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5"/><path d="M12 16.5v-9M8.5 11l3.5-3.5 3.5 3.5"/>
  </Icon>
);

/**
 * The counters with official art: a file in `public/tracker/`. Poison, tickets and The Ring are one-colour art, so they
 * are painted in the surrounding text colour through a mask. Energy is a black badge with a white bolt, which a mask
 * would flatten to a silhouette, so it is drawn as the image it is.
 */
const OFFICIAL_FILE = { poison: "phyrexian", energy: "energy", tickets: "tickets", ring: "ring" } as const;

export function OfficialIcon({ kind, size = 20, className }: { kind: keyof typeof OFFICIAL_FILE; size?: number; className?: string }) {
  const src = `/tracker/${OFFICIAL_FILE[kind]}.svg`;
  if (kind === "energy") {
    // eslint-disable-next-line @next/next/no-img-element -- a fixed local SVG; next/image adds nothing
    return <img src={src} alt="" width={size} height={size} aria-hidden="true" className={className} style={{ flex: "none" }} />;
  }
  const maskValue = `url(${src}) center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", width: size, height: size, flex: "none", backgroundColor: "currentColor", WebkitMask: maskValue, mask: maskValue }}
    />
  );
}

/** The icon for each counter the sheet offers. */
export function CounterIcon({ kind, size }: { kind: CounterKey; size?: number }) {
  switch (kind) {
    case "poison":
    case "energy":
    case "tickets":
    case "ring":
      return <OfficialIcon kind={kind} size={size} />;
    case "experience":
      return <ExperienceIcon size={size} />;
    case "rad":
      return <RadIcon size={size} />;
    case "speed":
      return <SpeedIcon size={size} />;
    case "storm":
      return <StormIcon size={size} />;
    case "blessing":
      return <BlessingIcon size={size} />;
    case "dungeon":
      return <DungeonIcon size={size} />;
  }
}
