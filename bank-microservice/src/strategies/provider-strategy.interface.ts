import { AirwallexAuthResponse } from '../sdk';
import { StandardAccount, StandardBalance, StandardJob } from '../sdk';
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
    authenticate(companyId: string, userId?: string, oauthCode?: string): Promise<AirwallexAuthResponse>;

    /**
     * Get account details (returns array of accounts)
     */
    getAccount(companyId: string): Promise<StandardAccount[]>;

    /**
     * Get balances
     */
    getBalances(companyId: string): Promise<StandardBalance[]>;

    /**
     * Get jobs (Basiq-specific, returns empty array for other providers)
     */
    getJobs(companyId: string, jobId?: string): Promise<StandardJob[]>;

    /**
     * Get OAuth redirect URL
     */
    getOAuthRedirectUrl(companyId: string, userId?: string, action?: string, state?: string): Promise<{
        redirectUrl: string;
        userId?: string;
        state?: string;
        codeVerifier?: string;
    }>;
}

