import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/bank';

export type ProviderType = 'airwallex' | 'basiq';

export interface AuthenticateRequest {
    provider: ProviderType;
}

export interface AuthenticateResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    refresh_token: string;
}

export interface GetAccountRequest {
    provider: ProviderType;
}

export interface GetBalancesRequest {
    provider: ProviderType;
}

export interface StandardAccount {
    id: string;
    accountNumber: string;
    accountName: string;
    balance: number;
    currency: string;
    type: string;
    provider: string;
}

export interface StandardBalance {
    available: number;
    current: number;
    currency: string;
    provider: string;
}

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const bankApi = {
    authenticate: async (request: AuthenticateRequest): Promise<AuthenticateResponse> => {
        const response = await apiClient.post<AuthenticateResponse>('/authenticate', request);
        return response.data;
    },

    getAccount: async (request: GetAccountRequest): Promise<StandardAccount> => {
        const response = await apiClient.post<StandardAccount>('/account', request);
        return response.data;
    },

    getBalances: async (request: GetBalancesRequest): Promise<StandardBalance[]> => {
        const response = await apiClient.post<StandardBalance[]>('/balances', request);
        return response.data;
    },
};

