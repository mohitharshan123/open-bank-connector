# Bank API Gateway

NestJS REST API gateway that communicates with the Bank Microservice via TCP.

## Features

- RESTful API endpoints
- Request validation using class-validator
- TCP microservice communication
- Error handling and logging
- CORS enabled

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables (create a `.env` file):
```env
PORT=3001
MICROSERVICE_HOST=localhost
MICROSERVICE_PORT=3000
```

3. Start the API gateway:
```bash
pnpm run start:dev
```

API Gateway listens on HTTP port 3001.

## API Endpoints

All endpoints are prefixed with `/api/bank` and accept POST requests with JSON body.

### 1. Authenticate

Authenticate with a provider and get an access token.

**Endpoint:** `POST /api/bank/authenticate`

**Request Body:**
```json
{
  "provider": "airwallex"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 1800,
  "scope": "read",
  "refresh_token": "refresh_token_here"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/bank/authenticate \
  -H "Content-Type: application/json" \
  -d '{"provider": "airwallex"}'
```

### 2. Get Account

Get account details for a provider.

**Endpoint:** `POST /api/bank/account`

**Request Body:**
```json
{
  "provider": "airwallex"
}
```

**Response:**
```json
{
  "id": "acct_kZWj0XcONIuesOVqZO4rpA",
  "accountNumber": "acct_kZWj0XcONIuesOVqZO4rpA",
  "accountName": "Sandbox Business",
  "balance": 0,
  "currency": "",
  "type": "business",
  "provider": "airwallex"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/bank/account \
  -H "Content-Type: application/json" \
  -d '{"provider": "airwallex"}'
```

### 3. Get Balances

Get all balances for a provider (returns array of balances by currency).

**Endpoint:** `POST /api/bank/balances`

**Request Body:**
```json
{
  "provider": "airwallex"
}
```

**Response:**
```json
[
  {
    "available": 100000.00,
    "current": 100000.00,
    "currency": "USD",
    "provider": "airwallex"
  },
  {
    "available": 100000.00,
    "current": 100000.00,
    "currency": "EUR",
    "provider": "airwallex"
  }
]
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/bank/balances \
  -H "Content-Type: application/json" \
  -d '{"provider": "airwallex"}'
```

## Request Validation

All endpoints validate request bodies using `class-validator`:

- `provider`: Must be `"airwallex"` (enum validation)

## Error Handling

The API gateway handles errors from the microservice and returns appropriate HTTP status codes:

- `400 Bad Request`: Invalid request, validation error, or provider not supported
- `500 Internal Server Error`: Microservice error or connection issue

## Architecture

```
Client Request (HTTP)
    ↓
API Gateway (REST API :3001)
    ↓
TCP Client
    ↓
Bank Microservice (TCP :3000)
    ↓
Open Bank SDK
    ↓
Provider API (Airwallex)
```

## Development

```bash
# Watch mode
pnpm run start:dev

# Production build
pnpm run build
pnpm run start:prod
```

## Prerequisites

Make sure the following services are running:

1. **Bank Microservice** (port 3000)
   ```bash
   cd ../bank-microservice
   pnpm run start:dev
   ```

2. **MongoDB** (for token storage)
   ```bash
   docker-compose up -d mongodb
   ```

3. **Redis** (for token caching)
   ```bash
   docker-compose up -d redis
   ```

## Testing

1. Start the microservice (see Prerequisites)
2. Start the API gateway: `pnpm run start:dev`
3. Test endpoints using curl (see examples above) or Postman
