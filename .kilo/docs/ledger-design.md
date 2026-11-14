# Pay Bill Employee Ledger — New Design Philosophy & UX Plan

## 1. Design Philosophy: "Audit-grade clarity, operator-grade speed"

Government salary accounting is an **audit surface**. Every number must be traceable, and every interaction must
favor accuracy over eye-candy. The redesign philosophy has two pillars:

1. **Audit-grade clarity** — The ledger is the single source-of-truth the auditor reads. Information hierarchy
   is strict: identity → summary metrics → detailed rows → supporting detail. Data is grouped by **meaning**
   (pay components that answer "why did this number change"), not by source (earning vs. deduction split). No
   metric is shown without its context (FY, row totals, YoY baseline).

2. **Operator-grade speed** — The payroll clerk or auditor spends most of their day jumping between employees
   and months. 80% of actions happen with 1-2 clicks. Keyboard-first search, pinned summary, and a sticky
   totals row mean no amount of scrolling hides the number you need.

### Core UX principles

| Principle | Application |
|-----------|-------------|
| **Progressive disclosure** | Summary bar always visible; matrix rows collapsible per section; details-on-demand via hover/tooltip. |
| **Meaningful defaults** | First employee auto-selected; Full-Year view by default; Gross row pinned top of earnings. |
| **Reduced cognitive load** | Color only encodes accounting meaning (blue=gross, emerald=net, rose=deductions). No decoration. |
| **Traceability** | Hover/click on a stat chip jumps to its row; anomalies flagged inline with explanatory text. |
| **Print-faithfulness** | On-screen layout = print layout (single A4-L page); decorative affordances removed in `@media print`. |

## 2. Current state (diagnosis)

`src/modules/paybill/components/PayBillEmployeeLedgerView.tsx` (≈1487 LOC). Strengths exist; weaknesses block it:

- **Duplicate data-loading** — `loadData()` (manual, tied to Refresh button) and a separate `useEffect` both
  fetch earnings/deductions for the same `financialYear`. `loadData()` also re-runs `setSelectedHrpn` on an
  auto-selected first employee, causing a double-load flash.
- **Single-component monolith** — 1487 lines. State, layout, render logic, and print styles all mixed.
- **Layout debt**:
  - The toolbar is a single crowded row mixing search + actions + nav-link.
  - The matrix table has no sticky *footer* totals while scrolling — only a header. Totals disappear off-screen.
  - "EARNING"/"DEDUCTION" section headers are plain `tr` with no animation or summary.
  - Collapse uses a rotated chevron (1 transform) vs. a proper direction icon.
- **Inconsistent affordances**:
  - Row hover is a generic bg tint; no left-accent to group visually.
  - Anomaly `AlertTriangle` has no accessible tooltip explaining the meaning.
  - Empty state offers no next-step action.
  - Error state is plain text; no retry affordance.
- **Print fragility**: relies on `zoom` scaling to force one page; any content growth breaks single-page fit.

## 3. Redesign targets

### 3.1 Component architecture (file plan)

```
src/modules/paybill/components/
├── PayBillEmployeeLedgerView.tsx        # Shell: fetches + composes below (thin)
├── ledger/
│   ├── LedgerToolbar.tsx              # Identity + search + actions bar
│   ├── LedgerSummaryBar.tsx           # Identity card + stat chips + net sparkline
│   ├── LedgerMatrixTable.tsx          # 12-month matrix with sticky header + footer + sections
│   │   ├── LedgerSectionHeader.tsx    # Collapsible section header with summary chips
│   │   └── LedgerMatrixRow.tsx        # Single row, hover accent, anomaly tooltip
│   └── LedgerEmptyState.tsx           # Empty + error + loading shells (shared)
```

Each file ≤250 LOC. Shared `Ledger*` types moved to `src/modules/paybill/types/ledger.ts`.

### 3.2 Visual language

| Element | Before | After |
|---------|--------|-------|
| Toolbar | Flat, 1 row, mixed actions | **2-row**: top row identity+name; second row search field — full actions (Refresh, Edit Legacy, Export split, Print). |
| Summary bar | Identity + 4 stat chips + sparkline | **Identity card on left (name, badge, designation, scale)**; **stat chip strip (4 chips) center** — each chip clickable → jumps to row; **net-pay sparkline on right** — only when space permits. |
| Matrix table | border-separate, no footer | **border-collapse**, sticky `thead` + sticky `tfoot` (per-month totals + grand total). |
| Section header | plain tr, one chevron | **Two-tone header bar** with: chevron icon (▲/▼), section title, **row-count chip**, **visible-period total chip**, Hide/Show chip. Collapse = CSS line-height crossfade (no JS animation lib). |
| Body rows | hover = bg tint | **Left 2px accent border**: blue (gross), emerald (net), rose (total ded), slate (standard). Font-mono values. |
| Anomaly cell | amber icon, no tooltip | Amber icon **with title** = "March: zero gross — salary run missing" or "February: negative net pay — deductions exceed gross". Cell bg tinted amber-50. |
| Empty state | plain illustration | **Illustration** + inline "Upload Pay Bill" primary button + "Refresh" ghost button. |
| Error state | red text box | **Red panel** + error message + **Retry** button (uses `loadData`). |
| Loading | pulse skeleton table rows | **Skeleton** matching final layout proportions (so layout doesn't jump). |

### 3.3 Interaction model

- **Search**: same combobox pattern (HRPN / name / designation). Arrow keys navigate; `Enter`/click selects.
  - *Improvement*: show "Viewing" badge on the currently selected employee even when search is open.
  - *New*: keyboard `Ctrl+K` (or `/` when not in an input) focuses search.
- **Stat chips** (Annual Gross, Income Tax, Total Deductions, Net Take-Home):
  - Count-up animation (existing) **kept**; respects `prefers-reduced-motion`.
  - YoY arrow ▲/▼ kept; tooltip shows full "% vs FY XX-XX".
  - Clicking a chip calls `jumpToRow(key)` — **kept, improved** (flash animation + 1.5s auto-clear).
- **Section collapse**: chevron icon flips; no layout shift (header stays fixed height). Uses
  `aria-expanded` + tab index 0; keyboard `Space`/`Enter` toggles.
- **Month range** (Full / H1 / H2): kept as a 3-button toggle in the matrix header toolbar area.
- **Column hover highlight**: hover a month cell → entire column gets a sky-50 tint; works across sticky
  header/footer/body. Mouse leave clears.
- **Row hover accent**: left 2px colored border + group bg tint, `transition-colors duration-150`.
- **Sticky footer totals**: `position: sticky; bottom: 0` — always visible while scrolling vertically. Per-month
  totals across all *visible* rows, plus grand total (sum of monthly totals). `backdrop-blur` + shadow for
  separation.
- **Print** (landscape A4, single page):
  - All interactive buttons hidden via `.no-print`.
  - Summary bar forced to 4-col chip layout.
  - Sticky footer removed (avoid duplication).
  - Instead of raw `zoom`, use **responsive font-scale** via `@page` + CSS `width` so content reflows rather
    than shrinks-blind. Target: 9-10pt body text minimum.
  - `@media print { break-inside: avoid }` on each major section so the matrix doesn't split mid-table.
- **New**: on hover of any stat chip, show a micro-tooltip describing *what's included*
  ("Includes Pay Difference + DA Difference") — helpful for audit explanation.

## 4. Data & state cleanup

1. **Single load effect per FY** — remove the orphaned `loadData()` used only by Refresh; instead, expose a
   `refetch()` from the effect (via ref) so Refresh reuses the same code path.
2. **Single matrix report call** — currently `matrixReport` loads via `paybillReportService.getMatrixReport`
  *and* the matrix rows are recomputed locally from `employeeEarnings`/`employeeDeductions`. Pick one source
  to avoid drift. **Decision** (post-implementation audit): prefer the locally-computed matrix (gives per-row
  manual-allowance folding + YoY) and *drop* the separate matrixReport call, or document why each exists.
3. **Memoization boundaries** — split `ledgerMatrixRows` computation into a `useMemo` with a strict dependency
  list; ensure manual-allowance/deduction edits trigger recompute but FY-change does not recompute unnecessarily.

## 5. Implementation priority (phased)

| Phase | Scope | Est. |
|-------|-------|------|
| **P0** | Split component into sub-components (Toolbar, SummaryBar, MatrixTable, EmptyState). Add sticky footer totals. Improve section headers with summaries. | 3-4 dev-days |
| **P1** | Polish hover/keyboard interactions. Add `Ctrl+K` focus. Improve print CSS to avoid `zoom`. | 2 dev-days |
| **P2** | Split data-loading into a shared `usePayBillEmployeeLedger` hook (testable, reusable in Form16). Fix duplicate-load bug. | 1-2 dev-days |
| **P3** | Write `LedgerMatrixTable.test.tsx` + `LedgerSummaryBar.test.tsx` with the existing test as reference. | 1 dev-day |

## 6. Acceptance criteria

- ✅ Test `renders employee ledger view with Pay Difference and DA Difference…` still passes (parity).
- ✅ `eslint` clean on every new/changed file (run `npx eslint <file>`).
- ✅ `tsc --noEmit` clean.
- ✅ Manual QA: 768px / 1024px / 1440px viewport — toolbar wraps cleanly, stat chips remain in a single row.
- ✅ Print preview fits one A4-L page with body text ≥9pt; no cut-off totals.
- ✅ Keyboard: Tab → search → ↓/↑ → Enter selects; Tab → stat chip → Enter jumps to row.
- ✅ No layout shift (CLS) on load — skeleton matches final height.
