import { Injectable, Logger } from '@nestjs/common';
import { FiskilAccounts } from '../features/accounts/fiskil.accounts';
import { FiskilAuthentication } from '../features/authentication/fiskil.authentication';
import { FiskilBalances } from '../features/balances/fiskil.balances';
import { FiskilTransactions } from '../features/transactions/fiskil.transactions';
import { FiskilUsers } from '../features/users/fiskil.users';
import type { IHttpClient } from '../shared/interfaces/https-client.interface';
import { StandardAccount, StandardBalance, StandardTransaction } from '../shared/types/common';
import type { FiskilAuthResponse, FiskilConfig, FiskilCreateUserRequest, FiskilCreateUserResponse } from '../shared/types/fiskil';
import { BaseProvider } from './base.provider';

@Injectable()
export class FiskilProvider extends BaseProvider {
    private readonly logger: Logger;
    private readonly authHttpClient: IHttpClient;
    protected readonly config: FiskilConfig;

    constructor(
        httpClient: IHttpClient,
        config: FiskilConfig,
        logger?: Logger,
        authHttpClient?: IHttpClient,
        private readonly fiskilAuthentication?: FiskilAuthentication,
        private readonly fiskilUsers?: FiskilUsers,
        private readonly fiskilAccounts?: FiskilAccounts,
        private readonly fiskilBalances?: FiskilBalances,
        private readonly fiskilTransactions?: FiskilTransactions,
    ) {
        super(httpClient, config);
        this.logger = logger || new Logger(FiskilProvider.name);
        this.authHttpClient = authHttpClient || httpClient;
        this.config = config;

        if (!config.clientId || !config.clientSecret) {
            throw new Error('Fiskil clientId and clientSecret are required');
        }
    }

    getProviderName(): string {
        return 'fiskil';
    }

    /**
     * Authenticate with Fiskil API to get bearer token
     */
    async authenticate(userId?: string): Promise<FiskilAuthResponse> {
        if (!this.fiskilAuthentication) {
            throw new Error('FiskilAuthentication service not injected');
        }
        return this.fiskilAuthentication.authenticate(this.authHttpClient, this.config);
    }

    /**
     * Create a user in Fiskil
     */
    async createUser(userData: FiskilCreateUserRequest): Promise<FiskilCreateUserResponse> {
        if (!this.fiskilUsers) {
            throw new Error('FiskilUsers service not injected');
        }
        return this.fiskilUsers.createUser(this.httpClient, this.config, userData);
    }

    /**
     * Get account details
     * @param endUserId - The end user ID (required by Fiskil API)
     */
    async getAccount(endUserId?: string): Promise<StandardAccount[]> {
        if (!this.fiskilAccounts) {
            throw new Error('FiskilAccounts service not injected');
        }
        if (!endUserId) {
            throw new Error('end_user_id is required for Fiskil getAccount');
        }
        return this.fiskilAccounts.getAccounts(this.httpClient, this.config, endUserId);
    }

    /**
     * Get account balances
     * @param endUserId - The end user ID (required by Fiskil API)
     * @param accountId - Optional account ID to filter balances
     */
    async getBalances(endUserId?: string, accountId?: string): Promise<StandardBalance[]> {
        if (!this.fiskilBalances) {
            throw new Error('FiskilBalances service not injected');
        }
        if (!endUserId) {
            throw new Error('end_user_id is required for Fiskil getBalances');
        }
        return this.fiskilBalances.getBalances(this.httpClient, this.config, endUserId, accountId);
    }

    /**
     * Get transactions for an end user
     * @param endUserId - The end user ID (required by Fiskil API)
     * @param accountId - Optional account ID to filter transactions
     */
    async getTransactions(
        endUserId?: string,
        accountId?: string,
        from?: string,
        to?: string,
        status?: 'PENDING' | 'POSTED',
    ): Promise<{ transactions: StandardTransaction[]; links?: { next?: string; prev?: string } }> {
        if (!this.fiskilTransactions) {
            throw new Error('FiskilTransactions service not injected');
        }
        if (!endUserId) {
            throw new Error('end_user_id is required for Fiskil getTransactions');
        }
        return this.fiskilTransactions.getTransactions(
            this.httpClient,
            this.config,
            endUserId,
            accountId,
            from,
            to,
            status,
        );
    }
}

