import { registerAs } from '@nestjs/config';

export interface BankConfig {
    mongodb: {
        uri: string;
    };
    airwallex: {
        apiKey: string;
        clientId: string;
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
    },
}));

