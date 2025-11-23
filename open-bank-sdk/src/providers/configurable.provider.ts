import { IHttpClient } from '../interfaces/https-client.interface';
import { ConsoleLogger, ILogger } from '../interfaces/logger.interface';
import { StandardAccount, StandardBalance } from '../types/common';
import { ProviderEndpointConfig } from '../types/provider-config';
import { BaseProvider } from './base.provider';

/**
 * Configurable provider that uses endpoint configuration
 * This makes it easy to create new providers by just providing a config object
 */
export class ConfigurableProvider<
    TProviderAccount = any,
    TProviderBalance = any,
    TProviderConfig = any,
    TAuthResponse = any
> extends BaseProvider {
    protected endpointConfig: ProviderEndpointConfig<TProviderAccount, TProviderBalance, TProviderConfig, TAuthResponse>;
    protected authHttpClient: IHttpClient;
    protected logger: ILogger;

    constructor(
        httpClient: IHttpClient,
        config: TProviderConfig,
        endpointConfig: ProviderEndpointConfig<TProviderAccount, TProviderBalance, TProviderConfig, TAuthResponse>,
        logger?: ILogger,
        authHttpClient?: IHttpClient
    ) {
        super(httpClient, config);
        this.endpointConfig = endpointConfig;
        this.authHttpClient = authHttpClient || httpClient;
        this.logger = logger || new ConsoleLogger();
    }

    getProviderName(): string {
        return this.endpointConfig.providerName;
    }

    /**
     * Authenticate with the provider API
     */
    async authenticate(): Promise<TAuthResponse> {
        const authUrl = `${this.endpointConfig.baseUrl}${this.endpointConfig.endpoints.authenticate}`;
        this.logger.debug(`Starting authentication request to ${authUrl}`, {
            baseURL: this.endpointConfig.baseUrl,
            provider: this.endpointConfig.providerName,
        });

        try {
            const headers = this.endpointConfig.buildAuthHeaders(this.config);
            const response = await this.authHttpClient.post<TAuthResponse>(
                this.endpointConfig.endpoints.authenticate,
                undefined,
                {
                    baseURL: this.endpointConfig.baseUrl,
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers,
                    },
                }
            );

            this.logger.log(`Authentication successful`, {
                provider: this.endpointConfig.providerName,
                hasAccessToken: !!(response.data as any)?.access_token || !!(response.data as any)?.token,
            });

            return response.data;
        } catch (error: any) {
            this.logger.error(`Authentication failed`, {
                provider: this.endpointConfig.providerName,
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
            });
            throw new Error(
                `${this.endpointConfig.providerName} authentication failed: ${error.message || 'Unknown error'}`
            );
        }
    }

    /**
     * Get account details
     */
    async getAccount(): Promise<StandardAccount> {
        const accountUrl = `${this.endpointConfig.baseUrl}${this.endpointConfig.endpoints.getAccount}`;
        const response = await this.request<any>('GET', accountUrl);

        const accountData = this.endpointConfig.parseAccountResponse
            ? this.endpointConfig.parseAccountResponse(response)
            : (response as TProviderAccount);

        return this.endpointConfig.transformer.transformAccount(accountData);
    }

    /**
     * Get account balances
     */
    async getBalances(): Promise<StandardBalance[]> {
        const balancesUrl = `${this.endpointConfig.baseUrl}${this.endpointConfig.endpoints.getBalances}`;
        const response = await this.request<any>('GET', balancesUrl);

        const balancesData = this.endpointConfig.parseBalancesResponse
            ? this.endpointConfig.parseBalancesResponse(response)
            : Array.isArray(response) ? response : (response.data || []);

        return this.endpointConfig.transformer.transformBalances(balancesData as TProviderBalance[]);
    }
}

