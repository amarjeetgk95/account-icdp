# ICDP Tax System — Modern Architecture

## Project Status

- **Phase 0:** Foundation — ✅ Complete
- **Phase 1:** Platform & Auth — ✅ Complete (Module scaffolded, build verified)
- **Phase 2:** Business Module Migration — ⏳ Pending
- **Phase 3:** Quality Gates & CI — ⏳ Pending
- **Phase 4:** Production Cutover — ⏳ Pending

## Quick Start

```bash
cd icdp-modern
npm install
cp .env.example .env  # Fill in Supabase credentials
npm run dev
```

## Architecture

```
src/
├── core/                 # Platform infrastructure
│   ├── auth/            # Zustand auth store
│   ├── supabase/        # Supabase client singleton
│   ├── permissions/     # Role-based access hooks
│   ├── event-bus/       # Cross-module communication
│   ├── feature-flags/   # Module enable/disable
│   ├── error-handling/  # Standardized error envelope
│   ├── logging/         # Centralized logger
│   └── query-client.ts  # TanStack Query config
│
├── shared/              # Cross-cutting concerns
│   ├── components/      # Layout, Sidebar, Routes
│   ├── hooks/           # Shared hooks
│   ├── utilities/       # Formatters, validators
│   ├── constants/       # Months, quarters, etc.
│   ├── types/           # Module definitions
│   └── database.types.ts  # Generated Supabase types
│
└── modules/             # Vertical slices (auto-discovered)
    └── auth/            # ✅ Authentication module
        ├── components/  # LoginForm, ForgotPasswordForm, UpdatePasswordForm
        ├── pages/       # LoginPage, ForgotPasswordPage, UpdatePasswordPage
        ├── validation/  # Zod schemas
        ├── hooks/       # Auth mutations
        ├── routes.tsx   # Route definitions
        └── module.ts    # Module contract
```

## Module Auto-Discovery

Modules are discovered automatically via `import.meta.glob('./**/module.ts', { eager: true })`. To add a new module:

1. Create folder in `modules/`
2. Add `module.ts` with `ModuleDefinition` export
3. Build the application

No manual router or sidebar registration needed.

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_VERSION=1.0.0
VITE_ENV=development
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | TypeScript + Vite production build |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | ESLint check |
| `npm run test` | Vitest tests |
| `npm run db:generate-types` | Generate types from Supabase |

## Next Steps

1. **Migrate Settings Module** — Employee Master + Financial Year Rollover
2. **Migrate Dashboard Module** — Summary views
3. **Continue with remaining modules** — Payroll, Parties, Reports

See `docs/architecture.md` for full architectural blueprint.
