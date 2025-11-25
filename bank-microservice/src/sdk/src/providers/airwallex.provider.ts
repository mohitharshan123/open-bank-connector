import { Injectable, Logger } from '@nestjs/common';
import { AIRWALLEX_CONSTANTS } from '../constants/airwallex.constants';
import type { IHttpClient } from '../interfaces/https-client.interface';
import { AirwallexTransformer } from '../transformers/airwallex.transformer';
import type { AirwallexAccount, AirwallexAccountBalance, AirwallexAuthResponse, AirwallexConfig } from '../types/airwallex';
import { StandardAccount, StandardBalance } from '../types/common';
import { BaseProvider } from './base.provider';

@Injectable()
export class AirwallexProvider extends BaseProvider {
    private readonly logger: Logger;
    private readonly authHttpClient: IHttpClient;
    private readonly transformer: AirwallexTransformer;
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly clientId: string;

    constructor(httpClient: IHttpClient, config: AirwallexConfig, logger?: Logger, authHttpClient?: IHttpClient) {
        super(httpClient, config);
        this.logger = logger || new Logger(AirwallexProvider.name);
        this.authHttpClient = authHttpClient || httpClient;
        this.transformer = new AirwallexTransformer();
        this.baseUrl = config.baseUrl || AIRWALLEX_CONSTANTS.BASE_URL;
        this.apiKey = config.apiKey;
        this.clientId = config.clientId;

        if (!this.apiKey || !this.clientId) {
            throw new Error('Airwallex apiKey and clientId are required');
        }
    }

    getProviderName(): string {
        return AIRWALLEX_CONSTANTS.PROVIDER_NAME;
    }

    /**
     * Authenticate with Airwallex API to get bearer token
     */
    async authenticate(): Promise<AirwallexAuthResponse> {
        this.logger.log('[AirwallexProvider] Starting authentication');

        try {
            this.logger.debug(`[AirwallexProvider] Making authentication request to ${this.baseUrl}${AIRWALLEX_CONSTANTS.ENDPOINTS.AUTHENTICATE}`);

            const response = await this.authHttpClient.post<AirwallexAuthResponse>(
                AIRWALLEX_CONSTANTS.ENDPOINTS.AUTHENTICATE,
                {},
                {
                    baseURL: this.baseUrl,
                    headers: {
                        'Content-Type': AIRWALLEX_CONSTANTS.HEADERS.CONTENT_TYPE,
                        [AIRWALLEX_CONSTANTS.HEADERS.API_KEY]: this.apiKey,
                        [AIRWALLEX_CONSTANTS.HEADERS.CLIENT_ID]: this.clientId,
                    },
                }
            );

            this.logger.log('[AirwallexProvider] Authentication successful', {
                hasAccessToken: !!response.data?.access_token,
            });

            return response.data;
        } catch (error: any) {
            this.logger.error(`[AirwallexProvider] Authentication failed`, {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
            });
            throw new Error(`Airwallex authentication failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Get account details
     */
    async getAccount(): Promise<StandardAccount> {
        this.logger.debug(`[AirwallexProvider] Getting account`);

        try {
            const response = await this.request<AirwallexAccount>('GET', AIRWALLEX_CONSTANTS.ENDPOINTS.GET_ACCOUNT, {
                baseURL: this.baseUrl,
            });

            return this.transformer.transformAccount(response);
        } catch (error: any) {
            this.logger.error(`[AirwallexProvider] Failed to get account`, {
                error: error.message,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Failed to get Airwallex account: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Get account balances
     */
    async getBalances(): Promise<StandardBalance[]> {
        this.logger.debug(`[AirwallexProvider] Getting balances`);

        try {
            const response = await this.request<AirwallexAccountBalance[]>('GET', AIRWALLEX_CONSTANTS.ENDPOINTS.GET_BALANCES, {
                baseURL: this.baseUrl,
            });

            // Handle different response formats
            const balancesData = Array.isArray(response) ? response : (response as any).data || [];
            return this.transformer.transformBalances(balancesData);
        } catch (error: any) {
            this.logger.error(`[AirwallexProvider] Failed to get balances`, {
                error: error.message,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Failed to get Airwallex balances: ${error.message || 'Unknown error'}`);
        }
    }
}
