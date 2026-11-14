# Pay Bill Employee Ledger — Redesign Plan v2

> Merged plan: original architecture proposal + operator design philosophy draft, re-baselined against
> HEAD (`PayBillEmployeeLedgerView.tsx`, 1,620 LOC as of Aug 2026).

## 0. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Layout | **Master-detail** | Persistent employee rail beats dropdown hunting for all-day operator use |
| Server state | **TanStack Query** | Mandated by `docs/architecture.md`; fixes duplicate loads, races, refresh plumbing |
| Fetch scope | **Per-selected-employee** | `listEarnings({hrpn})` exists but is unused by this view today |
| Test order | **Characterization tests first** | Parity must be provable *during* refactor, not asserted afterward |
| File budget | **≤250 LOC per component** | Monolith is the root disease |
| Print engine | Keep `zoom` until measured otherwise | Reflow-only cannot guarantee 14 columns on A4-L |

## 1. Design philosophy — "Audit-grade clarity, operator-grade speed"

Government salary accounting is an **audit surface**. Every number must be traceable; every interaction must
favor accuracy over eye-candy.

1. **Audit-grade clarity** — Strict hierarchy: identity → summary metrics → detailed rows → supporting detail.
   Color encodes accounting meaning only (blue = gross, emerald = net, rose = deductions, amber = anomaly).
   No metric without context (FY, period total, YoY baseline).
2. **Operator-grade speed** — 80% of actions in 1–2 clicks. Keyboard-first navigation, pinned summary,
   sticky totals so scrolling never hides the number you need.

### Core UX principles

| Principle | Application |
|-----------|-------------|
| Progressive disclosure | Summary always visible; sections collapsible; details-on-demand (tooltips, month drawer) |
| Meaningful defaults | First employee auto-selected; Full-Year view; Gross pinned last among earnings |
| Reduced cognitive load | Color = meaning only; no decoration |
| Traceability | Stat chip click → jumps to row; anomaly flags carry explanatory text; month drill-down shows source records |
| Print-faithfulness | On-screen hierarchy = print hierarchy; interactive affordances stripped in `@media print` |

## 2. Current state — accurate diagnosis

**Already implemented (do NOT rebuild — excluded from scope):**

- Sticky footer totals (`tfoot.sticky.bottom-0`) + sticky header
- Section headers with row-count chip, visible-period total chip, Hide/Show chip
- Left 2px row accents (blue/emerald/rose/slate)
- Anomaly flags with explanatory tooltips (zero gross / negative net per month)
- Empty state with Upload + Refresh actions; error panel with Retry
- Reduced-motion-aware count-up animation (`useAnimatedNumber`)
- Loading skeleton matching final layout proportions
- `?hrpn=` URL deep-link + back/forward sync; recent-HRPN memory (localStorage, max 5)
- Settings-driven column ordering; manual allowance/deduction folding into Gross/Deductions/Net
- Combobox with ARIA roles, arrow-key navigation, "Viewing" badge

**Actual problems (in scope):**

1. **Monolith** — 1,620 LOC mixing fetch, derivation, formatting, print CSS, UI.
2. **Over-fetching** — loads *all* employees' earnings + deductions for the FY, plus *full* previous-FY data,
   to render one employee. Scales O(office), should be O(selected employee).
3. **Duplicate load paths** — `loadData()` (Refresh button) duplicates the mount `useEffect`; auto-select
   inside `loadData` triggers a double-load flash.
4. **No TanStack Query** — raw `useState`/`useEffect` violates the module data-flow contract;
   `refreshTrigger` prop-drilling stands in for cache invalidation.
5. **Drift risk** — matrix rows computed locally *and* separately via `paybillReportService.getMatrixReport`;
   two aggregation code paths for the same numbers.
6. **Search capped** — dropdown shows max 12 results; no browsing/filtering beyond substring match.
7. **Print fragility** — ~40 lines of injected CSS overriding Tailwind utilities by selector; `zoom: 0.86`
   is load-bearing for single-page fit.
8. **Thin tests** — one happy-path test.

## 3. Target UX (master-detail)

```
┌───────────────┬──────────────────────────────────────────────────┐
│ DIRECTORY     │ HEADER CARD                                      │
│ [search    ]  │ name · HRPN badge · designation · scale · FY · YoY│
│ ─ Recently ─  │ actions: Refresh · Edit Legacy · Export ▾ · Print │
│ ─ All (n) ─   ├──────────────────────────────────────────────────┤
│ ▸ emp 1       │ SUMMARY STRIP: Gross | Income Tax | Deductions | │
│ ▸ emp 2 ◀     │               Net Take-Home   (click → jump row) │
│ ▸ emp 3       ├──────────────────────────────────────────────────┤
│  …virtualized │ MATRIX TABLE                                     │
│               │ [Full Year | Mar–Aug | Sep–Feb]  ⚠ anomaly chips │
│ [filters]     │ EARNING ▾ (11 rows · ₹X)                         │
│               │ DEDUCTION ▾ (12 rows · ₹X)                       │
│               │ ── sticky per-month totals + grand total ──      │
└───────────────┴──────────────────────────────────────────────────┘
```

- **Left rail (~280px, collapsible below `lg`)**: virtualized list (`@tanstack/react-virtual` — already a dep),
  search with `Ctrl+K` / `/` focus shortcut, "Recently Viewed" group, designation filter chips, live count.
  `↑/↓/Enter` navigates and selects.
- **Summary chips**: kept (count-up, YoY arrow, jump-to-row flash). New: hover micro-tooltip stating
  composition — e.g. "Includes Pay Difference + DA Difference".
- **Month Detail Drawer (new)**: clicking a month column header opens a side panel with that month's
  earning + deduction records side-by-side (incl. import id/date) — closes the traceability loop auditors ask for.
- **Preserved exactly**: `?hrpn=` URL semantics, Arrears badges, section collapse (ARIA `aria-expanded`),
  month-range toggle, column-hover highlight, anomaly markers, settings column order, manual-value folding.
- **Technical note**: keep `border-separate border-spacing-0` on the table — `border-collapse` breaks sticky-cell
  borders; do not "fix" this while restyling.

## 4. Target architecture

```
src/modules/paybill/components/employee-ledger/
├── EmployeeLedgerView.tsx        # composition root (~150 LOC)
├── EmployeeDirectoryPanel.tsx    # left rail: search, recents, filters, virtualized list
├── LedgerHeaderCard.tsx          # identity + YoY + action bar
├── LedgerSummaryStrip.tsx        # 4 stat chips + sparkline
├── LedgerMatrixTable.tsx         # table shell: sticky head/foot, range toggle, anomaly chips
│   ├── LedgerSectionHeader.tsx   # collapsible section row
│   └── LedgerMatrixRow.tsx       # row renderer + accents + anomaly tooltip
├── MonthDetailDrawer.tsx         # P4
├── hooks/
│   ├── useEmployeeDirectory.ts   # ['paybill','directory', fy] — merged paybill + establishment view
│   ├── useEmployeeLedger.ts      # ['paybill','earnings',{fy,hrpn}] / deductions / manual values / prev-FY
│   └── useLedgerExport.ts        # excel + print (+ csv later)
├── ledgerMath.ts                 # PURE: matrix build, manual folding, ordering, anomalies, period sums
└── types.ts                      # re-exported from ../types/ledger.ts
```

### Data layer rules

- `useEmployeeDirectory`: extracts the current `distinctEmployees` merge logic verbatim into a query.
- `useEmployeeLedger(fy, hrpn)`: scoped queries via existing repository params
  (`listEarnings/listDeductions { financialYear, hrpn }`). Prev-FY aggregate becomes a lazy per-employee
  query with long `staleTime`; failures tolerated silently (status quo).
- **Invalidation replaces `refreshTrigger`**: upload/settings success calls
  `queryClient.invalidateQueries({ queryKey: ['paybill'] })`. The `refreshTrigger` prop stays accepted but
  deprecated until P6 removal.
- **matrixReport resolution**: drop the standing `getMatrixReport` call from the view. Excel export calls it
  lazily inside `handleExportExcel` (service contract unchanged) — one aggregation path on screen, no drift.
- Repository API unchanged; office scoping/cache semantics (`resolveOfficeCache`, `invalidateCache`) untouched.
  Query keys intentionally exclude officeId (repository resolves it).

## 5. Phases

| Phase | Scope | Exit criteria | Est. |
|---|---|---|---|
| **P0 Baseline** | Characterization tests against the CURRENT component: rows/badges, section collapse, URL sync, chip jump, empty/error actions, anomaly tooltips. Capture print + Excel baseline artifacts. | Suite green on old code; artifacts stored | 1d |
| **P1 Pure logic** | Extract matrix build/folding/ordering/anomalies → `ledgerMath.ts` + unit tests | No UI change; math ≥90% covered | 1–1.5d |
| **P2 Data hooks** | TanStack Query hooks, scoped fetching, delete duplicate load, invalidation wiring | Identical render, fewer rows fetched (assert via mocked repo calls) | 1.5d |
| **P3 Shell** | Master-detail layout; port table into subcomponents stepwise (table → rows → header → summary) | Parity suite green after each port | 3d |
| **P4 Enhancements** | Month Detail Drawer; directory filters; virtualization tuning; `Ctrl+K` | Feature-complete UI | 2d |
| **P5 Export/print** | Move print CSS out of JSX into `ledgerPrint.css` consumed by `popupNativePrint`; attempt ≥9pt reflow experiment; keep `zoom` fallback if it fails | Exports byte-parity vs P0 artifacts; single-page print verified | 1.5d |
| **P6 Cleanup** | Delete legacy component, migrate its test, remove `refreshTrigger` shim, doc touch-up | `npm run lint && typecheck && test:run` green | 0.5d |

## 6. Acceptance criteria

- ✅ Ported parity test passes: Pay Difference / DA Difference rows in last EARNING section with Arrears badges
- ✅ All P0 characterization tests green on the new tree
- ✅ `npm run lint`, `npm run typecheck`, `npm run test:run` clean
- ✅ `?hrpn=` deep-link, back/forward navigation, and recent-employee tracking behave identically
- ✅ Keyboard: `Ctrl+K` → type → `↑↓` → `Enter` selects; `Tab` to chip → `Enter` jumps; `Space`/`Enter`
  toggles section; focus-visible rings everywhere
- ✅ Employee switch within `staleTime` does not refetch; office switch still clears all cached data
- ✅ Responsive QA at 768 / 1024 / 1440px: rail collapses gracefully below `lg`; chips stay on one row ≥1024px
- ✅ Print: single A4 landscape page, totals uncut, body ≥9pt (or documented exception with zoom fallback)
- ✅ No CLS on employee change (skeleton height matches content)
- ✅ `prefers-reduced-motion` disables count-up, smooth scroll, and flash animation
- ✅ No more than one aggregation path renders ledger numbers

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Print regression (highest) | P0 baseline artifacts; `zoom` retained until measured parity; CSS moved, not rewritten |
| Virtualization × sticky columns interplay | Load-test 500+ synthetic employees in P4; fallback: plain list under threshold |
| Stale cache across office switches | Repository scoping untouched; logout `invalidateCache()` flow unchanged; add office-switch test |
| Hidden `refreshTrigger` consumers | Prop kept as deprecated shim through P5; removed only in P6 after grep audit |
| Prev-FY query weight | Lazy, per-selected-employee, long `staleTime`, silent failure (matches current behavior) |
| Scoped fetch changes auto-select timing | Auto-select moves into directory hook's derived state (current `pickedHrpn || first` pattern kept) |

## 8. Explicitly out of scope

- Backend/RPC/schema changes
- Migrating Form16 module onto the new hooks (hooks are built reusable; migration is a follow-up)
- Inline editing in the ledger (remains in Legacy Data Editor)
- CSV/PDF-export format changes beyond the print stylesheet

## 9. Implementation status (Aug 2026)

All phases **P0–P6 complete**. The master-detail `employee-ledger/` tree is live on the route; the legacy
`PayBillEmployeeLedgerView` monolith, its tests, and the `refreshTrigger` prop-drilling shim have been
removed (page now calls `invalidatePaybillData(queryClient)` on upload/settings success).

Deliberate behavior changes vs. the legacy view:

- Directory search: pressing `Enter` with a typed query selects the **first match** even without a prior
  `ArrowDown` (legacy quirk fixed).
- Auto-select of the first employee is derived state only — `?hrpn=` stays clean until an explicit pick.
- Zero-gross anomaly flags are suppressed for employees whose entire FY gross is zero (no phantom
  "12 zero months" warnings for never-paid employees).
- Export actions gate on `hasData` (and loading/exporting state) instead of always being enabled.
- Two print hide-rules appended to the ledger stylesheet (`[role="alert"]`, global `.no-print`) to keep
  error banners and chrome out of printed output.

Known leftover (deferred): the YoY direction arrow renders even at exactly 0% delta — cosmetic.
