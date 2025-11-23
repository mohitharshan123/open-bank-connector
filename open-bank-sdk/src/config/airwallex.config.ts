import { PROVIDER_BASE_URLS } from '../constants';
import { AirwallexTransformer } from '../transformers/airwallex.transformer';
import { AirwallexAccount, AirwallexAccountBalance, AirwallexAuthResponse, AirwallexConfig } from '../types/airwallex';
import { ProviderEndpointConfig } from '../types/provider-config';

/**
 * Airwallex provider endpoint configuration
 * This config defines all Airwallex-specific endpoints, headers, and transformations
 */
export const createAirwallexConfig = (config: AirwallexConfig): ProviderEndpointConfig<
    AirwallexAccount,
    AirwallexAccountBalance,
    AirwallexConfig,
    AirwallexAuthResponse
> => ({
    providerName: 'airwallex',
    baseUrl: config.baseUrl || PROVIDER_BASE_URLS.AIRWALLEX,
    endpoints: {
        authenticate: '/api/v1/authentication/login',
        getAccount: '/api/v1/account',
        getBalances: '/api/v1/balances/current',
    },
    transformer: new AirwallexTransformer(),
    buildAuthHeaders: (config: AirwallexConfig) => ({
        'x-api-key': config.apiKey,
        'x-client-id': config.clientId,
    }),
    parseAuthResponse: (response: AirwallexAuthResponse) => ({
        accessToken: response.access_token,
        expiresIn: response.expires_in,
        refreshToken: response.refresh_token,
    }),
    parseBalancesResponse: (response: any) => {
        return Array.isArray(response) ? response : (response.data || []);
    },
});

