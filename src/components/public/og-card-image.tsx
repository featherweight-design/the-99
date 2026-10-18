import { identityGradient } from "../../lib/cards/gradients";
import { publicPagesCopy } from "../../lib/copy/public-pages";
import type { PublicCard } from "../../lib/public/card";
import { frontCostSymbols, previewTypeLine } from "../../lib/public/preview";

/**
 * The card page's link-preview image (C2, README call 8): 1200x630, drawn by `next/og` from this tree. The board draws it at
 * 600x315, so every figure here is the board's doubled. The card over its own blurred art, the kicker, the name, the cost and
 * the type, and the lockup bottom right; with no image, the card box and the ground are the identity gradient and the cost
 * is left out (C2's tag table: "the identity gradient, name and type").
 *
 * NOT a page component: it renders once into a PNG, so its colours are the default theme's literal values (the board's
 * `:root`), not tokens, and every box with more than one child is `display: flex` (the renderer's rule). The cost is drawn as
 * the board draws it, lettered discs, not the app's mana sprite.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** The default theme's tokens, by name (`og-card-image.test.tsx` pins each to globals.css): a visitor always gets it. */
export const INK = {
  bg: "#14110E", fg: "#EDE6D8", "fg-body": "#C0B8A6", "fg-muted": "#A59C89", accent: "#CF8745", elevated: "#29241F", "border-dashed": "#494037",
} as const;
/** The board's pip fills, the default theme's five colour tokens (`--w` to `--g`); `--border-dashed` for any other symbol. */
export const PIP: Readonly<Record<string, string>> = { W: "#F4E9C4", U: "#3A6AA5", B: "#98748F", R: "#C05A3E", G: "#4B7A46" };

function Pip({ symbol }: { symbol: string }) {
  const fill = PIP[symbol];
  const label = symbol.replace(/\//g, "");
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 18,
        background: fill ?? INK["border-dashed"], color: fill ? INK.bg : INK.fg, fontFamily: "Mono", fontWeight: 600,
        fontSize: label.length > 2 ? 12 : 18, boxShadow: "inset 0 0 0 2px rgba(0,0,0,.35)",
      }}
    >
      {label}
    </div>
  );
}

/**
 * The crown over the numeral and the wordmark, as the board draws it: the rail mark's outlined form (`src/app/icon.svg`'s
 * geometry). The card's preview sets it bottom right, the commander's bottom left.
 */
export function Lockup({ at }: { at: { left: number; bottom: number } | { right: number; bottom: number } }) {
  const numeral =
    "M116 -38 112 -31Q219 2 279.5 43.0Q340 84 368.0 136.0Q396 188 403.0 253.5Q410 319 410 402Q410 485 406.0 540.5Q402 596 386.5 623.5Q371 651 334 651Q297 651 278.0 626.5Q259 602 252.0 563.0Q245 524 245 478Q245 421 251.5 389.0Q258 357 269.5 341.5Q281 326 295 320Q318 311 337.5 317.0Q357 323 370 331L377 323Q363 292 333.0 272.0Q303 252 264.0 246.0Q225 240 185.0 249.5Q145 259 111.5 285.5Q78 312 58.0 357.0Q38 402 40 467Q42 534 73.0 589.0Q104 644 168.0 677.0Q232 710 331 711Q478 713 556.5 633.0Q635 553 635 381Q635 274 603.0 189.5Q571 105 506.0 49.0Q441 -7 344.0 -30.5Q247 -54 116 -38Z";
  return (
    <div style={{ position: "absolute", ...at, display: "flex", alignItems: "center", gap: 18 }}>
      <svg width="52" height="52" viewBox="8 6 48 48">
        <rect x="12.007" y="11.703" width="7.381" height="7.381" transform="rotate(45 15.697 15.393)" fill={INK.accent} />
        <rect x="26.772" y="10.165" width="10.456" height="10.456" transform="rotate(45 32.000 15.393)" fill={INK.accent} />
        <rect x="44.612" y="11.703" width="7.381" height="7.381" transform="rotate(45 48.303 15.393)" fill={INK.accent} />
        <path transform="translate(12.903 49.849) scale(0.028293 -0.028293)" fill={INK.fg} d={numeral} />
        <path transform="translate(32.000 49.849) scale(0.028293 -0.028293)" fill={INK.fg} d={numeral} />
      </svg>
      <div style={{ display: "flex", fontFamily: "Mono", fontSize: 19, letterSpacing: "0.36em", textTransform: "uppercase", color: INK.accent }}>
        {publicPagesCopy.shell.wordmark}
      </div>
    </div>
  );
}

export type OgCardInput = Pick<PublicCard, "name" | "faces" | "typeLine" | "manaCost" | "colorIdentity" | "imageUri" | "artCropUri">;

/**
 * The tree for one card. `pictured: false` draws the no-image form even when the catalog has an image: the route's fallback
 * when Scryfall's image host does not answer.
 */
export function OgCardImage({ card, pictured = card.imageUri !== null }: { card: OgCardInput; pictured?: boolean }) {
  const gradient = identityGradient(card.colorIdentity);
  const art = card.artCropUri ?? card.imageUri;
  const name = card.faces[0]?.name ?? card.name;
  const cost = pictured ? frontCostSymbols(card.manaCost) : [];
  return (
    <div style={{ ...OG_SIZE, display: "flex", position: "relative", overflow: "hidden", background: INK.bg, fontFamily: "Sans" }}>
      {pictured && art ? (
        // eslint-disable-next-line @next/next/no-img-element -- drawn into a PNG by `next/og`, never served as a page.
        <img
          src={art}
          alt=""
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(36px)", transform: "scale(1.2)", opacity: 0.5 }}
        />
      ) : (
        <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", backgroundImage: gradient, opacity: 0.18 }} />
      )}
      <div
        style={{
          position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
          backgroundImage: "linear-gradient(90deg, rgba(20,17,14,.35) 0%, rgba(20,17,14,.88) 48%, rgba(20,17,14,.96) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute", left: 80, top: 60, width: 364, height: 508, borderRadius: 18, overflow: "hidden", display: "flex",
          background: pictured ? INK.elevated : gradient, boxShadow: "0 48px 100px rgba(0,0,0,.55)",
        }}
      >
        {pictured && card.imageUri ? (
          // eslint-disable-next-line @next/next/no-img-element -- as above.
          <img src={card.imageUri} alt="" width={364} height={508} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
      </div>
      <div style={{ position: "absolute", left: 524, right: 72, top: 92, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", fontFamily: "Mono", fontSize: 20, letterSpacing: "0.3em", textTransform: "uppercase", color: INK.accent }}>
          {publicPagesCopy.linkPreview.ogCardKicker}
        </div>
        <div style={{ display: "flex", fontFamily: "Display", fontWeight: 700, fontSize: 54, lineHeight: 1.1, color: INK.fg }}>{name}</div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          {cost.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {cost.map((symbol, i) => <Pip key={i} symbol={symbol} />)}
            </div>
          ) : null}
          <div style={{ display: "flex", fontSize: 26, lineHeight: 1.4, color: INK["fg-muted"] }}>{previewTypeLine(card)}</div>
        </div>
      </div>
      <Lockup at={{ right: 60, bottom: 48 }} />
    </div>
  );
}
