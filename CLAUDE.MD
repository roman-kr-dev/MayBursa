# Cloud Development Guide

## 🛑 CRITICAL RULES - READ FIRST

### MANDATORY: External Library Verification
**STOP AND CHECK** - Before making ANY changes to external library usage:
1. **ALWAYS verify with Context7 MCP** before modifying external library code, including:
   - Property names and method calls
   - Configuration options and parameters
   - Even "obvious" or "simple" fixes
   - TypeScript error corrections involving library APIs
2. This applies to ALL libraries including but not limited to:
   - Puppeteer launch options and methods
   - Axios configurations
   - Express middleware
   - React hooks and components
   - Any third-party library APIs

**Never assume** - Even if you think you know the correct API, always verify first.

This document imports configuration and best practices for cloud-based Node.js and React development.

## Imports

- @README - Project overview and monorepo structure
- [CLAUDE-NODE.md](./CLAUDE-NODE.md) - Node.js backend development guidelines
- [CLAUDE-REACT.md](./CLAUDE-REACT.md) - React frontend development guidelines

## Overview

This guide combines best practices for building cloud-native applications using Node.js for backend services and React for frontend interfaces. The README provides essential project context including the monorepo structure, available applications (OptionsSniper and Intuitions), and development workflows. Refer to the imported documents above for specific implementation details and conventions for each technology stack.

## IBKR Gateway Development
When working on the IBKR Gateway application (`src/apps/ibkr-gateway/`), ALWAYS reference:
- `src/apps/ibkr-gateway/CLAUDE.md` for gateway-specific rules and guidelines

## External Library Management with Context7 MCP

### ⚠️ REMINDER: Verification is Required for ALL External Library Changes

This includes ANY modification to how external libraries are used:
- **Property name changes** (e.g., fixing TypeScript errors)
- **Method parameters** (even if they seem obvious)
- **Configuration options** (launch options, initialization parameters)
- **Version updates** (major, minor, or patch)
- **New library additions or removals**

**Process:**
1. Encounter an issue with external library usage
2. **STOP** - Do not make assumptions
3. Use Context7 MCP to verify the correct API
4. Only then make the change based on official documentation

**Common Pitfalls to Avoid:**
- Assuming property names based on similar APIs
- "Quick fixing" TypeScript errors without verification
- Relying on training knowledge instead of current documentation

## Logging Standards

- **ALWAYS use** `import { logger } from '@monorepo/shared-utils';`
- **NEVER use** `console.log()`, `console.error()`, `console.warn()`, or `console.info()`
- **Logger methods**: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`

## Interactive Brokers (IBKR) API Development

### MANDATORY: Always Consult IBKR API Reference

Before performing ANY operation related to Interactive Brokers API, you MUST:

1. **Read the API-README.md** located at `src/apps/ibkr-gateway/reference/API-README.md`