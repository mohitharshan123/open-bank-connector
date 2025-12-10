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
    StandardTransaction,
} from '../sdk';
import { TokenService } from '../services/token.service';
import { ProviderType } from '../types/provider.enum';
import { BaseStrategy } from './base.strategy';
import { AirwallexAuthentication } from './features/authentication/airwallex.authentication';
import { AirwallexOAuth } from './features/oauth/airwallex.oauth';
import { IProviderStrategy } from './provider-strategy.interface';

@Injectable()
export class AirwallexStrategy extends BaseStrategy implements IProviderStrategy {
    constructor(
        configService: ConfigService,
        tokenService: TokenService,
        httpService: HttpService,
        sdk: OpenBankSDK,
        private readonly airwallexAuthentication: AirwallexAuthentication,
        private readonly airwallexOAuth: AirwallexOAuth,
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

        this.logger.log(`✓ Airwallex provider initialized successfully for company: ${companyId}`);
    }

    async authenticate(
        companyId: string,
        userId?: string,
        oauthCode?: string,
        userData?: { email?: string; name?: string; phone?: string },
    ): Promise<AirwallexAuthResponse> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        const authHttpClient = this.createAuthHttpClient();
        const config = this.configService.get<BankConfig['airwallex']>('bank.airwallex')!;

        if (oauthCode) {
            return await this.airwallexOAuth.exchangeOAuthCode(authHttpClient, config, companyId, oauthCode);
        }

        return this.airwallexAuthentication.authenticate(providerInstance, this.airwallexOAuth, companyId, userId, oauthCode);
    }

    async getAccounts(companyId: string, userId?: string): Promise<StandardAccount[]> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        return providerInstance.getAccount();
    }

    async getBalances(companyId: string, userId?: string): Promise<StandardBalance[]> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        return providerInstance.getBalances();
    }

    async getTransactions(
        companyId: string,
        userId?: string,
        accountId?: string,
        from?: string,
        to?: string,
        status?: string,
    ): Promise<{ transactions: StandardTransaction[]; links?: { next?: string; prev?: string } }> {
        // Airwallex doesn't support transactions in the current implementation
        // Return empty array with no links
        this.logger.warn(`[AirwallexStrategy] Transactions not supported for Airwallex provider`);
        return { transactions: [] };
    }

    async getOAuthRedirectUrl(
        companyId: string,
        userId?: string,
        action?: string,
        state?: string,
    ): Promise<{ redirectUrl: string; userId?: string; state?: string; codeVerifier?: string }> {
        await this.initialize(companyId);
        const config = this.configService.get<BankConfig['airwallex']>('bank.airwallex')!;
        return this.airwallexOAuth.getOAuthRedirectUrl(config, userId, action, state);
    }
}
