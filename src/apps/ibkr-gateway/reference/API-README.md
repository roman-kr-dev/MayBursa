# IBKR API Reference Guide

## Overview
This directory contains the Interactive Brokers REST API documentation organized into compact YAML format for efficient reference.

## ⚠️ IMPORTANT: API Path Prefix
**All API endpoints require the `/v1/api` prefix** when making requests to the IBKR Gateway (running on `https://localhost:5001`).

### Exceptions:
- `/gw/*` endpoints use their path as-is
- `/oauth2/*` endpoints use their path as-is

### Example:
- Documentation shows: `/iserver/auth/status`
- Actual request: `https://localhost:5001/v1/api/iserver/auth/status`

## 📋 API Usage Requirements

### POST Request Requirements
**CRITICAL:** All POST endpoints require a JSON body, even if they don't need any parameters.

- **Minimum requirement:** Empty JSON object `{}`
- **Required header:** `Content-Type: application/json`
- **Without a body:** Returns "411 Length Required" or "Bad Request" error

### Working Examples

#### POST endpoint without parameters:
```bash
# Correct ✅
curl -X POST https://localhost:5001/v1/api/iserver/auth/status \
  -k \
  -H "Content-Type: application/json" \
  -d '{}'

# Wrong ❌ (missing body)
curl -X POST https://localhost:5001/v1/api/iserver/auth/status -k
# Returns: 411 Length Required
```

#### POST endpoint with parameters:
```bash
# Search for a contract
curl -X POST https://localhost:5001/v1/api/iserver/secdef/search \
  -k \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL"}'
```

#### GET endpoint (no body needed):
```bash
curl -X GET https://localhost:5001/v1/api/iserver/accounts \
  -k \
  -H "Content-Type: application/json"
```

### Important Notes:
- Use `-k` flag with curl to accept self-signed certificates from the local IBKR Gateway
- GET endpoints do not require a request body
- Some endpoints like `/iserver/auth/status` work with both GET and POST methods

## File Structure

### API Reference Files
- All YAML references are in the current directory
- `index.yaml` - Master index of all endpoints
- Total size: **70KB** across all YAML files

## Quick API Reference by Category

### 🏦 Account Management

#### Accounts (`account-management-accounts.yaml`)
- `GET /gw/api/v1/accounts` - Retrieve processed applications
- `POST /gw/api/v1/accounts` - Create new account
- `PATCH /gw/api/v1/accounts` - Update account information
- `GET /gw/api/v1/accounts/{accountId}/details` - Get account details
- `GET /gw/api/v1/accounts/{accountId}/status` - Get account status
- `GET /gw/api/v1/accounts/{accountId}/kyc` - KYC information
- `GET /gw/api/v1/accounts/status` - Bulk account status
- `GET /gw/api/v1/accounts/login-messages` - Get login messages
- `POST /gw/api/v1/accounts/documents` - Submit agreements/disclosures

#### Banking (`account-management-banking.yaml`)
- `POST /gw/api/v1/internal-cash-transfers` - Internal cash transfers
- `POST /gw/api/v1/external-cash-transfers` - External cash transfers
- `POST /gw/api/v1/internal-asset-transfers` - Internal asset transfers
- `POST /gw/api/v1/external-asset-transfers` - External asset transfers
- `GET /gw/api/v1/bank-instructions` - Get bank instructions
- `POST /gw/api/v1/bank-instructions/query` - Query bank instructions
- `GET /gw/api/v1/instructions/{instructionId}` - Get specific instruction
- `POST /gw/api/v1/instructions/cancel` - Cancel instruction

#### Reports (`account-management-reports.yaml`)
- `GET /gw/api/v1/statements` - Get account statements
- `GET /gw/api/v1/statements/available` - List available statements
- `GET /gw/api/v1/tax-documents` - Get tax documents
- `GET /gw/api/v1/tax-documents/available` - List available tax docs

#### Utilities (`account-management-utilities.yaml`)
- `GET /gw/api/v1/enumerations/{enumerationType}` - Get enum values
- `GET /gw/api/v1/forms` - Get available forms
- `GET /gw/api/v1/participating-banks` - List participating banks
- `GET /gw/api/v1/validations/usernames/{username}` - Validate username
- `GET /gw/api/v1/requests/{requestId}/status` - Check request status

### 🔐 Authorization

#### SSO Sessions (`authorization-sso-sessions.yaml`)
- `POST /gw/api/v1/sso-sessions` - Create SSO session
- `POST /gw/api/v1/sso-browser-sessions` - Create browser SSO session

#### Token (`authorization-token.yaml`)
- `POST /oauth2/api/v1/token` - Get OAuth token

### 📈 Trading

#### Accounts (`trading-accounts.yaml`)
- `GET /iserver/accounts` - Get brokerage accounts
- `POST /iserver/account` - Switch active account
- `GET /iserver/account/{accountId}/summary` - Account summary
- `GET /iserver/account/{accountId}/summary/balances` - Balance summary
- `GET /iserver/account/{accountId}/summary/margins` - Margin summary
- `GET /iserver/account/{accountId}/summary/market_value` - Market value
- `GET /iserver/account/{accountId}/summary/available_funds` - Available funds
- `GET /iserver/account/pnl/partitioned` - P&L information
- `POST /iserver/dynaccount` - Set dynamic account

#### Alerts (`trading-alerts.yaml`)
- `GET /iserver/account/{accountId}/alerts` - Get account alerts
- `POST /iserver/account/{accountId}/alert` - Create alert
- `PUT /iserver/account/{accountId}/alert/activate` - Activate alert
- `DELETE /iserver/account/{accountId}/alert/{alertId}` - Delete alert
- `GET /iserver/account/mta` - MTA alerts

#### Contracts (`trading-contracts.yaml`)
- `POST /iserver/secdef/search` - Search contracts
- `GET /iserver/contract/{conid}/info` - Contract information
- `GET /iserver/contract/{conid}/info-and-rules` - Contract info & rules
- `GET /iserver/contract/{conid}/algos` - Available algos
- `GET /iserver/contract/rules` - Trading rules
- `GET /iserver/secdef/strikes` - Option strikes
- `GET /iserver/secdef/bond-filters` - Bond search filters
- `GET /iserver/currency/pairs` - Currency pairs
- `GET /iserver/exchangerate` - Exchange rates

#### Orders (`trading-orders.yaml`)
- `POST /iserver/account/{accountId}/orders` - Place order
- `GET /iserver/account/{accountId}/orders` - Get open orders
- `DELETE /iserver/account/{accountId}/order/{orderId}` - Cancel order
- `POST /iserver/account/{accountId}/orders/whatif` - What-if order preview
- `GET /iserver/account/orders` - All accounts orders
- `GET /iserver/account/order/status/{orderId}` - Order status
- `GET /iserver/account/trades` - Recent trades
- `POST /iserver/reply/{replyId}` - Reply to order prompts

#### Portfolio (`trading-portfolio.yaml`)
- `GET /portfolio/accounts` - Portfolio accounts
- `GET /portfolio/{accountId}/positions/{pageId}` - Get positions
- `GET /portfolio/{accountId}/position/{conid}` - Single position
- `POST /portfolio/{accountId}/positions/invalidate` - Refresh positions
- `GET /portfolio/{accountId}/ledger` - Account ledger
- `GET /portfolio/{accountId}/meta` - Portfolio metadata
- `GET /portfolio/{accountId}/summary` - Portfolio summary

#### Market Data (`trading-market-data.yaml`)
- `GET /iserver/marketdata/snapshot` - Market data snapshot
- `GET /iserver/marketdata/history` - Historical data
- `POST /iserver/marketdata/unsubscribe` - Unsubscribe from data
- `POST /iserver/marketdata/unsubscribeall` - Unsubscribe all
- `GET /hmds/history` - Historical market data service

#### Scanner (`trading-scanner.yaml`)
- `GET /iserver/scanner/params` - Scanner parameters
- `POST /iserver/scanner/run` - Run scanner
- `GET /hmds/scanner/params` - HMDS scanner params
- `POST /hmds/scanner/run` - Run HMDS scanner

#### Session (`trading-session.yaml`)
- `GET /iserver/auth/status` - Authentication status
- `POST /iserver/auth/ssodh/init` - Initialize SSO
- `POST /iserver/reauthenticate` - Re-authenticate session
- `GET /logout` - Logout
- `POST /sso/validate` - Validate SSO
- `GET /tickle` - Keep session alive

#### Watchlists (`trading-watchlists.yaml`)
- `GET /iserver/watchlists` - Get watchlists
- `POST /iserver/watchlist` - Create watchlist
- `PUT /iserver/watchlist/{id}` - Update watchlist
- `DELETE /iserver/watchlist/{id}` - Delete watchlist

#### FYIs & Notifications (`trading-fyis.yaml`)
- `GET /fyi/notifications` - Get notifications
- `PUT /fyi/notifications/{notificationID}` - Mark as read
- `GET /fyi/settings` - Notification settings
- `POST /fyi/settings/{typecode}` - Update settings
- `GET /fyi/deliveryoptions` - Delivery options
- `PUT /fyi/deliveryoptions/email` - Email settings

#### FA Allocation (`trading-fa-allocation.yaml`)
- `GET /iserver/account/allocation/accounts` - Allocation accounts
- `GET /iserver/account/allocation/group` - Allocation groups
- `POST /iserver/account/allocation/group` - Create group
- `DELETE /iserver/account/allocation/group/delete` - Delete group
- `GET /iserver/account/allocation/presets` - Allocation presets

#### Portfolio Analyst (`trading-portfolio-analyst.yaml`)
- `GET /pa/performance` - Performance analytics
- `POST /pa/transactions` - Transaction analysis
- `GET /pa/summary` - PA summary

#### OAuth (`trading-oauth.yaml`)
- `POST /iserver/auth/oauth/request_token` - Request token
- `POST /iserver/auth/oauth/access_token` - Access token
- `GET /iserver/auth/oauth/renew` - Renew token

#### WebSocket (`trading-websocket.yaml`)
- `GET /ws` - WebSocket connection endpoint

### 🔧 Utilities

#### Echo (`utilities-echo.yaml`)
- `GET /gw/api/v1/echo/https` - HTTPS echo test
- `POST /gw/api/v1/echo/signed-jwt` - Signed JWT echo test

## Common Use Cases

### Account Setup & Management
1. Create account: `POST /gw/api/v1/accounts`
2. Submit documents: `POST /gw/api/v1/accounts/documents`
3. Check status: `GET /gw/api/v1/accounts/{accountId}/status`
4. Get details: `GET /gw/api/v1/accounts/{accountId}/details`

### Trading Workflow
1. Authenticate: `GET /iserver/auth/status`
2. Get accounts: `GET /iserver/accounts`
3. Search contract: `POST /iserver/secdef/search`
4. Get market data: `GET /iserver/marketdata/snapshot`
5. Place order: `POST /iserver/account/{accountId}/orders`
6. Monitor order: `GET /iserver/account/order/status/{orderId}`

### Portfolio Management
1. Get positions: `GET /portfolio/{accountId}/positions/{pageId}`
2. Get account summary: `GET /iserver/account/{accountId}/summary`
3. Check P&L: `GET /iserver/account/pnl/partitioned`
4. Get ledger: `GET /portfolio/{accountId}/ledger`

### Money Movement
1. Internal transfer: `POST /gw/api/v1/internal-cash-transfers`
2. External transfer: `POST /gw/api/v1/external-cash-transfers`
3. Check status: `GET /gw/api/v1/instructions/{instructionId}`
4. Get bank info: `GET /gw/api/v1/bank-instructions`

## Authentication & Security

### Security Policies
- **HTTPS**: Basic HTTPS authentication
- **Signed JWT**: Requires signed JWT tokens
- **OAuth 1.0a**: OAuth authentication flow

### Common Scopes
- `accounts.read` - Read account information
- `accounts.write` - Modify account information
- `trading.read` - Read trading data
- `trading.write` - Execute trades

## File Generation

To regenerate the compact YAML files:
```bash
node generate-compact-refs.js
```

## Notes

- All endpoints are documented in compact YAML format for quick reference
- The compact format removes redundant schema definitions while preserving essential endpoint information
- YAML files contain all the necessary information for API integration