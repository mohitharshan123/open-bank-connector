# Open Bank Connector

Banking integration system with React frontend, NestJS API Gateway, TCP Microservice, and provider SDK.

## Architecture Overview

```
Frontend (React) 
    ↓ HTTP POST
API Gateway (NestJS HTTP :3001)
    ↓ TCP Message
Microservice (NestJS TCP :3000)
    ↓ SDK
Provider API (Airwallex)
```

## Request Flow

### 1. Frontend Request
React app (`bank-demo-app`) makes HTTP POST request to API Gateway:
```typescript
POST http://localhost:3001/api/bank/authenticate
POST http://localhost:3001/api/bank/account
POST http://localhost:3001/api/bank/balances
```

### 2. API Gateway Handling
API Gateway (`bank-api-gateway`) receives HTTP request:
- Validates request body (DTO validation)
- Converts HTTP request to TCP message pattern
- Sends TCP message to Microservice via `ClientProxy`

**Message Patterns:**
- `bank.authenticate` - Authenticate with provider (unprotected)
- `bank.getAccount` - Get accounts (protected by TokenAuthGuard)
- `bank.getBalances` - Get balances (protected by TokenAuthGuard)
- `bank.getJobs` - Get jobs (protected by TokenAuthGuard)
- `bank.oauthRedirect` - Get OAuth redirect URL (unprotected)
- `bank.connectionStatus` - Check connection status (unprotected)
- `bank.deleteTokens` - Delete stored tokens (unprotected)

### 3. Microservice Processing
Microservice (`bank-microservice`) receives TCP message:
- Listens on TCP port 3000
- `@MessagePattern` handlers process messages
- **Token Authentication Guard** (`TokenAuthGuard`) validates tokens for protected endpoints
  - Checks token existence and validity
  - Validates provider-specific requirements (e.g., Basiq requires userId)
  - Throws `TokenNotFoundException` or `InvalidTokenException` if validation fails
- Initializes provider SDK if needed
- Calls strategy methods which delegate to SDK features

### 4. SDK Integration
SDK (`open-bank-sdk`) handles provider communication:
- `TokenInjectingHttpClient` injects Bearer token
- Makes HTTP request to provider API
- Transforms provider response to standard format
- Returns `StandardAccount` or `StandardBalance[]`

### 5. Response Flow
Response travels back through the chain:
- SDK → Microservice → API Gateway → Frontend
- Standard format ensures consistency across providers

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm
- MongoDB
- Redis

### 1. Start Infrastructure

```bash
cd bank-microservice
docker-compose up -d
```

Starts Redis and MongoDB containers.

### 2. Build SDK

```bash
cd open-bank-sdk
pnpm install
pnpm build
```

### 3. Configure Microservice

```bash
cd bank-microservice
cp .env.example .env
```

Edit `.env`:
```env
AIRWALLEX_API_KEY=your-api-key
AIRWALLEX_CLIENT_ID=your-client-id
MONGODB_URI=mongodb://localhost:27017/bank-microservice
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 4. Start Microservice

```bash
cd bank-microservice
pnpm install
pnpm start:dev
```

Microservice listens on TCP port 3000.

### 5. Start API Gateway

```bash
cd bank-api-gateway
pnpm install
pnpm start:dev
```

API Gateway listens on HTTP port 3001.

### 6. Start Frontend

```bash
cd bank-demo-app
pnpm install
pnpm dev
```

Frontend runs on `http://localhost:5173`

## Project Structure

```
open-bank-connector/
├── open-bank-sdk/          # Provider SDK (deprecated - SDK now in microservice)
├── bank-microservice/      # TCP Microservice
│   └── src/
│       ├── guards/         # Authentication guards
│       │   ├── token-auth.guard.ts      # Token validation guard
│       │   └── token-auth.decorator.ts  # Guard decorator
│       ├── strategies/     # Provider strategies
│       │   ├── base.strategy.ts         # Base strategy class
│       │   ├── airwallex.strategy.ts    # Airwallex strategy
│       │   ├── basiq.strategy.ts        # Basiq strategy
│       │   ├── features/                # Feature-based modules
│       │   │   ├── authentication/        # Authentication features
│       │   │   ├── accounts/            # Account retrieval features
│       │   │   ├── balances/            # Balance retrieval features
│       │   │   └── jobs/                # Job management features
│       │   └── oauth/                    # OAuth flow handlers
│       ├── sdk/            # Embedded SDK (feature-based)
│       │   └── src/
│       │       ├── features/            # SDK feature modules
│       │       │   ├── authentication/  # Provider auth logic
│       │       │   ├── accounts/        # Account fetching
│       │       │   ├── balances/        # Balance fetching
│       │       │   └── jobs/            # Job management
│       │       ├── providers/          # Provider implementations
│       │       ├── shared/              # Shared utilities
│       │       │   ├── constants/       # Provider constants
│       │       │   ├── transformers/    # Data transformers
│       │       │   └── types/           # Type definitions
│       │       └── sdk.ts               # SDK entry point
│       ├── services/        # Business logic services
│       ├── repositories/    # Data access layer
│       ├── schemas/         # MongoDB schemas
│       ├── exceptions/      # Custom exceptions
│       └── utils/           # Utility functions
├── bank-api-gateway/       # HTTP API Gateway
├── bank-demo-app/          # React Frontend
├── README.md               # This file
└── ARCHITECTURE.md         # Detailed architecture
```

## API Endpoints

**Authenticate:**
```bash
POST http://localhost:3001/api/bank/authenticate
Body: { "provider": "airwallex" }
```

**Get Account:**
```bash
POST http://localhost:3001/api/bank/account
Body: { 
  "provider": "airwallex",
  "companyId": "company-123"
}
```

**Get Balances:**
```bash
POST http://localhost:3001/api/bank/balances
Body: { 
  "provider": "airwallex",
  "companyId": "company-123"
}
```

**Get Jobs (Basiq only):**
```bash
POST http://localhost:3001/api/bank/jobs
Body: { 
  "provider": "basiq",
  "companyId": "company-123",
  "jobId": "optional-job-id"
}
```

**Check Connection Status:**
```bash
POST http://localhost:3001/api/bank/connection-status
Body: { 
  "provider": "airwallex",
  "companyId": "company-123"
}
```

**Note:** All endpoints require `companyId` for multi-tenant support. Protected endpoints (`/account`, `/balances`, `/jobs`) require valid authentication tokens.

## TCP Communication

Microservice uses TCP transport for inter-service communication:
- Lower latency than HTTP
- Binary protocol efficiency
- Direct service-to-service connection
- Message-based request/response

API Gateway connects via `ClientProxy` with `Transport.TCP`:
```typescript
const client = ClientProxyFactory.create({
  transport: Transport.TCP,
  options: { host: 'localhost', port: 3000 }
});
```

## Token Management & Authentication

### Token Storage
- **Redis**: Fast token caching (TTL-based expiration)
- **MongoDB**: Persistent token storage with metadata
- **Auto-refresh**: Tokens refreshed automatically when expired
- **Lock mechanism**: Prevents concurrent refresh attempts

### Authentication Guard
The system uses a **Token Authentication Guard** (`TokenAuthGuard`) to protect endpoints that require authentication:

**Protected Endpoints:**
- `bank.getAccount` - Requires valid token
- `bank.getBalances` - Requires valid token
- `bank.getJobs` - Requires valid token

**Unprotected Endpoints:**
- `bank.authenticate` - Used to obtain tokens
- `bank.oauthRedirect` - Used to initiate OAuth flow
- `bank.connectionStatus` - Checks connection status
- `bank.deleteTokens` - Administrative operation

**How It Works:**
1. Guard intercepts requests to protected endpoints
2. Extracts `provider` and `companyId` from message payload
3. Validates token exists and is active via `TokenService`
4. Performs provider-specific validation (e.g., Basiq requires userId)
5. Attaches validated token document to request context
6. Throws `TokenNotFoundException` or `InvalidTokenException` if validation fails

**Usage:**
```typescript
@MessagePattern('bank.getAccount')
@UseGuards(TokenAuthGuard)
async getAccount(@Payload() data: GetAccountCommand) {
    // Token is guaranteed to exist and be valid here
    return this.bankService.getAccount(provider, data.companyId);
}
```

**Benefits:**
- **Centralized**: All token validation in one place
- **Consistent**: Same validation logic for all protected endpoints
- **Clean**: Feature modules don't need to check tokens manually
- **Type-safe**: Proper exception types for different error scenarios

## Standard Data Formats

**StandardAccount:**
```typescript
{
  id: string;
  accountNumber: string;
  accountName: string;
  balance: number;
  currency: string;
  type: string;
  provider: string;
}
```

**StandardBalance:**
```typescript
{
  available: number;
  current: number;
  currency: string;
  provider: string;
}
```

## Extensibility: Adding New Providers

The system is designed for easy extensibility using a **config-driven approach**. To add a new provider (e.g., Basiq), you only need to:
1. Define provider types and transformer
2. Create a config file with endpoints, headers, and transformer
3. Create a simple provider class extending `ConfigurableProvider`
4. Register in SDK and update microservice

The microservice, API gateway, and frontend remain unchanged. The config-driven approach eliminates boilerplate code - authentication, account fetching, and balance retrieval are handled automatically by `ConfigurableProvider`.

### Example: Adding Basiq Provider

#### Step 1: Create Provider Types (`open-bank-sdk/src/types/basiq.ts`)

```typescript
export interface BasiqConfig {
    apiKey: string;
    baseUrl?: string;
}

export interface BasiqAccount {
    id: string;
    accountName: string;
    accountNumber: string;
    balance: number;
    currency: string;
    type: string;
}

export interface BasiqBalance {
    available: number;
    current: number;
    currency: string;
}

export interface BasiqAuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}
```

#### Step 2: Create Transformer (`open-bank-sdk/src/transformers/basiq.transformer.ts`)

```typescript
import { BaseTransformer } from './base.transformer';
import { StandardAccount, StandardBalance } from '../types/common';
import { BasiqAccount, BasiqBalance } from '../types/basiq';

export class BasiqTransformer extends BaseTransformer<BasiqAccount, BasiqBalance> {
    constructor() {
        super('basiq');
    }

    transformAccount(account: BasiqAccount): StandardAccount {
        return {
            id: account.id,
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            balance: account.balance,
            currency: account.currency,
            type: account.type,
            provider: this.providerName,
        };
    }

    transformBalances(balances: BasiqBalance[]): StandardBalance[] {
        return balances.map(balance => ({
            available: balance.available,
            current: balance.current,
            currency: balance.currency,
            provider: this.providerName,
        }));
    }
}
```

#### Step 3: Create Provider Config (`open-bank-sdk/src/config/basiq.config.ts`)

The SDK uses a **config-driven approach** where endpoints, headers, and transformers are defined in a config file. This makes adding providers much simpler:

```typescript
import { PROVIDER_BASE_URLS } from '../constants';
import { BasiqTransformer } from '../transformers/basiq.transformer';
import { BasiqAccount, BasiqBalance, BasiqConfig, BasiqAuthResponse } from '../types/basiq';
import { ProviderEndpointConfig } from '../types/provider-config';

export const createBasiqConfig = (config: BasiqConfig): ProviderEndpointConfig<
    BasiqAccount,
    BasiqBalance,
    BasiqConfig,
    BasiqAuthResponse
> => ({
    providerName: 'basiq',
    baseUrl: config.baseUrl || PROVIDER_BASE_URLS.BASIQ,
    endpoints: {
        authenticate: '/token',
        getAccount: '/accounts',
        getBalances: '/balances',
    },
    transformer: new BasiqTransformer(),
    buildAuthHeaders: (config: BasiqConfig) => ({
        'Authorization': `Basic ${Buffer.from(config.apiKey + ':').toString('base64')}`,
    }),
    parseAuthResponse: (response: BasiqAuthResponse) => ({
        accessToken: response.access_token,
        expiresIn: response.expires_in,
    }),
});
```

#### Step 4: Create Provider (`open-bank-sdk/src/providers/basiq.provider.ts`)

With the config-driven approach, the provider class is now just a thin wrapper:

```typescript
import { IHttpClient } from '../interfaces/https-client.interface';
import { ILogger } from '../interfaces/logger.interface';
import { BasiqAuthResponse, BasiqConfig } from '../types/basiq';
import { ConfigurableProvider } from './configurable.provider';
import { createBasiqConfig } from '../config/basiq.config';

export class BasiqProvider extends ConfigurableProvider<
    any,
    any,
    BasiqConfig,
    BasiqAuthResponse
> {
    constructor(httpClient: IHttpClient, config: BasiqConfig, logger?: ILogger, authHttpClient?: IHttpClient) {
        const endpointConfig = createBasiqConfig(config);
        super(httpClient, config, endpointConfig, logger, authHttpClient);
    }
}
```

**Key Benefits:**
- **No boilerplate**: Authentication, account, and balance methods are handled automatically
- **Easy to extend**: Just define endpoints, headers, and transformer in config
- **Consistent**: All providers follow the same pattern

#### Step 5: Register in SDK (`open-bank-sdk/src/sdk.ts`)

```typescript
import { BasiqProvider } from './providers/basiq.provider';
import { BasiqConfig } from './types/basiq';

export type ProviderConfig = AirwallexConfig | BasiqConfig;

useBasiq(httpClient: IHttpClient, config: BasiqConfig, logger?: ILogger): ProviderInstance {
    const provider = new BasiqProvider(httpClient, config, logger);
    this.registerProvider(Providers.BASIQ, provider);
    return new ProviderInstance(provider, logger);
}
```

#### Step 6: Update Microservice (Minimal Changes)

**Add to enum** (`bank-microservice/src/types/provider.enum.ts`):
```typescript
export enum ProviderType {
    AIRWALLEX = 'airwallex',
    BASIQ = 'basiq',
}
```

**Add config** (`bank-microservice/src/config/bank.config.ts`):
```typescript
export interface BankConfig {
    basiq: {
        apiKey: string;
        baseUrl?: string;
    };
}
```

**Add header injection config** (`bank-microservice/src/utils/token-injecting-http-client.ts`):
```typescript
private getProviderConfig(providerType: ProviderType): TokenInjectionConfig {
    const configs: Map<ProviderType, TokenInjectionConfig> = new Map([
        [
            ProviderType.AIRWALLEX,
            {
                supportsRefresh: true,
                expirationBufferMs: 5 * 60 * 1000,
                injectHeader: (config, token) => {
                    config.headers = config.headers || {};
                    config.headers['Authorization'] = `Bearer ${token}`;
                },
            },
        ],
        [
            ProviderType.BASIQ,
            {
                supportsRefresh: true,
                expirationBufferMs: 5 * 60 * 1000,
                injectHeader: (config, token) => {
                    config.headers = config.headers || {};
                    config.headers['Authorization'] = `Bearer ${token}`;
                },
            },
        ],
    ]);
    // ... rest of method
}
```

**Add refresh callback** (`bank-microservice/src/bank.service.ts`):
```typescript
private createHttpClient(providerType: ProviderType): IHttpClient {
    const baseClient = new NestJsHttpAdapter(this.httpService);
    return new TokenInjectingHttpClient(
        baseClient,
        providerType,
        this.tokenService,
        providerType === ProviderType.AIRWALLEX
            ? () => this.refreshAuthToken(ProviderType.AIRWALLEX)
            : providerType === ProviderType.BASIQ
            ? () => this.refreshAuthToken(ProviderType.BASIQ)
            : undefined,
    );
}
```

**Add initialization** (`bank-microservice/src/bank.service.ts`):
```typescript
private async initializeBasiq(): Promise<void> {
    const config = this.configService.get<BankConfig['basiq']>('bank.basiq');
    const httpClient = this.createHttpClient(ProviderType.BASIQ);
    const provider = this.sdk.useBasiq(httpClient, config, this.logger);
    this.providers.set(ProviderType.BASIQ, provider);
}
```

**Note**: Header injection configuration allows each provider to specify how tokens are injected into requests. Most providers use `Authorization: Bearer`, but some may require different header formats or additional headers.

### Key Benefits

- **No API Changes**: All endpoints remain the same (`/authenticate`, `/account`, `/balances`)
- **No Gateway Changes**: Message patterns unchanged
- **No Frontend Changes**: Same request format
- **Standard Format**: All providers return `StandardAccount` and `StandardBalance[]`
- **Isolated Logic**: Provider-specific code contained in SDK

The microservice automatically handles token management, caching, and refresh for any provider through the same infrastructure.

## Adding New Features

The system uses a **feature-based architecture** for better separation of concerns. Features are organized by functionality (authentication, accounts, balances, jobs, etc.) rather than by provider. This makes it easy to add new features that work across all providers.

### Feature Architecture Overview

```
SDK Features (bank-microservice/src/sdk/src/features/)
├── authentication/     # Provider authentication logic
├── accounts/          # Account retrieval
├── balances/          # Balance retrieval
└── jobs/              # Job management (provider-specific)

Strategy Features (bank-microservice/src/strategies/features/)
├── authentication/    # Wraps SDK + handles token storage
├── accounts/          # Wraps SDK + handles company context
├── balances/          # Wraps SDK + handles company context
└── jobs/              # Wraps SDK + handles company context
```

### Example: Adding a "Transactions" Feature

Let's add a new feature to fetch transactions. This example shows the complete flow from SDK to frontend.

#### Step 1: Define Standard Types (`bank-microservice/src/sdk/src/shared/types/common.ts`)

Add the standard transaction type that all providers will return:

```typescript
export interface StandardTransaction {
    id: string;
    accountId: string;
    amount: number;
    currency: string;
    description: string;
    date: string;
    type: 'debit' | 'credit';
    category?: string;
    provider: string;
}
```

#### Step 2: Add Provider-Specific Types (`bank-microservice/src/sdk/src/shared/types/airwallex.ts`)

Add Airwallex-specific transaction type:

```typescript
export interface AirwallexTransaction {
    id: string;
    account_id: string;
    amount: number;
    currency: string;
    description: string;
    created_at: string;
    type: string;
    // ... other Airwallex-specific fields
}
```

#### Step 3: Create SDK Feature Module (`bank-microservice/src/sdk/src/features/transactions/airwallex.transactions.ts`)

Create the feature module that handles transaction fetching:

```typescript
import { Logger } from '@nestjs/common';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { AIRWALLEX_CONSTANTS } from '../../shared/constants/airwallex.constants';
import { AirwallexTransformer } from '../../shared/transformers/airwallex.transformer';
import type { AirwallexTransaction } from '../../shared/types/airwallex';
import type { StandardTransaction } from '../../shared/types/common';

export class AirwallexTransactions {
    private readonly transformer: AirwallexTransformer;
    private readonly baseUrl: string;

    constructor(
        private readonly httpClient: IHttpClient,
        config: { baseUrl?: string },
        private readonly logger: Logger,
    ) {
        this.transformer = new AirwallexTransformer();
        this.baseUrl = config.baseUrl || AIRWALLEX_CONSTANTS.BASE_URL;
    }

    /**
     * Get transactions for an account
     */
    async getTransactions(accountId: string, limit?: number): Promise<StandardTransaction[]> {
        this.logger.debug(`[AirwallexTransactions] Getting transactions for account: ${accountId}`);

        try {
            const endpoint = `${AIRWALLEX_CONSTANTS.ENDPOINTS.GET_TRANSACTIONS}/${accountId}`;
            const response = await this.httpClient.request<{ data: AirwallexTransaction[] }>({
                method: 'GET',
                url: endpoint,
                baseURL: this.baseUrl,
                params: limit ? { limit } : undefined,
                headers: { 'Content-Type': 'application/json' },
            });

            return this.transformer.transformTransactions(response.data);
        } catch (error: any) {
            this.logger.error(`[AirwallexTransactions] Failed to get transactions`, {
                error: error.message,
                accountId,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Failed to get Airwallex transactions: ${error.message || 'Unknown error'}`);
        }
    }
}
```

#### Step 4: Add Transformer Method (`bank-microservice/src/sdk/src/shared/transformers/airwallex.transformer.ts`)

Add transaction transformation method:

```typescript
transformTransactions(transactions: AirwallexTransaction[]): StandardTransaction[] {
    return transactions.map(transaction => ({
        id: transaction.id,
        accountId: transaction.account_id,
        amount: transaction.amount / 100, // Convert from cents
        currency: transaction.currency,
        description: transaction.description,
        date: transaction.created_at,
        type: transaction.type === 'debit' ? 'debit' : 'credit',
        provider: this.providerName,
    }));
}
```

#### Step 5: Update Provider (`bank-microservice/src/sdk/src/providers/airwallex.provider.ts`)

Add transactions feature to the provider:

```typescript
import { AirwallexTransactions } from '../features/transactions/airwallex.transactions';

export class AirwallexProvider extends BaseProvider {
    // ... existing code ...
    private transactions: AirwallexTransactions | null = null;

    constructor(...) {
        // ... existing initialization ...
        this.transactions = new AirwallexTransactions(this.httpClient, config, this.logger);
    }

    async getTransactions(accountId: string, limit?: number): Promise<StandardTransaction[]> {
        if (!this.transactions) {
            throw new Error('Transactions feature not initialized');
        }
        return this.transactions.getTransactions(accountId, limit);
    }
}
```

#### Step 6: Create Strategy Feature (`bank-microservice/src/strategies/features/transactions/airwallex.transactions.ts`)

Create the strategy feature that wraps the SDK feature:

```typescript
import { Logger } from '@nestjs/common';
import { ProviderInstance, StandardTransaction } from '../../../sdk';
import { ProviderType } from '../../../types/provider.enum';
import { ProviderOperationException, ProviderNotInitializedException } from '../../../exceptions/provider.exception';

export class AirwallexTransactions {
    constructor(
        private readonly providerInstance: ProviderInstance,
        private readonly logger: Logger,
    ) {}

    /**
     * Get transactions for an account
     */
    async getTransactions(accountId: string, limit?: number): Promise<StandardTransaction[]> {
        this.logger.debug(`Getting transactions for Airwallex account: ${accountId}`);

        try {
            // Call the provider's getTransactions method
            const result = await (this.providerInstance as any).getTransactions(accountId, limit);
            this.logger.log(`Successfully retrieved ${result.length} transaction(s) from Airwallex`);
            return result;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to get transactions from Airwallex: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.AIRWALLEX, 'get transactions', error);
        }
    }
}
```

#### Step 7: Update Strategy (`bank-microservice/src/strategies/airwallex.strategy.ts`)

Add transactions to the strategy:

```typescript
import { AirwallexTransactions } from './features/transactions/airwallex.transactions';

export class AirwallexStrategy extends BaseStrategy {
    private transactionsInstances: Map<string, AirwallexTransactions> = new Map();

    protected async doInitialize(companyId: string): Promise<void> {
        // ... existing initialization ...
        
        const transactions = new AirwallexTransactions(providerInstance, this.logger);
        this.transactionsInstances.set(companyId, transactions);
    }

    async getTransactions(companyId: string, accountId: string, limit?: number): Promise<StandardTransaction[]> {
        await this.initialize(companyId);
        const transactions = this.transactionsInstances.get(companyId);
        if (!transactions) {
            throw new ProviderNotInitializedException(ProviderType.AIRWALLEX);
        }
        return transactions.getTransactions(accountId, limit);
    }
}
```

#### Step 8: Update Strategy Interface (`bank-microservice/src/strategies/provider-strategy.interface.ts`)

Add the method to the interface:

```typescript
export interface IProviderStrategy {
    // ... existing methods ...
    
    /**
     * Get transactions for an account
     */
    getTransactions(companyId: string, accountId: string, limit?: number): Promise<StandardTransaction[]>;
}
```

#### Step 9: Update Bank Service (`bank-microservice/src/bank.service.ts`)

Add the service method:

```typescript
async getTransactions(provider: ProviderType, companyId: string, accountId: string, limit?: number): Promise<StandardTransaction[]> {
    this.logger.debug(`Getting transactions for provider: ${provider}, company: ${companyId}, account: ${accountId}`);
    const strategy = this.strategyFactory.getStrategy(provider);
    return strategy.getTransactions(companyId, accountId, limit);
}
```

#### Step 10: Update Bank Controller (`bank-microservice/src/bank.controller.ts`)

Add the message pattern handler with authentication guard:

```typescript
import { UseGuards } from '@nestjs/common';
import { TokenAuthGuard } from './guards/token-auth.guard';

export interface GetTransactionsCommand {
    provider: ProviderType | string;
    companyId: string;
    accountId: string;
    limit?: number;
}

@MessagePattern('bank.getTransactions')
@UseGuards(TokenAuthGuard)  // Protect endpoint with token validation
async getTransactions(@Payload() data: GetTransactionsCommand) {
    this.logger.debug('Received getTransactions command', data);
    const provider = this.validateProvider(data.provider);
    // Token is guaranteed to exist and be valid here
    return this.bankService.getTransactions(provider, data.companyId, data.accountId, data.limit);
}
```

**Note:** Use `@UseGuards(TokenAuthGuard)` for all endpoints that require authentication. The guard will automatically validate tokens before the handler executes.

#### Step 11: Update API Gateway Service (`bank-api-gateway/src/services/bank-client.service.ts`)

Add the client method:

```typescript
export interface GetTransactionsRequest {
    provider: ProviderType;
    companyId: string;
    accountId: string;
    limit?: number;
}

async getTransactions(request: GetTransactionsRequest) {
    await this.ensureConnected();
    this.logger.debug(`Calling microservice: bank.getTransactions`, request);
    return firstValueFrom(
        this.client.send('bank.getTransactions', {
            provider: request.provider,
            companyId: request.companyId,
            accountId: request.accountId,
            limit: request.limit,
        }),
    );
}
```

#### Step 12: Update API Gateway Controller (`bank-api-gateway/src/controllers/bank.controller.ts`)

Add the HTTP endpoint:

```typescript
@Post('transactions')
@HttpCode(HttpStatus.OK)
async getTransactions(@Body() dto: GetTransactionsDto) {
    try {
        this.logger.log(`Get transactions request for provider: ${dto.provider}, company: ${dto.companyId}`);
        return await this.bankClient.getTransactions({
            provider: dto.provider as any,
            companyId: dto.companyId,
            accountId: dto.accountId,
            limit: dto.limit,
        });
    } catch (error: any) {
        this.logger.error(`Get transactions failed: ${error.message}`, error.stack);
        throw new BadRequestException(error.message || 'Failed to get transactions');
    }
}
```

#### Step 13: Update API Gateway DTO (`bank-api-gateway/src/dto/bank.dto.ts`)

Add the DTO:

```typescript
export class GetTransactionsDto {
    @IsEnum(ProviderTypeDto)
    provider: ProviderTypeDto;

    @IsString()
    companyId: string;

    @IsString()
    accountId: string;

    @IsOptional()
    @IsNumber()
    limit?: number;
}
```

#### Step 14: Update Frontend API (`bank-demo-app/src/api/bankApi.ts`)

Add the API method:

```typescript
export interface GetTransactionsRequest {
    provider: ProviderType;
    companyId: string;
    accountId: string;
    limit?: number;
}

export interface StandardTransaction {
    id: string;
    accountId: string;
    amount: number;
    currency: string;
    description: string;
    date: string;
    type: 'debit' | 'credit';
    category?: string;
    provider: string;
}

export const bankApi = {
    // ... existing methods ...
    getTransactions: async (request: GetTransactionsRequest): Promise<StandardTransaction[]> => {
        const response = await apiClient.post<StandardTransaction[]>('/transactions', request);
        return response.data;
    },
};
```

#### Step 15: Update Frontend Hooks (`bank-demo-app/src/hooks/useBankQueries.ts`)

Add the React Query hook:

```typescript
export const useTransactions = (provider: ProviderType, companyId: string, accountId: string, limit?: number, enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.transactions, provider, companyId, accountId, limit],
        queryFn: () => bankApi.getTransactions({ provider, companyId, accountId, limit }),
        enabled: enabled && !!provider && !!companyId && !!accountId,
    });
};
```

#### Step 16: Update Frontend Query Keys (`bank-demo-app/src/constants/queryKeys.ts`)

Add the query key:

```typescript
export const QUERY_KEYS = {
    // ... existing keys ...
    transactions: 'transactions',
} as const;
```

#### Step 17: Create Frontend Component (`bank-demo-app/src/components/TransactionsList.tsx`)

Create a component to display transactions:

```typescript
import type { ProviderType } from '../api/bankApi';
import { useTransactions } from '../hooks/useBankQueries';

interface TransactionsListProps {
    provider: ProviderType;
    companyId: string;
    accountId: string;
}

export const TransactionsList = ({ provider, companyId, accountId }: TransactionsListProps) => {
    const { data: transactions, isLoading, error } = useTransactions(provider, companyId, accountId);

    if (isLoading) return <div>Loading transactions...</div>;
    if (error) return <div>Error loading transactions</div>;
    if (!transactions || transactions.length === 0) return <div>No transactions found</div>;

    return (
        <div>
            <h3 className="text-xl font-bold mb-4">Transactions</h3>
            <div className="space-y-2">
                {transactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded p-4">
                        <div className="flex justify-between">
                            <div>
                                <p className="font-semibold">{transaction.description}</p>
                                <p className="text-sm text-gray-600">{transaction.date}</p>
                            </div>
                            <div className={`text-right ${transaction.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                                <p className="font-bold">
                                    {transaction.type === 'debit' ? '-' : '+'}{transaction.currency} {Math.abs(transaction.amount).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
```

### Feature Development Checklist

When adding a new feature, follow this checklist:

**SDK Layer:**
- [ ] Add standard type to `shared/types/common.ts`
- [ ] Add provider-specific types to `shared/types/{provider}.ts`
- [ ] Create feature module in `features/{feature-name}/{provider}.{feature-name}.ts`
- [ ] Add transformer method to `shared/transformers/{provider}.transformer.ts`
- [ ] Update provider class to include feature module
- [ ] Update `IProvider` interface if needed

**Strategy Layer:**
- [ ] Create strategy feature in `strategies/features/{feature-name}/{provider}.{feature-name}.ts`
- [ ] Update strategy class to initialize and use feature
- [ ] Update `IProviderStrategy` interface
- [ ] Update `BaseStrategy` if feature needs common logic

**Service Layer:**
- [ ] Add method to `BankService`
- [ ] Add message pattern to `BankController` with `@UseGuards(TokenAuthGuard)` if endpoint requires authentication
- [ ] Add command interface for message payload

**API Gateway:**
- [ ] Add request interface to `bank-client.service.ts`
- [ ] Add client method to call microservice
- [ ] Add DTO for validation
- [ ] Add HTTP endpoint to controller

**Frontend:**
- [ ] Add types to `api/bankApi.ts`
- [ ] Add API method to `bankApi` object
- [ ] Add React Query hook to `useBankQueries.ts`
- [ ] Add query key to `queryKeys.ts`
- [ ] Create UI component to display feature data

### Key Principles

1. **Separation of Concerns**: Each feature is isolated in its own module
2. **Company Context**: All features accept `companyId` for multi-tenant support
3. **Authentication**: Use `TokenAuthGuard` to protect endpoints requiring authentication
4. **Error Handling**: Use `ProviderOperationException` for consistent error handling
5. **Logging**: Include provider and company context in all log messages
6. **Type Safety**: Define types at each layer (SDK → Strategy → Service → Gateway → Frontend)
7. **Standard Formats**: Transform provider-specific data to standard formats

### Benefits of Feature-Based Architecture

- **Maintainability**: Features are isolated and easy to modify
- **Testability**: Each feature can be tested independently
- **Reusability**: Features can be shared across providers
- **Scalability**: Easy to add new features without affecting existing ones
- **Consistency**: All features follow the same pattern

## Architecture Highlights

### Feature-Based Organization
The codebase is organized by **features** rather than by provider, making it easier to:
- Add new features across all providers
- Maintain consistent patterns
- Test features independently
- Understand the codebase structure

### Strategy Pattern
Each provider has a **Strategy** class that:
- Extends `BaseStrategy` for common functionality
- Manages provider instances per company (multi-tenant)
- Delegates to feature modules (authentication, accounts, balances, jobs)
- Handles OAuth flows separately

### Guard-Based Authentication
Token validation is centralized in `TokenAuthGuard`:
- Validates tokens before protected endpoints execute
- Provides consistent error messages
- Reduces code duplication in feature modules
- Makes authentication requirements explicit

### Multi-Tenant Support
All operations are scoped by `companyId`:
- Tokens are stored per company
- Provider instances are created per company
- Each company has isolated authentication state

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture documentation



https://github.com/user-attachments/assets/debb7bb6-3f94-448e-8e2e-d689cff816c5





