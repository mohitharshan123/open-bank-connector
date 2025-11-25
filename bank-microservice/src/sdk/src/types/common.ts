/**
 * Common types and interfaces used across all providers
 */

export interface ProviderConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
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

export type ProviderName = 'airwallex' | 'basiq';

