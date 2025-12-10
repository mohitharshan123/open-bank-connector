# Fiskil Integration Guide

This document explains how the Fiskil banking provider integration works in the Open Bank Connector system, from authentication to data fetching.

## Table of Contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [Authentication Flow](#authentication-flow)
4. [User Creation](#user-creation)
5. [Token Storage](#token-storage)
6. [OAuth Consent Flow](#oauth-consent-flow)
7. [Data Fetching](#data-fetching)
8. [Complete Flow Example](#complete-flow-example)

---

## Overview

Fiskil integration follows a multi-step process:

1. **Client Credentials Authentication** - Get an access token using `client_id` and `client_secret`
2. **End User Creation (REQUIRED)** - **MUST** create an end user in Fiskil's system to get `end_user_id`
3. **OAuth Consent Flow** - User grants consent to access their banking data (requires `end_user_id`)
4. **Data Fetching** - Retrieve accounts, balances, and transactions (requires `end_user_id`)

**⚠️ Important:** User creation is **mandatory** and not optional. The `end_user_id` returned from user creation is required for all subsequent operations (OAuth flow and data fetching).

The system stores tokens in both **Redis** (for fast access) and **MongoDB** (for persistence), and stores the `end_user_id` in token metadata for future API calls.

---

## Configuration

### Environment Variables

```bash
# Required
FISKIL_CLIENT_ID=your_client_id
FISKIL_CLIENT_SECRET=your_client_secret

# Optional
FISKIL_BASE_URL=https://api.fiskil.com  # Default if not set
FISKIL_OAUTH_REDIRECT_URI=https://yourapp.com/callback
FISKIL_CANCEL_URI=https://yourapp.com/cancel
```

### Configuration File

The configuration is loaded in `src/config/bank.config.ts`:

```typescript
fiskil: {
    clientId: process.env.FISKIL_CLIENT_ID || '',
    clientSecret: process.env.FISKIL_CLIENT_SECRET || '',
    baseUrl: process.env.FISKIL_BASE_URL,
    oauthRedirectUri: process.env.FISKIL_OAUTH_REDIRECT_URI || 'https://www.google.com',
}
```

---

## Authentication Flow

### Step 1: Client Credentials Authentication

When you call `authenticate()` without an OAuth code, the system performs client credentials authentication.

**API Endpoint:** `POST /v1/token`

**Request:**
```json
{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Code Flow:**

1. **Strategy Layer** (`FiskilStrategy.authenticate()`):
   ```typescript
   // Creates auth HTTP client (no token injection)
   const authHttpClient = this.createAuthHttpClient();
   
   // Calls SDK authentication
   const authResponse = await this.fiskilAuthentication.authenticate(
       providerInstance,
       this.fiskilOAuth,
       companyId,
       userId,
       oauthCode
   );
   ```

2. **SDK Layer** (`FiskilAuthentication.authenticate()`):
   ```typescript
   // Makes POST request to /v1/token
   const requestBody = {
       client_id: config.clientId,
       client_secret: config.clientSecret,
   };
   
   const response = await httpClient.request<FiskilAuthResponse>(requestConfig);
   ```

3. **Token Storage** (`TokenService.storeToken()`):
   ```typescript
   await this.tokenService.storeToken(
       ProviderType.FISKIL,
       companyId,
       authResponse.access_token,
       authResponse.expires_in,
       userId,
       userId ? { end_user_id: userId } : undefined, // Store in metadata
   );
   ```

**What Happens:**
- Access token is obtained via client credentials
- Token is stored in **Redis** (with TTL = expires_in)
- Token is stored in **MongoDB** (for persistence)
- If `userId` is provided, it's stored in token metadata as `end_user_id`

---

## User Creation

### Step 2: Create End User

**⚠️ IMPORTANT: User creation is REQUIRED for Fiskil integration.** 

After authentication, you **must** create an end user by providing `userData` in the authenticate request. 

**The `end_user_id` returned from user creation is required for all subsequent API calls** (OAuth flow, accounts, balances, transactions). Without it, you cannot proceed with the integration.

**API Endpoint:** `POST /v1/end-users`

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "end_user_id": "eu_36eDkiZm9g9FjUPfipoxtOD4zOJ",
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+1234567890",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Code Flow:**

1. **Strategy Layer** (`FiskilStrategy.authenticate()`):
   ```typescript
   // User creation is required - must provide userData
   if (userData && (userData.email || userData.name || userData.phone)) {
       // Check if we already have a valid token with end_user_id
       const existingToken = await this.tokenService.getActiveToken(ProviderType.FISKIL, companyId);
       const existingEndUserId = existingToken?.metadata?.end_user_id;
       
       if (existingToken && existingEndUserId) {
           const tokenInfo = await this.tokenService.getTokenInfo(ProviderType.FISKIL, companyId);
           if (tokenInfo.isValid) {
               // Skip user creation - already have valid token with end_user_id
               return authResponse;
           }
       }
       
       // No valid token with end_user_id found, create new user
       const httpClient = this.createHttpClient(companyId); // With token injection
       const userResponse = await this.fiskilUsers.createUser(
           httpClient, 
           config, 
           companyId, 
           userData
       );
       const endUserId = userResponse?.end_user_id;
       
       // end_user_id is stored in token metadata automatically
   }
   ```
   
   **Note:** 
   - `userData` **must** be provided during authentication
   - User creation happens automatically as part of the authentication flow
   - **Optimization:** If a valid token with `end_user_id` already exists, user creation is skipped

2. **SDK Layer** (`FiskilUsers.createUser()`):
   ```typescript
   // POST /v1/end-users with Bearer token
   const requestConfig = HttpRequestBuilder.post(
       FISKIL_CONSTANTS.ENDPOINTS.CREATE_END_USER,
       userData
   )
       .baseUrl(baseUrl)
       .headers({
           'Content-Type': 'application/json',
           'Accept': 'application/json',
       })
       .build();
   
   const response = await httpClient.request<FiskilCreateUserResponse>(requestConfig);
   ```

3. **Store `end_user_id` in Metadata**:
   ```typescript
   // Automatically stored in token metadata
   await this.tokenService.updateTokenMetadata(
       ProviderType.FISKIL,
       companyId,
       { end_user_id: endUserId }
   );
   ```

**What Happens:**
- End user is created in Fiskil's system
- `end_user_id` is returned (e.g., `eu_36eDkiZm9g9FjUPfipoxtOD4zOJ`)
- `end_user_id` is stored in token metadata in MongoDB
- **This `end_user_id` is REQUIRED for all subsequent API calls** (OAuth flow, accounts, balances, transactions)

**⚠️ Without creating a user and obtaining `end_user_id`, you cannot proceed with the OAuth consent flow or fetch any banking data.**

---

## Token Storage

### Dual Storage System

The system uses a **dual storage** approach:

1. **Redis** (Cache Layer)
   - Fast access for token retrieval
   - TTL set to token expiration time
   - Key format: `bank:token:fiskil:{companyId}`
   - Value: `{ token, expiresAt }`

2. **MongoDB** (Persistence Layer)
   - Long-term storage
   - Stores token + metadata (including `end_user_id`)
   - Schema: `TokenDocument` with fields:
     - `provider`: `'fiskil'`
     - `companyId`: Company identifier
     - `token`: Access token
     - `expiresAt`: Expiration timestamp
     - `userId`: Optional user ID
     - `metadata`: `{ end_user_id: 'eu_...' }`

### Token Retrieval

When fetching data, the system:

1. Checks **Redis** first (fast)
2. If not found or expired, checks **MongoDB**
3. If expired, refreshes token automatically
4. Uses `TokenInjectingHttpClient` to automatically inject Bearer token in requests

**Code:**
```typescript
// TokenService.getValidToken()
const cachedToken = await this.getTokenFromRedis(redisKey);
if (cachedToken && this.isTokenValid(cachedToken.expiresAt)) {
    return cachedToken.token; // Use cached token
}
// Otherwise refresh...
```

---

## OAuth Consent Flow

### Step 3: Get Consent URL

**⚠️ Prerequisite: You MUST have created an end user and obtained `end_user_id` before this step.**

After creating an end user, you need to get user consent to access their banking data. The system will automatically retrieve the `end_user_id` from token metadata if not explicitly provided.

**API Endpoint:** `POST /v1/auth/session`

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "end_user_id": "eu_36eDkiZm9g9FjUPfipoxtOD4zOJ",
  "cancel_uri": "https://yourapp.com/cancel",
  "redirect_uri": "https://yourapp.com/callback"
}
```

**Response:**
```json
{
  "session_id": "36eDkpZD8997xnPrTX9Z2mBaS0k",
  "auth_url": "https://auth.fiskil.com?sess_id=36eDkpZD8997xnPrTX9Z2mBaS0k",
  "expires_at": "2025-01-01T12:00:00Z"
}
```

**Code Flow:**

1. **Strategy Layer** (`FiskilStrategy.getOAuthRedirectUrl()`):
   ```typescript
   // Get end_user_id from metadata if not provided
   if (!userId) {
       userId = await this.getEndUserIdFromMetadata(companyId);
   }
   
   return this.fiskilOAuth.getOAuthRedirectUrl(
       httpClient, 
       config, 
       userId, 
       action, 
       state
   );
   ```

2. **OAuth Layer** (`FiskilOAuth.createAuthSession()`):
   ```typescript
   const requestBody = {
       end_user_id: endUserId,
       cancel_uri: cancelUri || config.oauthRedirectUri || 'https://www.google.com',
       redirect_uri: redirectUri || config.oauthRedirectUri || 'https://www.google.com',
   };
   
   const response = await httpClient.request<FiskilAuthSessionResponse>(requestConfig);
   ```

3. **Return Auth URL**:
   ```typescript
   return {
       redirectUrl: sessionResult.auth_url,
       authUrl: sessionResult.auth_url,
       sessionId: sessionResult.session_id,
       expiresAt: sessionResult.expires_at,
       userId: endUserId,
   };
   ```

**What Happens:**
- Auth session is created in Fiskil
- `auth_url` is returned (user redirects to this)
- User completes consent flow on Fiskil's page
- User is redirected back to your `redirect_uri` with an authorization code

### Step 4: Exchange Authorization Code

After user grants consent, exchange the authorization code for an access token.

**API Endpoint:** `POST /v1/token`

**Request Headers:**
```
Authorization: Basic {base64(client_id:client_secret)}
Content-Type: application/x-www-form-urlencoded
```

**Request Body:**
```
grant_type=authorization_code&code={auth_code}&redirect_uri={redirect_uri}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Code Flow:**

1. **Strategy Layer** (`FiskilStrategy.authenticate()` with `oauthCode`):
   ```typescript
   if (oauthCode) {
       return await this.fiskilOAuth.exchangeOAuthCode(
           authHttpClient, 
           config, 
           companyId, 
           oauthCode, 
           userId
       );
   }
   ```

2. **OAuth Layer** (`FiskilOAuth.exchangeOAuthCode()`):
   ```typescript
   const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
   
   const tokenParams = new URLSearchParams({
       grant_type: 'authorization_code',
       code,
       redirect_uri: config.oauthRedirectUri,
   });
   
   const response = await httpClient.request<FiskilAuthResponse>(requestConfig);
   ```

3. **Store Token with `end_user_id`**:
   ```typescript
   await this.tokenService.storeToken(
       ProviderType.FISKIL,
       companyId,
       token,
       expiresIn,
       userId,
       userId ? { end_user_id: userId } : undefined,
   );
   ```

**What Happens:**
- Authorization code is exchanged for access token
- Token is stored in Redis and MongoDB
- `end_user_id` is stored in token metadata
- Token can now be used to fetch banking data

---

## Data Fetching

### Accounts

**API Endpoint:** `GET /v1/banking/accounts?end_user_id={end_user_id}`

**Code:**
```typescript
// Strategy layer
async getAccounts(companyId: string, userId?: string): Promise<StandardAccount[]> {
    const endUserId = await this.getEndUserId(companyId, userId); // From metadata if not provided
    return providerInstance.getAccount(endUserId);
}

// SDK layer
async getAccounts(httpClient: IHttpClient, config: { baseUrl?: string }, endUserId: string) {
    const requestConfig = HttpRequestBuilder.get(FISKIL_CONSTANTS.ENDPOINTS.GET_ACCOUNTS)
        .baseUrl(baseUrl)
        .params({ end_user_id: endUserId })
        .build();
    
    const response = await httpClient.request<FiskilAccountsResponse>(requestConfig);
    return this.transformer.transformAccounts(response.data.accounts);
}
```

**Response:**
```json
{
  "accounts": [
    {
      "account_id": "acc_12345",
      "fiskil_id": "bank_account_asdf1234",
      "display_name": "Everyday Account",
      "account_number": "12345678",
      "currency": "AUD",
      "product_category": "TRANS_AND_SAVINGS_ACCOUNTS"
    }
  ],
  "links": {
    "next": "...",
    "prev": "..."
  }
}
```

### Balances

**API Endpoint:** `GET /v1/banking/balances?end_user_id={end_user_id}&account_id={account_id}`

**Code:**
```typescript
async getBalances(companyId: string, userId?: string): Promise<StandardBalance[]> {
    const endUserId = await this.getEndUserId(companyId, userId);
    return providerInstance.getBalances(endUserId, accountId);
}
```

**Response:**
```json
{
  "balances": [
    {
      "account_id": "acc_12345",
      "available_balance": "1000.00",
      "current_balance": "1000.00",
      "currency": "AUD"
    }
  ]
}
```

### Transactions

**API Endpoint:** `GET /v1/banking/transactions?end_user_id={end_user_id}&account_id={account_id}&from={from}&to={to}&status={status}`

**Code:**
```typescript
async getTransactions(
    companyId: string,
    userId?: string,
    accountId?: string,
    from?: string,
    to?: string,
    status?: 'PENDING' | 'POSTED',
): Promise<{ transactions: StandardTransaction[]; links?: { next?: string; prev?: string } }> {
    const endUserId = await this.getEndUserId(companyId, userId);
    return providerInstance.getTransactions(endUserId, accountId, from, to, status);
}
```

**Response:**
```json
{
  "transactions": [
    {
      "fiskil_id": "bank_tx_cf8a93dbe42ce957f5a6ef39ef8e5f9acae5dad932794b6e0df7b1b9afe707c5",
      "account_id": "acc_12345",
      "amount": "-5.00",
      "currency": "AUD",
      "description": "TRANSPORTFORNSW TAP SYDNEY",
      "posting_date_time": "2025-12-01T00:00:00.000Z",
      "status": "POSTED",
      "category": {
        "primary_category": "TRANSPORTATION",
        "secondary_category": "TRANSPORTATION_PUBLIC_TRANSIT"
      }
    }
  ],
  "links": {
    "next": "https://api.fiskil.com/v1/banking/transactions?end_user_id=eu_...&page[after]=...",
    "prev": "..."
  }
}
```

**Key Points:**
- All data fetching requires `end_user_id` (retrieved from token metadata if not provided)
- Tokens are automatically injected via `TokenInjectingHttpClient`
- Responses are transformed to standard format via `FiskilTransformer`
- Pagination links are preserved for batch fetching

---

## Complete Flow Example

Here's a complete example of the entire flow:

### 1. Initialize & Authenticate (with User Creation)

```typescript
// POST /api/bank/authenticate
// ⚠️ userDetails is REQUIRED - user creation is mandatory
{
  "provider": "fiskil",
  "companyId": "acme-corp",
  "userDetails": {
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890"
  }
}
```

**What happens:**
1. Client credentials authentication → Get access token
2. Token stored in Redis + MongoDB
3. **Create end user (REQUIRED)** → Get `end_user_id`
4. Store `end_user_id` in token metadata
5. Without `end_user_id`, you cannot proceed with OAuth or data fetching

### 2. Get OAuth Redirect URL

```typescript
// POST /api/bank/oauth/redirect
{
  "provider": "fiskil",
  "companyId": "acme-corp"
}
```

**Response:**
```json
{
  "redirectUrl": "https://auth.fiskil.com?sess_id=36eDkpZD8997xnPrTX9Z2mBaS0k",
  "authUrl": "https://auth.fiskil.com?sess_id=36eDkpZD8997xnPrTX9Z2mBaS0k",
  "sessionId": "36eDkpZD8997xnPrTX9Z2mBaS0k",
  "userId": "eu_36eDkiZm9g9FjUPfipoxtOD4zOJ"
}
```

**What happens:**
1. Retrieve `end_user_id` from token metadata
2. Create auth session → Get `auth_url`
3. User redirects to `auth_url` and grants consent

### 3. Handle OAuth Callback

```typescript
// User redirected to: https://yourapp.com/callback?code={auth_code}

// POST /api/bank/authenticate
{
  "provider": "fiskil",
  "companyId": "acme-corp",
  "oauthCode": "{auth_code}",
  "userId": "eu_36eDkiZm9g9FjUPfipoxtOD4zOJ"
}
```

**What happens:**
1. Exchange authorization code for access token
2. Store token in Redis + MongoDB
3. Store `end_user_id` in token metadata

### 4. Fetch Data

```typescript
// POST /api/bank/accounts
{
  "provider": "fiskil",
  "companyId": "acme-corp"
}

// POST /api/bank/balances
{
  "provider": "fiskil",
  "companyId": "acme-corp"
}

// POST /api/bank/transactions
{
  "provider": "fiskil",
  "companyId": "acme-corp",
  "accountId": "acc_12345",
  "from": "2025-01-01T00:00:00Z",
  "to": "2025-12-31T23:59:59Z",
  "status": "POSTED"
}
```

**What happens:**
1. Retrieve `end_user_id` from token metadata (if not provided)
2. Retrieve access token from Redis/MongoDB
3. Inject Bearer token in request
4. Make API call to Fiskil
5. Transform response to standard format
6. Return data to client

---

## Architecture Overview

```
┌─────────────────┐
│  API Gateway    │
│  (bank-api-     │
│   gateway)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Bank Service   │
│  (bank.service) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fiskil Strategy │
│ (fiskil.        │
│  strategy.ts)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│  SDK   │ │ Strategy │
│ Features│ │ Features │
└────┬───┘ └────┬─────┘
     │          │
     └────┬─────┘
          │
          ▼
┌─────────────────┐
│  Fiskil API     │
│  (api.fiskil.   │
│   com)          │
└─────────────────┘
```

**Key Components:**

1. **Strategy Layer** (`strategies/fiskil.strategy.ts`)
   - Orchestrates the flow
   - Manages `end_user_id` retrieval
   - Handles token metadata

2. **SDK Layer** (`sdk/src/features/`)
   - Direct API calls
   - Data transformation
   - HTTP client management

3. **Token Service** (`services/token.service.ts`)
   - Dual storage (Redis + MongoDB)
   - Token refresh logic
   - Metadata management

4. **OAuth Layer** (`strategies/features/oauth/fiskil.oauth.ts`)
   - Auth session creation
   - Authorization code exchange
   - Redirect URL generation

---

## Error Handling

Common errors and solutions:

1. **`end_user_id is required`**
   - **Cause:** No end user created or `end_user_id` not in metadata
   - **Solution:** **MUST** call `authenticate()` with `userDetails` to create user first. User creation is mandatory.

2. **`Token not found`**
   - **Cause:** Token expired or not stored
   - **Solution:** Re-authenticate

3. **`OAuth code exchange failed`**
   - **Cause:** Invalid authorization code or expired session
   - **Solution:** Restart OAuth flow

4. **`401 Unauthorized`**
   - **Cause:** Token expired or invalid
   - **Solution:** Token service should auto-refresh, but may need re-authentication

---

## Best Practices

1. **⚠️ ALWAYS create end user - it's REQUIRED, not optional**
   - **MUST** pass `userDetails` in initial `authenticate()` call
   - User creation is mandatory for Fiskil integration
   - Without `end_user_id`, OAuth flow and data fetching will fail

2. **Store `end_user_id` in your system**
   - Can be retrieved from token metadata, but storing separately helps

3. **Handle pagination**
   - Use `links.next` and `links.prev` for batch fetching

4. **Monitor token expiration**
   - Tokens auto-refresh, but monitor for failures

5. **Use proper error handling**
   - Check for `end_user_id` existence before API calls

---

## Summary

The Fiskil integration follows this pattern:

1. **Authenticate** → Get access token (client credentials)
2. **Create User (REQUIRED)** → Get `end_user_id` → Store in metadata
   - ⚠️ **User creation is mandatory** - cannot proceed without it
3. **Get Consent** → Create auth session → Redirect user
   - Requires `end_user_id` from step 2
4. **Exchange Code** → Get consent token → Store in metadata
5. **Fetch Data** → Use `end_user_id` from metadata → Get accounts/balances/transactions
   - All data fetching requires `end_user_id`

**Key Points:**
- **User creation is REQUIRED** - always provide `userDetails` in authenticate call
- `end_user_id` is stored in token metadata automatically
- All subsequent API calls require `end_user_id` (retrieved from metadata if not provided)
- Tokens and metadata are stored in Redis (cache) and MongoDB (persistence)
- Automatic token injection for API calls via `TokenInjectingHttpClient`

