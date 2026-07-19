"use client";
// Page Header — /commanders list (§Page Header — /commanders list).
// Mobile: padding 20px 18px 12px, border-bottom 1px solid #2A241D, account avatar trigger 34×34px.
// Desktop: padding 28px 34px 0, no border-bottom.
// Title: Cinzel 700, 22px mobile / 30px desktop, #EDE6D8.
// Subtitle: IBM Plex Mono, 11px mobile / 12px desktop, #8E8269, margin-top 2/4px.

import { UserButton } from "@clerk/nextjs";

type PageHeaderProps = {
  uniqueCardsRead: number;
};

export function PageHeader({ uniqueCardsRead }: PageHeaderProps) {
  return (
    <>
      {/* ── Mobile header ── */}
      <div
        className="sm:hidden flex items-center justify-between"
        style={{
          padding: "20px 18px 12px",
          borderBottom: "1px solid #2A241D",
        }}
      >
        <div>
          {/* Title */}
          <h1
            className="font-display font-bold m-0"
            style={{ fontSize: 22, color: "#EDE6D8" }}
          >
            Commanders
          </h1>
          {/* Subtitle */}
          <p
            className="font-mono m-0"
            style={{
              fontSize: 11,
              color: "#8E8269",
              marginTop: 2,
            }}
          >
            {uniqueCardsRead.toLocaleString("en-US")} cards scanned
          </p>
        </div>

        {/* Mobile account avatar trigger: 34×34px, border-radius 10px, brass border */}
        {/* §Mobile — account avatar trigger: width 34px, height 34px, br 10px, border #C9A24B */}
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox:
                "h-[34px] w-[34px] rounded-[10px] border border-[#C9A24B]",
            },
          }}
        />
      </div>

      {/* ── Desktop header ── */}
      <div
        className="hidden sm:flex items-end justify-between"
        style={{ padding: "28px 34px 0" }}
      >
        <div>
          {/* Title */}
          <h1
            className="font-display font-bold m-0"
            style={{ fontSize: 30, color: "#EDE6D8" }}
          >
            Commanders
          </h1>
          {/* Subtitle */}
          <p
            className="font-mono m-0"
            style={{
              fontSize: 12,
              color: "#8E8269",
              marginTop: 4,
            }}
          >
            {uniqueCardsRead.toLocaleString("en-US")} cards scanned
          </p>
        </div>
      </div>
    </>
  );
}
