import { Injectable, Logger } from '@nestjs/common';
import { IProvider } from './providers/base.provider';
import { ProviderInstance } from './providers/provider-instance';
import { AirwallexProvider } from './providers/airwallex.provider';
import { BasiqProvider } from './providers/basiq.provider';
import { AirwallexConfig } from './types/airwallex';
import {
    StandardAccount,
    StandardBalance,
    ProviderName,
} from './types/common';
import { IHttpClient } from './interfaces/https-client.interface';
import { BasiqConfig } from './types/basiq';

/**
 * Configuration for initializing a provider
 */
export type ProviderConfig = AirwallexConfig;

export enum Providers {
    AIRWALLEX = 'airwallex',
    BASIQ = 'basiq',
}

/**
 * Main SDK class that provides a unified interface to interact with multiple banking providers
 */
@Injectable()
export class OpenBankSDK {
    private readonly logger = new Logger(OpenBankSDK.name);
    private providers: Map<Providers, IProvider> = new Map();

    /**
     * Register a provider with the SDK
     */
    registerProvider(name: Providers, provider: IProvider): void {
        this.providers.set(name, provider);
    }

    /**
     * Initialize Airwallex provider and return a provider-specific instance
     * Usage: const airwallex = sdk.useAirwallex(httpClient, config, logger, authHttpClient); await airwallex.getAccount();
     */
    useAirwallex(httpClient: IHttpClient, config: AirwallexConfig, logger?: Logger, authHttpClient?: IHttpClient): ProviderInstance {
        const provider = new AirwallexProvider(httpClient, config, logger, authHttpClient);
        this.registerProvider(Providers.AIRWALLEX, provider);
        return new ProviderInstance(provider, logger || this.logger);
    }

    /**
     * Initialize Basiq provider and return a provider-specific instance
     * Usage: const basiq = sdk.useBasiq(httpClient, config, logger, authHttpClient); await basiq.getAccount();
     */
    useBasiq(httpClient: IHttpClient, config: BasiqConfig, logger?: Logger, authHttpClient?: IHttpClient): ProviderInstance {
        const providerLogger = logger || this.logger;
        const provider = new BasiqProvider(httpClient, config, providerLogger, authHttpClient);
        this.registerProvider(Providers.BASIQ, provider);
        return new ProviderInstance(provider, providerLogger);
    }

    private getProvider(providerName: Providers): IProvider {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider "${providerName}" is not registered. Please initialize it first.`);
        }
        return provider;
    }

    /**
     * Get account details for a provider
     */
    async getAccount(providerName: Providers): Promise<StandardAccount> {
        const provider = this.getProvider(providerName);
        return provider.getAccount();
    }

    /**
     * Get account balances from a provider
     */
    async getBalances(providerName: Providers): Promise<StandardBalance[]> {
        const provider = this.getProvider(providerName);
        return provider.getBalances();
    }

    /**
     * Get all registered provider names
     */
    getRegisteredProviders(): Providers[] {
        return Array.from(this.providers.keys());
    }
}

