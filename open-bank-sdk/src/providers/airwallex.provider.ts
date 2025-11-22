import { PROVIDER_BASE_URLS } from '../constants';
import { IHttpClient } from '../interfaces/https-client.interface';
import { ConsoleLogger, ILogger } from '../interfaces/logger.interface';
import { AirwallexTransformer } from '../transformers/airwallex.transformer';
import { AirwallexAccount, AirwallexAccountBalance, AirwallexAuthResponse, AirwallexConfig } from '../types/airwallex';
import {
    StandardAccount,
    StandardBalance,
} from '../types/common';
import { BaseProvider } from './base.provider';

export class AirwallexProvider extends BaseProvider {
    private transformer: AirwallexTransformer;
    private authHttpClient: IHttpClient;
    private baseURL: string;
    private logger: ILogger;

    constructor(httpClient: IHttpClient, config: AirwallexConfig, logger?: ILogger, authHttpClient?: IHttpClient) {
        super(httpClient, config);
        this.baseURL = config.baseUrl || PROVIDER_BASE_URLS.AIRWALLEX;
        this.authHttpClient = authHttpClient || httpClient;
        this.transformer = new AirwallexTransformer();
        this.logger = logger || new ConsoleLogger();
    }

    getProviderName(): string {
        return 'airwallex';
    }

    /**
     * Authenticate with Airwallex API and obtain an access token
     * Token is valid for 30 minutes (1800 seconds)
     * This method can be called by the NestJS microservice to get the token,
     * which will then be passed in headers for subsequent API requests
     */
    async authenticate(): Promise<AirwallexAuthResponse> {
        const authUrl = `${this.baseURL}/api/v1/authentication/login`;
        this.logger.debug(`Starting authentication request to ${authUrl}`, {
            baseURL: this.baseURL,
            hasApiKey: !!this.config.apiKey,
            hasClientId: !!this.config.clientId,
            clientId: this.config.clientId,
        });

        try {
            this.logger.debug(`Making POST request to /api/v1/authentication/login`);
            const response = await this.authHttpClient.post<AirwallexAuthResponse>(
                '/api/v1/authentication/login',
                undefined,
                {
                    baseURL: this.baseURL,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.config.apiKey,
                        'x-client-id': this.config.clientId,
                    },
                }
            );

            this.logger.log(`Authentication successful`, {
                hasAccessToken: !!(response.data as any)?.access_token || !!(response.data as any)?.token,
                expiresIn: (response.data as any)?.expires_in,
            });

            return response.data;
        } catch (error: any) {
            this.logger.error(`Authentication failed`, {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
            });
            throw new Error(
                `Airwallex authentication failed: ${error.message || 'Unknown error'}`
            );
        }
    }

    async getAccount(): Promise<StandardAccount> {
        const accountResponse = await this.request<any>('GET', `${this.baseURL}/api/v1/account`);
        const account = accountResponse as AirwallexAccount;
        return this.transformer.transformAccount(account);
    }

    async getBalances(): Promise<StandardBalance[]> {
        const response = await this.request<any>('GET', `${this.baseURL}/api/v1/balances/current`);
        const balances: AirwallexAccountBalance[] = Array.isArray(response) ? response : (response.data || []);
        return this.transformer.transformBalances(balances);
    }
}

