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
    StandardJob,
} from '../sdk';
import { TokenService } from '../services/token.service';
import { ProviderType } from '../types/provider.enum';
import { BaseStrategy } from './base.strategy';
import { AirwallexAccounts } from './features/accounts/airwallex.accounts';
import { AirwallexAuthentication } from './features/authentication/airwallex.authentication';
import { AirwallexBalances } from './features/balances/airwallex.balances';
import { AirwallexOAuth } from './oauth/airwallex.oauth';
import { IProviderStrategy } from './provider-strategy.interface';

@Injectable()
export class AirwallexStrategy extends BaseStrategy implements IProviderStrategy {
    private oauthInstances: Map<string, AirwallexOAuth> = new Map();

    constructor(
        configService: ConfigService,
        tokenService: TokenService,
        httpService: HttpService,
        sdk: OpenBankSDK,
        private readonly airwallexAuthentication: AirwallexAuthentication,
        private readonly airwallexAccounts: AirwallexAccounts,
        private readonly airwallexBalances: AirwallexBalances,
    ) {
        super(configService, tokenService, httpService, sdk, AirwallexStrategy.name);
    }

    getProviderType(): ProviderType {
        return ProviderType.AIRWALLEX;
    }

    protected async doInitialize(companyId: string): Promise<void> {
        const config = this.configService.get<BankConfig['airwallex']>('bank.airwallex');

        if (!config?.apiKey || !config?.clientId) {
            throw new ProviderNotInitializedException(
                'Airwallex credentials not found. Please configure AIRWALLEX_API_KEY and AIRWALLEX_CLIENT_ID.',
            );
        }

        const httpClient = this.createHttpClient(companyId);
        const authHttpClient = this.createAuthHttpClient();

        const providerInstance = this.sdk.useAirwallex(
            httpClient,
            {
                apiKey: config.apiKey,
                clientId: config.clientId,
                ...(config.baseUrl && { baseUrl: config.baseUrl }),
            },
            this.logger,
            authHttpClient,
        );

        this.providerInstances.set(companyId, providerInstance);

        const oauth = new AirwallexOAuth(authHttpClient, this.tokenService, config, companyId, this.logger);
        this.oauthInstances.set(companyId, oauth);

        this.logger.log(`✓ Airwallex provider initialized successfully for company: ${companyId}`);
    }

    async authenticate(companyId: string, userId?: string, oauthCode?: string): Promise<AirwallexAuthResponse> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        const oauth = this.oauthInstances.get(companyId);
        if (!oauth) {
            throw new ProviderNotInitializedException(ProviderType.AIRWALLEX);
        }
        return this.airwallexAuthentication.authenticate(providerInstance, oauth, companyId, userId, oauthCode);
    }

    async getAccount(companyId: string): Promise<StandardAccount[]> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        return this.airwallexAccounts.getAccounts(providerInstance);
    }

    async getBalances(companyId: string): Promise<StandardBalance[]> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        return this.airwallexBalances.getBalances(providerInstance);
    }

    /**
     * Get jobs - Airwallex doesn't have jobs, returns empty array
     */
    async getJobs(companyId: string, jobId?: string): Promise<StandardJob[]> {
        this.logger.debug(`getJobs called for Airwallex - returning empty array`);
        return [];
    }

    async getOAuthRedirectUrl(
        companyId: string,
        userId?: string,
        action?: string,
        state?: string,
    ): Promise<{ redirectUrl: string; userId?: string; state?: string; codeVerifier?: string }> {
        await this.initialize(companyId);
        const oauth = this.oauthInstances.get(companyId);
        if (!oauth) {
            throw new ProviderNotInitializedException(ProviderType.AIRWALLEX);
        }
        return oauth.getOAuthRedirectUrl(userId, action, state);
    }
}
