import { IProvider } from './base.provider';
import {
    StandardAccount,
    StandardBalance,
} from '../types/common';
import { ILogger, ConsoleLogger } from '../interfaces/logger.interface';

/**
 * Provider-specific instance wrapper that exposes methods without requiring provider name
 */
export class ProviderInstance {
    private logger: ILogger;

    constructor(private provider: IProvider, logger?: ILogger) {
        this.logger = logger || new ConsoleLogger();
    }

    /**
     * Authenticate with the provider (if supported)
     * This method delegates to the underlying provider's authenticate method
     */
    async authenticate(): Promise<any> {
        const providerName = this.provider.getProviderName();

        if (typeof (this.provider as any).authenticate === 'function') {
            try {
                const result = await (this.provider as any).authenticate();
                this.logger.debug(`authenticate() completed successfully`);
                return result;
            } catch (error: any) {
                this.logger.error(`authenticate() failed: ${error.message}`);
                throw error;
            }
        }

        this.logger.error(`Provider ${providerName} does not support authentication`);
        throw new Error(`Provider ${providerName} does not support authentication`);
    }

    /**
     * Get account details
     */
    async getAccount(): Promise<StandardAccount> {
        return this.provider.getAccount();
    }

    /**
     * Get account balances
     */
    async getBalances(): Promise<StandardBalance[]> {
        return this.provider.getBalances();
    }

    /**
     * Get the provider name
     */
    getProviderName(): string {
        return this.provider.getProviderName();
    }
}

