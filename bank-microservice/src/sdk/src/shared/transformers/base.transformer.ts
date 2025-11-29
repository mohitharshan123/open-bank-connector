import {
    StandardAccount,
    StandardBalance,
} from '../types/common';

/**
 * Base transformer interface that all provider transformers must implement
 */
export interface ITransformer<TProviderAccount, TProviderBalance> {
    /**
     * Transform provider-specific account to standard format
     */
    transformAccounts(accounts: TProviderAccount): StandardAccount[];

    /**
     * Transform provider-specific balances array to standard format
     */
    transformBalances(balances: TProviderBalance[]): StandardBalance[];
}

/**
 * Abstract base transformer class with common transformation logic
 */
export abstract class BaseTransformer<
    TProviderAccount,
    TProviderBalance
> implements ITransformer<TProviderAccount, TProviderBalance> {
    protected providerName: string;

    constructor(providerName: string) {
        this.providerName = providerName;
    }

    abstract transformAccounts(accounts: TProviderAccount): StandardAccount[];
    abstract transformBalances(balances: TProviderBalance[]): StandardBalance[];

}

