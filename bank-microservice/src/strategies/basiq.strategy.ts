import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BankConfig } from '../config/bank.config';
import { ProviderNotInitializedException } from '../exceptions/provider.exception';
import {
    AirwallexAuthResponse,
    OpenBankSDK,
    StandardAccount,
    StandardBalance,
    StandardJob
} from '../sdk';
import { TokenService } from '../services/token.service';
import { ProviderType } from '../types/provider.enum';
import { BaseStrategy } from './base.strategy';
import { BasiqAccounts } from './features/accounts/basiq.accounts';
import { BasiqAuthentication } from './features/authentication/basiq.authentication';
import { BasiqBalances } from './features/balances/basiq.balances';
import { BasiqJobs } from './features/jobs/basiq.jobs';
import { BasiqOAuth } from './features/oauth/basiq.oauth';
import { IProviderStrategy } from './provider-strategy.interface';

@Injectable()
export class BasiqStrategy extends BaseStrategy implements IProviderStrategy {
    constructor(
        configService: ConfigService,
        tokenService: TokenService,
        httpService: HttpService,
        sdk: OpenBankSDK,
        private readonly basiqAuthentication: BasiqAuthentication,
        private readonly basiqAccounts: BasiqAccounts,
        private readonly basiqBalances: BasiqBalances,
        private readonly basiqJobs: BasiqJobs,
        private readonly basiqOAuth: BasiqOAuth,
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

        this.logger.log(`✓ Basiq provider initialized successfully for company: ${companyId}`);
    }

    async authenticate(companyId: string, userId?: string, oauthCode?: string): Promise<AirwallexAuthResponse & { redirectUrl?: string }> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        const authHttpClient = this.createAuthHttpClient();
        const config = this.configService.get<BankConfig['basiq']>('bank.basiq')!;
        return this.basiqAuthentication.authenticate(providerInstance, this.basiqOAuth, companyId, userId);
    }

    async getAccount(companyId: string): Promise<StandardAccount[]> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        return this.basiqAccounts.getAccounts(providerInstance, companyId);
    }

    async getBalances(companyId: string): Promise<StandardBalance[]> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        return this.basiqBalances.getBalances(providerInstance, companyId);
    }

    async getJobs(companyId: string, jobId?: string): Promise<StandardJob[]> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        return this.basiqJobs.getJobs(providerInstance, companyId, jobId);
    }

    async getOAuthRedirectUrl(
        companyId: string,
        userId?: string,
        action: string = 'connect',
        state?: string,
    ): Promise<{ redirectUrl: string; userId?: string; state?: string; codeVerifier?: string }> {
        await this.initialize(companyId);
        const authHttpClient = this.createAuthHttpClient();
        const config = this.configService.get<BankConfig['basiq']>('bank.basiq')!;

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
            this.logger.log('[BasiqStrategy] No userId provided, authenticating to create user...');
            const authResponse = await this.authenticate(companyId);
            userId = (authResponse as any).userId;
            if (!userId) {
                throw new Error('Failed to get userId from authentication');
            }
            this.logger.log(`[BasiqStrategy] Got userId ${userId} from authentication`);
        }

        const { redirectUrl } = await this.basiqOAuth.getOAuthRedirectUrl(authHttpClient, config, userId!, action);
        return { redirectUrl, userId: userId! };
    }
}
