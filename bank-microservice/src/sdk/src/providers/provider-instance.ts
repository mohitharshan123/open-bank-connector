import { Logger } from '@nestjs/common';
import { IProvider } from './base.provider';
import {
    StandardAccount,
    StandardBalance,
} from '../types/common';

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
    async authenticate(): Promise<any> {
        const providerName = this.provider.getProviderName();
        this.logger.debug(`[ProviderInstance] authenticate() called for provider: ${providerName}`);

        return this.provider.authenticate();
    }

    /**
     * Get account details
     */
    async getAccount(userId?: string): Promise<StandardAccount> {
        return this.provider.getAccount(userId);
    }

    /**
     * Get account balances
     */
    async getBalances(userId?: string): Promise<StandardBalance[]> {
        return this.provider.getBalances(userId);
    }

    /**
     * Get the provider name
     */
    getProviderName(): string {
        return this.provider.getProviderName();
    }
}

