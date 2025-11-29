import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { IHttpClient, ProviderInstance, OpenBankSDK, AirwallexAuthResponse } from '../sdk';
import { TokenService } from '../services/token.service';
import { ProviderType } from '../types/provider.enum';
import { ProviderNotInitializedException } from '../exceptions/provider.exception';
import { NestJsHttpAdapter } from '../utils/nestjs-http-adapter';
import { TokenInjectingHttpClient } from '../utils/token-injecting-http-client';

/**
 * Base strategy class with common initialization and HTTP client management
 */
@Injectable()
export abstract class BaseStrategy {
    protected readonly logger: Logger;
    protected providerInstances: Map<string, ProviderInstance> = new Map();
    private initializationPromises: Map<string, Promise<void>> = new Map();

    constructor(
        protected readonly configService: ConfigService,
        protected readonly tokenService: TokenService,
        protected readonly httpService: HttpService,
        protected readonly sdk: OpenBankSDK,
        loggerName: string,
    ) {
        this.logger = new Logger(loggerName);
    }

    /**
     * Get the provider type this strategy handles
     */
    abstract getProviderType(): ProviderType;

    /**
     * Initialize the provider instance
     */
    protected abstract doInitialize(companyId: string): Promise<void>;

    /**
     * Create HTTP client with token injection
     */
    protected createHttpClient(companyId: string): IHttpClient {
        const baseClient = new NestJsHttpAdapter(this.httpService);
        return new TokenInjectingHttpClient(
            baseClient,
            this.getProviderType(),
            this.tokenService,
            companyId,
            () => this.refreshAuthToken(companyId),
        );
    }

    /**
     * Create HTTP client without token injection (for auth requests)
     */
    protected createAuthHttpClient(): IHttpClient {
        return new NestJsHttpAdapter(this.httpService);
    }


    /**
     * Get provider instance, initializing if necessary
     */
    protected async getProvider(companyId: string): Promise<ProviderInstance> {
        await this.initialize(companyId);
        const instance = this.providerInstances.get(companyId);
        if (!instance) {
            throw new ProviderNotInitializedException(this.getProviderType());
        }
        return instance;
    }

    /**
     * Initialize provider instance (with promise caching to prevent concurrent initialization)
     */
    protected async initialize(companyId: string): Promise<void> {
        if (this.providerInstances.has(companyId)) {
            return;
        }

        const existingPromise = this.initializationPromises.get(companyId);
        if (existingPromise) {
            await existingPromise;
            return;
        }

        const initPromise = this.doInitialize(companyId);
        this.initializationPromises.set(companyId, initPromise);
        try {
            await initPromise;
        } finally {
            this.initializationPromises.delete(companyId);
        }
    }

    /**
     * Refresh authentication token
     */
    protected async refreshAuthToken(companyId: string): Promise<AirwallexAuthResponse> {
        try {
            const providerInstance = await this.getProvider(companyId);
            const result = await providerInstance.authenticate();
            return result;
        } catch (error) {
            this.logger.error(
                `Failed to refresh auth token for ${this.getProviderType()} (company: ${companyId}): ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }
}

