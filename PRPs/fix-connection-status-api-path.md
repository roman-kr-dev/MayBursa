# PRP: Fix ConnectionStatus API Path Bug

## Summary
Fix incorrect API path in connectionStatus.ts that duplicates the /v1/api prefix, and add debug logging for the response.

## Context

```yaml
context:
  docs:
    - url: https://www.interactivebrokers.com/campus/ibkr-api-page/webapi-ref/
      focus: Authentication endpoints and API path structure

  patterns:
    - file: src/apps/ibkr-gateway/src/services/authStatus.ts:43
      copy: "baseURL includes /v1/api prefix pattern"
    - file: src/apps/ibkr-gateway/src/services/authStatus.ts:58
      copy: "API endpoint path without /v1/api prefix"

  gotchas:
    - issue: "Two different axios instances with different base URLs"
      fix: "connectionStatus uses root URL, authStatus includes /v1/api"
    - issue: "IBKR Gateway API expects /v1/api prefix"
      fix: "Either include in baseURL or in endpoint path, not both"
```

## Tasks

### 1. Fix API Path in checkApiAvailability

**READ** src/apps/ibkr-gateway/src/services/connectionStatus.ts:75-96
  - CONFIRM: Line 78 shows '/v1/api/iserver/auth/status'
  - CONFIRM: BaseURL on line 24 is 'https://localhost:${config.IBKR_GATEWAY_PORT}'
  - VALIDATE: Path duplication issue exists

**EDIT** src/apps/ibkr-gateway/src/services/connectionStatus.ts:
  - OPERATION: Change line 78 from '/v1/api/iserver/auth/status' to '/v1/api/iserver/auth/status'
  - REASON: BaseURL doesn't include /v1/api, so full path is needed
  - VALIDATE: grep -n "iserver/auth/status" src/apps/ibkr-gateway/src/services/*.ts
  - IF_FAIL: Check if baseURL was modified elsewhere
  - ROLLBACK: Revert to '/v1/api/iserver/auth/status'

### 2. Add Debug Logging for API Response

**EDIT** src/apps/ibkr-gateway/src/services/connectionStatus.ts:
  - OPERATION: Add console.debug after line 78 to log the response
  - CODE:
    ```typescript
    const response = await this.axiosInstance.get('/v1/api/iserver/auth/status');
    console.debug('Auth status response:', response.data);
    ```
  - VALIDATE: Ensure logger is available (line 4 imports it)
  - IF_FAIL: Use logger.debug instead of console.debug
  - ROLLBACK: Remove the debug line

### 3. Test the Fix

**RUN** npm test (if tests exist)
  - VALIDATE: No test failures related to connection status
  - IF_FAIL: Check test expectations for API paths

**MANUAL_TEST**:
  - Start IBKR Gateway
  - Monitor logs for the debug output
  - Verify successful auth status check
  - VALIDATE: Response logged correctly
  - VALIDATE: No 404 errors for auth status endpoint

## Validation Strategy

1. **Unit Testing**: 
   - Verify connectionStatus service initializes correctly
   - Mock axios calls to test path construction

2. **Integration Testing**:
   - Start the gateway service
   - Call checkApiAvailability()
   - Verify correct endpoint is hit
   - Check debug logs contain response data

3. **Performance**: 
   - No performance impact expected (only path change + debug log)

4. **Security**:
   - Ensure debug logs don't expose sensitive auth tokens
   - Verify response doesn't contain credentials

## Rollback Plan

If issues arise:
1. Revert path change in line 78
2. Remove debug logging
3. Restart services
4. Monitor for correct behavior

## Dependencies

- No new dependencies
- Uses existing axios instance
- Uses existing logger utility

## Risk Assessment

- **Low Risk**: Simple path correction
- **Debug Logging**: Ensure no sensitive data logged
- **Service Impact**: Minimal, only affects auth status check

## Success Criteria

1. ✓ Auth status endpoint returns 200 OK
2. ✓ No duplicate /v1/api in request path  
3. ✓ Debug logs show response data
4. ✓ No regression in connection checking
5. ✓ Gateway startup sequence works correctly