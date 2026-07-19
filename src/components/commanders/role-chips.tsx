// Role Chips — 4 chips (Ramp/Draw/Removal/Wipes) count/target.
// Gap state (count < target): amber border + amber count + " gap" suffix.
// §Role Chips (on list card).

import { ROLE_TARGETS } from "../../lib/recs/roles";

type RoleName = "ramp" | "draw" | "removal" | "wipes";

const ROLE_LABELS: Record<RoleName, string> = {
  ramp:    "Ramp",
  draw:    "Draw",
  removal: "Removal",
  wipes:   "Wipes",
};

const ROLE_ORDER: RoleName[] = ["ramp", "draw", "removal", "wipes"];

type RoleChipsProps = {
  roleCounts: Record<RoleName, number>;
};

export function RoleChips({ roleCounts }: RoleChipsProps) {
  return (
    // Row wrapper — mobile gap 5px / desktop 6px
    <div className="flex flex-wrap gap-[5px] sm:gap-[6px]">
      {ROLE_ORDER.map((role) => {
        const count = roleCounts[role];
        const target = ROLE_TARGETS[role];
        const isGap = count < target;

        return (
          // Chip — mobile: padding 3px 8px, font 10px / desktop: 4px 10px, font 11px
          <span
            key={role}
            className="inline-flex items-center font-mono rounded-full text-[10px] sm:text-[11px] px-[8px] py-[3px] sm:px-[10px] sm:py-[4px]"
            style={{
              background: "#2A241D",
              border: isGap ? "1px solid #4A3A24" : "1px solid #3A3229",
            }}
          >
            {/* Label — uppercase */}
            <span
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#8E8269",
              }}
            >
              {ROLE_LABELS[role]}
            </span>
            {/* Space between label and count */}
            <span className="mx-[4px]" />
            {/* Count */}
            <span
              style={{
                fontWeight: 600,
                color: isGap ? "#E0913C" : "#EDE6D8",
              }}
            >
              {count}/{target}
            </span>
            {/* " gap" suffix for gap state */}
            {isGap && (
              <span style={{ color: "#E0913C" }}>&nbsp;gap</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
