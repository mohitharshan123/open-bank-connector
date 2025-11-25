import { Injectable, Logger } from '@nestjs/common';
import { AirwallexAuthResponse, StandardAccount, StandardBalance } from './sdk';
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
     * Get account details
     */
    async getAccount(provider: ProviderType): Promise<StandardAccount> {
        this.logger.debug(`Getting account for provider: ${provider}`);
        const strategy = this.strategyFactory.getStrategy(provider);
        return strategy.getAccount();
    }

    /**
     * Get balances
     */
    async getBalances(provider: ProviderType): Promise<StandardBalance[]> {
        this.logger.debug(`Getting balances for provider: ${provider}`);
        const strategy = this.strategyFactory.getStrategy(provider);
        return strategy.getBalances();
    }

    /**
     * Authenticate with a provider (Airwallex and Basiq support this)
     * For Basiq: Automatically creates a user if userId is not provided
     * For Airwallex: Uses OAuth2 code exchange if code is provided, otherwise uses direct auth
     */
    async authenticate(
        provider: ProviderType,
        userId?: string,
        oauthCode?: string,
    ): Promise<AirwallexAuthResponse> {
        this.logger.debug(`Authenticating with provider: ${provider}`);
        const strategy = this.strategyFactory.getStrategy(provider);
        return strategy.authenticate(userId, oauthCode);
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
        userId?: string,
        action: string = 'connect',
        state?: string,
    ): Promise<{ redirectUrl: string; userId?: string; state?: string; codeVerifier?: string }> {
        this.logger.debug(`Getting OAuth redirect URL for provider: ${provider}`);
        const strategy = this.strategyFactory.getStrategy(provider);
        return strategy.getOAuthRedirectUrl(userId, action, state);
    }

    /**
     * Delete stored tokens for a provider (useful for debugging/testing)
     */
    async deleteTokens(provider: ProviderType): Promise<void> {
        this.logger.debug(`Deleting tokens for provider: ${provider}`);
        await this.tokenService.deleteTokens(provider);
        this.logger.log(`Successfully deleted tokens for ${provider}`);
    }
}

