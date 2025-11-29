
export const AIRWALLEX_CONSTANTS = {
    BASE_URL: process.env.AIRWALLEX_BASE_URL || 'https://api.airwallex.com',
    PROVIDER_NAME: 'airwallex',
    ENDPOINTS: {
        AUTHENTICATE: '/api/v1/authentication/login',
        GET_ACCOUNTS: '/api/v1/account',
        GET_BALANCES: '/api/v1/balances/current',
    },
    HEADERS: {
        API_KEY: 'x-api-key',
        CLIENT_ID: 'x-client-id',
        CONTENT_TYPE: 'application/json',
    },
} as const;

