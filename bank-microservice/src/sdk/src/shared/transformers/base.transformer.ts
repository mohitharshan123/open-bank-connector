import {
    StandardAccount,
    StandardBalance,
    StandardTransaction,
} from '../types/common';

/**
 * Base transformer interface that all provider transformers must implement
 */
export interface ITransformer<TProviderAccount, TProviderBalance, TProviderTransaction> {
    /**
     * Transform provider-specific account to standard format
     */
    transformAccounts(accounts: TProviderAccount): StandardAccount[];

    /**
     * Transform provider-specific balances array to standard format
     */
    transformBalances(balances: TProviderBalance[]): StandardBalance[];

    /**
     * Transform provider-specific transactions array to standard format
     */
    transformTransactions(transactions: TProviderTransaction[]): StandardTransaction[];
}

/**
 * Abstract base transformer class with common transformation logic
 */
export abstract class BaseTransformer<
    TProviderAccount,
    TProviderBalance,
    TProviderTransaction,
> implements ITransformer<TProviderAccount, TProviderBalance, TProviderTransaction> {
    protected providerName: string;

    constructor(providerName: string) {
        this.providerName = providerName;
    }

    abstract transformAccounts(accounts: TProviderAccount): StandardAccount[];
    abstract transformBalances(balances: TProviderBalance[]): StandardBalance[];
    abstract transformTransactions(transactions: TProviderTransaction[]): StandardTransaction[];
}

