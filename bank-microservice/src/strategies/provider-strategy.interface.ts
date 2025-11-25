import { AirwallexAuthResponse } from '../sdk';
import { StandardAccount, StandardBalance } from '../sdk';
import { ProviderType } from '../types/provider.enum';

/**
 * Base interface for provider-specific strategies
 */
export interface IProviderStrategy {
    /**
     * Get the provider type this strategy handles
     */
    getProviderType(): ProviderType;

    /**
     * Authenticate with the provider
     */
    authenticate(userId?: string, oauthCode?: string): Promise<AirwallexAuthResponse>;

    /**
     * Get account details
     */
    getAccount(): Promise<StandardAccount>;

    /**
     * Get balances
     */
    getBalances(): Promise<StandardBalance[]>;

    /**
     * Get OAuth redirect URL
     */
    getOAuthRedirectUrl(userId?: string, action?: string, state?: string): Promise<{
        redirectUrl: string;
        userId?: string;
        state?: string;
        codeVerifier?: string;
    }>;
}

