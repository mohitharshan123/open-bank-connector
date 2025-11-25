import { registerAs } from '@nestjs/config';

export interface BankConfig {
    mongodb: {
        uri: string;
    };
    airwallex: {
        apiKey: string;
        clientId: string;
        baseUrl?: string;
        oauthRedirectUri?: string;
        oauthScope?: string;
    };
    basiq: {
        apiKey: string;
        baseUrl?: string;
    };
}

export default registerAs('bank', (): BankConfig => ({
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bank-microservice',
    },
    airwallex: {
        apiKey: process.env.AIRWALLEX_API_KEY || '',
        clientId: process.env.AIRWALLEX_CLIENT_ID || '',
        baseUrl: process.env.AIRWALLEX_BASE_URL,
        oauthRedirectUri: process.env.AIRWALLEX_OAUTH_REDIRECT_URI || 'http://localhost:5173/oauth/callback',
        oauthScope: process.env.AIRWALLEX_OAUTH_SCOPE || 'r:awx_action:balances_view r:awx_action:settings.account_details_view',
    },
    basiq: {
        apiKey: process.env.BASIQ_API_KEY || '',
        baseUrl: process.env.BASIQ_BASE_URL,
    },
}));

