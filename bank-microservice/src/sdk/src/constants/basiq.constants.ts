export const BASIQ_CONSTANTS = {
    BASE_URL: process.env.BASIQ_BASE_URL || 'https://au-api.basiq.io',
    PROVIDER_NAME: 'basiq',
    API_VERSION: '3.0',
    ENDPOINTS: {
        AUTHENTICATE: '/token',
        CREATE_USER: '/users',
        GET_ACCOUNT: (userId: string) => `/users/${userId}/accounts`,
        GET_BALANCES: (userId: string) => `/users/${userId}/insights/balance`,
    },
    HEADERS: {
        VERSION: 'basiq-version',
        CONTENT_TYPE_JSON: 'application/json',
        CONTENT_TYPE_FORM: 'application/x-www-form-urlencoded',
    },
    SCOPES: {
        SERVER_ACCESS: 'SERVER_ACCESS',
        CLIENT_ACCESS: 'CLIENT_ACCESS',
    },
} as const;

