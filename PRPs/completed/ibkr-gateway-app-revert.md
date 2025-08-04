# REVERT PRP: Remove IBKR Gateway App

This PRP provides instructions to completely remove the IBKR Gateway application created by the ibkr-gateway-app.md PRP.

## Files to Delete

### Application Files
```bash
# Remove the entire ibkr-gateway app directory
rm -rf src/apps/ibkr-gateway
```

## Files to Modify

### 1. Root package.json
Remove the following script:
```json
"dev:ibkr-gateway": "turbo run dev --filter=@maybursa/ibkr-gateway",
```

### 2. .env.local
Remove all IBKR-related environment variables:
- IBKR_GATEWAY_PORT
- IBKR_CONTROL_PANEL_PORT
- IBKR_CLIENTPORTAL_PATH
- IBKR_USERNAME
- IBKR_PASSWORD
- NODE_TLS_REJECT_UNAUTHORIZED (if only used for IBKR)

### 3. .env.example
Remove the entire IBKR section or reset the file to its previous state.

## Cleanup Commands

```bash
# 1. Remove the application directory
rm -rf src/apps/ibkr-gateway

# 2. Clean up any generated files
rm -f gateway.pid
rm -rf logs/
rm -rf screenshots/

# 3. Kill any running IBKR processes
pkill -f 'clientportal.gw' || true
pkill -f 'vertx' || true

# 4. Remove node_modules if needed
cd src/apps/ibkr-gateway && rm -rf node_modules

# 5. Update root package.json (manually remove the script)
```

## Dependencies to Uninstall

If these dependencies were only used by the IBKR Gateway app:
- puppeteer
- winston
- axios (check if used elsewhere)
- dotenv (check if used elsewhere)
- express (check if used elsewhere)

## Verification Steps

1. Ensure no IBKR processes are running:
   ```bash
   ps aux | grep -E '(clientportal|vertx|java.*ibkr)'
   ```

2. Verify the app directory is removed:
   ```bash
   ls src/apps/ | grep ibkr
   ```

3. Check that environment variables are removed:
   ```bash
   grep IBKR .env.local
   ```

4. Ensure the dev script is removed:
   ```bash
   grep ibkr-gateway package.json
   ```

## Manual Cleanup

1. Remove any IBKR-related credentials from password managers
2. Delete the clientportal.gw directory if no longer needed
3. Remove any browser bookmarks to http://localhost:3000 (IBKR Control Panel)

## Notes

- This revert will completely remove the IBKR Gateway Manager application
- Any running gateway processes will be terminated
- Credentials stored in .env.local will be removed
- The original clientportal.gw installation will remain untouched