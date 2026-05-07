# ADR-007: Single Repository for All Application Components

## Status

Accepted

## Context

The application consists of four major components:
- **backend/** — Node.js/Express API (Lambda)
- **frontend/** — React 19 SPA
- **infrastructure/** — AWS CDK (TypeScript)
- **e2e/** — Playwright end-to-end tests

These components are tightly coupled: infrastructure references backend code paths, e2e tests depend on both frontend and backend APIs, and deployments typically involve changes across multiple components.

Options considered:
1. **Monorepo (single repository)** — All components in one repo with separate directories
2. **Polyrepo (multiple repositories)** — One repo per component
3. **Monorepo with workspace tooling** — Nx, Turborepo, or Lerna for dependency management

## Decision

We use a **single repository** with top-level directories for each component. No monorepo tooling (Nx, Turborepo) is used — each directory has its own `package.json` and is independently installable.

```
├── backend/          # Express API, deployed to Lambda
│   ├── src/
│   ├── tests/
│   ├── database/     # SQL migrations and seeds
│   └── package.json
├── frontend/         # React 19 SPA, deployed to S3/CloudFront
│   ├── src/
│   └── package.json
├── infrastructure/   # AWS CDK stacks
│   ├── lib/
│   ├── lambda/       # Standalone Lambda functions (notifier, wp-timer)
│   └── package.json
├── e2e/              # Playwright tests
│   ├── pages/
│   ├── fixtures/
│   └── (uses root package.json)
├── docs/             # Documentation
├── package.json      # Root: Playwright, shared dev tooling
└── playwright.config.ts
```

The root `package.json` holds shared development dependencies (Playwright, TypeScript) while each component manages its own production dependencies.

## Consequences

**Positive:**
- Atomic commits — a feature spanning backend + frontend + infrastructure is one commit/PR
- Simplified CI/CD — one pipeline can build, test, and deploy all components
- Cross-component refactoring — renaming an API endpoint updates backend routes, frontend calls, and e2e tests in one change
- CDK references backend code directly (`Code.fromAsset('../backend')`) without versioning concerns
- Single source of truth for database migrations — no sync issues between repos
- Easier onboarding — clone one repo, see the entire system

**Negative:**
- Larger clone size — all components downloaded even when working on one
- No independent versioning — components cannot be released independently (acceptable for a single-deployment application)
- CI runs all checks on every push (mitigated by path-based triggers in CI configuration)
- No enforced dependency boundaries — frontend could accidentally import backend code (mitigated by separate `package.json` files)
- No workspace-level dependency deduplication — each component installs its own `node_modules`

---

[← Back to ADR Index](./README.md) | [← Back to Documentation Index](../README.md)
