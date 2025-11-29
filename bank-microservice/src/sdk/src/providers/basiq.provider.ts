import { Injectable, Logger } from '@nestjs/common';
import { BasiqAccounts } from '../features/accounts/basiq.accounts';
import { BasiqAuthentication } from '../features/authentication/basiq.authentication';
import { BasiqBalances } from '../features/balances/basiq.balances';
import { BasiqJobs } from '../features/jobs/basiq.jobs';
import { BasiqUsers } from '../features/users/basiq.users';
import { BASIQ_CONSTANTS } from '../shared/constants/basiq.constants';
import type { IHttpClient } from '../shared/interfaces/https-client.interface';
import type { BasiqAuthResponse, BasiqConfig } from '../shared/types/basiq';
import { StandardAccount, StandardBalance, StandardJob } from '../shared/types/common';
import { BaseProvider } from './base.provider';

@Injectable()
export class BasiqProvider extends BaseProvider {
    private readonly logger: Logger;
    private readonly authHttpClient: IHttpClient;
    protected readonly config: BasiqConfig;
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor(
        httpClient: IHttpClient,
        config: BasiqConfig,
        logger?: Logger,
        authHttpClient?: IHttpClient,
        private readonly basiqAuthentication?: BasiqAuthentication,
        private readonly basiqAccounts?: BasiqAccounts,
        private readonly basiqBalances?: BasiqBalances,
        private readonly basiqJobs?: BasiqJobs,
        private readonly basiqUsers?: BasiqUsers,
    ) {
        super(httpClient, config);
        this.logger = logger || new Logger(BasiqProvider.name);
        this.authHttpClient = authHttpClient || httpClient;
        this.config = config;
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
        if (!this.basiqAuthentication) {
            throw new Error('BasiqAuthentication service not injected');
        }
        const authResponse = await this.basiqAuthentication.authenticate(this.authHttpClient, this.config, userId);
        const accessToken = authResponse.access_token;

        if (!userId) {
            if (!this.basiqUsers) {
                throw new Error('BasiqUsers service not injected');
            }
            this.logger.log('[BasiqProvider] No userId provided, creating user...');
            const user = await this.basiqUsers.createUser(
                this.authHttpClient,
                this.config,
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
        if (!this.basiqAccounts) {
            throw new Error('BasiqAccounts service not injected');
        }
        return this.basiqAccounts.getAccounts(this.httpClient, this.config, userId);
    }

    /**
     * Get account balances for a Basiq user
     */
    async getBalances(userId: string): Promise<StandardBalance[]> {
        if (!this.basiqBalances) {
            throw new Error('BasiqBalances service not injected');
        }
        return this.basiqBalances.getBalances(this.httpClient, this.config, userId);
    }

    /**
     * Get jobs for a Basiq user
     * If jobId is provided, returns that specific job, otherwise returns all jobs for the user
     */
    async getJobs(userId?: string, jobId?: string): Promise<StandardJob[]> {
        if (!this.basiqJobs) {
            throw new Error('BasiqJobs service not injected');
        }
        return this.basiqJobs.getJobs(this.httpClient, this.config, userId, jobId);
    }
}
