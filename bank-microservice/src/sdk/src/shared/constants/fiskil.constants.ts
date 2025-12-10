/**
 * Fiskil API constants
 */

export const FISKIL_CONSTANTS = {
    BASE_URL: process.env.FISKIL_BASE_URL || 'https://api.fiskil.com',
    ENDPOINTS: {
        AUTHENTICATE: '/v1/token',
        CREATE_END_USER: '/v1/end-users',
        CREATE_AUTH_SESSION: '/v1/auth/session',
        GET_ACCOUNTS: '/v1/banking/accounts',
        GET_BALANCES: '/v1/banking/balances',
        GET_TRANSACTIONS: '/v1/banking/transactions',
    },
    HEADERS: {
        CONTENT_TYPE: 'application/json',
        ACCEPT: 'application/json',
    },
} as const;

