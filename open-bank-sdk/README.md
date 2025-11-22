# Open Bank SDK

TypeScript SDK for integrating with banking providers through a unified interface.

## Installation

```bash
pnpm install
pnpm build
```

## Usage

```typescript
import OpenBankSDK from 'open-bank-sdk';
import { NestJsHttpAdapter } from './adapters';

const sdk = new OpenBankSDK();
const httpClient = new NestJsHttpAdapter(httpService);

const airwallex = sdk.useAirwallex(httpClient, {
  apiKey: 'your-api-key',
  clientId: 'your-client-id',
}, logger, authHttpClient);

const account = await airwallex.getAccount();
const balances = await airwallex.getBalances();
```

## Architecture

**Providers**: Implement `IProvider` interface
- `getAccount()`: Fetch account details
- `getBalances()`: Fetch all balances
- `getProviderName()`: Return provider identifier

**Transformers**: Convert provider responses to standard format
- `transformAccount()`: Provider account → StandardAccount
- `transformBalances()`: Provider balances[] → StandardBalance[]

**HTTP Client**: Pluggable interface (`IHttpClient`)
- Works with any HTTP library (axios, NestJS HttpService, etc.)
- Standard request/response format

**Logger**: Pluggable interface (`ILogger`)
- Integrates with external logging systems
- Default console logger included

## Standard Types

**StandardAccount**: `id`, `accountNumber`, `accountName`, `balance`, `currency`, `type`, `provider`

**StandardBalance**: `available`, `current`, `currency`, `provider`

## Building

```bash
pnpm build
```

Output: `dist/` folder with compiled JavaScript and type definitions.

