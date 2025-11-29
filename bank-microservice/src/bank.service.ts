import { Injectable, Logger } from '@nestjs/common';
import { AirwallexAuthResponse, StandardAccount, StandardBalance, StandardJob } from './sdk';
import { ProviderType } from './types/provider.enum';
import { ProviderStrategyFactory } from './strategies/provider-strategy.factory';
import { TokenService } from './services/token.service';

@Injectable()
export class BankService {
    private readonly logger = new Logger(BankService.name);

    constructor(
        private readonly strategyFactory: ProviderStrategyFactory,
        private readonly tokenService: TokenService,
    ) { }


    /**
     * Get account details (returns array of accounts)
     */
    async getAccount(provider: ProviderType, companyId: string): Promise<StandardAccount[]> {
        this.logger.debug(`Getting accounts for provider: ${provider}, company: ${companyId}`);
        const strategy = this.strategyFactory.getStrategy(provider);
        return strategy.getAccount(companyId);
    }

    /**
     * Get jobs (Basiq-specific, returns empty array for other providers)
     */
    async getJobs(provider: ProviderType, companyId: string, jobId?: string): Promise<StandardJob[]> {
        this.logger.debug(`Getting jobs for provider: ${provider}, company: ${companyId}`, { jobId });
        const strategy = this.strategyFactory.getStrategy(provider);
        return strategy.getJobs(companyId, jobId);
    }

    /**
     * Get balances
     */
    async getBalances(provider: ProviderType, companyId: string): Promise<StandardBalance[]> {
        this.logger.debug(`Getting balances for provider: ${provider}, company: ${companyId}`);
        const strategy = this.strategyFactory.getStrategy(provider);
        return strategy.getBalances(companyId);
    }

    /**
     * Authenticate with a provider (Airwallex and Basiq support this)
     * For Basiq: Automatically creates a user if userId is not provided
     * For Airwallex: Uses OAuth2 code exchange if code is provided, otherwise uses direct auth
     */
    async authenticate(
        provider: ProviderType,
        companyId: string,
        userId?: string,
        oauthCode?: string,
    ): Promise<AirwallexAuthResponse> {
        this.logger.debug(`Authenticating with provider: ${provider}, company: ${companyId}`);
        const strategy = this.strategyFactory.getStrategy(provider);
        return strategy.authenticate(companyId, userId, oauthCode);
    }

    /**
     * Get list of supported providers
     */
    getInitializedProviders(): ProviderType[] {
        return this.strategyFactory.getSupportedProviders();
    }

    /**
     * Get OAuth redirect URL for a provider
     */
    async getOAuthRedirectUrl(
        provider: ProviderType,
        companyId: string,
        userId?: string,
        action: string = 'connect',
        state?: string,
    ): Promise<{ redirectUrl: string; userId?: string; state?: string; codeVerifier?: string }> {
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

