import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/bank';

export type ProviderType = 'airwallex' | 'basiq';

export interface AuthenticateRequest {
    provider: ProviderType;
    companyId: string;
    userId?: string;
    oauthCode?: string;
}

export interface AuthenticateResponse {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
    refresh_token?: string;
    redirectUrl?: string;
}

export interface GetAccountRequest {
    provider: ProviderType;
    companyId: string;
}

export interface GetBalancesRequest {
    provider: ProviderType;
    companyId: string;
}

export interface CreateBasiqUserRequest {
    email?: string;
    mobile?: string;
    firstName?: string;
    lastName?: string;
}

export interface OAuthRedirectRequest {
    provider: ProviderType;
    companyId: string;
    userId?: string;
    action?: string;
    state?: string;
}

export interface ConnectionStatusRequest {
    provider: ProviderType;
    companyId: string;
}

export interface ConnectionStatusResponse {
    isConnected: boolean;
    provider: ProviderType;
    companyId: string;
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
    getOAuthRedirect: async (request: OAuthRedirectRequest): Promise<{ redirectUrl: string }> => {
        const response = await apiClient.post<{ redirectUrl: string }>('/oauth/redirect', request);
        return response.data;
    },
    getAccount: async (request: GetAccountRequest): Promise<StandardAccount[]> => {
        const response = await apiClient.post<StandardAccount[]>('/account', request);
        return response.data;
    },
    getBalances: async (request: GetBalancesRequest): Promise<StandardBalance[]> => {
        const response = await apiClient.post<StandardBalance[]>('/balances', request);
        return response.data;
    },
    getConnectionStatus: async (request: ConnectionStatusRequest): Promise<ConnectionStatusResponse> => {
        const response = await apiClient.post<ConnectionStatusResponse>('/connection-status', request);
        return response.data;
    },
};

