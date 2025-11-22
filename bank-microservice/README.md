# Bank Microservice

NestJS microservice that handles banking operations via TCP transport.

## Setup

```bash
pnpm install
cp .env.example .env
```

Configure `.env`:
- `AIRWALLEX_API_KEY`
- `AIRWALLEX_CLIENT_ID`
- `MONGODB_URI`
- `REDIS_HOST`, `REDIS_PORT`

## Running

**With Docker (Redis + MongoDB):**
```bash
docker-compose up -d
pnpm start:dev
```

**Direct:**
```bash
pnpm start:dev
```

## Architecture

**Transport**: TCP (port 3000)
- Uses NestJS microservices with `Transport.TCP`
- Message patterns: `bank.authenticate`, `bank.getAccount`, `bank.getBalances`

**Token Management**:
- Redis: Fast token caching with TTL
- MongoDB: Persistent token storage
- Automatic refresh with lock mechanism

**HTTP Adapter**:
- Converts NestJS `HttpService` (RxJS) to SDK's `IHttpClient` (Promises)
- Wraps with `TokenInjectingHttpClient` for automatic token injection

**Message Handlers**:
- `@MessagePattern('bank.authenticate')`: Authenticate with provider
- `@MessagePattern('bank.getAccount')`: Get account details
- `@MessagePattern('bank.getBalances')`: Get all balances

## TCP Communication

Microservice listens on TCP port 3000. API Gateway connects via `ClientProxy` with `Transport.TCP`. Messages use JSON serialization.

## Dependencies

- Redis: Token caching
- MongoDB: Token persistence
- Open Bank SDK: Provider integration
