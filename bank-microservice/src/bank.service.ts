import { Injectable, Logger } from '@nestjs/common';
import { AirwallexAuthResponse, FiskilAuthResponse, StandardAccount, StandardBalance, StandardTransaction } from './sdk';
import { TokenService } from './services/token.service';
import { ProviderStrategyFactory } from './strategies/provider-strategy.factory';
import { ProviderType } from './types/provider.enum';

@Injectable()
export class BankService {
    private readonly logger = new Logger(BankService.name);

    constructor(
        private readonly strategyFactory: ProviderStrategyFactory,
        private readonly tokenService: TokenService,
    ) { }


    /**
     * Get account details (returns array of accounts)
     * @param userId - Optional user ID (required for Fiskil as end_user_id)
     */
    async getAccount(provider: ProviderType, companyId: string, userId?: string): Promise<StandardAccount[]> {
        this.logger.debug(`Getting accounts for provider: ${provider}, company: ${companyId}${userId ? `, userId: ${userId}` : ''}`);
        const strategy = this.strategyFactory.getStrategy(provider);
        return strategy.getAccounts(companyId, userId);
    }

    /**
     * Get balances
     * @param userId - Optional user ID (required for Fiskil as end_user_id)
     */
    async getBalances(provider: ProviderType, companyId: string, userId?: string): Promise<StandardBalance[]> {
        this.logger.debug(`Getting balances for provider: ${provider}, company: ${companyId}${userId ? `, userId: ${userId}` : ''}`);
        const strategy = this.strategyFactory.getStrategy(provider);
        return strategy.getBalances(companyId, userId);
    }

    /**
     * Get transactions
     * @param userId - Optional user ID (required for Fiskil as end_user_id)
     * @param accountId - Optional account ID to filter transactions
     */
    async getTransactions(
        provider: ProviderType,
        companyId: string,
        userId?: string,
        accountId?: string,
        from?: string,
        to?: string,
        status?: 'PENDING' | 'POSTED',
    ): Promise<{ transactions: StandardTransaction[]; links?: { next?: string; prev?: string } }> {
        this.logger.debug(`Getting transactions for provider: ${provider}, company: ${companyId}${userId ? `, userId: ${userId}` : ''}${accountId ? `, accountId: ${accountId}` : ''}`);
        const strategy = this.strategyFactory.getStrategy(provider);
        if ('getTransactions' in strategy && typeof strategy.getTransactions === 'function') {
            return (strategy as any).getTransactions(companyId, userId, accountId, from, to, status);
        }
        throw new Error(`Transactions not supported for provider: ${provider}`);
    }

    /**
     * Authenticate with a provider
     * For Airwallex/Fiskil: Uses OAuth2 code exchange if code is provided, otherwise uses direct auth
     * For Fiskil: If userData is provided, will also create an end user after authentication
     */
    async authenticate(
        provider: ProviderType,
        companyId: string,
        userId?: string,
        oauthCode?: string,
        userData?: { email?: string; name?: string; phone?: string },
    ): Promise<AirwallexAuthResponse | FiskilAuthResponse> {
        this.logger.debug(`Authenticating with provider: ${provider}, company: ${companyId}${userData ? ', with user creation' : ''}`);
        const strategy = this.strategyFactory.getStrategy(provider);
        return strategy.authenticate(companyId, userId, oauthCode, userData);
    }

    /**
     * Create an end user in Fiskil
     */
    async createFiskilUser(
        companyId: string,
        userData: { email?: string; name?: string; phone?: string },
    ): Promise<any> {
        this.logger.debug(`Creating Fiskil end user for company: ${companyId}`);
        const strategy = this.strategyFactory.getStrategy(ProviderType.FISKIL);
        if ('createUser' in strategy && typeof strategy.createUser === 'function') {
            return (strategy as any).createUser(companyId, userData);
        }
        throw new Error('Fiskil user creation not supported');
    }

    /**
     * Get list of supported providers
     */
    getInitializedProviders(): ProviderType[] {
        return this.strategyFactory.getSupportedProviders();
    }

    /**
     * Get OAuth redirect URL for a provider
     * For Fiskil, also returns sessionId, authUrl, and expiresAt for Link SDK
     */
    async getOAuthRedirectUrl(
        provider: ProviderType,
        companyId: string,
        userId?: string,
        action: string = 'connect',
        state?: string,
    ): Promise<{
        redirectUrl: string;
        userId?: string;
        state?: string;
        codeVerifier?: string;
        sessionId?: string;
        authUrl?: string;
        expiresAt?: string;
    }> {
        this.logger.debug(`Getting OAuth redirect URL for provider: ${provider}, company: ${companyId}`);
        const strategy = this.strategyFactory.getStrategy(provider);
        return strategy.getOAuthRedirectUrl(companyId, userId, action, state);
    }

    /**
     * Delete stored tokens for a provider (useful for debugging/testing)
     */
    async deleteTokens(provider: ProviderType, companyId: string): Promise<void> {
        this.logger.debug(`Deleting tokens for provider: ${provider}, company: ${companyId}`);
        await this.tokenService.deleteTokens(provider, companyId);
        this.logger.log(`Successfully deleted tokens for ${provider}, company: ${companyId}`);
    }

    /**
     * Check if a provider is connected for a company
     */
    async isConnected(provider: ProviderType, companyId: string): Promise<boolean> {
        const tokenInfo = await this.tokenService.getTokenInfo(provider, companyId);
        return tokenInfo.hasToken && tokenInfo.isValid;
    }
}

