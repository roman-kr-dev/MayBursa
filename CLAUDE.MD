# Cloud Development Guide

This document imports configuration and best practices for cloud-based Node.js and React development.

## Imports

- @README - Project overview and monorepo structure
- [CLAUDE-NODE.md](./CLAUDE-NODE.md) - Node.js backend development guidelines
- [CLAUDE-REACT.md](./CLAUDE-REACT.md) - React frontend development guidelines

## Overview

This guide combines best practices for building cloud-native applications using Node.js for backend services and React for frontend interfaces. The README provides essential project context including the monorepo structure, available applications (OptionsSniper and Intuitions), and development workflows. Refer to the imported documents above for specific implementation details and conventions for each technology stack.

## External Library Management with Context7 MCP

### IMPORTANT: Always Verify External Library Versions and Documentation

Before making ANY changes involving external libraries or dependencies (including updates, modifications, additions, or removals), you MUST use the Context7 MCP server to:

1. Verify the latest available version of the library.
2. Review and confirm current documentation, usage patterns, and best practices.

This applies every time external library code is altered to ensure compatibility, optimal usage, and adherence to updated standards.

## Logging Standards

- **ALWAYS use** `import { logger } from '@monorepo/shared-utils';`
- **NEVER use** `console.log()`, `console.error()`, `console.warn()`, or `console.info()`
- **Logger methods**: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`