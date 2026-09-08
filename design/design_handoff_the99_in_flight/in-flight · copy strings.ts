// src/lib/copy/in-flight.ts — RETIRED at R3.
//
// This file exported the three in-flight participles. It now exports nothing,
// and is kept only so the retirement is discoverable from the place the strings
// used to live. See design/design_handoff_the99_in_flight/RULING-in-flight-feedback.md (R3).
//
// ─────────────────────────────────────────────────────────────────────────────
// What was here, and why none of it survives #435
//
//   counting…      owned by the scope control.  Scope is now the ROUTE — the nav
//                  is the switch. There is no control to press, and no subtitle
//                  clause to put it in: page-header.tsx is a fixed title and gloss.
//
//   re-ranking…    owned by the sort control.   Order sorts rows already held, on
//                  both lanes (`ordered()` in discovery-view.tsx). It never reached
//                  the server, before or after the split.
//
//   re-scoring…    owned by availability.       Owned availability is a client swap
//                  over data already sent; discover mounts no availability control.
//
//   PENDING_GATE_MS = 500                       Gated the participle so it could not
//                  flash. With no participle there is nothing to gate — and the crown
//                  is deliberately UNGATED: a press is acknowledged on the press.
//                  Do not re-point this constant at the crown.
//
//   discoverySubtitle(parts, pending)           Assembled the four-clause subtitle.
//                  The subtitle is gone. (It also typed `ordering` optional and ran
//                  .filter(Boolean), which taken literally dropped `ranked by fit`
//                  from the owned lane. Retired with the bug in it.)
//
// ─────────────────────────────────────────────────────────────────────────────
// What replaces them: nothing.
//
// One control on either lane can reach the server — discover's scope, and only on a
// cache miss (discovery-view.tsx: `a cache hit answers in memory and this never turns
// true`). Its whole treatment is the crown it already wears, from rack/select.tsx:
// PENDING_OPACITY 0.55 on the control, aria-busy, never disabled, PendingLabel /
// PendingMark in the chevron's slot so nothing resizes. All shipped; nothing to add.
//
// Two rules that ARE copy decisions, recorded here because they are the reason this
// file is empty rather than short:
//
//   1. The result line (rack/result-line.tsx) HOLDS its outgoing sentence, verbatim,
//      for the whole flip — and so does the sheet footer's copy of it. It rewrites
//      once, on arrival. No pending form, no ellipsis, no dash, no aria-busy. It is
//      the count of the list on screen, and that list is still the previous answer.
//
//   2. Nothing is announced mid-flight. The result line is the rack's only live
//      region and speaks for client narrowings on a 300ms debounce; the lane's own
//      announcer speaks the re-rank ONCE, on settle. A participle in either would be
//      a second message for one press.
//
// export {} — deliberately empty.
export {};
