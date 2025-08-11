# Turborepo Monorepo - OptionsSniper & Intuitions

A production-ready TypeScript monorepo using Turborepo, containing two main applications with shared packages and components.

## 🚀 Applications

### OptionsSniper
Real-time options trading platform with:
- **API Server** (Port 3001): Express.js REST API for options data
- **WebSocket Server** (Port 3002): Live price updates via WebSocket
- **UI** (Port 5001): React + Vite dashboard with real-time updates

### Intuitions
Idea and prediction management system with:
- **API Server** (Port 3003): Express.js REST API for CRUD operations
- **UI** (Port 5002): React + Vite interface for managing intuitions

## 📦 Shared Packages

- **@monorepo/typescript-config**: Shared TypeScript configurations
- **@monorepo/eslint-config**: Shared ESLint configurations
- **@monorepo/shared-types**: Common type definitions
- **@monorepo/shared-utils**: Utility functions and helpers
- **@monorepo/ui-components**: Reusable React components
- **@monorepo/ibkr-client**: Interactive Brokers API client library with authentication functions

## 🏗️ Project Structure

```
.
├── src/
│   ├── apps/
│   │   ├── optionssniper/
│   │   │   ├── api/       # Express API server
│   │   │   ├── live/      # WebSocket server
│   │   │   └── ui/        # React UI
│   │   ├── intuitions/
│   │   │   ├── api/       # Express API server
│   │   │   └── ui/        # React UI
│   │   └── ibkr-gateway/  # IBKR Gateway management service
│   └── packages/
│       ├── typescript-config/
│       ├── eslint-config/
│       ├── shared-types/
│       ├── shared-utils/
│       ├── ui-components/
│       └── ibkr-client/   # IBKR API client library
│           └── src/
│               ├── auth/  # Authentication functions
│               │   ├── types.ts
│               │   ├── functions.ts
│               │   └── index.ts
│               ├── IBKRClient.ts
│               └── index.ts
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js >= 18
- pnpm 9.0.0 (automatically installed via corepack)

### Install Dependencies
```bash
pnpm install
```

## 🚦 Development

### Run All Services
```bash
pnpm dev
```

### Run Specific Apps
```bash
# Run only OptionsSniper services
pnpm dev:optionssniper

# Run only Intuitions services
pnpm dev:intuitions
```

### Service URLs
- OptionsSniper API: http://localhost:3001
- OptionsSniper WebSocket: ws://localhost:3002
- OptionsSniper UI: http://localhost:5001
- Intuitions API: http://localhost:3003
- Intuitions UI: http://localhost:5002

## 🧪 Available Scripts

### Build
```bash
# Build all packages
pnpm build

# Build specific app
pnpm --filter @monorepo/optionssniper-api build
```

### Type Checking
```bash
pnpm typecheck
```

### Linting
```bash
pnpm lint
```

### Clean
```bash
pnpm clean
```

## 🔧 Adding New Dependencies

### To a specific app/package
```bash
pnpm --filter @monorepo/optionssniper-api add express
```

### To the root
```bash
pnpm add -D -w prettier
```

## 📝 Key Features

- **Full TypeScript Support**: Type safety across all packages
- **Hot Module Reloading**: Changes to shared packages reflect immediately
- **Parallel Development**: All services run concurrently with `pnpm dev`
- **Cached Builds**: Turborepo caches build outputs for faster rebuilds
- **Shared Components**: UI components shared between applications
- **WebSocket Support**: Real-time updates in OptionsSniper

## 🏭 Production Build

```bash
# Build all packages for production
pnpm build

# Run production builds
cd src/apps/optionssniper/api && npm start
cd src/apps/optionssniper/live && npm start
cd src/apps/optionssniper/ui && npx vite preview
```

## 🎯 API Endpoints

### OptionsSniper API
- `GET /health` - Health check
- `GET /api/options` - List options with filtering
- `GET /api/options/:id` - Get single option
- `GET /api/options/:id/prices` - Get price history

### Intuitions API
- `GET /health` - Health check
- `GET /api/intuitions` - List intuitions with filtering
- `POST /api/intuitions` - Create new intuition
- `GET /api/intuitions/:id` - Get single intuition
- `PUT /api/intuitions/:id` - Update intuition
- `DELETE /api/intuitions/:id` - Delete intuition
- `GET /api/tags` - List available tags

## 📚 Development Tips

1. **Import Shared Packages**: Use `@monorepo/*` imports
   ```typescript
   import { Option, PriceUpdate } from '@monorepo/shared-types';
   import { formatCurrency } from '@monorepo/shared-utils';
   import { Button, Card } from '@monorepo/ui-components';
   ```

2. **Workspace Protocol**: Internal dependencies use `workspace:*`
   ```json
   {
     "dependencies": {
       "@monorepo/shared-types": "workspace:*"
     }
   }
   ```

3. **Type Safety**: All packages are fully typed with TypeScript

4. **Hot Reload**: Changes to shared packages automatically trigger rebuilds

## 🤝 Contributing

1. Make changes to the relevant packages/apps
2. Run `pnpm typecheck` to ensure type safety
3. Run `pnpm lint` to check code style
4. Run `pnpm build` to verify production builds

## 📄 License

Private repository - All rights reserved