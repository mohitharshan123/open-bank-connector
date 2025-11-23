import { IHttpClient } from '../interfaces/https-client.interface';
import { ILogger } from '../interfaces/logger.interface';
import { AirwallexAuthResponse, AirwallexConfig } from '../types/airwallex';
import { ConfigurableProvider } from './configurable.provider';
import { createAirwallexConfig } from '../config/airwallex.config';

/**
 * Airwallex provider implementation using config-driven approach
 * All provider-specific logic (endpoints, headers, transformers) is defined in airwallex.config.ts
 */
export class AirwallexProvider extends ConfigurableProvider<
    any,
    any,
    AirwallexConfig,
    AirwallexAuthResponse
> {
    constructor(httpClient: IHttpClient, config: AirwallexConfig, logger?: ILogger, authHttpClient?: IHttpClient) {
        const endpointConfig = createAirwallexConfig(config);
        super(httpClient, config, endpointConfig, logger, authHttpClient);
    }
}

