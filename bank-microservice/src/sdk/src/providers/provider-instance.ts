import { Logger } from '@nestjs/common';
import {
    StandardAccount,
    StandardBalance,
    StandardTransaction,
} from '../shared/types/common';
import { IProvider } from './base.provider';

/**
 * Provider-specific instance wrapper that exposes methods without requiring provider name
 */
export class ProviderInstance {
    private logger: Logger;

    constructor(private provider: IProvider, logger?: Logger) {
        this.logger = logger || new Logger(ProviderInstance.name);
    }

    /**
     * Authenticate with the provider (if supported)
     * This method delegates to the underlying provider's authenticate method
     */
    async authenticate(userId?: string): Promise<any> {
        const providerName = this.provider.getProviderName();
        this.logger.debug(`[ProviderInstance] authenticate() called for provider: ${providerName}`, { userId });

        return this.provider.authenticate(userId);
    }

    /**
     * Get account details (returns array of accounts)
     */
    async getAccount(userId?: string): Promise<StandardAccount[]> {
        return this.provider.getAccount(userId);
    }

    /**
     * Get account balances
     */
    async getBalances(userId?: string): Promise<StandardBalance[]> {
        return this.provider.getBalances(userId);
    }

    /**
     * Get transactions (optional, only supported by some providers like Fiskil)
     */
    async getTransactions(
        userId?: string,
        accountId?: string,
        from?: string,
        to?: string,
        status?: 'PENDING' | 'POSTED',
    ): Promise<{ transactions: StandardTransaction[]; links?: { next?: string; prev?: string } }> {
        if ('getTransactions' in this.provider && typeof this.provider.getTransactions === 'function') {
            return (this.provider as any).getTransactions(userId, accountId, from, to, status);
        }
        throw new Error(`Transactions not supported for provider: ${this.provider.getProviderName()}`);
    }

    /**
     * Get the provider name
     */
    getProviderName(): string {
        return this.provider.getProviderName();
    }
}

