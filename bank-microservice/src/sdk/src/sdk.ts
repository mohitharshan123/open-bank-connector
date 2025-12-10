import { Injectable, Logger } from '@nestjs/common';
import { AirwallexAccounts } from './features/accounts/airwallex.accounts';
import { FiskilAccounts } from './features/accounts/fiskil.accounts';
import { AirwallexAuthentication } from './features/authentication/airwallex.authentication';
import { FiskilAuthentication } from './features/authentication/fiskil.authentication';
import { AirwallexBalances } from './features/balances/airwallex.balances';
import { FiskilBalances } from './features/balances/fiskil.balances';
import { FiskilTransactions } from './features/transactions/fiskil.transactions';
import { FiskilUsers } from './features/users/fiskil.users';
import { AirwallexProvider } from './providers/airwallex.provider';
import { IProvider } from './providers/base.provider';
import { FiskilProvider } from './providers/fiskil.provider';
import { ProviderInstance } from './providers/provider-instance';
import { IHttpClient } from './shared/interfaces/https-client.interface';
import { AirwallexConfig } from './shared/types/airwallex';
import {
    StandardAccount,
    StandardBalance
} from './shared/types/common';
import { FiskilConfig } from './shared/types/fiskil';

/**
 * Configuration for initializing a provider
 */
export type ProviderConfig = AirwallexConfig | FiskilConfig;

export enum Providers {
    AIRWALLEX = 'airwallex',
    FISKIL = 'fiskil',
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
        private readonly fiskilAccounts: FiskilAccounts,
        private readonly fiskilBalances: FiskilBalances,
        private readonly fiskilAuthentication: FiskilAuthentication,
        private readonly fiskilUsers: FiskilUsers,
        private readonly fiskilTransactions: FiskilTransactions,
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
     * Initialize Fiskil provider and return a provider-specific instance
     * Usage: const fiskil = sdk.useFiskil(httpClient, config, logger, authHttpClient); await fiskil.authenticate();
     */
    useFiskil(httpClient: IHttpClient, config: FiskilConfig, logger?: Logger, authHttpClient?: IHttpClient): ProviderInstance {
        const provider = new FiskilProvider(
            httpClient,
            config,
            logger,
            authHttpClient,
            this.fiskilAuthentication,
            this.fiskilUsers,
            this.fiskilAccounts,
            this.fiskilBalances,
            this.fiskilTransactions,
        );
        this.registerProvider(Providers.FISKIL, provider);
        return new ProviderInstance(provider, logger || this.logger);
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

