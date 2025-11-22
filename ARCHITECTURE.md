# Open Bank Connector Architecture

## Overview

The Open Bank Connector is a microservices-based banking integration system that provides a unified interface to interact with multiple banking providers. It consists of three main components: SDK, Microservice, and API Gateway.

## Components

### 1. Open Bank SDK (`open-bank-sdk`)

TypeScript SDK that abstracts provider-specific APIs into a standard interface.

**Architecture:**
- **Providers**: Implement `IProvider` interface (Airwallex, extensible for others)
- **Transformers**: Convert provider-specific responses to `StandardAccount` and `StandardBalance[]`
- **HTTP Client**: Pluggable `IHttpClient` interface for HTTP requests
- **Logger**: Pluggable `ILogger` interface for logging

**Key Features:**
- Provider abstraction layer
- Standard data transformation
- Token-agnostic HTTP client
- Extensible provider system

**API:**
- `getAccount()`: Returns account details
- `getBalances()`: Returns array of balances by currency
- `authenticate()`: Provider-specific authentication

### 2. Bank Microservice (`bank-microservice`)

NestJS microservice that handles banking operations using TCP transport.

**Architecture:**
- **Transport**: TCP (port 3000)
- **Message Patterns**: `bank.authenticate`, `bank.getAccount`, `bank.getBalances`
- **Token Management**: Redis (cache) + MongoDB (persistence)
- **HTTP Adapter**: Converts NestJS HttpService to SDK's IHttpClient

**TCP Communication:**
- Uses NestJS `@nestjs/microservices` with `Transport.TCP`
- API Gateway connects via TCP client
- Message-based request/response pattern
- No HTTP overhead, direct binary protocol

**Token Flow:**
1. Authenticate request → Provider API
2. Store token in Redis (fast access) + MongoDB (persistence)
3. Token injection via `TokenInjectingHttpClient` wrapper
4. Automatic refresh when expired (with lock to prevent concurrent refreshes)

**Dependencies:**
- Redis: Token caching
- MongoDB: Token persistence
- Open Bank SDK: Provider integration

### 3. API Gateway (`bank-api-gateway`)

REST API gateway that exposes HTTP endpoints and communicates with microservice via TCP.

**Architecture:**
- **Transport**: HTTP (port 3001) → TCP (port 3000)
- **Endpoints**: `POST /api/bank/authenticate`, `/account`, `/balances`
- **Client**: NestJS TCP microservice client

**Request Flow:**
1. HTTP request → API Gateway
2. Gateway → TCP message to Microservice
3. Microservice → Provider SDK → External API
4. Response flows back through same path

## Data Flow

```
Client → API Gateway (HTTP) → Microservice (TCP) → SDK → Provider API
                                                      ↓
                                              Transform Response
                                                      ↓
Client ← API Gateway (HTTP) ← Microservice (TCP) ← Standard Format
```

## TCP Transport

**Why TCP:**
- Lower latency than HTTP
- Binary protocol efficiency
- Direct service-to-service communication
- Built-in connection pooling

**Implementation:**
- Microservice listens on TCP port (default: 3000)
- Gateway uses `ClientProxy` with `Transport.TCP`
- Message patterns replace REST endpoints
- Automatic serialization/deserialization

## Token Management

**Storage Strategy:**
- **Redis**: Fast token retrieval (TTL-based expiration)
- **MongoDB**: Persistent token storage with metadata
- **Refresh Lock**: Prevents concurrent refresh attempts

**Token Injection:**
- `TokenInjectingHttpClient` wraps base HTTP client
- Automatically injects Bearer token in Authorization header
- Validates expiration and triggers refresh if needed
- Uses separate auth HTTP client to break circular dependencies

## Standard Data Formats

**StandardAccount:**
- `id`, `accountNumber`, `accountName`, `balance`, `currency`, `type`, `provider`

**StandardBalance:**
- `available`, `current`, `currency`, `provider`

All provider-specific responses are transformed to these standard formats.

## Provider Support

Currently supports:
- **Airwallex**: Full implementation

Designed for extensibility - add new providers by:
1. Implementing `IProvider` interface
2. Creating provider-specific transformer
3. Registering in SDK



## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture documentation
- [BANK-MICROSERVICE-README.md](./bank-microservice/README.md) - Bank microservice 
- [SDK-README.md](./open-bank-sdk/README.md)
- [API-GATEWAY-README.md](./bank-api-gateway/README.md)
- [FRONTEND-README.md](./bank-demo-app/README.md)


