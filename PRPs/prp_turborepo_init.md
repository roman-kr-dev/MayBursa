name: "Turborepo Monorepo Setup - OptionsSniper & Intuitions"
description: |

## Purpose

Create a TypeScript monorepo boilerplate/template using Turborepo with two main projects (OptionsSniper and Intuitions), shared packages, and proper development workflow setup. This is an initial template setup - all projects should be at a minimal, starter template level with basic functionality to demonstrate the monorepo structure and code sharing capabilities.

## Core Principles

1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance

---

## Goal

Build a production-ready Turborepo monorepo containing:
- **OptionsSniper**: Trading platform with API server, WebSocket live updates server, and React UI
- **Intuitions**: Idea management system with API server and React UI
- **Shared packages**: TypeScript configs, ESLint configs, shared types, utilities, and UI components
- All in TypeScript with proper type safety and code sharing

## Why

- **Business value**: Enable two separate products to share code and maintain consistency
- **Developer efficiency**: Single repo, shared tooling, unified development experience
- **Code reuse**: Share types, utilities, and UI components between projects
- **Scalability**: Easy to add new projects and services
- **Type safety**: Full TypeScript across all projects with shared type definitions

## What

### User-visible behavior:
- OptionsSniper: Real-time options trading dashboard with live price updates
- Intuitions: Create and manage ideas/insights with tagging system

### Technical requirements:
- Turborepo for monorepo orchestration
- pnpm workspaces for package management
- TypeScript everywhere
- Shared component library
- Hot reloading across packages
- Parallel builds with caching

### Success Criteria

- [ ] All services start with `pnpm dev`
- [ ] Shared types work across all projects
- [ ] Changes to shared packages reflect immediately in apps
- [ ] All TypeScript compiles without errors
- [ ] ESLint passes across all projects
- [ ] Both UIs can consume shared components
- [ ] WebSocket connection works for live updates

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://turbo.build/repo/docs
  why: Turborepo configuration and pipeline setup

- url: https://turborepo.com/docs/reference
  why: Complete Turborepo reference documentation

- url: https://pnpm.io/workspaces
  why: Workspace protocol and dependency management

- url: https://www.typescriptlang.org/docs/handbook/project-references.html
  why: TypeScript monorepo configuration

- url: https://vitejs.dev/guide/
  why: Vite configuration for React apps

- doc: Express TypeScript setup
  section: Middleware and typing
  critical: Request/Response typing patterns

- doc: WebSocket with TypeScript
  section: ws library typing
  critical: Event handling and type safety
```

### Project Structure Requirements

The AI should create a Turborepo monorepo with the following components:

**Main Structure:**
- All source code should be in a `src/` directory
- All tests should be in a `test/` directory
- Standard root configuration files (package.json, turbo.json, tsconfig.json, etc.)

**Projects to Create:**
1. **OptionsSniper**
   - API server (Express.js)
   - Live WebSocket server
   - UI (React + Vite)

2. **Intuitions**
   - API server (Express.js)
   - UI (React + Vite)

**Shared Packages:**
- TypeScript configuration
- ESLint configuration
- Shared types
- Shared utilities
- UI components library

The AI should decide on the specific folder structure and organization within these constraints, following best practices for Turborepo monorepos.

## Implementation Blueprint

### List of tasks to be completed

```yaml
Task 1: Initialize root configuration with pnpm workspaces
CREATE package.json:
  - name: project name
  - private: true
  - workspaces configuration for pnpm
  - scripts for turbo commands
  - packageManager: "pnpm@9.0.0"

CREATE pnpm-workspace.yaml:
  - Define workspace paths based on chosen structure
  
CREATE turbo.json:
  - pipeline configuration
  - build dependencies
  - dev mode settings

CREATE tsconfig.json:
  - baseUrl and paths configuration

CREATE .gitignore:
  - node_modules, dist, .turbo, etc.
  
CREATE turbo.json:
  - pipeline configuration
  - build dependencies
  - dev mode settings

CREATE tsconfig.json:
  - baseUrl and paths configuration

CREATE .gitignore:
  - node_modules, dist, .turbo, etc.

Task 2: Create directory structure
DESCRIPTION:
  Create appropriate directory structure for a Turborepo monorepo with:
  - src/ directory for all source code
  - test/ directory for all tests
  - Organize projects and packages following Turborepo best practices
  - AI should determine the specific folder organization

Task 3: Setup shared packages
CREATE packages/typescript-config:
  - Create all necessary TypeScript config files (base.json, node.json, react-library.json)
  - Create package.json with proper exports

CREATE packages/eslint-config:
  - Create ESLint configuration
  - Create package.json with dependencies

CREATE packages/shared-types:
  - Create basic type definitions for template
  - Create package.json and tsconfig.json

CREATE packages/shared-utils:
  - Create basic utility functions for template
  - Create package.json and tsconfig.json

CREATE packages/ui-components:
  - Create basic React components (Button, Card, Input)
  - Create package.json with React dependency

Task 3: Setup OptionsSniper API template
CREATE apps/optionssniper/api:
  - Basic Express server setup
  - TypeScript configuration
  - One example endpoint
  - Health check endpoint

Task 4: Setup OptionsSniper Live WebSocket template
CREATE apps/optionssniper/live:
  - Basic WebSocket server
  - TypeScript configuration
  - Example message broadcasting

Task 5: Setup OptionsSniper UI template
CREATE apps/optionssniper/ui:
  - Basic React + Vite setup
  - Example component using shared components
  - API proxy configuration
  - WebSocket connection example

Task 6: Setup Intuitions API template
CREATE apps/intuitions/api:
  - Basic Express server setup
  - Different example endpoints than OptionsSniper

Task 7: Setup Intuitions UI template
CREATE apps/intuitions/ui:
  - Basic React + Vite setup
  - Different UI than OptionsSniper
  - Example of shared component usage

Task 8: Install and validate
EXECUTE:
  Install all dependencies with pnpm
  Run development servers
  Verify all services start correctly
```

### Per task pseudocode

```typescript
# Task 1 - Root package.json with pnpm workspaces
{
  "name": "turborepo-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.5"
  },
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=18"
  }
}

# pnpm-workspace.yaml
packages:
  - "src/apps/**"
  - "src/packages/**"

# Task 3 - OptionsSniper API template structure
// Create a basic Express server with TypeScript
// Include health check and one example endpoint
// Use shared types and utilities where appropriate

# Task 5 - WebSocket server template
// Create basic WebSocket server
// Send example updates every few seconds
// Demonstrate TypeScript typing for WebSocket

# Task 6 - React UI template
// Basic React app with Vite
// Import and use at least one shared component
// Show WebSocket connection example
// Configure proxy to API server
```

### Integration Points

```yaml
PACKAGE_MANAGEMENT:
  - workspace protocol: "workspace:*"
  - internal imports: "@monorepo/package-name"
  - NEVER use relative imports between packages

TYPESCRIPT:
  - extends: "@monorepo/typescript-config/[config]"
  - paths: configured in root tsconfig.json
  - composite: false in base config

BUILD_PIPELINE:
  - turbo.json: define task dependencies
  - "^build": depend on deps being built
  - outputs: specify build artifacts

DEVELOPMENT:
  - proxy: Vite proxies to backend APIs
  - hot reload: works across packages
  - concurrent: all services run together
```

## Validation Loop

### Level 1: Structure Validation

```bash
# Verify workspace structure
pnpm ls --depth 0
# Expected: Should list all workspaces

# Check TypeScript paths
npx tsc --showConfig
# Expected: paths should include @monorepo/*

# Verify turbo setup
npx turbo run build --dry-run
# Expected: Should show build order
```

### Level 2: Package Installation

```bash
# Install all dependencies
pnpm install
# Expected: No errors, all packages linked

# Check for missing dependencies
pnpm ls --depth 0 | grep "MISSING"
# Expected: No output (no missing deps)

# Verify workspace linking
ls -la node_modules/@monorepo/
# Expected: Symlinks to packages/*
```

### Level 3: TypeScript Compilation

```bash
# Type check all projects
pnpm run typecheck
# If missing, add to root package.json:
# "typecheck": "turbo run typecheck"

# Check individual projects
cd apps/optionssniper/api && npx tsc --noEmit
cd apps/optionssniper/ui && npx tsc --noEmit
# Expected: No type errors

# Common issues:
# - "Cannot find module '@monorepo/...'" → Check tsconfig paths
# - "Type errors in node_modules" → Add skipLibCheck: true
```

### Level 4: Development Server

```bash
# Start all services
pnpm dev

# Expected ports:
# - OptionsSniper API: http://localhost:3001
# - OptionsSniper Live: ws://localhost:3002  
# - OptionsSniper UI: http://localhost:5001
# - Intuitions API: http://localhost:3003
# - Intuitions UI: http://localhost:5002

# Test API endpoints
curl http://localhost:3001/health
# Expected: {"status":"ok","service":"optionssniper-api"}

curl http://localhost:3001/api/options
# Expected: {"success":true,"data":[...]}

# Test WebSocket
wscat -c ws://localhost:3002
# Expected: Receive live updates every second

# Test UI proxy
curl http://localhost:5001/api/options
# Expected: Same as direct API call (proxy working)
```

### Level 5: Build Validation

```bash
# Production build
pnpm build
# Expected: All projects build successfully

# Check build outputs
find . -name "dist" -type d
# Expected: dist folders in all apps

# Test production builds
cd apps/optionssniper/api && npm start
# Expected: Server starts on configured port

# Bundle analysis (for UI apps)
cd apps/optionssniper/ui
npx vite build --mode analyze
# Review bundle size and dependencies
```

### Level 6: Integration Testing

```bash
# Test shared type changes
# 1. Modify packages/shared-types/src/index.ts
# 2. Save file
# 3. Check that TypeScript errors appear in consuming apps
# 4. Fix type errors
# Expected: Changes propagate immediately

# Test shared component changes
# 1. Modify packages/ui-components/src/Button.tsx
# 2. Save file
# 3. Check UI hot reloads with changes
# Expected: No manual restart needed

# Test concurrent development
pnpm dev:optionssniper
# Expected: Only OptionsSniper services start

pnpm dev:intuitions  
# Expected: Only Intuitions services start
```

## Final Validation Checklist

- [ ] Directory structure matches specification
- [ ] All packages listed in `pnpm ls`
- [ ] TypeScript compiles: `npx tsc --noEmit` in each app
- [ ] ESLint passes: `pnpm lint`
- [ ] All services start: `pnpm dev`
- [ ] APIs respond: `curl http://localhost:300X/health`
- [ ] WebSocket connects and sends data
- [ ] UIs load and proxy to APIs correctly
- [ ] Shared packages work (modify and verify)
- [ ] Production build succeeds: `pnpm build`
- [ ] Hot reload works across packages

---

## Anti-Patterns to Avoid

- ❌ Don't use relative imports between packages (use @monorepo/*)
- ❌ Don't hardcode versions for workspace dependencies
- ❌ Don't skip the workspace protocol (workspace:*)
- ❌ Don't create circular dependencies between packages
- ❌ Don't put app-specific code in shared packages
- ❌ Don't ignore TypeScript errors - fix them properly
- ❌ Don't use different Node/npm versions across packages
- ❌ Don't forget to export new components from index files