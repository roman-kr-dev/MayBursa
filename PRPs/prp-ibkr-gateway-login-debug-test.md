# PRP: IBKR Gateway Login Process Debug Test

## Context

**Goal**: Create a focused test to verify IBKR Gateway login process success with visual debugging enabled

**Scope**: 
- Create standalone test for login process validation
- Use IBKR_PUPPETEER_DEBUG_MODE=true for visual debugging
- Execute repeatedly until successful login is achieved
- Support both paper and production modes via IBKR_TRADING_MODE environment variable

```yaml
context:
  docs:
    - url: https://interactivebrokers.github.io/cpwebapi/
      focus: Authentication endpoints and status checking

  patterns:
    - file: src/packages/shared-utils/src/__tests__/logger.test.ts
      copy: Jest test structure and async testing patterns
    - file: src/apps/ibkr-gateway/src/services/loginAutomation.ts
      copy: Puppeteer implementation and selectors

  gotchas:
    - issue: "Puppeteer requires browser download on first run"
      fix: "Run npm install in ibkr-gateway directory first"
    - issue: "Certificate warnings block login"
      fix: "Already handled in loginAutomation.ts"
    - issue: "Debug mode shows browser but closes quickly on success"
      fix: "Add delays in test to observe successful state"
```

## Tasks

### 1. Setup Test Infrastructure

**CREATE** src/apps/ibkr-gateway/src/__tests__/login.test.ts:
```typescript
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import puppeteer from 'puppeteer';
import { performLogin } from '../services/loginAutomation';
import { validateIBKRAuthentication } from '../services/authStatus';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Set timeout for login tests (3 minutes)
jest.setTimeout(180000);

describe('IBKR Gateway Login Process', () => {
  // Test implementation will go here
});
```
- **VALIDATE**: `cd src/apps/ibkr-gateway && npm test -- --listTests`
- **IF_FAIL**: Check jest configuration exists
- **ROLLBACK**: Remove test file

### 2. Add Jest Configuration

**CREATE** src/apps/ibkr-gateway/jest.config.js:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};
```
- **VALIDATE**: `cd src/apps/ibkr-gateway && npm test -- --version`
- **IF_FAIL**: Install jest and ts-jest dependencies
- **ROLLBACK**: Remove jest.config.js

### 3. Create Test Setup File

**CREATE** src/apps/ibkr-gateway/src/__tests__/setup.ts:
```typescript
// Ensure IBKR_PUPPETEER_DEBUG_MODE is set for visual debugging
process.env.IBKR_PUPPETEER_DEBUG_MODE = 'true';

// Set reasonable timeouts
process.env.PUPPETEER_TIMEOUT = '60000';

// Trading mode will be set by environment or .env file
// Do not override IBKR_TRADING_MODE here - respect user's choice
```
- **VALIDATE**: File exists
- **IF_FAIL**: Create __tests__ directory first
- **ROLLBACK**: Remove setup file

### 4. Implement Login Success Test

**UPDATE** src/apps/ibkr-gateway/src/__tests__/login.test.ts:
```typescript
describe('IBKR Gateway Login Process', () => {
  let gatewayPort: string;
  
  beforeAll(() => {
    gatewayPort = process.env.IBKR_GATEWAY_PORT || '5000';
    const tradingMode = process.env.IBKR_TRADING_MODE || 'paper';
    
    console.log('Test Configuration:');
    console.log('- Debug Mode:', process.env.IBKR_PUPPETEER_DEBUG_MODE);
    console.log('- Trading Mode:', tradingMode);
    console.log('- Gateway Port:', gatewayPort);
    console.log('- Username:', process.env.IBKR_USERNAME ? 'Set' : 'Not Set');
    console.log('- Password:', process.env.IBKR_PASSWORD ? 'Set' : 'Not Set');
    
    if (tradingMode === 'production') {
      console.log('⚠️  WARNING: Running in PRODUCTION mode - Real money account!');
      console.log('⚠️  2FA will be required - Have your device ready');
    }
  });

  it('should successfully complete login process with visual debugging', async () => {
    console.log('\n=== Starting IBKR Gateway Login Test ===\n');
    
    // Verify credentials are set
    expect(process.env.IBKR_USERNAME).toBeDefined();
    expect(process.env.IBKR_PASSWORD).toBeDefined();
    
    try {
      // Perform login with debug mode enabled
      console.log('1. Launching browser in debug mode...');
      const result = await performLogin();
      
      expect(result.success).toBe(true);
      console.log('✓ Login automation completed successfully');
      
      // Add delay to observe successful state in debug mode
      if (process.env.IBKR_PUPPETEER_DEBUG_MODE === 'true') {
        console.log('2. Keeping browser open for 5 seconds to observe success...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // For production mode, add extra time for 2FA
      if (process.env.IBKR_TRADING_MODE === 'production' && result.waited2FA) {
        console.log('✓ 2FA was completed successfully');
      }
      
      // Validate authentication via API
      console.log('3. Validating authentication status via API...');
      const authStatus = await validateIBKRAuthentication();
      
      expect(authStatus).toBe(true);
      console.log('✓ Authentication validated successfully via API');
      
      console.log('\n=== Login Test Completed Successfully ===\n');
    } catch (error) {
      console.error('Login test failed:', error);
      
      // Log additional debugging information
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Stack trace:', error.stack);
      }
      
      throw error;
    }
  });
});
```
- **VALIDATE**: `cd src/apps/ibkr-gateway && npm test -- login.test.ts`
- **IF_FAIL**: Check error logs and screenshots directory
- **ROLLBACK**: Revert to previous test implementation

### 5. Create Test Runner Script

**CREATE** src/apps/ibkr-gateway/scripts/test-login.sh:
```bash
#!/bin/bash

echo "==================================="
echo "IBKR Gateway Login Debug Test"
echo "==================================="
echo ""

# Set debug mode
export IBKR_PUPPETEER_DEBUG_MODE=true
export NODE_ENV=test

# Load .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check required environment variables
if [ -z "$IBKR_USERNAME" ] || [ -z "$IBKR_PASSWORD" ]; then
  echo "ERROR: IBKR_USERNAME and IBKR_PASSWORD must be set in .env file"
  exit 1
fi

# Run test in a loop until successful
attempt=1
max_attempts=10

while [ $attempt -le $max_attempts ]; do
  echo ""
  echo "Attempt $attempt of $max_attempts"
  echo "------------------------"
  
  npm test -- login.test.ts --verbose
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Login test succeeded on attempt $attempt!"
    exit 0
  else
    echo ""
    echo "❌ Login test failed on attempt $attempt"
    
    if [ $attempt -lt $max_attempts ]; then
      echo "Waiting 10 seconds before retry..."
      sleep 10
    fi
  fi
  
  attempt=$((attempt + 1))
done

echo ""
echo "❌ Login test failed after $max_attempts attempts"
exit 1
```
- **VALIDATE**: `chmod +x scripts/test-login.sh && ls -la scripts/test-login.sh`
- **IF_FAIL**: Create scripts directory first
- **ROLLBACK**: Remove script file

### 6. Add Test Dependencies

**UPDATE** src/apps/ibkr-gateway/package.json:
```json
{
  "scripts": {
    "test": "jest",
    "test:login": "./scripts/test-login.sh",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2"
  }
}
```
- **VALIDATE**: `cd src/apps/ibkr-gateway && npm install`
- **IF_FAIL**: Check npm registry connectivity
- **ROLLBACK**: Restore original package.json

### 7. Create Debug Helper

**CREATE** src/apps/ibkr-gateway/src/__tests__/helpers/debug.ts:
```typescript
import puppeteer from 'puppeteer';

export async function takeDebugScreenshot(page: puppeteer.Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshots/debug-${name}-${timestamp}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`Debug screenshot saved: ${filename}`);
}

export async function logPageState(page: puppeteer.Page, label: string) {
  const url = page.url();
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body?.innerText || 'No body text');
  
  console.log(`\n--- Page State: ${label} ---`);
  console.log(`URL: ${url}`);
  console.log(`Title: ${title}`);
  console.log(`Body preview: ${bodyText.substring(0, 200)}...`);
  console.log(`----------------------------\n`);
}
```
- **VALIDATE**: File exists and TypeScript compiles
- **IF_FAIL**: Check TypeScript configuration
- **ROLLBACK**: Remove helper file

### 8. Enhance Login Test with Debugging

**UPDATE** src/apps/ibkr-gateway/src/__tests__/login.test.ts (add debug helpers):
```typescript
import { takeDebugScreenshot, logPageState } from './helpers/debug';

// In the test, add debugging hooks
it('should successfully complete login process with visual debugging', async () => {
  // ... existing test code ...
  
  // Add manual browser control for debugging
  if (process.env.IBKR_PUPPETEER_DEBUG_MODE === 'true') {
    console.log('\n📌 Manual Debug Mode Instructions:');
    console.log('1. Browser window is now open');
    console.log('2. You can interact with the login form');
    console.log('3. The test will continue after login completes');
    console.log('4. Check screenshots/ directory for any failures\n');
  }
  
  // ... rest of test ...
});
```
- **VALIDATE**: Test imports work correctly
- **IF_FAIL**: Check import paths
- **ROLLBACK**: Remove debug imports

## Validation Strategy

### Unit Level
- Each file creation/update is validated immediately
- TypeScript compilation checks
- Import resolution verification

### Integration Level
- Full test execution with debug mode
- Screenshot capture on failures
- API validation after login

### End-to-End
- Multiple retry attempts
- Visual confirmation in browser
- Final auth status check

## Execution Instructions

1. **Initial Setup**:
   ```bash
   cd src/apps/ibkr-gateway
   npm install
   ```

2. **Configure Environment**:
   ```bash
   # Ensure .env has:
   IBKR_USERNAME=your_username
   IBKR_PASSWORD=your_password
   IBKR_TRADING_MODE=paper  # or 'production' for real money
   IBKR_PUPPETEER_DEBUG_MODE=true
   ```

3. **Run Test**:
   ```bash
   npm run test:login
   ```

4. **Debug Failed Attempts**:
   - Check `screenshots/` directory
   - Review console output
   - Verify credentials
   - Check gateway is running

## Success Criteria

- [ ] Browser opens visibly (debug mode)
- [ ] Login form is filled automatically
- [ ] Authentication completes successfully
- [ ] API validates auth status as true
- [ ] Test passes within 10 attempts
- [ ] No error screenshots generated

## Troubleshooting

### Common Issues

1. **"Gateway not running"**
   - Start gateway: `npm run dev`
   - Check port: `lsof -i :5000`

2. **"Invalid credentials"**
   - Verify .env file
   - Check trading mode matches account type:
     - Paper accounts: Use paper trading credentials
     - Production accounts: Use live trading credentials
   - Ensure credentials match the IBKR_TRADING_MODE setting

3. **"Browser not launching"**
   - Install Puppeteer: `npm install puppeteer`
   - Check system dependencies

4. **"Certificate errors"**
   - Already handled by `--ignore-certificate-errors`
   - Check gateway SSL setup

## Notes

- Test respects IBKR_TRADING_MODE environment variable (paper/production)
- Production mode requires 2FA - have your device ready
- Debug mode keeps browser visible for inspection
- Screenshots saved on failures in screenshots/ directory
- Retries up to 10 times automatically
- 3-minute timeout per attempt
- For production testing, ensure you're using appropriate test accounts