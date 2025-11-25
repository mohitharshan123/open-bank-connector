import { Injectable, Logger } from '@nestjs/common';
import { BASIQ_CONSTANTS } from '../constants/basiq.constants';
import type { IHttpClient } from '../interfaces/https-client.interface';
import { BasiqTransformer } from '../transformers/basiq.transformer';
import type { BasiqAccount, BasiqAuthResponse, BasiqBalance, BasiqConfig, BasiqCreateUserRequest, BasiqUser } from '../types/basiq';
import { StandardAccount, StandardBalance } from '../types/common';
import { BaseProvider } from './base.provider';

@Injectable()
export class BasiqProvider extends BaseProvider {
    private readonly logger: Logger;
    private readonly authHttpClient: IHttpClient;
    private readonly transformer: BasiqTransformer;
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor(httpClient: IHttpClient, config: BasiqConfig, logger?: Logger, authHttpClient?: IHttpClient) {
        super(httpClient, config);
        this.logger = logger || new Logger(BasiqProvider.name);
        this.authHttpClient = authHttpClient || httpClient;
        this.transformer = new BasiqTransformer(this.logger);
        this.baseUrl = config.baseUrl || BASIQ_CONSTANTS.BASE_URL;
        this.apiKey = (config.apiKey || '').trim();

        if (!this.apiKey) {
            throw new Error('Basiq apiKey is required');
        }
    }

    getProviderName(): string {
        return BASIQ_CONSTANTS.PROVIDER_NAME;
    }

    /**
     * Authenticate with Basiq API to get bearer token
     */
    async authenticate(userId?: string): Promise<BasiqAuthResponse & { userId?: string }> {
        this.logger.log('[BasiqProvider] Starting authentication', { userId });

        try {
            // Build form data for authentication
            const formData = new URLSearchParams();
            formData.append('scope', BASIQ_CONSTANTS.SCOPES.SERVER_ACCESS);
            if (userId) {
                formData.append('userId', userId);
            }

            // Build auth headers
            const authHeader = `Basic ${this.apiKey}`;

            this.logger.debug(`[BasiqProvider] Making authentication request to ${this.baseUrl}${BASIQ_CONSTANTS.ENDPOINTS.AUTHENTICATE}`);

            const response = await this.authHttpClient.post<BasiqAuthResponse>(
                BASIQ_CONSTANTS.ENDPOINTS.AUTHENTICATE,
                formData.toString(),
                {
                    baseURL: this.baseUrl,
                    headers: {
                        'Content-Type': BASIQ_CONSTANTS.HEADERS.CONTENT_TYPE_FORM,
                        'Authorization': authHeader,
                        [BASIQ_CONSTANTS.HEADERS.VERSION]: BASIQ_CONSTANTS.API_VERSION,
                    },
                }
            );

            const authResponse = response.data;
            const accessToken = authResponse.access_token;

            if (!accessToken) {
                throw new Error('Access token not found in authentication response');
            }

            this.logger.log('[BasiqProvider] Authentication successful, got token');

            if (!userId) {
                this.logger.log('[BasiqProvider] No userId provided, creating user...');
                const user = await this.createUserWithToken(
                    {
                        email: `user-${Date.now()}@example.com`,
                        firstName: 'User',
                        lastName: `${Date.now()}`,
                    },
                    accessToken
                );
                userId = user.id;
                this.logger.log('[BasiqProvider] User created', { userId });
            }

            return {
                ...authResponse,
                userId,
            };
        } catch (error: any) {
            this.logger.error(`[BasiqProvider] Authentication failed`, {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
            });
            throw new Error(`Basiq authentication failed: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Get account details for a Basiq user
     */
    async getAccount(userId: string): Promise<StandardAccount> {
        if (!userId) {
            throw new Error('Basiq userId is required to get account');
        }

        this.logger.debug(`[BasiqProvider] Getting account for userId: ${userId}`);

        try {
            const endpoint = BASIQ_CONSTANTS.ENDPOINTS.GET_ACCOUNT(userId);
            const response = await this.request<BasiqAccount>('GET', endpoint, {
                baseURL: this.baseUrl,
            });

            return this.transformer.transformAccount(response);
        } catch (error: any) {
            this.logger.error(`[BasiqProvider] Failed to get account`, {
                error: error.message,
                userId,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Failed to get Basiq account: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Get account balances for a Basiq user
     */
    async getBalances(userId: string): Promise<StandardBalance[]> {
        if (!userId) {
            throw new Error('Basiq userId is required to get balances');
        }

        this.logger.debug(`[BasiqProvider] Getting balances for userId: ${userId}`);

        try {
            const endpoint = BASIQ_CONSTANTS.ENDPOINTS.GET_BALANCES(userId);
            const response = await this.request<BasiqBalance[]>('GET', endpoint, {
                baseURL: this.baseUrl,
            });

            const balancesData = Array.isArray(response) ? response : (response as any).data || [];
            return this.transformer.transformBalances(balancesData);
        } catch (error: any) {
            this.logger.error(`[BasiqProvider] Failed to get balances`, {
                error: error.message,
                userId,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Failed to get Basiq balances: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Create a user using a bearer token directly (used during authentication)
     */
    private async createUserWithToken(userData: BasiqCreateUserRequest, bearerToken: string): Promise<BasiqUser> {
        this.logger.log(`[BasiqProvider] Creating Basiq user with bearer token`, { userData });

        try {
            this.logger.debug(`[BasiqProvider] Making POST request to ${this.baseUrl}${BASIQ_CONSTANTS.ENDPOINTS.CREATE_USER}`, {
                data: userData,
            });

            const response = await this.authHttpClient.post<BasiqUser>(
                BASIQ_CONSTANTS.ENDPOINTS.CREATE_USER,
                userData,
                {
                    baseURL: this.baseUrl,
                    headers: {
                        'Content-Type': BASIQ_CONSTANTS.HEADERS.CONTENT_TYPE_JSON,
                        'Authorization': `Bearer ${bearerToken}`,
                        [BASIQ_CONSTANTS.HEADERS.VERSION]: BASIQ_CONSTANTS.API_VERSION,
                    },
                }
            );

            this.logger.log(`[BasiqProvider] Basiq user created successfully`, { userId: response.data.id });
            return response.data;
        } catch (error: any) {
            this.logger.error(`[BasiqProvider] Failed to create Basiq user (createUserWithToken)`, {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                requestData: userData,
            });
            if (error.response?.data) {
                this.logger.error(`[BasiqProvider] Basiq API error response:`, JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    /**
     * Create a Basiq user
     * Required before connecting accounts
     * Note: This should be called AFTER authenticate() to get a bearer token
     * The bearer token will be injected by TokenInjectingHttpClient
     */
    async createUser(userData: BasiqCreateUserRequest): Promise<BasiqUser> {
        this.logger.log(`[BasiqProvider] Creating Basiq user`, { userData });

        try {
            this.logger.debug(`[BasiqProvider] Making POST request to ${this.baseUrl}${BASIQ_CONSTANTS.ENDPOINTS.CREATE_USER}`, {
                data: userData,
            });

            // Use httpClient (not authHttpClient) so TokenInjectingHttpClient can inject bearer token
            const response = await this.httpClient.post<BasiqUser>(
                BASIQ_CONSTANTS.ENDPOINTS.CREATE_USER,
                userData,
                {
                    baseURL: this.baseUrl,
                    headers: {
                        'Content-Type': BASIQ_CONSTANTS.HEADERS.CONTENT_TYPE_JSON,
                        [BASIQ_CONSTANTS.HEADERS.VERSION]: BASIQ_CONSTANTS.API_VERSION,
                    },
                }
            );

            this.logger.log(`[BasiqProvider] Basiq user created successfully`, { userId: response.data.id });
            return response.data;
        } catch (error: any) {
            this.logger.error(`[BasiqProvider] Failed to create Basiq user (createUser)`, {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                requestData: userData,
            });
            if (error.response?.data) {
                this.logger.error(`[BasiqProvider] Basiq API error response:`, JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }
}
