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

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture documentation

