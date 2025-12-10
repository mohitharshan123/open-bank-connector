import { AirwallexAuthResponse, FiskilAuthResponse, StandardAccount, StandardBalance, StandardTransaction } from '../sdk';
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
     * @param userData - Optional user data for providers that support user creation during auth (e.g., Fiskil)
     */
    authenticate(
        companyId: string,
        userId?: string,
        oauthCode?: string,
        userData?: { email?: string; name?: string; phone?: string }
    ): Promise<AirwallexAuthResponse | FiskilAuthResponse>;

    /**
     * Get account details (returns array of accounts)
     * @param userId - Optional user ID (required for Fiskil as end_user_id)
     */
    getAccounts(companyId: string, userId?: string): Promise<StandardAccount[]>;

    /**
     * Get balances
     * @param userId - Optional user ID (required for Fiskil as end_user_id)
     */
    getBalances(companyId: string, userId?: string): Promise<StandardBalance[]>;

    /**
     * Get transactions
     * @param userId - Optional user ID (required for Fiskil as end_user_id)
     * @param accountId - Optional account ID (required for Fiskil as account_id)
     * @param from - Optional start date for transactions
     * @param to - Optional end date for transactions
     * @param status - Optional status of transactions (PENDING | POSTED for Fiskil)
     * @returns Transactions array with pagination links (if supported by provider)
     */
    getTransactions(
        companyId: string,
        userId?: string,
        accountId?: string,
        from?: string,
        to?: string,
        status?: string | 'PENDING' | 'POSTED',
    ): Promise<{ transactions: StandardTransaction[]; links?: { next?: string; prev?: string } }>;

    /**
     * Get OAuth redirect URL
     * For Fiskil, also returns sessionId, authUrl, and expiresAt
     */
    getOAuthRedirectUrl(companyId: string, userId?: string, action?: string, state?: string): Promise<{
        redirectUrl: string;
        userId?: string;
        state?: string;
        codeVerifier?: string;
        sessionId?: string;
        authUrl?: string;
        expiresAt?: string;
    }>;
}

