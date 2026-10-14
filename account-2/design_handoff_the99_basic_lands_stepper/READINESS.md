# READINESS — Basic lands stepper (R1)

**Self-assessed: 🟡 Amber.** Every open question in the brief has a call and every state is drawn at both widths in
both views. Amber because two things want Hugh's audit: no basics panel (G1), and the change marker reading
`from 6` rather than the shipped `6 → 8` on basic rows (call 5).

## Locks held

| Lock | How R1 holds it |
|---|---|
| Basics only | Gated on `isBasicLand`. No change to Shopping, money or ownership. |
| One save writes the final count | Presses are optimistic; one `setBasicQuantity` per settle. |
| No new 99-card cap | + is live at 99; the shipped over figure takes over. |
| Shipped refusal shape | `We couldn’t change that. The deck is unchanged.` |

## Open questions, called

1. **Control:** stepper with a typed count. No panel this round.
2. **− at 1:** becomes the shipped ✕; the row leaves into #185's receipt.
3. **Card view:** a band across the foot of the art.
4. **Desktop reveal:** always visible, quiet at rest.
5. **Change marker:** `from N` beside the name; the stepper holds the new count.

## Constraints checked

- **Hit targets:** 44×44 for − and + on the phone, in both views.
- **Not crowding the ✕ and quantity:** the stepper replaces both on basic rows, so there is nothing beside it to
  crowd. Basic names are short, so nothing truncates at 390.
- **No row or tile grows** at either width.
- **Keyboard:** real buttons and a real input, Tab order name → − → field → +, Enter/blur/Escape on the field.
- **Screen reader:** labels name the card and the result; one polite announcement per settle.

## Gap report

Six items in README §Gap report. The one to decide: **G1, a basics panel**, as R2 or never.
