def sub(path, old, new):
    s = open(path).read()
    if s.count(old) != 1: raise SystemExit(f"MISS/DUP {s.count(old)} in {path}: {old[:80]!r}")
    open(path, "w").write(s.replace(old, new))
G = "(globalThis as any)"
M = "src/components/cards/card-modal.tsx"; W = "src/components/wishlist/card-wishlist.tsx"; P = "src/components/cards/printings-panel.tsx"
T = "src/components/cards/printing-strip.tsx"; C = "src/components/decks/cart/cart-line.tsx"; V = "src/components/wishlist/wishlist-tile.tsx"
sub(M, "forceFull: landsFull || startsFull,", f"forceFull: {G}.__FULL || landsFull || startsFull,")
# Wishlist box: the Printing line under the want row
sub(W, 'import { useMergedRef } from "../ui/use-merged-ref";', 'import { useMergedRef } from "../ui/use-merged-ref";\nimport { WishlistPrintingLine, SoldOutNote } from "./wishlist-printing";')
sub(W, "      <SocialToast toast={toast}", "      {want !== null ? <><WishlistPrintingLine /><SoldOutNote /></> : null}\n      <SocialToast toast={toast}")
# Panel: wanted mark on the thumb, and the foot
sub(P, 'import { stripKey, type StripPrinting } from "./printing-strip";', 'import { stripKey, type StripPrinting } from "./printing-strip";\nimport { Bookmark, PanelFoot } from "../wishlist/wishlist-printing";')
sub(P, '        {p.pick ? "◆ " : ""}', '        {(globalThis as any).__W && (globalThis as any).__W.set === p.setCode && (globalThis as any).__W.num === p.collectorNumber ? <span style={{ color: "var(--accent-text)", display: "inline-block", verticalAlign: "-1px", marginRight: 3 }}><Bookmark size={9} /></span> : null}{p.pick ? "◆ " : ""}')
sub(P, "      </div>\n    </div>\n  );\n}\n\n/** A: the Set line", "      </div>\n      <PanelFoot />\n    </div>\n  );\n}\n\n/** A: the Set line")
# Tile: set line under the caption
sub(V, 'import { HydratedImg } from "../ui/hydrated-art";', 'import { HydratedImg } from "../ui/hydrated-art";\nimport { TileSetLine } from "./wishlist-printing";')
sub(V, "export type WishlistTileCard = { name: string; imageUri: string | null; want: number; have: number | null };", "export type WishlistTileCard = { name: string; imageUri: string | null; want: number; have: number | null; printing?: { set: string; num: string; soldOut?: boolean } | null };")
sub(V, """          />
        </span>
      </span>
    </>""", """          />
        </span>
        {tile.printing ? <TileSetLine {...tile.printing} /> : null}
      </span>
    </>""")
print("ok")
