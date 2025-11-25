export const PROVIDER_BASE_URLS = {
    AIRWALLEX: process.env.AIRWALLEX_BASE_URL || 'https://api.airwallex.com',
    BASIQ: process.env.BASIQ_BASE_URL || 'https://au-api.basiq.io',
} as const;

export const DEFAULT_TIMEOUT = 30000;

export const PROVIDER_NAMES = {
    AIRWALLEX: 'airwallex',
    BASIQ: 'basiq',
} as const;

export * from './airwallex.constants';
export * from './basiq.constants';

