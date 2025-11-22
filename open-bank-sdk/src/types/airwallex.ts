/**
 * Airwallex-specific types based on their API structure
 */

import { ProviderConfig } from './common';

export interface AirwallexConfig extends ProviderConfig {
    clientId: string;
    apiKey: string;
}

export interface AirwallexAuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    refresh_token: string;
}

export interface AirwallexAccount {
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

export interface AirwallexAccountBalance {
    available_amount: number;
    currency: string;
    pending_amount: number;
    reserved_amount: number;
    total_amount: number;
    prepayment_amount: number;
}

export interface AirwallexBalance {
    account_id?: string;
    available_amount?: number;
    currency?: string;
    pending_amount?: number;
    reserved_amount?: number;
    total_amount?: number;
    prepayment_amount?: number;
    [key: string]: unknown;
}

