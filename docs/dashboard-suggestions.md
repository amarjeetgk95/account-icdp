# Dashboard Improvement Suggestions — Draft v2

> Re-researched 2026-08-28 from the **current v3 bento implementation**:
> `DashboardPage.tsx` (162 lines, already split), `components/{DashboardBanner,
> KpiRow, PayrollTimeline, TreasuryRow, ComplianceHub, ActionQueue}`,
> `hooks/useDashboard.ts`, `types/index.ts`.
> Fixed-viewport design intent kept as a constraint ("dashboard never needs
> page-level scroll" — InlineExpand.tsx header note) **except** where noted for
> mobile (see P0-6).

## What exists today (verified)
Dark banner (FY/quarter/FY-progress/deadline/refresh) → 4 KPI cards
(Disbursements / Active Staff / Treasury Bills / Readiness) → 8:4 bento grid:
left = PayrollTimeline (bar chart + month rows + inline detail) + TreasuryRow
(GTR-30/44), right = ComplianceHub (score bar + Q1–Q4 grid + deadlines +
vendor stats) + ActionQueue (severity tabs + footer shortcuts). Single
`getSummary()` react-query call (staleTime 2m, refetchOnWindowFocus).

### Status of Draft v1 items
- ✅ Done: page split (was 658 lines), refresh busy state, quarter rail,
  salary-vs-tax bar chart, month-row list replaces color-only tiles.
- ⏳ Still open: scoring formula in UI, `prevQuarterPending` unused,
  raw `lastUpdated`, cache coherence, reduced-motion guard, `pct()` duplication.
- 🗑️ New dead code from the redesign: `primitives/MiniStat.tsx`,
  `primitives/RingGauge.tsx` + `.test.tsx`, `primitives/InlineExpand.tsx`
  (grep: 0 imports outside themselves) and their `dashv2-*` CSS in `index.css`.

---

## P0 — Quick wins (low risk, high polish)

| # | Suggestion | Evidence | Effort |
|---|---|---|---|
| 1 | **Delete v2 leftovers.** `primitives/MiniStat.tsx`, `primitives/RingGauge.tsx`, `primitives/RingGauge.test.tsx`, `primitives/InlineExpand.tsx` are unreferenced. Also strip the orphaned `dashv2-*` / `dash-kpi-*` rules from `index.css` (v1 documented ≈L2808–3425 — re-locate before cutting). | grep `MiniStat\|RingGauge\|InlineExpand` = self + doc only | S |
| 2 | **Action Queue overflow.** List truncates hard at 6 (`filtered.slice(0, 6)`) with no "+N more" — and the header badge shows the *unfiltered* `tasks.length` while tabs filter the list, so the count can contradict what's visible. Fix: show `filtered.length` in the badge and add a "+N more" row (or internal `overflow-y-auto`). | ActionQueue.tsx L40–42, L69 | S |
| 3 | **Stable keys + honest empty text.** Task rows are `key={i}` (index — reorders blur state on tab switch); empty state reads "No danger items" (raw severity token). Use a stable key (`t.action + t.title`) and a human label. | ActionQueue.tsx L66, L71 | S |
| 4 | **Month row a11y.** Status is conveyed by dot/bar color only. Add `aria-label` to `MonthRow` buttons: `"July — partial, 8 of 10 processed"`. Same for severity dots in ActionQueue (add `sr-only` text). | PayrollTimeline.tsx MonthRow; ActionQueue.tsx | S |
| 5 | **`prefers-reduced-motion` guard.** v3 uses `transition-all duration-500/700/1000`, `animate-spin`, bar-grow transitions. Add one global `@media (prefers-reduced-motion: reduce)` block in `index.css` zeroing durations (pattern already exists in paybill's `useCountUp.ts`). | grep `prefers-reduced-motion` = 0 in dashboard | S |
| 6 | **Mobile clipping.** The page is fixed-viewport `h-[calc(100dvh-…) overflow-hidden`, but below `xl` the bento stacks to `col-span-12` — two stacked flex columns inside a clipped viewport will crush/clip PayrollTimeline and ActionQueue content. Switch to `overflow-y-auto min-h-full` (drop fixed height) below `xl`; keep fixed-viewport at `xl+`. | DashboardPage.tsx L103, L131–158 | S |

## P1 — Correctness & consistency

| # | Suggestion | Evidence | Effort |
|---|---|---|---|
| 7 | **Move compliance score to the service.** The weighted formula (`qPct*0.4 + validPanPct*0.3 + zeroTaxBonus + 15`) still lives inline in the page (L94–98). Move to `dashboard.service` (pure function), document weights, return as `complianceScore` on `DashboardData`. Unit-test edge cases (0 employees, missing arrays) so KPI and hub can't drift. | DashboardPage.tsx L94–98; ComplianceHub.tsx | M |
| 8 | **Surface `prevQuarterPending`.** Computed in the repository, typed, dead in UI. When > 0 inject a `warning` task ("Prev quarter: N employees pending") into the returned `tasks[]` — direct value in filing season, zero UI changes needed. | types/index.ts L75; dashboard.repository.ts | S |
| 9 | **Relative last-updated.** Banner shows raw `lastUpdated`, hidden below `md`. Render "Updated 2m ago" always visible; refresh already has a busy state, this closes the loop. | DashboardBanner.tsx L64 | S |
| 10 | **Cache coherence on return.** Payroll/GTR mutations already invalidate `['dashboard-summary']` in their own hooks — but edits outside those paths within the 2-min stale window still show old numbers. Add `refetchOnMount: 'always'` (cheap: single RPC) or invalidate on route change. | useDashboard.ts; useParties/usePayroll invalidations | S |
| 11 | **Deduplicate deadline info.** "Filing date + days left" appears in **both** the banner (xl+) and ComplianceHub (always). Keep it in ComplianceHub only, or keep a compact days-pill in the banner and drop the hub's date row. One source of truth per screen. | DashboardBanner.tsx L51–60 vs ComplianceHub.tsx L84–98 | S |
| 12 | **Tab semantics in ActionQueue.** Filter buttons expose no state — add `aria-pressed` to each (or convert to a real tablist). | ActionQueue.tsx L44–59 | S |

## P2 — Analytical value (same design language)

| # | Suggestion | Evidence | Effort |
|---|---|---|---|
| 13 | **Salary pacing indicator.** Banner already computes FY progress (months elapsed %). Compare `ytdSalary` against expected pacing and show an "on/behind/ahead" chip next to the Disbursements KPI. Answers "are disbursements on track?" which no current number does. | fyMeta in DashboardPage; d.ytdSalary | M |
| 14 | **Current-month callout in PayrollTimeline.** The current month (the one that matters most) gets only bold text among 12 equal rows. Add a subtle left accent bar + "now" chip on `isCurrent`, and default-expand its detail row. | PayrollTimeline.tsx MonthRow L56–60 | S |
| 15 | **Month detail affordance.** Month rows are clickable but nothing signals it (no chevron, no tooltip). Add a trailing chevron that rotates on select — matches ActionQueue's row language. | PayrollTimeline.tsx L52–97 | S |
| 16 | **TreasuryRow click targets.** Only the tiny + button navigates; the card body is dead. Make the whole card a button (like KpiCard) → `/gtr30/list` / `/gtr44/list`, keep + for create. | TreasuryRow.tsx | S |

## P3 — Engineering hygiene

| # | Suggestion | Evidence | Effort |
|---|---|---|---|
| 17 | **Extract `pct()` helper.** Identical clamp helper duplicated in `DashboardPage.tsx`, `ComplianceHub.tsx`, `PayrollTimeline.tsx`. Move to `../utils` (or `@/shared/utilities`). | 3 files | S |
| 18 | **Replace the dead RingGauge test.** The only test file in the module tests soon-deleted code. After P0-1 lands, add small tests for KpiRow (badge logic) and ActionQueue (filtering + truncation) — the two components with real logic. | RingGauge.test.tsx | S |
| 19 | **Single money formatter.** After deleting MiniStat (which used `toLocaleString('en-IN')`), document that `formatCurrency` is the one money formatter for the dashboard. | KpiRow vs MiniStat | S |

## Explicitly out of scope (respecting constraints)
- Page-level scroll at `xl+` and modal-based detail views (InlineExpand replaced
  them deliberately; only the *mobile* scroll exception in P0-6 is proposed).
- New chart/chart-library dependencies — all visualization stays hand-rolled.
- Backend/SQL changes; service-layer derivation only (P1-7/8).

## Suggested execution order
P0 (all, one commit) → 7 (score to service + tests) → 8/9/10 → 11/12 →
14/15/16 → rest. Validate each batch with
`npm run typecheck && npm run lint && npx vitest run` before committing.
