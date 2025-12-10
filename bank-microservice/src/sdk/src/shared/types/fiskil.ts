/**
 * Fiskil-specific types based on their API structure
 */

import { ProviderConfig, TransactionType } from './common';

export interface FiskilConfig extends ProviderConfig {
    clientId: string;
    clientSecret: string;
}

export interface FiskilAuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface FiskilUser {
    id: string;
    email?: string;
    mobile?: string;
    firstName?: string;
    lastName?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface FiskilCreateUserRequest {
    email?: string;
    name?: string;
    phone?: string;
}

export interface FiskilCreateUserResponse {
    end_user_id: string;
    email?: string;
    name?: string;
    phone?: string;
    created_at?: string;
}

export interface FiskilAuthSessionRequest {
    end_user_id: string;
    cancel_uri?: string;
}

export interface FiskilAuthSessionResponse {
    auth_url: string;
    expires_at: string;
    session_id: string;
}

export interface FiskilAccount {
    account_id: string;
    fiskil_id: string;
    display_name: string;
    masked_number: string;
    account_number?: string;
    product_name: string;
    product_category: string;
    institution_id: string;
    arrangement_id: string;
    account_ownership?: string;
    open_status?: string;
    nickname?: string;
    currency?: string;
    [key: string]: unknown;
}

export interface FiskilAccountsResponse {
    accounts: FiskilAccount[];
    links?: {
        next?: string;
        prev?: string;
    };
}

export interface FiskilBalance {
    account_id: string;
    fiskil_id: string;
    current_balance: string;
    available_balance: string;
    currency: string;
    institution_id: string;
    arrangement_id: string;
    credit_limit?: string;
    amortised_limit?: string;
    [key: string]: unknown;
}

export interface FiskilBalancesResponse {
    balances: FiskilBalance[];
    links?: {
        next?: string;
        prev?: string;
    };
}

export interface FiskilTransaction {
    fiskil_id: string;
    institution_id: string;
    arrangement_id: string;
    account_id: string;
    amount: string;
    currency: string;
    description: string;
    execution_date_time: string;
    extended_data?: {
        service?: string;
        [key: string]: any;
    };
    category?: {
        primary_category: string;
        secondary_category: string;
        confidence_level: string;
    };
    is_detail_available: boolean;
    merchant_category_code?: string;
    posting_date_time: string;
    reference: string;
    status: string;
    transaction_id: string;
    type: TransactionType;
}

export interface FiskilTransactionsResponse {
    transactions: FiskilTransaction[];
    links?: {
        next?: string;
        prev?: string;
    };
}

