import { Logger } from '@nestjs/common';
import { IProvider } from './base.provider';
import {
    StandardAccount,
    StandardBalance,
    StandardJob,
} from '../shared/types/common';

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
     * Get jobs (Basiq-specific, returns empty array for other providers)
     */
    async getJobs(userId?: string, jobId?: string): Promise<StandardJob[]> {
        return this.provider.getJobs(userId, jobId);
    }

    /**
     * Get the provider name
     */
    getProviderName(): string {
        return this.provider.getProviderName();
    }
}

