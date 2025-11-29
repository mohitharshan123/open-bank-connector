import { Injectable, Logger } from '@nestjs/common';
import { AirwallexAccounts } from './features/accounts/airwallex.accounts';
import { BasiqAccounts } from './features/accounts/basiq.accounts';
import { AirwallexAuthentication } from './features/authentication/airwallex.authentication';
import { BasiqAuthentication } from './features/authentication/basiq.authentication';
import { AirwallexBalances } from './features/balances/airwallex.balances';
import { BasiqBalances } from './features/balances/basiq.balances';
import { BasiqJobs } from './features/jobs/basiq.jobs';
import { BasiqUsers } from './features/users/basiq.users';
import { AirwallexProvider } from './providers/airwallex.provider';
import { IProvider } from './providers/base.provider';
import { BasiqProvider } from './providers/basiq.provider';
import { ProviderInstance } from './providers/provider-instance';
import { IHttpClient } from './shared/interfaces/https-client.interface';
import { AirwallexConfig } from './shared/types/airwallex';
import { BasiqConfig } from './shared/types/basiq';
import {
    StandardAccount,
    StandardBalance,
    StandardJob
} from './shared/types/common';

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

    constructor(
        private readonly airwallexAccounts: AirwallexAccounts,
        private readonly airwallexAuthentication: AirwallexAuthentication,
        private readonly airwallexBalances: AirwallexBalances,
        private readonly basiqAccounts: BasiqAccounts,
        private readonly basiqAuthentication: BasiqAuthentication,
        private readonly basiqBalances: BasiqBalances,
        private readonly basiqJobs: BasiqJobs,
        private readonly basiqUsers: BasiqUsers,
    ) { }

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
        const provider = new AirwallexProvider(
            httpClient,
            config,
            logger,
            authHttpClient,
            this.airwallexAuthentication,
            this.airwallexAccounts,
            this.airwallexBalances,
        );
        this.registerProvider(Providers.AIRWALLEX, provider);
        return new ProviderInstance(provider, logger || this.logger);
    }

    /**
     * Initialize Basiq provider and return a provider-specific instance
     * Usage: const basiq = sdk.useBasiq(httpClient, config, logger, authHttpClient); await basiq.getAccount();
     */
    useBasiq(httpClient: IHttpClient, config: BasiqConfig, logger?: Logger, authHttpClient?: IHttpClient): ProviderInstance {
        const providerLogger = logger || this.logger;
        const provider = new BasiqProvider(
            httpClient,
            config,
            providerLogger,
            authHttpClient,
            this.basiqAuthentication,
            this.basiqAccounts,
            this.basiqBalances,
            this.basiqJobs,
            this.basiqUsers,
        );
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
     * Get account details for a provider (returns array of accounts)
     */
    async getAccount(providerName: Providers): Promise<StandardAccount[]> {
        const provider = this.getProvider(providerName);
        return provider.getAccount();
    }

    /**
     * Get jobs for a provider (Basiq-specific, returns empty array for other providers)
     */
    async getJobs(providerName: Providers, userId?: string, jobId?: string): Promise<StandardJob[]> {
        const provider = this.getProvider(providerName);
        return provider.getJobs(userId, jobId);
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

