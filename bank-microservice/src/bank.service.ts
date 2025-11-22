import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenBankSDK, { AirwallexAuthResponse, IHttpClient, ProviderInstance, StandardAccount, StandardBalance } from 'open-bank-sdk';
import { BankConfig } from './config/bank.config';
import {
    AuthenticationNotSupportedException,
    ProviderNotInitializedException,
    ProviderNotSupportedException,
    ProviderOperationException,
} from './exceptions/provider.exception';
import { TokenService } from './services/token.service';
import { ProviderType, isProviderType } from './types/provider.enum';
import { NestJsHttpAdapter } from './utils/nestjs-http-adapter';
import { TokenInjectingHttpClient } from './utils/token-injecting-http-client';

type ProviderRegistry = Map<ProviderType, ProviderInstance>;

@Injectable()
export class BankService {
    private readonly logger = new Logger(BankService.name);
    private readonly sdk: OpenBankSDK;
    private readonly providers: ProviderRegistry = new Map();
    private readonly initializationPromises: Map<ProviderType, Promise<void>> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly tokenService: TokenService,
        private readonly httpService: HttpService,
    ) {
        this.sdk = new OpenBankSDK();
    }

    private createHttpClient(providerType: ProviderType): IHttpClient {
        const baseClient = new NestJsHttpAdapter(this.httpService);
        return new TokenInjectingHttpClient(
            baseClient,
            providerType,
            this.tokenService,
            providerType === ProviderType.AIRWALLEX
                ? () => this.refreshAuthToken(ProviderType.AIRWALLEX)
                : undefined,
        );
    }

    private createAuthHttpClient(): IHttpClient {
        return new NestJsHttpAdapter(this.httpService);
    }

    /**
     * Initialize Airwallex provider lazily when first requested
     */
    private async initializeAirwallex(): Promise<void> {
        const config = this.configService.get<BankConfig['airwallex']>('bank.airwallex');

        if (!config?.apiKey || !config?.clientId) {
            throw new ProviderNotInitializedException(
                'Airwallex credentials not found. Please configure AIRWALLEX_API_KEY and AIRWALLEX_CLIENT_ID.',
            );
        }

        const httpClient = this.createHttpClient(ProviderType.AIRWALLEX);
        const authHttpClient = this.createAuthHttpClient();

        const nestLogger: any = {
            debug: (message: string, context?: any) => this.logger.debug(message, context),
            log: (message: string, context?: any) => this.logger.log(message, context),
            warn: (message: string, context?: any) => this.logger.warn(message, context),
            error: (message: string, context?: any) => this.logger.error(message, context),
        };

        const provider = this.sdk.useAirwallex(httpClient, {
            apiKey: config.apiKey,
            clientId: config.clientId,
            ...(config.baseUrl && { baseUrl: config.baseUrl }),
        }, nestLogger, authHttpClient);

        this.providers.set(ProviderType.AIRWALLEX, provider);
        this.logger.log('✓ Airwallex provider initialized successfully');
    }


    /**
     * Get a provider instance by type, initializing it lazily if needed
     * @throws ProviderNotSupportedException if provider type is invalid
     * @throws ProviderNotInitializedException if provider cannot be initialized
     */
    private async getProvider(provider: ProviderType): Promise<ProviderInstance> {
        if (!isProviderType(provider)) {
            throw new ProviderNotSupportedException(provider);
        }

        let providerInstance = this.providers.get(provider);
        if (providerInstance) {
            return providerInstance;
        }

        const initPromise = this.initializationPromises.get(provider);
        if (initPromise) {
            await initPromise;
            providerInstance = this.providers.get(provider);
            if (providerInstance) {
                return providerInstance;
            }
        }

        const initializationPromise = this.initializeProvider(provider);
        this.initializationPromises.set(provider, initializationPromise);

        try {
            await initializationPromise;
            providerInstance = this.providers.get(provider);
            if (!providerInstance) {
                throw new ProviderNotInitializedException(provider);
            }
            return providerInstance;
        } catch (error) {
            this.initializationPromises.delete(provider);
            throw error;
        }
    }

    /**
     * Initialize a specific provider based on type
     */
    private async initializeProvider(provider: ProviderType): Promise<void> {
        switch (provider) {
            case ProviderType.AIRWALLEX:
                await this.initializeAirwallex();
                break;
            default:
                throw new ProviderNotSupportedException(provider);
        }
    }

    private async refreshAuthToken(
        provider: ProviderType,
    ): Promise<AirwallexAuthResponse> {
        try {
            this.logger.debug(`Getting provider instance for ${provider} to refresh token...`);
            const providerInstance = await this.getProvider(provider);

            this.logger.debug(`Calling authenticate on provider instance (using authHttpClient, no token injection)...`);
            const result = await providerInstance.authenticate();

            this.logger.debug(`Authenticate completed successfully`);
            return result;
        } catch (error) {
            this.logger.error(
                `Failed to refresh auth token for ${provider}: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Get account details
     */
    async getAccount(
        provider: ProviderType,
    ): Promise<StandardAccount> {
        this.logger.debug(`Getting account for provider: ${provider}`);

        try {
            const providerInstance = await this.getProvider(provider);
            const result = await providerInstance.getAccount();

            this.logger.log(`Successfully retrieved account from ${provider}`);
            return result;
        } catch (error) {
            if (
                error instanceof ProviderNotSupportedException ||
                error instanceof ProviderNotInitializedException
            ) {
                throw error;
            }

            this.logger.error(
                `Failed to get account from ${provider}: ${error.message}`,
                error.stack,
            );
            throw new ProviderOperationException(provider, 'get account', error);
        }
    }

    /**
     * Get balances
     */
    async getBalances(
        provider: ProviderType,
    ): Promise<StandardBalance[]> {
        this.logger.debug(`Getting balances for provider: ${provider}`);

        try {
            const providerInstance = await this.getProvider(provider);
            const result = await providerInstance.getBalances();

            this.logger.log(`Successfully retrieved ${result.length} balances from ${provider}`);
            return result;
        } catch (error) {
            if (
                error instanceof ProviderNotSupportedException ||
                error instanceof ProviderNotInitializedException
            ) {
                throw error;
            }

            this.logger.error(
                `Failed to get balances from ${provider}: ${error.message}`,
                error.stack,
            );
            throw new ProviderOperationException(provider, 'get balances', error);
        }
    }

    /**
     * Authenticate with a provider (currently only Airwallex supports this)
     * This method refreshes and stores the token in the database
     */
    async authenticate(provider: ProviderType): Promise<AirwallexAuthResponse> {
        this.logger.debug(`Authenticating with provider: ${provider}`);

        if (provider !== ProviderType.AIRWALLEX) {
            throw new AuthenticationNotSupportedException(provider);
        }

        try {
            const providerInstance = await this.getProvider(provider);
            this.logger.debug(`Provider instance obtained, calling authenticate directly...`);

            const authResponse = await providerInstance.authenticate();
            this.logger.debug(`Authentication response received`);

            const expiresIn = authResponse.expires_in || 1800;
            const token = (authResponse as any).token || (authResponse as any).access_token;

            if (!token) {
                throw new Error('Token not found in auth response');
            }

            await this.tokenService.storeToken(provider, token, expiresIn);
            this.logger.log(`Successfully authenticated with ${provider} and stored token`);

            return authResponse;
        } catch (error) {
            if (
                error instanceof ProviderNotSupportedException ||
                error instanceof ProviderNotInitializedException ||
                error instanceof AuthenticationNotSupportedException
            ) {
                throw error;
            }

            this.logger.error(
                `Failed to authenticate with ${provider}: ${error.message}`,
                error.stack,
            );
            throw new ProviderOperationException(provider, 'authenticate', error);
        }
    }

    /**
     * Get list of initialized providers
     */
    getInitializedProviders(): ProviderType[] {
        return Array.from(this.providers.keys());
    }
}

