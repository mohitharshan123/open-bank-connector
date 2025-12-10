import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BankConfig } from '../config/bank.config';
import { ProviderNotInitializedException } from '../exceptions/provider.exception';
import {
    FiskilAuthResponse,
    OpenBankSDK,
    StandardAccount,
    StandardBalance,
    StandardTransaction,
} from '../sdk';
import { TokenService } from '../services/token.service';
import { ProviderType } from '../types/provider.enum';
import { BaseStrategy } from './base.strategy';
import { FiskilAuthentication } from './features/authentication/fiskil.authentication';
import { FiskilOAuth } from './features/oauth/fiskil.oauth';
import { FiskilUsers } from './features/users/fiskil.users';
import { IProviderStrategy } from './provider-strategy.interface';

@Injectable()
export class FiskilStrategy extends BaseStrategy implements IProviderStrategy {
    constructor(
        configService: ConfigService,
        tokenService: TokenService,
        httpService: HttpService,
        sdk: OpenBankSDK,
        private readonly fiskilAuthentication: FiskilAuthentication,
        private readonly fiskilOAuth: FiskilOAuth,
        private readonly fiskilUsers: FiskilUsers,
    ) {
        super(configService, tokenService, httpService, sdk, FiskilStrategy.name);
    }

    getProviderType(): ProviderType {
        return ProviderType.FISKIL;
    }

    protected async doInitialize(companyId: string): Promise<void> {
        const config = this.configService.get<BankConfig['fiskil']>('bank.fiskil');

        if (!config?.clientId || !config?.clientSecret) {
            throw new ProviderNotInitializedException(
                'Fiskil credentials not found. Please configure FISKIL_CLIENT_ID and FISKIL_CLIENT_SECRET.',
            );
        }

        const httpClient = this.createHttpClient(companyId);
        const authHttpClient = this.createAuthHttpClient();

        const providerInstance = this.sdk.useFiskil(
            httpClient,
            {
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                ...(config.baseUrl && { baseUrl: config.baseUrl }),
            },
            this.logger,
            authHttpClient,
        );

        this.providerInstances.set(companyId, providerInstance);

        this.logger.log(`✓ Fiskil provider initialized successfully for company: ${companyId}`);
    }

    async authenticate(
        companyId: string,
        userId?: string,
        oauthCode?: string,
        userData?: { email?: string; name?: string; phone?: string },
    ): Promise<FiskilAuthResponse> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        const authHttpClient = this.createAuthHttpClient();
        const config = this.configService.get<BankConfig['fiskil']>('bank.fiskil')!;

        if (oauthCode) {
            return await this.fiskilOAuth.exchangeOAuthCode(authHttpClient, config, companyId, oauthCode, userId);
        }

        const authResponse = await this.fiskilAuthentication.authenticate(
            providerInstance,
            this.fiskilOAuth,
            companyId,
            userId,
            oauthCode
        );

        if (userData && (userData.email || userData.name || userData.phone)) {
            const existingToken = await this.tokenService.getActiveToken(ProviderType.FISKIL, companyId);
            const existingEndUserId = existingToken?.metadata?.end_user_id;

            if (existingToken && existingEndUserId) {
                const tokenInfo = await this.tokenService.getTokenInfo(ProviderType.FISKIL, companyId);
                if (tokenInfo.isValid) {
                    this.logger.log(`Valid token with end_user_id already exists, skipping user creation`, {
                        end_user_id: existingEndUserId,
                    });
                    return authResponse;
                }
            }

            this.logger.debug(`Creating Fiskil end user during authentication`, {
                hasEmail: !!userData.email,
                hasName: !!userData.name,
                hasPhone: !!userData.phone,
                reason: existingToken ? 'Token expired or missing end_user_id' : 'No existing token',
            });

            try {
                const httpClient = this.createHttpClient(companyId);
                const userResponse = await this.fiskilUsers.createUser(httpClient, config, companyId, userData);
                const endUserId = userResponse?.end_user_id;

                if (endUserId) {
                    this.logger.log(`Successfully created Fiskil end user during authentication`, { end_user_id: endUserId });
                    this.logger.debug(`end_user_id should be stored in token metadata: ${endUserId}`);
                } else {
                    this.logger.warn(`end_user_id not found in user creation response`);
                }
            } catch (error) {
                this.logger.error(`Failed to create Fiskil end user during authentication: ${error.message}`, error.stack);
            }
        }

        return authResponse;
    }

    async getAccounts(companyId: string, userId?: string): Promise<StandardAccount[]> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        const endUserId = await this.getEndUserId(companyId, userId);
        return providerInstance.getAccount(endUserId);
    }

    async getBalances(companyId: string, userId?: string): Promise<StandardBalance[]> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        const endUserId = await this.getEndUserId(companyId, userId);
        return providerInstance.getBalances(endUserId);
    }

    async getTransactions(
        companyId: string,
        userId?: string,
        accountId?: string,
        from?: string,
        to?: string,
        status?: 'PENDING' | 'POSTED',
    ): Promise<{ transactions: StandardTransaction[]; links?: { next?: string; prev?: string } }> {
        await this.initialize(companyId);
        const providerInstance = await this.getProvider(companyId);
        const endUserId = await this.getEndUserId(companyId, userId);
        return providerInstance.getTransactions(endUserId, accountId, from, to, status);
    }

    async getOAuthRedirectUrl(
        companyId: string,
        userId?: string,
        action?: string,
        state?: string,
    ): Promise<{ redirectUrl: string; userId?: string; state?: string; codeVerifier?: string; sessionId?: string; authUrl?: string; expiresAt?: string }> {
        await this.initialize(companyId);
        const httpClient = this.createHttpClient(companyId);
        const config = this.configService.get<BankConfig['fiskil']>('bank.fiskil')!;

        if (!userId) {
            userId = await this.getEndUserIdFromMetadata(companyId);
            if (!userId) {
                throw new Error('end_user_id is required for Fiskil OAuth redirect. Please create an end user first.');
            }
        }

        return this.fiskilOAuth.getOAuthRedirectUrl(httpClient, config, userId, action, state);
    }

    async createUser(companyId: string, userData: { email?: string; name?: string; phone?: string }): Promise<any> {
        await this.initialize(companyId);
        const authHttpClient = this.createAuthHttpClient();
        const config = this.configService.get<BankConfig['fiskil']>('bank.fiskil')!;

        const fiskilUserData = {
            email: userData.email,
            name: userData.name,
            phone: userData.phone,
        };

        return this.fiskilUsers.createUser(authHttpClient, config, companyId, fiskilUserData);
    }

    /**
     * Get end_user_id from token metadata
     */
    private async getEndUserIdFromMetadata(companyId: string): Promise<string | undefined> {
        try {
            const tokenDoc = await this.tokenService.getActiveToken(ProviderType.FISKIL, companyId);
            return tokenDoc?.metadata?.end_user_id;
        } catch (error) {
            this.logger.warn(`Could not retrieve end_user_id from metadata: ${error.message}`);
            return undefined;
        }
    }

    /**
     * Get end_user_id, either from parameter or metadata
     */
    private async getEndUserId(companyId: string, userId?: string): Promise<string> {
        if (userId) {
            return userId;
        }

        const endUserId = await this.getEndUserIdFromMetadata(companyId);
        if (!endUserId) {
            throw new Error('end_user_id is required for Fiskil API calls. Please provide userId or create an end user first.');
        }
        return endUserId;
    }
}

