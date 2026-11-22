def sub(path, old, new):
    s = open(path).read()
    if s.count(old) != 1: raise SystemExit(f"MISS/DUP {s.count(old)} in {path}: {old[:80]!r}")
    open(path, "w").write(s.replace(old, new))
M = "src/components/cards/card-modal.tsx"; S = "src/components/cards/card-modal-sheet.tsx"
sub(M, 'import { PrintingRegion, printingKey } from "./printing-region";',
       'import { PrintingRegion, printingKey } from "./printing-region";\nimport { PrintingStrip, type StripPrinting } from "./printing-strip";')
sub(M, "  const [expanded, setExpanded] = useState(false);", "  const [expanded, setExpanded] = useState<boolean>((globalThis as any).__EXPANDED ?? false);")
sub(M, "  const [previewId, setPreviewId] = useState<string | null>(null);", "  const [previewId, setPreviewId] = useState<string | null>((globalThis as any).__PREVIEW ?? null);")
sub(M, ": others.find((x) => x.scryfallId === previewId);", ": [...card.printings, ...others].find((x) => x.scryfallId === previewId);")
sub(M, "    doorHeight,\n", "    doorHeight: doorHeight + ((globalThis as any).__STRIPH ?? 0),\n")
sub(M, "  const hasPicker = browse || browseOwned || ownedPrintings.length > 1", "  const hasPicker = ownedPrintings.length > 1")
sub(M, "  const renderRegion = (id: string) => hasPicker && expanded ? (\n    browseOwned ? (", "  const renderRegion = (id: string) => hasPicker && expanded ? (\n    false ? (")
sub(M, "      {...(browseOwned ? { intro: null, finishChips: false } : {})}", "")
sub(M, "  const caption = printingCaption(preview, ownedPrintings);",
"""  const caption = printingCaption(preview, ownedPrintings);
  // R2: every printing as a strip of thumbs; selecting one shows it here and stores nothing.
  const stripPrintings: StripPrinting[] | null = browse ? card.printings : browseOwned ? [
    ...[...ownedPrintings].sort((a, b) => Number(pick !== null && printingKey(b) === `${pick.setCode}|${pick.collectorNumber}`) - Number(pick !== null && printingKey(a) === `${pick.setCode}|${pick.collectorNumber}`))
      .map((p) => ({ ...p, mine: true, pick: pick !== null && printingKey(p) === `${pick.setCode}|${pick.collectorNumber}` })),
    ...others,
  ] : null;
  const shownKey = resolved ? resolved.scryfallId ?? printingKey(resolved) : null;
  const strip = stripPrintings ? (paddles: boolean) => (
    <PrintingStrip printings={stripPrintings} shownKey={shownKey} cardName={card.name} paddles={paddles} onSelect={(p) => setPreviewId(p.scryfallId ?? null)} />
  ) : null;""")
sub(M, "          browse={browse} printingTotal={browseOwned ? ownedPrintings.length + others.length : null} onlyPrinting={onlyPrinting}",
       "          browse={false} printingTotal={null} onlyPrinting={onlyPrinting} strip={strip}")
sub(S, "  doorStrip: ReactNode;", "  doorStrip: ReactNode;\n  strip?: ((paddles: boolean) => ReactNode) | null;")
sub(S, "fromLine, doorStrip, footer,", "fromLine, doorStrip, strip, footer,")
sub(S, "        {isToken ? null : <OwnedLine card={card} deckPage={deckPage} />}\n      </div>\n",
"""        {isToken ? null : <OwnedLine card={card} deckPage={deckPage} />}
      </div>
      {strip && !full ? <div inert={min} className="md:hidden mt-[14px]">{strip(false)}</div> : null}
      {strip ? <div className="hidden md:block mt-[20px]">{strip(true)}</div> : null}
""")
print("ok")
