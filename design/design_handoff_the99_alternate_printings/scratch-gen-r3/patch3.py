def sub(path, old, new):
    s = open(path).read()
    if s.count(old) != 1: raise SystemExit(f"MISS/DUP {s.count(old)} in {path}: {old[:80]!r}")
    open(path, "w").write(s.replace(old, new))
M = "src/components/cards/card-modal.tsx"; S = "src/components/cards/card-modal-sheet.tsx"; T = "src/components/cards/printing-strip.tsx"
G = "(globalThis as any)"
sub(M, "  const [previewId, setPreviewId] = useState<string | null>(null);", f"  const [previewId, setPreviewId] = useState<string | null>({G}.__PREVIEW ?? null);")
sub(M, "  const hasStrip = stripCount > 1;", f"  const hasStrip = stripCount > ({G}.__RESERVE ? 0 : 1);")
sub(M, "(narrow && hasStrip ? PRINTING_STRIP_TEASER_HEIGHT : 0)", f"({G}.__STRIPH ?? (narrow && hasStrip ? PRINTING_STRIP_TEASER_HEIGHT : 0))")
sub(M, "onlyPrinting={onlyPrinting} strip={strip}", "onlyPrinting={onlyPrinting} strip={strip} stripPrintings={stripPrintings} shownKey={shownKey}")
sub(S, "  strip: ((paddles: boolean) => ReactNode) | null;", "  strip: ((paddles: boolean) => ReactNode) | null;\n  stripPrintings?: any[];\n  shownKey?: string | null;")
sub(S, "fromLine, doorStrip, strip, footer,", "fromLine, doorStrip, strip, stripPrintings, shownKey, footer,")
sub(S, 'import { ManaCost } from "./mana-pips";', 'import { ManaCost } from "./mana-pips";\nimport { PrintingsPanel, PrintingsButton } from "./printings-panel";')
# A: the set line becomes the button
sub(S, """          <span data-testid="teaser-set" className="font-mono text-[12px]" style={{ color: "var(--fg-muted)" }}>
            {cardSheetCopy.printing(resolved.setCode, resolved.collectorNumber)}
          </span>""",
f"""          {G}.__BUTTON && (stripPrintings?.length ?? 0) > 1 ? <PrintingsButton set={{resolved.setCode}} number={{resolved.collectorNumber}} total={{stripPrintings!.length}} /> : <span data-testid="teaser-set" className="font-mono text-[12px]" style={{{{ color: "var(--fg-muted)" }}}}>
            {{cardSheetCopy.printing(resolved.setCode, resolved.collectorNumber)}}
          </span>""")
sub(S, '      {strip && !full ? <div inert={min} className="md:hidden mt-[14px]">{strip(false)}</div> : null}',
f'''      {{strip && !full && !{G}.__BUTTON ? <div inert={{min}} className="md:hidden mt-[14px]">{{strip(false)}}</div> : null}}
      {{{G}.__PANEL ? <div className="md:hidden absolute inset-x-0 top-[22px] bottom-0 z-10 pb-[34px]" style={{{{ background: "var(--surface-rail)" }}}}><PrintingsPanel printings={{stripPrintings ?? []}} shownKey={{shownKey ?? null}} query={{{G}.__QUERY ?? ""}} cols={{5}} thumbW={{62}} cardName={{card.name}} /></div> : null}}
      {{{G}.__PANEL ? <div className="hidden md:block absolute left-[24px] right-[24px] top-[150px] z-20 h-[400px] rounded-[12px] pt-[12px]" style={{{{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", boxShadow: "0 22px 50px rgba(0,0,0,0.6)" }}}}><PrintingsPanel printings={{stripPrintings ?? []}} shownKey={{shownKey ?? null}} query={{{G}.__QUERY ?? ""}} cols={{6}} thumbW={{62}} cardName={{card.name}} /></div> : null}}''')
# B: the strip's leading search tile, and the one-printing line
sub(T, 'import { printingKey } from "./printing-region";', 'import { printingKey } from "./printing-region";\nimport { SearchTile } from "./printings-panel";')
sub(T, "          {printings.map((p, i) => {", f"          {{{G}.__TILE && printings.length > 1 ? <SearchTile /> : null}}\n          {{printings.map((p, i) => {{")
print("ok")
