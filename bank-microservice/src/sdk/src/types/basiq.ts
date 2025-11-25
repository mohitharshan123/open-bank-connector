/**
 * Airwallex-specific types based on their API structure
 */

import { ProviderConfig } from './common';

export interface BasiqConfig extends ProviderConfig {
    apiKey: string;
}

export interface BasiqAuthResponse {
    access_token: string;
    expires_in: number;
}

export interface BasiqAccount {
    id: string;
    nickname?: string;
    status?: string;
    view_type?: string;
    created_at?: string;
    account_details?: {
        business_details?: {
            business_name?: string;
            business_name_english?: string;
        };
        legal_entity_id?: string;
        legal_entity_type?: string;
    };
    primary_contact?: {
        email?: string;
        mobile?: string;
    };
    [key: string]: unknown;
}

export interface BasiqAccountBalance {
    available_amount: number;
    currency: string;
    pending_amount: number;
    reserved_amount: number;
    total_amount: number;
    prepayment_amount: number;
}

export interface BasiqBalance {
    account_id?: string;
    available_amount?: number;
    currency?: string;
    pending_amount?: number;
    reserved_amount?: number;
    total_amount?: number;
    prepayment_amount?: number;
    [key: string]: unknown;
}

export interface BasiqCreateUserRequest {
    email?: string;
    mobile?: string;
    firstName?: string;
    lastName?: string;
}

export interface BasiqUser {
    id: string;
    email?: string;
    mobile?: string;
    firstName?: string;
    lastName?: string;
    created?: string;
    updated?: string;
    [key: string]: unknown;
}

