import re
def sub(path, old, new, count=1):
    s = open(path).read()
    if old not in s: raise SystemExit(f"MISS in {path}: {old[:70]!r}")
    s = s.replace(old, new, count); open(path, "w").write(s)

R = "src/components/cards/printing-region.tsx"
# props
sub(R, "  onPick: (p: BrowsePrinting) => void;\n  onReset: () => void;",
"""  onPick: (p: BrowsePrinting) => void;
  /**
   * Alternate printings (#3002): the catalog's printings of this card the reader does NOT own, drawn after the
   * owned ones. Selecting one previews it (art, Set field, price) and stores nothing. Absent, the region is today's.
   */
  others?: BrowsePrinting[];
  onPreview?: (p: BrowsePrinting) => void;
  onReset: () => void;""")
sub(R, "type Entry = BrowsePrinting & { dormant: boolean };", "type Entry = BrowsePrinting & { dormant: boolean; other?: boolean };")
sub(R, "function quantityLabel(p: Entry): string {\n  if (p.dormant) return copy.dormantQty;",
       "function quantityLabel(p: Entry): string {\n  if (p.other) return \"not owned\";\n  if (p.dormant) return copy.dormantQty;")
# entries: append others
sub(R, "    if (dormantPick === null) return owned;",
"""    const rest: Entry[] = props.role === "choose" ? [] : (props.others ?? []).map((p) => ({ ...p, dormant: false, other: true }));
    if (dormantPick === null) return [...owned, ...rest];""")
sub(R, "    out.splice(at === -1 ? owned.length : at, 0, dormantPick);\n    return out;\n  }, [printings, dormantPick, shortList]);",
       "    out.splice(at === -1 ? owned.length : at, 0, dormantPick);\n    return [...out, ...(props.role === \"choose\" ? [] : (props.others ?? []).map((p) => ({ ...p, dormant: false, other: true })))];\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [printings, dormantPick, shortList, props.role === \"choose\" ? null : props.others]);")
# hasOthers
sub(R, "  const overflow = entries.length > OVERFLOW_THRESHOLD;",
       "  const hasOthers = props.role !== \"choose\" && (props.others?.length ?? 0) > 0;\n  const overflow = entries.length > OVERFLOW_THRESHOLD;")
# groups
sub(R, "  const groups = useMemo(() => {\n    if (!grouped) return",
"""  const groups = useMemo(() => {
    if (hasOthers) {
      // #3002: yours first, as one group; then every other printing, by set past the threshold.
      const mine = visible.filter((p) => !p.other);
      const rest = visible.filter((p) => p.other);
      const out: { key: string; label: string; code: string; releasedAt: string | null; items: Entry[]; head?: string }[] = [];
      if (mine.length > 0) out.push({ key: "yours", label: "", code: "", releasedAt: null, items: mine, head: `In your collection · ${mine.length}` });
      if (!grouped || rest.length <= OVERFLOW_THRESHOLD) {
        if (rest.length > 0) out.push({ key: "other", label: "", code: "", releasedAt: null, items: rest, head: mine.length > 0 ? `Other printings · ${rest.length}` : undefined });
        return out;
      }
      const by = new Map<string, { key: string; label: string; code: string; releasedAt: string | null; items: Entry[] }>();
      for (const p of rest) {
        const g = by.get(p.setCode);
        if (g) g.items.push(p);
        else by.set(p.setCode, { key: "o-" + p.setCode, label: p.setName ?? p.setCode, code: p.setCode, releasedAt: p.releasedAt, items: [p] });
      }
      const sets = [...by.values()].sort(compareSetGroups);
      if (mine.length > 0 && sets[0]) (sets[0] as any).lead = `Other printings · ${rest.length}`;
      return [...out, ...sets];
    }
    if (!grouped) return""")
sub(R, "  }, [visible, grouped]);", "  }, [visible, grouped, hasOthers]);")
# pick: preview
sub(R, "    props.onPick(p);\n    props.onAnnounce(",
"""    if ((p as Entry).other) {
      props.onPreview?.(p);
      props.onAnnounce(`Showing ${p.setName ?? p.setCode}, number ${p.collectorNumber}. Not in your collection.`);
      return;
    }
    props.onPick(p);
    props.onAnnounce(""")
# intro
sub(R, """            : deckScope
              ? preferred === null ? deckCopy.regionIntro(printings.length) : deckCopy.regionIntroPicked
              : preferred === null ? copy.regionIntro(printings.length) : copy.regionIntroPicked}""",
"""            : deckScope
              ? preferred === null ? deckCopy.regionIntro(printings.length) : deckCopy.regionIntroPicked
              : hasOthers
                ? printings.length === 0
                  ? `${entries.length} printings. Select one to see it here.`
                  : preferred === null
                    ? `${entries.length} printings. Pick one of yours to represent this card, or select any to see it here.`
                    : copy.regionIntroPicked
              : preferred === null ? copy.regionIntro(printings.length) : copy.regionIntroPicked}""")
# no finish chips with others
sub(R, "          {!choose && <div className=\"flex flex-wrap items-center gap-[6px] md:gap-[8px]\">",
       "          {!choose && !hasOthers && <div className=\"flex flex-wrap items-center gap-[6px] md:gap-[8px]\">")
# group headers
sub(R, """              {grouped && (
                <div
                  className="mb-[8px] font-mono uppercase text-[9.5px] md:text-[10px] tracking-[0.16em]"
                  style={{ color: "var(--fg-faint)" }}
                >
                  {copy.groupSet(g.label, g.code, g.items.length)}
                </div>
              )}""",
"""              {(g as any).lead ? (
                <div className="mb-[12px] font-mono uppercase text-[10px] md:text-[10.5px] tracking-[0.14em]" style={{ color: "var(--fg-muted)" }}>{(g as any).lead}</div>
              ) : null}
              {(g as any).head ? (
                <div className="mb-[10px] font-mono uppercase text-[10px] md:text-[10.5px] tracking-[0.14em]" style={{ color: "var(--fg-muted)" }}>{(g as any).head}</div>
              ) : grouped && g.label !== "" && (
                <div
                  className="mb-[8px] font-mono uppercase text-[9.5px] md:text-[10px] tracking-[0.16em]"
                  style={{ color: "var(--fg-faint)" }}
                >
                  {copy.groupSet(g.label, g.code, g.items.length)}
                </div>
              )}""")

M = "src/components/cards/card-modal.tsx"
sub(M, "  returnFocusRef,\n}: {", "  returnFocusRef,\n  catalogPrintings = null,\n}: {\n  /** #3002: every catalog printing of the card, from search. Null elsewhere (today's picker). */\n  catalogPrintings?: BrowsePrinting[] | null;")
sub(M, "  const [expanded, setExpanded] = useState(false);",
       "  const [expanded, setExpanded] = useState<boolean>((globalThis as any).__EXPANDED ?? false);\n  const [previewAt, setPreviewAt] = useState<PreferredPrinting | null>((globalThis as any).__PREVIEW ?? null);")
sub(M, "    const at = picked ? null : openAtPrinting;", "    const at = previewAt ?? (picked ? null : openAtPrinting);")
sub(M, "  }, [card, pick, picked, openAtPrinting, effective, deckScope]);", "  }, [card, pick, picked, openAtPrinting, previewAt, effective, deckScope]);")
sub(M, "  const hasPicker = ownedPrintings.length > 1",
"""  const ownedKeys = new Set(ownedPrintings.map((p) => printingKey(p)));
  const others = catalogPrintings ? catalogPrintings.filter((p) => !ownedKeys.has(printingKey(p))) : null;
  const catalogCount = catalogPrintings ? catalogPrintings.length : null;
  const hasPicker = (catalogCount !== null && catalogCount > 1) || ownedPrintings.length > 1""")
sub(M, "      onPick={onPick}\n      onReset={onReset}",
       "      onPick={(p) => { setPreviewAt(null); onPick(p); }}\n      others={others ?? undefined}\n      onPreview={(p) => setPreviewAt({ setCode: p.setCode, collectorNumber: p.collectorNumber })}\n      onReset={onReset}")
sub(M, "hasPicker={hasPicker} isToken={isToken}", "hasPicker={hasPicker} catalogCount={catalogCount} isToken={isToken}")

S = "src/components/cards/card-modal-sheet.tsx"
sub(S, "  hasPicker: boolean;\n  isToken: boolean;", "  hasPicker: boolean;\n  /** #3002: the card's catalog printings, from search; null elsewhere. */\n  catalogCount?: number | null;\n  isToken: boolean;")
sub(S, "ownedPrintings, hasPicker, isToken,", "ownedPrintings, hasPicker, catalogCount = null, isToken,")
s = open(S).read()
s = s.replace("count={ownedPrintings.length}", "count={ownedPrintings.length} all={catalogCount}")
s = s.replace('<MetaCell label="Set" value={caption} span={isToken ? 2 : undefined} />', '<MetaCell label="Set" value={caption} span={isToken ? 2 : undefined} hint={catalogCount === 1 ? "The only printing" : undefined} />')
s = s.replace('<MetaField label="Set" value={caption} />', '<MetaField label="Set" value={caption} hint={catalogCount === 1 ? "The only printing" : undefined} />')
# MetaCell / MetaField hint
s = s.replace("""  label, value, identity, quantity, rarity, span,
}: {
  label: string; value: string; identity?: string[]; quantity?: boolean; rarity?: boolean;""", """  label, value, identity, quantity, rarity, span, hint,
}: {
  label: string; value: string; identity?: string[]; quantity?: boolean; rarity?: boolean; hint?: string;""")
s = s.replace("""  label, value, identity, quantity, rarity,
}: { label: string; value: string; identity?: string[]; quantity?: boolean; rarity?: boolean }) {""", """  label, value, identity, quantity, rarity, hint,
}: { label: string; value: string; identity?: string[]; quantity?: boolean; rarity?: boolean; hint?: string }) {""")
# insert hint after value block: both end with "{value}\n        </span>\n      </div>\n"
s = s.replace("""          {value}
        </span>
      </div>
    </div>
  );
}""", """          {value}
        </span>
      </div>
      {hint ? <div className="font-mono text-[11px] mt-[4px]" style={{ color: "var(--fg-faint)" }}>{hint}</div> : null}
    </div>
  );
}""")
# TriggerHint all
s = s.replace("function TriggerHint({ count, picked, expanded }: { count: number; picked: string | null; expanded: boolean }) {\n  const chevron = <Chevron kind=\"disclosure\" open={expanded} />;\n  if (picked === null) {\n    return (\n      <div className=\"font-mono text-[11px] mt-[4px]\" style={{ color: \"var(--accent-text)\" }}>\n        {pickerCopy.triggerCount(count)} {chevron}",
"function TriggerHint({ count, picked, expanded, all = null }: { count: number; picked: string | null; expanded: boolean; all?: number | null }) {\n  const chevron = <Chevron kind=\"disclosure\" open={expanded} />;\n  if (picked === null) {\n    return (\n      <div className=\"font-mono text-[11px] mt-[4px]\" style={{ color: \"var(--accent-text)\" }}>\n        {all === null ? pickerCopy.triggerCount(count) : count > 0 ? `${all} printings · you own ${count}` : `${all} printings`} {chevron}")
s = s.replace("        {pickerCopy.triggerPickedOf(count)} {chevron}", "        {all === null ? pickerCopy.triggerPickedOf(count) : `· ${all} printings`} {chevron}")
s = s.replace("<TriggerHint count={count} picked={picked} expanded={expanded} />", "<TriggerHint count={count} picked={picked} expanded={expanded} all={all} />")
s = s.replace("  ref, controls, caption, count, picked, expanded, onClick, expandAria,\n}: {\n  ref: React.Ref<HTMLButtonElement>;\n  controls: string;\n  caption: string;\n  count: number;",
              "  ref, controls, caption, count, picked, expanded, onClick, expandAria, all = null,\n}: {\n  all?: number | null;\n  ref: React.Ref<HTMLButtonElement>;\n  controls: string;\n  caption: string;\n  count: number;")
s = s.replace("  ref, controls, caption, count, picked, expanded, imageUri, colorIdentity, onClick, expandAria,\n}: {\n  ref: React.Ref<HTMLButtonElement>;",
              "  ref, controls, caption, count, picked, expanded, imageUri, colorIdentity, onClick, expandAria, all = null,\n}: {\n  all?: number | null;\n  ref: React.Ref<HTMLButtonElement>;")
open(S, "w").write(s)
print("patched")
