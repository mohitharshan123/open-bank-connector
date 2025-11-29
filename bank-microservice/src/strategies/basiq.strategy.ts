import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BankConfig } from '../config/bank.config';
import { ProviderNotInitializedException } from '../exceptions/provider.exception';
import {
    AirwallexAuthResponse,
    BasiqCreateUserRequest,
    BasiqUser,
    OpenBankSDK,
    StandardAccount,
    StandardBalance,
    StandardJob,
} from '../sdk';
import { TokenService } from '../services/token.service';
import { ProviderType } from '../types/provider.enum';
import { BaseStrategy } from './base.strategy';
import { BasiqAccounts } from './features/accounts/basiq.accounts';
import { BasiqAuthentication } from './features/authentication/basiq.authentication';
import { BasiqBalances } from './features/balances/basiq.balances';
import { BasiqJobs } from './features/jobs/basiq.jobs';
import { BasiqOAuth } from './oauth/basiq.oauth';
import { IProviderStrategy } from './provider-strategy.interface';
import { isBasiqToken } from '../schemas/token.schema';

@Injectable()
export class BasiqStrategy extends BaseStrategy implements IProviderStrategy {
    private oauthInstances: Map<string, BasiqOAuth> = new Map();
    private authenticationInstances: Map<string, BasiqAuthentication> = new Map();
    private accountsInstances: Map<string, BasiqAccounts> = new Map();
    private balancesInstances: Map<string, BasiqBalances> = new Map();
    private jobsInstances: Map<string, BasiqJobs> = new Map();

    constructor(
        configService: ConfigService,
        tokenService: TokenService,
        httpService: HttpService,
        sdk: OpenBankSDK,
    ) {
        super(configService, tokenService, httpService, sdk, BasiqStrategy.name);
    }

    getProviderType(): ProviderType {
        return ProviderType.BASIQ;
    }

    protected async doInitialize(companyId: string): Promise<void> {
        const config = this.configService.get<BankConfig['basiq']>('bank.basiq');

        if (!config?.apiKey) {
            throw new ProviderNotInitializedException(
                'Basiq credentials not found. Please configure BASIQ_API_KEY.',
            );
        }

        const httpClient = this.createHttpClient(companyId);
        const authHttpClient = this.createAuthHttpClient();

        const providerInstance = this.sdk.useBasiq(
            httpClient,
            {
                apiKey: config.apiKey,
                ...(config.baseUrl && { baseUrl: config.baseUrl }),
            },
            this.logger,
            authHttpClient,
        );

        this.providerInstances.set(companyId, providerInstance);

        const oauth = new BasiqOAuth(authHttpClient, config, this.logger);
        const authentication = new BasiqAuthentication(
            providerInstance,
            this.tokenService,
            oauth,
            companyId,
            this.logger,
        );
        const accounts = new BasiqAccounts(providerInstance, this.tokenService, companyId, this.logger);
        const balances = new BasiqBalances(providerInstance, this.tokenService, companyId, this.logger);
        const jobs = new BasiqJobs(providerInstance, this.tokenService, companyId, this.logger);

        this.oauthInstances.set(companyId, oauth);
        this.authenticationInstances.set(companyId, authentication);
        this.accountsInstances.set(companyId, accounts);
        this.balancesInstances.set(companyId, balances);
        this.jobsInstances.set(companyId, jobs);

        this.logger.log(`✓ Basiq provider initialized successfully for company: ${companyId}`);
    }

    async authenticate(companyId: string, userId?: string, oauthCode?: string): Promise<AirwallexAuthResponse & { redirectUrl?: string }> {
        await this.initialize(companyId);
        const authentication = this.authenticationInstances.get(companyId);
        if (!authentication) {
            throw new ProviderNotInitializedException(ProviderType.BASIQ);
        }
        return authentication.authenticate(userId);
    }

    async getAccount(companyId: string): Promise<StandardAccount[]> {
        await this.initialize(companyId);
        const accounts = this.accountsInstances.get(companyId);
        if (!accounts) {
            throw new ProviderNotInitializedException(ProviderType.BASIQ);
        }
        return accounts.getAccounts();
    }

    async getBalances(companyId: string): Promise<StandardBalance[]> {
        await this.initialize(companyId);
        const balances = this.balancesInstances.get(companyId);
        if (!balances) {
            throw new ProviderNotInitializedException(ProviderType.BASIQ);
        }
        return balances.getBalances();
    }

    async getJobs(companyId: string, jobId?: string): Promise<StandardJob[]> {
        await this.initialize(companyId);
        const jobs = this.jobsInstances.get(companyId);
        if (!jobs) {
            throw new ProviderNotInitializedException(ProviderType.BASIQ);
        }
        return jobs.getJobs(jobId);
    }

    async getOAuthRedirectUrl(
        companyId: string,
        userId?: string,
        action: string = 'connect',
        state?: string,
    ): Promise<{ redirectUrl: string; userId?: string; state?: string; codeVerifier?: string }> {
        await this.initialize(companyId);
        const oauth = this.oauthInstances.get(companyId);
        if (!oauth) {
            throw new ProviderNotInitializedException(ProviderType.BASIQ);
        }

        this.logger.log('[BasiqStrategy] Authenticating to get bearer token...');

        let tokenDoc = await this.tokenService.getActiveToken(ProviderType.BASIQ, companyId);
        if (!tokenDoc?.token) {
            await this.authenticate(companyId);
            tokenDoc = await this.tokenService.getActiveToken(ProviderType.BASIQ, companyId);
            if (!tokenDoc?.token) {
                throw new Error('Failed to get Basiq token for OAuth redirect');
            }
        }

        if (!userId) {
            this.logger.log('[BasiqStrategy] Creating user...');
            const user = await this.createUser(companyId, {
                email: `user-${Date.now()}@example.com`,
            });
            userId = user.id;
            this.logger.log(`[BasiqStrategy] Created user ${userId} for OAuth`);
        }

        const { redirectUrl } = await oauth.getOAuthRedirectUrl(userId, action);
        return { redirectUrl, userId };
    }

    /**
     * Create a Basiq user
     */
    private async createUser(companyId: string, userData: BasiqCreateUserRequest): Promise<BasiqUser> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);

        this.logger.log('[BasiqStrategy] Creating Basiq user', { userData });

        try {
            if (typeof (providerInstance as any).createUser !== 'function') {
                throw new Error('Basiq provider does not support createUser');
            }

            const user = await (providerInstance as any).createUser(userData);
            this.logger.log(`Successfully created Basiq user: ${user.id}`);
            return user;
        } catch (error: any) {
            this.logger.error(
                `[BasiqStrategy] Failed to create Basiq user: ${error?.message || 'Unknown error'}`,
                error?.stack,
            );
            throw error;
        }
    }
}
