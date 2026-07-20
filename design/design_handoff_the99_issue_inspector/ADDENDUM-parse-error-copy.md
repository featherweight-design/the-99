# Addendum — Parse-error `reason` copy delta

**Filed by:** plan PR for #36 (Issue Inspector implementation).
**Date:** 2026-07-20
**Status:** Informational — no design change required.

## Yellow item closed

`READINESS.md` § *Eng-side clarifications*, item 2:

> **Parse-error `reason` copy cross-check.** … Cross-check the mock's reason
> wording against `previewUpload` / `previewPaste`'s actual `parseErrors[].reason`
> output, and either mirror the backend text or adjust the mock language in an
> addendum note.

## Decision

Ship the backend's current `reason` strings verbatim, per the explicit note in
`Issue Inspector - copy strings.js`:

```
parseErrorRow: {
  lineBadge: "L{line}",
  // reason comes straight from UploadPreview.parseErrors[].reason — render as-is, do not rephrase.
}
```

The mock's reason wording (e.g. `Missing quantity — no value in the Count column`)
is illustrative only. The inspector will render whatever backend produces.

## Backend vs mock — current delta

| Source | Current backend text | Mock sample |
|---|---|---|
| `parse.ts` (empty file) | `empty file` | not shown |
| `parse.ts` (missing Name header) | `header missing Name column` | not shown |
| `parse.ts` (missing Quantity header) | `header missing Quantity column` | not shown |
| `parse.ts` (too few columns) | `expected at least N columns, got M` | (no mock sample — mock shows "Too many columns — 9 fields, expected 6", but backend does NOT detect too-many-columns as fatal; extras are ignored. Do not mirror the mock text — it names a failure mode backend never emits.) |
| `parse.ts` / `paste.ts` (bad qty) | `invalid quantity "X"` | `Quantity "two" is not a number` / `Quantity "-3" is out of range` |
| `parse.ts` / `paste.ts` (missing name) | `missing card name` | `Empty name field` |

## Follow-up (out of scope for #36)

A separate backend copy pass could adopt the mock's more descriptive tone. That
work would live against `src/lib/manabox/parse.ts` and `src/lib/manabox/paste.ts`
and does not affect the Issue Inspector's rendering.
