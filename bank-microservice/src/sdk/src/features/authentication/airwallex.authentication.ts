import { Logger } from '@nestjs/common';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { AIRWALLEX_CONSTANTS } from '../../shared/constants/airwallex.constants';
import type { AirwallexAuthResponse, AirwallexConfig } from '../../shared/types/airwallex';

export class AirwallexAuthentication {
    constructor(
        private readonly httpClient: IHttpClient,
        private readonly config: AirwallexConfig,
        private readonly logger: Logger
    ) { }

    /**
     * Authenticate with Airwallex API to get bearer token
     */
    async authenticate(): Promise<AirwallexAuthResponse> {
        this.logger.log('[AirwallexAuthentication] Starting authentication');

        try {
            const baseUrl = this.config.baseUrl || AIRWALLEX_CONSTANTS.BASE_URL;
            this.logger.debug(`[AirwallexAuthentication] Making authentication request to ${baseUrl}${AIRWALLEX_CONSTANTS.ENDPOINTS.AUTHENTICATE}`);

            const response = await this.httpClient.post<AirwallexAuthResponse>(
                AIRWALLEX_CONSTANTS.ENDPOINTS.AUTHENTICATE,
                {},
                {
                    baseURL: baseUrl,
                    headers: {
                        'Content-Type': AIRWALLEX_CONSTANTS.HEADERS.CONTENT_TYPE,
                        [AIRWALLEX_CONSTANTS.HEADERS.API_KEY]: this.config.apiKey,
                        [AIRWALLEX_CONSTANTS.HEADERS.CLIENT_ID]: this.config.clientId,
                    },
                }
            );

            this.logger.log('[AirwallexAuthentication] Authentication successful', {
                hasAccessToken: !!response.data?.access_token,
            });

            return response.data;
        } catch (error: any) {
            this.logger.error(`[AirwallexAuthentication] Authentication failed`, {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
            });
            throw new Error(`Airwallex authentication failed: ${error.message || 'Unknown error'}`);
        }
    }
}

