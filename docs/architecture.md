# ICDP Tax System — Architecture Overview

## Principles

1. **Business logic belongs on the backend.** Frontend handles presentation, UX, and workflow orchestration. Financial calculations execute on the backend.

2. **Each feature is an independent vertical slice.** Modules own their UI, business logic, repositories, validation, tests, and routing.

3. **The Core and Shared layers remain stable.** Feature modules extend without modifying the platform.

4. **Security is enforced by the backend.** Frontend permissions improve UX but never replace RLS.

5. **Financial integrity takes precedence over convenience.** Immutable records, audit trails, transactional consistency.

6. **Quality is continuously verified.** Type safety, tests, and CI gates are mandatory.

7. **AI-friendly architecture.** Consistent structure, strong types, minimal cross-module dependencies.

## Tech Layer

| Concern | Technology |
|---------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Server State | TanStack Query v5 |
| UI State | Zustand |
| Forms | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Testing | Vitest + React Testing Library |

## Module Contract

Every module exports a `ModuleDefinition`:

```typescript
interface ModuleDefinition {
  id: string;          // Unique module identifier
  name: string;        // Display name in sidebar
  icon: string;        // Emoji or icon component
  navGroup: 'main' | 'admin' | 'reports';
  permissions?: ('admin' | 'office')[];
  featureFlag?: keyof FeatureFlagKeys;
  routes: RouteDefinition[];
  sidebar?: boolean;   // Show in sidebar (default: true)
  order?: number;      // Sort order in sidebar
}
```

## Data Flow

```
UI Component
    ↓
TanStack Query Hook (server state)
    ↓
Repository (data access)
    ↓
Supabase Client → PostgreSQL RPC / Edge Function
    ↓
Database (RLS enforced)
```

## Error Handling

All errors follow the standardized envelope:

```typescript
interface ApiError {
  code: string;        // e.g., 'VALIDATION_ERROR'
  message: string;     // Human-readable message
  details?: unknown;   // Optional diagnostic data
}
```

## State Separation

| State Type | Store | Examples |
|------------|-------|----------|
| Server data | TanStack Query | Employees, salaries, parties |
| UI state | Zustand | Sidebar, theme, active office, filters |
| Form state | React Hook Form | Input values, validation |

Business records are **never** duplicated in Zustand.

## Feature Flags

Modules can be enabled/disabled at runtime:

```typescript
// During migration
const flags = {
  auth_module: true,       // Migrated
  settings_module: false,  // Legacy still active
  payroll_module: false,   // Legacy still active
};
```

## Security Layers

1. **Authentication** — Supabase Auth (email/password)
2. **Authorization** — Role-based (admin/office) via `profiles` table
3. **Row Level Security** — PostgreSQL policies enforce data isolation
4. **Database Constraints** — Unique keys, foreign keys, check constraints
5. **Backend Validation** — PostgreSQL functions validate business rules

## Migration Strategy

- Migrate one module at a time
- Preserve existing business behavior
- Shadow mode validation for financial-critical modules
- Feature flags control cutover
- Rollback without database restoration

## Future Modules

| Module | Domain | Priority |
|--------|--------|----------|
| Payroll | Monthly salary entry | Phase 2 |
| Parties | GST parties & transactions | Phase 2 |
| Reports | 24Q, 26Q, quarterly returns | Phase 2 |
| Billing | Invoice generation | Phase 3 |
| Receipt Book | Payment receipts | Phase 3 |
| Expenditure | Office expenses | Phase 3 |
| Documents | File management | Phase 3 |
| Calendar | Deadlines & reminders | Phase 4 |
