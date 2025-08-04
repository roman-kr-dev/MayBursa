# PRP: Update IBKR Gateway to Use Native Configuration

## Context

This PRP updates the IBKR Gateway application to use the native client portal configuration file (`clientportal.gw/root/conf.yaml`) instead of the custom configuration file (`conf-custom.yaml`).

```yaml
context:
  docs:
    - url: https://www.interactivebrokers.com/campus/ibkr-api-page/webapi-doc/
      focus: Client Portal Gateway configuration and startup

  patterns:
    - file: src/services/clientPortalManager.ts
      copy: Configuration file handling pattern

  gotchas:
    - issue: "run.sh script prepends ../ to config path"
      fix: "Use path relative to bin directory: root/conf.yaml"
    - issue: "Configuration file must exist before gateway starts"
      fix: "Verify file existence in clientPortalManager.ts"
```

## Task Structure

### 1. Update clientPortalManager.ts Configuration Path

ACTION src/services/clientPortalManager.ts:
  - OPERATION: Change configPath from 'conf-custom.yaml' to 'root/conf.yaml'
  - VALIDATE: npm run lint:ibkr-gateway
  - IF_FAIL: Check TypeScript errors, ensure path is correct
  - ROLLBACK: Revert to 'conf-custom.yaml'

**Code Changes:**
- Line 66: Change `const configPath = 'conf-custom.yaml';` to `const configPath = 'root/conf.yaml';`
- Line 72: Update actualConfigPath to use the new path structure
- Ensure path validation works with new location

### 2. Remove Custom Configuration File

ACTION src/apps/ibkr-gateway/conf-custom.yaml:
  - OPERATION: Delete the custom configuration file
  - VALIDATE: ls src/apps/ibkr-gateway/ | grep conf-custom.yaml (should return nothing)
  - IF_FAIL: Check if file is still referenced elsewhere
  - ROLLBACK: Restore from git

### 3. Update IBKR Gateway README

ACTION src/apps/ibkr-gateway/README.md:
  - OPERATION: Update configuration section to reference native conf.yaml
  - VALIDATE: grep -n "conf-custom.yaml" src/apps/ibkr-gateway/README.md (should return nothing)
  - IF_FAIL: Search for additional references in documentation
  - ROLLBACK: Revert README changes

**Documentation Updates:**
- Remove references to conf-custom.yaml
- Add note about using native clientportal.gw/root/conf.yaml
- Update configuration customization instructions

### 4. Update Root README (if applicable)

ACTION README.md:
  - OPERATION: Update any IBKR Gateway configuration references
  - VALIDATE: grep -n "conf-custom.yaml" README.md (should return nothing)
  - IF_FAIL: Check for indirect references
  - ROLLBACK: Revert README changes

### 5. Verify Native Configuration Content

ACTION src/apps/ibkr-gateway/clientportal.gw/root/conf.yaml:
  - OPERATION: Verify configuration has required settings
  - VALIDATE: Ensure listenPort, listenSsl, and other critical settings exist
  - IF_FAIL: May need to merge settings from conf-custom.yaml
  - ROLLBACK: Create backup of native conf.yaml before modifications

**Critical Settings to Verify:**
- listenPort: 5001
- listenSsl: true
- IP allowlist includes localhost
- Proper SSL certificate configuration

## Task Sequencing

1. **Preparation**: Backup current configuration
2. **Code Update**: Modify clientPortalManager.ts
3. **Cleanup**: Remove conf-custom.yaml
4. **Documentation**: Update all README files
5. **Validation**: Test gateway startup

## Validation Strategy

### Unit Tests
```bash
npm run lint:ibkr-gateway
npm run typecheck:ibkr-gateway
```

### Integration Test
```bash
npm run dev:ibkr-gateway
# Verify gateway starts successfully
# Check logs for configuration loading
# Test API endpoint connectivity
```

### Manual Verification
1. Gateway starts without errors
2. Can access https://localhost:5001
3. Authentication works properly
4. API endpoints respond correctly

## User Interaction Points

1. **Before Changes**
   - Confirm native conf.yaml has all required settings
   - Backup current working configuration

2. **After Changes**
   - Test gateway connection
   - Verify all functionality works as before

## Risk Assessment

- **Low Risk**: Path change is straightforward
- **Medium Risk**: Native conf.yaml might have different defaults
- **Mitigation**: Compare configurations before switching

## Success Criteria

- [ ] dev:ibkr-gateway command runs without errors
- [ ] Gateway connects successfully on port 5001
- [ ] No references to conf-custom.yaml remain
- [ ] Documentation accurately reflects new configuration

## Debug Strategies

If gateway fails to start:
1. Check logs in `clientportal.gw/logs/`
2. Verify conf.yaml exists at `clientportal.gw/root/conf.yaml`
3. Compare native conf.yaml with old conf-custom.yaml for missing settings
4. Check file permissions on configuration file

## Rollback Approach

```bash
git checkout -- src/services/clientPortalManager.ts
git checkout -- src/apps/ibkr-gateway/README.md
git checkout -- README.md
git restore src/apps/ibkr-gateway/conf-custom.yaml
```