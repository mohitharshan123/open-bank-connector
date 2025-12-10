/**
 * Common types and interfaces used across all providers
 */

export interface ProviderConfig {
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

export interface StandardTransaction {
    id: string;
    accountId: string;
    amount: number;
    currency: string;
    description: string;
    date: string;
    type: TransactionType;
    category?: string;
    subCategory?: string;
    status?: TransactionStatus;
    reference?: string;
    provider: string;
}

export type ProviderName = 'airwallex' | 'fiskil';

export enum TransactionType {
    DEBIT = 'debit',
    CREDIT = 'credit',
}
export enum TransactionStatus {
    PENDING = 'pending',
    POSTED = 'posted',
    FAILED = 'failed',
}

