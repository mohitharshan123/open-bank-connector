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
    fiskil: {
        clientId: string;
        clientSecret: string;
        baseUrl?: string;
        oauthRedirectUri?: string;
        oauthScope?: string;
    }
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
    fiskil: {
        clientId: process.env.FISKIL_CLIENT_ID || '',
        clientSecret: process.env.FISKIL_CLIENT_SECRET || '',
        baseUrl: process.env.FISKIL_BASE_URL,
        oauthRedirectUri: process.env.FISKIL_OAUTH_REDIRECT_URI ,
    },
}));

