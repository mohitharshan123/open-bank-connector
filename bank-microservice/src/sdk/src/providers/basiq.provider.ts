import { Injectable, Logger } from '@nestjs/common';
import { BasiqAccounts } from '../features/accounts/basiq.accounts';
import { BasiqAuthentication } from '../features/authentication/basiq.authentication';
import { BasiqBalances } from '../features/balances/basiq.balances';
import { BasiqJobs } from '../features/jobs/basiq.jobs';
import { BASIQ_CONSTANTS } from '../shared/constants/basiq.constants';
import type { IHttpClient } from '../shared/interfaces/https-client.interface';
import type { BasiqAuthResponse, BasiqConfig, BasiqCreateUserRequest, BasiqUser } from '../shared/types/basiq';
import { StandardAccount, StandardBalance, StandardJob } from '../shared/types/common';
import { BaseProvider } from './base.provider';

@Injectable()
export class BasiqProvider extends BaseProvider {
    private readonly logger: Logger;
    private readonly authHttpClient: IHttpClient;
    private readonly baseUrl: string;
    private readonly apiKey: string;

    private readonly authentication: BasiqAuthentication;
    private readonly accounts: BasiqAccounts;
    private readonly balances: BasiqBalances;
    private readonly jobs: BasiqJobs;

    constructor(httpClient: IHttpClient, config: BasiqConfig, logger?: Logger, authHttpClient?: IHttpClient) {
        super(httpClient, config);
        this.logger = logger || new Logger(BasiqProvider.name);
        this.authHttpClient = authHttpClient || httpClient;
        this.baseUrl = config.baseUrl || BASIQ_CONSTANTS.BASE_URL;
        this.apiKey = (config.apiKey || '').trim();

        if (!this.apiKey) {
            throw new Error('Basiq apiKey is required');
        }

        this.authentication = new BasiqAuthentication(this.authHttpClient, config, this.logger);
        this.accounts = new BasiqAccounts(this.httpClient, config, this.logger);
        this.balances = new BasiqBalances(this.httpClient, config, this.logger);
        this.jobs = new BasiqJobs(this.httpClient, config, this.logger);
    }

    getProviderName(): string {
        return BASIQ_CONSTANTS.PROVIDER_NAME;
    }

    /**
     * Authenticate with Basiq API to get bearer token
     */
    async authenticate(userId?: string): Promise<BasiqAuthResponse & { userId?: string }> {
        const authResponse = await this.authentication.authenticate(userId);
        const accessToken = authResponse.access_token;

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
    }

    /**
     * Get account details for a Basiq user (returns array of accounts)
     */
    async getAccount(userId: string): Promise<StandardAccount[]> {
        return this.accounts.getAccounts(userId);
    }

    /**
     * Get account balances for a Basiq user
     */
    async getBalances(userId: string): Promise<StandardBalance[]> {
        return this.balances.getBalances(userId);
    }

    /**
     * Get jobs for a Basiq user
     * If jobId is provided, returns that specific job, otherwise returns all jobs for the user
     */
    async getJobs(userId?: string, jobId?: string): Promise<StandardJob[]> {
        return this.jobs.getJobs(userId, jobId);
    }

    /**
     * Create a user using a bearer token directly (used during authentication)
     */
    private async createUserWithToken(userData: BasiqCreateUserRequest, bearerToken: string): Promise<BasiqUser> {
        this.logger.log(`[BasiqProvider] Creating Basiq user with bearer token`, { userData });

        try {
            const response = await this.authHttpClient.post<BasiqUser>(
                BASIQ_CONSTANTS.ENDPOINTS.CREATE_USER,
                {
                    email: userData.email,
                    mobile: userData.mobile,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                },
                {
                    baseURL: this.baseUrl,
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`,
                        'Content-Type': BASIQ_CONSTANTS.HEADERS.CONTENT_TYPE_JSON,
                        [BASIQ_CONSTANTS.HEADERS.VERSION]: BASIQ_CONSTANTS.API_VERSION,
                    },
                }
            );

            const user = response.data;
            this.logger.log(`[BasiqProvider] Basiq user created successfully`, { userId: user.id });
            return user;
        } catch (error: any) {
            this.logger.error(`[BasiqProvider] Failed to create Basiq user (createUserWithToken)`, {
                error: error.message,
                status: error.response?.status,
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
