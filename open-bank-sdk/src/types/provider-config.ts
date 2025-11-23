import { ITransformer } from '../transformers/base.transformer';
import { StandardAccount, StandardBalance } from './common';

/**
 * Endpoint configuration for a provider
 */
export interface ProviderEndpoints {
    authenticate: string;
    getAccount: string;
    getBalances: string;
}

/**
 * Authentication headers builder function
 * Receives the provider config and returns headers object
 */
export type AuthHeadersBuilder = (config: any) => Record<string, string>;

/**
 * Provider endpoint configuration
 * This makes providers config-driven and easily extensible
 */
export interface ProviderEndpointConfig<
    TProviderAccount = any,
    TProviderBalance = any,
    TProviderConfig = any,
    TAuthResponse = any
> {
    /**
     * Provider name identifier
     */
    providerName: string;

    /**
     * Base URL for the provider API
     */
    baseUrl: string;

    /**
     * API endpoints
     */
    endpoints: ProviderEndpoints;

    /**
     * Transformer instance for converting provider responses to standard format
     */
    transformer: ITransformer<TProviderAccount, TProviderBalance>;

    /**
     * Function to build authentication headers
     * @param config Provider configuration (e.g., AirwallexConfig)
     * @returns Headers object for authentication request
     */
    buildAuthHeaders: AuthHeadersBuilder;

    /**
     * Optional: Custom authentication response parser
     * If not provided, uses default token extraction
     */
    parseAuthResponse?: (response: TAuthResponse) => {
        accessToken: string;
        expiresIn: number;
        refreshToken?: string;
    };

    /**
     * Optional: Custom account response parser
     * If not provided, uses transformer directly
     */
    parseAccountResponse?: (response: any) => TProviderAccount;

    /**
     * Optional: Custom balances response parser
     * If not provided, expects array or response.data array
     */
    parseBalancesResponse?: (response: any) => TProviderBalance[];
}

