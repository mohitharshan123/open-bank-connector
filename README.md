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
- `bank.authenticate`
- `bank.getAccount`
- `bank.getBalances`

### 3. Microservice Processing
Microservice (`bank-microservice`) receives TCP message:
- Listens on TCP port 3000
- `@MessagePattern` handlers process messages
- Initializes provider SDK if needed
- Retrieves/validates token from Redis/MongoDB
- Calls SDK methods

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
├── open-bank-sdk/          # Provider SDK
├── bank-microservice/      # TCP Microservice
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
Body: { "provider": "airwallex" }
```

**Get Balances:**
```bash
POST http://localhost:3001/api/bank/balances
Body: { "provider": "airwallex" }
```

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

## Token Management

- **Redis**: Fast token caching (TTL-based expiration)
- **MongoDB**: Persistent token storage with metadata
- **Auto-refresh**: Tokens refreshed automatically when expired
- **Lock mechanism**: Prevents concurrent refresh attempts

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

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture documentation


https://github.com/user-attachments/assets/b3db140c-74d4-4d47-a229-2541ba98bb3d


