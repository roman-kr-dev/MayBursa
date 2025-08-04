# PRP: Implement Browser MCP for IBKR Gateway Login Testing

## Context

```yaml
context:
  docs:
    - url: https://docs.browsermcp.io/welcome
      focus: Browser MCP overview and capabilities
    - url: https://docs.browsermcp.io/setup-server
      focus: MCP server setup and configuration
    - url: https://modelcontextprotocol.io/quickstart/user
      focus: MCP protocol integration patterns

  patterns:
    - file: src/apps/ibkr-gateway/services/loginAutomation.ts
      copy: Existing Puppeteer-based login automation
    - file: PRPs/ai_docs/cc_mcp.md
      copy: MCP server configuration patterns
    - file: src/packages/shared-utils/jest.config.js
      copy: Test configuration pattern

  gotchas:
    - issue: "MCP servers may start twice in Claude Desktop"
      fix: "Account for duplicate server instances"
    - issue: "Browser extension required for full functionality"
      fix: "Document manual extension setup steps"
    - issue: "Puppeteer already handles browser automation"
      fix: "Integrate MCP as test orchestration layer"
```

## Objectives

1. Set up Browser MCP server in the monorepo
2. Create MCP configuration for the project
3. Implement test suite using Browser MCP to validate IBKR Gateway login
4. Document the integration and test usage

## Task Structure

### 1. Setup Browser MCP Package

**ACTION** src/packages/browser-mcp-test/package.json:
  - OPERATION: Create new package for Browser MCP testing
  - VALIDATE: `pnpm install` in package directory
  - IF_FAIL: Check pnpm workspace configuration
  - ROLLBACK: Remove package directory

```json
{
  "name": "@monorepo/browser-mcp-test",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "dependencies": {
    "@browsermcp/mcp": "latest",
    "@modelcontextprotocol/sdk": "latest"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.0.0"
  }
}
```

### 2. Create MCP Server Configuration

**ACTION** .mcp/servers.json:
  - OPERATION: Create MCP server configuration file
  - VALIDATE: JSON syntax validation
  - IF_FAIL: Check JSON formatting
  - ROLLBACK: Remove file

```json
{
  "mcpServers": {
    "browsermcp": {
      "command": "npx",
      "args": ["@browsermcp/mcp@latest"]
    },
    "ibkr-gateway-test": {
      "command": "node",
      "args": ["./src/packages/browser-mcp-test/dist/server.js"],
      "env": {
        "NODE_ENV": "test",
        "IBKR_GATEWAY_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 3. Implement Test Configuration

**ACTION** src/packages/browser-mcp-test/jest.config.js:
  - OPERATION: Create Jest configuration for MCP tests
  - VALIDATE: `jest --listTests`
  - IF_FAIL: Check preset and module paths
  - ROLLBACK: Use default Jest config

```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 4. Create MCP Test Server

**ACTION** src/packages/browser-mcp-test/src/server.ts:
  - OPERATION: Implement MCP server for IBKR Gateway testing
  - VALIDATE: `tsc --noEmit`
  - IF_FAIL: Check TypeScript configuration
  - ROLLBACK: Remove implementation

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'ibkr-gateway-test',
  version: '1.0.0',
});

// Tool definitions for IBKR Gateway testing
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'test_login',
      description: 'Test IBKR Gateway login process',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
          tradingMode: { type: 'string', enum: ['paper', 'production'] }
        },
        required: ['username', 'password']
      }
    },
    {
      name: 'verify_authentication',
      description: 'Verify IBKR Gateway authentication status',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'capture_login_screenshot',
      description: 'Capture screenshot during login process',
      inputSchema: {
        type: 'object',
        properties: {
          step: { type: 'string' }
        }
      }
    }
  ]
}));

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 5. Implement Login Test Suite

**ACTION** src/packages/browser-mcp-test/src/__tests__/ibkr-login.test.ts:
  - OPERATION: Create comprehensive login test suite
  - VALIDATE: `pnpm test`
  - IF_FAIL: Check test environment setup
  - ROLLBACK: Simplify test cases

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('IBKR Gateway Login Tests', () => {
  let mcpClient: Client;
  
  beforeAll(async () => {
    // Initialize MCP client
    mcpClient = new Client({
      name: 'ibkr-test-client',
      version: '1.0.0'
    });
    
    // Connect to Browser MCP server
    await mcpClient.connect({
      url: 'http://localhost:5001/mcp'
    });
  });
  
  afterAll(async () => {
    await mcpClient.close();
  });
  
  test('should successfully login with valid credentials', async () => {
    const result = await mcpClient.callTool('test_login', {
      username: process.env.IBKR_USERNAME,
      password: process.env.IBKR_PASSWORD,
      tradingMode: 'paper'
    });
    
    expect(result.success).toBe(true);
    expect(result.authenticationStatus).toBe('authenticated');
  });
  
  test('should handle 2FA challenge', async () => {
    // Test 2FA handling logic
  });
  
  test('should capture login screenshots', async () => {
    const screenshot = await mcpClient.callTool('capture_login_screenshot', {
      step: 'credentials-entry'
    });
    
    expect(screenshot.path).toBeDefined();
    expect(screenshot.timestamp).toBeDefined();
  });
});
```

### 6. Create Browser MCP Integration

**ACTION** src/packages/browser-mcp-test/src/browser-integration.ts:
  - OPERATION: Create integration layer between Browser MCP and IBKR Gateway
  - VALIDATE: `tsc --noEmit`
  - IF_FAIL: Check import paths
  - ROLLBACK: Use direct API calls

```typescript
import { Browser } from '@browsermcp/mcp';

export class IBKRGatewayTester {
  private browser: Browser;
  
  constructor() {
    this.browser = new Browser({
      headless: process.env.HEADLESS !== 'false',
      slowMo: parseInt(process.env.SLOW_MO || '0')
    });
  }
  
  async testLogin(credentials: LoginCredentials): Promise<TestResult> {
    try {
      // Navigate to IBKR Gateway
      await this.browser.navigate('http://localhost:3000');
      
      // Fill login form
      await this.browser.fill('#username', credentials.username);
      await this.browser.fill('#password', credentials.password);
      
      // Submit and wait for response
      await this.browser.click('#submit-login');
      await this.browser.waitForSelector('.auth-success', { timeout: 30000 });
      
      // Verify authentication
      const authStatus = await this.browser.evaluate(() => {
        return document.querySelector('.auth-status')?.textContent;
      });
      
      return {
        success: true,
        authenticationStatus: authStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}
```

### 7. Update Turborepo Configuration

**ACTION** turbo.json:
  - OPERATION: Add browser-mcp-test to pipeline
  - VALIDATE: `turbo run test --filter=@monorepo/browser-mcp-test`
  - IF_FAIL: Check pipeline dependencies
  - ROLLBACK: Revert turbo.json changes

```json
{
  "pipeline": {
    "test:mcp": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": false,
      "env": ["IBKR_USERNAME", "IBKR_PASSWORD"]
    }
  }
}
```

### 8. Create Test Documentation

**ACTION** src/packages/browser-mcp-test/README.md:
  - OPERATION: Document Browser MCP test setup and usage
  - VALIDATE: Markdown linting
  - IF_FAIL: Fix markdown syntax
  - ROLLBACK: Use minimal documentation

```markdown
# Browser MCP Tests for IBKR Gateway

## Setup

1. Install Browser MCP extension in your browser
2. Configure MCP servers: `cp .mcp/servers.json ~/.config/mcp/`
3. Set environment variables in `.env.test`

## Running Tests

```bash
# Run all MCP tests
pnpm test:mcp

# Run specific test
pnpm test:mcp -- ibkr-login.test.ts

# Run with debugging
HEADLESS=false SLOW_MO=250 pnpm test:mcp
```

## Test Coverage

- Login flow validation
- 2FA handling
- Error scenarios
- Screenshot capture
- Authentication persistence
```

### 9. Add Test Scripts to Root Package

**ACTION** package.json:
  - OPERATION: Add MCP test scripts to root package.json
  - VALIDATE: `pnpm run test:mcp:setup`
  - IF_FAIL: Check script syntax
  - ROLLBACK: Remove added scripts

```json
{
  "scripts": {
    "test:mcp:setup": "pnpm --filter @monorepo/browser-mcp-test install",
    "test:mcp": "turbo run test --filter=@monorepo/browser-mcp-test",
    "test:mcp:watch": "turbo run test:watch --filter=@monorepo/browser-mcp-test"
  }
}
```

### 10. Create Environment Template

**ACTION** .env.test.example:
  - OPERATION: Create test environment template
  - VALIDATE: File exists
  - IF_FAIL: Check file permissions
  - ROLLBACK: Remove file

```bash
# Browser MCP Test Configuration
MCP_SERVER_PORT=5001
MCP_CLIENT_TIMEOUT=30000

# IBKR Test Credentials
IBKR_TEST_USERNAME=your_test_username
IBKR_TEST_PASSWORD=your_test_password
IBKR_TEST_TRADING_MODE=paper

# Test Configuration
HEADLESS=true
SLOW_MO=0
SCREENSHOT_DIR=./test-screenshots
```

## Validation Strategy

1. **Unit Testing**
   - Run `pnpm test:mcp` after each component
   - Verify MCP server starts correctly
   - Check tool registration

2. **Integration Testing**
   - Test end-to-end login flow
   - Verify screenshot capture
   - Validate error handling

3. **Performance Testing**
   - Measure login completion time
   - Check resource usage
   - Monitor MCP server stability

## Rollback Plan

1. Remove browser-mcp-test package
2. Delete .mcp directory
3. Revert turbo.json changes
4. Remove test scripts from package.json
5. Clean up any generated test artifacts

## Success Criteria

- [ ] Browser MCP server runs successfully
- [ ] Login tests pass with valid credentials
- [ ] Screenshots are captured correctly
- [ ] Error scenarios are handled gracefully
- [ ] Test coverage meets 80% threshold
- [ ] Documentation is complete and accurate
- [ ] Integration works in CI/CD pipeline

## Notes

- Browser MCP requires manual browser extension setup
- Tests should run in isolated environment
- Consider using test-specific IBKR credentials
- MCP server may need elevated permissions for browser control