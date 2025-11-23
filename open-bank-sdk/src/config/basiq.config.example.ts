/**
 * Example: Basiq provider configuration
 * This demonstrates how easy it is to add a new provider using the config-driven approach
 * 
 * To add Basiq support:
 * 1. Create BasiqTransformer (similar to AirwallexTransformer)
 * 2. Create Basiq types (BasiqConfig, BasiqAccount, BasiqBalance, etc.)
 * 3. Create this config file
 * 4. Create BasiqProvider extending ConfigurableProvider
 * 5. Register in SDK
 */

import { PROVIDER_BASE_URLS } from '../constants';
// import { BasiqTransformer } from '../transformers/basiq.transformer';
// import { BasiqAccount, BasiqBalance, BasiqConfig, BasiqAuthResponse } from '../types/basiq';
import { ProviderEndpointConfig } from '../types/provider-config';

/**
 * Example Basiq provider endpoint configuration
 * Uncomment and implement when adding Basiq support
 */
/*
export const createBasiqConfig = (config: BasiqConfig): ProviderEndpointConfig<
    BasiqAccount,
    BasiqBalance,
    BasiqConfig,
    BasiqAuthResponse
> => ({
    providerName: 'basiq',
    baseUrl: config.baseUrl || PROVIDER_BASE_URLS.BASIQ,
    endpoints: {
        authenticate: '/token',
        getAccount: '/accounts',
        getBalances: '/balances',
    },
    transformer: new BasiqTransformer(),
    buildAuthHeaders: (config: BasiqConfig) => ({
        'Authorization': `Basic ${Buffer.from(config.apiKey + ':').toString('base64')}`,
    }),
    parseAuthResponse: (response: BasiqAuthResponse) => ({
        accessToken: response.access_token,
        expiresIn: response.expires_in,
    }),
});
*/

