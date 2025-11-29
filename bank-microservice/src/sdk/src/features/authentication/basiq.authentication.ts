import { Injectable, Logger } from '@nestjs/common';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { BASIQ_CONSTANTS } from '../../shared/constants/basiq.constants';
import { HttpRequestBuilder } from '../../shared/builders/http-request.builder';
import type { BasiqAuthResponse, BasiqConfig } from '../../shared/types/basiq';

@Injectable()
export class BasiqAuthentication {
    private readonly logger = new Logger(BasiqAuthentication.name);

    /**
     * Authenticate with Basiq API to get bearer token
     */
    async authenticate(httpClient: IHttpClient, config: BasiqConfig, userId?: string): Promise<BasiqAuthResponse & { userId?: string }> {
        this.logger.log('[BasiqAuthentication] Starting authentication', { userId });

        try {
            const formData = new URLSearchParams();
            formData.append('scope', BASIQ_CONSTANTS.SCOPES.SERVER_ACCESS);
            if (userId) {
                formData.append('userId', userId);
            }

            const baseUrl = config.baseUrl || BASIQ_CONSTANTS.BASE_URL;
            const apiKey = (config.apiKey || '').trim();

            const requestConfig = HttpRequestBuilder.post(BASIQ_CONSTANTS.ENDPOINTS.AUTHENTICATE, formData.toString())
                .baseUrl(baseUrl)
                .headers({
                    'Authorization': `Basic ${apiKey}`,
                    'Content-Type': BASIQ_CONSTANTS.HEADERS.CONTENT_TYPE_FORM,
                    [BASIQ_CONSTANTS.HEADERS.VERSION]: BASIQ_CONSTANTS.API_VERSION,
                })
                .build();
            const response = await httpClient.request<BasiqAuthResponse>(requestConfig);

            const authResponse = response.data;
            const accessToken = authResponse.access_token;

            if (!accessToken) {
                throw new Error('Access token not found in authentication response');
            }

            this.logger.log('[BasiqAuthentication] Authentication successful, got token');

            return {
                ...authResponse,
                userId,
            };
        } catch (error: any) {
            this.logger.error(`[BasiqAuthentication] Authentication failed`, {
                error: error.message,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Basiq authentication failed: ${error.message || 'Unknown error'}`);
        }
    }
}

